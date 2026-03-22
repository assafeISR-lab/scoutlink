import type { SiteScraper, ScrapedPlayer } from './types'

const POSITION_MAP: Record<string, string> = {
  F: 'Forward', M: 'Midfielder', D: 'Defender', G: 'Goalkeeper',
}

export const sofascoreScraper: SiteScraper = {
  domains: ['sofascore.com', 'www.sofascore.com'],
  name: 'Sofascore',
  async search(query: string): Promise<ScrapedPlayer[]> {
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.sofascore.com/',
      'Origin': 'https://www.sofascore.com',
    }

    // Step 1: Visit main site to pick up cookies (needed to bypass 403)
    let cookieStr = ''
    try {
      const pageRes = await fetch('https://www.sofascore.com/', {
        headers: { ...baseHeaders, 'Accept': 'text/html,*/*' },
      })
      const setCookies = (pageRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.()
      if (setCookies?.length) {
        cookieStr = setCookies.map(c => c.split(';')[0]).join('; ')
      } else {
        const raw = pageRes.headers.get('set-cookie') ?? ''
        cookieStr = raw.split(',').map(c => c.trim().split(';')[0]).join('; ')
      }
    } catch {
      // Continue without cookies
    }

    // Step 2: Call the search API
    try {
      const res = await fetch(
        `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`,
        {
          headers: {
            ...baseHeaders,
            'Accept': 'application/json',
            ...(cookieStr ? { 'Cookie': cookieStr } : {}),
          },
        }
      )
      if (!res.ok) return []
      const data = await res.json()

      const players: ScrapedPlayer[] = []
      for (const entry of (data.players ?? [])) {
        const p = entry.player ?? entry
        if (!p?.id || !p?.name) continue
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
          photo: `https://api.sofascore.com/api/v1/player/${p.id}/image`,
          description: null,
          marketValue: null,
          sourceUrl: `https://www.sofascore.com/player/${p.slug ?? p.name?.toLowerCase().replace(/\s+/g, '-')}/${p.id}`,
          sourceName: 'Sofascore',
        })
      }
      return players
    } catch {
      return []
    }
  },
}
