import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function authorizeClub(clubId: string, userId: string) {
  const club = await prisma.club.findUnique({ where: { id: clubId } })
  if (!club) return null
  if (club.agentId !== userId) return null
  return club
}

const PROPOSAL_PLAYER_SELECT = {
  id: true, firstName: true, lastName: true,
  position: true, clubName: true,
  databaseId: true, database: { select: { name: true } },
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clubId } = await params

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      teamContacts: { orderBy: { createdAt: 'asc' } },
      requests: {
        orderBy: { createdAt: 'desc' },
        include: {
          proposals: {
            select: { id: true, status: true, player: { select: PROPOSAL_PLAYER_SELECT } },
          },
        },
      },
    },
  })
  if (!club || club.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ club })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clubId } = await params
  if (!await authorizeClub(clubId, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, country, contactName, contactPhone, contactEmail, notes, teamLevels } = body

  const club = await prisma.club.update({
    where: { id: clubId },
    data: {
      ...(name !== undefined && { name }),
      ...(country !== undefined && { country }),
      ...(contactName !== undefined && { contactName }),
      ...(contactPhone !== undefined && { contactPhone }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(notes !== undefined && { notes }),
      ...(teamLevels !== undefined && { teamLevels }),
    },
  })
  return NextResponse.json({ club })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clubId } = await params
  if (!await authorizeClub(clubId, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.club.delete({ where: { id: clubId } })
  return NextResponse.json({ ok: true })
}
