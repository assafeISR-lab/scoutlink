'use client'

import { useState, useEffect } from 'react'

export const PARAM_KEYS = [
  // Identity
  'photo',
  'nationality',
  'passports',
  'preferredFoot',
  'age',
  'dateOfBirth',
  'height',
  'injuryType',
  'injuryReturn',
  // Club / Career
  'team',
  'league',
  'position',
  'joiningDate',
  'contractExpiry',
  'seasonStats',
  // Financial
  'marketValue',
  'fmWages',
  'transferFeeExpect',
  'transferFeeReal',
  'salaryExpect',
  'salaryReal',
  // Availability
  'availability',
  // Scouting data
  'heatMap',
  'fmAttributes',
  'description',
  // Scout contact
  'playerPhone',
  'agentName',
  'agentPhone',
  // Links & meta
  'transfermarktLink',
  'sofascoreLink',
  'fmInsideLink',
  'instagramLink',
  'twitterLink',
  'tiktokLink',
  'highlightsLink',
] as const

export type ParamKey = typeof PARAM_KEYS[number]

export const PARAM_LABELS: Record<ParamKey, string> = {
  // Identity
  photo:                'Photo',
  nationality:          'Nationality',
  passports:            'Passports',
  preferredFoot:        'Preferred Foot',
  age:                  'Age',
  dateOfBirth:          'Date of Birth',
  height:               'Height',
  injuryType:           'Injury Type',
  injuryReturn:         'Return Date',
  // Club / Career
  team:                 'Team / Club',
  league:               'League',
  position:             'Position',
  joiningDate:          'Joining Date',
  contractExpiry:       'Contract Expiry',
  seasonStats:          'Season Stats',
  // Financial
  marketValue:          'Market Value',
  fmWages:              'FM Wages',
  transferFeeExpect:    'Transfer Fee Expectation',
  transferFeeReal:      'Transfer Fee (Real)',
  salaryExpect:         'Salary Expectation',
  salaryReal:           'Salary (Real)',
  // Availability
  availability:         'Availability',
  // Scouting data
  heatMap:              'Heat Map',
  fmAttributes:         'FM Attributes (Top 7 / Low 7)',
  description:          'Bio / Description',
  // Scout contact
  playerPhone:          'Player Phone',
  agentName:            'Agent Name',
  agentPhone:           'Agent Phone',
  // Links & meta
  transfermarktLink:    'Transfermarkt Link',
  sofascoreLink:        'Sofascore Link',
  fmInsideLink:         'FMInside Link',
  instagramLink:        'Instagram Link',
  twitterLink:          'Twitter / X Link',
  tiktokLink:           'TikTok Link',
  highlightsLink:       'Highlights Link',
}

export const PARAM_SOURCES: Record<ParamKey, string> = {
  // Identity
  photo:                '',
  nationality:          'Transfermarkt',
  passports:            'Transfermarkt',
  preferredFoot:        'Sofascore',
  age:                  'Transfermarkt',
  dateOfBirth:          'Transfermarkt',
  height:               'Transfermarkt',
  injuryType:           '',
  injuryReturn:         '',
  // Club / Career
  team:                 'Transfermarkt',
  league:               'Sofascore',
  position:             'Sofascore',
  joiningDate:          'Transfermarkt',
  contractExpiry:       'Sofascore',
  seasonStats:          'Sofascore',
  // Financial
  marketValue:          'Transfermarkt',
  fmWages:              'FMInside',
  transferFeeExpect:    '',
  transferFeeReal:      '',
  salaryExpect:         '',
  salaryReal:           '',
  // Availability
  availability:         '',
  // Scouting data
  heatMap:              'Sofascore',
  fmAttributes:         'FMInside',
  description:          '',
  // Scout contact
  playerPhone:          '',
  agentName:            '',
  agentPhone:           '',
  // Links & meta
  transfermarktLink:    '',
  sofascoreLink:        '',
  fmInsideLink:         '',
  instagramLink:        '',
  twitterLink:          '',
  tiktokLink:           '',
  highlightsLink:       '',
}

