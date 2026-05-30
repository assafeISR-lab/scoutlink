import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ clubId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clubId } = await params

  const club = await prisma.club.findUnique({ where: { id: clubId } })
  if (!club || club.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { teamLevel, contactName, contactPhone, contactEmail } = await req.json()
  if (!teamLevel?.trim()) return NextResponse.json({ error: 'teamLevel required' }, { status: 400 })

  const contact = await prisma.clubTeamContact.upsert({
    where: { clubId_teamLevel: { clubId, teamLevel } },
    create: { clubId, teamLevel, contactName, contactPhone, contactEmail },
    update: { contactName, contactPhone, contactEmail },
  })

  return NextResponse.json({ contact })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clubId } = await params

  const club = await prisma.club.findUnique({ where: { id: clubId } })
  if (!club || club.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { teamLevel } = await req.json()
  await prisma.clubTeamContact.deleteMany({ where: { clubId, teamLevel } })

  return NextResponse.json({ ok: true })
}
