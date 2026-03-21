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

  // Run all scrapers in parallel with individual error isolation
  const results = await Promise.allSettled(
    uniqueScrapers.map(e => e.scraper.search(query.trim()))
  )

  const players: ScrapedPlayer[] = []
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      players.push(...result.value)
    }
  })

  // Log search activity (fire and forget)
  prisma.activityLog.create({ data: { agentId: user.id, action: 'search', detail: query } }).catch(() => {})

  return NextResponse.json({ players })
}
