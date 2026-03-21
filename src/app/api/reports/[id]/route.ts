import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report || report.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(report)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report || report.agentId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.report.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
