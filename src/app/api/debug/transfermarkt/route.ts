import { NextResponse } from 'next/server'
import { sbFetch } from '@/lib/scrapers/scrapingbee'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Mohamed Salah'

  const searchUrl = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}&Spieler_page=0`
  const searchRes = await sbFetch(searchUrl)
  const html = await searchRes.text()

  const profileMatch = html.match(/href="\/(([^"\/]+)\/profil\/spieler\/(\d+))"/)
  const slug = profileMatch?.[2] ?? null
  const playerId = profileMatch?.[3] ?? null
  if (!slug || !playerId) return NextResponse.json({ error: 'no player found' })

  const statsUrl = `https://www.transfermarkt.com/${slug}/leistungsdaten/spieler/${playerId}`
  const statsRes = await sbFetch(statsUrl)
  const statsHtml = await statsRes.text()

  // Extract the full <player-performance-proxy ...> tag — it likely has the API URL as an attribute
  const proxyTagMatch = statsHtml.match(/<player-performance-proxy[^>]*>/i)
  const proxyTag = proxyTagMatch?.[0] ?? '(not found)'

  // Also try render_js=true with a 4s wait
  const endpoint = new URL('https://app.scrapingbee.com/api/v1/')
  endpoint.searchParams.set('api_key', process.env.SCRAPINGBEE_API_KEY!)
  endpoint.searchParams.set('url', statsUrl)
  endpoint.searchParams.set('render_js', 'true')
  endpoint.searchParams.set('wait', '4000')
  const renderedRes  = await fetch(endpoint.toString())
  const renderedHtml = await renderedRes.text()
  const tableIdx     = renderedHtml.search(/<tr class="(odd|even)"/)

  return NextResponse.json({
    proxyTag,
    renderedTable: tableIdx >= 0
      ? renderedHtml.slice(Math.max(0, tableIdx - 200), tableIdx + 3000)
      : '(no table found)',
    renderedHtmlLength: renderedHtml.length,
  })
}
