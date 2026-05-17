'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'
import { PARAM_KEYS, PARAM_LABELS, PARAM_SOURCES, type ParamKey, loadActive, loadCustomActive, loadParamSources, buildParamsBySource } from './SearchParamsPanel'
import FMRadarChart from '@/components/FMRadarChart'

// Params that are planned but not yet scraped — always shown as "coming soon"
const COMING_SOON = new Set<string>(['heatMap', 'seasonStats'])

const POS_ALIASES: Record<string, string> = {
  DC: 'Centre-Back', CB: 'Centre-Back',
  RB: 'Right-Back', LB: 'Left-Back',
  RWB: 'Right Wing-Back', LWB: 'Left Wing-Back',
}
const normalizePos = (pos: string) => POS_ALIASES[pos.toUpperCase()] ?? pos

interface PlayerResult {
  id: string
  name: string
  nationality: string | null
  team: string | null
  league: string | null
  position: string | null
  dateOfBirth: string | null
  heightCm: number | null
  weightKg: number | null
  preferredFoot: string | null
  contractUntil: string | null
  passports: string | null
  joiningDate: string | null
  photo: string | null
  description: string | null
  marketValue: string | null
  fmWages: string | null
  fmAttributes: string | null
  transfermarktUrl: string | null
  sofascoreUrl: string | null
  fmInsideUrl: string | null
  sources: string[]
}

interface Database {
  id: string
  name: string
}


interface SiteStat {
  name: string
  url: string
  count: number
  error: boolean
  noScraper?: boolean
}

interface PlayerEditData {
  // Core fields (pre-filled from scraped data, editable)
  position: string
  nationality: string
  clubName: string
  league: string
  dateOfBirth: string
  preferredFoot: string
  heightCm: string
  passports: string
  marketValue: string
  fmWages: string
  joiningDate: string
  contractExpiry: string
  fmAttributes: string
  // Scout-added fields
  transferFeeExpect: string
  transferFeeReal: string
  salaryExpect: string
  salaryReal: string
  recentForm: string
  highlights: string
  tmUrl: string
  scUrl: string
  igUrl: string
  customExtras: { key: string; value: string }[]
}

export default function SearchClient({ databases, userName }: { databases: Database[]; userName: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerResult[]>([])
  const [siteStats, setSiteStats] = useState<SiteStat[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [noSitesSelected, setNoSitesSelected] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [merging, setMerging] = useState(false)
  const [editedData, setEditedData] = useState<Record<string, PlayerEditData>>({})
  const [visibleParams, setVisibleParams] = useState<Set<string>>(new Set())

  // Build param→source mapping from user's saved preferences (reads localStorage on mount)
  const paramsBySource = useMemo(() => buildParamsBySource(loadParamSources()), [])

  function handleDataChange(playerId: string, data: PlayerEditData) {
    setEditedData(prev => ({ ...prev, [playerId]: data }))
  }
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const active = loadActive()
    const customActive = loadCustomActive()
    setVisibleParams(new Set([...active, ...customActive]))
  }, [])

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
    try {
      // Build effective sources (user overrides merged with defaults) and send to API
      const overrides = loadParamSources()
      const effectiveSources: Record<string, string> = {}
      for (const key of PARAM_KEYS) {
        const src = overrides[key] ?? PARAM_SOURCES[key]
        if (src) effectiveSources[key] = src
      }
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, paramSources: effectiveSources }),
      })
      const data = res.ok ? await res.json() : {}
      const players: PlayerResult[] = data.players || []
      // No scraped results — inject a blank stub so the user can fill in and import manually
      if (players.length === 0 && !data.noSitesSelected) {
        players.push({
          id: `manual-${query.trim()}`,
          name: query.trim(),
          nationality: null, team: null, league: null, position: null,
          dateOfBirth: null, heightCm: null, weightKg: null, preferredFoot: null,
          contractUntil: null, passports: null, joiningDate: null,
          photo: null, description: null, marketValue: null, fmWages: null,
          fmAttributes: null, transfermarktUrl: null, sofascoreUrl: null,
          fmInsideUrl: null, sources: [],
        })
      }
      setResults(players)
      setSiteStats(data.siteStats || [])
      setNoSitesSelected(!!data.noSitesSelected)
    } catch {
      const stub: PlayerResult = {
        id: `manual-${query.trim()}`,
        name: query.trim(),
        nationality: null, team: null, league: null, position: null,
        dateOfBirth: null, heightCm: null, weightKg: null, preferredFoot: null,
        contractUntil: null, passports: null, joiningDate: null,
        photo: null, description: null, marketValue: null, fmWages: null,
        fmAttributes: null, transfermarktUrl: null, sofascoreUrl: null,
        fmInsideUrl: null, sources: [],
      }
      setResults([stub])
      setSiteStats([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Top zone: Search */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{
        border: '1px solid var(--border)',
        background: 'var(--subtle-bg)',
        boxShadow: 'var(--card-shadow)',
      }}>
        {/* Zone header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: 'var(--subtle-bg)', borderColor: 'var(--border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.3)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00c896">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-wide">Player Search</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Search across all scouting sources</p>
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
                style={{ background: 'var(--input-bg)', border: '2px solid rgba(0,200,150,0.55)', boxShadow: '0 0 16px rgba(0,200,150,0.12)', color: 'var(--text-primary)' }}
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
          <>
            {/* Cards + Coverage */}
            <div className="flex gap-6 items-start">
              <div className="flex-1 min-w-0">

                {/* Action bar — above player cards only */}
                {!loading && results.length > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest">{results.length} player{results.length !== 1 ? 's' : ''} found</p>
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
                          Import Selected
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-white/20">Select players to import</p>
                    )}
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <ScoutLinkBallLoader size={88} />
                    <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Searching player database…</p>
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

                {/* Scrape-error notice — shown when all sites failed but we still show a blank card */}
                {!loading && searched && siteStats.length > 0 && siteStats.filter(s => !s.noScraper).every(s => s.error) && (
                  <div className="rounded-xl px-4 py-2.5 text-xs flex items-center gap-2" style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', color: 'rgba(255,150,150,0.8)' }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Search sites returned errors — no data was scraped. Fill in the card manually and import.
                  </div>
                )}

                {/* Player cards */}
                {!loading && results.length > 0 && (
                  <div className="flex flex-col gap-4">
                    {results.map(player => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        selected={selectedIds.has(player.id)}
                        onToggleSelect={() => toggleSelect(player.id)}
                        onDataChange={(data) => handleDataChange(player.id, data)}
                        userName={userName}
                        visibleParams={visibleParams}
                      />
                    ))}
                  </div>
                )}

                {/* Import modal */}
                {merging && (
                  <ImportModal
                    players={results.filter(p => selectedIds.has(p.id))}
                    databases={databases}
                    editedData={editedData}
                    onClose={() => setMerging(false)}
                  />
                )}
              </div>{/* end left column */}

              {/* Right column: Combined Coverage */}
              <div className="w-64 flex-shrink-0 self-start sticky top-4">
                <CoveragePanel siteStats={siteStats} results={results} loading={loading} noSitesSelected={noSitesSelected} paramsBySource={paramsBySource} />
              </div>{/* end right column */}

            </div>{/* end flex row */}
          </>
          )}{/* end searched condition */}
        </div>{/* end p-6 */}
      </div>{/* end top zone */}

    </div>
  )
}

