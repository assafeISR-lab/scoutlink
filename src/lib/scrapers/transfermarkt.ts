import type { SiteScraper, ScrapedPlayer } from './types'

export const transfermarktScraper: SiteScraper = {
  domains: ['transfermarkt.com', 'www.transfermarkt.com'],
  name: 'Transfermarkt',
  async search(query: string): Promise<ScrapedPlayer[]> {
    const res = await fetch(
      `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}&Spieler_page=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return []
    const html = await res.text()

    const players: ScrapedPlayer[] = []

    // Find the players results section (between "Players" heading and next section)
    const spielerSection = html.match(/id="yw1"[\s\S]*?<\/table>/)?.[0] ?? ''
    if (!spielerSection) return []

    // Each player row
    const rows = [...spielerSection.matchAll(/<tr[^>]*class="[^"]*(?:odd|even)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)]

    for (const row of rows) {
      const rowHtml = row[1]

      // Player name + link
      const nameMatch = rowHtml.match(/spieler\/(\d+)"[^>]*>\s*([^<]+)<\/a>/)
      if (!nameMatch) continue
      const playerId = nameMatch[1]
      const name = nameMatch[2].trim()

      // Position
      const posMatch = rowHtml.match(/<td[^>]*>([A-Za-z\s]+)<\/td>/)
      const position = posMatch?.[1]?.trim() ?? null

      // Age (number in a td)
      const ageMatch = rowHtml.match(/<td[^>]*>(\d{2})<\/td>/)
      const age = ageMatch ? parseInt(ageMatch[1]) : null
      const approxDob = age
        ? new Date(new Date().getFullYear() - age, 0, 1).toISOString().split('T')[0]
        : null

      // Club
      const clubMatch = rowHtml.match(/verein\/\d+[^>]*>\s*([^<]+)<\/a>/)
      const club = clubMatch?.[1]?.trim() ?? null

      // Photo
      const photoMatch = rowHtml.match(/src="(https:\/\/img\.transfermarkt\.com\/[^"]+)"/i)
      const photo = photoMatch?.[1] ?? null

      // Nationality (alt text of flag img)
      const natMatch = rowHtml.match(/flaggenrahmen[^>]+alt="([^"]+)"/)
      const nationality = natMatch?.[1] ?? null

      players.push({
        id: `tm-${playerId}`,
        name,
        nationality,
        team: club,
        position,
        dateOfBirth: approxDob,
        heightCm: null,
        weightKg: null,
        photo,
        description: null,
        sourceUrl: `https://www.transfermarkt.com/x/profil/spieler/${playerId}`,
        sourceName: 'Transfermarkt',
      })
    }
    return players
  },
}
