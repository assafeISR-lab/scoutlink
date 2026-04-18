'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PARAM_KEYS, PARAM_LABELS, loadActive, loadCustomActive, loadCustomKeys } from './SearchParamsPanel'

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

export default function SearchClient({ databases, userName }: { databases: Database[]; userName: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerResult[]>([])
  const [siteStats, setSiteStats] = useState<SiteStat[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [noSitesSelected, setNoSitesSelected] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [merging, setMerging] = useState(false)
  const [visibleParams, setVisibleParams] = useState<Set<string>>(new Set())
  const [customKeys, setCustomKeys] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const active = loadActive()
    const customActive = loadCustomActive()
    const customK = loadCustomKeys()
    setVisibleParams(new Set([...active, ...customActive]))
    setCustomKeys(customK)
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
          <div className="flex flex-col gap-4">
            {results.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                selected={selectedIds.has(player.id)}
                onToggleSelect={() => toggleSelect(player.id)}
                userName={userName}
                visibleParams={visibleParams}
              />
            ))}
          </div>
        </div>
      )}

              {/* Import modal */}
              {merging && (
                <ImportModal
                  players={results.filter(p => selectedIds.has(p.id))}
                  databases={databases}
                  onClose={() => setMerging(false)}
                />
              )}
            </div>{/* end left column */}

            {/* Right column: Search Coverage + Parameter Coverage */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-4">
              <div className="rounded-2xl border border-white/8 overflow-hidden flex flex-col" style={{ background: 'var(--card-bg)' }}>
                <div className="px-4 py-3 border-b border-white/8 flex-shrink-0">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Search Coverage</p>
                </div>
                {loading ? (
          <div className="px-4 py-5 flex flex-col gap-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--hover-bg)' }} />
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
                {/* Site info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: site.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {site.name}
                  </p>
                  {site.error ? (
                    <p className="text-[10px]" style={{ color: '#ff6464aa' }}>Did not succeed to scrape</p>
                  ) : site.noScraper ? (
                    <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>No scraper available</p>
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
                  <div className="px-4 py-2.5 border-t border-white/8" style={{ background: 'var(--subtle-bg)' }}>
                    <p className="text-[10px] text-white/30">
                      {siteStats.filter(s => s.count > 0).length} of {siteStats.filter(s => !s.noScraper).length} scraped sites found results
                    </p>
                  </div>
                )}
              </div>

              {/* Parameter Coverage Panel */}
              <ParameterCoveragePanel results={results} searched={searched} loading={loading} visibleParams={visibleParams} customKeys={customKeys} />
            </div>{/* end right column */}

          </div>
          )}{/* end searched condition */}
        </div>{/* end p-6 */}
      </div>{/* end top zone */}

    </div>
  )
}

// ─── Parameter Coverage Panel ─────────────────────────────────────────────────

/** Map every param key to whether it was found in any merged player result */
function isFound(results: PlayerResult[], key: string): boolean {
  if (results.length === 0) return false
  switch (key) {
    case 'photo':            return results.some(p => !!p.photo)
    case 'nationality':      return results.some(p => !!p.nationality)
    case 'age':
    case 'dateOfBirth':      return results.some(p => !!p.dateOfBirth)
    case 'height':           return results.some(p => p.heightCm != null)
    case 'weight':           return results.some(p => p.weightKg != null)
    case 'team':             return results.some(p => !!p.team)
    case 'position':         return results.some(p => !!p.position)
    case 'marketValue':      return results.some(p => !!p.marketValue)
    case 'description':      return results.some(p => !!p.description)
    case 'transfermarktLink':return results.some(p => !!p.transfermarktUrl)
    case 'sofascoreLink':    return results.some(p => !!p.sofascoreUrl)
    case 'fmInsideUrl':      return results.some(p => !!p.fmInsideUrl)
    // Fields not yet returned by any scraper (always not found from search)
    case 'passports':
    case 'preferredFoot':
    case 'league':
    case 'joiningDate':
    case 'contractExpiry':
    case 'seasonStats':
    case 'fmWages':
    case 'heatMap':
    case 'keyStrengths':
    case 'areasForImprovement':
    // Manual-only fields (filled by user in the card, not from scrapers)
    case 'transferFeeExpect':
    case 'transferFeeReal':
    case 'salaryExpect':
    case 'salaryReal':
    case 'recentForm':
    case 'instagramLink':
    case 'highlightsLink':
    case 'sentBy':
      return false
    default:
      return false
  }
}