// ─── Coverage Panel (Search Coverage + Parameter Coverage combined) ──────────

function isFound(results: PlayerResult[], key: string): boolean {
  if (results.length === 0) return false
  switch (key) {
    case 'photo':             return results.some(p => !!p.photo)
    case 'nationality':       return results.some(p => !!p.nationality)
    case 'age':
    case 'dateOfBirth':       return results.some(p => !!p.dateOfBirth)
    case 'height':            return results.some(p => p.heightCm != null)
    case 'team':              return results.some(p => !!p.team)
    case 'position':          return results.some(p => !!p.position)
    case 'marketValue':       return results.some(p => !!p.marketValue)
    case 'description':       return results.some(p => !!p.description)
    case 'transfermarktLink': return results.some(p => !!p.transfermarktUrl)
    case 'sofascoreLink':     return results.some(p => !!p.sofascoreUrl)
    case 'preferredFoot':     return results.some(p => !!p.preferredFoot)
    case 'league':            return results.some(p => !!p.league)
    case 'contractExpiry':    return results.some(p => !!p.contractUntil)
    case 'passports':         return results.some(p => !!p.passports)
    case 'joiningDate':       return results.some(p => !!p.joiningDate)
    case 'fmWages':           return results.some(p => !!p.fmWages)
    case 'fmAttributes':
      return results.some(p => !!p.fmAttributes)
    default:
      return false
  }
}

