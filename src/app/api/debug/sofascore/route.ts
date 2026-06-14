import { NextResponse } from 'next/server'
import { sofascoreScraper } from '@/lib/scrapers/sofascore'
import { sbFetch } from '@/lib/scrapers/scrapingbee'

const SOFASCORE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.sofascore.com/',
  'Origin': 'https://www.sofascore.com',
}

async function testFetch(url: string, usePremium: boolean): Promise<{ status: number; ok: boolean; durationMs: number; error?: string }> {
  const start = Date.now()
  try {
    const res = await sbFetch(url, false, undefined, undefined, SOFASCORE_HEADERS, usePremium)
    return { status: res.status, ok: res.ok, durationMs: Date.now() - start }
  } catch (e) {
    return { status: 0, ok: false, durationMs: Date.now() - start, error: String(e) }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Mohamed Salah'

  const start = Date.now()

  // Test 1: search with standard proxy
  const searchStandard = await testFetch(
    `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`,
    false
  )

  // Test 2: profile fetch for Vinicius (id 868812) with standard proxy
  const profileStandard = await testFetch('https://api.sofascore.com/api/v1/player/868812', false)

  // Test 3: profile fetch with premium proxy
  const profilePremium = await testFetch('https://api.sofascore.com/api/v1/player/868812', true)

  // Test 4: full scraper search (uses premium for search, standard for enrichment)
  let players: unknown[] = []
  let scraperError: string | null = null
  try {
    players = await sofascoreScraper.search(query)
  } catch (e) {
    scraperError = String(e)
  }

  return NextResponse.json({
    query,
    durationMs: Date.now() - start,
    diagnostics: {
      searchStandardProxy: searchStandard,
      profileStandardProxy: profileStandard,
      profilePremiumProxy: profilePremium,
    },
    scraperError,
    count: players.length,
    players,
  })
}
