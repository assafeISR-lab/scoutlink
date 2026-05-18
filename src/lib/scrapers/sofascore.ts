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

    // Keep only player entries; sport field is absent in search results so skip that check
    const footballPlayers = entries.filter(entry => {
      const type = (entry.type as string | undefined)?.toLowerCase()
      return type === 'player'
    })

    // Enrich top 3 results with player profile + season stats (height, DOB, market value, foot, contract, league, stats)
    const top = footballPlayers.slice(0, 3)
    const enriched = await Promise.allSettled(top.map(async (entry) => {
      const p = (entry.entity ?? entry) as Record<string, unknown>
      const playerId = p.id as number
      const teamBasic = p.team as Record<string, unknown> | null

      let heightCm: number | null = null
      let dateOfBirth: string | null = null
      let marketValue: string | null = null
      let preferredFoot: string | null = null
      let contractUntil: string | null = null
      let league: string | null = null
      let position = POSITION_MAP[p.position as string] ?? p.position as string ?? null
      let seasonStats: string | null = null

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12000)
      try {
        // Fetch profile + seasons list in parallel (direct API, no ScrapingBee)
        const [profileRes, seasonsRes] = await Promise.all([
          apiFetch(`https://api.sofascore.com/api/v1/player/${playerId}`, controller.signal),
          apiFetch(`https://api.sofascore.com/api/v1/player/${playerId}/statistics/seasons`, controller.signal),
        ])

        if (profileRes.ok) {
          const profileData = await profileRes.json() as Record<string, unknown>
          const pl = (profileData.player ?? profileData) as Record<string, unknown>

          heightCm = pl.height as number ?? null

          if (typeof pl.dateOfBirthTimestamp === 'number') {
            dateOfBirth = new Date((pl.dateOfBirthTimestamp as number) * 1000).toISOString().split('T')[0]
          }

          marketValue = formatMarketValue(pl.proposedMarketValue as number | null | undefined)
          preferredFoot = pl.preferredFoot as string ?? null

          if (typeof pl.contractUntilTimestamp === 'number') {
            contractUntil = new Date((pl.contractUntilTimestamp as number) * 1000).toISOString().split('T')[0]
          }

          // League: prefer primaryUniqueTournament, fall back to team.tournament.uniqueTournament
          const primary = pl.primaryUniqueTournament as Record<string, unknown> | null
          const teamData = pl.team as Record<string, unknown> | null
          const tournament = teamData?.tournament as Record<string, unknown> | null
          const uniqueTournament = tournament?.uniqueTournament as Record<string, unknown> | null
          league = (primary?.name ?? uniqueTournament?.name) as string | null ?? null

          // Use detailed position if available (e.g. "RW" instead of generic "M")
          const detailed = pl.positionsDetailed as string[] | null
          if (detailed?.length) {
            position = DETAILED_POSITION_MAP[detailed[0]] ?? detailed[0]
          }
        }

        if (seasonsRes.ok) {
          type TournSeason = { uniqueTournament: { id: number; name: string }; seasons: { id: number; year: string }[] }
          const seasonsData = await seasonsRes.json() as Record<string, unknown>
          const tournamentSeasons = seasonsData.uniqueTournamentSeasons as TournSeason[] | undefined

          if (tournamentSeasons?.length) {
            // Build year → best (tId, tName, sId) map by scanning ALL tournaments.
            // Sofascore returns tournaments in popularity order, so the first tournament
            // that has a given year is the most relevant competition for that season.
            const yearMap = new Map<string, { tId: number; tName: string; sId: number }>()
            for (const ts of tournamentSeasons) {
              for (const sv of ts.seasons) {
                if (!yearMap.has(sv.year)) {
                  yearMap.set(sv.year, { tId: ts.uniqueTournament.id, tName: ts.uniqueTournament.name, sId: sv.id })
                }
              }
            }

            // Normalize year key: "25/26" → 2025, "2025" → 2025, "24/25" → 2024
            const normYearKey = (y: string): number => {
              const n = parseInt(y.includes('/') ? y.split('/')[0] : y)
              return n < 100 ? 2000 + n : n
            }

            // Sort newest-first; for equal canonical year prefer "XX/YY" (club season) over "YYYY"
            // Then deduplicate by canonical year, keeping the highest-priority entry.
            // Try up to 6 candidates so that years with no stats for this player are skipped
            // and we still end up with 3 seasons of real data.
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

            // Fetch stats for all candidates in parallel (direct API, no ScrapingBee)
            const statsResponses = await Promise.allSettled(
              candidateYears.map(([, { tId, sId }]) =>
                apiFetch(
                  `https://api.sofascore.com/api/v1/player/${playerId}/unique-tournament/${tId}/season/${sId}/statistics/overall`,
                  controller.signal
                )
              )
            )

            const parseStat = (n: number | undefined, decimals: number): number | null =>
              n != null ? parseFloat(n.toFixed(decimals)) : null

            // Take the 3 most recent years that actually returned stats
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
                  apps:          s.appearances          ?? 0,
                  min:           s.minutesPlayed         ?? 0,
                  goals:         s.goals                 ?? 0,
                  assists:       s.assists               ?? 0,
                  rating:        parseStat(s.rating,       2),
                  xG:            parseStat(s.expectedGoals, 2),
                  xA:            parseStat(s.expectedAssists, 2),
                  shotsOnTarget: s.shotsOnTarget         ?? 0,
                  keyPasses:     s.keyPasses             ?? 0,
                  dribbles:      s.successfulDribbles    ?? 0,
                  passAcc:       parseStat(s.accuratePassesPercentage, 1),
                  tackles:       s.tackles               ?? 0,
                  interceptions: s.interceptions         ?? 0,
                  yc:            s.yellowCards            ?? 0,
                  rc:            (s.directRedCards ?? 0) + (s.yellowRedCards ?? 0),
                }
              })
            )).filter(Boolean).slice(0, 3)

            if (seasons.length > 0) {
              seasonStats = JSON.stringify({ seasons })
            }
          }
        }
      } catch { /* use basic data only */ } finally {
        clearTimeout(timer)
      }

      return {
        id: `sofascore-${playerId}`,
        name: p.name as string,
        nationality: (p.country as Record<string, unknown> | null)?.name as string ?? null,
        team: teamBasic?.name as string ?? null,
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
        sourceUrl: `https://www.sofascore.com/player/${p.slug ?? (p.name as string)?.toLowerCase().replace(/\s+/g, '-')}/${playerId}`,
        sourceName: 'Sofascore',
      } as ScrapedPlayer
    }))

    return enriched
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<ScrapedPlayer>).value)
  },
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
