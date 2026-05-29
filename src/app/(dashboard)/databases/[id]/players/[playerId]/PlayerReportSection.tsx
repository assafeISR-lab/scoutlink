'use client'

import { useState, useEffect, useCallback } from 'react'

type SectionKey =
  | 'physical' | 'contract' | 'scoutInfo' | 'description'
  | 'heatMap' | 'seasonStats' | 'fmAttributes' | 'evaluations'
  | 'files' | 'highlights'

const ALL_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'evaluations', label: 'Evaluations' },
  { key: 'physical',    label: 'Physical' },
  { key: 'contract',    label: 'Contract & Value' },
  { key: 'scoutInfo',   label: 'Scout Info' },
  { key: 'description', label: 'Description' },
  { key: 'heatMap',     label: 'Heat Map' },
  { key: 'seasonStats', label: 'Season Stats' },
  { key: 'fmAttributes',label: 'FM Attributes' },
  { key: 'files',       label: 'Files' },
  { key: 'highlights',  label: 'Highlight Videos' },
]

const LS_KEY = 'scoutlink_report_sections_v2'

function defaultSections(): Record<SectionKey, boolean> {
  return Object.fromEntries(ALL_SECTIONS.map(s => [s.key, s.key === 'evaluations'])) as Record<SectionKey, boolean>
}

function loadSections(): Record<SectionKey, boolean> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultSections()
    const parsed = JSON.parse(raw) as Partial<Record<SectionKey, boolean>>
    const base = defaultSections()
    for (const k of ALL_SECTIONS.map(s => s.key)) {
      if (typeof parsed[k] === 'boolean') base[k] = parsed[k]!
    }
    return base
  } catch {
    return defaultSections()
  }
}

export interface PlayerReport {
  id: string
  reportDraft: string | null
  reportFinalized: boolean
  includedSections: Record<SectionKey, boolean> | null
  createdAt: string
  updatedAt: string
}

interface Props {
  databaseId: string
  playerId: string
  canWrite: boolean
  // When true: always expanded, no toggle header — used inside a dedicated tab
  forceExpanded?: boolean
  initialReport?: PlayerReport | null
}

