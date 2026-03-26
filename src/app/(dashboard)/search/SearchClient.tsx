'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import WebsitesManager from '../settings/WebsitesManager'
import SearchParamsPanel, { PARAM_KEYS } from './SearchParamsPanel'

interface PlayerResult {
  id: string
  name: string
  nationality: string | null
  team: string | null
  position: string | null
  dateOfBirth: string | null
  heightCm: number | null
  weightKg: number | null
  photo: string | null
  description: string | null
  marketValue: string | null
  sourceUrl: string
  sourceName: string
}

interface Database {
  id: string
  name: string
}

interface Website {
  id: string
  name: string
  url: string
  requiresLogin: boolean
  loginStatus: string
  username: string | null
  password: string | null
  isActive: boolean
  useForSearch: boolean
  country: string | null
  category: string | null
}

interface SiteStat {
  name: string
  url: string
  count: number
  error: boolean
  noScraper?: boolean
}

export default function SearchClient({ databases, websites }: { databases: Database[]; websites: Website[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerResult[]>([])
  const [siteStats, setSiteStats] = useState<SiteStat[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [noSitesSelected, setNoSitesSelected] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [merging, setMerging] = useState(false)
  const [visibleParams, setVisibleParams] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setNoSitesSelected(false)
    setSiteStats([])
    setSelectedIds(new Set())
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data.players || [])
    setSiteStats(data.siteStats || [])
    setNoSitesSelected(!!data.noSitesSelected)
    setLoading(false)
  }

  return (
    <div>
      {/* Top zone: Search */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.01)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Zone header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.3)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00c896">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-wide">Player Search</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Search across all scouting sources</p>
          </div>
        </div>

        <div className="p-6">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" viewBox="0 0 24 24" fill="rgba(0,200,150,0.5)">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for a player (e.g. Messi, Ronaldo, Mbappe...)"
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-white text-base focus:outline-none transition-all"
                style={{ background: '#0f1117', border: '2px solid rgba(0,200,150,0.55)', boxShadow: '0 0 16px rgba(0,200,150,0.12)', color: 'white' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#00c896'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,200,150,0.15), 0 0 20px rgba(0,200,150,0.2)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.55)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,200,150,0.12)' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-4 rounded-2xl font-bold text-black text-base disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', boxShadow: '0 4px 16px rgba(0,200,150,0.3)' }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Results area — only shown after a search */}
          {searched && (
          <div className="flex gap-6 items-stretch">
            <div className="flex-1 min-w-0">

              {/* Loading */}
              {loading && (
                <div className="text-center py-16">
                  <div className="w-10 h-10 rounded-full border-2 border-[#00c896] border-t-transparent animate-spin mx-auto mb-4" />
                  <p className="text-white/30 text-sm">Searching player database...</p>
                </div>
              )}

              {/* No sites selected */}
              {!loading && noSitesSelected && (
                <div className="rounded-2xl border border-dashed p-16 text-center" style={{ borderColor: 'rgba(255,159,67,0.3)', background: 'rgba(255,159,67,0.03)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,159,67,0.1)', border: '1px solid rgba(255,159,67,0.25)' }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ff9f43"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#ff9f43' }}>No scouting sites selected</p>
                  <p className="text-white/30 text-xs">Check the boxes next to the sites you want to search in below</p>
                </div>
              )}

              {/* No results */}
              {!loading && !noSitesSelected && results.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
                  <p className="text-white/40 text-sm mb-1">No players found for "{query}"</p>
                  <p className="text-white/20 text-xs">Try a different name or check the spelling</p>
                </div>
              )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div>
          {/* Action bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-white/30 uppercase tracking-widest">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/50">{selectedIds.size} selected</span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setMerging(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-black"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  Merge & Import
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/20">Select results to merge & import</p>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {results.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                selected={selectedIds.has(player.id)}
                onToggleSelect={() => toggleSelect(player.id)}
                visibleParams={visibleParams}
              />
            ))}
          </div>
        </div>
      )}

              {/* Merge modal */}
              {merging && (
                <MergeModal
                  players={results.filter(p => selectedIds.has(p.id))}
                  databases={databases}
                  onClose={() => setMerging(false)}
                />
              )}
            </div>{/* end left column */}

            {/* Right column: Search Coverage + Parameter Coverage */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-4">
              <div className="rounded-2xl border border-white/8 overflow-hidden flex flex-col" style={{ background: '#141720' }}>
                <div className="px-4 py-3 border-b border-white/8 flex-shrink-0">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Search Coverage</p>
                </div>
                {loading ? (
          <div className="px-4 py-5 flex flex-col gap-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ) : noSitesSelected ? (
          <div className="px-4 py-5">
            <p className="text-xs text-white/25 text-center">No sites selected for search</p>
          </div>
        ) : siteStats.length === 0 ? (
          <div className="px-4 py-5">
            <p className="text-xs text-white/25 text-center">No sites with scrapers were searched</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {siteStats
              .sort((a, b) => {
                // Results first, then no-results, then errors, then no-scraper
                const rank = (s: SiteStat) => s.count > 0 ? 0 : s.error ? 2 : s.noScraper ? 3 : 1
                return rank(a) - rank(b) || b.count - a.count
              })
              .map(site => (
              <div key={site.name} className="flex items-center gap-3 px-4 py-2.5">
                {/* Status icon */}
                {site.error ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,100,100,0.12)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#ff6464"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </div>
                ) : site.noScraper ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </div>
                ) : site.count > 0 ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.15)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)"><path d="M19 13H5v-2h14v2z"/></svg>
                  </div>
                )}
                {/* Site info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: site.count > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)' }}>
                    {site.name}
                  </p>
                  {site.error ? (
                    <p className="text-[10px]" style={{ color: '#ff6464aa' }}>Did not succeed to scrape</p>
                  ) : site.noScraper ? (
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>No scraper available</p>
                  ) : (
                    <p className="text-[10px]" style={{ color: site.count > 0 ? '#00c896aa' : 'rgba(255,255,255,0.2)' }}>
                      {site.count > 0 ? `${site.count} result${site.count !== 1 ? 's' : ''}` : 'No results'}
                    </p>
                  )}
                </div>
                {/* Count badge */}
                {site.count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896' }}>
                    {site.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
                {/* Summary footer */}
                {!loading && siteStats.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[10px] text-white/30">
                      {siteStats.filter(s => s.count > 0).length} of {siteStats.filter(s => !s.noScraper).length} scraped sites found results
                    </p>
                  </div>
                )}
              </div>

              {/* Parameter Coverage Panel */}
              <ParameterCoveragePanel results={results} searched={searched} loading={loading} />
            </div>{/* end right column */}

          </div>
          )}{/* end searched condition */}
        </div>{/* end p-6 */}
      </div>{/* end top zone */}

    {/* Bottom zone: Search Configuration */}
    <div className="mt-8 flex items-center gap-3 mb-4">
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Search Configuration</span>
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
    <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.01)' }}>
      {/* Zone header */}
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="rgba(255,255,255,0.25)">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Configure Sources &amp; Parameters</p>
      </div>

      {/* Content */}
      <div className="flex gap-6 items-start p-6">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3 px-1">Scouting Websites</p>
          <WebsitesManager websites={websites} />
        </div>
        <div className="w-64 flex-shrink-0">
          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3 px-1">Search Parameters</p>
          <SearchParamsPanel onChange={setVisibleParams} />
        </div>
      </div>
    </div>
    </div>
  )
}

// ─── Parameter Coverage Panel ─────────────────────────────────────────────────

const PARAM_LABELS: Record<string, string> = {
  photo:       'Photo',
  nationality: 'Nationality',
  team:        'Team / Club',
  position:    'Position',
  age:         'Age',
  dateOfBirth: 'Date of Birth',
  height:      'Height',
  weight:      'Weight',
  marketValue: 'Market Value',
  description: 'Bio / Description',
}

function countField(results: PlayerResult[], key: string): number {
  switch (key) {
    case 'photo':       return results.filter(p => !!p.photo).length
    case 'nationality': return results.filter(p => !!p.nationality).length
    case 'team':        return results.filter(p => !!p.team).length
    case 'position':    return results.filter(p => !!p.position).length
    case 'age':
    case 'dateOfBirth': return results.filter(p => !!p.dateOfBirth).length
    case 'height':      return results.filter(p => p.heightCm !== null).length
    case 'weight':      return results.filter(p => p.weightKg !== null).length
    case 'marketValue': return results.filter(p => !!p.marketValue).length
    case 'description': return results.filter(p => !!p.description).length
    default:            return 0
  }
}

function ParameterCoveragePanel({ results, searched, loading }: {
  results: PlayerResult[]
  searched: boolean
  loading: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: '#141720' }}>
      <div className="px-4 py-3 border-b border-white/8">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Parameter Coverage</p>
      </div>

      {!searched ? (
        <div className="flex items-center justify-center px-4 py-6">
          <p className="text-xs text-white/25 text-center leading-relaxed">Run a search to see<br/>which parameters were found</p>
        </div>
      ) : loading ? (
        <div className="px-4 py-4 flex flex-col gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-6 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {PARAM_KEYS.map(key => {
            const count = countField(results, key)
            const found = count > 0
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-2">
                {/* Icon */}
                {found ? (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.15)' }}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)"><path d="M19 13H5v-2h14v2z"/></svg>
                  </div>
                )}
                {/* Label */}
                <span className="text-xs flex-1" style={{ color: found ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)' }}>
                  {PARAM_LABELS[key]}
                </span>
                {/* Count */}
                {found && (
                  <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#00c896aa' }}>
                    {count}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {searched && !loading && results.length > 0 && (
        <div className="px-4 py-2 border-t border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-[10px] text-white/30">
            {PARAM_KEYS.filter(k => countField(results, k) > 0).length} of {PARAM_KEYS.length} parameters found
          </p>
        </div>
      )}
    </div>
  )
}

function PlayerCard({ player, selected, onToggleSelect, visibleParams }: {
  player: PlayerResult
  selected: boolean
  onToggleSelect: () => void
  visibleParams: Set<string>
}) {
  const [expanded, setExpanded] = useState(false)
  const show = (key: string) => visibleParams.size === 0 || visibleParams.has(key)

  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #141720 0%, #111318 100%)',
        boxShadow: selected ? '0 0 0 2px #00c896' : '0 8px 32px rgba(0,0,0,0.3)',
        borderColor: selected ? '#00c896' : 'rgba(255,255,255,0.05)',
      }}
      onClick={onToggleSelect}
    >
      <div className="flex items-center gap-5 p-5">
        {/* Checkbox */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: selected ? '#00c896' : 'transparent',
            border: `2px solid ${selected ? '#00c896' : 'rgba(255,255,255,0.2)'}`,
          }}
        >
          {selected && (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#000">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          )}
        </div>

        {/* Photo */}
        {show('photo') && (
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            onClick={e => e.stopPropagation()}
          >
            {player.photo ? (
              <img src={player.photo} alt={player.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
            ) : (
              <span className="text-2xl font-bold text-white/20">{player.name[0]}</span>
            )}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white mb-1">{player.name}</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {show('team') && player.team && <span className="text-sm text-white/50">{player.team}</span>}
            {show('position') && player.position && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>
                {player.position}
              </span>
            )}
            {show('nationality') && player.nationality && <span className="text-sm text-white/40">{player.nationality}</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {show('age') && age && <Stat label="Age" value={`${age}`} />}
            {show('height') && player.heightCm && <Stat label="Height" value={`${player.heightCm} cm`} />}
            {show('weight') && player.weightKg && <Stat label="Weight" value={`${player.weightKg} kg`} />}
            {show('dateOfBirth') && player.dateOfBirth && <Stat label="Born" value={new Date(player.dateOfBirth).toLocaleDateString()} />}
            {show('marketValue') && player.marketValue && <Stat label="Market Value" value={player.marketValue} />}
          </div>
          <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-white/50">Source:</span>
            <a href={player.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:text-[#00c896] transition-colors underline underline-offset-2" style={{ color: '#00c896aa' }}>{player.sourceName} ↗</a>
          </div>
        </div>

        {/* Expand description button */}
        {show('description') && player.description && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
          >
            {expanded ? 'Less ↑' : 'More ↓'}
          </button>
        )}
      </div>

      {/* Expanded description */}
      {show('description') && expanded && player.description && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4" onClick={e => e.stopPropagation()}>
          <p className="text-sm text-white/50 leading-relaxed line-clamp-4">{player.description}</p>
          <a href={player.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 inline-block" style={{ color: '#00c896' }}>
            View full profile →
          </a>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-white/40 uppercase tracking-wide font-medium">{label}:</span>
      <span className="text-xs text-white/80 font-semibold">{value}</span>
    </div>
  )
}

// ─── Merge & Import Modal ──────────────────────────────────────────────────────

function parseMarketValueToNumber(v: string | null): number | null {
  if (!v) return null
  const lower = v.toLowerCase()
  const num = parseFloat(v.replace(/[^0-9.]/g, ''))
  if (isNaN(num)) return null
  if (lower.includes('b')) return Math.round(num * 1_000_000_000)
  if (lower.includes('m')) return Math.round(num * 1_000_000)
  if (lower.includes('k')) return Math.round(num * 1_000)
  return Math.round(num)
}

function getSources(players: PlayerResult[], getter: (p: PlayerResult) => string | null | undefined) {
  const out: { sourceName: string; value: string }[] = []
  for (const p of players) {
    const v = getter(p)
    if (v != null && String(v).trim() !== '') out.push({ sourceName: p.sourceName, value: String(v) })
  }
  return out
}

function pickBest(sources: { sourceName: string; value: string }[]) {
  return sources[0]?.value ?? ''
}

function hasConflict(sources: { sourceName: string; value: string }[]) {
  if (sources.length <= 1) return false
  return new Set(sources.map(s => s.value)).size > 1
}

function MergeModal({ players, databases, onClose }: {
  players: PlayerResult[]
  databases: Database[]
  onClose: () => void
}) {
  const router = useRouter()
  const [selectedDb, setSelectedDb] = useState(databases[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Build source lists per field
  const nameSources   = getSources(players, p => p.name)
  const posSources    = getSources(players, p => p.position)
  const clubSources   = getSources(players, p => p.team)
  const natSources    = getSources(players, p => p.nationality)
  const dobSources    = getSources(players, p => p.dateOfBirth)
  const htSources     = getSources(players, p => p.heightCm?.toString())
  const wtSources     = getSources(players, p => p.weightKg?.toString())
  const mvSources     = getSources(players, p => p.marketValue)

  const bestName = pickBest(nameSources).trim().split(/\s+/)

  const [form, setForm] = useState({
    firstName:   bestName[0] ?? '',
    lastName:    bestName.slice(1).join(' ') || '',
    position:    pickBest(posSources),
    clubName:    pickBest(clubSources),
    nationality: pickBest(natSources),
    dateOfBirth: pickBest(dobSources),
    heightCm:    pickBest(htSources),
    weightKg:    pickBest(wtSources),
    marketValue: pickBest(mvSources),
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleImport() {
    if (!selectedDb) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/databases/${selectedDb}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim() || '-',
        position:    form.position    || null,
        clubName:    form.clubName    || null,
        nationality: form.nationality || null,
        dateOfBirth: form.dateOfBirth || null,
        heightCm:    form.heightCm    ? parseInt(form.heightCm)    : null,
        weightKg:    form.weightKg    ? parseInt(form.weightKg)    : null,
        marketValue: parseMarketValueToNumber(form.marketValue),
        sourceName:  players.map(p => p.sourceName).join(', '),
        sourceUrl:   players[0]?.sourceUrl,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/databases/${selectedDb}/players/${data.id}`)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Something went wrong')
      setLoading(false)
    }
  }

  const sourceNames = [...new Set(players.map(p => p.sourceName))]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 max-h-[90vh] flex flex-col" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-0.5">Merge & Import Player</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/30">Merging {players.length} source{players.length !== 1 ? 's' : ''}:</span>
            {sourceNames.map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <MergeField label="First Name *" value={form.firstName} onChange={v => set('firstName', v)} />
            <MergeField label="Last Name *" value={form.lastName} onChange={v => set('lastName', v)} />
          </div>
          <MergeField label="Position" value={form.position} onChange={v => set('position', v)} sources={posSources} onPick={v => set('position', v)} />
          <MergeField label="Club" value={form.clubName} onChange={v => set('clubName', v)} sources={clubSources} onPick={v => set('clubName', v)} />
          <MergeField label="Nationality" value={form.nationality} onChange={v => set('nationality', v)} sources={natSources} onPick={v => set('nationality', v)} />
          <div className="grid grid-cols-3 gap-3">
            <MergeField label="Date of Birth" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} type="date" sources={dobSources} onPick={v => set('dateOfBirth', v)} />
            <MergeField label="Height (cm)" value={form.heightCm} onChange={v => set('heightCm', v)} sources={htSources} onPick={v => set('heightCm', v)} />
            <MergeField label="Weight (kg)" value={form.weightKg} onChange={v => set('weightKg', v)} sources={wtSources} onPick={v => set('weightKg', v)} />
          </div>
          <MergeField label="Market Value" value={form.marketValue} onChange={v => set('marketValue', v)} sources={mvSources} onPick={v => set('marketValue', v)} />

          {/* Database selector */}
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Import into database</p>
            {databases.length === 0 ? (
              <p className="text-sm text-red-400">You have no databases. Create one first.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {databases.map(db => (
                  <label key={db.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all" style={{
                    background: selectedDb === db.id ? 'rgba(0,200,150,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedDb === db.id ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <input type="radio" name="db" value={db.id} checked={selectedDb === db.id} onChange={() => setSelectedDb(db.id)} className="accent-[#00c896]" />
                    <span className="text-sm text-white">{db.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
          <button onClick={handleImport} disabled={loading || !form.firstName.trim() || !selectedDb || databases.length === 0} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
            {loading ? 'Importing...' : 'Import Player'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MergeField({ label, value, onChange, type = 'text', sources = [], onPick }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  sources?: { sourceName: string; value: string }[]
  onPick?: (v: string) => void
}) {
  const conflict = hasConflict(sources)
  const agree    = !conflict && sources.length > 1

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-white/40">{label}</label>
        {agree   && <span className="text-[10px]" style={{ color: '#00c896aa' }}>✓ {sources.length} sources agree</span>}
        {conflict && <span className="text-[10px]" style={{ color: '#ffaa44' }}>⚠ {sources.length} sources differ</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
        style={{
          background: '#0f1117',
          border: `1px solid ${conflict ? 'rgba(255,170,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
        }}
        onFocus={e => e.currentTarget.style.borderColor = conflict ? 'rgba(255,170,68,0.7)' : '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = conflict ? 'rgba(255,170,68,0.4)' : 'rgba(255,255,255,0.1)'}
      />
      {/* Source chips — always shown when multiple sources, clickable to set value */}
      {sources.length > 1 && onPick && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {sources.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(s.value)}
              className="text-[10px] px-2 py-0.5 rounded-md transition-all"
              style={{
                background: value === s.value ? (conflict ? 'rgba(255,170,68,0.15)' : 'rgba(0,200,150,0.12)') : 'rgba(255,255,255,0.04)',
                color:      value === s.value ? (conflict ? '#ffaa44' : '#00c896') : 'rgba(255,255,255,0.3)',
                border:     `1px solid ${value === s.value ? (conflict ? 'rgba(255,170,68,0.3)' : 'rgba(0,200,150,0.25)') : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {s.sourceName}: {s.value}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
