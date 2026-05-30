import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function authorizeRequest(requestId: string, userId: string) {
  const req = await prisma.clubRequest.findUnique({ where: { id: requestId } })
  if (!req || req.agentId !== userId) return null
  return req
}

const PROPOSAL_PLAYER_SELECT = {
  id: true, firstName: true, lastName: true,
  position: true, clubName: true,
  databaseId: true, database: { select: { name: true } },
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; requestId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { requestId } = await params
  if (!await authorizeRequest(requestId, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { teamLevel, position, ageMin, ageMax, budget, transferType, nationality, notes, status } = body

  const updated = await prisma.clubRequest.update({
    where: { id: requestId },
    data: {
      ...(teamLevel !== undefined && { teamLevel: teamLevel?.trim() || null }),
      ...(position !== undefined && { position: position?.trim() || null }),
      ...(ageMin !== undefined && { ageMin: ageMin ? parseInt(ageMin) : null }),
      ...(ageMax !== undefined && { ageMax: ageMax ? parseInt(ageMax) : null }),
      ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
      ...(transferType !== undefined && { transferType }),
      ...(nationality !== undefined && { nationality: nationality?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(status !== undefined && { status }),
    },
    include: {
      proposals: {
        select: { id: true, status: true, player: { select: PROPOSAL_PLAYER_SELECT } },
      },
    },
  })

  return NextResponse.json({ request: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; requestId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { requestId } = await params
  if (!await authorizeRequest(requestId, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.clubRequest.delete({ where: { id: requestId } })
  return NextResponse.json({ ok: true })
}
