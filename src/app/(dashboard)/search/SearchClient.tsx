'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'
import { PARAM_KEYS, PARAM_LABELS, PARAM_SOURCES, type ParamKey, loadActive, loadCustomActive, loadParamSources, buildParamsBySource } from './SearchParamsPanel'
import FMRadarChart from '@/components/FMRadarChart'
import FMAttributesEditor from '@/components/FMAttributesEditor'
import SeasonStatsGrid, { SeasonStatsEditor } from '@/components/SeasonStatsGrid'
import LinkChips from '@/components/LinkChips'
import HeatmapDisplay from '@/components/HeatmapDisplay'
import { positionPillStyle } from '@/lib/positionColor'
import DuplicateWarningModal, { type DuplicateMatch } from '@/components/DuplicateWarningModal'

const COMING_SOON = new Set<string>()

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
  preferredFoot: string | null
  contractUntil: string | null
  passports: string | null
  joiningDate: string | null
  photo: string | null
  description: string | null
  marketValue: string | null
  fmWages: string | null
  fmAttributes: string | null
  seasonStats: string | null
  heatmap: string | null
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
  seasonStats: string
  heatmap: string
  description: string
  available: boolean
  playsNational: boolean
  transferFeeExpect: string
  transferFeeReal: string
  salaryExpect: string
  salaryReal: string
  playerPhone: string
  agentName: string
  agentPhone: string
  sentBy: string
  recentForm: string
  injuryType: string
  injuryReturn: string
  highlights: string
  tmUrl: string
  scUrl: string
  fmUrl: string
  igUrl: string
  twitterUrl: string
  tiktokUrl: string
  customExtras: { key: string; value: string }[]
}

