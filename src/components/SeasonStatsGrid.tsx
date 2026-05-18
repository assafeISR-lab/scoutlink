'use client'

import { useState } from 'react'

interface SeasonData {
  year: string
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

interface MultiSeasonStats {
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

const EDITOR_ROWS: { label: string; field: keyof SeasonData }[] = [
  { label: 'Apps',       field: 'apps' },
  { label: 'Minutes',    field: 'min' },
  { label: 'Goals',      field: 'goals' },
  { label: 'Assists',    field: 'assists' },
  { label: 'Rating',     field: 'rating' },
  { label: 'xG',         field: 'xG' },
  { label: 'xA',         field: 'xA' },
  { label: 'Shots',      field: 'shotsOnTarget' },
  { label: 'Key Passes', field: 'keyPasses' },
  { label: 'Dribbles',   field: 'dribbles' },
  { label: 'Pass %',     field: 'passAcc' },
  { label: 'Tackles',    field: 'tackles' },
  { label: 'Intercept',  field: 'interceptions' },
  { label: 'Yellow C',   field: 'yc' },
  { label: 'Red C',      field: 'rc' },
]

const NUM_FIELDS = new Set<keyof SeasonData>(['apps','min','goals','assists','rating','xG','xA','shotsOnTarget','keyPasses','dribbles','passAcc','tackles','interceptions','yc','rc'])

function emptySeasonData(): SeasonData {
  return { year: '', tournament: '', apps: 0, min: 0, goals: 0, assists: 0, rating: null, xG: null, xA: null, shotsOnTarget: 0, keyPasses: 0, dribbles: 0, passAcc: null, tackles: 0, interceptions: 0, yc: 0, rc: 0 }
}

const CELL_INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,200,150,0.07)',
  border: '1px solid rgba(0,200,150,0.35)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  fontWeight: 600,
  fontSize: 9,
  textAlign: 'right',
  outline: 'none',
  padding: '1px 3px',
  caretColor: '#00c896',
}

