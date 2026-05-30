import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string; playerId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId } = await params

  const proposals = await prisma.playerProposal.findMany({
    where: { playerId, agentId: user.id },
    include: {
      request: {
        select: {
          id: true,
          position: true,
          ageMin: true,
          ageMax: true,
          budget: true,
          transferType: true,
          nationality: true,
          notes: true,
          status: true,
          club: { select: { id: true, name: true, country: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ proposals })
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId } = await params
  const { proposalId, status } = await req.json()

  const existing = await prisma.playerProposal.findFirst({
    where: { id: proposalId, playerId, agentId: user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.playerProposal.update({
    where: { id: proposalId },
    data: { status },
    include: {
      request: {
        select: {
          id: true,
          position: true,
          ageMin: true,
          ageMax: true,
          budget: true,
          transferType: true,
          nationality: true,
          notes: true,
          status: true,
          club: { select: { id: true, name: true, country: true } },
        },
      },
    },
  })

  return NextResponse.json({ proposal: updated })
}
