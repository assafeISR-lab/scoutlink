import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  for (const row of body.players) {
    if (!row.firstName?.trim() || !row.lastName?.trim()) { errors.push(`Row missing name`); continue }

    const nameKey = `${row.firstName.trim().toLowerCase()} ${row.lastName.trim().toLowerCase()}`
    const existingId = existingMap.get(nameKey)

    if (existingId) {
      if (row.conflictAction === 'skip') { skipped++; continue }
      if (row.conflictAction === 'overwrite') {
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
            weightKg: row.weightKg ?? undefined,
            marketValue: row.marketValue ?? undefined,
            goalsThisYear: row.goalsThisYear ?? undefined,
            totalGoals: row.totalGoals ?? undefined,
            totalGames: row.totalGames ?? undefined,
            nationalGames: row.nationalGames ?? undefined,
            yearsInProClub: row.yearsInProClub ?? undefined,
            playsNational: row.playsNational ?? undefined,
          },
        })
        if (row.customFields && Object.keys(row.customFields).length > 0) {
          for (const [fieldName, value] of Object.entries(row.customFields)) {
            if (!value?.trim()) continue
            await prisma.customField.upsert({
              where: { playerId_fieldName: { playerId: existingId, fieldName } } as never,
              create: { playerId: existingId, fieldName, value: value.trim() },
              update: { value: value.trim() },
            }).catch(async () => {
              await prisma.customField.deleteMany({ where: { playerId: existingId, fieldName } })
              await prisma.customField.create({ data: { playerId: existingId, fieldName, value: value.trim() } })
            })
          }
        }
        overwritten++
        continue
      }
      skipped++; continue
    }

    try {
      const player = await prisma.player.create({
        data: {
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
          weightKg: row.weightKg ?? null,
          marketValue: row.marketValue ?? null,
          goalsThisYear: row.goalsThisYear ?? null,
          totalGoals: row.totalGoals ?? null,
          totalGames: row.totalGames ?? null,
          nationalGames: row.nationalGames ?? null,
          yearsInProClub: row.yearsInProClub ?? null,
          playsNational: row.playsNational ?? false,
        },
      })
      if (row.customFields && Object.keys(row.customFields).length > 0) {
        const cfEntries = Object.entries(row.customFields)
          .filter(([, v]) => v?.trim())
          .map(([fieldName, value]) => ({ playerId: player.id, fieldName, value: value.trim() }))
        if (cfEntries.length > 0) await prisma.customField.createMany({ data: cfEntries })
      }
      imported++
    } catch (e) {
      errors.push(`Failed to import ${row.firstName} ${row.lastName}`)
    }
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
  weightKg?: number | null
  marketValue?: number | null
  goalsThisYear?: number | null
  totalGoals?: number | null
  totalGames?: number | null
  nationalGames?: number | null
  yearsInProClub?: number | null
  playsNational?: boolean
  customFields?: Record<string, string>
  conflictAction?: 'skip' | 'overwrite'
}
