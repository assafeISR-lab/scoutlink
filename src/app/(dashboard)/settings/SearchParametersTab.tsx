'use client'

import { useState, useEffect } from 'react'
import {
  PARAM_KEYS, PARAM_LABELS, PARAM_SOURCES,
  STORAGE_KEY, CUSTOM_KEYS_KEY, CUSTOM_ACTIVE_KEY,
  loadActive, loadCustomKeys, loadCustomActive,
} from '../search/SearchParamsPanel'

const SOURCES_KEY = 'scoutlink_param_sources'
const HIDDEN_KEY  = 'scoutlink_hidden_params'

// Fixed source options that are not websites
const FIXED_SOURCES = ['Transfermarkt', 'Sofascore', 'FMInside']

interface Website { id: string; name: string; url: string; category: string | null; useForSearch: boolean }
interface Props { websites: Website[] }

function loadStoredSources(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(SOURCES_KEY) ?? '{}') } catch { return {} }
}
function loadHidden(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]') as string[]) } catch { return new Set() }
}

export default function SearchParametersTab({ websites }: Props) {
  const [active, setActive]             = useState<Set<string>>(() => new Set(PARAM_KEYS))
  const [customKeys, setCustomKeys]     = useState<string[]>([])
  const [customActive, setCustomActive] = useState<Set<string>>(new Set())
  const [sources, setSources]           = useState<Record<string, string>>({})
  const [hidden, setHidden]             = useState<Set<string>>(new Set())
  const [newParam, setNewParam]         = useState('')
  const [newSource, setNewSource]       = useState('')

  useEffect(() => {
    setActive(loadActive())
    setCustomKeys(loadCustomKeys())
    setCustomActive(loadCustomActive())
    setSources(loadStoredSources())
    setHidden(loadHidden())
  }, [])

  function getSource(key: string): string {
    return sources[key] ?? PARAM_SOURCES[key as keyof typeof PARAM_SOURCES] ?? ''
  }

  function setSource(key: string, value: string) {
    const next = { ...sources, [key]: value }
    setSources(next)
    localStorage.setItem(SOURCES_KEY, JSON.stringify(next))
  }

  function toggleParam(key: string, isCustom = false) {
    if (isCustom) {
      const next = new Set(customActive)
      next.has(key) ? next.delete(key) : next.add(key)
      setCustomActive(next)
      localStorage.setItem(CUSTOM_ACTIVE_KEY, JSON.stringify([...next]))
    } else {
      const next = new Set(active)
      next.has(key) ? next.delete(key) : next.add(key)
      setActive(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    }
  }

  function deleteBuiltin(key: string) {
    const next = new Set(hidden).add(key)
    setHidden(next)
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]))
    const nextActive = new Set(active)
    nextActive.delete(key)
    setActive(nextActive)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...nextActive]))
  }

  function restoreHidden() {
    setHidden(new Set())
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([]))
  }

  function addCustomParam() {
    const label = newParam.trim()
    if (!label || customKeys.includes(label)) return
    const nextKeys = [...customKeys, label]
    const nextActive = new Set([...customActive, label])
    setCustomKeys(nextKeys)
    setCustomActive(nextActive)
    if (newSource) setSource(label, newSource)
    setNewParam('')
    setNewSource('')
    localStorage.setItem(CUSTOM_KEYS_KEY, JSON.stringify(nextKeys))
    localStorage.setItem(CUSTOM_ACTIVE_KEY, JSON.stringify([...nextActive]))
  }

  function deleteCustomParam(key: string) {
    const nextKeys = customKeys.filter(k => k !== key)
    const nextActive = new Set(customActive)
    nextActive.delete(key)
    setCustomKeys(nextKeys)
    setCustomActive(nextActive)
    localStorage.setItem(CUSTOM_KEYS_KEY, JSON.stringify(nextKeys))
    localStorage.setItem(CUSTOM_ACTIVE_KEY, JSON.stringify([...nextActive]))
  }

  const allSourceOptions = FIXED_SOURCES

  const visibleBuiltins = PARAM_KEYS.filter(k => !hidden.has(k))
  const mid = Math.ceil(visibleBuiltins.length / 2)
  const leftBuiltins  = visibleBuiltins.slice(0, mid)
  const rightBuiltins = visibleBuiltins.slice(mid)

  const customMid = Math.ceil(customKeys.length / 2)
  const leftCustom  = customKeys.slice(0, customMid)
  const rightCustom = customKeys.slice(customMid)

  const totalActive = [...visibleBuiltins].filter(k => active.has(k)).length
                    + [...customKeys].filter(k => customActive.has(k)).length
  const totalAll = visibleBuiltins.length + customKeys.length

  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{
      background: 'var(--card-bg)',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,143,255,0.12)', border: '1px solid rgba(108,143,255,0.25)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#6c8fff"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Search Parameters</h2>
            <p className="text-xs text-white/30">{totalActive} of {totalAll} active · set which fields to show and where to source them</p>
          </div>
        </div>
      </div>

      {/* Two-column column headers */}
      <div className="grid grid-cols-2 divide-x divide-white/5 border-b border-white/5" style={{ background: 'var(--subtle-bg)' }}>
        <ColHeader />
        <ColHeader />
      </div>

      {/* Built-in params — two columns */}
      <div className="grid grid-cols-2 divide-x divide-white/5">
        <div className="divide-y divide-white/5">
          {leftBuiltins.map(key => (
            <Row
              key={key}
              label={PARAM_LABELS[key]}
              checked={active.has(key)}
              source={getSource(key)}
              sourceOptions={allSourceOptions}
              onToggle={() => toggleParam(key)}
              onSourceChange={v => setSource(key, v)}
              onDelete={() => deleteBuiltin(key)}
            />
          ))}
        </div>
        <div className="divide-y divide-white/5">
          {rightBuiltins.map(key => (
            <Row
              key={key}
              label={PARAM_LABELS[key]}
              checked={active.has(key)}
              source={getSource(key)}
              sourceOptions={allSourceOptions}
              onToggle={() => toggleParam(key)}
              onSourceChange={v => setSource(key, v)}
              onDelete={() => deleteBuiltin(key)}
            />
          ))}
        </div>
      </div>

      {/* Custom params — two columns */}
      {customKeys.length > 0 && (
        <div className="border-t border-white/5">
          {/* Custom section label spanning both columns */}
          <div className="px-6 py-2 border-b border-white/5" style={{ background: 'var(--subtle-bg)' }}>
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Custom</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/5">
            <div className="divide-y divide-white/5">
              {leftCustom.map(key => (
                <Row
                  key={key}
                  label={key}
                  checked={customActive.has(key)}
                  source={getSource(key)}
                  sourceOptions={allSourceOptions}
                  onToggle={() => toggleParam(key, true)}
                  onSourceChange={v => setSource(key, v)}
                  onDelete={() => deleteCustomParam(key)}
                />
              ))}
            </div>
            <div className="divide-y divide-white/5">
              {rightCustom.map(key => (
                <Row
                  key={key}
                  label={key}
                  checked={customActive.has(key)}
                  source={getSource(key)}
                  sourceOptions={allSourceOptions}
                  onToggle={() => toggleParam(key, true)}
                  onSourceChange={v => setSource(key, v)}
                  onDelete={() => deleteCustomParam(key)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5 flex flex-col gap-3" style={{ background: 'var(--subtle-bg)' }}>
        <div className="flex items-center gap-3">
          <div className="w-4 flex-shrink-0" />
          <input
            type="text"
            value={newParam}
            onChange={e => setNewParam(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustomParam() }}
            placeholder="Parameter name…"
            className="text-xs px-3 py-2 rounded-lg text-white placeholder-white/20 focus:outline-none transition-all"
            style={{ width: 140, flexShrink: 0, background: 'var(--hover-bg)', border: '1px solid var(--border)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          <select
            value={newSource}
            onChange={e => setNewSource(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-lg focus:outline-none appearance-none"
            style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', color: newSource ? 'var(--text-secondary)' : 'var(--text-muted)' }}
          >
            <option value="" style={{ color: 'black' }}>Select source…</option>
            {FIXED_SOURCES.map(s => <option key={s} value={s} style={{ color: 'black' }}>{s}</option>)}
          </select>
          <button
            onClick={addCustomParam}
            disabled={!newParam.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-black disabled:opacity-30 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
          >
            Add
          </button>
        </div>
        {hidden.size > 0 && (
          <button
            onClick={restoreHidden}
            className="text-xs self-start transition-colors"
            style={{ color: 'var(--text-faint)' }}
          >
            Restore {hidden.size} hidden parameter{hidden.size !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Column header ─────────────────────────────────────────────────────────────

function ColHeader() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="w-4 flex-shrink-0" />
      <p className="text-[10px] text-white/25 uppercase tracking-widest flex-1 min-w-0">Parameter</p>
      <p className="text-[10px] text-white/25 uppercase tracking-widest flex-shrink-0" style={{ width: 110 }}>Preferred Source</p>
      <div className="w-7 flex-shrink-0" />
    </div>
  )
}

// ─── Row ───────────────────────────────────────────────────────────────────────

function Row({ label, checked, source, sourceOptions, onToggle, onSourceChange, onDelete }: {
  label: string
  checked: boolean
  source: string
  sourceOptions: string[]
  onToggle: () => void
  onSourceChange: (v: string) => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
      {/* Checkbox */}
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

      {/* Parameter name */}
      <span
        className={`text-sm flex-1 cursor-pointer ${checked ? 'text-white/85' : 'text-white/30'}`}
        onClick={onToggle}
      >
        {label}
      </span>

      {/* Source dropdown */}
      <select
        value={source}
        onChange={e => onSourceChange(e.target.value)}
        disabled={!checked}
        className={`text-xs px-2 py-1.5 rounded-lg focus:outline-none appearance-none transition-all flex-shrink-0 ${checked ? 'text-white/60' : 'text-white/20'}`}
        style={{
          width: 110,
          background: checked ? 'var(--hover-bg)' : 'var(--subtle-bg)',
          border: `1px solid var(--border)`,
          cursor: checked ? 'pointer' : 'not-allowed',
        }}
      >
        {sourceOptions.map(s => (
          <option key={s} value={s} style={{ color: 'black' }}>{s}</option>
        ))}
      </select>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 flex-shrink-0"
        title="Remove parameter"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="rgba(255,100,100,0.7)">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </div>
  )
}
