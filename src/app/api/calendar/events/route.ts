import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!body.startAt) return NextResponse.json({ error: 'Date is required' }, { status: 400 })

  const event = await prisma.calendarEvent.create({
    data: {
      agentId: user.id,
      title: body.title.trim(),
      type: body.type || 'reminder',
      notes: body.notes?.trim() || null,
      startAt: new Date(body.startAt),
      linkedPlayerId: body.linkedPlayerId || null,
    },
  })

  return NextResponse.json(event)
}
