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

    // Step 1: GET the players page first to pick up any session cookies
    const getRes = await fetch('https://fminside.net/players', { headers })
    const cookies = getRes.headers.get('set-cookie') ?? ''

    // Step 2: POST search with player name
    const formData = new URLSearchParams()
    formData.set('name', query)
    formData.set('db', '7') // FM26 (latest)

    const res = await fetch('https://fminside.net/players', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
      },
      body: formData.toString(),
    })

    if (!res.ok) return []
    const html = await res.text()

    const players: ScrapedPlayer[] = []

    // Parse player rows from the table
    // Row pattern: <tr> with player link /players/{db}/{id}-{slug}
    const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]

    for (const row of rowMatches) {
      const rowHtml = row[1]

      // Player link and name
      const linkMatch = rowHtml.match(/href="\/players\/\d+\/((\d+)-([^"]+))"[^>]*>\s*([^<]+)<\/a>/i)
      if (!linkMatch) continue
      const playerId = linkMatch[2]
      const playerSlug = linkMatch[3]
      const name = linkMatch[4].trim()
      if (!name || name.length < 2) continue

      // Position — look for common position abbreviations in td cells
      const posMatch = rowHtml.match(/<td[^>]*>\s*(GK|CB|RB|LB|RWB|LWB|CDM|CM|CAM|RM|LM|RW|LW|ST|CF|AM)\s*<\/td>/i)
      const position = posMatch ? normalizePosition(posMatch[1]) : null

      // Age
      const ageMatch = rowHtml.match(/<td[^>]*>\s*(\d{2})\s*<\/td>/)
      const age = ageMatch ? parseInt(ageMatch[1]) : null
      const approxDob = age
        ? new Date(new Date().getFullYear() - age, 6, 1).toISOString().split('T')[0]
        : null

      // Club name
      const clubMatch = rowHtml.match(/title="([^"]+)"[^>]*>\s*<img[^>]+(?:club|team)/i)
        ?? rowHtml.match(/class="[^"]*club[^"]*"[^>]*>\s*([^<]+)<\//i)
      const club = clubMatch?.[1]?.trim() ?? null

      // Nationality flag alt text
      const natMatch = rowHtml.match(/<img[^>]+(?:flag|nationality)[^>]+alt="([^"]+)"/i)
        ?? rowHtml.match(/alt="([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)"[^>]*class="[^"]*flag/i)
      const nationality = natMatch?.[1]?.trim() ?? null

      // Photo
      const photoMatch = rowHtml.match(/src="(https?:\/\/[^"]+player[^"]+(?:png|jpg|webp)[^"]*)"/i)
      const photo = photoMatch?.[1] ?? null

      players.push({
        id: `fmi-${playerId}`,
        name,
        nationality,
        team: club,
        position,
        dateOfBirth: approxDob,
        heightCm: null,
        weightKg: null,
        photo,
        description: null,
        sourceUrl: `https://fminside.net/players/7/${playerId}-${playerSlug}`,
        sourceName: 'FMInside',
      })
    }

    return players
  },
}

function normalizePosition(pos: string): string {
  const map: Record<string, string> = {
    GK: 'Goalkeeper',
    CB: 'Defender', RB: 'Defender', LB: 'Defender', RWB: 'Defender', LWB: 'Defender',
    CDM: 'Midfielder', CM: 'Midfielder', CAM: 'Midfielder', RM: 'Midfielder', LM: 'Midfielder',
    RW: 'Forward', LW: 'Forward', ST: 'Forward', CF: 'Forward', AM: 'Midfielder',
  }
  return map[pos.toUpperCase()] ?? pos
}
