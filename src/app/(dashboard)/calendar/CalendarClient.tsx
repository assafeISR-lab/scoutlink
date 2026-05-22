'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string
  title: string
  type: string
  notes: string | null
  startAt: string
  linkedPlayerId: string | null
}

interface PlayerNote {
  id: string
  content: string
  createdAt: string
  player: { id: string; firstName: string; lastName: string; databaseId: string }
}

type ViewMode = 'day' | 'week' | 'month' | 'year'

const EVENT_TYPES = [
  { value: 'task',     label: 'Task',     color: '#00c896', bg: 'rgba(0,200,150,0.10)' },
  { value: 'reminder', label: 'Reminder', color: '#ff9f43', bg: 'rgba(255,159,67,0.10)' },
  { value: 'meeting',  label: 'Meeting',  color: '#6c8fff', bg: 'rgba(108,143,255,0.10)' },
  { value: 'call',     label: 'Call',     color: '#a29bfe', bg: 'rgba(162,155,254,0.10)' },
  { value: 'deadline', label: 'Deadline', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
]

function getEventType(type: string) {
  return EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[1]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarClient() {
  const [view, setView] = useState<ViewMode>('month')
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [notes, setNotes] = useState<PlayerNote[]>([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ events: CalendarEvent[]; notes: PlayerNote[] } | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    let from: Date, to: Date

    if (view === 'day') {
      from = new Date(current); from.setHours(0, 0, 0, 0)
      to = new Date(current); to.setHours(23, 59, 59, 999)
    } else if (view === 'week') {
      const day = current.getDay()
      from = new Date(current); from.setDate(current.getDate() - day); from.setHours(0, 0, 0, 0)
      to = new Date(from); to.setDate(from.getDate() + 6); to.setHours(23, 59, 59, 999)
    } else if (view === 'month') {
      from = new Date(current.getFullYear(), current.getMonth(), 1)
      to = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59)
    } else {
      from = new Date(current.getFullYear(), 0, 1)
      to = new Date(current.getFullYear(), 11, 31, 23, 59, 59)
    }

    const res = await fetch(`/api/calendar?from=${from.toISOString()}&to=${to.toISOString()}`)
    const data = await res.json()
    setEvents(data.events || [])
    setNotes(data.notes || [])
    setLoading(false)
  }, [view, current])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    const q = searchQuery.trim()
    if (!q) { setSearchResults(null); return }
    setSearchLoading(true)
    searchDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/calendar?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults({ events: data.events || [], notes: data.notes || [] })
      setSearchLoading(false)
    }, 300)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [searchQuery])

  function clearSearch() { setSearchQuery(''); setSearchResults(null) }

  function jumpToDate(date: Date) {
    clearSearch()
    setCurrent(date)
    setSelected(date)
    setView('month')
  }

  function navigate(dir: 1 | -1) {
    const d = new Date(current)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else if (view === 'month') d.setMonth(d.getMonth() + dir)
    else d.setFullYear(d.getFullYear() + dir)
    setCurrent(d)
  }

  function goToday() { const t = new Date(); setCurrent(t); setSelected(t) }

  function headerLabel() {
    if (view === 'day') return current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    if (view === 'week') {
      const day = current.getDay()
      const start = new Date(current); start.setDate(current.getDate() - day)
      const end = new Date(start); end.setDate(start.getDate() + 6)
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    if (view === 'month') return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`
    return `${current.getFullYear()}`
  }

  const selectedEvents = events.filter(e => isSameDay(new Date(e.startAt), selected))
  const selectedNotes = notes.filter(n => isSameDay(new Date(n.createdAt), selected))

  const dayMap = new Map<string, { events: CalendarEvent[]; notes: PlayerNote[] }>()
  events.forEach(e => {
    const k = toDateKey(new Date(e.startAt))
    if (!dayMap.has(k)) dayMap.set(k, { events: [], notes: [] })
    dayMap.get(k)!.events.push(e)
  })
  notes.forEach(n => {
    const k = toDateKey(new Date(n.createdAt))
    if (!dayMap.has(k)) dayMap.set(k, { events: [], notes: [] })
    dayMap.get(k)!.notes.push(n)
  })

  return (
    <div className="flex gap-6">
      {/* Main calendar area */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: 'var(--card-solid)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-secondary)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              Today
            </button>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              </button>
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{headerLabel()}</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div
              className="flex items-center rounded-xl overflow-hidden text-xs"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--card-solid)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {(['day', 'week', 'month', 'year'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 font-medium capitalize transition-all"
                  style={{
                    background: view === v ? '#00c896' : 'transparent',
                    color: view === v ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--text-faint)' }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events…"
                className="pl-8 pr-8 py-1.5 rounded-xl text-xs focus:outline-none w-44"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
              />
              {searchQuery && (
                <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#ffffff' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Add Event
            </button>
          </div>
        </div>

        {searchQuery.trim() ? (
          searchLoading ? (
            <div className="flex items-center justify-center py-16">
              <ScoutLinkBallLoader size={60} />
            </div>
          ) : (
            <SearchResultsPanel
              query={searchQuery}
              results={searchResults}
              onJump={jumpToDate}
              onDeleteEvent={fetchData}
            />
          )
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <ScoutLinkBallLoader size={80} />
          </div>
        ) : (
          <>
            {view === 'month' && <MonthView current={current} selected={selected} onSelect={setSelected} dayMap={dayMap} />}
            {view === 'week'  && <WeekView  current={current} selected={selected} onSelect={setSelected} dayMap={dayMap} />}
            {view === 'day'   && <DayView   date={current} events={events} notes={notes} onDeleteEvent={fetchData} />}
            {view === 'year'  && <YearView  current={current} onSelectMonth={(d) => { setCurrent(d); setView('month') }} dayMap={dayMap} />}
          </>
        )}
      </div>

      {/* Day detail sidebar — shown in month/week view, hidden during search */}
      {!searchQuery.trim() && (view === 'month' || view === 'week') && (
        <div className="w-80 flex-shrink-0">
          <DaySidebar
            date={selected}
            events={selectedEvents}
            notes={selectedNotes}
            onAdd={() => setShowAdd(true)}
            onDeleteEvent={fetchData}
          />
        </div>
      )}

      {showAdd && (
        <AddEventModal
          defaultDate={view === 'day' ? current : selected}
          onClose={() => setShowAdd(false)}
          onSave={() => { setShowAdd(false); fetchData() }}
        />
      )}
    </div>
  )
}

// ─── Search Results Panel ─────────────────────────────────────────────────────

function SearchResultsPanel({ query, results, onJump, onDeleteEvent }: {
  query: string
  results: { events: CalendarEvent[]; notes: PlayerNote[] } | null
  onJump: (d: Date) => void
  onDeleteEvent: () => void
}) {
  if (!results) return null
  const total = results.events.length + results.notes.length

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-strong)', background: 'rgba(0,200,150,0.025)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          {total === 0
            ? `No results for "${query}"`
            : `${total} result${total !== 1 ? 's' : ''} for "${query}"`}
        </p>
        {total > 0 && (
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-faint)' }}>
            {results.events.length > 0 && <span>{results.events.length} event{results.events.length !== 1 ? 's' : ''}</span>}
            {results.notes.length > 0  && <span>{results.notes.length} note{results.notes.length !== 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No events or notes match your search</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {results.events.map(e => {
            const et = getEventType(e.type)
            const d = new Date(e.startAt)
            return (
              <div
                key={e.id}
                className="flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors group"
                style={{ background: 'transparent' }}
                onClick={() => onJump(d)}
              >
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: et.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: et.color }}>{et.label}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                      {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                  {e.notes && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{e.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896' }}>
                    Go to date →
                  </span>
                  <EventDeleteButton eventId={e.id} onDelete={onDeleteEvent} />
                </div>
              </div>
            )
          })}
          {results.notes.map(n => {
            const d = new Date(n.createdAt)
            return (
              <Link
                key={n.id}
                href={`/databases/${n.player.databaseId}/players/${n.player.id}`}
                className="flex items-start gap-3 px-5 py-3.5 transition-colors group"
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#ffffff' }}>
                  {n.player.firstName[0]}{n.player.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {n.player.firstName} {n.player.lastName}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                      {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{n.content}</p>
                </div>
                <svg className="w-3.5 h-3.5 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-faint)' }}>
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EventDeleteButton({ eventId, onDelete }: { eventId: string; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false)
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setDeleting(true)
    const res = await fetch(`/api/calendar/events/${eventId}`, { method: 'DELETE' })
    if (res.ok) onDelete()
    else setDeleting(false)
  }
  return (
    <button onClick={handleDelete} disabled={deleting} style={{ color: 'var(--text-faint)' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ current, selected, onSelect, dayMap }: {
  current: Date; selected: Date
  onSelect: (d: Date) => void
  dayMap: Map<string, { events: CalendarEvent[]; notes: PlayerNote[] }>
}) {
  const today = new Date()
  const firstDay = new Date(current.getFullYear(), current.getMonth(), 1)
  const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0)
  const startOffset = firstDay.getDay()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(current.getFullYear(), current.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}>
      {/* Day headers */}
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-strong)', background: 'rgba(0,200,150,0.03)' }}>
        {DAYS.map(d => (
          <div key={d} className="py-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          const isLastRow = i >= cells.length - 7
          const cellBorder: React.CSSProperties = {
            borderBottom: isLastRow ? undefined : '1px solid var(--border)',
            borderRight: i % 7 !== 6 ? '1px solid var(--border)' : undefined,
          }

          if (!date) return (
            <div key={i} className="min-h-[100px]" style={{ ...cellBorder, background: 'rgba(0,0,0,0.015)' }} />
          )

          const key = toDateKey(date)
          const data = dayMap.get(key)
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selected)

          return (
            <div
              key={i}
              onClick={() => onSelect(date)}
              className="min-h-[100px] p-2 cursor-pointer transition-colors"
              style={{ ...cellBorder, background: isSelected ? 'rgba(0,200,150,0.06)' : undefined }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span
                  className="w-6 h-6 flex items-center justify-center rounded-full text-xs"
                  style={{
                    background: isToday ? '#00c896' : 'transparent',
                    color: isToday ? '#ffffff' : isSelected ? '#00c896' : 'var(--text-secondary)',
                    fontWeight: isToday || isSelected ? 700 : 500,
                    outline: isSelected && !isToday ? '2px solid rgba(0,200,150,0.35)' : undefined,
                    outlineOffset: '1px',
                  }}
                >
                  {date.getDate()}
                </span>
              </div>
              {data && (
                <div className="flex flex-col gap-0.5">
                  {data.events.slice(0, 2).map(e => {
                    const et = getEventType(e.type)
                    return (
                      <div key={e.id} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium truncate" style={{ background: et.bg, color: et.color, borderLeft: `2px solid ${et.color}` }}>
                        {e.title}
                      </div>
                    )
                  })}
                  {data.notes.slice(0, 1).map(n => (
                    <div key={n.id} className="text-[10px] px-1.5 py-0.5 rounded-md truncate" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', borderLeft: '2px solid var(--border-strong)' }}>
                      📝 {n.player.firstName} {n.player.lastName}
                    </div>
                  ))}
                  {(data.events.length + data.notes.length) > 3 && (
                    <div className="text-[10px] px-1 font-medium" style={{ color: 'var(--text-faint)' }}>
                      +{data.events.length + data.notes.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ current, selected, onSelect, dayMap }: {
  current: Date; selected: Date
  onSelect: (d: Date) => void
  dayMap: Map<string, { events: CalendarEvent[]; notes: PlayerNote[] }>
}) {
  const today = new Date()
  const startOfWeek = new Date(current)
  startOfWeek.setDate(current.getDate() - current.getDay())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}>
      {/* Day column headers */}
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-strong)', background: 'rgba(0,200,150,0.03)' }}>
        {days.map((date, i) => {
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selected)
          return (
            <div
              key={i}
              onClick={() => onSelect(date)}
              className="p-3 text-center cursor-pointer transition-colors"
              style={{
                borderRight: i < 6 ? '1px solid var(--border)' : undefined,
                background: isSelected ? 'rgba(0,200,150,0.06)' : undefined,
              }}
            >
              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{DAYS[date.getDay()]}</p>
              <div
                className="w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold"
                style={{
                  background: isToday ? '#00c896' : 'transparent',
                  color: isToday ? '#ffffff' : isSelected ? '#00c896' : 'var(--text-primary)',
                  outline: isSelected && !isToday ? '2px solid rgba(0,200,150,0.35)' : undefined,
                  outlineOffset: '1px',
                }}
              >
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      {/* Day columns */}
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const key = toDateKey(date)
          const data = dayMap.get(key)
          const isSelected = isSameDay(date, selected)
          return (
            <div
              key={i}
              onClick={() => onSelect(date)}
              className="p-2 min-h-[240px] cursor-pointer transition-colors"
              style={{
                borderRight: i < 6 ? '1px solid var(--border)' : undefined,
                background: isSelected ? 'rgba(0,200,150,0.03)' : undefined,
              }}
            >
              {data?.events.map(e => {
                const et = getEventType(e.type)
                return (
                  <div key={e.id} className="text-[10px] px-1.5 py-1 rounded-md mb-1 truncate font-medium" style={{ background: et.bg, color: et.color, borderLeft: `2px solid ${et.color}` }}>
                    {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {e.title}
                  </div>
                )
              })}
              {data?.notes.map(n => (
                <div key={n.id} className="text-[10px] px-1.5 py-1 rounded-md mb-1 truncate" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', borderLeft: '2px solid var(--border-strong)' }}>
                  📝 {n.player.firstName} {n.player.lastName[0]}.
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ date, events, notes, onDeleteEvent }: {
  date: Date; events: CalendarEvent[]; notes: PlayerNote[]
  onDeleteEvent: () => void
}) {
  const today = new Date()
  const isToday = isSameDay(date, today)
  const total = events.length + notes.length

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-strong)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {total === 0 ? 'Nothing scheduled' : `${total} item${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isToday && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896' }}>
            Today
          </span>
        )}
      </div>
      <div className="p-6">
        {total === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-faint)' }}>No events or notes for this day</p>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(e => <EventItem key={e.id} event={e} onDelete={onDeleteEvent} />)}
            {notes.map(n => <NoteItem key={n.id} note={n} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Day Sidebar ──────────────────────────────────────────────────────────────

function DaySidebar({ date, events, notes, onAdd, onDeleteEvent }: {
  date: Date; events: CalendarEvent[]; notes: PlayerNote[]
  onAdd: () => void; onDeleteEvent: () => void
}) {
  const today = new Date()
  const isToday = isSameDay(date, today)
  const total = events.length + notes.length

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}>
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {isToday && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896' }}>
              Today
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {total === 0 ? 'Nothing scheduled' : `${total} item${total !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="p-3 flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {total === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>Nothing here yet</p>
            <button
              onClick={onAdd}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: '#00c896', color: '#ffffff' }}
            >
              + Add Event
            </button>
          </div>
        ) : (
          <>
            {events.map(e => <EventItem key={e.id} event={e} onDelete={onDeleteEvent} compact />)}
            {notes.map(n => <NoteItem key={n.id} note={n} compact />)}
          </>
        )}
      </div>

      {total > 0 && (
        <div className="p-3" style={{ borderTop: '1px solid var(--border-strong)' }}>
          <button
            onClick={onAdd}
            className="w-full py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#ffffff' }}
          >
            + Add Event
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Year View ────────────────────────────────────────────────────────────────

function YearView({ current, onSelectMonth, dayMap }: {
  current: Date
  onSelectMonth: (d: Date) => void
  dayMap: Map<string, { events: CalendarEvent[]; notes: PlayerNote[] }>
}) {
  const today = new Date()
  return (
    <div className="grid grid-cols-4 gap-4">
      {MONTHS.map((month, mi) => {
        const firstDay = new Date(current.getFullYear(), mi, 1)
        const lastDay = new Date(current.getFullYear(), mi + 1, 0)
        const startOffset = firstDay.getDay()
        const isCurrentMonth = today.getFullYear() === current.getFullYear() && today.getMonth() === mi

        const cells: (number | null)[] = []
        for (let i = 0; i < startOffset; i++) cells.push(null)
        for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)

        return (
          <div
            key={mi}
            onClick={() => onSelectMonth(new Date(current.getFullYear(), mi, 1))}
            className="rounded-2xl p-3 cursor-pointer transition-all"
            style={{
              background: 'var(--card-solid)',
              border: `1px solid ${isCurrentMonth ? 'rgba(0,200,150,0.3)' : 'var(--border-strong)'}`,
              boxShadow: isCurrentMonth
                ? '0 0 0 1px rgba(0,200,150,0.15), 0 4px 12px rgba(0,0,0,0.06)'
                : '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: isCurrentMonth ? '#00c896' : 'var(--text-secondary)' }}>{month}</p>
            <div className="grid grid-cols-7 gap-px">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-[8px] text-center" style={{ color: 'var(--text-faint)' }}>{d}</div>
              ))}
              {cells.map((d, i) => {
                if (!d) return <div key={i} />
                const key = `${current.getFullYear()}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const hasData = dayMap.has(key)
                const isToday = today.getFullYear() === current.getFullYear() && today.getMonth() === mi && today.getDate() === d
                return (
                  <div key={i} className="relative flex items-center justify-center">
                    <span
                      className="text-[9px] w-4 h-4 flex items-center justify-center rounded-full"
                      style={{
                        background: isToday ? '#00c896' : 'transparent',
                        color: isToday ? '#ffffff' : 'var(--text-muted)',
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {d}
                    </span>
                    {hasData && !isToday && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#00c896' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Event Item ───────────────────────────────────────────────────────────────

function EventItem({ event, onDelete, compact }: { event: CalendarEvent; onDelete: () => void; compact?: boolean }) {
  const [deleting, setDeleting] = useState(false)
  const et = getEventType(event.type)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/calendar/events/${event.id}`, { method: 'DELETE' })
    if (res.ok) {
      onDelete()
    } else {
      setDeleting(false)
    }
  }

  const time = new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div
      className="group flex items-start gap-2.5 p-2.5 rounded-xl"
      style={{ background: et.bg, border: `1px solid ${et.color}25`, borderLeft: `3px solid ${et.color}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: et.color }}>{et.label}</div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{time}</div>
        </div>
        <p className={`font-semibold truncate ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: 'var(--text-primary)' }}>{event.title}</p>
        {event.notes && !compact && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{event.notes}</p>
        )}
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        style={{ color: 'var(--text-faint)' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
  )
}

// ─── Note Item ────────────────────────────────────────────────────────────────

function NoteItem({ note, compact }: { note: PlayerNote; compact?: boolean }) {
  return (
    <Link
      href={`/databases/${note.player.databaseId}/players/${note.player.id}`}
      className="flex items-start gap-2.5 p-2.5 rounded-xl transition-colors"
      style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-strong)' }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#ffffff' }}
      >
        {note.player.firstName[0]}{note.player.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
          {note.player.firstName} {note.player.lastName} · {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
        <p className={`${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`} style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
      </div>
      <svg className="w-3 h-3 flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-faint)' }}>
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>
    </Link>
  )
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────

function AddEventModal({ defaultDate, onClose, onSave }: {
  defaultDate: Date; onClose: () => void; onSave: () => void
}) {
  const toLocalDateTimeStr = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [form, setForm] = useState({
    title: '',
    type: 'task',
    startAt: toLocalDateTimeStr(defaultDate),
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    setLoading(true)
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, startAt: new Date(form.startAt).toISOString() }),
    })
    if (res.ok) { onSave() }
    else { const d = await res.json(); setError(d.error || 'Error'); setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'var(--card-solid)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Add Event</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Title *</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Meeting with agent"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {EVENT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => set('type', t.value)}
                  className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: form.type === t.value ? t.bg : 'var(--hover-bg)',
                    color: form.type === t.value ? t.color : 'var(--text-muted)',
                    border: `1px solid ${form.type === t.value ? t.color + '40' : 'var(--border-strong)'}`,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date & Time</label>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={e => set('startAt', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ ...inputStyle, colorScheme: 'light' }}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
          </div>

          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

          <div className="flex gap-3 mt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !form.title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#ffffff' }}
            >
              {loading ? 'Saving...' : 'Add Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
