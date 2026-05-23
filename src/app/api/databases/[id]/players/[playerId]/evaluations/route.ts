import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({
    where: { id: databaseId },
    include: { access: { where: { agentId: user.id } } },
  })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  if (!isOwner && db.access.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const evaluations = await prisma.playerEvaluation.findMany({
    where: { playerId },
    include: { agent: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(evaluations.map(e => ({
    ...e,
    matchDate: e.matchDate?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  })))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  try {
    const { id: databaseId, playerId } = await params
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await prisma.playerDatabase.findUnique({
      where: { id: databaseId },
      include: { access: { where: { agentId: user.id } } },
    })
    if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isOwner = db.ownerId === user.id
    const isContributor = db.access[0]?.permission === 'contributor'
    if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()

    const evaluation = await prisma.playerEvaluation.create({
      data: {
        playerId,
        agentId: user.id,
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
      ...evaluation,
      matchDate: evaluation.matchDate?.toISOString() ?? null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST evaluations]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
