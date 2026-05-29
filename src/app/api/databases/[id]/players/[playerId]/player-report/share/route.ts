import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId } = await params

  const report = await prisma.playerReport.findUnique({ where: { playerId } })
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.agentId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Reuse existing token or generate a new one
  const token = report.shareToken ?? randomBytes(24).toString('hex')

  const updated = await prisma.playerReport.update({
    where: { playerId },
    data: { shareToken: token, shareTokenCreatedAt: report.shareToken ? undefined : new Date() },
  })

  return NextResponse.json({ token: updated.shareToken })
}
