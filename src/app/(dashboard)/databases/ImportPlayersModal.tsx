'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ─── Field definitions ────────────────────────────────────────────────────────

interface FieldDef { key: string; label: string; group: string }

const SCOUTLINK_FIELDS: FieldDef[] = [
  { key: 'fullName',              label: 'Full Name (auto-split)',   group: 'Identity' },
  { key: 'firstName',             label: 'First Name',              group: 'Identity' },
  { key: 'lastName',              label: 'Last Name',               group: 'Identity' },
  { key: 'middleName',            label: 'Middle Name',             group: 'Identity' },
  { key: 'nationality',           label: 'Nationality',             group: 'Identity' },
  { key: 'dateOfBirth',           label: 'Date of Birth',           group: 'Identity' },
  { key: 'ageApprox',             label: 'Age (→ approx. DOB)',     group: 'Identity' },
  { key: 'heightCm',              label: 'Height (cm)',             group: 'Identity' },
  { key: 'cf_foot',               label: 'Preferred Foot',          group: 'Identity' },
  { key: 'cf_passports',          label: 'Passports',               group: 'Identity' },
  { key: 'position',              label: 'Position',                group: 'Club / Career' },
  { key: 'clubName',              label: 'Club',                    group: 'Club / Career' },
  { key: 'agentName',             label: 'Agent Name',              group: 'Club / Career' },
  { key: 'cf_league',             label: 'League',                  group: 'Club / Career' },
  { key: 'cf_contractExpiry',     label: 'Contract Expiry',         group: 'Club / Career' },
  { key: 'cf_joiningDate',        label: 'Joining Date',            group: 'Club / Career' },
  { key: 'marketValue',           label: 'Market Value (€)',        group: 'Financial' },
  { key: 'cf_fmWages',            label: 'FM Wages (£/w)',          group: 'Financial' },
  { key: 'cf_transferFeeExpect',  label: 'Transfer Fee Expectation',group: 'Financial' },
  { key: 'cf_transferFeeReal',    label: 'Transfer Fee (Real)',     group: 'Financial' },
  { key: 'cf_salaryExpect',       label: 'Salary Expectation',     group: 'Financial' },
  { key: 'cf_salaryReal',         label: 'Salary (Real)',           group: 'Financial' },
  { key: 'playsNational',         label: 'Plays National Team',     group: 'Stats' },
  { key: 'cf_fmAttributes',       label: 'FM Attributes',          group: 'Player Data' },
  { key: 'cf_description',        label: 'Bio / Description',      group: 'Player Data' },
  { key: 'cf_sentBy',             label: 'Sent By',                group: 'Player Data' },
  { key: 'cf_injuryType',         label: 'Injury Type',            group: 'Player Data' },
  { key: 'cf_injuryReturn',       label: 'Return Date',            group: 'Player Data' },
  { key: 'cf_transfermarktUrl',   label: 'Transfermarkt URL',      group: 'Links' },
  { key: 'cf_sofascoreUrl',       label: 'Sofascore URL',          group: 'Links' },
  { key: 'cf_fmInsideUrl',        label: 'FMInside URL',           group: 'Links' },
  { key: 'cf_instagram',          label: 'Instagram URL',          group: 'Links' },
  { key: 'cf_twitter',            label: 'Twitter / X URL',        group: 'Links' },
  { key: 'cf_tiktok',             label: 'TikTok URL',             group: 'Links' },
  { key: 'cf_highlights',         label: 'Highlights Link',        group: 'Links' },
  { key: 'cf_photo',              label: 'Photo URL',              group: 'Links' },
  { key: 'cf_playerPhone',        label: 'Player Phone',           group: 'Contact' },
  { key: 'cf_agentPhone',         label: 'Agent Phone',            group: 'Contact' },
]

