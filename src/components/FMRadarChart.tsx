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
    const pct    = Math.round((value / 99) * 100)
    const color  = isTop ? '#00c896' : 'rgba(255,90,90,0.9)'
    const barBg  = isTop ? 'rgba(0,200,150,0.12)' : 'rgba(255,90,90,0.1)'
    const barFill= isTop ? 'rgba(0,200,150,0.55)' : 'rgba(255,90,90,0.5)'
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] flex-1 truncate" style={{ color }}>{name}</span>
        <div className="w-14 h-1.5 rounded-full flex-shrink-0" style={{ background: barBg }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barFill }} />
        </div>
        <span className="text-[10px] font-bold tabular-nums w-5 text-right flex-shrink-0" style={{ color }}>
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'rgba(0,200,150,0.5)' }}>Key Strengths</p>
        {top.map((a, i) => <AttrRow key={i} name={a.name} value={a.value} isTop={true} />)}
      </div>
      <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="flex flex-col gap-1">
        <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'rgba(255,90,90,0.5)' }}>Areas for Improvement</p>
        {bot.map((a, i) => <AttrRow key={i} name={a.name} value={a.value} isTop={false} />)}
      </div>
    </div>
  )
}
