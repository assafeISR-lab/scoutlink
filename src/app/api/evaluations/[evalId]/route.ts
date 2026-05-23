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

  const updated = await prisma.playerEvaluation.update({
    where: { id: evalId },
    data: {
      matchDate:            body.matchDate ? new Date(body.matchDate) : null,
      venue:                body.venue?.trim()       || null,
      competition:          body.competition?.trim() || null,
      opponent:             body.opponent?.trim()    || null,
      matchResult:          body.matchResult?.trim() || null,
      ratingTechnical:      body.ratingTechnical  || null,
      ratingTactical:       body.ratingTactical   || null,
      ratingPhysical:       body.ratingPhysical   || null,
      ratingMentality:      body.ratingMentality  || null,
      ratingPotential:      body.ratingPotential  || null,
      commentTechnical:     body.commentTechnical?.trim()  || null,
      commentTactical:      body.commentTactical?.trim()   || null,
      commentPhysical:      body.commentPhysical?.trim()   || null,
      commentMentality:     body.commentMentality?.trim()  || null,
      commentPotential:     body.commentPotential?.trim()  || null,
      recommendation:       body.recommendation   || null,
      confidence:           body.confidence       || null,
      riskRelativeAge:       body.riskRelativeAge       ?? false,
      riskWeakCompetition:   body.riskWeakCompetition   ?? false,
      riskPhysicalAdvantage: body.riskPhysicalAdvantage ?? false,
      riskAttitudeDiscipline:body.riskAttitudeDiscipline ?? false,
      riskFamilySurroundings:body.riskFamilySurroundings ?? false,
      riskInjuryHistory:     body.riskInjuryHistory     ?? false,
      observationNotes:     body.observationNotes?.trim() || null,
    },
    include: { agent: { select: { id: true, fullName: true } } },
  })

  return NextResponse.json({
    ...updated,
    matchDate: updated.matchDate?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ evalId: string }> }) {
  const { evalId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const evaluation = await prisma.playerEvaluation.findUnique({ where: { id: evalId } })
  if (!evaluation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (evaluation.agentId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.playerEvaluation.delete({ where: { id: evalId } })
  return NextResponse.json({ ok: true })
}
