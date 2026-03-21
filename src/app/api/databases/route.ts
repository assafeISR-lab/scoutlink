import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const databases = await prisma.playerDatabase.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { access: { some: { agentId: user.id } } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, ownerId: true },
  })

  return NextResponse.json(databases)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const db = await prisma.playerDatabase.create({
    data: { name: name.trim(), ownerId: user.id },
  })

  return NextResponse.json(db)
}
