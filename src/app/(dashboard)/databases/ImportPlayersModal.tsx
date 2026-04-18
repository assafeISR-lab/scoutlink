'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ─── Field definitions ────────────────────────────────────────────────────────

interface FieldDef { key: string; label: string; group: string }

const SCOUTLINK_FIELDS: FieldDef[] = [
  { key: 'fullName',       label: 'Full Name (auto-split)',  group: 'Identity' },
  { key: 'firstName',      label: 'First Name',              group: 'Identity' },
  { key: 'lastName',       label: 'Last Name',               group: 'Identity' },
  { key: 'middleName',     label: 'Middle Name',             group: 'Identity' },
  { key: 'nationality',    label: 'Nationality',             group: 'Identity' },
  { key: 'dateOfBirth',    label: 'Date of Birth',           group: 'Identity' },
  { key: 'heightCm',       label: 'Height (cm)',             group: 'Identity' },
  { key: 'weightKg',       label: 'Weight (kg)',             group: 'Identity' },
  { key: 'position',       label: 'Position',                group: 'Club / Career' },
  { key: 'clubName',       label: 'Club',                    group: 'Club / Career' },
  { key: 'agentName',      label: 'Agent Name',              group: 'Club / Career' },
  { key: 'yearsInProClub', label: 'Years in Pro Club',       group: 'Club / Career' },
  { key: 'cf_league',      label: 'League',                  group: 'Club / Career' },
  { key: 'cf_contractExpiry', label: 'Contract Expiry',      group: 'Club / Career' },
  { key: 'marketValue',    label: 'Market Value (€)',        group: 'Financial' },
  { key: 'cf_fmWages',     label: 'FM Wages (£/w)',          group: 'Financial' },
  { key: 'goalsThisYear',  label: 'Goals This Year',         group: 'Stats' },
  { key: 'totalGoals',     label: 'Total Goals',             group: 'Stats' },
  { key: 'totalGames',     label: 'Total Games',             group: 'Stats' },
  { key: 'nationalGames',  label: 'National Team Games',     group: 'Stats' },
  { key: 'playsNational',  label: 'Plays National Team',     group: 'Stats' },
  { key: 'cf_foot',        label: 'Preferred Foot',          group: 'Other' },
]

