import type { SiteScraper, ScrapedPlayer } from './types'
import { sbFetch, sbInteract } from './scrapingbee'

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export const fmInsideScraper: SiteScraper = {
  domains: ['fminside.net', 'www.fminside.net'],
  name: 'FMInside',
  async search(query: string): Promise<ScrapedPlayer[]> {
    let html = ''

    // ── Attempt 1: direct server-side POST (no ScrapingBee, fast) ──────────
    // FMInside's search is a plain AJAX endpoint. Calling it server-to-server
    // avoids ScrapingBee latency and the 15s route timeout.
    // Try both the sequential db_id (7 = FM26 counting from FM20) and the
    // version number (26) so we're covered if the mapping changes.
    try {
      const safeQuery = encodeURIComponent(query).replace(/'/g, '%27')
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://fminside.net/players/26',
        'Origin': 'https://fminside.net',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': '*/*',
      }
      for (const dbId of ['7', '26', '8', '6']) {
        const res = await fetch('https://fminside.net/resources/inc/ajax/search.php', {
          method: 'POST',
          headers,
          body: `search_phrase=${safeQuery}&database_id=${dbId}`,
          signal: AbortSignal.timeout(5000),
        }).catch(() => null)
        if (res?.ok) {
          const text = await res.text()
          if (text.includes('class="player"')) { html = text; break }
        }
      }
    } catch { /* fall through to sbInteract */ }

    // ── Attempt 2: ScrapingBee JS interaction (fallback) ───────────────────
    if (!html) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 18000)
        try {
          const safeQuery = encodeURIComponent(query).replace(/'/g, '%27')
          const res = await sbInteract(
            'https://fminside.net/players/26',
            [
              { wait_for: 'body' },
              { wait: 1000 },
              {
                evaluate: `(function(){
                  var dbId='7';
                  try{var el=document.querySelector('[name="database_id"]');if(el&&el.value)dbId=el.value;}catch(e){}
                  fetch('/resources/inc/ajax/search.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:'search_phrase=${safeQuery}&database_id='+dbId}).then(function(r){return r.text()}).then(function(h){var d=document.querySelector('div.players');if(d)d.innerHTML=h;});
                })()`,
              },
              { wait: 3500 },
            ],
            controller.signal,
          )
          if (!res.ok) return []
          html = await res.text()
        } finally {
          clearTimeout(timer)
        }
      } catch {
        return []
      }
    }

    // Filter: keep only players whose name matches at least 2 query words.
    const queryWords = stripAccents(query.toLowerCase()).split(/\s+/).filter(w => w.length > 1)
    const nameMatches = (name: string) => {
      const lower = stripAccents(name.toLowerCase())
      return queryWords.filter(w => lower.includes(w)).length >= Math.min(2, queryWords.length)
    }

    const players: ScrapedPlayer[] = []
    const seen = new Set<string>()

    const blockRe = /<ul class="player">([\s\S]*?)<\/ul>/g
    for (const blockMatch of html.matchAll(blockRe)) {
      const block = blockMatch[1]

      const anchorMatch = block.match(/<a\b([^>]*href="\/players\/[^"]*"[^>]*)>/)
      if (!anchorMatch) continue
      const attrs     = anchorMatch[1]
      const hrefMatch = attrs.match(/href="\/players\/([\w-]+)\/((\d+)-([^"]+))"/)
      const nameMatch = attrs.match(/title="([^"]+)"/)
      if (!hrefMatch) continue

      const dbVer    = hrefMatch[1]
      const fullSlug = hrefMatch[2]
      const playerId = hrefMatch[3]
      const name     = nameMatch?.[1]?.trim() ?? ''
      if (!name || name.length < 2 || seen.has(playerId)) continue
      if (!nameMatches(name)) continue
      seen.add(playerId)

      const natMatch   = block.match(/class="flag"[^>]*code="([^"]+)"/)
      const photoMatch = block.match(/img\.fminside\.net\/(facesfm\d+)\/(\d+)\.png/)
      const fmFolder   = photoMatch?.[1] ?? 'facesfm26'
      const photo      = `https://img.fminside.net/${fmFolder}/${playerId}.png`
      const posMatch   = block.match(/<span[^>]*position="([^"]+)"/)
      const clubMatch  = block.match(/href="\/clubs\/[^"]*">(?:<img[^>]*>)?([^<]+)<\/a>/)

      players.push({
        id: `fmi-${playerId}`,
        name,
        nationality: natMatch?.[1]?.trim() ?? null,
        team: clubMatch?.[1]?.trim() ?? null,
        league: null,
        position: posMatch ? normalizePosition(posMatch[1]) : null,
        dateOfBirth: null,
        heightCm: null,
        preferredFoot: null,
        contractUntil: null,
        passports: null,
        joiningDate: null,
        photo,
        description: null,
        marketValue: null,
        fmWages: null,
        fmAttributes: null,
        seasonStats: null,
        heatmap: null,
        sourceUrl: `https://fminside.net/players/${dbVer}/${fullSlug}`,
        sourceName: 'FMInside',
      })

      if (players.length >= 10) break
    }

    // Fetch profiles for top 3 in parallel to get attributes + wages (4s timeout each)
    await Promise.allSettled(
      players.slice(0, 3).map(async player => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 4000)
        try {
          const res = await sbFetch(player.sourceUrl, false, controller.signal)
          if (!res.ok) return
          const profileHtml = await res.text()
          player.fmAttributes = parseAttributes(profileHtml)
          player.fmWages = parseWages(profileHtml)
        } catch {
          // ignore — attributes/wages stay null
        } finally {
          clearTimeout(timer)
        }
      })
    )

    return players
  },
}

