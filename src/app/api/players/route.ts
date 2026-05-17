import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const players = await prisma.player.findMany({
    where: { databaseId: { in: allDbs.map(d => d.id) } },
    include: { customFields: { select: { fieldName: true, value: true } } },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  return NextResponse.json({
    players: players.map(p => ({
      id: p.id,
      databaseId: p.databaseId,
      databaseName: dbNameMap[p.databaseId] ?? '',
      firstName: p.firstName,
      lastName: p.lastName,
      middleName: p.middleName,
      position: p.position,
      clubName: p.clubName,
      nationality: p.nationality,
      agentName: p.agentName,
      dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
      heightCm: p.heightCm,
      marketValue: p.marketValue,
      playsNational: p.playsNational,
      customFields: p.customFields,
    })),
  })
}
