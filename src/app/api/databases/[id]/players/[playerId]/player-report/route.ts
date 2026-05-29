import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── Section keys ──────────────────────────────────────────────────────────────
export type SectionKey =
  | 'physical' | 'contract' | 'scoutInfo' | 'description'
  | 'heatMap' | 'seasonStats' | 'fmAttributes' | 'evaluations'
  | 'files' | 'highlights'

// ── Helpers ───────────────────────────────────────────────────────────────────
function cf(customFields: { fieldName: string; value: string }[], name: string): string {
  return customFields.find(f => f.fieldName === name)?.value ?? ''
}

function calcAge(dob: Date | null): string {
  if (!dob) return 'Unknown'
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toString()
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return 'Unknown'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ratingDesc(v: number | null): string {
  if (!v) return 'Not assessed'
  const labels: Record<number, string> = { 1: 'Poor (1/5)', 2: 'Below average (2/5)', 3: 'Adequate (3/5)', 4: 'Good (4/5)', 5: 'Excellent (5/5)' }
  return labels[v] ?? `${v}/5`
}

function formatSeasonStats(json: string): string {
  try {
    const data = JSON.parse(json) as { seasons?: { season?: string; apps?: number; goals?: number; assists?: number; [k: string]: unknown }[] }
    if (!data.seasons?.length) return 'No season stats recorded'
    return data.seasons.map(s => {
      const parts = [`Season ${s.season ?? 'Unknown'}`]
      if (s.apps != null) parts.push(`${s.apps} apps`)
      if (s.goals != null) parts.push(`${s.goals} goals`)
      if (s.assists != null) parts.push(`${s.assists} assists`)
      const extra = Object.entries(s)
        .filter(([k]) => !['season','apps','goals','assists'].includes(k))
        .map(([k, v]) => `${k}: ${v}`)
      return [...parts, ...extra].join(', ')
    }).join(' | ')
  } catch { return 'Season stats available but could not be parsed' }
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(
  player: {
    firstName: string; lastName: string; middleName: string | null
    position: string | null; dateOfBirth: Date | null; heightCm: number | null
    nationality: string | null; clubName: string | null; playsNational: boolean
    available: boolean; agentName: string | null; marketValue: number | null
    customFields: { fieldName: string; value: string }[]
    evaluations: {
      matchDate: Date | null; venue: string | null; competition: string | null
      opponent: string | null; matchResult: string | null
      ratingTechnical: number | null; ratingTactical: number | null
      ratingPhysical: number | null; ratingMentality: number | null; ratingPotential: number | null
      commentTechnical: string | null; commentTactical: string | null
      commentPhysical: string | null; commentMentality: string | null; commentPotential: string | null
      recommendation: string | null; confidence: string | null
      riskRelativeAge: boolean; riskWeakCompetition: boolean; riskPhysicalAdvantage: boolean
      riskAttitudeDiscipline: boolean; riskFamilySurroundings: boolean; riskInjuryHistory: boolean
      observationNotes: string | null
      agent: { fullName: string }
    }[]
    files: { fileName: string; mimeType: string; createdAt: Date }[]
  },
  sections: Record<SectionKey, boolean>,
  scoutName: string
): string {
  const cfs = player.customFields
  const name = [player.firstName, player.middleName, player.lastName].filter(Boolean).join(' ')
  const blocks: string[] = [`PLAYER: ${name}`]

  if (sections.physical) {
    const lines = [
      `Position: ${player.position ?? 'Unknown'}`,
      `Age: ${calcAge(player.dateOfBirth)}`,
      `Height: ${player.heightCm ? `${player.heightCm} cm` : 'Unknown'}`,
      `Nationality: ${player.nationality ?? 'Unknown'}`,
      `Foot: ${cf(cfs, 'foot') || 'Unknown'}`,
      `Passports: ${cf(cfs, 'passports') || 'None recorded'}`,
      `Plays National Team: ${player.playsNational ? 'Yes' : 'No'}`,
      `Availability: ${player.available ? 'Available' : 'Not Available'}`,
    ]
    const injury = cf(cfs, 'injuryType')
    if (injury) {
      lines.push(`Current Injury: ${injury}`)
      const ret = cf(cfs, 'injuryReturn')
      if (ret) lines.push(`Expected Return: ${fmtDate(ret)}`)
    }
    blocks.push(`PHYSICAL PROFILE:\n${lines.join('\n')}`)
  }

  if (sections.contract) {
    const mv = player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(2)}m` : 'Unknown'
    const lines = [
      `Club: ${player.clubName ?? 'Unknown'}`,
      `League: ${cf(cfs, 'league') || 'Unknown'}`,
      `Joining Date: ${fmtDate(cf(cfs, 'joiningDate')) || 'Unknown'}`,
      `Contract Expiry: ${fmtDate(cf(cfs, 'contractExpiry')) || 'Unknown'}`,
      `Market Value: ${mv}`,
      `FM Wages: ${cf(cfs, 'fmWages') || 'Unknown'}`,
      `Transfer Fee Expectation: ${cf(cfs, 'transferFeeExpect') || 'Not set'}`,
      `Salary Expectation: ${cf(cfs, 'salaryExpect') || 'Not set'}`,
    ]
    blocks.push(`CONTRACT & VALUE:\n${lines.join('\n')}`)
  }

  if (sections.scoutInfo) {
    const lines = [
      `Agent: ${player.agentName ?? cf(cfs, 'agentName') ?? 'Unknown'}`,
      `Agent Phone: ${cf(cfs, 'agentPhone') || 'Not recorded'}`,
      `Referral / Sent By: ${cf(cfs, 'sentBy') || 'Not recorded'}`,
      `Recent Form: ${cf(cfs, 'recentForm') || 'Not recorded'}`,
    ]
    const instagram = cf(cfs, 'instagram')
    if (instagram) lines.push(`Instagram: ${instagram}`)
    blocks.push(`SCOUT INFO:\n${lines.join('\n')}`)
  }

  if (sections.description) {
    const desc = cf(cfs, 'description')
    blocks.push(`SCOUT DESCRIPTION:\n${desc || 'No description recorded'}`)
  }

  if (sections.heatMap) {
    const heatmap = cf(cfs, 'heatmap')
    blocks.push(`HEAT MAP: ${heatmap ? 'Position heatmap data is available, showing the player\'s movement and positioning distribution on the pitch.' : 'No heatmap data available'}`)
  }

  if (sections.seasonStats) {
    const stats = cf(cfs, 'seasonStats')
    blocks.push(`SEASON STATISTICS:\n${stats ? formatSeasonStats(stats) : 'No season stats recorded'}`)
  }

  if (sections.fmAttributes) {
    const attrs = cf(cfs, 'fmAttributes')
    blocks.push(`FM ATTRIBUTES:\n${attrs || 'No FM attribute data recorded'}`)
  }

  if (sections.evaluations) {
    if (player.evaluations.length === 0) {
      blocks.push('SCOUT EVALUATIONS:\nNo formal evaluations recorded for this player.')
    } else {
      const recLabels: Record<string, string> = { top_target: 'Top Talent', monitor: 'Monitor', pass: 'Reject' }
      const evalBlocks = player.evaluations.map((e, i) => {
        const risks = [
          e.riskRelativeAge && 'Relative age effect',
          e.riskWeakCompetition && 'Weak competition level',
          e.riskPhysicalAdvantage && 'Physical advantage over peers',
          e.riskAttitudeDiscipline && 'Attitude / Discipline concerns',
          e.riskFamilySurroundings && 'Off-field influences',
          e.riskInjuryHistory && 'Injury history',
        ].filter(Boolean).join(', ')

        const lines = [
          `Evaluation #${i + 1} — ${fmtDate(e.matchDate)} by ${e.agent.fullName}`,
          `Match: ${[e.competition, e.opponent ? `vs ${e.opponent}` : null, e.venue, e.matchResult].filter(Boolean).join(' | ')}`,
          `Technical: ${ratingDesc(e.ratingTechnical)}${e.commentTechnical ? ` ("${e.commentTechnical}")` : ''}`,
          `Tactical: ${ratingDesc(e.ratingTactical)}${e.commentTactical ? ` ("${e.commentTactical}")` : ''}`,
          `Physical: ${ratingDesc(e.ratingPhysical)}${e.commentPhysical ? ` ("${e.commentPhysical}")` : ''}`,
          `Mentality: ${ratingDesc(e.ratingMentality)}${e.commentMentality ? ` ("${e.commentMentality}")` : ''}`,
          `Potential: ${ratingDesc(e.ratingPotential)}${e.commentPotential ? ` ("${e.commentPotential}")` : ''}`,
          `Recommendation: ${recLabels[e.recommendation ?? ''] ?? 'Not given'} — Confidence: ${e.confidence ?? 'Not given'}`,
          risks ? `Risk Flags: ${risks}` : 'Risk Flags: None',
          e.observationNotes ? `Observation Notes: ${e.observationNotes}` : 'Observation Notes: None',
        ]
        return lines.join('\n')
      })
      blocks.push(`SCOUT EVALUATIONS (${player.evaluations.length} total):\n\n${evalBlocks.join('\n\n')}`)
    }
  }

  if (sections.files) {
    if (player.files.length === 0) {
      blocks.push('ATTACHED FILES: None')
    } else {
      const fileList = player.files.map(f => `- ${f.fileName} (${f.mimeType}, uploaded ${fmtDate(f.createdAt)})`).join('\n')
      blocks.push(`ATTACHED FILES (${player.files.length}):\n${fileList}`)
    }
  }

  if (sections.highlights) {
    const raw = cf(cfs, 'highlights')
    if (!raw) {
      blocks.push('HIGHLIGHT VIDEOS: None attached')
    } else {
      try {
        const urls = JSON.parse(raw) as string[]
        blocks.push(`HIGHLIGHT VIDEOS (${urls.length} clip${urls.length !== 1 ? 's' : ''}):\n${urls.map((u, i) => `${i + 1}. ${u}`).join('\n')}`)
      } catch {
        blocks.push('HIGHLIGHT VIDEOS: Data available but could not be parsed')
      }
    }
  }

  blocks.push(`Reporting Scout: ${scoutName}`)
  return blocks.join('\n\n')
}

