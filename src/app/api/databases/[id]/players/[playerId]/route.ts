import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({ where: { id: databaseId }, include: { access: { where: { agentId: user.id } } } })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      firstName: body.firstName?.trim() || undefined,
      lastName: body.lastName?.trim() || undefined,
      middleName: body.middleName?.trim() || null,
      position: body.position?.trim() || null,
      clubName: body.clubName?.trim() || null,
      nationality: body.nationality?.trim() || null,
      agentName: body.agentName?.trim() || null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      heightCm: body.heightCm != null && body.heightCm !== '' ? parseFloat(body.heightCm) : null,
      weightKg: body.weightKg != null && body.weightKg !== '' ? parseFloat(body.weightKg) : null,
      marketValue: body.marketValue != null && body.marketValue !== '' ? parseFloat(body.marketValue) * 1_000_000 : null,
      goalsThisYear: body.goalsThisYear != null && body.goalsThisYear !== '' ? parseInt(body.goalsThisYear) : null,
      totalGoals: body.totalGoals != null && body.totalGoals !== '' ? parseInt(body.totalGoals) : null,
      totalGames: body.totalGames != null && body.totalGames !== '' ? parseInt(body.totalGames) : null,
      nationalGames: body.nationalGames != null && body.nationalGames !== '' ? parseInt(body.nationalGames) : null,
      yearsInProClub: body.yearsInProClub != null && body.yearsInProClub !== '' ? parseInt(body.yearsInProClub) : null,
      playsNational: body.playsNational ?? undefined,
    },
  })

  // Mark manually-changed fields in FieldSource
  const changedFields: string[] = Array.isArray(body.changedFields) ? body.changedFields : []
  if (changedFields.length > 0) {
    const fieldValues: Record<string, string | null> = {
      position:      body.position?.trim()     || null,
      clubName:      body.clubName?.trim()      || null,
      nationality:   body.nationality?.trim()   || null,
      agentName:     body.agentName?.trim()     || null,
      dateOfBirth:   body.dateOfBirth           || null,
      heightCm:      body.heightCm !== '' && body.heightCm != null ? String(parseFloat(body.heightCm)) : null,
      weightKg:      body.weightKg !== '' && body.weightKg != null ? String(parseFloat(body.weightKg)) : null,
      marketValue:   body.marketValue !== '' && body.marketValue != null ? String(parseFloat(body.marketValue) * 1_000_000) : null,
      playsNational: String(body.playsNational ?? false),
      goalsThisYear: body.goalsThisYear !== '' && body.goalsThisYear != null ? body.goalsThisYear : null,
      totalGoals:    body.totalGoals    !== '' && body.totalGoals    != null ? body.totalGoals    : null,
      totalGames:    body.totalGames    !== '' && body.totalGames    != null ? body.totalGames    : null,
      nationalGames: body.nationalGames !== '' && body.nationalGames != null ? body.nationalGames : null,
      yearsInProClub:body.yearsInProClub!== '' && body.yearsInProClub!= null ? body.yearsInProClub: null,
    }

    for (const fieldName of changedFields) {
      const value = fieldValues[fieldName]
      // Deactivate any existing active sources for this field
      await prisma.fieldSource.updateMany({
        where: { playerId, fieldName, isActive: true },
        data:  { isActive: false },
      })
      // Create new manual source if there is a value
      if (value !== null && value !== '') {
        await prisma.fieldSource.create({
          data: { playerId, fieldName, value, sourceName: 'manual', sourceUrl: null, isActive: true },
        })
      }
    }
  }

  // Handle custom fields (extra fields not in the Player model)
  const customFieldUpdates: Record<string, string> = body.customFields ?? {}
  for (const [fieldName, rawValue] of Object.entries(customFieldUpdates)) {
    const value = String(rawValue ?? '').trim()
    const existing = await prisma.customField.findFirst({ where: { playerId, fieldName } })
    if (value === '') {
      if (existing) await prisma.customField.delete({ where: { id: existing.id } })
    } else if (existing) {
      await prisma.customField.update({ where: { id: existing.id }, data: { value } })
    } else {
      await prisma.customField.create({ data: { playerId, fieldName, value } })
    }
  }

  return NextResponse.json(player)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({ where: { id: databaseId }, include: { access: { where: { agentId: user.id } } } })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.player.delete({ where: { id: playerId } })

  return NextResponse.json({ ok: true })
}
