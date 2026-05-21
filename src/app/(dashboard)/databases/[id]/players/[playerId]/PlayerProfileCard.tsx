'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NotesSection from './NotesSection'
import FMRadarChart from '@/components/FMRadarChart'
import LinkChips from '@/components/LinkChips'
import FMAttributesEditor from '@/components/FMAttributesEditor'
import SeasonStatsGrid, { SeasonStatsEditor } from '@/components/SeasonStatsGrid'
import { loadActive } from '@/app/(dashboard)/search/SearchParamsPanel'
import { positionPillStyle } from '@/lib/positionColor'

interface FieldSource {
  id: string
  fieldName: string
  sourceName: string
  sourceUrl: string | null
  isActive: boolean
}

interface Note {
  id: string
  content: string
  createdAt: Date
  agent: { id: string; fullName: string }
}

interface CustomFieldEntry {
  id: string
  fieldName: string
  value: string
}

interface PlayerData {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  position: string | null
  nationality: string | null
  dateOfBirth: Date | null
  heightCm: number | null
  clubName: string | null
  marketValue: number | null
  agentName: string | null
  playsNational: boolean
  available: boolean
  createdAt: Date
  fieldSources: FieldSource[]
  customFields: CustomFieldEntry[]
  notes: Note[]
}

interface Props {
  player: PlayerData
  addedByName: string
  currentUserId: string
  databaseId: string
  canWrite: boolean
  actionButtons: React.ReactNode
}

const toDateStr = (d: Date | null) => d ? new Date(d).toISOString().split('T')[0] : ''