const REPORT_SYSTEM = `You are a professional football scouting analyst writing a comprehensive player report for a club, director of football, or sporting director.

Your task: synthesise all provided player data into a polished, professional scouting report. Write in authoritative scouting language. Use section labels in uppercase followed by a colon. Plain text only — no markdown symbols.

Structure:

PLAYER SUMMARY:
Who the player is — name, age, position, club, nationality. One strong opening paragraph covering the key profile facts.

TECHNICAL PROFILE:
Assess technical ability. Reference FM attributes if provided. Ground in evaluation ratings and scout comments if available. 2-4 sentences.

PHYSICAL PROFILE:
Assess physical qualities — height, athleticism, fitness. Reference evaluation physical ratings and comments if available. 2-4 sentences.

TACTICAL PROFILE:
How the player reads the game, positioning, decision-making. Reference tactical evaluation ratings and comments if available. 2-4 sentences.

MENTALITY & POTENTIAL:
Character, attitude, composure under pressure. Development ceiling. Reference mentality and potential ratings if available. 2-4 sentences.

STATISTICAL OVERVIEW:
If season stats are provided, summarise performance numbers in context. If not available, state "No statistical data available."

EVALUATION HISTORY:
If evaluations are provided, synthesise observations across all matches. Note trends (improvement, consistency, specific moments). If multiple evaluations exist with conflicting recommendations, note it. If no evaluations, state "No formal evaluations on record."

RISK ASSESSMENT:
Summarise any risk flags across all evaluations. If no risks flagged, state "No significant risk flags identified."

CONTRACT & MARKET SITUATION:
If contract/value data is provided, summarise — market value, contract expiry, fees, wages. If not included, omit this section.

SCOUT VERDICT:
The overall recommendation (Top Talent / Monitor / Reject) and confidence level. Clear justification in 3-4 sentences. If multiple evaluations have different recommendations, synthesise them into one overall verdict.

Guidelines:
- Ratings are 1-5: 1-2 below standard, 3 adequate, 4 good, 5 exceptional
- Write in third person: "The player demonstrates…"
- Be specific — use actual data from the input
- Do not invent facts not present in the input
- If a section has no data, write one sentence noting that
- This report will be printed and shared with clubs — keep it professional`