export default function SearchClient({ databases, userName, panelMode, targetDatabaseId, targetListName, onPlayerAdded, onClose }: {
  databases: Database[]
  userName: string
  panelMode?: boolean
  targetDatabaseId?: string
  targetListName?: string
  onPlayerAdded?: (playerName: string) => void
  onClose?: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerResult[]>([])
  const [siteStats, setSiteStats] = useState<SiteStat[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [noSitesSelected, setNoSitesSelected] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [visibleParams, setVisibleParams] = useState<Set<string>>(new Set())
  const [activeTabIdx, setActiveTabIdx] = useState(0)
  const [coverageOpen, setCoverageOpen] = useState(false)

  const paramsBySource = useMemo(() => buildParamsBySource(loadParamSources()), [])
  const inputRef = useRef<HTMLInputElement>(null)
  const coverageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const active = loadActive()
    const customActive = loadCustomActive()
    setVisibleParams(new Set([...active, ...customActive]))
  }, [])

  // Close coverage dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (coverageRef.current && !coverageRef.current.contains(e.target as Node)) {
        setCoverageOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setNoSitesSelected(false)
    setUrlError('')
    setSiteStats([])
    setActiveTabIdx(0)
    setCoverageOpen(false)
    try {
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
      const isUrl = /^https?:\/\//i.test(query.trim())
      if (data.urlError) {
        setUrlError(data.urlError as string)
      } else if (players.length === 0 && !data.noSitesSelected && !isUrl) {
        players.push({
          id: `manual-${query.trim()}`,
          name: query.trim(),
          nationality: null, team: null, league: null, position: null,
          dateOfBirth: null, heightCm: null, preferredFoot: null,
          contractUntil: null, passports: null, joiningDate: null,
          photo: null, description: null, marketValue: null, fmWages: null,
          fmAttributes: null, seasonStats: null, heatmap: null, transfermarktUrl: null,
          sofascoreUrl: null, fmInsideUrl: null, sources: [],
        })
      }
      setResults(players)
      setSiteStats(data.siteStats || [])
      setNoSitesSelected(!!data.noSitesSelected)
    } catch {
      setResults([{
        id: `manual-${query.trim()}`,
        name: query.trim(),
        nationality: null, team: null, league: null, position: null,
        dateOfBirth: null, heightCm: null, preferredFoot: null,
        contractUntil: null, passports: null, joiningDate: null,
        photo: null, description: null, marketValue: null, fmWages: null,
        fmAttributes: null, seasonStats: null, heatmap: null, transfermarktUrl: null,
        sofascoreUrl: null, fmInsideUrl: null, sources: [],
      }])
      setSiteStats([])
    } finally {
      setLoading(false)
    }
  }

  const activePlayer = results[activeTabIdx] ?? null

  return (
    <div className={panelMode ? '' : '-mt-8'}>

      {/* ── Sticky top bar ─────────────────────────────────────── */}
      <div
        className={panelMode ? 'border-b' : 'sticky top-0 z-20 border-b'}
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: panelMode ? 'none' : '0 1px 6px rgba(0,0,0,.07)', ...(panelMode ? { position: 'sticky', top: 0, zIndex: 10 } : {}) }}
      >
        {/* CSS grid: auto | 1fr | auto — both rows share the same columns so
            "N results" sits under "Web Scout" and tabs align with the search input */}
        <div style={{ display: 'grid', gridTemplateColumns: panelMode ? '1fr auto' : 'auto 1fr auto', columnGap: panelMode ? 8 : 12, paddingLeft: panelMode ? 12 : 32, paddingRight: panelMode ? 12 : 32 }}>

          {/* ── Row 1, Col 1: Title (full mode only) ── */}
          {!panelMode && (
            <div className="flex items-center gap-2 py-3 flex-shrink-0">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.3)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#00c896">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Web Scout</span>
            </div>
          )}

          {/* ── Row 1, Col 2 (or 1 in panelMode): Search form ── */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 py-3" style={{ maxWidth: panelMode ? 'none' : 560 }}>
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="rgba(0,200,150,0.5)">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search player name…"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none transition-all"
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.6)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-2 rounded-xl font-semibold text-sm text-black disabled:opacity-50 transition-all flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,200,150,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>

          {/* ── Row 1, Col 3: Coverage + Close ── */}
          <div className="flex items-center gap-2 py-3 flex-shrink-0" ref={coverageRef}>
            {searched && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setCoverageOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                  style={{
                    background: coverageOpen ? 'rgba(0,200,150,0.1)' : 'var(--subtle-bg)',
                    border: `1.5px solid ${coverageOpen ? 'rgba(0,200,150,0.3)' : 'var(--border)'}`,
                    color: coverageOpen ? '#00c896' : 'var(--text-muted)',
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  Coverage
                  <svg
                    className="w-3 h-3 transition-transform duration-150"
                    style={{ transform: coverageOpen ? 'rotate(180deg)' : 'none' }}
                    viewBox="0 0 24 24" fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>

                {coverageOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50" style={{ width: 290 }}>
                    <CoveragePanel
                      siteStats={siteStats}
                      results={results}
                      loading={loading}
                      noSitesSelected={noSitesSelected}
                      paramsBySource={paramsBySource}
                    />
                  </div>
                )}
              </div>
            )}
            {panelMode && onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
                style={{ color: 'var(--text-faint)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            )}
          </div>

          {/* ── Row 2 (tabs) — only when results exist ── */}
          {searched && !loading && results.length > 0 && <>
            {/* Col 1: results count (full mode only) */}
            {!panelMode && (
              <div className="flex items-center gap-2 flex-shrink-0" style={{ height: 46, borderTop: '1px solid var(--border)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
                <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />
              </div>
            )}

            {/* Col 2 (or spans full width in panelMode): tab buttons */}
            <div className="flex items-center gap-1 overflow-x-auto" style={{ height: 46, borderTop: '1px solid var(--border)', ...(panelMode ? { gridColumn: '1 / -1' } : {}) }}>
              {results.map((player, i) => {
                const initials = player.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                const isActive = i === activeTabIdx
                return (
                  <button
                    key={player.id}
                    onClick={() => setActiveTabIdx(i)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0 transition-all text-xs font-medium"
                    style={{
                      background: isActive ? '#00c896' : 'transparent',
                      border: `1.5px solid ${isActive ? '#00c896' : 'transparent'}`,
                      color: isActive ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--hover-bg)',
                        color: isActive ? '#fff' : 'var(--text-faint)',
                      }}
                    >
                      {initials}
                    </div>
                    <span>{player.name}</span>
                    {player.team && (
                      <span className="text-[10px]" style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--text-faint)' }}>
                        · {player.team}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Col 3: empty — keeps grid structure (full mode only) */}
            {!panelMode && <div style={{ height: 46, borderTop: '1px solid var(--border)' }} />}
          </>}

        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className={panelMode ? 'px-4 pt-4 pb-4' : 'pt-[54px] pb-[18px]'}>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <ScoutLinkBallLoader size={88} />
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Searching player database…</p>
          </div>
        )}

        {/* URL scout error */}
        {!loading && urlError && (
          <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: 'rgba(255,100,100,0.3)', background: 'rgba(255,100,100,0.03)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.25)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="rgba(255,100,100,0.8)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,130,130,0.9)' }}>{urlError}</p>
          </div>
        )}

        {/* No sites selected */}
        {!loading && noSitesSelected && (
          <div className="rounded-2xl border border-dashed p-16 text-center" style={{ borderColor: 'rgba(255,159,67,0.3)', background: 'rgba(255,159,67,0.03)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,159,67,0.1)', border: '1px solid rgba(255,159,67,0.25)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ff9f43"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#ff9f43' }}>No scouting sites selected</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Check the boxes next to the sites you want to search in below</p>
          </div>
        )}

        {/* Scrape-error notice */}
        {!loading && searched && siteStats.length > 0 && siteStats.filter(s => !s.noScraper).every(s => s.error) && (
          <div className="rounded-xl px-4 py-2.5 text-xs flex items-center gap-2 mb-4" style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', color: 'rgba(255,150,150,0.8)' }}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            Search sites returned errors — no data was scraped. Fill in the card manually and import.
          </div>
        )}

        {/* Active player card */}
        {!loading && activePlayer && (
          <PlayerCard
            key={activePlayer.id}
            player={activePlayer}
            databases={databases}
            userName={userName}
            visibleParams={visibleParams}
            panelMode={panelMode}
            targetDatabaseId={targetDatabaseId}
            targetListName={targetListName}
            onPlayerAdded={onPlayerAdded}
          />
        )}

      </div>
    </div>
  )
}

// ─── Coverage Panel ───────────────────────────────────────────────────────────

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
    case 'fmAttributes':      return results.some(p => !!p.fmAttributes)
    case 'seasonStats':       return results.some(p => !!p.seasonStats)
    case 'heatMap':           return results.some(p => !!p.heatmap)
    default:                  return false
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

  useEffect(() => { setExpanded(new Set()) }, [siteStats])

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

  const noScraperSites = siteStats.filter(s => s.noScraper)
  const orderedSites   = [...scraperSitesAll, ...noScraperSites]

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Coverage</p>
        {!loading && expandableSites.length > 0 && (
          <button
            onClick={() => allExpanded ? setExpanded(new Set()) : setExpanded(new Set(expandableSites))}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md transition-colors"
            style={{ color: 'var(--text-faint)', background: 'var(--hover-bg)' }}
          >
            {allExpanded ? (
              <><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>Collapse all</>
            ) : (
              <><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>Expand all</>
            )}
          </button>
        )}
      </div>

      {noSitesSelected ? (
        <div className="px-4 py-5"><p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>No sites selected for search</p></div>
      ) : loading ? (
        <div className="px-4 py-4 flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--hover-bg)' }} />)}
        </div>
      ) : orderedSites.length === 0 ? (
        <div className="px-4 py-5"><p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>No sites with scrapers were searched</p></div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {orderedSites.map(site => {
            const siteParams = paramsBySource[site.name] ?? []
            const hasParams  = siteParams.length > 0 && !site.noScraper
            const isOpen     = expanded.has(site.name)
            const realParams = siteParams.filter(k => !COMING_SOON.has(k))
            const foundCount = realParams.filter(k => isFound(results, k)).length

            return (
              <div key={site.url}>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${hasParams ? 'cursor-pointer hover:bg-white/3' : ''}`}
                  onClick={() => hasParams && toggle(site.name)}
                >
                  {site.error ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,100,100,0.12)' }}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#ff6464"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </div>
                  ) : site.noScraper ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--hover-bg)' }}>
                      <svg className="w-3 h-3 opacity-20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    </div>
                  ) : site.count > 0 && hasParams && foundCount === 0 ? (
                    // Site found players but no parameter data was actually extracted
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
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
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: site.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{site.name}</p>
                    <p className="text-[10px]" style={{ color: site.error ? '#ff6464aa' : site.noScraper ? 'var(--text-faint)' : site.count > 0 && hasParams && foundCount === 0 ? '#f59e0baa' : site.count > 0 ? '#00c896aa' : 'var(--text-faint)' }}>
                      {site.error ? 'Scrape failed' : site.noScraper ? 'No scraper' : site.count > 0 && hasParams && foundCount === 0 ? `${site.count} found · no data` : site.count > 0 ? `${site.count} result${site.count !== 1 ? 's' : ''}` : 'No results'}
                    </p>
                  </div>
                  {hasParams && realParams.length > 0 && (
                    <span className="text-[10px] tabular-nums flex-shrink-0" style={{ color: foundCount > 0 ? '#00c896' : 'var(--text-faint)' }}>
                      {foundCount}/{realParams.length}
                    </span>
                  )}
                  {hasParams && (
                    <svg className="w-3 h-3 flex-shrink-0 transition-transform duration-150" style={{ color: 'var(--text-faint)', transform: isOpen ? 'rotate(180deg)' : 'none' }} viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                  )}
                </div>

                {isOpen && hasParams && (
                  <div className="pb-1.5" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    {siteParams.map(key => {
                      const isComing = COMING_SOON.has(key)
                      const found    = !isComing && isFound(results, key)
                      return (
                        <div key={key} className="flex items-center gap-2.5 pl-9 pr-4 py-[5px]">
                          {isComing ? (
                            <div className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(96,165,250,0.12)' }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(96,165,250,0.6)' }} />
                            </div>
                          ) : found ? (
                            <div className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.15)' }}>
                              <svg className="w-2 h-2" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            </div>
                          ) : (
                            <div className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(220,50,50,0.12)', border: '1px solid rgba(220,50,50,0.35)' }}>
                              <svg className="w-2 h-2" viewBox="0 0 24 24" fill="rgba(220,50,50,0.8)"><path d="M19 13H5v-2h14v2z"/></svg>
                            </div>
                          )}
                          <span className="text-[11px] flex-1 truncate" style={{ color: isComing ? 'rgba(96,165,250,0.6)' : found ? 'var(--text-secondary)' : 'rgba(220,50,50,0.75)' }}>
                            {PARAM_LABELS[key]}
                          </span>
                          {isComing && <span className="text-[9px] px-1 py-px rounded flex-shrink-0" style={{ background: 'rgba(96,165,250,0.12)', color: 'rgba(96,165,250,0.8)' }}>soon</span>}
                          {!isComing && !found && <span className="text-[9px] flex-shrink-0" style={{ color: 'rgba(220,50,50,0.4)' }}>—</span>}
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

      {!loading && orderedSites.length > 0 && (
        <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
            {siteStats.filter(s => s.count > 0).length} of {scraperSitesAll.length} sites found results
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Field param key map ──────────────────────────────────────────────────────
const FIELD_PARAM_KEY: Record<string, string> = {
  'Photo':                  'photo',
  'Heat Map':               'heatMap',
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
  'FM Attributes':          'fmAttributes',
  'Season Stats':           'seasonStats',
  'Fee Expectation':        'transferFeeExpect',
  'Fee (Real)':             'transferFeeReal',
  'Salary Expectation':     'salaryExpect',
  'Salary (Real)':          'salaryReal',
  'Player Phone':           'playerPhone',
  'Agent':                  'agentName',
  'Agent Phone':            'agentPhone',
  'Sent by / Scout Name':   'sentBy',
  'Referral':               'sentBy',
  'Recent Form':            'recentForm',
  'Injury':                 'injuryType',
  'Return Date':            'injuryReturn',
  'Transfermarkt':          'transfermarktLink',
  'Sofascore':              'sofascoreLink',
  'FMInside':               'fmInsideLink',
  'Instagram':              'instagramLink',
  'Twitter / X':            'twitterLink',
  'TikTok':                 'tiktokLink',
  'Highlights':             'highlightsLink',
  'Description':            'description',
  'Availability':           'availability',
}

function formatDateStr(val: string | null | undefined): string | null {
  if (!val) return null
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Player Card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, databases, userName, visibleParams, panelMode, targetDatabaseId, targetListName, onPlayerAdded }: {
  player: PlayerResult
  databases: Database[]
  userName: string
  visibleParams: Set<string>
  panelMode?: boolean
  targetDatabaseId?: string
  targetListName?: string
  onPlayerAdded?: (playerName: string) => void
}) {
  const show = (label: string) => {
    const key = FIELD_PARAM_KEY[label] ?? label
    return visibleParams.size === 0 || visibleParams.has(key)
  }

  const [localActiveFm, setLocalActiveFm] = useState(false)
  const [merging, setMerging] = useState(false)
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
    seasonStats: player.seasonStats ?? '',
    heatmap: player.heatmap ?? '',
    description: player.description ?? '',
    available: true,
    playsNational: false,
    transferFeeExpect: '',
    transferFeeReal: '',
    salaryExpect: '',
    salaryReal: '',
    playerPhone: '',
    agentName: '',
    agentPhone: '',
    sentBy: '',
    recentForm: '',
    injuryType: '',
    injuryReturn: '',
    highlights: '',
    tmUrl: player.transfermarktUrl ?? '',
    scUrl: player.sofascoreUrl ?? '',
    fmUrl: player.fmInsideUrl ?? '',
    igUrl: '',
    twitterUrl: '',
    tiktokUrl: '',
    customExtras: [],
  })

  function updateField(key: keyof Omit<PlayerEditData, 'customExtras'>, val: string) {
    setEditData(prev => ({ ...prev, [key]: val }))
  }
  function addExtra() { setEditData(prev => ({ ...prev, customExtras: [...prev.customExtras, { key: '', value: '' }] })) }
  function updateExtra(i: number, field: 'key' | 'value', val: string) {
    setEditData(prev => ({ ...prev, customExtras: prev.customExtras.map((e, idx) => idx === i ? { ...e, [field]: val } : e) }))
  }
  function removeExtra(i: number) {
    setEditData(prev => ({ ...prev, customExtras: prev.customExtras.filter((_, idx) => idx !== i) }))
  }

  const dateAdded = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const dobDate = (editData.dateOfBirth || player.dateOfBirth) ? new Date(editData.dateOfBirth || player.dateOfBirth!) : null
  const age = dobDate && !isNaN(dobDate.getTime())
    ? Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null


  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>

      {/* ── Header ── */}
      <div className="flex items-start gap-4 border-b" style={{ borderColor: 'var(--border)', padding: '18px 22px' }}>
        {/* Photo */}
        {show('Photo') && (
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
            {player.photo
              ? <img src={player.photo} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none' }} />
              : <span className="text-xl font-bold" style={{ color: 'var(--text-faint)' }}>{player.name[0]}</span>
            }
          </div>
        )}

        {/* Name + meta line + source chips */}
        <div className="flex-1 min-w-0">
          <h3 className="leading-tight mb-1.5" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>{player.name}</h3>

          {/* Meta line — position badge · club · league (green) · nationality · age */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {(editData.position || player.position) && (() => { const pos = normalizePos(editData.position || player.position || ''); const s = positionPillStyle(pos); return s
                ? <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={s}>{pos}</span>
                : <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{pos}</span>
              })()}
            {(editData.clubName || player.team) && (
              <>
                {(editData.position || player.position) && <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>·</span>}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{editData.clubName || player.team}</span>
              </>
            )}
            {(editData.league || player.league) && (
              <>
                <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>·</span>
                <span className="text-xs font-medium" style={{ color: '#00c896' }}>{editData.league || player.league}</span>
              </>
            )}
            {(editData.nationality || player.nationality) && (
              <>
                <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{editData.nationality || player.nationality}</span>
              </>
            )}
            {age != null && (
              <>
                <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{age} yrs</span>
              </>
            )}
          </div>

        </div>

        {/* Right column: key stats pills + Import button */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          {/* Import button */}
          <button
            onClick={() => setMerging(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={panelMode && targetListName
              ? { background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.35)' }
              : { background: 'var(--subtle-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            onMouseEnter={e => {
              if (panelMode && targetListName) { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,200,150,0.1)' }
              else { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--text-faint)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)' }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none'
              if (!(panelMode && targetListName)) { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.borderColor = 'var(--border)' }
            }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
            {panelMode && targetListName ? `Add to ${targetListName}` : 'Import to List'}
          </button>
        </div>
      </div>

      {/* ── Source chips + Highlights — above the 3-column body, matching player profile card layout ── */}
      <div style={{ padding: '0 16px' }}>
        <LinkChips links={[
          show('Transfermarkt') && { label: 'Transfermarkt', value: editData.tmUrl,      onChange: (v: string) => updateField('tmUrl', v) },
          show('Sofascore')     && { label: 'Sofascore',   value: editData.scUrl,      onChange: (v: string) => updateField('scUrl', v) },
          show('FMInside')      && { label: 'FMInside',    value: editData.fmUrl,      onChange: (v: string) => updateField('fmUrl', v) },
          show('Instagram')     && { label: 'Instagram',   value: editData.igUrl,      onChange: (v: string) => updateField('igUrl', v) },
          show('Twitter / X')   && { label: 'Twitter / X', value: editData.twitterUrl, onChange: (v: string) => updateField('twitterUrl', v) },
          show('TikTok')        && { label: 'TikTok',      value: editData.tiktokUrl,  onChange: (v: string) => updateField('tiktokUrl', v) },
          show('Highlights')    && { label: 'Highlights',  value: editData.highlights, onChange: (v: string) => updateField('highlights', v) },
        ].filter(Boolean) as { label: string; value: string; onChange: (v: string) => void }[]} />
      </div>

      {/* ── Body — 3 columns ── */}
      <div className="grid grid-cols-3">

        {/* Physical */}
        <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase font-bold mb-2.5 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Physical</p>
          <div>
            {show('Position')      && <EditableField label="Position"     displayValue={normalizePos(editData.position) || null} editValue={editData.position}     onChange={v => updateField('position', v)} />}
            {show('Height')        && <EditableField label="Height"       displayValue={editData.heightCm ? `${editData.heightCm} cm` : null} editValue={editData.heightCm} onChange={v => updateField('heightCm', v)} inputType="number" />}
            {show('Age')           && <EditableField label="Age"          displayValue={age ? `${age} yrs` : null} editValue={editData.dateOfBirth} onChange={v => updateField('dateOfBirth', v)} inputType="date" />}
            {show('Date of Birth') && <EditableField label="Date of Birth" displayValue={formatDateStr(editData.dateOfBirth)} editValue={editData.dateOfBirth} onChange={v => updateField('dateOfBirth', v)} inputType="date" />}
            {show('Foot')          && <EditableField label="Foot"         displayValue={editData.preferredFoot || null} editValue={editData.preferredFoot} onChange={v => updateField('preferredFoot', v)} />}
            {show('Nationality')   && <EditableField label="Nationality"  displayValue={editData.nationality || null}   editValue={editData.nationality}  onChange={v => updateField('nationality', v)} />}
            {show('Passports')     && <EditableField label="Passports"    displayValue={editData.passports || null}     editValue={editData.passports}    onChange={v => updateField('passports', v)} />}
            {show('Player Phone')  && <EditableField label="Player Phone" displayValue={editData.playerPhone || null}  editValue={editData.playerPhone}  onChange={v => updateField('playerPhone', v)} />}
          </div>
          {(show('Availability') || show('Injury') || show('Return Date')) && (
            <div className="mt-3 pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase font-bold mb-1 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Current Status</p>
              {show('Availability') && (
                <div className="field-row flex items-center justify-between gap-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Availability</span>
                  <button type="button" onClick={() => setEditData(prev => ({ ...prev, available: !prev.available }))}
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded tracking-wider uppercase transition-all"
                    style={{ background: editData.available ? 'rgba(0,200,150,0.12)' : 'rgba(239,68,68,0.1)', color: editData.available ? '#00c896' : '#ef4444', border: `1px solid ${editData.available ? 'rgba(0,200,150,0.3)' : 'rgba(239,68,68,0.25)'}` }}>
                    {editData.available ? 'Available' : 'Not Avail.'}
                  </button>
                </div>
              )}
              {show('Injury')      && <EditableField label="Injury"      displayValue={editData.injuryType || null}   editValue={editData.injuryType}   onChange={v => updateField('injuryType', v)} />}
              {show('Return Date') && <EditableField label="Return Date" displayValue={editData.injuryReturn || null} editValue={editData.injuryReturn} onChange={v => updateField('injuryReturn', v)} inputType="date" />}
            </div>
          )}
        </div>

        {/* Contract & Value */}
        <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase font-bold mb-2.5 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Contract & Value</p>
          <div>
            {show('Club')               && <EditableField label="Club"               displayValue={editData.clubName || null}         editValue={editData.clubName}          onChange={v => updateField('clubName', v)} />}
            {show('League')             && <EditableField label="League"             displayValue={editData.league || null}           editValue={editData.league}            onChange={v => updateField('league', v)} />}
            {show('Joining Date')       && <EditableField label="Joining Date"       displayValue={formatDateStr(editData.joiningDate)}   editValue={editData.joiningDate}   onChange={v => updateField('joiningDate', v)} inputType="date" />}
            {show('Contract Expiry')    && <EditableField label="Contract Expiry"    displayValue={formatDateStr(editData.contractExpiry)} editValue={editData.contractExpiry} onChange={v => updateField('contractExpiry', v)} inputType="date" />}
            {show('Market Value')       && <EditableField label="Market Value"       displayValue={editData.marketValue || null}      editValue={editData.marketValue}       onChange={v => updateField('marketValue', v)} highlight />}
            {show('FM Wages')           && <EditableField label="FM Wages"           displayValue={editData.fmWages || null}          editValue={editData.fmWages}           onChange={v => updateField('fmWages', v)} inputType="number" />}
            {show('Fee Expectation')    && <EditableField label="Fee Expectation"    displayValue={editData.transferFeeExpect || null} editValue={editData.transferFeeExpect} onChange={v => updateField('transferFeeExpect', v)} />}
            {show('Fee (Real)')         && <EditableField label="Fee (Real)"         displayValue={editData.transferFeeReal || null}   editValue={editData.transferFeeReal}   onChange={v => updateField('transferFeeReal', v)} />}
            {show('Salary Expectation') && <EditableField label="Salary Expectation" displayValue={editData.salaryExpect || null}     editValue={editData.salaryExpect}      onChange={v => updateField('salaryExpect', v)} />}
            {show('Salary (Real)')      && <EditableField label="Salary (Real)"      displayValue={editData.salaryReal || null}       editValue={editData.salaryReal}        onChange={v => updateField('salaryReal', v)} />}
          </div>
        </div>

        {/* Scout Info */}
        <div className="p-4">
          <p className="text-[10px] uppercase font-bold mb-2.5 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Scout Info</p>
          <div>
            <CardField label="Added" value={dateAdded} />
            {show('Sent by / Scout Name') && <CardField label="Sent by / Scout Name" value={userName} />}
            {show('Referral')     && <EditableField label="Referral"     displayValue={editData.sentBy || null}     editValue={editData.sentBy}     onChange={v => updateField('sentBy', v)} />}
            <div className="field-row flex items-center justify-between gap-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Plays National</span>
              <button
                type="button"
                onClick={() => setEditData(prev => ({ ...prev, playsNational: !prev.playsNational }))}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all"
                style={{
                  background: editData.playsNational ? '#00c896' : 'var(--hover-bg)',
                  color: editData.playsNational ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${editData.playsNational ? '#00c896' : 'var(--border)'}`,
                }}
              >
                {editData.playsNational ? 'Yes' : 'No'}
              </button>
            </div>
            {show('Recent Form')  && <EditableField label="Recent Form"  displayValue={editData.recentForm || null} editValue={editData.recentForm} onChange={v => updateField('recentForm', v)} />}
            {show('Description')  && <EditableField label="Description"  displayValue={editData.description || null} editValue={editData.description} onChange={v => updateField('description', v)} multiline />}
          </div>

          {/* Agent Info */}
          {(show('Agent') || show('Agent Phone')) && (
            <div className="mt-3 pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase font-bold mb-2.5 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Agent Info</p>
              {show('Agent')       && <EditableField label="Agent"       displayValue={editData.agentName || null}  editValue={editData.agentName}  onChange={v => updateField('agentName', v)} />}
              {show('Agent Phone') && <EditableField label="Agent Phone" displayValue={editData.agentPhone || null} editValue={editData.agentPhone} onChange={v => updateField('agentPhone', v)} />}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom — 3 columns ── */}
      {(show('Heat Map') || show('Season Stats') || show('FM Attributes')) && (
        <div className="grid grid-cols-3" style={{ background: 'var(--subtle-bg)', borderTop: '1px solid var(--border)' }}>

          {/* Heat Map */}
          <div className="p-4 flex flex-col gap-2" style={{ borderRight: '1px solid var(--border)' }}>
            {show('Heat Map') && editData.heatmap && (
              <>
                <p className="text-[10px] uppercase font-bold mb-2.5 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Heat Map</p>
                <HeatmapDisplay json={editData.heatmap} />
              </>
            )}
          </div>

          {/* Season Stats */}
          <div className="p-4 flex flex-col gap-2" style={{ borderRight: '1px solid var(--border)' }}>
            {show('Season Stats') && (
              <>
                <p className="text-[10px] uppercase font-bold mb-2.5 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Season Stats</p>
                <SeasonStatsEditor
                  json={editData.seasonStats || '{"seasons":[]}'}
                  onChange={v => updateField('seasonStats', v)}
                />
              </>
            )}
          </div>

          {/* FM Attributes */}
          {show('FM Attributes') && (
            <div className="p-4 flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold mb-2.5 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: localActiveFm ? '#00c896' : 'var(--text-primary)', borderColor: '#00c896' }}>FM Attributes</p>
              {localActiveFm ? (
                <FMAttributesEditor
                  value={editData.fmAttributes}
                  onChange={v => updateField('fmAttributes', v)}
                  onBlur={() => setLocalActiveFm(false)}
                  autoFocus
                />
              ) : editData.fmAttributes ? (
                <div className="group relative cursor-text" onClick={() => setLocalActiveFm(true)}>
                  <FMRadarChart fmAttributes={editData.fmAttributes} />
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#00c896"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </div>
                </div>
              ) : (
                <div className="flex-1 rounded-lg flex items-center justify-center cursor-text group" style={{ minHeight: 80, border: '1px dashed var(--border)' }} onClick={() => setLocalActiveFm(true)}>
                  <span className="text-[10px] group-hover:opacity-0 transition-opacity" style={{ color: 'var(--text-faint)' }}>Click to add FM Attributes</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import modal */}
      {merging && (
        <ImportModal
          player={player}
          editData={editData}
          databases={databases}
          onClose={() => setMerging(false)}
          preSelectedDbId={targetDatabaseId}
          onPlayerAdded={onPlayerAdded}
        />
      )}
    </div>
  )
}

// ─── Card field helpers ───────────────────────────────────────────────────────

function CardField({ label, value, highlight = false }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  const hasValue = value != null && value !== ''
  return (
    <div className="field-row flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-[11px] font-semibold text-right" style={{ color: hasValue ? (highlight ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function EditableField({ label, displayValue, editValue, onChange, highlight, isLink, inputType, placeholder, multiline }: {
  label: string
  displayValue: string | null | undefined
  editValue: string
  onChange: (v: string) => void
  highlight?: boolean
  isLink?: boolean
  inputType?: string
  placeholder?: string
  multiline?: boolean
}) {
  const [localActive, setLocalActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (localActive) {
      inputRef.current?.focus()
      textareaRef.current?.focus()
    }
  }, [localActive])

  const rowStyle: React.CSSProperties = { borderBottom: '1px solid var(--border)', padding: '4px 0' }

  if (!localActive) {
    if (isLink && displayValue?.startsWith('http')) {
      return (
        <div className="field-row flex items-center justify-between gap-2 group cursor-text" style={rowStyle} onClick={() => setLocalActive(true)}>
          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
          <a href={displayValue} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="text-[11px] font-semibold text-right hover:underline" style={{ color: '#00c896' }}>
            View ↗
          </a>
        </div>
      )
    }
    const hasValue = displayValue != null && displayValue !== ''
    if (multiline) {
      return (
        <div
          className="cursor-text group"
          style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}
          onClick={() => setLocalActive(true)}
        >
          <p className="text-[9px] uppercase font-semibold mb-1.5" style={{ color: 'var(--text-faint)', letterSpacing: '0.7px' }}>{label}</p>
          <div
            className="text-[11px] whitespace-pre-wrap group-hover:border-[rgba(0,200,150,0.35)] transition-colors"
            style={{
              background: 'var(--subtle-bg)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: '7px 9px',
              minHeight: 64,
              lineHeight: 1.55,
              color: hasValue ? 'var(--text-secondary)' : 'var(--text-faint)',
              fontStyle: hasValue ? 'normal' : 'italic',
            }}
          >
            {displayValue ?? 'No description yet. Click to add…'}
          </div>
        </div>
      )
    }
    return (
      <div className="field-row flex items-center justify-between gap-2 group cursor-text" style={rowStyle} onClick={() => setLocalActive(true)}>
        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold text-right" style={{ color: hasValue ? (highlight ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>{displayValue ?? '—'}</span>
          <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" viewBox="0 0 24 24" fill="#00c896"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </div>
      </div>
    )
  }

  const inputStyle = {
    background: 'rgba(0,200,150,0.07)',
    border: '1px solid rgba(0,200,150,0.3)',
    color: 'var(--text-primary)',
    caretColor: '#00c896',
  }
  const onFocusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(0,200,150,0.6)'
    e.currentTarget.style.background = 'rgba(0,200,150,0.12)'
  }

  if (multiline) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[11px]" style={{ color: 'rgba(0,200,150,0.8)' }}>{label}</span>
        <textarea ref={textareaRef} value={editValue} placeholder={placeholder ?? 'Add description…'} rows={3}
          onChange={e => onChange(e.target.value)} onBlur={() => setLocalActive(false)}
          className="text-[11px] focus:outline-none rounded px-1.5 py-1 resize-none"
          style={{ ...inputStyle, width: '100%' }} onFocus={onFocusStyle}
        />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(0,200,150,0.8)' }}>{label}</span>
      <input ref={inputRef} type={inputType ?? 'text'} value={editValue}
        placeholder={placeholder ?? (isLink ? 'https://…' : undefined)}
        onChange={e => onChange(e.target.value)} onBlur={() => setLocalActive(false)}
        className="text-[11px] font-medium text-right focus:outline-none rounded px-1.5 py-0.5"
        style={{ ...inputStyle, flex: 1, maxWidth: inputType === 'date' ? 150 : 130 }} onFocus={onFocusStyle}
      />
    </div>
  )
}


// ─── Import Modal ─────────────────────────────────────────────────────────────

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

function ImportModal({ player, editData, databases, onClose, preSelectedDbId, onPlayerAdded }: {
  player: PlayerResult
  editData: PlayerEditData
  databases: Database[]
  onClose: () => void
  preSelectedDbId?: string
  onPlayerAdded?: (playerName: string) => void
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preSelectedDbId ? [preSelectedDbId] : []))
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState<(DuplicateMatch & { dbId: string }) | null>(null)

  const position  = editData.position?.trim()  || player.position  || ''
  const clubName  = editData.clubName?.trim()   || player.team      || ''
  const photoSrc  = player.photo || null
  const firstName = player.name.trim().split(/\s+/)[0] ?? ''
  const lastName  = player.name.trim().split(/\s+/).slice(1).join(' ')

  function toggleDb(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function doImport() {
    setDuplicate(null)
    setLoading(true)
    setError('')

    const edCf: Record<string, string> = {}
    if (editData.transferFeeExpect) edCf.transferFeeExpect = editData.transferFeeExpect
    if (editData.transferFeeReal)   edCf.transferFeeReal   = editData.transferFeeReal
    if (editData.salaryExpect)      edCf.salaryExpect       = editData.salaryExpect
    if (editData.salaryReal)        edCf.salaryReal         = editData.salaryReal
    if (editData.playerPhone)       edCf.playerPhone        = editData.playerPhone
    if (editData.agentPhone)        edCf.agentPhone         = editData.agentPhone
    if (editData.sentBy)            edCf.sentBy             = editData.sentBy
    if (editData.twitterUrl)        edCf.twitter            = editData.twitterUrl
    if (editData.tiktokUrl)         edCf.tiktok             = editData.tiktokUrl
    if (editData.recentForm)        edCf.recentForm         = editData.recentForm
    if (editData.injuryType)        edCf.injuryType         = editData.injuryType
    if (editData.injuryReturn)      edCf.injuryReturn       = editData.injuryReturn
    if (editData.highlights)        edCf.highlights         = editData.highlights
    if (editData.igUrl)             edCf.instagram          = editData.igUrl
    for (const extra of editData.customExtras) {
      if (extra.key.trim() && extra.value.trim()) edCf[extra.key.trim()] = extra.value.trim()
    }

    const tmUrl  = editData.tmUrl?.trim()  || player.transfermarktUrl || ''
    const scUrl  = editData.scUrl?.trim()  || player.sofascoreUrl     || ''
    const fmUrl  = editData.fmUrl?.trim()  || player.fmInsideUrl      || ''
    const sourceUrl = tmUrl || scUrl || fmUrl || undefined

    const customFields = {
      ...(editData.preferredFoot?.trim() || player.preferredFoot ? { foot: editData.preferredFoot?.trim() || player.preferredFoot! } : {}),
      ...(editData.passports?.trim()     || player.passports     ? { passports: editData.passports?.trim() || player.passports! } : {}),
      ...(editData.league?.trim()        || player.league        ? { league: editData.league?.trim() || player.league! } : {}),
      ...(editData.joiningDate?.trim()   || player.joiningDate   ? { joiningDate: editData.joiningDate?.trim() || player.joiningDate! } : {}),
      ...(editData.contractExpiry?.trim()|| player.contractUntil ? { contractExpiry: editData.contractExpiry?.trim() || player.contractUntil! } : {}),
      ...(editData.fmWages?.trim()       || player.fmWages       ? { fmWages: editData.fmWages?.trim() || player.fmWages! } : {}),
      ...(editData.fmAttributes?.trim()  || player.fmAttributes  ? { fmAttributes: editData.fmAttributes?.trim() || player.fmAttributes! } : {}),
      ...(editData.seasonStats?.trim()   || player.seasonStats   ? { seasonStats: editData.seasonStats?.trim() || player.seasonStats! } : {}),
      ...(editData.heatmap?.trim()       || player.heatmap       ? { heatmap: editData.heatmap?.trim() || player.heatmap! } : {}),
      ...(editData.description?.trim()   || player.description   ? { description: editData.description?.trim() || player.description! } : {}),
      ...(tmUrl ? { transfermarktUrl: tmUrl } : {}),
      ...(scUrl ? { sofascoreUrl: scUrl } : {}),
      ...(fmUrl ? { fmInsideUrl: fmUrl } : {}),
      ...(photoSrc ? { photo: photoSrc } : {}),
      ...edCf,
    }

    const heightStr = editData.heightCm?.trim() || player.heightCm?.toString() || ''
    const mktStr    = editData.marketValue?.trim() || player.marketValue || ''

    const body = {
      firstName:   firstName  || '-',
      lastName:    lastName   || '-',
      position:    normalizePos(editData.position?.trim() || position || '') || null,
      clubName:    editData.clubName?.trim()    || clubName    || null,
      nationality: editData.nationality?.trim() || player.nationality || null,
      agentName:   editData.agentName?.trim()   || null,
      available:      editData.available ?? true,
      playsNational:  editData.playsNational ?? false,
      pipelineStatus: 'spotted',
      dateOfBirth: editData.dateOfBirth?.trim() || player.dateOfBirth || null,
      heightCm:    heightStr ? parseInt(heightStr) : null,
      marketValue: parseMarketValueToNumber(mktStr || null),
      sourceName:  player.sources.join(', '),
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
      if (preSelectedDbId) {
        window.dispatchEvent(new CustomEvent('scoutlink:player-added'))
        onPlayerAdded?.(player.name)
        onClose()
      } else {
        const firstDbId = [...selectedIds][0]
        const firstResult = results.find(r => r.dbId === firstDbId)
        if (firstResult?.data?.id) {
          router.push(`/databases/${firstDbId}/players/${firstResult.data.id}`)
        } else {
          onClose()
        }
      }
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  async function handleImport() {
    if (selectedIds.size === 0) return
    setChecking(true)

    // Duplicate check across all selected databases
    try {
      for (const dbId of selectedIds) {
        const res = await fetch(`/api/databases/${dbId}/players/duplicate-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: [{ first: firstName, last: lastName }] }),
        })
        if (res.ok) {
          const data = await res.json() as { matches: DuplicateMatch[] }
          if (data.matches.length > 0) {
            setChecking(false)
            setDuplicate({ ...data.matches[0], dbId })
            return
          }
        }
      }
    } catch {
      // network error — proceed anyway
    }

    setChecking(false)
    await doImport()
  }

  return (
    <>
    {duplicate && (
      <DuplicateWarningModal
        match={duplicate}
        inputName={player.name}
        listName={databases.find(d => d.id === duplicate.dbId)?.name}
        onSkip={() => setDuplicate(null)}
        onCreateAnyway={doImport}
      />
    )}
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,150,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: loading ? 'rgba(0,200,150,0.15)' : 'linear-gradient(90deg, #00c896, #00a878)', flexShrink: 0 }}>
          {loading && (
            <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%', background: 'linear-gradient(90deg, transparent, #00c896, rgba(0,200,150,0.4))', animation: 'sl-progress 1.4s ease-in-out infinite' }} />
          )}
        </div>

        <div className="px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {/* Header row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00c896"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{preSelectedDbId ? 'Add to List' : 'Import Player'}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Choose which list to add this player to</p>
            </div>
          </div>
          {/* Player chip */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)' }}>
            {photoSrc && <img src={photoSrc} alt={player.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{player.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{[position, clubName].filter(Boolean).join(' · ') || 'Player'}</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
            {preSelectedDbId ? 'Choose list' : 'Choose databases'}
          </p>
          {databases.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <p className="text-xs" style={{ color: '#ef4444' }}>You have no databases. Create one first.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {databases.map(db => {
                const checked = selectedIds.has(db.id)
                const isCurrent = db.id === preSelectedDbId
                return (
                  <label key={db.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all" style={{
                    background: checked ? 'rgba(0,200,150,0.08)' : 'var(--subtle-bg)',
                    border: `1px solid ${checked ? 'rgba(0,200,150,0.3)' : 'var(--border)'}`,
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDb(db.id)} className="accent-[#00c896] w-4 h-4 flex-shrink-0" />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{db.name}</span>
                    {isCurrent && !checked && <span className="ml-auto text-[10px]" style={{ color: 'var(--text-faint)' }}>Current list</span>}
                    {checked && <span className="ml-auto text-[10px]" style={{ color: '#00c896' }}>Selected</span>}
                  </label>
                )
              })}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="px-6 py-5 flex flex-col items-center gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <ScoutLinkBallLoader size={64} />
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Importing player…</p>
          </div>
        ) : (
          <div className="px-6 py-4 flex gap-2.5 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={onClose} disabled={checking}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              Cancel
            </button>
            <button onClick={handleImport} disabled={selectedIds.size === 0 || databases.length === 0 || checking}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-default transition-all"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)', cursor: (selectedIds.size === 0 || databases.length === 0 || checking) ? 'default' : 'pointer' }}
              onMouseEnter={e => { if (selectedIds.size > 0 && databases.length > 0 && !checking) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}>
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 inline-block animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Checking…
                </span>
              ) : preSelectedDbId ? 'Add to List' : selectedIds.size > 1 ? `Import to ${selectedIds.size} Lists` : 'Import'}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
