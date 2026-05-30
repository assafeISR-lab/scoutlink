import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; requestId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { requestId } = await params

  const request = await prisma.clubRequest.findUnique({ where: { id: requestId } })
  if (!request || request.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { playerId, note } = body
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 })

  const proposal = await prisma.playerProposal.upsert({
    where: { requestId_playerId: { requestId, playerId } },
    create: { requestId, playerId, agentId: user.id, note: note?.trim() || null, status: 'proposed' },
    update: { note: note?.trim() || null, status: 'proposed' },
    include: { player: { select: { id: true, firstName: true, lastName: true, position: true, clubName: true, databaseId: true, database: { select: { name: true } } } } },
  })

  return NextResponse.json({ proposal })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; requestId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { requestId } = await params

  const body = await req.json()
  const { proposalId, status, note } = body
  if (!proposalId) return NextResponse.json({ error: 'proposalId required' }, { status: 400 })

  const proposal = await prisma.playerProposal.findUnique({ where: { id: proposalId } })
  if (!proposal || proposal.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.playerProposal.update({
    where: { id: proposalId },
    data: {
      ...(status !== undefined && { status }),
      ...(note !== undefined && { note: note?.trim() || null }),
    },
    include: { player: { select: { id: true, firstName: true, lastName: true, position: true, clubName: true, databaseId: true, database: { select: { name: true } } } } },
  })

  return NextResponse.json({ proposal: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; requestId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { proposalId } = body
  if (!proposalId) return NextResponse.json({ error: 'proposalId required' }, { status: 400 })

  const proposal = await prisma.playerProposal.findUnique({ where: { id: proposalId } })
  if (!proposal || proposal.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.playerProposal.delete({ where: { id: proposalId } })
  return NextResponse.json({ ok: true })
}