// ── GET — fetch existing report ───────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.playerReport.findUnique({ where: { playerId } })
  return NextResponse.json(report ?? null)
}

// ── POST — generate report ────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Auth check
  const db = await prisma.playerDatabase.findUnique({
    where: { id: databaseId },
    include: { access: { where: { agentId: user.id } } },
  })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (db.ownerId !== user.id && db.access.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { sections: Record<SectionKey, boolean> }
  const sections = body.sections

  // Fetch all player data
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      customFields: { select: { fieldName: true, value: true } },
      evaluations: {
        include: { agent: { select: { fullName: true } } },
        orderBy: { matchDate: 'asc' },
      },
      files: { select: { fileName: true, mimeType: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const agent = await prisma.agent.findUnique({ where: { id: user.id }, select: { fullName: true } })

  const prompt = buildPrompt(player, sections, agent?.fullName ?? 'Scout')

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: [{ type: 'text', text: REPORT_SYSTEM, cache_control: { type: 'ephemeral' } }] as Parameters<typeof anthropic.messages.create>[0]['system'],
    messages: [{ role: 'user', content: prompt }],
  })

  const draft = resp.content.find(b => b.type === 'text')?.text ?? ''

  // Upsert the PlayerReport
  const report = await prisma.playerReport.upsert({
    where: { playerId },
    create: { playerId, agentId: user.id, reportDraft: draft, reportFinalized: false, includedSections: sections },
    update: { reportDraft: draft, reportFinalized: false, includedSections: sections, agentId: user.id },
  })

  return NextResponse.json({
    ...report,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  })
}

// ── PATCH — save draft / finalize ─────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.playerReport.findUnique({ where: { playerId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.agentId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { reportDraft?: string; reportFinalized?: boolean }
  const data: { reportDraft?: string | null; reportFinalized?: boolean } = {}
  if (body.reportDraft !== undefined) data.reportDraft = body.reportDraft?.trim() || null
  if (body.reportFinalized !== undefined) data.reportFinalized = Boolean(body.reportFinalized)

  const updated = await prisma.playerReport.update({ where: { playerId }, data })
  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}
