import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const REPORT_SYSTEM = `You are a professional football scouting analyst writing a scouting report for a club or director of football. Your task is to convert a scout's structured evaluation data into a polished, professional scouting report.

Write in a professional scouting tone — authoritative, specific, and grounded in what was observed. Use real football scouting language.

Structure the report with these exact section labels (uppercase label, colon, then the text on the same or next line):

MATCH OBSERVATION: When, where, and against whom the player was observed. One to two sentences.

OVERVIEW: The player's role, general first impression, and most notable quality. Two to three sentences.

TECHNICAL: Technical ability assessment grounded in the rating and any scout comments. Two to three sentences.

TACTICAL: Tactical awareness and positioning. Two to three sentences.

PHYSICAL: Physical attributes, athleticism, work rate. Two to three sentences.

MENTALITY: Attitude, composure, leadership, competitiveness. Two to three sentences.

POTENTIAL: Development ceiling and future outlook. Two to three sentences.

RISK ASSESSMENT: Summarise any flagged risk factors. If no risks were flagged, write "No significant risk flags identified."

SCOUT VERDICT: Clear recommendation (Top Talent / Monitor / Reject) with confidence level and a 2-3 sentence justification.

Guidelines:
- Ratings are 1-5: 1-2 = below standard, 3 = adequate, 4 = good, 5 = exceptional
- Use the observation notes heavily to make the narrative specific and grounded
- Do NOT invent facts not present in the input data
- Write in third person: "The player demonstrates…", not "I observed…"
- Keep each section concise — this report will be printed and sent to clubs
- Do not use markdown symbols like ** or ## — plain text only`

function ratingDesc(v: number | null): string {
  if (!v) return 'Not assessed'
  const labels: Record<number, string> = {
    1: 'Poor (1/5)', 2: 'Below average (2/5)', 3: 'Adequate (3/5)', 4: 'Good (4/5)', 5: 'Excellent (5/5)',
  }
  return labels[v] ?? `${v}/5`
}

function calcAge(dob: Date | null): string {
  if (!dob) return 'Unknown'
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toString()
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ evalId: string }> }) {
  const { evalId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const evaluation = await prisma.playerEvaluation.findUnique({
    where: { id: evalId },
    include: {
      player: { include: { customFields: { select: { fieldName: true, value: true } } } },
      agent: { select: { fullName: true } },
    },
  })
  if (!evaluation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (evaluation.agentId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const p = evaluation.player
  const cf = (name: string) => p.customFields.find(f => f.fieldName === name)?.value ?? ''

  const recLabels: Record<string, string> = {
    top_target: 'Top Talent',
    monitor: 'Monitor',
    pass: 'Reject',
  }

  const riskFlags = [
    evaluation.riskRelativeAge && 'Relative age effect',
    evaluation.riskWeakCompetition && 'Weak competition level',
    evaluation.riskPhysicalAdvantage && 'Physical advantage over peers',
    evaluation.riskAttitudeDiscipline && 'Attitude / Discipline concerns',
    evaluation.riskFamilySurroundings && 'Off-field influences',
    evaluation.riskInjuryHistory && 'Injury history',
  ].filter(Boolean).join(', ')

  const playerName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  const matchDate = evaluation.matchDate
    ? new Date(evaluation.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Unknown date'

  const input = `PLAYER INFORMATION:
Name: ${playerName}
Age: ${calcAge(p.dateOfBirth)}
Position: ${p.position ?? 'Unknown'}
Club: ${p.clubName ?? 'Unknown'}
Nationality: ${p.nationality ?? 'Unknown'}
League: ${cf('league') || 'Unknown'}

MATCH CONTEXT:
Date Observed: ${matchDate}
Stadium: ${evaluation.venue ?? 'Not recorded'}
Competition: ${evaluation.competition ?? 'Not recorded'}
Opponent: ${evaluation.opponent ?? 'Not recorded'}
Match Result: ${evaluation.matchResult ?? 'Not recorded'}

SCOUT RATINGS:
Technical: ${ratingDesc(evaluation.ratingTechnical)}${evaluation.commentTechnical ? ` — Scout note: "${evaluation.commentTechnical}"` : ''}
Tactical: ${ratingDesc(evaluation.ratingTactical)}${evaluation.commentTactical ? ` — Scout note: "${evaluation.commentTactical}"` : ''}
Physical: ${ratingDesc(evaluation.ratingPhysical)}${evaluation.commentPhysical ? ` — Scout note: "${evaluation.commentPhysical}"` : ''}
Mentality: ${ratingDesc(evaluation.ratingMentality)}${evaluation.commentMentality ? ` — Scout note: "${evaluation.commentMentality}"` : ''}
Potential: ${ratingDesc(evaluation.ratingPotential)}${evaluation.commentPotential ? ` — Scout note: "${evaluation.commentPotential}"` : ''}

SCOUT JUDGMENT:
Recommendation: ${recLabels[evaluation.recommendation ?? ''] ?? 'Not given'}
Confidence: ${evaluation.confidence ? evaluation.confidence.charAt(0).toUpperCase() + evaluation.confidence.slice(1) : 'Not given'}

RISK FLAGS: ${riskFlags || 'None'}

SCOUT'S OBSERVATION NOTES:
${evaluation.observationNotes ?? 'No raw notes provided.'}

Evaluating Scout: ${evaluation.agent.fullName}`

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: [{ type: 'text', text: REPORT_SYSTEM, cache_control: { type: 'ephemeral' } }] as Parameters<typeof anthropic.messages.create>[0]['system'],
    messages: [{ role: 'user', content: input }],
  })

  const draft = resp.content.find(b => b.type === 'text')?.text ?? ''

  await prisma.playerEvaluation.update({
    where: { id: evalId },
    data: { reportDraft: draft, reportFinalized: false },
  })

  return NextResponse.json({ draft })
}
