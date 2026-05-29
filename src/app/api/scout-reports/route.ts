import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const evaluations = await prisma.playerEvaluation.findMany({
    where: { agentId: user.id, reportFinalized: true },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          clubName: true,
          databaseId: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(evaluations.map(e => ({
    id: e.id,
    matchDate: e.matchDate?.toISOString() ?? null,
    competition: e.competition,
    recommendation: e.recommendation,
    updatedAt: e.updatedAt.toISOString(),
    player: {
      id: e.player.id,
      name: `${e.player.firstName} ${e.player.lastName}`,
      position: e.player.position,
      clubName: e.player.clubName,
      databaseId: e.player.databaseId,
    },
  })))
}