const AUTO_MAP: Record<string, string> = {
  'name': 'fullName', 'player': 'fullName', 'player name': 'fullName', 'full name': 'fullName', 'fullname': 'fullName',
  'first name': 'firstName', 'firstname': 'firstName', 'first': 'firstName',
  'last name': 'lastName', 'lastname': 'lastName', 'surname': 'lastName', 'last': 'lastName',
  'middle name': 'middleName', 'middlename': 'middleName',
  'nationality': 'nationality', 'country': 'nationality', 'nation': 'nationality',
  'dob': 'dateOfBirth', 'date of birth': 'dateOfBirth', 'birthday': 'dateOfBirth', 'birth date': 'dateOfBirth',
  'age': 'ageApprox', 'years old': 'ageApprox', 'player age': 'ageApprox',
  'height': 'heightCm', 'height (cm)': 'heightCm', 'height cm': 'heightCm',
  'position': 'position', 'pos': 'position', 'role': 'position',
  'club': 'clubName', 'team': 'clubName', 'current club': 'clubName', 'current team': 'clubName',
  'agent': 'agentName', 'agent name': 'agentName',
  'league': 'cf_league', 'division': 'cf_league',
  'contract': 'cf_contractExpiry', 'contract expiry': 'cf_contractExpiry', 'expires': 'cf_contractExpiry', 'contract end': 'cf_contractExpiry',
  'market value': 'marketValue', 'value': 'marketValue', 'transfer value': 'marketValue',
  'fm wages': 'cf_fmWages', 'wages': 'cf_fmWages', 'salary': 'cf_fmWages',
  'foot': 'cf_foot', 'preferred foot': 'cf_foot', 'strong foot': 'cf_foot',
  'passports': 'cf_passports', 'dual nationality': 'cf_passports', 'second passport': 'cf_passports',
  'joining date': 'cf_joiningDate', 'joined': 'cf_joiningDate', 'join date': 'cf_joiningDate',
  'transfer fee expectation': 'cf_transferFeeExpect', 'fee expectation': 'cf_transferFeeExpect', 'asking price': 'cf_transferFeeExpect',
  'transfer fee': 'cf_transferFeeReal', 'transfer fee real': 'cf_transferFeeReal', 'fee paid': 'cf_transferFeeReal',
  'salary expectation': 'cf_salaryExpect', 'wage expectation': 'cf_salaryExpect', 'salary ask': 'cf_salaryExpect',
  'salary real': 'cf_salaryReal', 'actual salary': 'cf_salaryReal', 'actual wage': 'cf_salaryReal',

  'fm attributes': 'cf_fmAttributes', 'attributes': 'cf_fmAttributes', 'fm attr': 'cf_fmAttributes',
  'description': 'cf_description', 'bio': 'cf_description', 'notes': 'cf_description', 'about': 'cf_description',
  'sent by': 'cf_sentBy', 'source': 'cf_sentBy', 'referred by': 'cf_sentBy',
  'injury': 'cf_injuryType', 'injury type': 'cf_injuryType', 'injured': 'cf_injuryType',
  'return date': 'cf_injuryReturn', 'injury return': 'cf_injuryReturn', 'return from injury': 'cf_injuryReturn',
  'transfermarkt': 'cf_transfermarktUrl', 'transfermarkt url': 'cf_transfermarktUrl', 'tm url': 'cf_transfermarktUrl',
  'sofascore': 'cf_sofascoreUrl', 'sofascore url': 'cf_sofascoreUrl', 'sc url': 'cf_sofascoreUrl',
  'fminside': 'cf_fmInsideUrl', 'fm inside': 'cf_fmInsideUrl', 'fminside url': 'cf_fmInsideUrl',
  'instagram': 'cf_instagram', 'instagram url': 'cf_instagram', 'ig': 'cf_instagram',
  'twitter': 'cf_twitter', 'twitter url': 'cf_twitter', 'x url': 'cf_twitter', 'x.com': 'cf_twitter',
  'tiktok': 'cf_tiktok', 'tiktok url': 'cf_tiktok', 'tik tok': 'cf_tiktok',
  'player phone': 'cf_playerPhone', 'phone': 'cf_playerPhone', 'mobile': 'cf_playerPhone', 'player mobile': 'cf_playerPhone', 'phone number': 'cf_playerPhone',
  'agent phone': 'cf_agentPhone', 'agent mobile': 'cf_agentPhone', 'agent number': 'cf_agentPhone',
  'highlights': 'cf_highlights', 'highlights link': 'cf_highlights', 'video': 'cf_highlights',
  'photo': 'cf_photo', 'photo url': 'cf_photo', 'image': 'cf_photo', 'picture': 'cf_photo',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Database { id: string; name: string }
interface ParsedRow { [col: string]: string }

interface MappedPlayer {
  firstName: string; lastName: string; middleName?: string
  position?: string; clubName?: string; nationality?: string; agentName?: string
  dateOfBirth?: string; heightCm?: number | null; marketValue?: number | null
  playsNational?: boolean; customFields?: Record<string, string>
  conflictAction?: 'skip' | 'overwrite'
}

interface EditRow {
  idx: number
  values: Record<string, string>
  isConflict: boolean
  action: 'skip' | 'overwrite' | 'new'
  deleted: boolean
}

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
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const phantomScrollRef = useRef<HTMLDivElement>(null)
  const [tableScrollWidth, setTableScrollWidth] = useState(0)

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

  // Step 3 — editable preview
  const [editRows, setEditRows] = useState<EditRow[]>([])

  // Submission
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; overwritten: number; errors: string[] } | null>(null)
  const [targetDbId, setTargetDbId] = useState('')

  // ── Derived columns for the editable table ────────────────────────────────

  const editCols: FieldDef[] = (() => {
    const keys = new Set<string>()
    for (const v of Object.values(mapping)) {
      if (!v) continue
      if (v === 'fullName') { keys.add('firstName'); keys.add('lastName') }
      else if (v === 'ageApprox') keys.add('dateOfBirth')
      else keys.add(v)
    }
    keys.add('firstName')
    keys.add('lastName')
    return SCOUTLINK_FIELDS.filter(f => f.key !== 'fullName' && f.key !== 'ageApprox' && keys.has(f.key))
  })()

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
      const usedTargets = new Set<string>()
      for (const col of cols) {
        const mapped = AUTO_MAP[col.toLowerCase().trim()]
        if (mapped && !usedTargets.has(mapped)) {
          autoMapped[col] = mapped
          usedTargets.add(mapped)
        }
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

    const mapped = rows.map(row => applyMapping(row, mapping)).filter(p => p.firstName && p.lastName)

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

    const built: EditRow[] = mapped.map((p, i) => {
      const fLower = p.firstName.toLowerCase()
      const lLower = p.lastName.toLowerCase()
      const isConflict = existingNames.has(`${fLower} ${lLower}`) || existingNames.has(`${lLower} ${fLower}`)
      const values: Record<string, string> = {
        firstName:    p.firstName ?? '',
        lastName:     p.lastName ?? '',
        middleName:   p.middleName ?? '',
        position:     p.position ?? '',
        clubName:     p.clubName ?? '',
        nationality:  p.nationality ?? '',
        agentName:    p.agentName ?? '',
        dateOfBirth:  p.dateOfBirth ?? '',
        heightCm:     p.heightCm != null ? String(p.heightCm) : '',
        marketValue:  p.marketValue != null ? String(p.marketValue) : '',
        playsNational: p.playsNational ? 'Yes' : '',
      }
      for (const [k, v] of Object.entries(p.customFields ?? {})) {
        values[`cf_${k}`] = v
      }
      return { idx: i, values, isConflict, action: isConflict ? 'skip' : 'new', deleted: false }
    })

    setEditRows(built)
    setStep(3)
  }

  // ── Edit table helpers ────────────────────────────────────────────────────

  function updateCell(idx: number, fieldKey: string, value: string) {
    setEditRows(rs => rs.map(r => r.idx === idx ? { ...r, values: { ...r.values, [fieldKey]: value } } : r))
  }

  function updateAction(idx: number, action: 'skip' | 'overwrite') {
    setEditRows(rs => rs.map(r => r.idx === idx ? { ...r, action } : r))
  }

  function deleteRow(idx: number) {
    setEditRows(rs => rs.map(r => r.idx === idx ? { ...r, deleted: true } : r))
  }

  function bulkAction(action: 'skip' | 'overwrite') {
    setEditRows(rs => rs.map(r => r.isConflict && !r.deleted ? { ...r, action } : r))
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

    const players: MappedPlayer[] = editRows
      .filter(r => !r.deleted)
      .map(r => {
        const customFields: Record<string, string> = {}
        for (const [k, v] of Object.entries(r.values)) {
          if (k.startsWith('cf_') && v.trim()) customFields[k.slice(3)] = v.trim()
        }
        const heightCm = parseFloat(r.values.heightCm ?? '')
        const marketValue = parseFloat(r.values.marketValue ?? '')
        return {
          firstName:     r.values.firstName?.trim() ?? '',
          lastName:      r.values.lastName?.trim() ?? '',
          middleName:    r.values.middleName?.trim() || undefined,
          position:      r.values.position?.trim() || undefined,
          clubName:      r.values.clubName?.trim() || undefined,
          nationality:   r.values.nationality?.trim() || undefined,
          agentName:     r.values.agentName?.trim() || undefined,
          dateOfBirth:   r.values.dateOfBirth?.trim() || undefined,
          heightCm:      isNaN(heightCm) ? null : heightCm,
          marketValue:   isNaN(marketValue) ? null : marketValue,
          playsNational: /^(yes|true|1|y)$/i.test(r.values.playsNational ?? ''),
          customFields:  Object.keys(customFields).length > 0 ? customFields : undefined,
          conflictAction: r.isConflict ? (r.action as 'skip' | 'overwrite') : undefined,
        }
      })

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
      router.push('/databases')
      router.refresh()
    } else {
      router.refresh()
    }
  }

  // ── Phantom scrollbar sync ────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 3) return
    const el = tableScrollRef.current
    if (!el) return
    const measure = () => setTableScrollWidth(el.scrollWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [step, editCols.length])

  function onTableScroll() {
    if (phantomScrollRef.current && tableScrollRef.current)
      phantomScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft
  }
  function onPhantomScroll() {
    if (tableScrollRef.current && phantomScrollRef.current)
      tableScrollRef.current.scrollLeft = phantomScrollRef.current.scrollLeft
  }

  // ── Derived counts ────────────────────────────────────────────────────────

  const activeRows    = editRows.filter(r => !r.deleted)
  const newCount      = activeRows.filter(r => !r.isConflict).length
  const conflictCount = activeRows.filter(r => r.isConflict).length
  const removedCount  = editRows.filter(r => r.deleted).length
  const importCount   = activeRows.filter(r => !r.isConflict || r.action === 'overwrite').length

  // ── Render ─────────────────────────────────────────────────────────────────

  const isWide = step === 3 && !result

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className={`w-full rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${isWide ? 'max-w-5xl' : 'max-w-2xl'}`}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,150,0.08)',
          maxHeight: '92vh',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* Top accent bar */}
        <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: importing ? 'rgba(0,200,150,0.15)' : 'linear-gradient(90deg, #00c896, #00a878)', flexShrink: 0 }}>
          {importing && (
            <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%', background: 'linear-gradient(90deg, transparent, #00c896, rgba(0,200,150,0.4))', animation: 'sl-progress 1.4s ease-in-out infinite' }} />
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Import Players</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {([['Setup', 1], ['Map Fields', 2], ['Edit & Verify', 3]] as const).map(([label, n]) => (
                  <div key={n} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: step === n ? '#00c896' : step > n ? 'rgba(0,200,150,0.3)' : 'var(--hover-bg)', color: step >= n ? (step === n ? '#000' : '#00c896') : 'var(--text-faint)' }}>
                      {step > n ? '✓' : n}
                    </div>
                    <span className="text-[10px]" style={{ color: step === n ? 'var(--text-primary)' : 'var(--text-faint)' }}>{label}</span>
                    {n < 3 && <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>›</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--hover-bg)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">

          {/* ── Step 1 ── */}
          {step === 1 && !result && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-faint)' }}>File (CSV or Excel .xlsx)</label>
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

              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-faint)' }}>Import destination</label>
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

              {step1Error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  <p className="text-xs" style={{ color: '#ef4444' }}>{step1Error}</p>
                </div>
              )}
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
                            <span className="truncate block">{String(rows[0]?.[col] ?? '') || '—'}</span>
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
              {step2Error && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  <p className="text-xs" style={{ color: '#ef4444' }}>{step2Error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3 — Editable preview ── */}
          {step === 3 && !result && !importing && (
            <div className="flex flex-col h-full min-h-0">

              {/* Summary bar */}
              <div className="flex items-center gap-2 mb-3 flex-wrap flex-shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}>
                  {newCount} new player{newCount !== 1 ? 's' : ''}
                </span>
                {conflictCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                    {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
                  </span>
                )}
                {removedCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {removedCount} removed
                  </span>
                )}
                {conflictCount > 0 && (
                  <div className="ml-auto flex gap-1.5">
                    <button onClick={() => bulkAction('skip')} className="text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      Skip all conflicts
                    </button>
                    <button onClick={() => bulkAction('overwrite')} className="text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                      Overwrite all
                    </button>
                  </div>
                )}
              </div>

              {/* Hint */}
              <p className="text-xs mb-3 flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
                Click any cell to edit · Press Enter or click away to confirm · Use Delete (×) to remove a row
              </p>

              {/* Editable table */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-strong)', borderRadius: 12, overflow: 'hidden' }}>
                <div
                  ref={tableScrollRef}
                  onScroll={onTableScroll}
                  style={{ overflowX: 'hidden', overflowY: 'auto', flex: 1, minHeight: 0 }}
                >
                <table style={{ borderCollapse: 'collapse', minWidth: editCols.length * 140 + 200 }}>
                  <thead>
                    <tr style={{ background: 'var(--subtle-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
                      {editCols.map(col => (
                        <th key={col.key}
                          className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap border-b"
                          style={{ color: 'var(--text-faint)', borderColor: 'var(--border-strong)', minWidth: col.key === 'firstName' || col.key === 'lastName' ? 120 : 130 }}>
                          {col.label}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap border-b"
                        style={{ color: 'var(--text-faint)', borderColor: 'var(--border-strong)', minWidth: 130 }}>
                        Status
                      </th>
                      <th className="px-3 py-2.5 border-b w-8" style={{ borderColor: 'var(--border-strong)' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {editRows.filter(r => !r.deleted).map((row, visIdx) => (
                      <tr key={row.idx}
                        style={{ background: row.isConflict ? 'rgba(245,158,11,0.04)' : visIdx % 2 === 0 ? 'transparent' : 'var(--subtle-bg)' }}>
                        {editCols.map(col => (
                          <td key={col.key} className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)', verticalAlign: 'middle' }}>
                            <EditCell
                              value={row.values[col.key] ?? ''}
                              onChange={v => updateCell(row.idx, col.key, v)}
                              required={col.key === 'firstName' || col.key === 'lastName'}
                            />
                          </td>
                        ))}
                        {/* Status */}
                        <td className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)', verticalAlign: 'middle' }}>
                          {row.isConflict ? (
                            <div className="flex rounded-md overflow-hidden border w-fit" style={{ borderColor: 'var(--border)' }}>
                              <button
                                onClick={() => updateAction(row.idx, 'skip')}
                                className="px-2 py-0.5 text-[11px] font-semibold transition-colors"
                                style={{ background: row.action === 'skip' ? 'rgba(245,158,11,0.2)' : 'transparent', color: row.action === 'skip' ? '#f59e0b' : 'var(--text-faint)' }}>
                                Skip
                              </button>
                              <button
                                onClick={() => updateAction(row.idx, 'overwrite')}
                                className="px-2 py-0.5 text-[11px] font-semibold transition-colors"
                                style={{ background: row.action === 'overwrite' ? 'rgba(245,158,11,0.2)' : 'transparent', color: row.action === 'overwrite' ? '#f59e0b' : 'var(--text-faint)' }}>
                                Overwrite
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium" style={{ color: '#00c896' }}>✓ New</span>
                          )}
                        </td>
                        {/* Delete */}
                        <td className="px-2 py-2 border-b" style={{ borderColor: 'var(--border)', verticalAlign: 'middle' }}>
                          <button
                            onClick={() => deleteRow(row.idx)}
                            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                            style={{ color: 'var(--text-faint)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent' }}
                            title="Remove row"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {/* Phantom scrollbar — always visible at the bottom of the table area */}
                <div
                  ref={phantomScrollRef}
                  onScroll={onPhantomScroll}
                  style={{ overflowX: 'auto', overflowY: 'hidden', flexShrink: 0, height: 12 }}
                >
                  <div style={{ width: tableScrollWidth, height: 1 }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Importing ── */}
          {importing && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Importing players…</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This may take a moment for large lists</p>
            </div>
          )}

          {/* ── Result ── */}
          {result && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)' }}>
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Import complete</p>
                <div className="flex gap-4 justify-center mt-2">
                  {result.imported > 0 && <span className="text-sm" style={{ color: '#00c896' }}>{result.imported} imported</span>}
                  {result.overwritten > 0 && <span className="text-sm" style={{ color: '#f59e0b' }}>{result.overwritten} overwritten</span>}
                  {result.skipped > 0 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{result.skipped} skipped</span>}
                </div>
                {(result.errors ?? []).length > 0 && (
                  <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {result ? (
            <button onClick={handleDone}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}>
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => { if (step === 1) onClose(); else setStep(s => (s - 1) as 1 | 2 | 3) }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {step === 1 ? 'Cancel' : '← Back'}
              </button>
              {step === 1 && (
                <button onClick={handleStep1Next}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}>
                  Next →
                </button>
              )}
              {step === 2 && (
                <button onClick={handleStep2Next}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}>
                  Next →
                </button>
              )}
              {step === 3 && !importing && (
                <button
                  onClick={handleImport}
                  disabled={importCount === 0}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-default transition-all"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)', cursor: importCount === 0 ? 'default' : 'pointer' }}
                  onMouseEnter={e => { if (importCount > 0) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}
                >
                  Import {importCount} player{importCount !== 1 ? 's' : ''}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── EditCell ─────────────────────────────────────────────────────────────────

function EditCell({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])

  function commit() { setEditing(false); onChange(draft) }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        className="w-full bg-transparent focus:outline-none text-sm rounded px-1"
        style={{ color: 'var(--text-primary)', minWidth: 80, border: '1px solid #00c896', margin: -1 }}
      />
    )
  }

  const isEmpty = !value
  return (
    <div
      onClick={() => setEditing(true)}
      className="text-sm cursor-text rounded px-1 py-0.5 transition-colors"
      style={{
        color: isEmpty ? 'var(--text-faint)' : 'var(--text-primary)',
        minWidth: 80,
        minHeight: 22,
        outline: required && isEmpty ? '1px solid rgba(239,68,68,0.4)' : undefined,
        borderRadius: 4,
      }}
      title={value || undefined}
    >
      {value || (required ? <span style={{ color: 'rgba(239,68,68,0.6)', fontSize: 11 }}>required</span> : '—')}
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

  const buf = await file.arrayBuffer()
  const wb  = XLSX.read(new Uint8Array(buf), { type: 'array' })
  const ws  = wb.Sheets[wb.SheetNames[0]]
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]

  if (allRows.length === 0) return { cols: [], data: [] }

  let headerIdx = 0
  for (let i = 0; i < Math.min(allRows.length, 5); i++) {
    const textCells = allRows[i].filter(c => {
      const s = String(c ?? '').trim()
      return s.length > 0 && isNaN(Number(s))
    })
    if (textCells.length >= 2) { headerIdx = i; break }
  }

  const headers = allRows[headerIdx].map(h => String(h ?? '').trim())
  const cols = headers.filter(h => h)

  const data: ParsedRow[] = allRows.slice(headerIdx + 1)
    .map(row => {
      const obj: ParsedRow = {}
      headers.forEach((h, i) => { if (h) obj[h] = String(row[i] ?? '').trim() })
      return obj
    })
    .filter(row => Object.values(row).some(v => v))

  return { cols, data }
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

    if (['heightCm', 'marketValue'].includes(fieldKey)) {
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

    if (fieldKey === 'ageApprox') {
      const age = parseInt(raw, 10)
      if (!isNaN(age) && age > 0 && age < 100) {
        const birthYear = new Date().getFullYear() - age
        out['dateOfBirth'] = `${birthYear}-01-01`
      }
      continue
    }

    out[fieldKey] = raw
  }

  if (Object.keys(customFields).length > 0) out.customFields = customFields
  return out as unknown as MappedPlayer
}

function tryParseDate(s: string): string | null {
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
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
