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

    // Step 1: GET page to collect cookies + CSRF token
    let cookies = ''
    let csrf = ''
    try {
      const getRes = await fetch('https://fminside.net/players', { headers })
      const setCookieHeaders = (getRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.()
      cookies = setCookieHeaders?.length
        ? setCookieHeaders.map(c => c.split(';')[0]).join('; ')
        : getRes.headers.get('set-cookie') ?? ''
      const pageHtml = await getRes.text()
      const csrfMatch = pageHtml.match(/name="_token"[^>]*value="([^"]+)"/)
        ?? pageHtml.match(/meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/)
      csrf = csrfMatch?.[1] ?? ''
    } catch { /* continue */ }

    // Step 2: POST search
    let html = ''
    try {
      const formData = new URLSearchParams()
      formData.set('name', query)
      formData.set('database_version', '7') // FM26
      formData.set('gender', '0')
      if (csrf) formData.set('_token', csrf)

      const res = await fetch('https://fminside.net/players', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies },
        body: formData.toString(),
      })
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
      const dbVersion = match[1]
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
        sourceUrl: `https://fminside.net/players/${dbVersion}/${playerId}-${playerSlug}`,
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
