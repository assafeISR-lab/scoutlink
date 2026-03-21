import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reports = await prisma.report.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, databaseName: true, playerCount: true, createdAt: true },
  })

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Report name is required' }, { status: 400 })
  if (!Array.isArray(body.players)) return NextResponse.json({ error: 'Invalid players data' }, { status: 400 })

  try {
    const report = await prisma.report.create({
      data: {
        agentId: user.id,
        name: body.name.trim(),
        databaseId: body.databaseId ?? '',
        databaseName: body.databaseName ?? '',
        playerCount: body.players.length,
        players: body.players,
      },
    })
    return NextResponse.json(report)
  } catch (err) {
    console.error('Report create error:', err)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }
}
