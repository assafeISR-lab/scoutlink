import type { SiteScraper, ScrapedPlayer } from './types'

const SEARCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Content-Type': 'application/x-www-form-urlencoded',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': 'https://fminside.net/',
  'Origin': 'https://fminside.net',
}

const PROFILE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*',
  'Referer': 'https://fminside.net/players',
}

export const fmInsideScraper: SiteScraper = {
  domains: ['fminside.net', 'www.fminside.net'],
  name: 'FMInside',
  async search(query: string): Promise<ScrapedPlayer[]> {
    // FMInside search uses a plain jQuery POST to /resources/inc/ajax/search.php.
    // No ScrapingBee needed — the endpoint returns HTML player blocks directly.
    let html = ''
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 10000)
      try {
        const body = new URLSearchParams({ search_phrase: query, database_id: '7' })
        const res = await fetch('https://fminside.net/resources/inc/ajax/search.php', {
          method: 'POST',
          headers: SEARCH_HEADERS,
          body: body.toString(),
          signal: controller.signal,
        })
        if (!res.ok) return []
        html = await res.text()
      } finally {
        clearTimeout(timer)
      }
    } catch {
      return []
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

    // Fetch profiles for top 3 in parallel to get attributes (5s timeout each)
    await Promise.allSettled(
      players.slice(0, 3).map(async player => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5000)
        try {
          const res = await fetch(player.sourceUrl, { headers: PROFILE_HEADERS, signal: controller.signal })
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
