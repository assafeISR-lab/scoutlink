import type { SiteScraper, ScrapedPlayer } from './types'

const POSITION_MAP: Record<string, string> = {
  F: 'Forward', M: 'Midfielder', D: 'Defender', G: 'Goalkeeper',
}

export const sofascoreScraper: SiteScraper = {
  domains: ['sofascore.com', 'www.sofascore.com'],
  name: 'Sofascore',
  async search(query: string): Promise<ScrapedPlayer[]> {
    const res = await fetch(
      `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.sofascore.com/',
        },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()

    const players: ScrapedPlayer[] = []
    for (const entry of (data.players ?? [])) {
      const p = entry.player ?? entry
      const team = entry.team ?? p.team ?? null
      const dob = p.dateOfBirthTimestamp
        ? new Date(p.dateOfBirthTimestamp * 1000).toISOString().split('T')[0]
        : null

      players.push({
        id: `sofascore-${p.id}`,
        name: p.name ?? p.shortName,
        nationality: p.country?.name ?? null,
        team: team?.name ?? null,
        position: POSITION_MAP[p.position] ?? p.position ?? null,
        dateOfBirth: dob,
        heightCm: p.height ?? null,
        weightKg: p.weight ?? null,
        photo: p.id ? `https://api.sofascore.com/api/v1/player/${p.id}/image` : null,
        description: null,
        sourceUrl: `https://www.sofascore.com/player/${p.slug ?? p.name?.toLowerCase().replace(/\s+/g, '-')}/${p.id}`,
        sourceName: 'Sofascore',
      })
    }
    return players
  },
}
