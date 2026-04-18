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
  'weight',
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
  // Scouting data
  'heatMap',
  'keyStrengths',
  'areasForImprovement',
  'recentForm',
  'description',
  // Links & meta
  'transfermarktLink',
  'sofascoreLink',
  'instagramLink',
  'highlightsLink',
  'sentBy',
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
  weight:               'Weight',
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
  // Scouting data
  heatMap:              'Heat Map',
  keyStrengths:         'Key Strengths',
  areasForImprovement:  'Areas for Improvement',
  recentForm:           'Recent Form',
  description:          'Bio / Description',
  // Links & meta
  transfermarktLink:    'Transfermarkt Link',
  sofascoreLink:        'Sofascore Link',
  instagramLink:        'Instagram Link',
  highlightsLink:       'Highlights Link',
  sentBy:               'Sent By',
}

export const PARAM_SOURCES: Record<ParamKey, string> = {
  // Identity
  photo:                '',
  nationality:          'Transfermarkt',
  passports:            'Transfermarkt',
  preferredFoot:        'Transfermarkt',
  age:                  'Transfermarkt',
  dateOfBirth:          'Transfermarkt',
  height:               'Transfermarkt',
  weight:               'Transfermarkt',
  // Club / Career
  team:                 'Transfermarkt',
  league:               'Transfermarkt',
  position:             'Sofascore',
  joiningDate:          'Transfermarkt',
  contractExpiry:       'Transfermarkt',
  seasonStats:          'Transfermarkt',
  // Financial
  marketValue:          'Transfermarkt',
  fmWages:              'FMInside',
  transferFeeExpect:    '',
  transferFeeReal:      '',
  salaryExpect:         '',
  salaryReal:           '',
  // Scouting data
  heatMap:              'Sofascore',
  keyStrengths:         'Sofascore',
  areasForImprovement:  'Sofascore',
  recentForm:           '',
  description:          '',
  // Links & meta
  transfermarktLink:    '',
  sofascoreLink:        '',
  instagramLink:        '',
  highlightsLink:       '',
  sentBy:               '',
}

export const STORAGE_KEY        = 'scoutlink_search_params'
export const CUSTOM_KEYS_KEY    = 'scoutlink_search_custom_keys'
export const CUSTOM_ACTIVE_KEY  = 'scoutlink_search_custom_active'

export function loadActive(): Set<string> {
  if (typeof window === 'undefined') return new Set(PARAM_KEYS)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set(PARAM_KEYS)
    return new Set(JSON.parse(raw) as string[])
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

interface Props {
  onChange?: (active: Set<string>) => void
}

export default function SearchParamsPanel({ onChange }: Props) {
  const [active, setActive] = useState<Set<string>>(() => new Set(PARAM_KEYS))
  const [customKeys, setCustomKeys] = useState<string[]>([])
  const [customActive, setCustomActive] = useState<Set<string>>(() => new Set())
  const [newParam, setNewParam] = useState('')

  useEffect(() => {
    const savedActive  = loadActive()
    const savedCustomK = loadCustomKeys()
    const savedCustomA = loadCustomActive()
    setActive(savedActive)
    setCustomKeys(savedCustomK)
    setCustomActive(savedCustomA)
    notify(savedActive, savedCustomA)
  }, [])

  function notify(builtIn: Set<string>, custom: Set<string>) {
    onChange?.(new Set([...builtIn, ...custom]))
  }

  function toggle(key: string) {
    const next = new Set(active)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    setActive(next)
    notify(next, customActive)
  }

  function toggleCustom(key: string) {
    const next = new Set(customActive)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    localStorage.setItem(CUSTOM_ACTIVE_KEY, JSON.stringify([...next]))
    setCustomActive(next)
    notify(active, next)
  }

  function selectAll() {
    const nextActive = new Set<string>(PARAM_KEYS)
    const nextCustomActive = new Set<string>(customKeys)
    setActive(nextActive)
    setCustomActive(nextCustomActive)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...nextActive]))
    localStorage.setItem(CUSTOM_ACTIVE_KEY, JSON.stringify([...nextCustomActive]))
    notify(nextActive, nextCustomActive)
  }

  function clearAll() {
    const empty = new Set<string>()
    setActive(empty)
    setCustomActive(empty)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    localStorage.setItem(CUSTOM_ACTIVE_KEY, JSON.stringify([]))
    notify(empty, empty)
  }

  function addCustomParam() {
    const label = newParam.trim()
    if (!label || customKeys.includes(label)) return
    const next = [...customKeys, label]
    const nextActive = new Set([...customActive, label])
    setCustomKeys(next)
    setCustomActive(nextActive)
    setNewParam('')
    localStorage.setItem(CUSTOM_KEYS_KEY, JSON.stringify(next))
    localStorage.setItem(CUSTOM_ACTIVE_KEY, JSON.stringify([...nextActive]))
    notify(active, nextActive)
  }

  function removeCustomParam(key: string) {
    const next = customKeys.filter(k => k !== key)
    const nextActive = new Set(customActive)
    nextActive.delete(key)
    setCustomKeys(next)
    setCustomActive(nextActive)
    localStorage.setItem(CUSTOM_KEYS_KEY, JSON.stringify(next))
    localStorage.setItem(CUSTOM_ACTIVE_KEY, JSON.stringify([...nextActive]))
    notify(active, nextActive)
  }

  const totalActive = active.size + customActive.size
  const totalAll = PARAM_KEYS.length + customKeys.length
  const allChecked = active.size === PARAM_KEYS.length && customActive.size === customKeys.length

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

      {/* Custom parameters */}
      {customKeys.length > 0 && (
        <div className="border-t border-white/8 divide-y divide-white/5">
          {customKeys.map(key => {
            const checked = customActive.has(key)
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/3">
                <Checkbox checked={checked} onToggle={() => toggleCustom(key)} />
                <span
                  className="text-xs flex-1 cursor-pointer"
                  onClick={() => toggleCustom(key)}
                  style={{ color: checked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}
                >
                  {key}
                </span>
                <button
                  onClick={() => removeCustomParam(key)}
                  className="w-4 h-4 flex items-center justify-center flex-shrink-0 rounded transition-colors hover:bg-white/10"
                  title="Remove"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add custom parameter input */}
      <div className="px-4 py-3 border-t border-white/8" style={{ background: 'var(--subtle-bg)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={newParam}
            onChange={e => setNewParam(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustomParam() }}
            placeholder="Add parameter…"
            className="flex-1 text-xs px-3 py-1.5 rounded-lg text-white placeholder-white/20 focus:outline-none transition-colors"
            style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,200,150,0.4)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={addCustomParam}
            disabled={!newParam.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black disabled:opacity-30 transition-all"
            style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
          >
            Add
          </button>
        </div>
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
