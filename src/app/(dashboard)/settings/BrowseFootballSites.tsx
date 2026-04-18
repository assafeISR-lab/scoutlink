'use client'

import { useState, useEffect, useRef } from 'react'
import { FOOTBALL_ASSOCIATIONS, type FootballAssociation } from '@/lib/footballAssociations'

interface Props {
  onClose: () => void
  onAdd: (site: { name: string; url: string; country: string; category: string; requiresLogin: boolean }) => Promise<void>
}

type Tab = 'association' | 'club'
type Confederation = 'All' | 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'

interface ClubResult {
  id: string
  name: string
  country: string
  league: string
  website: string
  badge: string
}

export default function BrowseFootballSites({ onClose, onAdd }: Props) {
  const [tab, setTab] = useState<Tab>('association')
  const [confFilter, setConfFilter] = useState<Confederation>('All')
  const [countrySearch, setCountrySearch] = useState('')
  const [clubSearch, setClubSearch] = useState('')
  const [clubResults, setClubResults] = useState<ClubResult[]>([])
  const [clubLoading, setClubLoading] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter associations
  const filteredAssociations = FOOTBALL_ASSOCIATIONS.filter(fa => {
    const matchesConf = confFilter === 'All' || fa.confederation === confFilter
    const matchesSearch = countrySearch === '' ||
      fa.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
      fa.name.toLowerCase().includes(countrySearch.toLowerCase())
    return matchesConf && matchesSearch
  })

  // Club search with debounce
  useEffect(() => {
    if (tab !== 'club') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (clubSearch.trim().length < 2) { setClubResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setClubLoading(true)
      const res = await fetch(`/api/football-sites?club=${encodeURIComponent(clubSearch)}`)
      const data = await res.json()
      setClubResults(data.teams || [])
      setClubLoading(false)
    }, 400)
  }, [clubSearch, tab])

  async function handleAddAssociation(fa: FootballAssociation) {
    await onAdd({ name: fa.name, url: fa.url, country: fa.country, category: 'association', requiresLogin: false })
    setAddedIds(s => new Set(s).add(fa.url))
  }

  async function handleAddClub(club: ClubResult) {
    await onAdd({ name: club.name, url: club.website, country: club.country, category: 'club', requiresLogin: false })
    setAddedIds(s => new Set(s).add(club.id))
  }

  const confederations: Confederation[] = ['All', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 flex flex-col" style={{ background: 'var(--card-bg)', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Browse Football Sites</h2>
            <p className="text-xs text-white/30 mt-0.5">Find official websites for associations and clubs</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-1 flex-shrink-0">
          {(['association', 'club'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize"
              style={tab === t
                ? { background: '#00c896', color: '#000' }
                : { background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
            >
              {t === 'association' ? '🏛 National Associations' : '⚽ Football Clubs'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6 pt-4 gap-3">

          {tab === 'association' && (
            <>
              {/* Search + confederation filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                  <input
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    placeholder="Search country or association..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>

              {/* Confederation pills */}
              <div className="flex gap-1.5 flex-wrap">
                {confederations.map(c => (
                  <button key={c} onClick={() => setConfFilter(c)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={confFilter === c
                      ? { background: '#6c8fff', color: '#fff' }
                      : { background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Association list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredAssociations.length === 0 && (
                  <p className="text-sm text-white/20 text-center py-8">No associations found</p>
                )}
                {filteredAssociations.map(fa => {
                  const added = addedIds.has(fa.url)
                  return (
                    <div key={fa.url} className="flex items-center gap-3 px-4 py-3 rounded-xl group" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
                      <img src={`https://www.google.com/s2/favicons?domain=${new URL(fa.url).hostname}&sz=32`} alt="" className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{fa.country}</p>
                        <p className="text-xs text-white/30 truncate">{fa.name}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(108,143,255,0.15)', color: '#6c8fff' }}>{fa.confederation}</span>
                      <button
                        onClick={() => handleAddAssociation(fa)}
                        disabled={added}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all disabled:opacity-40"
                        style={added ? { background: 'rgba(0,200,150,0.1)', color: '#00c896' } : { background: '#00c896', color: '#000' }}
                      >
                        {added ? '✓ Added' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'club' && (
            <>
              {/* Club search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input
                  value={clubSearch}
                  onChange={e => setClubSearch(e.target.value)}
                  placeholder="Type a club name (e.g. Arsenal, Barcelona...)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  autoFocus
                />
              </div>

              {/* Club results */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {clubLoading && (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 rounded-full border-2 border-[#00c896] border-t-transparent animate-spin mx-auto" />
                    <p className="text-xs text-white/30 mt-2">Searching...</p>
                  </div>
                )}
                {!clubLoading && clubSearch.length >= 2 && clubResults.length === 0 && (
                  <p className="text-sm text-white/20 text-center py-8">No clubs found with an official website</p>
                )}
                {!clubLoading && clubSearch.length < 2 && (
                  <p className="text-sm text-white/20 text-center py-8">Type at least 2 characters to search</p>
                )}
                {clubResults.map(club => {
                  const added = addedIds.has(club.id)
                  return (
                    <div key={club.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
                      {club.badge
                        ? <img src={club.badge} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                        : <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: 'var(--hover-bg)' }} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{club.name}</p>
                        <p className="text-xs text-white/30 truncate">{club.country} · {club.league}</p>
                      </div>
                      <p className="text-xs text-white/20 truncate max-w-[120px] flex-shrink-0">{club.website.replace('https://', '').replace('www.', '')}</p>
                      <button
                        onClick={() => handleAddClub(club)}
                        disabled={added}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all disabled:opacity-40"
                        style={added ? { background: 'rgba(0,200,150,0.1)', color: '#00c896' } : { background: '#00c896', color: '#000' }}
                      >
                        {added ? '✓ Added' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
