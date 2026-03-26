import type { SiteScraper, ScrapedPlayer } from './types'

const POSITION_MAP: Record<string, string> = {
  F: 'Forward', M: 'Midfielder', D: 'Defender', G: 'Goalkeeper',
}

export const sofascoreScraper: SiteScraper = {
  domains: ['sofascore.com', 'www.sofascore.com'],
  name: 'Sofascore',
  async search(query: string): Promise<ScrapedPlayer[]> {
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.sofascore.com/',
      'Origin': 'https://www.sofascore.com',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }

    // Step 1: Visit main site to pick up cookies
    let cookieStr = ''
    try {
      const pageRes = await fetch('https://www.sofascore.com/', {
        headers: { ...baseHeaders, 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8', 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'none' },
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

    const apiHeaders = {
      ...baseHeaders,
      'Accept': 'application/json',
      ...(cookieStr ? { 'Cookie': cookieStr } : {}),
    }

    // Step 2: Try api.sofascore.com first, then www.sofascore.com as fallback
    const endpoints = [
      `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`,
      `https://www.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`,
    ]

    let data: Record<string, unknown> | null = null
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: apiHeaders })
        if (!res.ok) continue
        data = await res.json()
        break
      } catch (err) {
        console.log('[Sofascore] fetch error:', err)
        continue
      }
    }

    if (!data) return []

    // API returns { results: [{ entity: { id, name, ... }, type: 'player' }, ...] }
    const entries = (data.results ?? data.players ?? []) as Record<string, unknown>[]

    const players: ScrapedPlayer[] = []
    for (const entry of entries) {
      // Only process player entries
      if (entry.type && entry.type !== 'player') continue
      const p = (entry.entity ?? entry.player ?? entry) as Record<string, unknown>
      if (!p?.id || !p?.name) continue

      const team = (p.team ?? entry.team) as Record<string, unknown> | null
      const dob = typeof p.dateOfBirthTimestamp === 'number'
        ? new Date(p.dateOfBirthTimestamp * 1000).toISOString().split('T')[0]
        : null

      players.push({
        id: `sofascore-${p.id}`,
        name: (p.name ?? p.shortName) as string,
        nationality: (p.country as Record<string, unknown> | null)?.name as string ?? null,
        team: team?.name as string ?? null,
        position: POSITION_MAP[p.position as string] ?? p.position as string ?? null,
        dateOfBirth: dob,
        heightCm: p.height as number ?? null,
        weightKg: p.weight as number ?? null,
        photo: `https://api.sofascore.com/api/v1/player/${p.id}/image`,
        description: null,
        marketValue: null,
        sourceUrl: `https://www.sofascore.com/player/${p.slug ?? (p.name as string)?.toLowerCase().replace(/\s+/g, '-')}/${p.id}`,
        sourceName: 'Sofascore',
      })
    }
    return players
  },
}
