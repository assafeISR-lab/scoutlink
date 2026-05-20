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
  const hasAccess = db.ownerId === user.id || db.access.length > 0
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const players = await prisma.player.findMany({
    where: { databaseId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      position: true,
      clubName: true,
      nationality: true,
      agentName: true,
      dateOfBirth: true,
      heightCm: true,
      marketValue: true,
      available: true,
      playsNational: true,
      customFields: { select: { fieldName: true, value: true } },
    },
  })

  return NextResponse.json({ players, columnConfig: db.columnConfig ?? null })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify access
  const db = await prisma.playerDatabase.findUnique({ where: { id: databaseId }, include: { access: { where: { agentId: user.id } } } })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.firstName?.trim() || !body.lastName?.trim()) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
  }

  const player = await prisma.player.create({
    data: {
      databaseId,
      addedById: user.id,
      firstName: body.firstName.trim(),
      middleName: body.middleName?.trim() || null,
      lastName: body.lastName.trim(),
      position: body.position?.trim() || null,
      clubName: body.clubName?.trim() || null,
      nationality: body.nationality?.trim() || null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      heightCm: body.heightCm ?? null,
      marketValue: body.marketValue ?? null,
      agentName: body.agentName?.trim() || null,
      playsNational: body.playsNational ?? false,
      available:    body.available ?? true,
    },
  })

  // Save custom fields (extended params not in the Player model)
  const customFields: Record<string, string> = body.customFields ?? {}
  const cfEntries = Object.entries(customFields)
    .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
    .map(([fieldName, value]) => ({ playerId: player.id, fieldName, value: String(value).trim() }))
  if (cfEntries.length > 0) {
    await prisma.customField.createMany({ data: cfEntries })
  }

  // If imported from an external source, record field provenance
  if (body.sourceName && body.sourceUrl) {
    const fieldMap: Record<string, string | null> = {
      clubName: body.clubName?.trim() || null,
      position: body.position?.trim() || null,
      nationality: body.nationality?.trim() || null,
      dateOfBirth: body.dateOfBirth ?? null,
      heightCm: body.heightCm != null ? String(body.heightCm) : null,
    }
    const sources = Object.entries(fieldMap)
      .filter(([, v]) => v !== null)
      .map(([fieldName, value]) => ({
        playerId: player.id,
        fieldName,
        value: value as string,
        sourceName: body.sourceName,
        sourceUrl: body.sourceUrl,
      }))
    if (sources.length > 0) {
      await prisma.fieldSource.createMany({ data: sources })
    }
  }

  // Log activity
  const action = body.sourceName ? 'import' : 'add_player'
  const detail = `${body.firstName} ${body.lastName}${body.sourceName ? ` from ${body.sourceName}` : ''}`
  await prisma.activityLog.create({ data: { agentId: user.id, action, detail } }).catch(() => {})

  return NextResponse.json(player)
}
