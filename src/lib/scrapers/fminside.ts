import type { SiteScraper, ScrapedPlayer } from './types'

export const fmInsideScraper: SiteScraper = {
  domains: ['fminside.net', 'www.fminside.net'],
  name: 'FMInside',
  async search(query: string): Promise<ScrapedPlayer[]> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://fminside.net/players',
    }

    // GET with query params — CSRF token is JS-rendered so POST approach doesn't work
    let html = ''
    try {
      const url = `https://fminside.net/players?name=${encodeURIComponent(query)}&database_version=7&gender=0`
      const res = await fetch(url, { headers })
      if (!res.ok) return []
      html = await res.text()
    } catch {
      return []
    }

    // Parse player links — actual structure uses <a> tags inside <b> blocks, NOT <tr> rows
    // Link format: href="/players/{db-version}/{id}-{slug}"
    const linkRe = /<a[^>]*href="\/players\/([\w-]+)\/((\d+)-([^"]+))"[^>]*title="([^"]+)"[^>]*>/g
    const linkMatches = [...html.matchAll(linkRe)]

    const players: ScrapedPlayer[] = []
    const seen = new Set<string>()

    for (const match of linkMatches) {
      const dbVer = match[1]
      const playerId = match[3]
      const playerSlug = match[4]
      const name = match[5].trim()
      if (!name || name.length < 2 || seen.has(playerId)) continue
      seen.add(playerId)

      const linkPos = match.index!
      const before = html.slice(Math.max(0, linkPos - 400), linkPos)
      const after = html.slice(linkPos, linkPos + 600)

      // Nationality: <img class="flag" code="France" src="...">
      const natMatch = before.match(/class="flag"[^>]*code="([^"]+)"/)
        ?? before.match(/code="([^"]+)"[^>]*class="flag"/)
      const nationality = natMatch?.[1]?.trim() ?? null

      // Photo: constructed from player ID
      const photo = `https://img.fminside.net/facesfm26/${playerId}.png`

      // Position: first <span position="..."> after the link
      const posMatch = after.match(/<span[^>]*position="([^"]+)"[^>]*class="position/)
      const position = posMatch ? normalizePosition(posMatch[1]) : null

      // Club: text content of club link after the img tag
      const clubMatch = after.match(/href="\/clubs\/[^"]*">(?:<img[^>]*>)?([^<]+)<\/a>/)
      const club = clubMatch?.[1]?.trim() ?? null

      players.push({
        id: `fmi-${playerId}`,
        name,
        nationality,
        team: club,
        position,
        dateOfBirth: null,
        heightCm: null,
        weightKg: null,
        photo,
        description: null,
        marketValue: null,
        sourceUrl: `https://fminside.net/players/${dbVer}/${playerId}-${playerSlug}`,
        sourceName: 'FMInside',
      })
    }

    return players
  },
}

function normalizePosition(pos: string): string {
  const map: Record<string, string> = {
    gk: 'Goalkeeper',
    dc: 'Defender', dr: 'Defender', dl: 'Defender', wb: 'Defender', wbr: 'Defender', wbl: 'Defender',
    dm: 'Midfielder', mc: 'Midfielder', ml: 'Midfielder', mr: 'Midfielder', am: 'Midfielder', aml: 'Midfielder', amr: 'Midfielder',
    st: 'Forward', sc: 'Forward',
  }
  return map[pos.toLowerCase()] ?? pos.toUpperCase()
}
