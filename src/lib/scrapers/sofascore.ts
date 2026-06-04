import type { SiteScraper, ScrapedPlayer } from './types'
import { sbFetch } from './scrapingbee'

// Direct fetch for Sofascore JSON API endpoints — much faster than going through
// ScrapingBee. Falls back to sbFetch only if the direct call is blocked/fails.
async function apiFetch(url: string, signal?: AbortSignal): Promise<Response> {
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.sofascore.com/',
        'Origin': 'https://www.sofascore.com',
      },
    })
    if (res.ok) return res
    throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    return sbFetch(url, false, signal)
  }
}

const POSITION_MAP: Record<string, string> = {
  F: 'Forward', M: 'Midfielder', D: 'Defender', G: 'Goalkeeper',
}

const DETAILED_POSITION_MAP: Record<string, string> = {
  GK: 'Goalkeeper',
  CB: 'Centre-Back', RB: 'Right-Back', LB: 'Left-Back',
  RWB: 'Right Wing-Back', LWB: 'Left Wing-Back',
  CDM: 'Defensive Midfielder', CM: 'Central Midfielder',
  CAM: 'Attacking Midfielder', RM: 'Right Midfielder', LM: 'Left Midfielder',
  RW: 'Right Winger', LW: 'Left Winger',
  SS: 'Second Striker', CF: 'Centre-Forward', ST: 'Striker',
}

