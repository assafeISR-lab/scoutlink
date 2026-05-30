import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ players: [] })

  const [ownedDbs, sharedAccess] = await Promise.all([
    prisma.playerDatabase.findMany({ where: { ownerId: user.id }, select: { id: true, name: true } }),
    prisma.databaseAccess.findMany({
      where: { agentId: user.id },
      select: { database: { select: { id: true, name: true } } },
    }),
  ])

  const allDbs = [
    ...ownedDbs,
    ...sharedAccess.map(a => a.database),
  ]
  if (allDbs.length === 0) return NextResponse.json({ players: [] })

  const dbNameMap = Object.fromEntries(allDbs.map(d => [d.id, d.name]))
  const allowedIds = allDbs.map(d => d.id)

  const players = await prisma.player.findMany({
    where: {
      databaseId: { in: allowedIds },
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      clubName: true,
      databaseId: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    take: 8,
  })

  return NextResponse.json({
    players: players.map(p => ({
      ...p,
      databaseName: dbNameMap[p.databaseId] ?? '',
    })),
  })
}
