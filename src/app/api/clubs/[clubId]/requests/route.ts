import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clubId } = await params

  const club = await prisma.club.findUnique({ where: { id: clubId } })
  if (!club || club.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { teamLevel, position, ageMin, ageMax, budget, transferType, nationality, notes } = body

  const request = await prisma.clubRequest.create({
    data: {
      clubId,
      agentId: user.id,
      teamLevel: teamLevel?.trim() || null,
      position: position?.trim() || null,
      ageMin: ageMin ? parseInt(ageMin) : null,
      ageMax: ageMax ? parseInt(ageMax) : null,
      budget: budget ? parseFloat(budget) : null,
      transferType: transferType || null,
      nationality: nationality?.trim() || null,
      notes: notes?.trim() || null,
    },
    include: {
      proposals: {
        select: {
          id: true, status: true,
          player: {
            select: {
              id: true, firstName: true, lastName: true,
              position: true, clubName: true,
              databaseId: true, database: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  return NextResponse.json({ request })
}
