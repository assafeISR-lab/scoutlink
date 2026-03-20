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
