import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clubs = await prisma.club.findMany({
    where: { agentId: user.id },
    include: {
      requests: {
        where: { status: 'open' },
        select: { id: true, teamLevel: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ clubs })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, country, contactName, contactPhone, contactEmail, notes, teamLevels } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const club = await prisma.club.create({
    data: {
      agentId: user.id,
      name: name.trim(),
      country,
      contactName,
      contactPhone,
      contactEmail,
      notes,
      teamLevels: teamLevels ?? [],
    },
    include: {
      requests: { where: { status: 'open' }, select: { id: true, teamLevel: true } },
    },
  })

  return NextResponse.json({ club })
}
