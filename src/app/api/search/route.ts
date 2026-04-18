import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getScraperForUrl, type ScrapedPlayer, type MergedPlayer } from '@/lib/scrapers'

const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normName = (n: string) => stripAccents(n.trim().toLowerCase().replace(/\s+/g, ' '))

function buildMerged(group: ScrapedPlayer[]): MergedPlayer {
  const tm = group.find(p => p.sourceName === 'Transfermarkt')
  const sc = group.find(p => p.sourceName === 'Sofascore')
  const fm = group.find(p => p.sourceName === 'FMInside')
  const first = group[0]

  // DOB: Sofascore has exact ms-precision timestamp, TM has exact from profile page
  const dob = sc?.dateOfBirth ?? tm?.dateOfBirth ?? null
  const key = `${normName(first.name)}-${dob ?? 'x'}`

  return {
    id: key,
    name: tm?.name ?? sc?.name ?? fm?.name ?? first.name,
    nationality: tm?.nationality ?? sc?.nationality ?? fm?.nationality ?? null,
    team: tm?.team ?? sc?.team ?? fm?.team ?? null,
    // Sofascore is most precise for position; TM position from search list is approximate
    position: sc?.position ?? tm?.position ?? fm?.position ?? null,
    dateOfBirth: dob,
    heightCm: sc?.heightCm ?? tm?.heightCm ?? null,
    weightKg: sc?.weightKg ?? tm?.weightKg ?? null,
    photo: tm?.photo ?? sc?.photo ?? fm?.photo ?? null,
    description: tm?.description ?? sc?.description ?? fm?.description ?? null,
    marketValue: tm?.marketValue ?? null,
    transfermarktUrl: tm?.sourceUrl ?? null,
    sofascoreUrl: sc?.sourceUrl ?? null,
    fmInsideUrl: fm?.sourceUrl ?? null,
    sources: [...new Set(group.map(p => p.sourceName))],
  }
}