export default function PlayerReportSection({ databaseId, playerId, canWrite, forceExpanded = false, initialReport }: Props) {
  const [expanded, setExpanded]     = useState(false)
  const [sections, setSections]     = useState<Record<SectionKey, boolean>>(defaultSections)
  const [report, setReport]         = useState<PlayerReport | null>(initialReport ?? null)
  const [draft, setDraft]           = useState(initialReport?.reportDraft ?? '')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError]           = useState('')
  const [saveToast, setSaveToast]   = useState(false)
  const [loaded, setLoaded]         = useState(initialReport !== undefined)

  useEffect(() => { setSections(loadSections()) }, [])

  const apiBase = `/api/databases/${databaseId}/players/${playerId}/player-report`

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(apiBase)
      if (res.ok) {
        const data = await res.json() as PlayerReport | null
        setReport(data)
        if (data?.reportDraft) setDraft(data.reportDraft)
      }
    } finally {
      setLoaded(true)
    }
  }, [apiBase])

  useEffect(() => {
    if ((expanded || forceExpanded) && !loaded) fetchReport()
  }, [expanded, forceExpanded, loaded, fetchReport])

  function toggleSection(key: SectionKey) {
    setSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      })
      const data = await res.json() as PlayerReport & { error?: string }
      if (!res.ok) { setError(data.error ?? 'Generation failed'); return }
      setReport(data)
      setDraft(data.reportDraft ?? '')
    } catch {
      setError('Network error — please try again')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveDraft() {
    if (!report) return
    setSaving(true)
    try {
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportDraft: draft }),
      })
      if (res.ok) {
        const data = await res.json() as PlayerReport
        setReport(data)
        setSaveToast(true)
        setTimeout(() => setSaveToast(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalize() {
    if (!report) return
    setFinalizing(true)
    try {
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportDraft: draft, reportFinalized: true }),
      })
      if (res.ok) {
        const data = await res.json() as PlayerReport
        setReport(data)
        setDraft(data.reportDraft ?? '')
      }
    } finally {
      setFinalizing(false)
    }
  }

  async function handleReopen() {
    if (!report) return
    const res = await fetch(apiBase, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportFinalized: false }),
    })
    if (res.ok) {
      const data = await res.json() as PlayerReport
      setReport(data)
    }
  }

  const isFinalized = report?.reportFinalized === true
  const hasDraft    = !!report?.reportDraft

  // ── Content (shared between collapsible and forceExpanded modes) ─────────────
  function renderContent() {
    return (
      <>
        {/* Section selector — always visible so scout can change sections and re-generate */}
        <div className={forceExpanded ? 'mb-5' : 'pt-4 pb-3'}>
          <p className="text-[10px] uppercase font-bold mb-2.5 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>
            Include in Report
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SECTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleSection(key)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={sections[key]
                  ? { background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.35)' }
                  : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {/* Loading existing report */}
        {!loaded && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
              style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading report…</p>
          </div>
        )}

        {/* Generating spinner */}
        {generating && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
              style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Generating scouting report…</p>
          </div>
        )}

        {!generating && loaded && (
          <>
            {/* Finalized read-only */}
            {isFinalized && (
              <div>
                <pre
                  className="text-[12px] leading-relaxed whitespace-pre-wrap rounded-xl px-4 py-3"
                  style={{
                    background: 'var(--card-solid)',
                    border: '1px solid rgba(0,200,150,0.2)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}
                >
                  {draft || report?.reportDraft}
                </pre>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {canWrite && (
                    <button
                      onClick={handleReopen}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                      Re-open Draft
                    </button>
                  )}
                  <a
                    href={`/api/databases/${databaseId}/players/${playerId}/player-report/pdf`}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', textDecoration: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v6h5.66V9h3.84L12 2z"/></svg>
                    Save PDF
                  </a>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ml-auto"
                    style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { if (!generating) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                    ↺ Re-generate
                  </button>
                </div>
              </div>
            )}

            {/* Draft editable */}
            {!isFinalized && hasDraft && (
              <div>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={forceExpanded ? 22 : 16}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
                />
                {canWrite && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                      {saving ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button
                      onClick={handleFinalize}
                      disabled={finalizing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)' }}
                      onMouseEnter={e => { if (!finalizing) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}>
                      {finalizing ? 'Finalizing…' : '✓ Finalize Report'}
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ml-auto"
                      style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                      ↺ Re-generate
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* No report yet */}
            {!isFinalized && !hasDraft && canWrite && (
              <div className="pt-1 pb-2">
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18 2.5 2.5 0 0 0 10 15.5 2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
                  </svg>
                  Generate AI Report
                </button>
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-faint)' }}>
                  Select the sections to include above, then generate a professional scouting report.
                </p>
              </div>
            )}

            {!isFinalized && !hasDraft && !canWrite && (
              <p className="py-4 text-xs italic" style={{ color: 'var(--text-faint)' }}>
                No AI report generated yet.
              </p>
            )}
          </>
        )}
      </>
    )
  }

  // ── Toast ────────────────────────────────────────────────────────────────────
  const toast = (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%',
      transform: `translateX(-50%) translateY(${saveToast ? 0 : 16}px)`,
      opacity: saveToast ? 1 : 0, transition: 'opacity 0.25s ease, transform 0.25s ease',
      zIndex: 100, pointerEvents: 'none',
    }}>
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium"
        style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,200,150,0.4)', color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
        <div className="w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,200,150,0.2)', border: '1px solid rgba(0,200,150,0.5)' }}>
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        Draft saved
      </div>
    </div>
  )

  // ── Force-expanded mode (used inside a tab) ──────────────────────────────────
  if (forceExpanded) {
    return (
      <div>
        {/* Status bar */}
        {loaded && (isFinalized || hasDraft) && (
          <div className="flex items-center gap-2 mb-5">
            {isFinalized && (
              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.3)' }}>
                ✓ Finalized
              </span>
            )}
            {hasDraft && !isFinalized && (
              <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
                Draft
              </span>
            )}
          </div>
        )}
        {renderContent()}
        {toast}
      </div>
    )
  }

  // ── Collapsible mode (used inside the player card as a section) ───────────────
  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ background: expanded ? 'var(--subtle-bg)' : 'transparent' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,200,150,0.10)', border: '1px solid rgba(0,200,150,0.25)' }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#00c896">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18 2.5 2.5 0 0 0 10 15.5 2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
          </svg>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>AI Report</p>
          {isFinalized && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.3)' }}>
              ✓ Finalized
            </span>
          )}
          {hasDraft && !isFinalized && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
              Draft
            </span>
          )}
        </div>
        <svg className="w-3.5 h-3.5 transition-transform flex-shrink-0"
          style={{ color: 'var(--text-faint)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </div>

      {expanded && (
        <div className="px-4 pb-5" style={{ background: 'var(--subtle-bg)' }}>
          {renderContent()}
        </div>
      )}

      {toast}
    </div>
  )
}