function CoveragePanel({ siteStats, results, loading, noSitesSelected, paramsBySource }: {
  siteStats: SiteStat[]
  results: PlayerResult[]
  loading: boolean
  noSitesSelected: boolean
  paramsBySource: Record<string, ParamKey[]>
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Collapse all sites whenever new search results arrive
  useEffect(() => {
    setExpanded(new Set())
  }, [siteStats])

  const scraperSitesAll = siteStats.filter(s => !s.noScraper)
  const expandableSites = scraperSitesAll.map(s => s.name)
  const allExpanded     = expandableSites.length > 0 && expandableSites.every(n => expanded.has(n))

  function toggle(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  function toggleAll() {
    if (allExpanded) {
      setExpanded(new Set())
    } else {
      setExpanded(new Set(expandableSites))
    }
  }

  // Scrapers first (have param mappings), then no-scraper sites
  const noScraperSites = siteStats.filter(s => s.noScraper)
  const orderedSites   = [...scraperSitesAll, ...noScraperSites]

  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
      <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Coverage</p>
        {!loading && expandableSites.length > 0 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}
          >
            {allExpanded ? (
              <>
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>
                Collapse all
              </>
            ) : (
              <>
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                Expand all
              </>
            )}
          </button>
        )}
      </div>

      {noSitesSelected ? (
        <div className="px-4 py-5">
          <p className="text-xs text-white/25 text-center">No sites selected for search</p>
        </div>
      ) : loading ? (
        <div className="px-4 py-4 flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--hover-bg)' }} />
          ))}
        </div>
      ) : orderedSites.length === 0 ? (
        <div className="px-4 py-5">
          <p className="text-xs text-white/25 text-center">No sites with scrapers were searched</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {orderedSites.map(site => {
            const siteParams = paramsBySource[site.name] ?? []
            const hasParams  = siteParams.length > 0 && !site.noScraper
            const isOpen     = expanded.has(site.name)
            const realParams = siteParams.filter(k => !COMING_SOON.has(k))
            const foundCount = realParams.filter(k => isFound(results, k)).length

            return (
              <div key={site.url}>
                {/* Site header row */}
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${hasParams ? 'cursor-pointer hover:bg-white/3' : ''}`}
                  onClick={() => hasParams && toggle(site.name)}
                >
                  {/* Status icon */}
                  {site.error ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,100,100,0.12)' }}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#ff6464"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </div>
                  ) : site.noScraper ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--hover-bg)' }}>
                      <svg className="w-3 h-3 opacity-20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    </div>
                  ) : site.count > 0 ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.15)' }}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--hover-bg)' }}>
                      <svg className="w-3 h-3 opacity-20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
                    </div>
                  )}

                  {/* Site name + result subtitle */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: site.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {site.name}
                    </p>
                    <p className="text-[10px]" style={{ color: site.error ? '#ff6464aa' : site.noScraper ? 'var(--text-faint)' : site.count > 0 ? '#00c896aa' : 'rgba(255,255,255,0.2)' }}>
                      {site.error ? 'Scrape failed' : site.noScraper ? 'No scraper' : site.count > 0 ? `${site.count} result${site.count !== 1 ? 's' : ''}` : 'No results'}
                    </p>
                  </div>

                  {/* Param score badge */}
                  {hasParams && realParams.length > 0 && (
                    <span className="text-[10px] tabular-nums flex-shrink-0" style={{ color: foundCount > 0 ? '#00c896' : 'rgba(255,255,255,0.2)' }}>
                      {foundCount}/{realParams.length}
                    </span>
                  )}

                  {/* Chevron */}
                  {hasParams && (
                    <svg
                      className="w-3 h-3 flex-shrink-0 transition-transform duration-150"
                      style={{ color: 'rgba(0,0,0,0.5)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      viewBox="0 0 24 24" fill="currentColor"
                    >
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  )}
                </div>

                {/* Collapsible parameter list */}
                {isOpen && hasParams && (
                  <div className="pb-1.5" style={{ background: 'rgba(0,0,0,0.12)' }}>
                    {siteParams.map(key => {
                      const isComing = COMING_SOON.has(key)
                      const found    = !isComing && isFound(results, key)
                      return (
                        <div key={key} className="flex items-center gap-2.5 pl-9 pr-4 py-[5px]">
                          {isComing ? (
                            <div className="w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.12)' }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(96,165,250,0.6)' }} />
                            </div>
                          ) : found ? (
                            <div className="w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(0,200,150,0.15)' }}>
                              <svg className="w-2 h-2" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            </div>
                          ) : (
                            <div className="w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(220,50,50,0.12)', border: '1px solid rgba(220,50,50,0.35)' }}>
                              <svg className="w-2 h-2" viewBox="0 0 24 24" fill="rgba(220,50,50,0.8)"><path d="M19 13H5v-2h14v2z"/></svg>
                            </div>
                          )}
                          <span className="text-[11px] flex-1 truncate" style={{ color: isComing ? 'rgba(96,165,250,0.6)' : found ? 'rgba(0,0,0,0.75)' : 'rgba(220,50,50,0.75)' }}>
                            {PARAM_LABELS[key]}
                          </span>
                          {isComing && (
                            <span className="text-[9px] px-1 py-px rounded flex-shrink-0" style={{ background: 'rgba(96,165,250,0.12)', color: 'rgba(96,165,250,0.8)' }}>
                              soon
                            </span>
                          )}
                          {!isComing && !found && (
                            <span className="text-[9px] flex-shrink-0" style={{ color: 'rgba(220,50,50,0.4)' }}>—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && orderedSites.length > 0 && (
        <div className="px-4 py-2 border-t border-white/8" style={{ background: 'var(--subtle-bg)' }}>
          <p className="text-[10px] text-white/30">
            {siteStats.filter(s => s.count > 0).length} of {scraperSitesAll.length} sites found results
          </p>
        </div>
      )}
    </div>
  )
}

// ─── param key → card field mapping ──────────────────────────────────────────
// Used by both cards to gate visibility on the Search Parameters settings.
const FIELD_PARAM_KEY: Record<string, string> = {
  'Position':               'position',
  'Height':                 'height',
  'Age':                    'age',
  'Date of Birth':          'dateOfBirth',
  'Foot':                   'preferredFoot',
  'Nationality':            'nationality',
  'Passports':              'passports',
  'Club':                   'team',
  'League':                 'league',
  'Joining Date':           'joiningDate',
  'Contract Expiry':        'contractExpiry',
  'Market Value':           'marketValue',
  'FM Wages':               'fmWages',
  'Fee Expectation':        'transferFeeExpect',
  'Fee (Real)':             'transferFeeReal',
  'Salary Expectation':     'salaryExpect',
  'Salary (Real)':          'salaryReal',
  'Sent by / Scout Name':   'sentBy',
  'Recent Form':            'recentForm',
  'Transfermarkt':          'transfermarktLink',
  'Sofascore':              'sofascoreLink',
  'Instagram':              'instagramLink',
  'Highlights':             'highlightsLink',
}

function formatContractDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function formatDateStr(val: string | null | undefined): string | null {
  if (!val) return null
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Player Card (populated with search results) ───────────────────────────────

function PlayerCard({ player, selected, onToggleSelect, onDataChange, userName, visibleParams }: {
  player: PlayerResult
  selected: boolean
  onToggleSelect: () => void
  onDataChange: (data: PlayerEditData) => void
  userName: string
  visibleParams: Set<string>
}) {
  const show = (key: string) => visibleParams.size === 0 || visibleParams.has(key)

  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<PlayerEditData>({
    position: player.position ?? '',
    nationality: player.nationality ?? '',
    clubName: player.team ?? '',
    league: player.league ?? '',
    dateOfBirth: player.dateOfBirth ?? '',
    preferredFoot: player.preferredFoot ?? '',
    heightCm: player.heightCm?.toString() ?? '',
    passports: player.passports ?? '',
    marketValue: player.marketValue ?? '',
    fmWages: player.fmWages ?? '',
    joiningDate: player.joiningDate ?? '',
    contractExpiry: player.contractUntil ?? '',
    fmAttributes: player.fmAttributes ?? '',
    transferFeeExpect: '',
    transferFeeReal: '',
    salaryExpect: '',
    salaryReal: '',
    recentForm: '',
    highlights: '',
    tmUrl: player.transfermarktUrl ?? '',
    scUrl: player.sofascoreUrl ?? '',
    igUrl: '',
    customExtras: [],
  })

  useEffect(() => { if (!selected) setEditMode(false) }, [selected])

  function updateField(key: keyof Omit<PlayerEditData, 'customExtras'>, val: string) {
    const next = { ...editData, [key]: val }
    setEditData(next)
    onDataChange(next)
  }
  function addExtra() {
    const next = { ...editData, customExtras: [...editData.customExtras, { key: '', value: '' }] }
    setEditData(next); onDataChange(next)
  }
  function updateExtra(i: number, field: 'key' | 'value', val: string) {
    const extras = editData.customExtras.map((e, idx) => idx === i ? { ...e, [field]: val } : e)
    const next = { ...editData, customExtras: extras }
    setEditData(next); onDataChange(next)
  }
  function removeExtra(i: number) {
    const extras = editData.customExtras.filter((_, idx) => idx !== i)
    const next = { ...editData, customExtras: extras }
    setEditData(next); onDataChange(next)
  }

  const dateAdded = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const dobStr = editData.dateOfBirth || player.dateOfBirth
  const dobDate = dobStr ? new Date(dobStr) : null
  const age = dobDate && !isNaN(dobDate.getTime())
    ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: 'var(--card-bg)',
        boxShadow: selected ? '0 0 0 2px #00c896, 0 8px 32px rgba(0,200,150,0.1)' : 'var(--card-shadow)',
        borderColor: selected ? '#00c896' : 'var(--border)',
      }}
    >
      {/* Header — click to select */}
      <div className="flex items-center gap-4 p-5 border-b border-white/5 cursor-pointer" onClick={onToggleSelect}>
        {/* Checkbox */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: selected ? '#00c896' : 'transparent', border: `2px solid ${selected ? '#00c896' : 'var(--border-strong)'}` }}
        >
          {selected && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#000"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
        </div>

        {/* Photo */}
        {show('photo') && (
          <div
            className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {player.photo
              ? <img src={player.photo} alt={player.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
              : <span className="text-xl font-bold" style={{ color: 'var(--text-faint)' }}>{player.name[0]}</span>
            }
          </div>
        )}

        {/* Name + tags */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-tight mb-1.5">{player.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {(editData.position || player.position) && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>{normalizePos(editData.position || player.position || '')}</span>
            )}
            {(editData.clubName || player.team)         && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{editData.clubName || player.team}</span>}
            {(editData.nationality || player.nationality) && <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{editData.nationality || player.nationality}</span>}
            {age                                          && <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{age} yrs</span>}
          </div>
        </div>

        {/* Source chips — one per contributing scraper */}
        <div className="flex flex-col gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {player.sources.map(src => {
            const url = src === 'Transfermarkt' ? player.transfermarktUrl
                      : src === 'Sofascore'     ? player.sofascoreUrl
                      : src === 'FMInside'      ? player.fmInsideUrl
                      : null
            return url ? (
              <a key={src} href={url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors hover:opacity-80"
                style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896bb', border: '1px solid rgba(0,200,150,0.2)' }}
              >
                {src} ↗
              </a>
            ) : (
              <span key={src} className="text-[10px] px-2 py-0.5 rounded-md"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}
              >
                {src}
              </span>
            )
          })}
        </div>

        {/* Edit button — only visible when selected */}
        {selected && (
          <button
            onClick={e => { e.stopPropagation(); setEditMode(m => !m) }}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={editMode
              ? { background: 'rgba(0,200,150,0.15)', color: '#00c896', border: '1px solid rgba(0,200,150,0.4)' }
              : { background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
            }
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Edit Player
          </button>
        )}
      </div>

      {/* Body — 3 columns */}
      <div className="grid grid-cols-3 divide-x divide-white/5">
        {/* Physical */}
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Physical</p>
          <div className="space-y-2.5">
            {show('position')      && <EditableField label="Position"     editMode={editMode} displayValue={normalizePos(editData.position) || null} editValue={editData.position}     onChange={v => updateField('position', v)} />}
            {show('height')        && <EditableField label="Height"       editMode={editMode} displayValue={editData.heightCm ? `${editData.heightCm} cm` : null} editValue={editData.heightCm} onChange={v => updateField('heightCm', v)} />}
            {show('age')           && <CardField label="Age"              value={age ? `${age} yrs` : null} />}
            {show('dateOfBirth')   && <EditableField label="Date of Birth" editMode={editMode} displayValue={formatDateStr(editData.dateOfBirth)} editValue={editData.dateOfBirth} onChange={v => updateField('dateOfBirth', v)} />}
            {show('preferredFoot') && <EditableField label="Foot"         editMode={editMode} displayValue={editData.preferredFoot || null} editValue={editData.preferredFoot} onChange={v => updateField('preferredFoot', v)} />}
            {show('nationality')   && <EditableField label="Nationality"  editMode={editMode} displayValue={editData.nationality || null}   editValue={editData.nationality}  onChange={v => updateField('nationality', v)} />}
            {show('passports')     && <EditableField label="Passports"    editMode={editMode} displayValue={editData.passports || null}     editValue={editData.passports}    onChange={v => updateField('passports', v)} />}
          </div>
        </div>

        {/* Contract & Value */}
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Contract & Value</p>
          <div className="space-y-2.5">
            {show('team')              && <EditableField label="Club"            editMode={editMode} displayValue={editData.clubName || null}       editValue={editData.clubName}       onChange={v => updateField('clubName', v)} />}
            {show('league')            && <EditableField label="League"          editMode={editMode} displayValue={editData.league || null}         editValue={editData.league}         onChange={v => updateField('league', v)} />}
            {show('joiningDate')       && <EditableField label="Joining Date"    editMode={editMode} displayValue={formatDateStr(editData.joiningDate)}    editValue={editData.joiningDate}    onChange={v => updateField('joiningDate', v)} />}
            {show('contractExpiry')    && <EditableField label="Contract Expiry" editMode={editMode} displayValue={formatDateStr(editData.contractExpiry)}  editValue={editData.contractExpiry} onChange={v => updateField('contractExpiry', v)} />}
            {show('marketValue')       && <EditableField label="Market Value"    editMode={editMode} displayValue={editData.marketValue || null}    editValue={editData.marketValue}    onChange={v => updateField('marketValue', v)} highlight />}
            {show('fmWages')           && <EditableField label="FM Wages"        editMode={editMode} displayValue={editData.fmWages || null}        editValue={editData.fmWages}        onChange={v => updateField('fmWages', v)} />}
            {show('transferFeeExpect') && <EditableField label="Fee Expectation"   editMode={editMode} displayValue={editData.transferFeeExpect || null} editValue={editData.transferFeeExpect} onChange={v => updateField('transferFeeExpect', v)} />}
            {show('transferFeeReal')   && <EditableField label="Fee (Real)"         editMode={editMode} displayValue={editData.transferFeeReal || null}   editValue={editData.transferFeeReal}   onChange={v => updateField('transferFeeReal', v)} />}
            {show('salaryExpect')      && <EditableField label="Salary Expectation" editMode={editMode} displayValue={editData.salaryExpect || null}      editValue={editData.salaryExpect}      onChange={v => updateField('salaryExpect', v)} />}
            {show('salaryReal')        && <EditableField label="Salary (Real)"      editMode={editMode} displayValue={editData.salaryReal || null}        editValue={editData.salaryReal}        onChange={v => updateField('salaryReal', v)} />}
          </div>
        </div>

        {/* Scout Info */}
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Scout Info</p>
          <div className="space-y-2.5">
            {/* Added — always visible */}
            <CardField label="Added" value={dateAdded} />
            {show('sentBy')            && <CardField label="Sent by / Scout Name" value={userName} />}
            {show('recentForm')        && <EditableField label="Recent Form"   editMode={editMode} displayValue={editData.recentForm || null}  editValue={editData.recentForm}  onChange={v => updateField('recentForm', v)} />}
            {show('transfermarktLink') && <EditableField label="Transfermarkt" editMode={editMode} displayValue={editData.tmUrl || null}      editValue={editData.tmUrl}      onChange={v => updateField('tmUrl', v)} isLink />}
            {show('sofascoreLink')     && <EditableField label="Sofascore"     editMode={editMode} displayValue={editData.scUrl || null}      editValue={editData.scUrl}      onChange={v => updateField('scUrl', v)} isLink />}
            {show('instagramLink')     && <EditableField label="Instagram"     editMode={editMode} displayValue={editData.igUrl || null}      editValue={editData.igUrl}      onChange={v => updateField('igUrl', v)} isLink />}
            {show('highlightsLink')    && <EditableField label="Highlights"    editMode={editMode} displayValue={editData.highlights || null} editValue={editData.highlights} onChange={v => updateField('highlights', v)} isLink />}
          </div>

          {/* Custom extras — only in edit mode */}
          {editMode && (
            <div className="mt-3 pt-2.5 border-t border-[#00c896]/15">
              {editData.customExtras.map((extra, i) => (
                <div key={i} className="flex items-center gap-1 mb-1.5">
                  <input
                    type="text" value={extra.key} onChange={e => updateExtra(i, 'key', e.target.value)}
                    placeholder="Field" onClick={e => e.stopPropagation()}
                    className="flex-1 min-w-0 text-[11px] rounded px-1.5 py-0.5 focus:outline-none"
                    style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.3)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="text" value={extra.value} onChange={e => updateExtra(i, 'value', e.target.value)}
                    placeholder="Value" onClick={e => e.stopPropagation()}
                    className="flex-1 min-w-0 text-[11px] rounded px-1.5 py-0.5 focus:outline-none"
                    style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.3)', color: 'var(--text-primary)' }}
                  />
                  <button onClick={() => removeExtra(i)} className="flex-shrink-0 transition-colors" style={{ color: 'rgba(255,255,255,0.2)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </div>
              ))}
              <button onClick={e => { e.stopPropagation(); addExtra() }}
                className="flex items-center gap-1 text-[10px] mt-0.5 transition-colors"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#00c896' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Add field
              </button>
            </div>
          )}

          {show('description') && player.description && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>Bio</p>
              <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>{player.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section — 3 columns aligned with body */}
      {(show('heatMap') || show('seasonStats') || show('fmAttributes')) && (
        <div className="border-t border-white/5 grid grid-cols-3 divide-x divide-white/5" style={{ background: 'var(--subtle-bg)' }}>

          {/* Col 1: Heat Map */}
          <div className="p-4 flex flex-col gap-2">
            {show('heatMap') && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>Heat Map</p>
                <div className="flex-1 rounded-lg flex items-center justify-center" style={{ minHeight: 80, border: '1px dashed var(--border)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Sofascore · coming soon</span>
                </div>
              </>
            )}
          </div>

          {/* Col 2: Season Stats */}
          <div className="p-4 flex flex-col gap-2">
            {show('seasonStats') && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>Season Stats</p>
                <div className="flex-1 rounded-lg flex items-center justify-center" style={{ minHeight: 80, border: '1px dashed var(--border)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Transfermarkt · coming soon</span>
                </div>
              </>
            )}
          </div>

          {/* Col 3: FM Attributes radar (aligns with Physical column) */}
          {show('fmAttributes') && (
            <div className="p-4 flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: editMode ? 'rgba(0,200,150,0.8)' : 'var(--text-faint)' }}>FM Attributes</p>
              {editMode ? (
                <textarea
                  value={editData.fmAttributes}
                  onChange={e => { const next = { ...editData, fmAttributes: e.target.value }; setEditData(next); onDataChange(next) }}
                  onClick={e => e.stopPropagation()}
                  placeholder="e.g. Pace V15, Shoot V12 / Def V8, Head V6"
                  rows={4}
                  className="flex-1 text-[11px] rounded-lg p-2 focus:outline-none resize-none"
                  style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.3)', color: 'var(--text-primary)', caretColor: '#00c896' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.6)'; e.currentTarget.style.background = 'rgba(0,200,150,0.12)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)'; e.currentTarget.style.background = 'rgba(0,200,150,0.07)' }}
                />
              ) : editData.fmAttributes ? (
                <FMRadarChart fmAttributes={editData.fmAttributes} />
              ) : (
                <div className="flex-1 rounded-lg flex items-center justify-center" style={{ minHeight: 80, border: '1px dashed var(--border)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>FMInside · no data</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}


// ─── Card field helpers ────────────────────────────────────────────────────────

function CardField({ label, value, highlight = false, inline = false }: {
  label: string
  value: string | null | undefined
  highlight?: boolean
  inline?: boolean
}) {
  const hasValue = value != null && value !== ''
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}:</span>
        <span className="text-[11px] font-medium" style={{ color: hasValue ? (highlight ? '#00c896' : 'var(--text-secondary)') : 'var(--text-faint)' }}>
          {value ?? '—'}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-[11px] font-medium text-right" style={{ color: hasValue ? (highlight ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}


function EditableField({ label, editMode, displayValue, editValue, onChange, highlight, isLink }: {
  label: string
  editMode: boolean
  displayValue: string | null | undefined
  editValue: string
  onChange: (v: string) => void
  highlight?: boolean
  isLink?: boolean
}) {
  if (!editMode) {
    if (isLink && displayValue && displayValue.startsWith('http')) {
      return (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
          <a
            href={displayValue} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[11px] font-medium text-right hover:underline"
            style={{ color: '#00c896' }}
          >
            View ↗
          </a>
        </div>
      )
    }
    return <CardField label={label} value={displayValue} highlight={highlight} />
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(0,200,150,0.8)' }}>{label}</span>
      <input
        type="text"
        value={editValue}
        onChange={e => onChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        className="text-[11px] font-medium text-right focus:outline-none rounded px-1.5 py-0.5"
        style={{
          flex: 1, maxWidth: 130,
          background: 'rgba(0,200,150,0.07)',
          border: '1px solid rgba(0,200,150,0.3)',
          color: 'var(--text-primary)',
          caretColor: '#00c896',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.6)'; e.currentTarget.style.background = 'rgba(0,200,150,0.12)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)'; e.currentTarget.style.background = 'rgba(0,200,150,0.07)' }}
      />
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
    if (v != null && String(v).trim() !== '') out.push({ sourceName: p.sources.join(', '), value: String(v) })
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

function ImportModal({ players, databases, editedData, onClose }: {
  players: PlayerResult[]
  databases: Database[]
  editedData: Record<string, PlayerEditData>
  onClose: () => void
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Derived player info for the summary header
  const bestName    = pickBest(getSources(players, p => p.name)).trim().split(/\s+/)
  const firstName   = bestName[0] ?? ''
  const lastName    = bestName.slice(1).join(' ')
  const position    = pickBest(getSources(players, p => p.position))
  const clubName    = pickBest(getSources(players, p => p.team))
  const photoSrc    = pickBest(getSources(players, p => p.photo)) || players[0]?.photo || null
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Player'

  function toggleDb(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleImport() {
    if (selectedIds.size === 0) return
    setLoading(true)
    setError('')

    // Merge edit data from all selected players' cards
    const allEd = players.map(p => editedData[p.id]).filter(Boolean)
    const firstEd = allEd[0]

    const addCf = (key: string, getter: (p: PlayerResult) => string | null | undefined, override?: string) => {
      const v = override?.trim() || pickBest(getSources(players, getter))
      return v ? { [key]: v } : {}
    }

    const edCf: Record<string, string> = {}
    for (const ed of allEd) {
      if (ed.transferFeeExpect) edCf.transferFeeExpect = ed.transferFeeExpect
      if (ed.transferFeeReal)   edCf.transferFeeReal   = ed.transferFeeReal
      if (ed.salaryExpect)      edCf.salaryExpect       = ed.salaryExpect
      if (ed.salaryReal)        edCf.salaryReal         = ed.salaryReal
      if (ed.recentForm)        edCf.recentForm         = ed.recentForm
      if (ed.highlights)        edCf.highlights         = ed.highlights
      if (ed.igUrl)             edCf.instagram          = ed.igUrl
      for (const extra of ed.customExtras) {
        if (extra.key.trim() && extra.value.trim()) edCf[extra.key.trim()] = extra.value.trim()
      }
    }

    const tmUrl    = firstEd?.tmUrl?.trim()  || pickBest(getSources(players, p => p.transfermarktUrl))
    const scUrl    = firstEd?.scUrl?.trim()  || pickBest(getSources(players, p => p.sofascoreUrl))
    const fmUrl    = pickBest(getSources(players, p => p.fmInsideUrl))
    const sourceUrl = tmUrl || scUrl || fmUrl || undefined

    const customFields = {
      ...addCf('foot',          p => p.preferredFoot,  firstEd?.preferredFoot),
      ...addCf('passports',     p => p.passports,       firstEd?.passports),
      ...addCf('league',        p => p.league,          firstEd?.league),
      ...addCf('joiningDate',   p => p.joiningDate,     firstEd?.joiningDate),
      ...addCf('contractExpiry',p => p.contractUntil,   firstEd?.contractExpiry),
      ...addCf('fmWages',       p => p.fmWages,         firstEd?.fmWages),
      ...addCf('fmAttributes',  p => p.fmAttributes,    firstEd?.fmAttributes),
      ...addCf('description',   p => p.description),
      ...(tmUrl ? { transfermarktUrl: tmUrl } : {}),
      ...(scUrl ? { sofascoreUrl: scUrl } : {}),
      ...(fmUrl ? { fmInsideUrl: fmUrl } : {}),
      ...addCf('photo',         p => p.photo),
      ...edCf,
    }

    const heightStr = firstEd?.heightCm?.trim() || pickBest(getSources(players, p => p.heightCm?.toString()))
    const mktStr    = firstEd?.marketValue?.trim() || pickBest(getSources(players, p => p.marketValue))

    const sourceName = [...new Set(players.flatMap(p => p.sources))].join(', ')
    const body = {
      firstName:   firstName  || '-',
      lastName:    lastName   || '-',
      position:    normalizePos(firstEd?.position?.trim() || position || '') || null,
      clubName:    firstEd?.clubName?.trim()    || clubName    || null,
      nationality: firstEd?.nationality?.trim() || pickBest(getSources(players, p => p.nationality)) || null,
      dateOfBirth: firstEd?.dateOfBirth?.trim() || pickBest(getSources(players, p => p.dateOfBirth)) || null,
      heightCm:    heightStr ? parseInt(heightStr) : null,
      marketValue: parseMarketValueToNumber(mktStr || null),
      sourceName,
      sourceUrl,
      customFields,
    }

    try {
      const results = await Promise.all(
        [...selectedIds].map(dbId =>
          fetch(`/api/databases/${dbId}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).then(r => r.json().then(d => ({ dbId, ok: r.ok, data: d })))
        )
      )
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) {
        setError(failed[0].data?.error || 'Import failed for one or more databases')
        setLoading(false)
        return
      }
      const firstDbId = [...selectedIds][0]
      const firstResult = results.find(r => r.dbId === firstDbId)
      if (firstResult?.data?.id) {
        router.push(`/databases/${firstDbId}/players/${firstResult.data.id}`)
      } else {
        onClose()
      }
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 max-h-[90vh] flex flex-col" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-1">Import into database</h2>
          <div className="flex items-center gap-3 p-3 rounded-xl mt-2" style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)' }}>
            {photoSrc && (
              <img src={photoSrc} alt={displayName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {[position, clubName].filter(Boolean).join(' · ') || 'Player'}
              </p>
            </div>
          </div>
        </div>

        {/* Database list */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>Choose databases</p>
          {databases.length === 0 ? (
            <p className="text-sm text-red-400">You have no databases. Create one first.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {databases.map(db => {
                const checked = selectedIds.has(db.id)
                return (
                  <label key={db.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all" style={{
                    background: checked ? 'rgba(0,200,150,0.08)' : 'var(--subtle-bg)',
                    border: `1px solid ${checked ? 'rgba(0,200,150,0.3)' : 'var(--border)'}`,
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDb(db.id)} className="accent-[#00c896] w-4 h-4 flex-shrink-0" />
                    <span className="text-sm text-white">{db.name}</span>
                    {checked && <span className="ml-auto text-[10px]" style={{ color: '#00c896' }}>Selected</span>}
                  </label>
                )
              })}
            </div>
          )}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Footer */}
        {loading ? (
          <div className="px-6 py-5 border-t border-white/5 flex flex-col items-center gap-3 flex-shrink-0">
            <ScoutLinkBallLoader size={64} />
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Importing player…</p>
          </div>
        ) : (
          <div className="px-6 py-4 border-t border-white/5 flex gap-3 flex-shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm transition-colors" style={{ background: 'var(--hover-bg)', color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
            <button onClick={handleImport} disabled={selectedIds.size === 0 || databases.length === 0} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
              {selectedIds.size > 1 ? `Import to ${selectedIds.size} Lists` : 'Import'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