function mergePlayers(allResults: ScrapedPlayer[]): MergedPlayer[] {
  // Group raw results by normalised name
  const byName = new Map<string, ScrapedPlayer[]>()
  for (const p of allResults) {
    const key = normName(p.name)
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(p)
  }

  const merged: MergedPlayer[] = []

  for (const [, group] of byName) {
    const withDob = group.filter(p => p.dateOfBirth)
    const noDob   = group.filter(p => !p.dateOfBirth)
    const uniqueDobs = [...new Set(withDob.map(p => p.dateOfBirth!))]

    if (uniqueDobs.length <= 1) {
      // All same DOB (or all null) → one merged card
      merged.push(buildMerged(group))
    } else {
      // Multiple DOBs = different players with same name; one card per DOB
      const assignedNoDob = new Set<ScrapedPlayer>()
      for (const dob of uniqueDobs) {
        const dobGroup = withDob.filter(p => p.dateOfBirth === dob)
        // Assign null-DOB results (FMInside) to this DOB group if team name matches
        const matched = noDob.filter(p =>
          !assignedNoDob.has(p) &&
          p.team &&
          dobGroup.some(d => d.team?.toLowerCase() === p.team!.toLowerCase())
        )
        matched.forEach(p => assignedNoDob.add(p))
        merged.push(buildMerged([...dobGroup, ...matched]))
      }
      // Remaining unassigned null-DOB results → add to first group
      const unassigned = noDob.filter(p => !assignedNoDob.has(p))
      if (unassigned.length > 0 && merged.length > 0) {
        const first = merged[0]
        const extra = buildMerged([
          ...withDob.filter(p => p.dateOfBirth === uniqueDobs[0]),
          ...unassigned,
        ])
        // Merge extra into first
        merged[0] = { ...first, ...Object.fromEntries(
          Object.entries(extra).filter(([k, v]) => v != null && first[k as keyof MergedPlayer] == null)
        ) as Partial<MergedPlayer> }
      }
    }
  }

  return merged
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ players: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ players: [] })

  // Fetch user's active websites
  const websites = await prisma.agentWebsite.findMany({
    where: { agentId: user.id, isActive: true, useForSearch: true },
    select: { url: true, loginStatus: true, name: true },
  })

  if (websites.length === 0) {
    return NextResponse.json({ players: [], noSitesSelected: true })
  }

  // Only search free/active sites (skip login_required without verified credentials)
  const searchableSites = websites.filter(w =>
    w.loginStatus === 'free' || w.loginStatus === 'active' || w.loginStatus === 'pending'
  )

  // Find scrapers for each site
  const scraperEntries = searchableSites
    .map(w => ({ url: w.url, scraper: getScraperForUrl(w.url) }))
    .filter(e => e.scraper !== null) as { url: string; scraper: NonNullable<ReturnType<typeof getScraperForUrl>> }[]

  // Deduplicate by scraper name (avoid running same scraper twice if site added twice)
  const seen = new Set<string>()
  const uniqueScrapers = scraperEntries.filter(e => {
    if (seen.has(e.scraper.name)) return false
    seen.add(e.scraper.name)
    return true
  })

  // Strip diacritics/accents — e.g. "Martín" → "Martin", "Páez" → "Paez"
  const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Build query variations — for 3+ word names, also try first+last (skipping middle names)
  // Also add accent-stripped versions so scrapers can match "Martin" as well as "Martín"
  const buildVariations = (q: string): string[] => {
    const words = q.trim().split(/\s+/)
    const vars = [q.trim()]
    if (words.length >= 3) vars.push(`${words[0]} ${words[words.length - 1]}`)
    if (words.length >= 4) vars.push(`${words[0]} ${words[1]} ${words[words.length - 1]}`)
    // Add accent-stripped versions
    const stripped = vars.map(stripAccents)
    return [...new Set([...vars, ...stripped])]
  }
  const queryVariations = buildVariations(query.trim())

  // Run all scrapers in parallel — 15 s timeout per site so one slow site can't block others
  // Each scraper runs all query variations in parallel and deduplicates by player id
  const withTimeout = (p: Promise<ScrapedPlayer[]>): Promise<ScrapedPlayer[]> =>
    Promise.race([p, new Promise<ScrapedPlayer[]>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))])

  const results = await Promise.allSettled(
    uniqueScrapers.map(async e => {
      let anySucceeded = false
      const varResults = await Promise.all(
        queryVariations.map(q =>
          withTimeout(e.scraper.search(q))
            .then(r => { anySucceeded = true; return r })
            .catch(() => [] as ScrapedPlayer[])
        )
      )
      // If every variation threw (network error, Cloudflare block, etc.), surface it as an error
      if (!anySucceeded) throw new Error('scraper failed')
      // Flatten and deduplicate by player id across all variations
      const seenIds = new Set<string>()
      return varResults.flat().filter(p => {
        if (seenIds.has(p.id)) return false
        seenIds.add(p.id)
        return true
      })
    })
  )

  // Filter: player name must contain at least 2 words from the query (for multi-word queries)
  // Prevents single-word partial matches like "Gueye" matching unrelated players
  // Both query and player name are accent-stripped for comparison
  const queryNorm = stripAccents(query.trim().toLowerCase())
  const queryWords = queryNorm.split(/\s+/).filter(w => w.length > 1)
  const nameMatchesQuery = (playerName: string): boolean => {
    if (queryWords.length <= 1) return true
    const nameLower = stripAccents(playerName.toLowerCase())
    // Standard check: at least 2 query words appear in the player name
    const matchCount = queryWords.filter(w => nameLower.includes(w)).length
    if (matchCount >= 2) return true
    // Nickname check: each word of the player name appears within the full query string
    // Catches "Gavi" matching "Pablo Martín Páez Gavira" (gavi is inside gavira)
    const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2)
    return nameWords.length > 0 && nameWords.every(w => queryNorm.includes(w))
  }

  const rawPlayers: ScrapedPlayer[] = []
  const siteStats: { name: string; url: string; count: number; error: boolean; noScraper?: boolean }[] = []

  // Sites that were scraped
  const scrapedUrls = new Set<string>()
  results.forEach((result, i) => {
    const entry = uniqueScrapers[i]
    scrapedUrls.add(entry.url)
    if (result.status === 'fulfilled') {
      const filtered = result.value.filter(p => nameMatchesQuery(p.name))
      rawPlayers.push(...filtered)
      siteStats.push({ name: entry.scraper.name, url: entry.url, count: filtered.length, error: false })
    } else {
      siteStats.push({ name: entry.scraper.name, url: entry.url, count: 0, error: true })
    }
  })

  // Sites that are selected but have no scraper — include them so user knows they were skipped
  for (const site of searchableSites) {
    if (!scrapedUrls.has(site.url)) {
      const hostname = (() => { try { return new URL(site.url).hostname.replace(/^www\./, '') } catch { return site.url } })()
      siteStats.push({ name: site.name || hostname, url: site.url, count: 0, error: false, noScraper: true })
    }
  }

  // Merge raw results from all sources into unified player records
  const players = mergePlayers(rawPlayers)

  // Log search activity (fire and forget)
  prisma.activityLog.create({ data: { agentId: user.id, action: 'search', detail: query } }).catch(() => {})

  return NextResponse.json({ players, siteStats })
}
