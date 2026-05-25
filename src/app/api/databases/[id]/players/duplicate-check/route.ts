import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({
    where: { id: databaseId },
    include: { access: { where: { agentId: user.id } } },
  })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  const hasAccess = isOwner || db.access.length > 0
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { names: { first: string; last: string }[] }
  if (!Array.isArray(body.names)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const existing = await prisma.player.findMany({
    where: { databaseId },
    select: { id: true, firstName: true, lastName: true, clubName: true },
  })

  const matches: { inputFirst: string; inputLast: string; matchedId: string; matchedName: string; clubName: string | null; switched: boolean }[] = []

  for (const { first, last } of body.names) {
    const f = first.trim().toLowerCase()
    const l = last.trim().toLowerCase()
    for (const p of existing) {
      const pf = p.firstName.toLowerCase()
      const pl = p.lastName.toLowerCase()
      const exact = pf === f && pl === l
      const switched = pf === l && pl === f
      if (exact || switched) {
        matches.push({
          inputFirst: first,
          inputLast: last,
          matchedId: p.id,
          matchedName: `${p.firstName} ${p.lastName}`,
          clubName: p.clubName,
          switched,
        })
        break
      }
    }
  }

  return NextResponse.json({ matches })
}
