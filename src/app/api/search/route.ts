import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getScraperForUrl, type ScrapedPlayer } from '@/lib/scrapers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ players: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ players: [] })

  // Fetch user's active websites that we have scrapers for
  const websites = await prisma.agentWebsite.findMany({
    where: { agentId: user.id, isActive: true, useForSearch: true },
    select: { url: true, loginStatus: true },
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

  // Build query variations — for 3+ word names, also try first+last (skipping middle names)
  // e.g. "Idrissa Gana Gueye" → ["Idrissa Gana Gueye", "Idrissa Gueye"]
  const buildVariations = (q: string): string[] => {
    const words = q.trim().split(/\s+/)
    const vars = [q.trim()]
    if (words.length >= 3) vars.push(`${words[0]} ${words[words.length - 1]}`)
    if (words.length >= 4) vars.push(`${words[0]} ${words[1]} ${words[words.length - 1]}`)
    return [...new Set(vars)]
  }
  const queryVariations = buildVariations(query.trim())

  // Run all scrapers in parallel — 15 s timeout per site so one slow site can't block others
  // Each scraper runs all query variations in parallel and deduplicates by player id
  const withTimeout = (p: Promise<ScrapedPlayer[]>): Promise<ScrapedPlayer[]> =>
    Promise.race([p, new Promise<ScrapedPlayer[]>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))])

  const results = await Promise.allSettled(
    uniqueScrapers.map(async e => {
      const varResults = await Promise.all(
        queryVariations.map(q => withTimeout(e.scraper.search(q)).catch(() => [] as ScrapedPlayer[]))
      )
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
  const queryWords = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1)
  const nameMatchesQuery = (playerName: string): boolean => {
    if (queryWords.length <= 1) return true
    const nameLower = playerName.toLowerCase()
    const matchCount = queryWords.filter(w => nameLower.includes(w)).length
    return matchCount >= 2
  }

  const players: ScrapedPlayer[] = []
  const siteStats: { name: string; url: string; count: number; error: boolean }[] = []

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const filtered = result.value.filter(p => nameMatchesQuery(p.name))
      players.push(...filtered)
      siteStats.push({ name: uniqueScrapers[i].scraper.name, url: uniqueScrapers[i].url, count: filtered.length, error: false })
    } else {
      siteStats.push({ name: uniqueScrapers[i].scraper.name, url: uniqueScrapers[i].url, count: 0, error: true })
    }
  })

  // Log search activity (fire and forget)
  prisma.activityLog.create({ data: { agentId: user.id, action: 'search', detail: query } }).catch(() => {})

  return NextResponse.json({ players, siteStats })
}
