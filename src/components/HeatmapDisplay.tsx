'use client'

import { useMemo } from 'react'

interface HeatPoint { x: number; y: number }
interface HeatmapData {
  points: HeatPoint[]
  season?: string
  tournament?: string
}

const PW = 68
const PH = 105

export default function HeatmapDisplay({ json }: { json: string | null }) {
  const data = useMemo<HeatmapData | null>(() => {
    if (!json) return null
    try {
      const d = JSON.parse(json) as { points?: HeatPoint[]; season?: string; tournament?: string }
      if (!d?.points?.length) return null
      // Normalize coords to 0-100 range regardless of source scale
      const maxVal = Math.max(...d.points.flatMap(p => [p.x, p.y]))
      const pts = maxVal <= 1.0
        ? d.points.map(p => ({ x: p.x * 100, y: p.y * 100 }))
        : d.points
      return { points: pts, season: d.season, tournament: d.tournament }
    } catch { return null }
  }, [json])

  if (!data) return null

  return (
    <div className="flex flex-col gap-1.5">
      {(data.tournament || data.season) && (
        <p className="text-[9px] truncate" style={{ color: 'var(--text-faint)' }}>
          {[data.tournament, data.season].filter(Boolean).join(' · ')}
        </p>
      )}
      <svg
        viewBox={`0 0 ${PW} ${PH}`}
        style={{ width: '100%', display: 'block', borderRadius: 6 }}
        aria-label="Position heatmap"
      >
        {/* Alternating pitch stripes */}
        {[...Array(7)].map((_, i) => (
          <rect key={i} x={0} y={i * 15} width={PW} height={15}
            fill={i % 2 === 0 ? '#1e4a1a' : '#224f1e'} />
        ))}

        {/* Pitch outline */}
        <rect x={0} y={0} width={PW} height={PH} fill="none"
          stroke="rgba(255,255,255,0.55)" strokeWidth={0.6} />

        {/* Halfway line */}
        <line x1={0} y1={PH / 2} x2={PW} y2={PH / 2}
          stroke="rgba(255,255,255,0.55)" strokeWidth={0.6} />

        {/* Center circle + spot */}
        <circle cx={PW / 2} cy={PH / 2} r={9.15} fill="none"
          stroke="rgba(255,255,255,0.55)" strokeWidth={0.6} />
        <circle cx={PW / 2} cy={PH / 2} r={0.8} fill="rgba(255,255,255,0.55)" />

        {/* Top penalty area */}
        <rect x={13.84} y={0} width={40.32} height={16.5} fill="none"
          stroke="rgba(255,255,255,0.55)" strokeWidth={0.6} />
        {/* Top 6-yard box */}
        <rect x={24.84} y={0} width={18.32} height={5.5} fill="none"
          stroke="rgba(255,255,255,0.55)" strokeWidth={0.6} />
        {/* Top penalty spot */}
        <circle cx={PW / 2} cy={11} r={0.6} fill="rgba(255,255,255,0.55)" />

        {/* Bottom penalty area */}
        <rect x={13.84} y={PH - 16.5} width={40.32} height={16.5} fill="none"
          stroke="rgba(255,255,255,0.55)" strokeWidth={0.6} />
        {/* Bottom 6-yard box */}
        <rect x={24.84} y={PH - 5.5} width={18.32} height={5.5} fill="none"
          stroke="rgba(255,255,255,0.55)" strokeWidth={0.6} />
        {/* Bottom penalty spot */}
        <circle cx={PW / 2} cy={PH - 11} r={0.6} fill="rgba(255,255,255,0.55)" />

        {/* Heatmap dots — overlapping circles create density effect */}
        {data.points.map((pt, i) => (
          <circle
            key={i}
            cx={(pt.x / 100) * PW}
            cy={(pt.y / 100) * PH}
            r={3.8}
            fill="rgba(255,110,0,0.13)"
          />
        ))}
      </svg>
    </div>
  )
}