function formatMarketValue(value: number | null | undefined): string | null {
  if (!value || value <= 0) return null
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(2)}m`
  if (value >= 1_000) return `€${Math.round(value / 1_000)}k`
  return `€${value}`
}

// Core enrichment: fetches profile + seasons + heatmap for a known Sofascore player ID.
// Used by both search() and scrapeByUrl().
async function enrichById(playerId: number, signal: AbortSignal): Promise<ScrapedPlayer> {
  const [profileRes, seasonsRes] = await Promise.all([
    apiFetch(`https://api.sofascore.com/api/v1/player/${playerId}`, signal),
    apiFetch(`https://api.sofascore.com/api/v1/player/${playerId}/statistics/seasons`, signal),
  ])

  if (!profileRes.ok) throw new Error(`Profile HTTP ${profileRes.status}`)

  const profileData = await profileRes.json() as Record<string, unknown>
  const pl = (profileData.player ?? profileData) as Record<string, unknown>

  const name = pl.name as string
  if (!name) throw new Error('No player name in profile response')

  const teamData = pl.team as Record<string, unknown> | null
  const nationality = (pl.country as Record<string, unknown> | null)?.name as string ?? null
  const teamName = teamData?.name as string ?? null
  const slug = pl.slug as string ?? name.toLowerCase().replace(/\s+/g, '-')

  const heightCm: number | null = pl.height as number ?? null

  let dateOfBirth: string | null = null
  if (typeof pl.dateOfBirthTimestamp === 'number') {
    dateOfBirth = new Date((pl.dateOfBirthTimestamp as number) * 1000).toISOString().split('T')[0]
  }

  const marketValue = formatMarketValue(pl.proposedMarketValue as number | null | undefined)
  const preferredFoot: string | null = pl.preferredFoot as string ?? null

  let contractUntil: string | null = null
  if (typeof pl.contractUntilTimestamp === 'number') {
    contractUntil = new Date((pl.contractUntilTimestamp as number) * 1000).toISOString().split('T')[0]
  }

  const primary = pl.primaryUniqueTournament as Record<string, unknown> | null
  const tournament = teamData?.tournament as Record<string, unknown> | null
  const uniqueTournament = tournament?.uniqueTournament as Record<string, unknown> | null
  const league = (primary?.name ?? uniqueTournament?.name) as string | null ?? null

  let position = POSITION_MAP[pl.position as string] ?? pl.position as string ?? null
  const detailed = pl.positionsDetailed as string[] | null
  if (detailed?.length) {
    position = DETAILED_POSITION_MAP[detailed[0]] ?? detailed[0]
  }

  let seasonStats: string | null = null
  let heatmap: string | null = null

  if (seasonsRes.ok) {
    type TournSeason = { uniqueTournament: { id: number; name: string }; seasons: { id: number; year: string }[] }
    const seasonsData = await seasonsRes.json() as Record<string, unknown>
    const tournamentSeasons = seasonsData.uniqueTournamentSeasons as TournSeason[] | undefined

    if (tournamentSeasons?.length) {
      const yearMap = new Map<string, { tId: number; tName: string; sId: number }>()
      for (const ts of tournamentSeasons) {
        for (const sv of ts.seasons) {
          if (!yearMap.has(sv.year)) {
            yearMap.set(sv.year, { tId: ts.uniqueTournament.id, tName: ts.uniqueTournament.name, sId: sv.id })
          }
        }
      }

      const normYearKey = (y: string): number => {
        const n = parseInt(y.includes('/') ? y.split('/')[0] : y)
        return n < 100 ? 2000 + n : n
      }

      const seenCanon = new Set<number>()
      const candidateYears = [...yearMap.entries()]
        .sort((a, b) => {
          const diff = normYearKey(b[0]) - normYearKey(a[0])
          if (diff !== 0) return diff
          return (a[0].includes('/') ? 0 : 1) - (b[0].includes('/') ? 0 : 1)
        })
        .reduce<Array<[string, { tId: number; tName: string; sId: number }]>>((acc, entry) => {
          const canon = normYearKey(entry[0])
          if (!seenCanon.has(canon)) { seenCanon.add(canon); acc.push(entry) }
          return acc
        }, [])
        .slice(0, 6)

      const [statsResponses, heatmapRes] = await Promise.all([
        Promise.allSettled(
          candidateYears.map(([, { tId, sId }]) =>
            apiFetch(
              `https://api.sofascore.com/api/v1/player/${playerId}/unique-tournament/${tId}/season/${sId}/statistics/overall`,
              signal
            )
          )
        ),
        candidateYears.length > 0
          ? apiFetch(
              `https://api.sofascore.com/api/v1/player/${playerId}/unique-tournament/${candidateYears[0][1].tId}/season/${candidateYears[0][1].sId}/heatmap`,
              signal
            ).catch(() => null)
          : Promise.resolve(null),
      ])

      const parseStat = (n: number | undefined, decimals: number): number | null =>
        n != null ? parseFloat(n.toFixed(decimals)) : null

      const seasons = (await Promise.all(
        statsResponses.map(async (r, i) => {
          if (r.status !== 'fulfilled' || !r.value.ok) return null
          const d = await r.value.json() as Record<string, unknown>
          const s = d.statistics as Record<string, number> | undefined
          if (!s) return null
          const [year, { tName }] = candidateYears[i]
          return {
            year,
            tournament:    tName,
            apps:          s.appearances               ?? 0,
            min:           s.minutesPlayed              ?? 0,
            goals:         s.goals                      ?? 0,
            assists:       s.assists                    ?? 0,
            rating:        parseStat(s.rating,            2),
            xG:            parseStat(s.expectedGoals,     2),
            xA:            parseStat(s.expectedAssists,   2),
            shotsOnTarget: s.shotsOnTarget              ?? 0,
            keyPasses:     s.keyPasses                  ?? 0,
            dribbles:      s.successfulDribbles         ?? 0,
            passAcc:       parseStat(s.accuratePassesPercentage, 1),
            tackles:       s.tackles                    ?? 0,
            interceptions: s.interceptions              ?? 0,
            yc:            s.yellowCards                ?? 0,
            rc:            (s.directRedCards ?? 0) + (s.yellowRedCards ?? 0),
          }
        })
      )).filter(Boolean).slice(0, 3)

      if (seasons.length > 0) seasonStats = JSON.stringify({ seasons })

      if (heatmapRes?.ok) {
        try {
          const hmData = await heatmapRes.json() as Record<string, unknown>
          const pts = hmData.points as Array<{ x: number; y: number; count?: number }> | undefined
          if (pts && pts.length > 0) {
            const [year, { tName }] = candidateYears[0]
            const maxVal = Math.max(...pts.flatMap(p => [p.x, p.y]))
            const normalized = maxVal <= 1.0 ? pts.map(p => ({ x: p.x * 100, y: p.y * 100 })) : pts.map(p => ({ x: p.x, y: p.y }))
            heatmap = JSON.stringify({ points: normalized, season: year, tournament: tName })
          }
        } catch { /* skip heatmap */ }
      }
    }
  }

  return {
    id: `sofascore-${playerId}`,
    name,
    nationality,
    team: teamName,
    league,
    position,
    dateOfBirth,
    heightCm,
    preferredFoot,
    contractUntil,
    passports: null,
    joiningDate: null,
    photo: `https://api.sofascore.com/api/v1/player/${playerId}/image`,
    description: null,
    marketValue,
    fmWages: null,
    fmAttributes: null,
    seasonStats,
    heatmap,
    sourceUrl: `https://www.sofascore.com/player/${slug}/${playerId}`,
    sourceName: 'Sofascore',
  } as ScrapedPlayer
}

