import { NextResponse } from 'next/server'
import { sofascoreScraper } from '@/lib/scrapers/sofascore'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Mohamed Salah'

  let players: unknown[] = []
  let error: string | null = null
  const start = Date.now()

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
  })
}