export default function PlayerProfileCard({ player, addedByName, currentUserId, databaseId, canWrite, actionButtons }: Props) {
  const router = useRouter()

  // Helper to get custom field value
  const cf = (name: string) => player.customFields.find(f => f.fieldName === name)?.value ?? ''

  // ── Edit state ────────────────────────────────────────────────────────────
  const [photoEnabled, setPhotoEnabled] = useState(true)
  useEffect(() => { setPhotoEnabled(loadActive().has('photo')) }, [])

  const [saving,    setSaving]      = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  const [noteAdding,  setNoteAdding]  = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [localActiveFm, setLocalActiveFm] = useState(false)

  const initialForm = () => ({
    // DB fields
    position:      player.position       ?? '',
    heightCm:      player.heightCm?.toString()  ?? '',
    dateOfBirth:   toDateStr(player.dateOfBirth),
    nationality:   player.nationality    ?? '',
    clubName:      player.clubName       ?? '',
    marketValue:   player.marketValue != null ? (player.marketValue / 1_000_000).toString() : '',
    agentName:     player.agentName      ?? '',
    playsNational: player.playsNational,
    available:     player.available,
    // Custom fields
    foot:              cf('foot'),
    passports:         cf('passports'),
    league:            cf('league'),
    joiningDate:       cf('joiningDate'),
    contractExpiry:    cf('contractExpiry'),
    fmWages:           cf('fmWages'),
    transferFeeExpect: cf('transferFeeExpect'),
    transferFeeReal:   cf('transferFeeReal'),
    salaryExpect:      cf('salaryExpect'),
    salaryReal:        cf('salaryReal'),
    recentForm:        cf('recentForm'),
    transfermarktUrl:  cf('transfermarktUrl') || player.fieldSources.find(s => s.sourceName === 'Transfermarkt' && s.isActive)?.sourceUrl || '',
    sofascoreUrl:      cf('sofascoreUrl')     || player.fieldSources.find(s => s.sourceName === 'Sofascore'     && s.isActive)?.sourceUrl || '',
    fmInsideUrl:       cf('fmInsideUrl'),
    instagram:         cf('instagram'),
    twitter:           cf('twitter'),
    tiktok:            cf('tiktok'),
    highlights:        cf('highlights'),
    fmAttributes:      cf('fmAttributes'),
    seasonStats:       cf('seasonStats'),
    description:       cf('description'),
    sentBy:            cf('sentBy'),
    playerPhone:       cf('playerPhone'),
    agentPhone:        cf('agentPhone'),
  })

  const [form, setForm] = useState(initialForm)

  function setField(name: string, value: string | boolean) {
    setForm(f => ({ ...f, [name]: value }))
    setChangedFields(prev => new Set([...prev, name]))
  }

  async function saveAvailability(newVal: boolean) {
    setField('available', newVal)
    const res = await fetch(`/api/databases/${databaseId}/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: newVal, changedFields: ['available'], customFields: {} }),
    })
    if (!res.ok) {
      setField('available', !newVal)
      setSaveError('Failed to save')
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')

    // Split changed fields into DB fields and custom fields
    const dbFields = new Set(['position','heightCm','dateOfBirth','nationality','clubName','marketValue','agentName','playsNational','available'])
    const customFieldKeys = ['foot','passports','league','joiningDate','contractExpiry','fmWages','transferFeeExpect','transferFeeReal','salaryExpect','salaryReal','recentForm','transfermarktUrl','sofascoreUrl','fmInsideUrl','instagram','twitter','tiktok','highlights','fmAttributes','seasonStats','description','sentBy','playerPhone','agentPhone']

    const changedDbFields = [...changedFields].filter(f => dbFields.has(f))
    const changedCustomFields = [...changedFields].filter(f => customFieldKeys.includes(f))

    // Build custom fields payload (all custom field values, not just changed ones)
    const customFieldsPayload: Record<string, string> = {}
    for (const key of customFieldKeys) {
      if (changedCustomFields.includes(key)) {
        customFieldsPayload[key] = String((form as any)[key] ?? '')
      }
    }

    const saves: Promise<Response>[] = []

    if (changedDbFields.length > 0 || Object.keys(customFieldsPayload).length > 0) {
      saves.push(fetch(`/api/databases/${databaseId}/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          changedFields: changedDbFields,
          customFields: customFieldsPayload,
        }),
      }))
    }

    if (noteContent.trim()) {
      saves.push(fetch(`/api/databases/${databaseId}/players/${player.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent.trim() }),
      }))
    }

    const hadNote = !!noteContent.trim()
    const results = await Promise.all(saves)
    setSaving(false)

    const failed = results.find(r => !r.ok)
    if (!failed) {
      setChangedFields(new Set())
      setNoteAdding(false)
      setNoteContent('')
      // Only refresh the server component when a note was added (needs to appear in the list).
      // Field edits are already reflected in local form state — no second roundtrip needed.
      if (hadNote) router.refresh()
    } else {
      setSaveError('Failed to save')
    }
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  const POSITION_ALIASES: Record<string, string> = {
    DC: 'Centre-Back', CB: 'Centre-Back',
    RB: 'Right-Back', LB: 'Left-Back',
    RWB: 'Right Wing-Back', LWB: 'Left Wing-Back',
  }
  const displayPosition = (pos: string | null) =>
    pos ? (POSITION_ALIASES[pos.toUpperCase()] ?? pos) : null

  // Format a YYYY-MM-DD string for display
  const fmtDate = (s: string | null | undefined): string | null =>
    s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null

  const dobDate = player.dateOfBirth ? new Date(player.dateOfBirth) : null
  const age = dobDate && !isNaN(dobDate.getTime())
    ? ((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)
    : null

  const dateAdded = new Date(player.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // Source chips: form values take priority (optimistic), then saved custom fields, then FieldSource URLs
  const tmUrl = form.transfermarktUrl || cf('transfermarktUrl') || player.fieldSources.find(s => s.sourceName === 'Transfermarkt' && s.isActive)?.sourceUrl || ''
  const scUrl = form.sofascoreUrl     || cf('sofascoreUrl')     || player.fieldSources.find(s => s.sourceName === 'Sofascore'     && s.isActive)?.sourceUrl || ''
  const fmUrl = form.fmInsideUrl      || cf('fmInsideUrl')      || ''

  const sourceChips: { name: string; url: string }[] = [
    tmUrl ? { name: 'Transfermarkt', url: tmUrl } : null,
    scUrl ? { name: 'Sofascore',     url: scUrl } : null,
    fmUrl ? { name: 'FMInside',      url: fmUrl } : null,
  ].filter(Boolean) as { name: string; url: string }[]

  function isManual(fieldName: string) {
    return player.fieldSources.some(s => s.fieldName === fieldName && s.isActive && s.sourceName === 'manual')
  }

  // Custom fields are always user-entered → show green if they have a value
  function cfGreen(name: string) {
    return !!(cf(name))
  }

  const fullName = [player.firstName, player.middleName, player.lastName].filter(Boolean).join(' ')

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--card-shadow)',
    }}>

      {/* ── Header ── */}
      <div className="flex items-start gap-4" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center text-lg font-bold text-black flex-shrink-0"
          style={photoEnabled && cf('photo') ? { border: '1px solid var(--border)' } : { background: 'linear-gradient(135deg, #00c896, #00a878)', boxShadow: '0 0 16px rgba(0,200,150,0.3)' }}
        >
          {photoEnabled && cf('photo')
            ? <img src={cf('photo')} alt={fullName} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            : <>{player.firstName[0]}{player.lastName[0]}</>
          }
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="leading-tight mb-1.5" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>{fullName}</h1>
          <div className="flex items-center flex-wrap" style={{ gap: '4px 6px' }}>
            {(form.position || player.position) && (() => { const pos = displayPosition(form.position || player.position); const s = positionPillStyle(pos); return s
                ? <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={s}>{pos}</span>
                : <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{pos}</span>
              })()}
            {(form.clubName || player.clubName) && <><span style={{ color: 'var(--text-faint)' }}>·</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{form.clubName || player.clubName}</span></>}
            {(form.league || cf('league')) && <><span style={{ color: 'var(--text-faint)' }}>·</span><span className="text-xs" style={{ color: '#00c896' }}>{form.league || cf('league')}</span></>}
            {(form.nationality || player.nationality) && <><span style={{ color: 'var(--text-faint)' }}>·</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{form.nationality || player.nationality}</span></>}
            {age && <><span style={{ color: 'var(--text-faint)' }}>·</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{age} yrs</span></>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {noteAdding && (
            <>
              {saveError && <span className="text-xs text-red-400">{saveError}</span>}
              <button
                onClick={() => { setNoteAdding(false); setNoteContent(''); setSaveError('') }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !noteContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,200,150,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                {saving ? 'Saving…' : 'Save Note'}
              </button>
            </>
          )}
          {actionButtons}
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div className="grid grid-cols-3">

        {/* Physical */}
        <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold mb-3" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Physical</p>
          <div>
            <Row label="Position"      display={displayPosition(form.position || player.position || '')}  manual={isManual('position')}    isEditing={false} inputValue={form.position}    onChange={v => setField('position', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Height"        display={form.heightCm ? `${form.heightCm} cm` : player.heightCm ? `${player.heightCm} cm` : null}   manual={isManual('heightCm')}    isEditing={false} inputValue={form.heightCm}    onChange={v => setField('heightCm', v)}  inputType="number" onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Age"           display={age ? `${age} yrs` : null} isEditing={false} inputValue={form.dateOfBirth} onChange={v => setField('dateOfBirth', v)} inputType="date" onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Date of Birth" display={fmtDate(form.dateOfBirth)} manual={isManual('dateOfBirth')} isEditing={false} inputValue={form.dateOfBirth} onChange={v => setField('dateOfBirth', v)} inputType="date" onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Foot"          display={form.foot || null}       manual={cfGreen('foot')}       isEditing={false} inputValue={form.foot}          onChange={v => setField('foot', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Nationality"   display={form.nationality || player.nationality || null}       manual={isManual('nationality')} isEditing={false} inputValue={form.nationality}  onChange={v => setField('nationality', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Passports"     display={form.passports || null}  manual={cfGreen('passports')}  isEditing={false} inputValue={form.passports}     onChange={v => setField('passports', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Player Phone"  display={form.playerPhone || null} manual={cfGreen('playerPhone')} isEditing={false} inputValue={form.playerPhone}  onChange={v => setField('playerPhone', v)} onQuickSave={canWrite ? handleSave : undefined} />
          </div>
        </div>

        {/* Contract & Value */}
        <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold mb-3" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Contract & Value</p>
          <div>
            <Row label="Club"            display={form.clubName || player.clubName || null}         manual={isManual('clubName')}    isEditing={false} inputValue={form.clubName}       onChange={v => setField('clubName', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="League"          display={form.league || null}    manual={cfGreen('league')}       isEditing={false} inputValue={form.league}         onChange={v => setField('league', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Joining Date"    display={fmtDate(form.joiningDate)} manual={cfGreen('joiningDate')} isEditing={false} inputValue={form.joiningDate}  onChange={v => setField('joiningDate', v)} inputType="date" onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Contract Expiry" display={fmtDate(form.contractExpiry)} manual={cfGreen('contractExpiry')} isEditing={false} inputValue={form.contractExpiry} onChange={v => setField('contractExpiry', v)} inputType="date" onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Market Value"    display={form.marketValue ? `€${parseFloat(form.marketValue).toFixed(2)}m` : player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(2)}m` : null} highlight manual={isManual('marketValue')} isEditing={false} inputValue={form.marketValue} onChange={v => setField('marketValue', v)} inputType="number" onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="FM Wages"        display={form.fmWages || null}   manual={cfGreen('fmWages')}      isEditing={false} inputValue={form.fmWages}        onChange={v => setField('fmWages', v)} inputType="number" onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Fee Expectation" display={form.transferFeeExpect || null} manual={cfGreen('transferFeeExpect')} isEditing={false} inputValue={form.transferFeeExpect} onChange={v => setField('transferFeeExpect', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Fee (Real)"      display={form.transferFeeReal || null}   manual={cfGreen('transferFeeReal')}   isEditing={false} inputValue={form.transferFeeReal}    onChange={v => setField('transferFeeReal', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Salary Expectation" display={form.salaryExpect || null}   manual={cfGreen('salaryExpect')}      isEditing={false} inputValue={form.salaryExpect}       onChange={v => setField('salaryExpect', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Salary (Real)"   display={form.salaryReal || null}        manual={cfGreen('salaryReal')}        isEditing={false} inputValue={form.salaryReal}         onChange={v => setField('salaryReal', v)} onQuickSave={canWrite ? handleSave : undefined} />
          </div>
        </div>

        {/* Scout Info */}
        <div className="p-4">
          <p className="text-[9px] uppercase font-bold mb-3" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Scout Info</p>
          <div>
            <Row label="Availability"    display={(form.available as boolean) ? 'Available' : 'Not Avail.'} isEditing={false} inputValue="" onChange={() => {}} isBool boolValue={form.available as boolean} onBoolChange={canWrite ? saveAvailability : undefined} highlight={form.available as boolean} />
            <Row label="Added"           display={dateAdded}  isEditing={false} inputValue="" onChange={() => {}} />
            <Row label="Sent by / Scout" display={addedByName} isEditing={false} inputValue="" onChange={() => {}} />
            <Row label="Referral"        display={form.sentBy || null}           manual={cfGreen('sentBy')}      isEditing={false} inputValue={form.sentBy}      onChange={v => setField('sentBy', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Agent"           display={form.agentName || player.agentName || null}   manual={isManual('agentName')}   isEditing={false} inputValue={form.agentName}   onChange={v => setField('agentName', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Agent Phone"     display={form.agentPhone || null}       manual={cfGreen('agentPhone')}   isEditing={false} inputValue={form.agentPhone}  onChange={v => setField('agentPhone', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <Row label="Plays National"  display={(form.playsNational as boolean) ? 'Yes' : 'No'} manual={isManual('playsNational')} isEditing={false} inputValue={form.playsNational ? 'Yes' : 'No'} onChange={() => {}} isBool neutralFalse boolValue={form.playsNational as boolean} onBoolChange={v => setField('playsNational', v)} />
            <Row label="Recent Form"     display={form.recentForm || null}       manual={cfGreen('recentForm')}   isEditing={false} inputValue={form.recentForm}  onChange={v => setField('recentForm', v)} onQuickSave={canWrite ? handleSave : undefined} />
            <LinkChips canEdit={canWrite} links={[
              { label: 'Transfermarkt', value: form.transfermarktUrl || tmUrl,           onChange: v => setField('transfermarktUrl', v), onBlur: canWrite ? handleSave : undefined },
              { label: 'Sofascore',     value: form.sofascoreUrl     || scUrl,           onChange: v => setField('sofascoreUrl', v),     onBlur: canWrite ? handleSave : undefined },
              { label: 'FMInside',      value: form.fmInsideUrl      || fmUrl,           onChange: v => setField('fmInsideUrl', v),      onBlur: canWrite ? handleSave : undefined },
              { label: 'Instagram',     value: form.instagram        || cf('instagram'), onChange: v => setField('instagram', v),        onBlur: canWrite ? handleSave : undefined },
              { label: 'Twitter / X',   value: form.twitter          || cf('twitter'),   onChange: v => setField('twitter', v),          onBlur: canWrite ? handleSave : undefined },
              { label: 'TikTok',        value: form.tiktok           || cf('tiktok'),    onChange: v => setField('tiktok', v),           onBlur: canWrite ? handleSave : undefined },
              { label: 'Highlights',    value: form.highlights       || cf('highlights'),onChange: v => setField('highlights', v),       onBlur: canWrite ? handleSave : undefined },
            ]} />
            <DescRow label="Description"   display={form.description || null} manual={cfGreen('description')} isEditing={false} inputValue={form.description} onChange={v => setField('description', v)} onQuickSave={canWrite ? handleSave : undefined} />
          </div>
        </div>
      </div>

      {/* ── Bottom section — 3 columns matching search result card ── */}
      <div className="grid grid-cols-3" style={{ background: 'var(--subtle-bg)', borderTop: '1px solid var(--border)' }}>

        {/* Col 1: Heat Map */}
        <div className="p-4 flex flex-col gap-2" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Heat Map</p>
          <div className="flex flex-col items-center justify-center gap-2 flex-1 rounded-lg" style={{ minHeight: 80, border: '1px dashed var(--border)' }}>
            <span style={{ fontSize: 28, opacity: 0.25 }}>🗺️</span>
            <span className="text-[10px] text-center" style={{ color: 'var(--text-faint)' }}>Position heat map coming soon</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(139,92,246,0.08)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.2)' }}>Coming Soon</span>
          </div>
        </div>

        {/* Col 2: Season Stats */}
        <div className="p-4 flex flex-col gap-2" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Season Stats</p>
          {canWrite ? (
            <SeasonStatsEditor
              json={form.seasonStats || '{"seasons":[]}'}
              onChange={v => setField('seasonStats', v)}
              onCellBlur={handleSave}
            />
          ) : (
            <SeasonStatsGrid json={form.seasonStats || '{"seasons":[]}'} />
          )}
        </div>

        {/* Col 3: FM Attributes */}
        <div className="p-4 flex flex-col gap-2">
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: localActiveFm ? 'rgba(0,200,150,0.8)' : 'var(--text-muted)' }}>FM Attributes</p>
          {localActiveFm ? (
            <FMAttributesEditor
              value={form.fmAttributes ?? ''}
              onChange={v => setField('fmAttributes', v)}
              onBlur={() => { setLocalActiveFm(false); if (canWrite) handleSave() }}
              autoFocus
            />
          ) : (
            <div
              className={`group relative${canWrite ? ' cursor-text' : ''}`}
              onClick={() => { if (canWrite) setLocalActiveFm(true) }}
            >
              <FMRadarChart fmAttributes={form.fmAttributes || ''} />
              {canWrite && form.fmAttributes && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#00c896"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Scout Notes ── */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div className="px-4 py-2" style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Scout Notes</p>
        </div>
        <div className="p-5">
          <NotesSection
          notes={player.notes}
          currentUserId={currentUserId}
          databaseId={databaseId}
          playerId={player.id}
          canWrite={canWrite}
          adding={noteAdding}
          noteContent={noteContent}
          onStartAdding={() => setNoteAdding(true)}
          onCancelAdding={() => { setNoteAdding(false); setNoteContent('') }}
          onNoteContentChange={setNoteContent}
        />
        </div>
      </div>
    </div>
  )
}

// ── Row: static display ↔ inline input ────────────────────────────────────────

function Row({ label, display, manual = false, highlight = false, isEditing, inputValue, onChange, inputType = 'text', isBool = false, boolValue, onBoolChange, onQuickSave, neutralFalse = false }: {
  label: string; display: string | null | undefined; manual?: boolean; highlight?: boolean
  isEditing: boolean; inputValue: string; onChange: (v: string) => void; inputType?: string
  isBool?: boolean; boolValue?: boolean; onBoolChange?: (v: boolean) => void; neutralFalse?: boolean
  onQuickSave?: () => void
}) {
  const hasValue = display != null && display !== ''
  const isGreen  = highlight || manual
  const [localActive, setLocalActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (localActive && inputRef.current) inputRef.current.focus()
  }, [localActive])

  const showInput = isEditing || localActive

  if (showInput) {
    if (isBool) {
      return (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={boolValue ?? false} onChange={e => onBoolChange?.(e.target.checked)} className="w-3.5 h-3.5 accent-[#00c896]" />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{boolValue ? 'Yes' : 'No'}</span>
          </label>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <input
          ref={inputRef}
          type={inputType}
          value={inputValue}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          className="text-[11px] font-medium text-right focus:outline-none rounded px-2 py-1 transition-all"
          style={{ width: inputType === 'date' ? 120 : 100, color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
          onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'
            if (localActive) { setLocalActive(false); onQuickSave?.() }
          }}
        />
      </div>
    )
  }

  if (isBool) {
    return (
      <div className="field-row flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <button
          type="button"
          onClick={onBoolChange ? () => onBoolChange(!boolValue) : undefined}
          disabled={!onBoolChange}
          className="text-[11px] font-medium px-1.5 py-0.5 rounded tracking-wider uppercase transition-all"
          style={{
            background: boolValue ? 'rgba(0,200,150,0.12)' : neutralFalse ? 'var(--hover-bg)' : 'rgba(239,68,68,0.1)',
            color: boolValue ? '#00c896' : neutralFalse ? 'var(--text-muted)' : '#ef4444',
            border: `1px solid ${boolValue ? 'rgba(0,200,150,0.3)' : neutralFalse ? 'var(--border)' : 'rgba(239,68,68,0.25)'}`,
            cursor: onBoolChange ? 'pointer' : 'default',
          }}
        >
          {display ?? (boolValue ? 'Available' : 'Not Avail.')}
        </button>
      </div>
    )
  }

  const canInline = !!onQuickSave && !isBool
  return (
    <div
      className={`field-row flex items-center justify-between gap-2${canInline ? ' group' : ''}`}
      onClick={canInline ? () => setLocalActive(true) : undefined}
      style={{ borderBottom: '1px solid var(--border)', padding: '4px 0', cursor: canInline ? 'text' : 'default' }}
    >
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-1">
        {manual && hasValue && <span title="Manually edited" style={{ color: '#00c896', fontSize: 9 }}>✎</span>}
        <span className="text-[11px] font-medium text-right" style={{ color: hasValue ? (isGreen ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>{display ?? '—'}</span>
        {canInline && (
          <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity flex-shrink-0" viewBox="0 0 24 24" fill="#00c896">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        )}
      </div>
    </div>
  )
}

// ── Link row: always visible input, label becomes clickable when valid ─────────

function LinkRow({ label, display, isEditing, inputValue, onChange, onQuickSave }: {
  label: string; display: string | null | undefined; isEditing: boolean; inputValue: string; onChange: (v: string) => void
  onQuickSave?: () => void
}) {
  const [localActive, setLocalActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (localActive && inputRef.current) inputRef.current.focus()
  }, [localActive])

  const showInput = isEditing || localActive
  const url = (showInput ? inputValue : display) ?? ''
  const isValid = url.startsWith('http')

  if (showInput) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <input
          ref={inputRef}
          type="text" value={inputValue} onChange={e => onChange(e.target.value)} placeholder="https://…"
          className="text-[11px] text-right focus:outline-none rounded px-2 py-1 transition-all flex-1 min-w-0 ml-2"
          style={{ color: isValid ? '#00c896' : 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
          onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'
            if (localActive) { setLocalActive(false); onQuickSave?.() }
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`field-row flex items-center justify-between gap-2 group${onQuickSave ? ' cursor-text' : ''}`}
      onClick={() => { if (onQuickSave) setLocalActive(true) }}
      style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}
    >
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {isValid ? (
        <a
          href={url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-[11px] font-medium flex items-center gap-0.5 hover:underline"
          style={{ color: '#00c896' }}
        >
          {label} ↗
        </a>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>—</span>
          {onQuickSave && (
            <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity flex-shrink-0" viewBox="0 0 24 24" fill="#00c896">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          )}
        </div>
      )}
    </div>
  )
}

// ── Description row: multi-line textarea when editing ──────────────────────────

function DescRow({ label, display, manual = false, isEditing, inputValue, onChange, onQuickSave }: {
  label: string; display: string | null | undefined; manual?: boolean
  isEditing: boolean; inputValue: string; onChange: (v: string) => void
  onQuickSave?: () => void
}) {
  const hasValue = display != null && display !== ''
  const [localActive, setLocalActive] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (localActive && textareaRef.current) textareaRef.current.focus()
  }, [localActive])

  const showInput = isEditing || localActive

  if (showInput) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <textarea
          ref={textareaRef}
          value={inputValue} onChange={e => onChange(e.target.value)} placeholder="—"
          rows={3}
          className="text-[11px] focus:outline-none rounded px-2 py-1 resize-none transition-all"
          style={{ color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
          onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'
            if (localActive) { setLocalActive(false); onQuickSave?.() }
          }}
        />
      </div>
    )
  }

  const canInline = !!onQuickSave
  return (
    <div
      className={`${canInline ? 'group cursor-text' : ''}`}
      onClick={canInline ? () => setLocalActive(true) : undefined}
      style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-1 mb-1.5">
        {manual && hasValue && <span title="Manually edited" style={{ color: '#00c896', fontSize: 9 }}>✎</span>}
        <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--text-faint)', letterSpacing: '0.7px' }}>{label}</p>
        {canInline && (
          <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity" viewBox="0 0 24 24" fill="#00c896">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        )}
      </div>
      <div className="text-[11px] whitespace-pre-wrap" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 9px', minHeight: 64, lineHeight: 1.55, color: hasValue ? 'var(--text-secondary)' : 'var(--text-faint)', fontStyle: hasValue ? 'normal' : 'italic' }}>
        {display ?? 'No description yet. Click to add…'}
      </div>
    </div>
  )
}