function ParameterCoveragePanel({ results, searched, loading, visibleParams, customKeys }: {
  results: PlayerResult[]
  searched: boolean
  loading: boolean
  visibleParams: Set<string>
  customKeys: string[]
}) {
  // Build the ordered list of active keys: built-in first, then custom
  const activeBuiltin = PARAM_KEYS.filter(k => visibleParams.has(k))
  const activeCustom  = customKeys.filter(k => visibleParams.has(k))
  const allActive     = [...activeBuiltin, ...activeCustom]

  const foundCount = allActive.filter(k => isFound(results, k)).length

  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
      <div className="px-4 py-3 border-b border-white/8">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Parameter Coverage</p>
      </div>

      {!searched ? (
        <div className="flex items-center justify-center px-4 py-6">
          <p className="text-xs text-white/25 text-center leading-relaxed">Run a search to see<br/>which parameters were found</p>
        </div>
      ) : loading ? (
        <div className="px-4 py-4 flex flex-col gap-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-6 rounded-lg animate-pulse" style={{ background: 'var(--hover-bg)' }} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
          {allActive.map(key => {
            const found = isFound(results, key)
            const label = PARAM_LABELS[key as keyof typeof PARAM_LABELS] ?? key
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-2">
                {found ? (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.15)' }}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--hover-bg)' }}>
                    <svg className="w-2.5 h-2.5 opacity-20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
                  </div>
                )}
                <span className="text-xs flex-1" style={{ color: found ? 'var(--text-secondary)' : 'var(--text-faint)' }}>
                  {label}
                </span>
                {found && (
                  <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {searched && !loading && allActive.length > 0 && (
        <div className="px-4 py-2 border-t border-white/8" style={{ background: 'var(--subtle-bg)' }}>
          <p className="text-[10px] text-white/30">
            {foundCount} of {allActive.length} parameters found
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
  'Weight':                 'weight',
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

// ─── Player Card (populated with search results) ───────────────────────────────

function PlayerCard({ player, selected, onToggleSelect, userName, visibleParams }: {
  player: PlayerResult
  selected: boolean
  onToggleSelect: () => void
  userName: string
  visibleParams: Set<string>
}) {
  const show = (key: string) => visibleParams.size === 0 || visibleParams.has(key)
  const seasons = ['25/26', '24/25', '23/24', '22/23']

  const [transferFeeExpect, setTransferFeeExpect] = useState('')
  const [transferFeeReal,   setTransferFeeReal]   = useState('')
  const [salaryExpect,      setSalaryExpect]       = useState('')
  const [salaryReal,        setSalaryReal]         = useState('')

  // Link inputs — pre-fill from merged source URLs
  const [tmUrl, setTmUrl] = useState(player.transfermarktUrl ?? '')
  const [scUrl, setScUrl] = useState(player.sofascoreUrl ?? '')
  const [igUrl, setIgUrl] = useState('')
  const [highlights,   setHighlights]   = useState('')
  const [recentForm,   setRecentForm]   = useState('')

  const dateAdded = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
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
            {player.position && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>{player.position}</span>
            )}
            {player.team      && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{player.team}</span>}
            {player.nationality && <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{player.nationality}</span>}
            {age               && <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{age} yrs</span>}
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
      </div>

      {/* Body — 3 columns */}
      <div className="grid grid-cols-3 divide-x divide-white/5">
        {/* Physical */}
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Physical</p>
          <div className="space-y-2.5">
            {show('position')    && <CardField label="Position"     value={player.position} />}
            {show('height')      && <CardField label="Height"       value={player.heightCm ? `${player.heightCm} cm` : null} />}
            {show('weight')      && <CardField label="Weight"       value={player.weightKg ? `${player.weightKg} kg` : null} />}
            {show('age')         && <CardField label="Age"          value={age ? `${age} yrs` : null} />}
            {show('dateOfBirth') && <CardField label="Date of Birth" value={player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} />}
            {show('preferredFoot') && <CardField label="Foot"       value={null} />}
            {show('nationality') && <CardField label="Nationality"  value={player.nationality} />}
            {show('passports')   && <CardField label="Passports"    value={null} />}
          </div>
        </div>

        {/* Contract & Value */}
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Contract & Value</p>
          <div className="space-y-2.5">
            {show('team')              && <CardField label="Club"            value={player.team} />}
            {show('league')            && <CardField label="League"          value={null} />}
            {show('joiningDate')       && <CardField label="Joining Date"    value={null} />}
            {show('contractExpiry')    && <CardField label="Contract Expiry" value={null} />}
            {show('marketValue')       && <CardField label="Market Value"    value={player.marketValue} highlight />}
            {show('fmWages')           && <CardField label="FM Wages"        value={null} />}
            {show('transferFeeExpect') && <EditableCardField label="Fee Expectation"   value={transferFeeExpect} onChange={setTransferFeeExpect} />}
            {show('transferFeeReal')   && <EditableCardField label="Fee (Real)"         value={transferFeeReal}   onChange={setTransferFeeReal} />}
            {show('salaryExpect')      && <EditableCardField label="Salary Expectation" value={salaryExpect}      onChange={setSalaryExpect} />}
            {show('salaryReal')        && <EditableCardField label="Salary (Real)"      value={salaryReal}        onChange={setSalaryReal} />}
          </div>
        </div>

        {/* Scout Info */}
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>Scout Info</p>
          <div className="space-y-2.5">
            {/* Added — always visible */}
            <CardField label="Added" value={dateAdded} />
            {show('sentBy')            && <CardField label="Sent by / Scout Name" value={userName} />}
            {show('recentForm')        && <EditableCardField label="Recent Form"  value={recentForm}  onChange={setRecentForm} />}
            {show('transfermarktLink') && <LinkInputField label="Transfermarkt"   value={tmUrl}       onChange={setTmUrl} />}
            {show('sofascoreLink')     && <LinkInputField label="Sofascore"       value={scUrl}       onChange={setScUrl} />}
            {show('instagramLink')     && <LinkInputField label="Instagram"       value={igUrl}       onChange={setIgUrl} />}
            {show('highlightsLink')    && <EditableCardField label="Highlights"   value={highlights}  onChange={setHighlights} />}
          </div>
          {show('description') && player.description && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>Bio</p>
              <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>{player.description}</p>
            </div>
          )}
        </div>
      </div>

      {show('heatMap') && (
        <div className="border-t border-white/5 px-4 py-3 flex items-center gap-4" style={{ background: 'var(--subtle-bg)' }}>
          <p className="text-[10px] uppercase tracking-widest font-medium flex-shrink-0 w-20" style={{ color: 'var(--text-muted)' }}>Heat Map</p>
          <div className="flex-1 h-14 rounded-lg flex items-center justify-center" style={{ background: 'var(--subtle-bg)', border: '1px dashed var(--border)' }}>
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Sofascore · coming soon</span>
          </div>
        </div>
      )}

      {(show('keyStrengths') || show('areasForImprovement')) && (
        <div className="flex items-center gap-6 px-4 py-3 border-t border-white/5" style={{ background: 'var(--subtle-bg)' }}>
          <p className="text-[10px] uppercase tracking-widest font-medium flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Attributes</p>
          <div className="flex gap-8 flex-1">
            {show('keyStrengths')       && <CardField label="Key Strengths"         value={null} inline />}
            {show('areasForImprovement') && <CardField label="Areas for Improvement" value={null} inline />}
          </div>
        </div>
      )}

      {show('seasonStats') && <div className="border-t border-white/5">
        <div className="px-4 py-2 border-b border-white/5" style={{ background: 'var(--subtle-bg)' }}>
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
            <tbody className="divide-y divide-white/[0.04]">
              {seasons.map(s => (
                <tr key={s} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{s}</td>
                  {[...Array(5)].map((_, i) => (
                    <td key={i} className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-faint)' }}>—</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}
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


function LinkInputField({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const isValid = value.startsWith('http')
  return (
    <div className="flex items-center gap-3 group/link">
      {/* Label — becomes a clickable link when a valid URL is set */}
      {isValid ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] flex-shrink-0 flex items-center gap-0.5 transition-colors hover:underline"
          style={{ color: '#00c896' }}
          onClick={e => e.stopPropagation()}
        >
          {label}
          <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
          </svg>
        </a>
      ) : (
        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      )}

      {/* Editable URL input — fills remaining space */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Paste link…"
        className="text-[11px] text-right bg-transparent focus:outline-none transition-all rounded px-1.5 py-0.5 flex-1 min-w-0"
        style={{
          color: isValid ? 'rgba(0,200,150,0.7)' : value ? 'var(--text-secondary)' : 'var(--text-faint)',
          border: '1px solid var(--border)',
          caretColor: '#00c896',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'
          e.currentTarget.style.background = 'rgba(0,200,150,0.06)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background = 'transparent'
        }}
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

function EditableCardField({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 group/edit">
      <span className="text-[11px] flex-shrink-0 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
        {label}
        <svg className="w-2.5 h-2.5 opacity-0 group-hover/edit:opacity-60 transition-opacity" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="text-[11px] font-medium text-right bg-transparent focus:outline-none transition-all rounded px-1.5 py-0.5"
        style={{
          width: 90,
          color: value ? 'var(--text-primary)' : 'var(--text-faint)',
          border: '1px solid transparent',
          caretColor: '#00c896',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'
          e.currentTarget.style.background = 'rgba(0,200,150,0.06)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = value ? 'var(--text-primary)' : 'var(--text-faint)'
        }}
        onClick={e => e.stopPropagation()}
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

function ImportModal({ players, databases, onClose }: {
  players: PlayerResult[]
  databases: Database[]
  onClose: () => void
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-pick best values from sources
  const nameSources = getSources(players, p => p.name)
  const posSources  = getSources(players, p => p.position)
  const clubSources = getSources(players, p => p.team)
  const natSources  = getSources(players, p => p.nationality)
  const dobSources  = getSources(players, p => p.dateOfBirth)
  const htSources   = getSources(players, p => p.heightCm?.toString())
  const wtSources   = getSources(players, p => p.weightKg?.toString())
  const mvSources   = getSources(players, p => p.marketValue)

  const bestName    = pickBest(nameSources).trim().split(/\s+/)
  const firstName   = bestName[0] ?? ''
  const lastName    = bestName.slice(1).join(' ') || '-'
  const position    = pickBest(posSources) || null
  const clubName    = pickBest(clubSources) || null
  const nationality = pickBest(natSources) || null
  const dateOfBirth = pickBest(dobSources) || null
  const heightCm    = pickBest(htSources) ? parseInt(pickBest(htSources)) : null
  const weightKg    = pickBest(wtSources) ? parseInt(pickBest(wtSources)) : null
  const marketValue = parseMarketValueToNumber(pickBest(mvSources))
  const sourceName  = [...new Set(players.flatMap(p => p.sources))].join(', ')
  const sourceUrl   = players[0]?.transfermarktUrl ?? players[0]?.sofascoreUrl ?? players[0]?.fmInsideUrl

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
    const body = { firstName, lastName, position, clubName, nationality, dateOfBirth, heightCm, weightKg, marketValue, sourceName, sourceUrl }
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
      // Navigate to the player profile in the first selected database
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

  const displayName = [firstName, lastName === '-' ? '' : lastName].filter(Boolean).join(' ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 max-h-[90vh] flex flex-col" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-1">Import into database</h2>
          {/* Player summary */}
          <div className="flex items-center gap-3 p-3 rounded-xl mt-2" style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)' }}>
            {players[0]?.photo && (
              <img src={players[0].photo} alt={displayName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
        <div className="px-6 py-4 border-t border-white/5 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors" style={{ background: 'var(--hover-bg)' }}>Cancel</button>
          <button onClick={handleImport} disabled={loading || selectedIds.size === 0 || databases.length === 0} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
            {loading ? 'Importing...' : selectedIds.size > 1 ? `Import to ${selectedIds.size} Lists` : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
