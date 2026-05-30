import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const scopedId  = params.get('databaseId')
  const scopedIds = params.get('databaseIds')?.split(',').filter(Boolean) ?? []

  const [ownedDbs, sharedAccess] = await Promise.all([
    prisma.playerDatabase.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, columnConfig: true },
    }),
    prisma.databaseAccess.findMany({
      where: { agentId: user.id },
      select: { permission: true, database: { select: { id: true, name: true, columnConfig: true } } },
    }),
  ])

  const allDbs = [
    ...ownedDbs.map(d => ({ ...d, permission: 'owner' as const })),
    ...sharedAccess.map(a => ({ ...a.database, permission: a.permission })),
  ]

  if (allDbs.length === 0) return NextResponse.json({ players: [] })

  const dbNameMap = Object.fromEntries(allDbs.map(d => [d.id, d.name]))
  const allowedIds = allDbs.map(d => d.id)

  // Scope to requested IDs (single or multiple), filtering to only allowed ones
  const requested = scopedIds.length > 0 ? scopedIds : scopedId ? [scopedId] : []
  const targetIds  = requested.length > 0
    ? requested.filter(id => allowedIds.includes(id))
    : allowedIds

  const players = await prisma.player.findMany({
    where: { databaseId: { in: targetIds } },
    include: { customFields: { select: { fieldName: true, value: true } } },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  const response: Record<string, unknown> = {
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
      createdAt: p.createdAt.toISOString(),
      heightCm: p.heightCm,
      marketValue: p.marketValue,
      available: p.available,
      isRepresented: p.isRepresented,
      playsNational: p.playsNational,
      customFields: p.customFields,
    })),
  }

  // When fetching a single list, include column config and write access (mirrors /api/databases/[id]/players)
  if (targetIds.length === 1) {
    const db = allDbs.find(d => d.id === targetIds[0])
    if (db) {
      response.columnConfig = db.columnConfig ?? null
      response.canWrite = db.permission === 'owner' || db.permission === 'contributor'
      response.currentUserId = user.id
    }
  }

  return NextResponse.json(response)
}
