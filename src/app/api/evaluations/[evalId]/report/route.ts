import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ evalId: string }> }) {
  const { evalId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const evaluation = await prisma.playerEvaluation.findUnique({ where: { id: evalId } })
  if (!evaluation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (evaluation.agentId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  const data: { reportDraft?: string | null; reportFinalized?: boolean } = {}
  if (body.reportDraft !== undefined) data.reportDraft = body.reportDraft?.trim() || null
  if (body.reportFinalized !== undefined) data.reportFinalized = Boolean(body.reportFinalized)

  const updated = await prisma.playerEvaluation.update({
    where: { id: evalId },
    data,
    include: { agent: { select: { id: true, fullName: true } } },
  })

  return NextResponse.json({
    ...updated,
    matchDate: updated.matchDate?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}
