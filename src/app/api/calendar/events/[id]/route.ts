import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const event = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!event || event.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: body.title?.trim() ?? event.title,
      type: body.type ?? event.type,
      notes: body.notes?.trim() ?? event.notes,
      startAt: body.startAt ? new Date(body.startAt) : event.startAt,
      linkedPlayerId: body.linkedPlayerId !== undefined ? body.linkedPlayerId : event.linkedPlayerId,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const event = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!event || event.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.calendarEvent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
