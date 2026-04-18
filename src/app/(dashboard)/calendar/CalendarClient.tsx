'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

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
  { value: 'task', label: 'Task', color: '#00c896', bg: 'rgba(0,200,150,0.12)' },
  { value: 'reminder', label: 'Reminder', color: '#ff9f43', bg: 'rgba(255,159,67,0.12)' },
  { value: 'meeting', label: 'Meeting', color: '#6c8fff', bg: 'rgba(108,143,255,0.12)' },
  { value: 'call', label: 'Call', color: '#a29bfe', bg: 'rgba(162,155,254,0.12)' },
  { value: 'deadline', label: 'Deadline', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
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

  // Events/notes for selected day
  const selectedEvents = events.filter(e => isSameDay(new Date(e.startAt), selected))
  const selectedNotes = notes.filter(n => isSameDay(new Date(n.createdAt), selected))

  // Build day map for quick lookup
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-white/50" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
              Today
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors" style={{ background: 'var(--hover-bg)' }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors" style={{ background: 'var(--hover-bg)' }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              </button>
            </div>
            <h2 className="text-lg font-bold text-white">{headerLabel()}</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex items-center rounded-xl overflow-hidden border border-white/8 text-xs">
              {(['day', 'week', 'month', 'year'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 font-medium capitalize transition-colors ${view === v ? 'text-black' : 'text-white/40'}`}
                  style={{ background: view === v ? '#00c896' : 'var(--hover-bg)' }}>
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-black"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Add Event
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-[#00c896] border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {view === 'month' && <MonthView current={current} selected={selected} onSelect={setSelected} dayMap={dayMap} />}
            {view === 'week' && <WeekView current={current} selected={selected} onSelect={setSelected} dayMap={dayMap} />}
            {view === 'day' && <DayView date={current} events={events} notes={notes} onDeleteEvent={fetchData} />}
            {view === 'year' && <YearView current={current} onSelectMonth={(d) => { setCurrent(d); setView('month') }} dayMap={dayMap} />}
          </>
        )}
      </div>

      {/* Day detail sidebar — shown in month/week view */}
      {(view === 'month' || view === 'week') && (
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
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-white/5">
        {DAYS.map(d => (
          <div key={d} className="py-3 text-center text-xs font-medium text-white/30 uppercase tracking-widest">{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="border-b border-r border-white/5 min-h-[90px]" style={{ borderColor: 'rgba(255,255,255,0.03)' }} />
          const key = toDateKey(date)
          const data = dayMap.get(key)
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selected)
          const hasContent = data && (data.events.length + data.notes.length) > 0

          return (
            <div
              key={i}
              onClick={() => onSelect(date)}
              className="border-b border-r border-white/5 min-h-[90px] p-2 cursor-pointer transition-colors"
              style={{
                borderColor: 'rgba(255,255,255,0.03)',
                background: isSelected ? 'rgba(0,200,150,0.06)' : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                  isToday ? 'text-black font-bold' :
                  isSelected ? 'text-[#00c896] font-bold' :
                  'text-white/60 font-medium'
                }`}
                  style={{ background: isToday ? '#00c896' : 'transparent' }}>
                  {date.getDate()}
                </span>
              </div>
              {data && (
                <div className="flex flex-col gap-0.5">
                  {data.events.slice(0, 2).map(e => {
                    const et = getEventType(e.type)
                    return (
                      <div key={e.id} className="text-[10px] px-1.5 py-0.5 rounded truncate" style={{ background: et.bg, color: et.color }}>
                        {e.title}
                      </div>
                    )
                  })}
                  {data.notes.slice(0, 1).map(n => (
                    <div key={n.id} className="text-[10px] px-1.5 py-0.5 rounded truncate" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
                      📝 {n.player.firstName} {n.player.lastName}
                    </div>
                  ))}
                  {(data.events.length + data.notes.length) > 3 && (
                    <div className="text-[10px] text-white/20 px-1">+{data.events.length + data.notes.length - 3} more</div>
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
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
      <div className="grid grid-cols-7 border-b border-white/5">
        {days.map((date, i) => {
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selected)
          return (
            <div key={i} onClick={() => onSelect(date)} className="p-3 text-center cursor-pointer border-r border-white/5 last:border-r-0 transition-colors"
              style={{ background: isSelected ? 'rgba(0,200,150,0.06)' : undefined }}>
              <p className="text-xs text-white/30 mb-1">{DAYS[date.getDay()]}</p>
              <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold ${
                isToday ? 'text-black' :
                isSelected ? 'text-[#00c896]' :
                'text-white/80'
              }`}
                style={{ background: isToday ? '#00c896' : 'transparent' }}>
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const key = toDateKey(date)
          const data = dayMap.get(key)
          const isSelected = isSameDay(date, selected)
          return (
            <div key={i} onClick={() => onSelect(date)} className="border-r border-white/5 last:border-r-0 p-2 min-h-[200px] cursor-pointer transition-colors"
              style={{ background: isSelected ? 'rgba(0,200,150,0.03)' : undefined }}>
              {data?.events.map(e => {
                const et = getEventType(e.type)
                return (
                  <div key={e.id} className="text-[10px] px-1.5 py-1 rounded mb-1 truncate" style={{ background: et.bg, color: et.color }}>
                    {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {e.title}
                  </div>
                )
              })}
              {data?.notes.map(n => (
                <div key={n.id} className="text-[10px] px-1.5 py-1 rounded mb-1 truncate" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
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
  return (
    <div className="rounded-2xl border border-white/5 p-6" style={{ background: 'var(--card-bg)' }}>
      {events.length === 0 && notes.length === 0 ? (
        <p className="text-white/20 text-sm text-center py-12">No events or notes for this day</p>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map(e => <EventItem key={e.id} event={e} onDelete={onDeleteEvent} />)}
          {notes.map(n => <NoteItem key={n.id} note={n} />)}
        </div>
      )}
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
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-white">
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896' }}>Today</span>}
        </div>
        <p className="text-xs text-white/30">{total === 0 ? 'Nothing scheduled' : `${total} item${total !== 1 ? 's' : ''}`}</p>
      </div>

      <div className="p-3 flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {total === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-white/20 mb-3">Nothing here yet</p>
            <button onClick={onAdd} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-black" style={{ background: '#00c896' }}>
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
        <div className="p-3 border-t border-white/5">
          <button onClick={onAdd} className="w-full py-2 rounded-xl text-xs font-semibold text-black" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
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
          <div key={mi} onClick={() => onSelectMonth(new Date(current.getFullYear(), mi, 1))}
            className="rounded-2xl border border-white/5 p-3 cursor-pointer transition-all hover:border-white/10"
            style={{ background: isCurrentMonth ? 'rgba(0,200,150,0.04)' : 'var(--subtle-bg)', borderColor: isCurrentMonth ? 'rgba(0,200,150,0.2)' : undefined }}>
            <p className={`text-xs font-semibold mb-2 ${isCurrentMonth ? 'text-[#00c896]' : 'text-white/50'}`}>{month}</p>
            <div className="grid grid-cols-7 gap-px">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-[8px] text-center text-white/20">{d}</div>
              ))}
              {cells.map((d, i) => {
                if (!d) return <div key={i} />
                const key = `${current.getFullYear()}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const hasData = dayMap.has(key)
                const isToday = today.getFullYear() === current.getFullYear() && today.getMonth() === mi && today.getDate() === d
                return (
                  <div key={i} className="relative flex items-center justify-center">
                    <span className={`text-[9px] w-4 h-4 flex items-center justify-center rounded-full ${isToday ? 'text-black font-bold' : 'text-white/40'}`}
                      style={{ background: isToday ? '#00c896' : 'transparent' }}>
                      {d}
                    </span>
                    {hasData && !isToday && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00c896]" />}
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
    await fetch(`/api/calendar/events/${event.id}`, { method: 'DELETE' })
    onDelete()
  }

  const time = new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="group flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: et.bg, border: `1px solid ${et.color}20` }}>
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: et.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: et.color }}>{et.label}</div>
          <div className="text-[10px] text-white/30">{time}</div>
        </div>
        <p className={`font-medium text-white ${compact ? 'text-xs' : 'text-sm'} truncate`}>{event.title}</p>
        {event.notes && !compact && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{event.notes}</p>}
      </div>
      <button onClick={handleDelete} disabled={deleting}
        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all flex-shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
  )
}

// ─── Note Item ────────────────────────────────────────────────────────────────

function NoteItem({ note, compact }: { note: PlayerNote; compact?: boolean }) {
  return (
    <Link href={`/databases/${note.player.databaseId}/players/${note.player.id}`}
      className="flex items-start gap-2.5 p-2.5 rounded-xl transition-colors"
      style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
        {note.player.firstName[0]}{note.player.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/40 mb-0.5">
          {note.player.firstName} {note.player.lastName} · {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
        <p className={`text-white/70 ${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}>{note.content}</p>
      </div>
      <svg className="w-3 h-3 text-white/20 flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 border border-white/10" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-5">Add Event</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Title *</label>
            <input autoFocus value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Meeting with agent"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {EVENT_TYPES.map(t => (
                <button key={t.value} onClick={() => set('type', t.value)}
                  className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: form.type === t.value ? t.bg : 'var(--hover-bg)',
                    color: form.type === t.value ? t.color : 'var(--text-faint)',
                    border: `1px solid ${form.type === t.value ? t.color + '40' : 'var(--border)'}`,
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1">Date & Time</label>
            <input type="datetime-local" value={form.startAt} onChange={e => set('startAt', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', colorScheme: 'dark' }}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Any additional notes..."
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none resize-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 mt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/40" style={{ background: 'var(--hover-bg)' }}>Cancel</button>
            <button onClick={handleSave} disabled={loading || !form.title.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
              {loading ? 'Saving...' : 'Add Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

