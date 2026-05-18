'use client'

export default function FMRadarChart({ fmAttributes }: { fmAttributes: string }) {
  const parts = fmAttributes.split(' / ')
  const parseSection = (s: string) =>
    (s ?? '').split(', ').map(item => {
      const i = item.lastIndexOf(' ')
      return { name: item.slice(0, i).trim(), value: parseInt(item.slice(i + 1)) || 0 }
    }).filter(a => a.name)

  const top = parseSection(parts[0])
  const bot = parseSection(parts[1])

  const AttrRow = ({ name, value, isTop }: { name: string; value: number; isTop: boolean }) => {
    const pct      = Math.min(100, Math.round((value / 100) * 100))
    const fillColor = isTop ? '#00c896' : '#ef4444'
    const valColor  = isTop ? 'var(--accent, #00a87c)' : '#ef4444'
    return (
      <div className="flex items-center" style={{ gap: 7, marginBottom: 4 }}>
        <span className="flex-shrink-0 truncate" style={{ fontSize: 10, color: 'var(--text-secondary)', width: 90 }}>
          {name}
        </span>
        <div className="flex-1 overflow-hidden" style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: fillColor, borderRadius: 2 }} />
        </div>
        <span className="text-right flex-shrink-0 tabular-nums" style={{ fontSize: 10, fontWeight: 700, width: 18, color: valColor }}>
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className="w-full">
      <p className="uppercase font-semibold" style={{ fontSize: 9, letterSpacing: '0.5px', color: 'var(--text-faint)', marginBottom: 5 }}>
        Key Strengths
      </p>
      {top.map((a, i) => <AttrRow key={i} name={a.name} value={a.value} isTop={true} />)}

      <p className="uppercase font-semibold" style={{ fontSize: 9, letterSpacing: '0.5px', color: 'var(--text-faint)', margin: '10px 0 5px' }}>
        Areas for Improvement
      </p>
      {bot.map((a, i) => <AttrRow key={i} name={a.name} value={a.value} isTop={false} />)}
    </div>
  )
}
