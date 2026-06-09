'use client'

import { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Evaluation {
  id: string
  matchDate: string | null
  venue: string | null
  competition: string | null
  opponent: string | null
  matchResult: string | null
  ratingTechnical: number | null
  ratingTactical: number | null
  ratingPhysical: number | null
  ratingMentality: number | null
  ratingPotential: number | null
  commentTechnical: string | null
  commentTactical: string | null
  commentPhysical: string | null
  commentMentality: string | null
  commentPotential: string | null
  recommendation: string | null
  confidence: string | null
  nextAction: string | null
  riskRelativeAge: boolean
  riskWeakCompetition: boolean
  riskPhysicalAdvantage: boolean
  riskAttitudeDiscipline: boolean
  riskFamilySurroundings: boolean
  riskInjuryHistory: boolean
  observationNotes: string | null
  reportDraft: string | null
  reportFinalized: boolean
  createdAt: string
  agent: { id: string; fullName: string }
}

const EMPTY_FORM = {
  matchDate: '',
  venue: '',
  competition: '',
  opponent: '',
  matchResult: '',
  ratingTechnical: 0,
  ratingTactical: 0,
  ratingPhysical: 0,
  ratingMentality: 0,
  ratingPotential: 0,
  commentTechnical: '',
  commentTactical: '',
  commentPhysical: '',
  commentMentality: '',
  commentPotential: '',
  recommendation: '',
  confidence: '',
  nextAction: '',
  riskRelativeAge: false,
  riskWeakCompetition: false,
  riskPhysicalAdvantage: false,
  riskAttitudeDiscipline: false,
  riskFamilySurroundings: false,
  riskInjuryHistory: false,
  observationNotes: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RECOMMENDATION_OPTS = [
  { value: 'top_target', label: 'Top Talent', color: '#00c896', bg: 'rgba(0,200,150,0.12)',  border: 'rgba(0,200,150,0.3)'  },
  { value: 'monitor',   label: 'Monitor',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  { value: 'pass',      label: 'Reject',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
]

const CONFIDENCE_OPTS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
]

const NEXT_ACTION_OPTS = [
  { value: 'watch_again',    label: 'Watch Again' },
  { value: 'contact_agent',  label: 'Contact Agent' },
  { value: 'invite_trial',   label: 'Invite Trial' },
  { value: 'review_later',   label: 'Review Later' },
]

const RATING_LABELS = [
  { key: 'ratingTechnical', label: 'Technical' },
  { key: 'ratingTactical',  label: 'Tactical'  },
  { key: 'ratingPhysical',  label: 'Physical'  },
  { key: 'ratingMentality', label: 'Mentality' },
  { key: 'ratingPotential', label: 'Potential' },
] as const

function recLabel(v: string | null) {
  return RECOMMENDATION_OPTS.find(o => o.value === v) ?? null
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function avgRating(e: Evaluation): number | null {
  const vals = [e.ratingTechnical, e.ratingTactical, e.ratingPhysical, e.ratingMentality, e.ratingPotential].filter((v): v is number => v !== null)
  if (vals.length === 0) return null
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
}

// ── Rating selector ───────────────────────────────────────────────────────────

function RatingSelector({ label, value, onChange, comment, onCommentChange }: {
  label: string
  value: number
  onChange: (v: number) => void
  comment: string
  onCommentChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
            style={value >= n
              ? { background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#000', boxShadow: '0 2px 8px rgba(0,200,150,0.3)' }
              : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }
          >
            {n}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={comment}
        onChange={e => onCommentChange(e.target.value)}
        placeholder="Add a note…"
        className="flex-1 px-2.5 py-1 rounded-lg text-xs focus:outline-none min-w-0"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}

// ── Pill selector ─────────────────────────────────────────────────────────────

function PillSelector({ options, value, onChange, colored = false }: {
  options: { value: string; label: string; color?: string; bg?: string; border?: string }[]
  value: string
  onChange: (v: string) => void
  colored?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = value === opt.value
        const col = colored && opt.color ? opt.color : '#00c896'
        const bg  = colored && opt.bg    ? opt.bg    : 'rgba(0,200,150,0.12)'
        const brd = colored && opt.border ? opt.border : 'rgba(0,200,150,0.3)'
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? '' : opt.value)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={active
              ? { background: bg, color: col, border: `1px solid ${brd}` }
              : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Evaluation form ───────────────────────────────────────────────────────────

function EvaluationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Evaluation
  onSave: (data: typeof EMPTY_FORM) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>(initial ? {
    matchDate:            initial.matchDate ? initial.matchDate.slice(0, 10) : '',
    venue:                initial.venue            ?? '',
    competition:          initial.competition      ?? '',
    opponent:             initial.opponent         ?? '',
    matchResult:          initial.matchResult      ?? '',
    ratingTechnical:      initial.ratingTechnical  ?? 0,
    ratingTactical:       initial.ratingTactical   ?? 0,
    ratingPhysical:       initial.ratingPhysical   ?? 0,
    ratingMentality:      initial.ratingMentality  ?? 0,
    ratingPotential:      initial.ratingPotential  ?? 0,
    commentTechnical:     initial.commentTechnical  ?? '',
    commentTactical:      initial.commentTactical   ?? '',
    commentPhysical:      initial.commentPhysical   ?? '',
    commentMentality:     initial.commentMentality  ?? '',
    commentPotential:     initial.commentPotential  ?? '',
    recommendation:       initial.recommendation   ?? '',
    confidence:           initial.confidence       ?? '',
    nextAction:           initial.nextAction        ?? '',
    riskRelativeAge:       initial.riskRelativeAge,
    riskWeakCompetition:   initial.riskWeakCompetition,
    riskPhysicalAdvantage: initial.riskPhysicalAdvantage,
    riskAttitudeDiscipline:initial.riskAttitudeDiscipline,
    riskFamilySurroundings:initial.riskFamilySurroundings,
    riskInjuryHistory:     initial.riskInjuryHistory,
    observationNotes:     initial.observationNotes ?? '',
  } : { ...EMPTY_FORM, matchDate: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof EMPTY_FORM, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 rounded-2xl" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>

      {/* Match context */}
      <div>
        <p className="text-[9px] uppercase font-bold mb-3" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Match Context</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['matchDate', 'Date Observed', 'date'],
            ['venue', 'Stadium', 'text'],
            ['competition', 'League / Cup / Tournament', 'text'],
            ['opponent', 'Against', 'text'],
            ['matchResult', 'Match Result (e.g. 2-1 W)', 'text'],
          ] as [keyof typeof EMPTY_FORM, string, string][]).map(([key, label, type]) => (
            <div key={key}>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-faint)' }}>{label}</label>
              <input
                type={type}
                value={form[key] as string}
                onChange={e => set(key, e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', colorScheme: 'dark' }}
                onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Ratings */}
      <div>
        <p className="text-[9px] uppercase font-bold mb-3" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Scout Ratings</p>
        <div className="flex flex-col gap-2.5">
          {RATING_LABELS.map(({ key, label }) => {
            const commentKey = key.replace('rating', 'comment') as keyof typeof EMPTY_FORM
            return (
            <RatingSelector
              key={key}
              label={label}
              value={form[key] as number}
              onChange={v => set(key, v)}
              comment={(form[commentKey] as string) ?? ''}
              onCommentChange={v => set(commentKey, v)}
            />
          )})}

        </div>
      </div>

      {/* Recommendation + Confidence */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Recommendation</p>
          <PillSelector options={RECOMMENDATION_OPTS} value={form.recommendation} onChange={v => set('recommendation', v)} colored />
        </div>
        <div>
          <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Recommendation Confidence</p>
          <PillSelector options={CONFIDENCE_OPTS} value={form.confidence} onChange={v => set('confidence', v)} />
        </div>
      </div>

      {/* Risk flags */}
      <div>
        <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Risk Flags</p>
        <div className="flex flex-col gap-1.5">
          {([
            ['riskRelativeAge',        'Relative age effect'],
            ['riskAttitudeDiscipline', 'Attitude / Discipline'],
            ['riskWeakCompetition',    'Weak competition level'],
            ['riskFamilySurroundings', 'Off-field Influences'],
            ['riskPhysicalAdvantage',  'Physical advantage over peers'],
            ['riskInjuryHistory',      'Injury History'],
          ] as [keyof typeof EMPTY_FORM, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key] as boolean}
                onChange={e => set(key, e.target.checked)}
                className="w-3.5 h-3.5 accent-[#f59e0b]"
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Observation notes */}
      <div>
        <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Observation Notes</p>
        <textarea
          value={form.observationNotes}
          onChange={e => set('observationNotes', e.target.value)}
          placeholder="Raw match-day observations, movement patterns, moments that stood out…"
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
          style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)', cursor: saving ? 'default' : 'pointer' }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}
        >
          {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Save Evaluation')}
        </button>
      </div>
    </form>
  )
}

// ── Evaluation card ───────────────────────────────────────────────────────────

function EvaluationCard({
  evaluation,
  isOwn,
  onDeleted,
  onEdited,
}: {
  evaluation: Evaluation
  isOwn: boolean
  onDeleted: (id: string) => void
  onEdited: (updated: Evaluation) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const rec  = recLabel(evaluation.recommendation)
  const avg  = avgRating(evaluation)
  const risks = [
    evaluation.riskRelativeAge        && 'Relative age',
    evaluation.riskWeakCompetition    && 'Weak competition',
    evaluation.riskPhysicalAdvantage  && 'Physical advantage',
    evaluation.riskAttitudeDiscipline && 'Attitude / Discipline',
    evaluation.riskFamilySurroundings && 'Off-field Influences',
    evaluation.riskInjuryHistory      && 'Injury History',
  ].filter(Boolean) as string[]

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/evaluations/${evaluation.id}`, { method: 'DELETE' })
    onDeleted(evaluation.id)
  }

  async function handleEdit(data: typeof EMPTY_FORM) {
    const res = await fetch(`/api/evaluations/${evaluation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      onEdited(updated)
      setEditing(false)
      setExpanded(false)
    }
  }

  if (editing) {
    return (
      <EvaluationForm
        initial={evaluation}
        onSave={handleEdit}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card-bg)' }}>

      {/* Card header — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ background: expanded ? 'var(--subtle-bg)' : 'transparent' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Date */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fmtDate(evaluation.matchDate) ?? fmtDate(evaluation.createdAt)}
          </p>
          {(evaluation.competition || evaluation.opponent) && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>
              {[evaluation.competition, evaluation.opponent].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Avg rating */}
        {avg !== null && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>avg</span>
            <span className="text-sm font-bold" style={{ color: '#00c896' }}>{avg}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>/5</span>
          </div>
        )}

        {/* Recommendation pill */}
        {rec && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: rec.bg, color: rec.color, border: `1px solid ${rec.border}` }}>
            {rec.label}
          </span>
        )}

        {/* Scout name */}
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{evaluation.agent.fullName}</span>

        {/* Chevron */}
        <svg className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ color: 'var(--text-faint)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4" style={{ borderTop: '1px solid var(--border)' }}>

          {/* Match context */}
          {(evaluation.venue || evaluation.competition || evaluation.opponent || evaluation.matchResult || evaluation.matchDate) && (
            <div className="pt-3">
              <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Match Context</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {[
                  ['Date',                    fmtDate(evaluation.matchDate)],
                  ['Stadium',                 evaluation.venue],
                  ['League / Cup / Tournament', evaluation.competition],
                  ['Against',                 evaluation.opponent],
                  ['Match Result',             evaluation.matchResult],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', padding: '3px 0' }}>
                    <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{label}</span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings */}
          {avg !== null && (
            <div>
              <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Scout Ratings</p>
              <div className="flex flex-col gap-1.5">
                {RATING_LABELS.map(({ key, label }) => {
                  const val = evaluation[key as keyof Evaluation] as number | null
                  if (val === null) return null
                  const commentKey = key.replace('rating', 'comment') as keyof Evaluation
                  const comment = evaluation[commentKey] as string | null
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                            style={n <= val
                              ? { background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#000' }
                              : { background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }
                            }
                          >{n}</div>
                        ))}
                      </div>
                      {comment && <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{comment}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recommendation + confidence + next action */}
          {(evaluation.recommendation || evaluation.confidence) && (
            <div className="flex flex-wrap gap-2">
              {rec && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: rec.bg, color: rec.color, border: `1px solid ${rec.border}` }}>
                  {rec.label}
                </span>
              )}
              {evaluation.confidence && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-medium capitalize" style={{ background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {evaluation.confidence} confidence
                </span>
              )}
            </div>
          )}

          {/* Risk flags */}
          {risks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {risks.map(r => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                  ⚠ {r}
                </span>
              ))}
            </div>
          )}

          {/* Observation notes */}
          {evaluation.observationNotes && (
            <div>
              <p className="text-[9px] uppercase font-bold mb-1.5" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Observation Notes</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{evaluation.observationNotes}</p>
            </div>
          )}

          {/* Actions */}
          {isOwn && (
            <div className="flex gap-2 pt-1">
              {confirmDelete ? (
                <>
                  <span className="text-xs self-center" style={{ color: 'var(--text-muted)' }}>Delete this evaluation?</span>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)' }}
                  >
                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,200,150,0.15)'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,200,150,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.2)' }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EvaluationSection({ databaseId, playerId, canWrite, currentUserId, initialEvaluations, onCountChange }: {
  databaseId: string
  playerId: string
  canWrite: boolean
  currentUserId: string
  initialEvaluations?: Evaluation[]
  onCountChange?: (n: number) => void
}) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>(initialEvaluations ?? [])
  const [loading, setLoading]         = useState(!initialEvaluations)
  const [adding,  setAdding]          = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)

  // Notify parent of count changes — in effect to avoid setState-during-render
  useEffect(() => {
    if (!loading) onCountChange?.(evaluations.length)
  }, [evaluations.length, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialEvaluations) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/databases/${databaseId}/players/${playerId}/evaluations`)
      .then(r => r.json())
      .then((data: Evaluation[]) => { if (!cancelled) { setEvaluations(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [databaseId, playerId])

  async function handleCreate(data: typeof EMPTY_FORM) {
    setSaveError(null)
    const res = await fetch(`/api/databases/${databaseId}/players/${playerId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const created: Evaluation = await res.json()
      setEvaluations(prev => [created, ...prev])
      setAdding(false)
    } else {
      const body = await res.json().catch(() => ({}))
      setSaveError(body.error ?? `Error ${res.status}`)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase font-bold pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Evaluations</p>
          {loading ? (
            <div className="w-3 h-3 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
          ) : evaluations.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,200,150,0.15)', color: '#00c896' }}>
              {evaluations.length}
            </span>
          )}
        </div>
        {canWrite && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all"
            style={{ background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add Evaluation
          </button>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Save error */}
        {saveError && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
            Failed to save: {saveError}
          </p>
        )}

        {/* New evaluation form */}
        {adding && (
          <EvaluationForm onSave={handleCreate} onCancel={() => { setAdding(false); setSaveError(null) }} />
        )}

        {/* Loading */}
        {loading && <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Loading evaluations…</p>}

        {/* Empty */}
        {!loading && evaluations.length === 0 && !adding && (
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No evaluations yet.{canWrite ? ' Click "Add Evaluation" to record your first assessment.' : ''}</p>
        )}

        {/* List */}
        {evaluations.map(e => (
          <EvaluationCard
            key={e.id}
            evaluation={e}
            isOwn={e.agent.id === currentUserId}
            onDeleted={id => setEvaluations(prev => prev.filter(ev => ev.id !== id))}
            onEdited={updated => setEvaluations(prev => prev.map(ev => ev.id === updated.id ? updated : ev))}
          />
        ))}
      </div>
    </div>
  )
}
