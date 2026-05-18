'use client'

interface SeasonData {
  year: string
  apps: number
  min: number
  goals: number
  assists: number
  rating: number | null
  xG: number | null
  xA: number | null
  shotsOnTarget: number
  keyPasses: number
  dribbles: number
  passAcc: number | null
  tackles: number
  interceptions: number
  yc: number
  rc: number
}

interface MultiSeasonStats {
  tournament: string
  seasons: SeasonData[]
}

function fmt(v: unknown, decimals = 0): string {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  return decimals ? n.toFixed(decimals) : String(Math.round(n))
}

const STAT_ROWS: [string, (s: SeasonData) => string][] = [
  ['Apps',       s => fmt(s.apps)],
  ['Minutes',    s => fmt(s.min)],
  ['Goals',      s => fmt(s.goals)],
  ['Assists',    s => fmt(s.assists)],
  ['Rating',     s => fmt(s.rating, 2)],
  ['xG',         s => fmt(s.xG, 2)],
  ['xA',         s => fmt(s.xA, 2)],
  ['Shots',      s => fmt(s.shotsOnTarget)],
  ['Key Passes', s => fmt(s.keyPasses)],
  ['Dribbles',   s => fmt(s.dribbles)],
  ['Pass %',     s => s.passAcc != null ? `${fmt(s.passAcc, 1)}%` : '—'],
  ['Tackles',    s => fmt(s.tackles)],
  ['Intercept',  s => fmt(s.interceptions)],
  ['Yellow C',   s => fmt(s.yc)],
  ['Red C',      s => fmt(s.rc)],
]

export default function SeasonStatsGrid({ json }: { json: string }) {
  let data: MultiSeasonStats
  try { data = JSON.parse(json) as MultiSeasonStats } catch { return null }
  if (!data.seasons?.length) return null

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-semibold" style={{ color: '#00c896' }}>{data.tournament}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontSize: 9 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 64, textAlign: 'left', paddingRight: 6, paddingBottom: 3, color: 'var(--text-faint)', fontWeight: 500 }} />
              {data.seasons.map(s => (
                <th key={s.year} style={{ minWidth: 36, textAlign: 'right', paddingLeft: 4, paddingBottom: 3, color: '#00c896', fontWeight: 700 }}>
                  {s.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAT_ROWS.map(([label, getValue]) => (
              <tr key={label} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ paddingTop: 2, paddingBottom: 2, paddingRight: 6, color: 'var(--text-faint)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {label}
                </td>
                {data.seasons.map(s => (
                  <td key={s.year} style={{ paddingTop: 2, paddingBottom: 2, paddingLeft: 4, textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {getValue(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