export function SeasonStatsEditor({ json, onChange, onCellBlur }: {
  json: string
  onChange: (json: string) => void
  onCellBlur?: () => void
}) {
  const init: MultiSeasonStats = (() => { try { return JSON.parse(json) } catch { return { seasons: [] } } })()
  const [seasons, setSeasons] = useState<SeasonData[]>(init.seasons ?? [])
  const [activeCell, setActiveCell] = useState<string | null>(null)

  function commit(next: SeasonData[]) {
    setSeasons(next)
    onChange(JSON.stringify({ seasons: next }))
  }

  function updateCell(idx: number, field: keyof SeasonData, raw: string) {
    commit(seasons.map((s, i) => {
      if (i !== idx) return s
      return { ...s, [field]: NUM_FIELDS.has(field) ? (raw === '' ? null : Number(raw)) : raw }
    }))
  }

  function cellKey(col: number, field: string) { return `${col}.${field}` }

  function DataCell({ col, field }: { col: number; field: keyof SeasonData }) {
    const key = cellKey(col, field)
    const val = seasons[col][field]
    const isNum = NUM_FIELDS.has(field)
    const displayVal = isNum ? (val != null ? String(val) : '—') : (String(val || '') || '—')

    if (activeCell === key) {
      return (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          type={isNum ? 'number' : 'text'}
          value={val ?? ''}
          onChange={e => updateCell(col, field, e.target.value)}
          onBlur={() => { setActiveCell(null); onCellBlur?.() }}
          onClick={e => e.stopPropagation()}
          style={CELL_INPUT_STYLE}
        />
      )
    }

    return (
      <div
        className="group cursor-text flex items-center justify-end gap-0.5"
        onClick={e => { e.stopPropagation(); setActiveCell(key) }}
      >
        <span style={{ color: val != null && val !== 0 ? 'var(--text-primary)' : 'var(--text-faint)', fontWeight: 600 }}>
          {displayVal}
        </span>
        <svg className="w-2 h-2 opacity-0 group-hover:opacity-30 flex-shrink-0" viewBox="0 0 24 24" fill="#00c896">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </div>
    )
  }

  function HeaderCell({ col, field }: { col: number; field: 'year' | 'tournament' }) {
    const key = cellKey(col, field)
    const val = seasons[col][field]
    const isYear = field === 'year'

    if (activeCell === key) {
      return (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          type="text"
          value={val}
          placeholder={isYear ? 'Year' : 'Tournament'}
          onChange={e => updateCell(col, field, e.target.value)}
          onBlur={() => { setActiveCell(null); onCellBlur?.() }}
          onClick={e => e.stopPropagation()}
          style={{
            ...CELL_INPUT_STYLE,
            color: isYear ? '#00c896' : 'var(--text-muted)',
            fontWeight: isYear ? 700 : 400,
            fontSize: isYear ? 9 : 8,
          }}
        />
      )
    }

    return (
      <div
        className="group cursor-text"
        onClick={e => { e.stopPropagation(); setActiveCell(key) }}
      >
        {isYear ? (
          <div style={{ color: val ? '#00c896' : 'var(--text-faint)', fontWeight: 700 }}>{val || '—'}</div>
        ) : (
          <div style={{ color: val ? 'var(--text-muted)' : 'var(--text-faint)', fontWeight: 400, fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
            {val || '—'}
          </div>
        )}
      </div>
    )
  }

  if (seasons.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg cursor-pointer"
        style={{ minHeight: 60, border: '1px dashed var(--border)' }}
        onClick={e => { e.stopPropagation(); commit([emptySeasonData()]) }}
      >
        <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>+ Add Season</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 9 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingRight: 6, paddingBottom: 2, minWidth: 64 }} />
            {seasons.map((_, i) => (
              <th key={i} style={{ textAlign: 'right', paddingLeft: 4, paddingBottom: 2, minWidth: 52, verticalAlign: 'bottom' }} className="group/col">
                <HeaderCell col={i} field="year" />
                <div style={{ marginTop: 2 }}><HeaderCell col={i} field="tournament" /></div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); commit(seasons.filter((_, j) => j !== i)) }}
                  className="opacity-0 group-hover/col:opacity-100 transition-opacity"
                  style={{ color: 'rgba(255,80,80,0.55)', fontSize: 7, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'right', paddingTop: 2, lineHeight: 1 }}
                >
                  remove
                </button>
              </th>
            ))}
            {seasons.length < 3 && (
              <th style={{ paddingLeft: 6, verticalAlign: 'bottom', paddingBottom: 2 }}>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); commit([...seasons, emptySeasonData()]) }}
                  style={{ color: '#00c896', opacity: 0.6, fontSize: 8, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + Season
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {EDITOR_ROWS.map(({ label, field }) => (
            <tr key={label} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ paddingTop: 2, paddingBottom: 2, paddingRight: 6, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {label}
              </td>
              {seasons.map((_, i) => (
                <td key={i} style={{ paddingTop: 1, paddingBottom: 1, paddingLeft: 4 }}>
                  <DataCell col={i} field={field} />
                </td>
              ))}
              {seasons.length < 3 && <td />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SeasonStatsGrid({ json }: { json: string }) {
  let data: MultiSeasonStats
  try { data = JSON.parse(json) as MultiSeasonStats } catch { return null }
  if (!data.seasons?.length) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 9 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingRight: 6, paddingBottom: 2, color: 'var(--text-muted)', fontWeight: 500, minWidth: 64 }} />
            {data.seasons.map(s => (
              <th key={s.year} style={{ textAlign: 'right', paddingLeft: 4, paddingBottom: 2, minWidth: 40, verticalAlign: 'bottom' }}>
                <div style={{ color: '#00c896', fontWeight: 700 }}>{s.year}</div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
                  {s.tournament}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAT_ROWS.map(([label, getValue]) => (
            <tr key={label} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ paddingTop: 2, paddingBottom: 2, paddingRight: 6, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
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
  )
}
