import { NextResponse } from 'next/server'
import { fmInsideScraper } from '@/lib/scrapers/fminside'
import { sbFetch } from '@/lib/scrapers/scrapingbee'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Reggie Walsh'

  // Fetch search page via ScrapingBee GET with JS rendering
  let rawStatus = 0
  let rawHtml = ''
  try {
    const url = `https://fminside.net/players/26?search=${encodeURIComponent(query)}`
    const res = await sbFetch(url, true)
    rawStatus = res.status
    rawHtml = await res.text()
  } catch (e) {
    rawHtml = `fetch error: ${e}`
  }

  // Find the player list section
  const playerSection = rawHtml.indexOf('class="player"')
  const htmlSnippet = playerSection >= 0
    ? rawHtml.slice(Math.max(0, playerSection - 200), playerSection + 2000)
    : rawHtml.slice(10000, 14000) // skip CSS, grab body content

  const players = await fmInsideScraper.search(query)
  return NextResponse.json({ query, count: players.length, players, rawStatus, htmlLength: rawHtml.length, playerSectionFound: playerSection >= 0, htmlSnippet })
}
