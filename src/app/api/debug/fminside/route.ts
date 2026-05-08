import { NextResponse } from 'next/server'
import { fmInsideScraper } from '@/lib/scrapers/fminside'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Reggie Walsh'

  // Raw HTML debug
  let rawStatus = 0
  let rawHtml = ''
  try {
    const body = new URLSearchParams({ search_phrase: query, database_id: '7' })
    const res = await fetch('https://fminside.net/resources/inc/ajax/search.php', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://fminside.net/',
        'Origin': 'https://fminside.net',
      },
      body: body.toString(),
    })
    rawStatus = res.status
    rawHtml = await res.text()
  } catch (e) {
    rawHtml = `fetch error: ${e}`
  }

  const players = await fmInsideScraper.search(query)
  return NextResponse.json({ query, count: players.length, players, rawStatus, rawHtmlSample: rawHtml.slice(0, 2000) })
}
