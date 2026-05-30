import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; requestId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { requestId } = await params

  const request = await prisma.clubRequest.findUnique({
    where: { id: requestId },
    include: { club: { select: { name: true } } },
  })
  if (!request || request.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Build a natural-language query from the request fields
  const parts: string[] = []
  if (request.position) parts.push(request.position)
  if (request.ageMin || request.ageMax) {
    if (request.ageMin && request.ageMax) parts.push(`age ${request.ageMin} to ${request.ageMax}`)
    else if (request.ageMin) parts.push(`minimum age ${request.ageMin}`)
    else parts.push(`maximum age ${request.ageMax}`)
  }
  if (request.transferType === 'free') parts.push('free agent')
  else if (request.transferType === 'loan') parts.push('available for loan')
  else if (request.transferType === 'buy') parts.push('available for transfer')
  if (request.budget) parts.push(`budget ${request.budget.toLocaleString()} per year`)
  if (request.nationality) parts.push(`nationality ${request.nationality}`)
  if (request.notes) parts.push(request.notes)

  const message = parts.length > 0 ? parts.join(', ') : 'any player'

  // Call the existing scout-search API internally
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const searchRes = await fetch(`${origin}/api/scout-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: _req.headers.get('cookie') ?? '' },
    body: JSON.stringify({ message }),
  })

  if (!searchRes.ok) return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  const data = await searchRes.json()

  return NextResponse.json({ ...data, message })
}
