import { NextResponse } from 'next/server'

const BASE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*',
  'Accept-Language': 'en-US,en;q=0.5',
}

function sbUrl(targetUrl: string, opts: Record<string, string> = {}) {
  const u = new URL('https://app.scrapingbee.com/api/v1/')
  u.searchParams.set('api_key', process.env.SCRAPINGBEE_API_KEY!)
  u.searchParams.set('url', targetUrl)
  for (const [k, v] of Object.entries(opts)) u.searchParams.set(k, v)
  return u.toString()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Reggie Walsh'
  const results: Record<string, unknown> = { query }

  // ── 1. ScrapingBee JS-rendered page — get the actual form HTML ──
  let renderedFormHtml = ''
  let renderedCookies = ''
  try {
    const res = await fetch(sbUrl('https://fminside.net/players', {
      render_js: 'true',
      wait: '1500',
      return_page_source: 'true',
    }))
    const html = await res.text()

    // Find form#fp_search in the rendered page
    const formMatch = html.match(/<form[^>]+id="fp_search"[^>]*>([\s\S]*?)<\/form>/i)
    renderedFormHtml = formMatch?.[1] ?? ''
    results.renderedFormHtml = renderedFormHtml.slice(0, 1000)

    // Extract all inputs and selects from the rendered form
    if (renderedFormHtml) {
      const fields: Record<string, string> = {}
      for (const m of renderedFormHtml.matchAll(/<input[^>]+name="([^"]+)"[^>]*(?:value="([^"]*)")?/g)) {
        fields[m[1]] = m[2] ?? ''
      }
      for (const m of renderedFormHtml.matchAll(/<select[^>]+name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
        const body = m[2]
        const sel   = body.match(/<option[^>]+selected[^>]*value="([^"]*)"/)
        const first = body.match(/<option[^>]+value="([^"]*)"/)
        fields[m[1]] = sel?.[1] ?? first?.[1] ?? ''
      }
      results.renderedFormFields = fields
      renderedCookies = res.headers.get('x-scrapingbee-cookies') ?? ''
      results.sbCookies = renderedCookies
    }

    // Also look for fp_search anywhere
    const fpSearchIdx = html.indexOf('fp_search')
    results.fpSearchFound = fpSearchIdx >= 0
    if (fpSearchIdx >= 0) {
      results.fpSearchContext = html.slice(Math.max(0, fpSearchIdx - 100), fpSearchIdx + 500)
    }

    // Count player blocks and look for query
    const blockCount = (html.match(/<ul class="player">/g) ?? []).length
    const hasQuery = html.toLowerCase().includes(query.split(' ')[1]?.toLowerCase() ?? '')
    results.renderedPage = { blockCount, hasQuery, htmlLength: html.length }
  } catch (e) {
    results.renderedPage = String(e)
  }

  // ── 2. JS scenario — fill search input and wait for AJAX results ──
  try {
    const scenario = JSON.stringify({
      instructions: [
        { wait_for: 'form#fp_search input[name]' },
        { fill: ['form#fp_search input[name]', query] },
        { wait: 4000 },
      ],
    })
    const res = await fetch(sbUrl(
      'https://fminside.net/players',
      { render_js: 'true', js_scenario: scenario },
    ))
    const html = await res.text()
    const blockCount = (html.match(/<ul class="player">/g) ?? []).length
    const hasQuery = html.toLowerCase().includes(query.split(' ')[1]?.toLowerCase() ?? query.toLowerCase())
    results.jsScenario = { status: res.status, blockCount, hasQuery, htmlLength: html.length }
  } catch (e) {
    results.jsScenario = String(e)
  }

  // ── 3. Direct page GET — capture cookies for use in POST ──
  let sessionCookies = ''
  try {
    const res = await fetch('https://fminside.net/players', {
      headers: BASE,
      redirect: 'follow',
    })
    const rawCookies = res.headers.getSetCookie?.() ?? []
    sessionCookies = rawCookies.map(c => c.split(';')[0]).join('; ')
    results.sessionCookies = sessionCookies
    const pageHtml = await res.text()
    results.staticHtmlPreview = pageHtml.slice(0, 500)
    const fpIdx = pageHtml.indexOf('fp_search')
    results.fpSearchInStaticHtml = fpIdx >= 0
  } catch (e) {
    results.sessionCookiesError = String(e)
  }

  // ── 4. POST to search.php with session cookie ──
  if (sessionCookies) {
    const postHeaders: Record<string, string> = {
      ...BASE,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://fminside.net/players',
      'Origin': 'https://fminside.net',
      'Cookie': sessionCookies,
    }
    try {
      const body = new URLSearchParams({ name: query, gender: '0' })
      const res = await fetch('https://fminside.net/resources/inc/ajax/search.php', {
        method: 'POST', headers: postHeaders, body: body.toString(),
      })
      const text = await res.text()
      const blockCount = (text.match(/<ul class="player">/g) ?? []).length
      results.postWithSession = { status: res.status, blockCount, htmlLength: text.length, preview: text.slice(0, 400) }
    } catch (e) {
      results.postWithSession = String(e)
    }
  }

  return NextResponse.json(results)
}
