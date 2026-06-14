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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Mohamed Salah'

  let players: unknown[] = []
  let error: string | null = null
  let rawResponse: unknown = null
  const start = Date.now()

  // Also fetch the raw Sofascore search response so we can inspect the structure
  try {
    const url = `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`
    const res = await sbFetch(url, false, undefined, undefined, SOFASCORE_HEADERS, true)
    rawResponse = res.ok ? await res.json() : { status: res.status, statusText: res.statusText }
  } catch (e) {
    rawResponse = { fetchError: String(e) }
  }

  try {
    players = await sofascoreScraper.search(query)
  } catch (e) {
    error = String(e)
  }

  return NextResponse.json({
    query,
    durationMs: Date.now() - start,
    error,
    count: players.length,
    players,
    rawResponse,
  })
}
