import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [db, player] = await Promise.all([
    prisma.playerDatabase.findUnique({
      where: { id: databaseId },
      include: { access: { where: { agentId: user.id } } },
    }),
    prisma.player.findUnique({
      where: { id: playerId },
      include: {
        notes: { include: { agent: true }, orderBy: { createdAt: 'desc' } },
        fieldSources: { where: { isActive: true } },
        addedBy: { select: { fullName: true } },
        customFields: true,
      },
    }),
  ])

  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  if (!isOwner && db.access.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!player || player.databaseId !== databaseId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canWrite = isOwner || db.access[0]?.permission === 'contributor'

  return NextResponse.json({
    player: {
      ...player,
      dateOfBirth: player.dateOfBirth?.toISOString() ?? null,
      createdAt: player.createdAt.toISOString(),
      notes: player.notes.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })),
    },
    canWrite,
    currentUserId: user.id,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse body + DB access check + player ownership check all in parallel
  const [body, db, playerCheck] = await Promise.all([
    req.json(),
    prisma.playerDatabase.findUnique({ where: { id: databaseId }, include: { access: { where: { agentId: user.id } } } }),
    prisma.player.findUnique({ where: { id: playerId }, select: { databaseId: true } }),
  ])

  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!playerCheck || playerCheck.databaseId !== databaseId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only include fields that are explicitly present in the request body.
  // Absent fields must be omitted (not set to null) so partial saves don't wipe other columns.
  const dbData: Record<string, unknown> = {}
  if ('firstName'    in body) dbData.firstName    = body.firstName?.trim()    || undefined
  if ('lastName'     in body) dbData.lastName     = body.lastName?.trim()     || undefined
  if ('middleName'   in body) dbData.middleName   = body.middleName?.trim()   || null
  if ('position'     in body) dbData.position     = body.position?.trim()     || null
  if ('clubName'     in body) dbData.clubName     = body.clubName?.trim()     || null
  if ('nationality'  in body) dbData.nationality  = body.nationality?.trim()  || null
  if ('agentName'    in body) dbData.agentName    = body.agentName?.trim()    || null
  if ('dateOfBirth'  in body) dbData.dateOfBirth  = body.dateOfBirth ? new Date(body.dateOfBirth) : null
  if ('heightCm'     in body) dbData.heightCm     = body.heightCm != null && body.heightCm !== '' ? parseFloat(body.heightCm) : null
  if ('marketValue'  in body) dbData.marketValue  = body.marketValue != null && body.marketValue !== '' ? parseFloat(body.marketValue) * 1_000_000 : null
  if ('playsNational' in body) dbData.playsNational = body.playsNational ?? undefined
  if ('available'    in body) dbData.available    = body.available ?? undefined

  const changedFields: string[] = Array.isArray(body.changedFields) ? body.changedFields : []
  const customFieldUpdates: Record<string, string> = body.customFields ?? {}

  const fieldValues: Record<string, string | null> = {
    position:      body.position?.trim()     || null,
    clubName:      body.clubName?.trim()      || null,
    nationality:   body.nationality?.trim()   || null,
    agentName:     body.agentName?.trim()     || null,
    dateOfBirth:   body.dateOfBirth           || null,
    heightCm:      body.heightCm !== '' && body.heightCm != null ? String(parseFloat(body.heightCm)) : null,
    marketValue:   body.marketValue !== '' && body.marketValue != null ? String(parseFloat(body.marketValue) * 1_000_000) : null,
    playsNational: String(body.playsNational ?? false),
    available:     String(body.available ?? true),
  }

  const customFieldEntries = Object.entries(customFieldUpdates)
  const customFieldNames = customFieldEntries.map(([k]) => k)
  const nonEmptyCustom = customFieldEntries.filter(([, v]) => String(v ?? '').trim() !== '')

  // Round 1: player update + FieldSource deactivations + CustomField deletes — all in parallel
  // No dependencies between them: FieldSources and CustomFields only need playerId (from URL).
  // CustomFields use delete-then-recreate (no unique constraint in schema, so no upsert available).
  const [player] = await Promise.all([
    prisma.player.update({ where: { id: playerId }, data: dbData }),
    ...changedFields.map(f =>
      prisma.fieldSource.updateMany({ where: { playerId, fieldName: f, isActive: true }, data: { isActive: false } })
    ),
    ...(customFieldNames.length > 0
      ? [prisma.customField.deleteMany({ where: { playerId, fieldName: { in: customFieldNames } } })]
      : []),
  ] as const)

  // Round 2: create new FieldSources + CustomFields in parallel (after deactivations/deletes above)
  const newSources = changedFields
    .filter(f => fieldValues[f] !== null && fieldValues[f] !== '')
    .map(f => ({ playerId, fieldName: f, value: fieldValues[f] as string, sourceName: 'manual', sourceUrl: null, isActive: true }))

  await Promise.all([
    ...(newSources.length > 0 ? [prisma.fieldSource.createMany({ data: newSources })] : []),
    ...(nonEmptyCustom.length > 0
      ? [prisma.customField.createMany({ data: nonEmptyCustom.map(([fieldName, value]) => ({ playerId, fieldName, value: String(value).trim() })) })]
      : []),
  ])

  // Upsert agent/referral names into name banks (fire-and-forget, skip phone numbers; overwrite phone on agent)
  const isLikelyName = (v: string) => v.length > 0 && !v.startsWith('+') && (v.match(/\d/g) ?? []).length <= 3
  const agentNameToBank  = ('agentName' in body) ? body.agentName?.trim() : null
  const agentPhoneToBank = customFieldUpdates['agentPhone']?.trim() || null
  const referralToBank   = customFieldUpdates['sentBy']?.trim()
  Promise.all([
    agentNameToBank && isLikelyName(agentNameToBank)
      ? prisma.agentNameBank.upsert({ where: { name: agentNameToBank }, create: { name: agentNameToBank, phone: agentPhoneToBank }, update: { phone: agentPhoneToBank } })
      : null,
    referralToBank && isLikelyName(referralToBank)
      ? prisma.referralNameBank.upsert({ where: { name: referralToBank }, create: { name: referralToBank }, update: {} })
      : null,
  ].filter(Boolean)).catch(() => {})

  return NextResponse.json(player)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({ where: { id: databaseId }, include: { access: { where: { agentId: user.id } } } })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const playerToDelete = await prisma.player.findUnique({ where: { id: playerId }, select: { databaseId: true } })
  if (!playerToDelete || playerToDelete.databaseId !== databaseId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.player.delete({ where: { id: playerId } })

  return NextResponse.json({ ok: true })
}