// Scrape a single player by their FMInside profile URL.
// URL format: https://fminside.net/players/{dbVer}/{id}-{slug}
export async function scrapeByUrl(url: string): Promise<ScrapedPlayer | null> {
  const match = url.match(/fminside\.net\/players\/([\w-]+)\/((\d+)-([^/?#]+))/)
  if (!match) return null
  const [, dbVer, fullSlug, playerId] = match
  const profileUrl = `https://fminside.net/players/${dbVer}/${fullSlug}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await sbFetch(profileUrl, false, controller.signal)
    if (!res.ok) return null
    const html = await res.text()

    // Name from page title: "Player Name | FMInside"
    const titleMatch = html.match(/<title>([^|<]+)/)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
    const name = (titleMatch?.[1] ?? h1Match?.[1])?.trim()
    if (!name) return null

    const natMatch = html.match(/class="flag"[^>]*code="([^"]+)"/)
    const posMatch = html.match(/<span[^>]*position="([^"]+)"/)
    const clubMatch = html.match(/href="\/clubs\/[^"]*">(?:<img[^>]*>)?([^<]+)<\/a>/)

    const fmVer = dbVer.replace(/[^0-9]/g, '') || '26'
    const photo = `https://img.fminside.net/facesfm${fmVer}/${playerId}.png`

    return {
      id: `fmi-${playerId}`,
      name,
      nationality: natMatch?.[1]?.trim() ?? null,
      team: clubMatch?.[1]?.trim() ?? null,
      league: null,
      position: posMatch ? normalizePosition(posMatch[1]) : null,
      dateOfBirth: null,
      heightCm: null,
      preferredFoot: null,
      contractUntil: null,
      passports: null,
      joiningDate: null,
      photo,
      description: null,
      marketValue: null,
      fmWages: parseWages(html),
      fmAttributes: parseAttributes(html),
      seasonStats: null,
      heatmap: null,
      sourceUrl: profileUrl,
      sourceName: 'FMInside',
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/<acronym[^>]*title="Thousand"[^>]*>K<\/acronym>/gi, 'K')
    .replace(/<acronym[^>]*title="Million"[^>]*>M<\/acronym>/gi, 'M')
    .replace(/&euro;/g, '€')
    .replace(/&pound;/g, '£')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function parseWages(profileHtml: string): string | null {
  const m = profileHtml.match(/class="key">Wages<\/span>\s*<span class="value">([^<]+)<\/span>/)
  if (!m) return null
  return cleanHtml(m[1]).trim()
}

function parseAttributes(profileHtml: string): string | null {
  const attrRe = /<tr\s+id="[^"]*">\s*<td class="name">(?:<acronym[^>]*>)?([^<]+?)(?:<\/acronym>)?<\/td>\s*<td class="stat[^"]*">(\d+)<\/td>/g
  const attrs: { name: string; value: number }[] = []

  for (const m of profileHtml.matchAll(attrRe)) {
    const name  = m[1].trim()
    const value = parseInt(m[2])
    if (name && !isNaN(value)) attrs.push({ name, value })
  }

  if (attrs.length < 2) return null

  attrs.sort((a, b) => b.value - a.value)
  const top7 = attrs.slice(0, 7).map(a => `${a.name} ${a.value}`).join(', ')
  const bot7 = attrs.slice(-7).reverse().map(a => `${a.name} ${a.value}`).join(', ')

  return `${top7} / ${bot7}`
}

function normalizePosition(pos: string): string {
  const map: Record<string, string> = {
    gk: 'Goalkeeper',
    dc: 'Centre-Back', dr: 'Right-Back', dl: 'Left-Back',
    wb: 'Wing-Back', wbr: 'Right Wing-Back', wbl: 'Left Wing-Back',
    dm: 'Defensive Mid', mc: 'Midfielder', ml: 'Left Mid', mr: 'Right Mid',
    am: 'Attacking Mid', aml: 'Left Winger', amr: 'Right Winger',
    st: 'Striker', sc: 'Striker',
  }
  return map[pos.toLowerCase()] ?? pos.toUpperCase()
}
