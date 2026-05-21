import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({
    where: { id: databaseId },
    include: { access: { where: { agentId: user.id } } },
  })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const canAccess = db.ownerId === user.id || db.access.length > 0
  if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const players = await prisma.player.findMany({
    where: { databaseId },
    select: { id: true, firstName: true, lastName: true },
  })
  return NextResponse.json(players)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({
    where: { id: databaseId },
    include: { access: { where: { agentId: user.id } } },
  })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body: { players: ImportRow[] } = await req.json()
  if (!Array.isArray(body.players) || body.players.length === 0) {
    return NextResponse.json({ error: 'No players provided' }, { status: 400 })
  }

  const existing = await prisma.player.findMany({
    where: { databaseId },
    select: { id: true, firstName: true, lastName: true },
  })
  const existingMap = new Map(
    existing.map(p => [`${p.firstName.toLowerCase()} ${p.lastName.toLowerCase()}`, p.id])
  )

  let imported = 0, skipped = 0, overwritten = 0
  const errors: string[] = []

  // Separate rows into new, overwrite, and skip buckets
  const toCreate: { row: ImportRow }[] = []
  const toOverwrite: { row: ImportRow; existingId: string }[] = []

  for (const row of body.players) {
    if (!row.firstName?.trim() || !row.lastName?.trim()) { errors.push(`Row missing name`); continue }
    const nameKey = `${row.firstName.trim().toLowerCase()} ${row.lastName.trim().toLowerCase()}`
    const existingId = existingMap.get(nameKey)
    if (existingId) {
      if (row.conflictAction === 'overwrite') {
        toOverwrite.push({ row, existingId })
      } else {
        skipped++
      }
    } else {
      toCreate.push({ row })
    }
  }

  // ── Batch create new players ───────────────────────────────────────────────
  if (toCreate.length > 0) {
    const createData = toCreate.map(({ row }) => ({
      databaseId,
      addedById: user.id,
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
      middleName: row.middleName?.trim() || null,
      position: row.position?.trim() || null,
      clubName: row.clubName?.trim() || null,
      nationality: row.nationality?.trim() || null,
      agentName: row.agentName?.trim() || null,
      dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
      heightCm: row.heightCm ?? null,
      marketValue: row.marketValue ?? null,
      playsNational: row.playsNational ?? false,
    }))

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await (prisma.player as any).createManyAndReturn({
        data: createData,
        select: { id: true, firstName: true, lastName: true },
      }) as { id: string; firstName: string; lastName: string }[]

      imported += created.length

      // Build custom field entries for newly created players
      const cfEntries: { playerId: string; fieldName: string; value: string }[] = []
      for (const createdPlayer of created) {
        const nameKey = `${createdPlayer.firstName.toLowerCase()} ${createdPlayer.lastName.toLowerCase()}`
        // Find the matching row (by position in toCreate array matching by name)
        const match = toCreate.find(({ row }) =>
          `${row.firstName.trim().toLowerCase()} ${row.lastName.trim().toLowerCase()}` === nameKey
        )
        if (!match) continue
        const cfs = match.row.customFields
        if (cfs) {
          for (const [fieldName, value] of Object.entries(cfs)) {
            if (value?.trim()) cfEntries.push({ playerId: createdPlayer.id, fieldName, value: value.trim() })
          }
        }
      }

      if (cfEntries.length > 0) {
        await prisma.customField.createMany({ data: cfEntries })
      }
    } catch {
      errors.push(`Batch create failed — some players may not have been imported`)
    }
  }

  // ── Overwrite existing players ─────────────────────────────────────────────
  if (toOverwrite.length > 0) {
    await Promise.all(toOverwrite.map(async ({ row, existingId }) => {
      try {
        await prisma.player.update({
          where: { id: existingId },
          data: {
            position: row.position?.trim() || undefined,
            clubName: row.clubName?.trim() || undefined,
            nationality: row.nationality?.trim() || undefined,
            agentName: row.agentName?.trim() || undefined,
            middleName: row.middleName?.trim() || undefined,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
            heightCm: row.heightCm ?? undefined,
            marketValue: row.marketValue ?? undefined,
            playsNational: row.playsNational ?? undefined,
          },
        })
        if (row.customFields && Object.keys(row.customFields).length > 0) {
          const existingCfs = await prisma.customField.findMany({ where: { playerId: existingId } })
          const existingCfMap = new Map(existingCfs.map(cf => [cf.fieldName, cf.id]))
          const toUpsert = Object.entries(row.customFields).filter(([, v]) => v?.trim())
          await Promise.all(toUpsert.map(([fieldName, value]) => {
            const cfId = existingCfMap.get(fieldName)
            if (cfId) return prisma.customField.update({ where: { id: cfId }, data: { value: value.trim() } })
            return prisma.customField.create({ data: { playerId: existingId, fieldName, value: value.trim() } })
          }))
        }
        overwritten++
      } catch {
        errors.push(`Failed to overwrite ${row.firstName} ${row.lastName}`)
      }
    }))
  }

  if (imported > 0) {
    await prisma.activityLog.create({
      data: { agentId: user.id, action: 'import', detail: `Imported ${imported} players to ${db.name}` },
    }).catch(() => {})
  }

  return NextResponse.json({ imported, skipped, overwritten, errors })
}

interface ImportRow {
  firstName: string
  lastName: string
  middleName?: string
  position?: string
  clubName?: string
  nationality?: string
  agentName?: string
  dateOfBirth?: string
  heightCm?: number | null
  marketValue?: number | null
  playsNational?: boolean
  customFields?: Record<string, string>
  conflictAction?: 'skip' | 'overwrite'
}
