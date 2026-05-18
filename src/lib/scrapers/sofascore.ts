import type { SiteScraper, ScrapedPlayer } from './types'
import { sbFetch } from './scrapingbee'

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
        // Fetch profile + seasons list in parallel
        const [profileRes, seasonsRes] = await Promise.all([
          sbFetch(`https://api.sofascore.com/api/v1/player/${playerId}`, false, controller.signal),
          sbFetch(`https://api.sofascore.com/api/v1/player/${playerId}/statistics/seasons`, false, controller.signal),
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
          const first = tournamentSeasons?.[0]
          if (first?.seasons?.length) {
            const tId = first.uniqueTournament.id
            const tName = first.uniqueTournament.name
            const sId = first.seasons[0].id
            const sYear = first.seasons[0].year
            const statsRes = await sbFetch(
              `https://api.sofascore.com/api/v1/player/${playerId}/unique-tournament/${tId}/season/${sId}/statistics/overall`,
              false,
              controller.signal
            )
            if (statsRes.ok) {
              const statsData = await statsRes.json() as Record<string, unknown>
              const s = statsData.statistics as Record<string, number> | undefined
              if (s) {
                seasonStats = JSON.stringify({
                  tournament: `${tName} ${sYear}`,
                  apps:         s.appearances          ?? 0,
                  min:          s.minutesPlayed         ?? 0,
                  goals:        s.goals                 ?? 0,
                  assists:      s.assists               ?? 0,
                  rating:       s.rating       != null ? parseFloat(s.rating.toFixed(2))                       : null,
                  xG:           s.expectedGoals != null ? parseFloat(s.expectedGoals.toFixed(2))               : null,
                  xA:           s.expectedAssists != null ? parseFloat(s.expectedAssists.toFixed(2))           : null,
                  shotsOnTarget:s.shotsOnTarget         ?? 0,
                  keyPasses:    s.keyPasses             ?? 0,
                  dribbles:     s.successfulDribbles    ?? 0,
                  passAcc:      s.accuratePassesPercentage != null ? parseFloat(s.accuratePassesPercentage.toFixed(1)) : null,
                  tackles:      s.tackles               ?? 0,
                  interceptions:s.interceptions         ?? 0,
                  yc:           s.yellowCards            ?? 0,
                  rc:           (s.directRedCards ?? 0) + (s.yellowRedCards ?? 0),
                })
              }
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
