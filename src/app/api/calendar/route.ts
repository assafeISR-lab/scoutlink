import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

  const fromDate = new Date(from)
  const toDate = new Date(to)

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
