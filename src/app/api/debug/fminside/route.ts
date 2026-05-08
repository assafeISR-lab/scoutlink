import { NextResponse } from 'next/server'
import { fmInsideScraper } from '@/lib/scrapers/fminside'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? 'Reggie Walsh'
  const players = await fmInsideScraper.search(query)
  return NextResponse.json({ query, count: players.length, players })
}
