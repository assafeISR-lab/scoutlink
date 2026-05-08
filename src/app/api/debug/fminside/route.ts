import { NextResponse } from 'next/server'
import { fmInsideScraper } from '@/lib/scrapers/fminside'
import { sbFetch } from '@/lib/scrapers/scrapingbee'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Reggie Walsh'

  // Test ScrapingBee POST to AJAX endpoint
  let rawStatus = 0
  let rawHtml = ''
  try {
    const postBody = new URLSearchParams({ search_phrase: query, database_id: '7' }).toString()
    const res = await sbFetch('https://fminside.net/resources/inc/ajax/search.php', false, undefined, undefined, postBody)
    rawStatus = res.status
    rawHtml = await res.text()
  } catch (e) {
    rawHtml = `fetch error: ${e}`
  }

  const playerSection = rawHtml.indexOf('class="player"')
  const htmlSnippet = playerSection >= 0
    ? rawHtml.slice(Math.max(0, playerSection - 100), playerSection + 1500)
    : rawHtml.slice(0, 1500)

  const players = await fmInsideScraper.search(query)
  return NextResponse.json({ query, count: players.length, players, rawStatus, htmlLength: rawHtml.length, playerSectionFound: playerSection >= 0, htmlSnippet })
}
