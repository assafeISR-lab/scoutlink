import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  // Text search mode — no date range required
  if (q !== null) {
    const term = q.trim()
    const [events, notes] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          agentId: user.id,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { notes: { contains: term, mode: 'insensitive' } },
            { type:  { contains: term, mode: 'insensitive' } },
          ],
        },
        orderBy: { startAt: 'desc' },
        take: 50,
      }),
      prisma.playerNote.findMany({
        where: {
          agentId: user.id,
          OR: [
            { content: { contains: term, mode: 'insensitive' } },
            { player: { firstName: { contains: term, mode: 'insensitive' } } },
            { player: { lastName:  { contains: term, mode: 'insensitive' } } },
          ],
        },
        include: {
          player: { select: { id: true, firstName: true, lastName: true, databaseId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])
    return NextResponse.json({ events, notes })
  }

  // Date-range mode
  const from = searchParams.get('from')
  const to   = searchParams.get('to')
  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

  const fromDate = new Date(from)
  const toDate   = new Date(to)

  const [events, notes] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        agentId: user.id,
        startAt: { gte: fromDate, lte: toDate },
      },
      include: {
        agent: { select: { id: true } },
      },
      orderBy: { startAt: 'asc' },
    }),
    prisma.playerNote.findMany({
      where: {
        agentId: user.id,
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            databaseId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return NextResponse.json({ events, notes })
}
