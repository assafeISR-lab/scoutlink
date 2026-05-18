'use client'

interface SeasonStats {
  tournament: string
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

function fmt(v: unknown, decimals = 0): string {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  return decimals ? n.toFixed(decimals) : String(Math.round(n))
}

export default function SeasonStatsGrid({ json }: { json: string }) {
  let s: SeasonStats
  try { s = JSON.parse(json) as SeasonStats } catch { return null }

  const rows: [string, string, string, string][] = [
    ['Apps',     fmt(s.apps),              'Min',      fmt(s.min)],
    ['Goals',    fmt(s.goals),             'Assists',  fmt(s.assists)],
    ['Rating',   fmt(s.rating, 2),         'xG',       fmt(s.xG, 2)],
    ['SoT',      fmt(s.shotsOnTarget),     'xA',       fmt(s.xA, 2)],
    ['KP',       fmt(s.keyPasses),         'Dribbles', fmt(s.dribbles)],
    ['Pass%',    s.passAcc != null ? `${fmt(s.passAcc, 1)}%` : '—', 'Tackles', fmt(s.tackles)],
    ['Intercept',fmt(s.interceptions),     'YC / RC',  `${fmt(s.yc)} / ${fmt(s.rc)}`],
  ]

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[9px] font-semibold truncate" style={{ color: '#00c896' }}>
        {s.tournament}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {rows.map(([k1, v1, k2, v2]) => (
          <div key={k1} className="contents">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] truncate" style={{ color: 'var(--text-faint)' }}>{k1}</span>
              <span className="text-[9px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{v1}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] truncate" style={{ color: 'var(--text-faint)' }}>{k2}</span>
              <span className="text-[9px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{v2}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
