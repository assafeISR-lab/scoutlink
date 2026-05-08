import { NextResponse } from 'next/server'
import { fmInsideScraper } from '@/lib/scrapers/fminside'
import { sbFetch } from '@/lib/scrapers/scrapingbee'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Reggie Walsh'

  // Test GET search page with JS rendering + wait
  let rawStatus = 0
  let rawHtml = ''
  try {
    const url = `https://fminside.net/players/7-fm-26?search=${encodeURIComponent(query)}`
    const res = await sbFetch(url, true, undefined, 3000)
    rawStatus = res.status
    rawHtml = await res.text()
  } catch (e) {
    rawHtml = `fetch error: ${e}`
  }

  // Check if any result matches the query
  const queryLower = query.toLowerCase()
  const nameIdx = rawHtml.toLowerCase().indexOf(queryLower.split(' ')[1] ?? queryLower.split(' ')[0])
  const htmlSnippet = nameIdx >= 0
    ? rawHtml.slice(Math.max(0, nameIdx - 500), nameIdx + 1000)
    : rawHtml.slice(10000, 12000)

  const players = await fmInsideScraper.search(query)
  return NextResponse.json({ query, count: players.length, players, rawStatus, htmlLength: rawHtml.length, queryFoundInHtml: nameIdx >= 0, htmlSnippet })
}
