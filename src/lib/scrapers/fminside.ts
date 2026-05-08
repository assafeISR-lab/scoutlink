import type { SiteScraper, ScrapedPlayer } from './types'
import { sbFetch } from './scrapingbee'

export const fmInsideScraper: SiteScraper = {
  domains: ['fminside.net', 'www.fminside.net'],
  name: 'FMInside',
  async search(query: string): Promise<ScrapedPlayer[]> {
    // Fetch the FMInside players page via ScrapingBee (Cloudflare blocks direct requests).
    // The page is server-rendered so renderJs=false is sufficient and faster.
    // ?search= param is ignored server-side; we filter by name after parsing.
    let html = ''
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)
      try {
        const res = await sbFetch(
          `https://fminside.net/players/26?search=${encodeURIComponent(query)}`,
          false,
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

    // Filter: keep only players whose name matches at least 2 query words
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1)
    const nameMatches = (name: string) => {
      const lower = name.toLowerCase()
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
      const wageMatch  = block.match(/<li class="wage">([\s\S]*?)<\/li>/)
      const fmWages    = wageMatch ? cleanHtml(wageMatch[1]) + ' p/w' : null

      players.push({
        id: `fmi-${playerId}`,
        name,
        nationality: natMatch?.[1]?.trim() ?? null,
        team: clubMatch?.[1]?.trim() ?? null,
        league: null,
        position: posMatch ? normalizePosition(posMatch[1]) : null,
        dateOfBirth: null,
        heightCm: null,
        weightKg: null,
        preferredFoot: null,
        contractUntil: null,
        passports: null,
        joiningDate: null,
        photo,
        description: null,
        marketValue: null,
        fmWages,
        fmAttributes: null,
        sourceUrl: `https://fminside.net/players/${dbVer}/${fullSlug}`,
        sourceName: 'FMInside',
      })

      if (players.length >= 10) break
    }

    // Fetch profiles for top 3 in parallel to get attributes (6s timeout each)
    await Promise.allSettled(
      players.slice(0, 3).map(async player => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 6000)
        try {
          const res = await sbFetch(player.sourceUrl, false, controller.signal)
          if (!res.ok) return
          player.fmAttributes = parseAttributes(await res.text())
        } catch {
          // ignore — attributes stay null
        } finally {
          clearTimeout(timer)
        }
      })
    )

    return players
  },
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

function parseAttributes(profileHtml: string): string | null {
  const attrRe = /<tr\s+id="[^"]*">\s*<td class="name">(?:<acronym[^>]*>)?([^<]+?)(?:<\/acronym>)?<\/td>\s*<td class="stat[^"]*">(\d+)<\/td>/g
  const attrs: { name: string; value: number }[] = []

  for (const m of profileHtml.matchAll(attrRe)) {
    const name  = m[1].trim()
    const value = parseInt(m[2])
    if (name && !isNaN(value)) attrs.push({ name, value })
  }

  if (attrs.length < 6) return null

  attrs.sort((a, b) => b.value - a.value)
  const top3 = attrs.slice(0, 3).map(a => `${a.name} ${a.value}`).join(', ')
  const bot3 = attrs.slice(-3).reverse().map(a => `${a.name} ${a.value}`).join(', ')

  return `${top3} / ${bot3}`
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