const AUTO_MAP: Record<string, string> = {
  'name': 'fullName', 'player': 'fullName', 'player name': 'fullName', 'full name': 'fullName', 'fullname': 'fullName',
  'first name': 'firstName', 'firstname': 'firstName', 'first': 'firstName',
  'last name': 'lastName', 'lastname': 'lastName', 'surname': 'lastName', 'last': 'lastName',
  'middle name': 'middleName', 'middlename': 'middleName',
  'nationality': 'nationality', 'country': 'nationality', 'nation': 'nationality',
  'dob': 'dateOfBirth', 'date of birth': 'dateOfBirth', 'birthday': 'dateOfBirth', 'birth date': 'dateOfBirth',
  'height': 'heightCm', 'height (cm)': 'heightCm', 'height cm': 'heightCm',
  'weight': 'weightKg', 'weight (kg)': 'weightKg', 'weight kg': 'weightKg',
  'position': 'position', 'pos': 'position', 'role': 'position',
  'club': 'clubName', 'team': 'clubName', 'current club': 'clubName', 'current team': 'clubName',
  'agent': 'agentName', 'agent name': 'agentName',
  'league': 'cf_league', 'division': 'cf_league',
  'contract': 'cf_contractExpiry', 'contract expiry': 'cf_contractExpiry', 'expires': 'cf_contractExpiry', 'contract end': 'cf_contractExpiry',
  'market value': 'marketValue', 'value': 'marketValue', 'transfer value': 'marketValue',
  'fm wages': 'cf_fmWages', 'wages': 'cf_fmWages', 'salary': 'cf_fmWages',
  'foot': 'cf_foot', 'preferred foot': 'cf_foot', 'strong foot': 'cf_foot',
  'goals': 'goalsThisYear', 'goals this year': 'goalsThisYear', 'goals this season': 'goalsThisYear',
  'total goals': 'totalGoals', 'career goals': 'totalGoals',
  'games': 'totalGames', 'total games': 'totalGames', 'appearances': 'totalGames',
  'national games': 'nationalGames', 'international games': 'nationalGames',
  'years in pro club': 'yearsInProClub', 'pro experience': 'yearsInProClub',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Database { id: string; name: string }

interface ParsedRow { [col: string]: string }

interface MappedPlayer {
  firstName: string; lastName: string; middleName?: string
  position?: string; clubName?: string; nationality?: string; agentName?: string
  dateOfBirth?: string; heightCm?: number | null; weightKg?: number | null
  marketValue?: number | null; goalsThisYear?: number | null; totalGoals?: number | null
  totalGames?: number | null; nationalGames?: number | null; yearsInProClub?: number | null
  playsNational?: boolean; customFields?: Record<string, string>
  conflictAction?: 'skip' | 'overwrite'
}

interface ConflictPlayer extends MappedPlayer { isConflict: boolean; rowIndex: number }

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportPlayersModal({
  onClose,
  databases = [],
  preselectedDatabaseId,
}: {
  onClose: () => void
  databases?: Database[]
  preselectedDatabaseId?: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1
  const [file, setFile] = useState<File | null>(null)
  const [destMode, setDestMode] = useState<'existing' | 'new'>(preselectedDatabaseId ? 'existing' : 'existing')
  const [selectedDbId, setSelectedDbId] = useState(preselectedDatabaseId ?? (databases[0]?.id ?? ''))
  const [newListName, setNewListName] = useState('')
  const [step1Error, setStep1Error] = useState('')

  // Step 2
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [step2Error, setStep2Error] = useState('')

  // Step 3
  const [preview, setPreview] = useState<ConflictPlayer[]>([])
  const [conflictActions, setConflictActions] = useState<Record<number, 'skip' | 'overwrite'>>({})

  // Submission
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; overwritten: number; errors: string[] } | null>(null)
  const [targetDbId, setTargetDbId] = useState('')

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────

  async function handleStep1Next() {
    setStep1Error('')
    if (!file) { setStep1Error('Please select a file.'); return }
    if (destMode === 'new' && !newListName.trim()) { setStep1Error('Please enter a name for the new list.'); return }
    if (destMode === 'existing' && !selectedDbId) { setStep1Error('Please select a list.'); return }

    try {
      const { cols, data } = await parseFile(file)
      setColumns(cols)
      setRows(data)
      const autoMapped: Record<string, string> = {}
      for (const col of cols) {
        const mapped = AUTO_MAP[col.toLowerCase().trim()]
        if (mapped) autoMapped[col] = mapped
      }
      setMapping(autoMapped)
      setStep(2)
    } catch {
      setStep1Error('Could not parse file. Please check it is a valid CSV or Excel file.')
    }
  }

  // ── Step 2 → 3 ────────────────────────────────────────────────────────────

  async function handleStep2Next() {
    setStep2Error('')
    const hasFirst = Object.values(mapping).includes('firstName') || Object.values(mapping).includes('fullName')
    const hasLast  = Object.values(mapping).includes('lastName')  || Object.values(mapping).includes('fullName')
    if (!hasFirst || !hasLast) {
      setStep2Error('You must map either "Full Name" or both "First Name" and "Last Name".')
      return
    }

    // Map rows → MappedPlayer
    const mapped = rows.map(row => applyMapping(row, mapping)).filter(p => p.firstName && p.lastName)

    // Fetch existing players for conflict detection
    const dbId = destMode === 'existing' ? selectedDbId : null
    let existingNames = new Set<string>()
    if (dbId) {
      try {
        const res = await fetch(`/api/databases/${dbId}/import`)
        if (res.ok) {
          const data: { firstName: string; lastName: string }[] = await res.json()
          existingNames = new Set(data.map(p => `${p.firstName.toLowerCase()} ${p.lastName.toLowerCase()}`))
        }
      } catch {}
    }

    const withConflicts: ConflictPlayer[] = mapped.map((p, i) => ({
      ...p,
      isConflict: existingNames.has(`${p.firstName.toLowerCase()} ${p.lastName.toLowerCase()}`),
      rowIndex: i,
    }))

    const defaultActions: Record<number, 'skip' | 'overwrite'> = {}
    withConflicts.forEach((p, i) => { if (p.isConflict) defaultActions[i] = 'skip' })

    setPreview(withConflicts)
    setConflictActions(defaultActions)
    setStep(3)
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  async function handleImport() {
    setImporting(true)

    let dbId = selectedDbId

    if (destMode === 'new') {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName.trim() }),
      })
      if (!res.ok) { setImporting(false); return }
      const db = await res.json()
      dbId = db.id
    }

    setTargetDbId(dbId)

    const players = preview.map((p, i) => ({
      ...p,
      conflictAction: p.isConflict ? (conflictActions[i] ?? 'skip') : undefined,
    }))

    const res = await fetch(`/api/databases/${dbId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    })

    const data = await res.json()
    setResult(data)
    setImporting(false)
  }

  function handleDone() {
    onClose()
    if (targetDbId) {
      router.push(`/databases/${targetDbId}`)
      router.refresh()
    } else {
      router.refresh()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const newCount      = preview.filter(p => !p.isConflict).length
  const conflictCount = preview.filter(p => p.isConflict).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 flex flex-col max-h-[90vh]"
        style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Import Players</h2>
            <div className="flex items-center gap-2 mt-1">
              {[1,2,3].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: step === n ? '#00c896' : step > n ? 'rgba(0,200,150,0.3)' : 'var(--hover-bg)', color: step >= n ? (step === n ? '#000' : '#00c896') : 'var(--text-faint)' }}>
                    {step > n ? '✓' : n}
                  </div>
                  <span className="text-[11px]" style={{ color: step === n ? 'var(--text-primary)' : 'var(--text-faint)' }}>
                    {n === 1 ? 'Setup' : n === 2 ? 'Map Fields' : 'Preview'}
                  </span>
                  {n < 3 && <span style={{ color: 'var(--text-faint)' }}>›</span>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1 ── */}
          {step === 1 && !result && (
            <div className="flex flex-col gap-5">
              {/* File upload */}
              <div>
                <label className="block text-xs text-white/40 mb-2">File (CSV or Excel .xlsx)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
                    style={{ background: 'var(--hover-bg)', border: '1px dashed var(--border-strong)', color: 'var(--text-muted)' }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
                    Choose file
                  </button>
                  {file && <span className="text-sm" style={{ color: '#00c896' }}>{file.name}</span>}
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); setStep1Error('') }} />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs text-white/40 mb-2">Import destination</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: destMode === 'existing' ? 'rgba(0,200,150,0.08)' : 'var(--hover-bg)', border: `1px solid ${destMode === 'existing' ? 'rgba(0,200,150,0.3)' : 'var(--border)'}` }}>
                    <input type="radio" checked={destMode === 'existing'} onChange={() => setDestMode('existing')} className="accent-[#00c896]" />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Add to existing list</span>
                  </label>
                  {destMode === 'existing' && (
                    <select value={selectedDbId} onChange={e => setSelectedDbId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ml-6"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      {databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}
                    </select>
                  )}
                  <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: destMode === 'new' ? 'rgba(0,200,150,0.08)' : 'var(--hover-bg)', border: `1px solid ${destMode === 'new' ? 'rgba(0,200,150,0.3)' : 'var(--border)'}` }}>
                    <input type="radio" checked={destMode === 'new'} onChange={() => setDestMode('new')} className="accent-[#00c896]" />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Create new list</span>
                  </label>
                  {destMode === 'new' && (
                    <input value={newListName} onChange={e => setNewListName(e.target.value)}
                      placeholder="List name…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ml-6"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                  )}
                </div>
              </div>

              {step1Error && <p className="text-red-400 text-sm">{step1Error}</p>}
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Map each column from your file to a ScoutLink field. Columns set to "Ignore" will be skipped.
              </p>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-strong)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--subtle-bg)' }}>
                      <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>Your Column</th>
                      <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>Sample Value</th>
                      <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>ScoutLink Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {columns.map(col => {
                      const usedByOthers = new Set(
                        Object.entries(mapping).filter(([c, v]) => c !== col && v).map(([, v]) => v)
                      )
                      return (
                        <tr key={col}>
                          <td className="px-4 py-2.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{col}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)', maxWidth: 120 }}>
                            <span className="truncate block">{rows[0]?.[col] ?? '—'}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <select value={mapping[col] ?? ''} onChange={e => setMapping(m => ({ ...m, [col]: e.target.value }))}
                              className="w-full px-2.5 py-1.5 rounded-lg text-sm focus:outline-none"
                              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: mapping[col] ? 'var(--text-primary)' : 'var(--text-faint)' }}>
                              <option value="">Ignore</option>
                              {groupBy(SCOUTLINK_FIELDS, 'group').map(([group, fields]) => (
                                <optgroup key={group} label={group}>
                                  {fields.map(f => (
                                    <option key={f.key} value={f.key} disabled={usedByOthers.has(f.key)}>
                                      {f.label}{usedByOthers.has(f.key) ? ' (already mapped)' : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {step2Error && <p className="text-red-400 text-sm mt-3">{step2Error}</p>}
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && !result && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)' }}>
                  <span style={{ color: '#00c896' }}>✓</span>
                  <span style={{ color: '#00c896' }}>{newCount} new player{newCount !== 1 ? 's' : ''}</span>
                </div>
                {conflictCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <span style={{ color: '#f59e0b' }}>⚠</span>
                    <span style={{ color: '#f59e0b' }}>{conflictCount} conflict{conflictCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {conflictCount > 0 && (
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => { const a: Record<number, 'skip'|'overwrite'> = {}; preview.forEach((p,i) => { if (p.isConflict) a[i] = 'skip' }); setConflictActions(a) }}
                      className="px-3 py-1 rounded-lg text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>Skip all</button>
                    <button onClick={() => { const a: Record<number, 'skip'|'overwrite'> = {}; preview.forEach((p,i) => { if (p.isConflict) a[i] = 'overwrite' }); setConflictActions(a) }}
                      className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>Overwrite all</button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-strong)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--subtle-bg)' }}>
                      <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>Player</th>
                      <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>Position</th>
                      <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>Club</th>
                      <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {preview.map((p, i) => (
                      <tr key={i} style={{ background: p.isConflict ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                        <td className="px-4 py-2.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {p.firstName} {p.lastName}
                        </td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{p.position || '—'}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{p.clubName || '—'}</td>
                        <td className="px-4 py-2.5">
                          {p.isConflict ? (
                            <div className="flex rounded-md overflow-hidden border border-white/10 w-fit">
                              <button onClick={() => setConflictActions(a => ({ ...a, [i]: 'skip' }))}
                                className="px-2 py-0.5 text-[11px] font-semibold transition-colors"
                                style={{ background: conflictActions[i] === 'skip' ? 'rgba(245,158,11,0.2)' : 'transparent', color: conflictActions[i] === 'skip' ? '#f59e0b' : 'var(--text-faint)' }}>
                                Skip
                              </button>
                              <button onClick={() => setConflictActions(a => ({ ...a, [i]: 'overwrite' }))}
                                className="px-2 py-0.5 text-[11px] font-semibold transition-colors"
                                style={{ background: conflictActions[i] === 'overwrite' ? 'rgba(245,158,11,0.2)' : 'transparent', color: conflictActions[i] === 'overwrite' ? '#f59e0b' : 'var(--text-faint)' }}>
                                Overwrite
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium" style={{ color: '#00c896' }}>✓ New</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Result ── */}
          {result && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)' }}>
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white mb-1">Import complete</p>
                <div className="flex gap-4 justify-center mt-2">
                  {result.imported > 0 && <span className="text-sm" style={{ color: '#00c896' }}>{result.imported} imported</span>}
                  {result.overwritten > 0 && <span className="text-sm" style={{ color: '#f59e0b' }}>{result.overwritten} overwritten</span>}
                  {result.skipped > 0 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{result.skipped} skipped</span>}
                </div>
                {(result.errors ?? []).length > 0 && (
                  <p className="text-xs text-red-400 mt-2">{result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 flex-shrink-0">
          {result ? (
            <button onClick={handleDone} className="w-full py-2.5 rounded-xl text-sm font-semibold text-black"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
              Done
            </button>
          ) : (
            <>
              <button onClick={() => { if (step === 1) onClose(); else setStep(s => (s - 1) as 1|2|3) }}
                className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
                {step === 1 ? 'Cancel' : '← Back'}
              </button>
              {step === 1 && <button onClick={handleStep1Next} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>Next →</button>}
              {step === 2 && <button onClick={handleStep2Next} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>Next →</button>}
              {step === 3 && (
                <button onClick={handleImport} disabled={importing}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                  {importing ? 'Importing…' : `Import ${preview.filter(p => !p.isConflict || conflictActions[p.rowIndex] === 'overwrite').length} players`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── File parsing ─────────────────────────────────────────────────────────────

async function parseFile(file: File): Promise<{ cols: string[]; data: ParsedRow[] }> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse<ParsedRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: r => {
          const cols = r.meta.fields ?? []
          resolve({ cols, data: r.data })
        },
        error: reject,
      })
    })
  }

  // xlsx / xls
  const buf = await file.arrayBuffer()
  const wb  = XLSX.read(buf, { type: 'array' })
  const ws  = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' })
  const cols = raw.length > 0 ? Object.keys(raw[0]) : []
  return { cols, data: raw }
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function applyMapping(row: ParsedRow, mapping: Record<string, string>): MappedPlayer {
  const out: Record<string, unknown> = {}
  const customFields: Record<string, string> = {}

  for (const [col, fieldKey] of Object.entries(mapping)) {
    if (!fieldKey) continue
    const raw = String(row[col] ?? '').trim()
    if (!raw) continue

    if (fieldKey === 'fullName') {
      const parts = raw.split(/\s+/)
      out.firstName = parts[0] ?? ''
      out.lastName  = parts.slice(1).join(' ') || (parts[0] ?? '')
      continue
    }

    if (fieldKey.startsWith('cf_')) {
      customFields[fieldKey.slice(3)] = raw
      continue
    }

    if (['heightCm','weightKg','marketValue','goalsThisYear','totalGoals','totalGames','nationalGames','yearsInProClub'].includes(fieldKey)) {
      const n = parseFloat(raw.replace(/[^0-9.-]/g, ''))
      out[fieldKey] = isNaN(n) ? null : n
      continue
    }

    if (fieldKey === 'playsNational') {
      out[fieldKey] = /^(yes|true|1|y)$/i.test(raw)
      continue
    }

    if (fieldKey === 'dateOfBirth') {
      const d = tryParseDate(raw)
      if (d) out[fieldKey] = d
      continue
    }

    out[fieldKey] = raw
  }

  if (Object.keys(customFields).length > 0) out.customFields = customFields

  return out as unknown as MappedPlayer
}

function tryParseDate(s: string): string | null {
  // Try common formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, D MMM YYYY
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,           // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/,          // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/,
  ]
  for (const re of formats) {
    if (re.test(s)) {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

function groupBy<T>(arr: T[], key: keyof T): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const k = String(item[key])
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return [...map.entries()]
}