export const sofascoreScraper: SiteScraper = {
  domains: ['sofascore.com', 'www.sofascore.com'],
  name: 'Sofascore',
  async search(query: string): Promise<ScrapedPlayer[]> {
    const searchRes = await sbFetch(
      `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`
    )
    if (!searchRes.ok) throw new Error(`Sofascore search HTTP ${searchRes.status}`)

    let data: Record<string, unknown>
    try {
      data = await searchRes.json() as Record<string, unknown>
    } catch {
      throw new Error('Sofascore search returned non-JSON response')
    }
    const entries = Array.isArray(data.results) ? data.results as Record<string, unknown>[] : []

    const footballPlayers = entries.filter(entry => {
      const type = (entry.type as string | undefined)?.toLowerCase()
      return type === 'player'
    })

    const top = footballPlayers.slice(0, 6)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const enriched = await Promise.allSettled(
        top.map(entry => {
          const p = (entry.entity ?? entry) as Record<string, unknown>
          return enrichById(p.id as number, controller.signal)
        })
      )
      return enriched
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<ScrapedPlayer>).value)
    } finally {
      clearTimeout(timer)
    }
  },
}

// Scrape a single player by their Sofascore profile URL.
// URL format: https://www.sofascore.com/player/{slug}/{numericId}
export async function scrapeByUrl(url: string): Promise<ScrapedPlayer | null> {
  const idMatch = url.match(/\/(\d+)\/?(?:[?#].*)?$/)
  if (!idMatch) return null
  const playerId = parseInt(idMatch[1])
  if (isNaN(playerId)) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    return await enrichById(playerId, controller.signal)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Re-fetch heatmap only for a player already in the DB (used by the refresh-heatmap API route)
export async function fetchSofascoreHeatmap(playerId: number): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const seasonsRes = await apiFetch(
      `https://api.sofascore.com/api/v1/player/${playerId}/statistics/seasons`,
      controller.signal
    )
    if (!seasonsRes.ok) return null

    type TournSeason = { uniqueTournament: { id: number; name: string }; seasons: { id: number; year: string }[] }
    const seasonsData = await seasonsRes.json() as Record<string, unknown>
    const tournamentSeasons = seasonsData.uniqueTournamentSeasons as TournSeason[] | undefined
    if (!tournamentSeasons?.length) return null

    const yearMap = new Map<string, { tId: number; tName: string; sId: number }>()
    for (const ts of tournamentSeasons) {
      for (const sv of ts.seasons) {
        if (!yearMap.has(sv.year)) {
          yearMap.set(sv.year, { tId: ts.uniqueTournament.id, tName: ts.uniqueTournament.name, sId: sv.id })
        }
      }
    }

    const normYearKey = (y: string): number => {
      const n = parseInt(y.includes('/') ? y.split('/')[0] : y)
      return n < 100 ? 2000 + n : n
    }

    const seenCanon = new Set<number>()
    const candidateYears = [...yearMap.entries()]
      .sort((a, b) => {
        const diff = normYearKey(b[0]) - normYearKey(a[0])
        if (diff !== 0) return diff
        return (a[0].includes('/') ? 0 : 1) - (b[0].includes('/') ? 0 : 1)
      })
      .reduce<Array<[string, { tId: number; tName: string; sId: number }]>>((acc, entry) => {
        const canon = normYearKey(entry[0])
        if (!seenCanon.has(canon)) { seenCanon.add(canon); acc.push(entry) }
        return acc
      }, [])

    if (!candidateYears.length) return null
    const [year, { tId, tName, sId }] = candidateYears[0]

    const heatmapRes = await apiFetch(
      `https://api.sofascore.com/api/v1/player/${playerId}/unique-tournament/${tId}/season/${sId}/heatmap`,
      controller.signal
    ).catch(() => null)

    if (!heatmapRes?.ok) return null

    const hmData = await heatmapRes.json() as Record<string, unknown>
    const pts = hmData.points as Array<{ x: number; y: number; count?: number }> | undefined
    if (!pts?.length) return null

    const maxVal = Math.max(...pts.flatMap(p => [p.x, p.y]))
    const normalized = maxVal <= 1.0 ? pts.map(p => ({ x: p.x * 100, y: p.y * 100 })) : pts.map(p => ({ x: p.x, y: p.y }))
    return JSON.stringify({ points: normalized, season: year, tournament: tName })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
