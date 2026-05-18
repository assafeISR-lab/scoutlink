import { NextResponse } from 'next/server'
import { fmInsideScraper } from '@/lib/scrapers/fminside'
import { sbInteract } from '@/lib/scrapers/scrapingbee'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Reggie Walsh'

  // Test js_scenario interaction and return raw HTML
  let rawStatus = 0
  let htmlLength = 0
  let playerCount = 0
  let htmlSnippet = ''
  try {
    const res = await sbInteract(
      'https://fminside.net/players/26',
      [
        { wait_for: "input[name='name']" },
        { evaluate: `fetch('/resources/inc/ajax/search.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:'search_phrase=${encodeURIComponent(query)}&database_id=7'}).then(r=>r.text()).then(h=>{document.querySelector('div.players').innerHTML=h})` },
        { wait: 4000 },
      ],
    )
    rawStatus = res.status
    const html = await res.text()
    htmlLength = html.length
    const blocks = [...html.matchAll(/<ul class="player">([\s\S]*?)<\/ul>/g)]
    playerCount = blocks.length
    // Check if blocks are hidden (display:none) — FMInside may hide rather than remove filtered players
    const hiddenCount = [...html.matchAll(/display:\s*none/g)].length
    const nameIdx = html.toLowerCase().indexOf(query.split(' ').pop()!.toLowerCase())
    htmlSnippet = nameIdx >= 0
      ? html.slice(Math.max(0, nameIdx - 200), nameIdx + 500)
      : `NOT FOUND. hiddenCount=${hiddenCount}. First player block: ` + (blocks[0]?.[0]?.slice(0, 300) ?? 'none')
  } catch (e) {
    htmlSnippet = `error: ${e}`
  }

  const players = await fmInsideScraper.search(query)
  return NextResponse.json({ query, count: players.length, players, rawStatus, htmlLength, playerBlocksFound: playerCount, htmlSnippet })
}
