'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NotesSection from './NotesSection'

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
  weightKg: number | null
  clubName: string | null
  marketValue: number | null
  agentName: string | null
  playsNational: boolean
  goalsThisYear: number | null
  totalGoals: number | null
  totalGames: number | null
  nationalGames: number | null
  yearsInProClub: number | null
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

const seasons = ['25/26', '24/25', '23/24', '22/23']
const statCols = ['club', 'mp', 'ms', 'goals', 'assists'] as const
type StatCol = typeof statCols[number]
type SeasonRow = Record<StatCol, string>
type SeasonStats = Record<string, SeasonRow>
const emptyRow = (): SeasonRow => ({ club: '', mp: '', ms: '', goals: '', assists: '' })

const toDateStr = (d: Date | null) => d ? new Date(d).toISOString().split('T')[0] : ''

export default function PlayerProfileCard({ player, addedByName, currentUserId, databaseId, canWrite, actionButtons }: Props) {
  const router = useRouter()

  // Helper to get custom field value
  const cf = (name: string) => player.customFields.find(f => f.fieldName === name)?.value ?? ''

  const parseSeasonStats = (): SeasonStats => {
    const raw = cf('seasonStats')
    if (!raw) return {}
    try { return JSON.parse(raw) } catch { return {} }
  }

  // ── Edit state ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing]   = useState(false)
  const [saving,    setSaving]      = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  const [seasonStatsForm, setSeasonStatsForm] = useState<SeasonStats>(parseSeasonStats)

  const initialForm = () => ({
    // DB fields
    position:      player.position       ?? '',
    heightCm:      player.heightCm?.toString()  ?? '',
    weightKg:      player.weightKg?.toString()  ?? '',
    dateOfBirth:   toDateStr(player.dateOfBirth),
    nationality:   player.nationality    ?? '',
    clubName:      player.clubName       ?? '',
    marketValue:   player.marketValue != null ? (player.marketValue / 1_000_000).toString() : '',
    agentName:     player.agentName      ?? '',
    playsNational: player.playsNational,
    goalsThisYear: player.goalsThisYear?.toString()  ?? '',
    totalGoals:    player.totalGoals?.toString()     ?? '',
    totalGames:    player.totalGames?.toString()     ?? '',
    nationalGames: player.nationalGames?.toString()  ?? '',
    yearsInProClub:player.yearsInProClub?.toString() ?? '',
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
    instagram:         cf('instagram'),
    highlights:        cf('highlights'),
    keyStrengths:      cf('keyStrengths'),
    areasForImprovement: cf('areasForImprovement'),
  })

  const [form, setForm] = useState(initialForm)

  function setField(name: string, value: string | boolean) {
    setForm(f => ({ ...f, [name]: value }))
    setChangedFields(prev => new Set([...prev, name]))
  }

  function handleEdit() {
    setForm(initialForm())
    setSeasonStatsForm(parseSeasonStats())
    setChangedFields(new Set())
    setSaveError('')
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setChangedFields(new Set())
    setSaveError('')
    setSeasonStatsForm(parseSeasonStats())
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')

    // Split changed fields into DB fields and custom fields
    const dbFields = new Set(['position','heightCm','weightKg','dateOfBirth','nationality','clubName','marketValue','agentName','playsNational','goalsThisYear','totalGoals','totalGames','nationalGames','yearsInProClub'])
    const customFieldKeys = ['foot','passports','league','joiningDate','contractExpiry','fmWages','transferFeeExpect','transferFeeReal','salaryExpect','salaryReal','recentForm','transfermarktUrl','sofascoreUrl','instagram','highlights','keyStrengths','areasForImprovement']

    const changedDbFields = [...changedFields].filter(f => dbFields.has(f))
    const changedCustomFields = [...changedFields].filter(f => customFieldKeys.includes(f))

    // Build custom fields payload (all custom field values, not just changed ones)
    const customFieldsPayload: Record<string, string> = {}
    for (const key of customFieldKeys) {
      if (changedCustomFields.includes(key)) {
        customFieldsPayload[key] = String((form as any)[key] ?? '')
      }
    }

    if (changedFields.has('seasonStats')) {
      customFieldsPayload['seasonStats'] = JSON.stringify(seasonStatsForm)
    }

    const res = await fetch(`/api/databases/${databaseId}/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        changedFields: changedDbFields,
        customFields: customFieldsPayload,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setIsEditing(false)
      setChangedFields(new Set())
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setSaveError(d.error || 'Failed to save')
    }
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  const age = player.dateOfBirth
    ? ((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)
    : null

  const dateAdded = new Date(player.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // Source chips: custom field URLs take priority over FieldSource URLs
  const tmUrl = cf('transfermarktUrl') || player.fieldSources.find(s => s.sourceName === 'Transfermarkt' && s.isActive)?.sourceUrl || ''
  const scUrl = cf('sofascoreUrl')     || player.fieldSources.find(s => s.sourceName === 'Sofascore'     && s.isActive)?.sourceUrl || ''

  const sourceChips: { name: string; url: string }[] = [
    tmUrl ? { name: 'Transfermarkt', url: tmUrl } : null,
    scUrl ? { name: 'Sofascore',     url: scUrl } : null,
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
      border: isEditing ? '1px solid rgba(0,200,150,0.4)' : '1px solid var(--border)',
      boxShadow: isEditing ? '0 0 0 3px rgba(0,200,150,0.08), var(--card-shadow)' : 'var(--card-shadow)',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-4 p-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-black flex-shrink-0" style={{
          background: 'linear-gradient(135deg, #00c896, #00a878)',
          boxShadow: '0 0 16px rgba(0,200,150,0.3)',
        }}>
          {player.firstName[0]}{player.lastName[0]}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>{fullName}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {player.position && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>{player.position}</span>}
            {player.clubName    && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{player.clubName}</span>}
            {player.nationality && <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{player.nationality}</span>}
            {age                && <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{age} yrs</span>}
          </div>
        </div>

        {!isEditing && sourceChips.length > 0 && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            {sourceChips.map(s => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors hover:opacity-80"
                style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896bb', border: '1px solid rgba(0,200,150,0.2)' }}
              >{s.name} ↗</a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              {saveError && <span className="text-xs text-red-400">{saveError}</span>}
              <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || changedFields.size === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              {canWrite && (
                <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  Edit Player
                </button>
              )}
              {actionButtons}
            </>
          )}
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div className="grid grid-cols-3">

        {/* Physical */}
        <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Physical</p>
          <div className="space-y-2.5">
            <Row label="Position"      display={player.position}  manual={isManual('position')}    isEditing={isEditing} inputValue={form.position}    onChange={v => setField('position', v)} />
            <Row label="Height"        display={player.heightCm ? `${player.heightCm} cm` : null}   manual={isManual('heightCm')}    isEditing={isEditing} inputValue={form.heightCm}    onChange={v => setField('heightCm', v)}  inputType="number" />
            <Row label="Weight"        display={player.weightKg ? `${player.weightKg} kg` : null}   manual={isManual('weightKg')}    isEditing={isEditing} inputValue={form.weightKg}    onChange={v => setField('weightKg', v)}  inputType="number" />
            <Row label="Age"           display={age ? `${age} yrs` : null} isEditing={false} inputValue="" onChange={() => {}} />
            <Row label="Date of Birth" display={player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} manual={isManual('dateOfBirth')} isEditing={isEditing} inputValue={form.dateOfBirth} onChange={v => setField('dateOfBirth', v)} inputType="date" />
            <Row label="Foot"          display={cf('foot') || null}       manual={cfGreen('foot')}       isEditing={isEditing} inputValue={form.foot}          onChange={v => setField('foot', v)} />
            <Row label="Nationality"   display={player.nationality}       manual={isManual('nationality')} isEditing={isEditing} inputValue={form.nationality}  onChange={v => setField('nationality', v)} />
            <Row label="Passports"     display={cf('passports') || null}  manual={cfGreen('passports')}  isEditing={isEditing} inputValue={form.passports}     onChange={v => setField('passports', v)} />
          </div>
        </div>

        {/* Contract & Value */}
        <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Contract & Value</p>
          <div className="space-y-2.5">
            <Row label="Club"            display={player.clubName}         manual={isManual('clubName')}    isEditing={isEditing} inputValue={form.clubName}       onChange={v => setField('clubName', v)} />
            <Row label="League"          display={cf('league') || null}    manual={cfGreen('league')}       isEditing={isEditing} inputValue={form.league}         onChange={v => setField('league', v)} />
            <Row label="Joining Date"    display={cf('joiningDate') || null} manual={cfGreen('joiningDate')} isEditing={isEditing} inputValue={form.joiningDate}  onChange={v => setField('joiningDate', v)} inputType="date" />
            <Row label="Contract Expiry" display={cf('contractExpiry') || null} manual={cfGreen('contractExpiry')} isEditing={isEditing} inputValue={form.contractExpiry} onChange={v => setField('contractExpiry', v)} inputType="date" />
            <Row label="Market Value"    display={player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(2)}m` : null} highlight manual={isManual('marketValue')} isEditing={isEditing} inputValue={form.marketValue} onChange={v => setField('marketValue', v)} inputType="number" />
            <Row label="FM Wages"        display={cf('fmWages') || null}   manual={cfGreen('fmWages')}      isEditing={isEditing} inputValue={form.fmWages}        onChange={v => setField('fmWages', v)} inputType="number" />
            <Row label="Fee Expectation" display={cf('transferFeeExpect') || null} manual={cfGreen('transferFeeExpect')} isEditing={isEditing} inputValue={form.transferFeeExpect} onChange={v => setField('transferFeeExpect', v)} />
            <Row label="Fee (Real)"      display={cf('transferFeeReal') || null}   manual={cfGreen('transferFeeReal')}   isEditing={isEditing} inputValue={form.transferFeeReal}    onChange={v => setField('transferFeeReal', v)} />
            <Row label="Salary Expectation" display={cf('salaryExpect') || null}   manual={cfGreen('salaryExpect')}      isEditing={isEditing} inputValue={form.salaryExpect}       onChange={v => setField('salaryExpect', v)} />
            <Row label="Salary (Real)"   display={cf('salaryReal') || null}        manual={cfGreen('salaryReal')}        isEditing={isEditing} inputValue={form.salaryReal}         onChange={v => setField('salaryReal', v)} />
          </div>
        </div>

        {/* Scout Info */}
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Scout Info</p>
          <div className="space-y-2.5">
            <Row label="Added"           display={dateAdded}  isEditing={false} inputValue="" onChange={() => {}} />
            <Row label="Sent by / Scout" display={addedByName} isEditing={false} inputValue="" onChange={() => {}} />
            <Row label="Agent"           display={player.agentName}               manual={isManual('agentName')}   isEditing={isEditing} inputValue={form.agentName}   onChange={v => setField('agentName', v)} />
            <Row label="Plays National"  display={player.playsNational ? 'Yes' : 'No'} manual={isManual('playsNational')} isEditing={isEditing} inputValue={form.playsNational ? 'Yes' : 'No'} onChange={() => {}} isBool boolValue={form.playsNational as boolean} onBoolChange={v => setField('playsNational', v)} />
            <Row label="Recent Form"     display={cf('recentForm') || null}       manual={cfGreen('recentForm')}   isEditing={isEditing} inputValue={form.recentForm}  onChange={v => setField('recentForm', v)} />
            <LinkRow label="Transfermarkt" display={tmUrl}  isEditing={isEditing} inputValue={form.transfermarktUrl} onChange={v => setField('transfermarktUrl', v)} />
            <LinkRow label="Sofascore"     display={scUrl}  isEditing={isEditing} inputValue={form.sofascoreUrl}     onChange={v => setField('sofascoreUrl', v)} />
            <LinkRow label="Instagram"     display={cf('instagram')} isEditing={isEditing} inputValue={form.instagram}    onChange={v => setField('instagram', v)} />
            <Row label="Highlights"      display={cf('highlights') || null}       manual={cfGreen('highlights')}   isEditing={isEditing} inputValue={form.highlights}  onChange={v => setField('highlights', v)} />
          </div>
        </div>
      </div>

      {/* ── Heat Map ── */}
      <div className="flex items-center gap-4 px-4 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--subtle-bg)' }}>
        <p className="text-[10px] uppercase tracking-widest font-medium flex-shrink-0 w-20" style={{ color: 'var(--text-muted)' }}>Heat Map</p>
        <div className="flex-1 h-14 rounded-lg flex items-center justify-center" style={{ background: 'var(--subtle-bg)', border: '1px dashed var(--border)' }}>
          <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Sofascore · coming soon</span>
        </div>
      </div>

      {/* ── Attributes ── */}
      <div className="flex items-start gap-6 px-4 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--subtle-bg)' }}>
        <p className="text-[10px] uppercase tracking-widest font-medium flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>Attributes</p>
        <div className="flex gap-8 flex-1">
          {isEditing ? (
            <>
              <div className="flex-1">
                <p className="text-[10px] mb-1" style={{ color: 'var(--text-faint)' }}>Key Strengths</p>
                <textarea value={form.keyStrengths} onChange={e => setField('keyStrengths', e.target.value)} placeholder="e.g. Pace, Dribbling…" rows={2}
                  className="w-full text-[11px] px-2 py-1.5 rounded-lg resize-none focus:outline-none"
                  style={{ color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] mb-1" style={{ color: 'var(--text-faint)' }}>Areas for Improvement</p>
                <textarea value={form.areasForImprovement} onChange={e => setField('areasForImprovement', e.target.value)} placeholder="e.g. Aerial duels…" rows={2}
                  className="w-full text-[11px] px-2 py-1.5 rounded-lg resize-none focus:outline-none"
                  style={{ color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }} />
              </div>
            </>
          ) : (
            <div className="flex gap-8 flex-1">
              <InlineAttr label="Key Strengths"         value={cf('keyStrengths') || null}         green={cfGreen('keyStrengths')} />
              <InlineAttr label="Areas for Improvement" value={cf('areasForImprovement') || null}  green={cfGreen('areasForImprovement')} />
            </div>
          )}
        </div>
      </div>

      {/* ── Season Stats ── */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div className="px-4 py-2" style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>Season Stats</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--subtle-bg)' }}>
                {['Season', 'Club', 'MP', 'MS', 'Goals', 'Assists'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isEditing ? seasons.map(s => {
                const row = seasonStatsForm[s] ?? emptyRow()
                return (
                  <tr key={s} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s}</td>
                    {statCols.map(col => (
                      <td key={col} className="px-2 py-1.5">
                        <input
                          type={col === 'club' ? 'text' : 'number'}
                          value={row[col]}
                          onChange={e => {
                            setSeasonStatsForm(prev => ({
                              ...prev,
                              [s]: { ...(prev[s] ?? emptyRow()), [col]: e.target.value },
                            }))
                            setChangedFields(prev => new Set([...prev, 'seasonStats']))
                          }}
                          placeholder="—"
                          className="w-full text-[11px] text-center focus:outline-none rounded px-1.5 py-1 transition-all"
                          style={{ color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896', minWidth: col === 'club' ? 90 : 50 }}
                          onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                          onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'}
                        />
                      </td>
                    ))}
                  </tr>
                )
              }) : seasons.map(s => {
                const row = parseSeasonStats()[s]
                return (
                  <tr key={s} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{s}</td>
                    {statCols.map(col => (
                      <td key={col} className="px-4 py-2.5 text-xs" style={{ color: row?.[col] ? '#00c896' : 'var(--text-faint)' }}>
                        {row?.[col] || '—'}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Scout Notes ── */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div className="px-4 py-2" style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>Scout Notes</p>
        </div>
        <div className="p-5">
          <NotesSection notes={player.notes} currentUserId={currentUserId} databaseId={databaseId} playerId={player.id} canWrite={canWrite} />
        </div>
      </div>
    </div>
  )
}

// ── Row: static display ↔ inline input ────────────────────────────────────────

function Row({ label, display, manual = false, highlight = false, isEditing, inputValue, onChange, inputType = 'text', isBool = false, boolValue, onBoolChange }: {
  label: string; display: string | null | undefined; manual?: boolean; highlight?: boolean
  isEditing: boolean; inputValue: string; onChange: (v: string) => void; inputType?: string
  isBool?: boolean; boolValue?: boolean; onBoolChange?: (v: boolean) => void
}) {
  const hasValue = display != null && display !== ''
  const isGreen  = highlight || manual

  if (isEditing) {
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
        <input type={inputType} value={inputValue} onChange={e => onChange(e.target.value)} placeholder="—"
          className="text-[11px] font-medium text-right focus:outline-none rounded px-2 py-1 transition-all"
          style={{ width: inputType === 'date' ? 120 : 100, color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
          onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-1">
        {manual && hasValue && <span title="Manually edited" style={{ color: '#00c896', fontSize: 9 }}>✎</span>}
        <span className="text-[11px] font-medium text-right" style={{ color: hasValue ? (isGreen ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>{display ?? '—'}</span>
      </div>
    </div>
  )
}

// ── Link row: always visible input, label becomes clickable when valid ─────────

function LinkRow({ label, display, isEditing, inputValue, onChange }: {
  label: string; display: string | null | undefined; isEditing: boolean; inputValue: string; onChange: (v: string) => void
}) {
  const url = (isEditing ? inputValue : display) ?? ''
  const isValid = url.startsWith('http')

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
        {isValid ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium flex items-center gap-0.5 hover:underline" style={{ color: '#00c896' }}>
            {label} ↗
          </a>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>—</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <input type="text" value={inputValue} onChange={e => onChange(e.target.value)} placeholder="https://…"
        className="text-[11px] text-right focus:outline-none rounded px-2 py-1 transition-all flex-1 min-w-0 ml-2"
        style={{ color: isValid ? '#00c896' : 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
        onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'} />
    </div>
  )
}

// ── Inline attribute display ───────────────────────────────────────────────────

function InlineAttr({ label, value, green }: { label: string; value: string | null | undefined; green?: boolean }) {
  const hasValue = value != null && value !== ''
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <span className="text-[11px] font-medium" style={{ color: hasValue ? (green ? '#00c896' : 'var(--text-secondary)') : 'var(--text-faint)' }}>{value ?? '—'}</span>
    </div>
  )
}