export const STORAGE_KEY        = 'scoutlink_search_params'
export const CUSTOM_KEYS_KEY    = 'scoutlink_search_custom_keys'
export const CUSTOM_ACTIVE_KEY  = 'scoutlink_search_custom_active'

const SEEN_KEYS_KEY = 'scoutlink_seen_param_keys'

export function loadActive(): Set<string> {
  if (typeof window === 'undefined') return new Set(PARAM_KEYS)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set(PARAM_KEYS)
    const saved = new Set(JSON.parse(raw) as string[])
    // Auto-activate any built-in key not seen before (newly added params)
    const seenRaw = localStorage.getItem(SEEN_KEYS_KEY)
    const seen: Set<string> = seenRaw ? new Set(JSON.parse(seenRaw)) : new Set([...saved])
    let updated = false
    for (const k of PARAM_KEYS) {
      if (!seen.has(k)) { saved.add(k); updated = true }
    }
    localStorage.setItem(SEEN_KEYS_KEY, JSON.stringify([...PARAM_KEYS]))
    if (updated) localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved]))
    return saved
  } catch {
    return new Set(PARAM_KEYS)
  }
}

export function loadCustomKeys(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_KEYS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function loadCustomActive(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(CUSTOM_ACTIVE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

const PARAM_SOURCES_KEY = 'scoutlink_param_sources'

export function loadParamSources(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(PARAM_SOURCES_KEY) ?? '{}') } catch { return {} }
}

export function buildParamsBySource(overrides: Record<string, string> = {}): Record<string, ParamKey[]> {
  const result: Record<string, ParamKey[]> = {}
  for (const key of PARAM_KEYS) {
    const src = overrides[key] ?? PARAM_SOURCES[key as ParamKey]
    if (src) {
      if (!result[src]) result[src] = []
      result[src].push(key as ParamKey)
    }
  }
  return result
}

interface Props {
  onChange?: (active: Set<string>) => void
}

export default function SearchParamsPanel({ onChange }: Props) {
  const [active, setActive] = useState<Set<string>>(() => new Set(PARAM_KEYS))

  useEffect(() => {
    const savedActive = loadActive()
    setActive(savedActive)
    onChange?.(savedActive)
  }, [])

  function toggle(key: string) {
    const next = new Set(active)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    setActive(next)
    onChange?.(next)
  }

  function selectAll() {
    const next = new Set<string>(PARAM_KEYS)
    setActive(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    onChange?.(next)
  }

  function clearAll() {
    const empty = new Set<string>()
    setActive(empty)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    onChange?.(empty)
  }

  const totalActive = active.size
  const totalAll = PARAM_KEYS.length
  const allChecked = active.size === PARAM_KEYS.length

  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Search Parameters</p>
        <button
          onClick={allChecked ? clearAll : selectAll}
          className="text-[10px] px-2 py-0.5 rounded-md transition-colors"
          style={{ color: '#00c896', background: 'rgba(0,200,150,0.08)' }}
        >
          {allChecked ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {/* Built-in parameter list */}
      <div className="divide-y divide-white/5">
        {PARAM_KEYS.map(key => {
          const checked = active.has(key)
          return (
            <label
              key={key}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-white/3"
            >
              <Checkbox checked={checked} onToggle={() => toggle(key)} />
              <span
                className="text-xs flex-1"
                onClick={() => toggle(key)}
                style={{ color: checked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}
              >
                {PARAM_LABELS[key]}
              </span>
            </label>
          )
        })}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-white/8">
        <p className="text-[10px] text-white/30">
          {totalActive} of {totalAll} parameters active
        </p>
      </div>
    </div>
  )
}

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
      style={{
        background: checked ? '#00c896' : 'transparent',
        border: `1.5px solid ${checked ? '#00c896' : 'rgba(255,255,255,0.2)'}`,
      }}
    >
      {checked && (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#000">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      )}
    </div>
  )
}
