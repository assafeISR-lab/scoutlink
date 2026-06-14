import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface ExtractedFilters {
  position?: string | null
  positionExclude?: string | null
  ageMin?: number | null
  ageMax?: number | null
  nationality?: string | null
  preferredFoot?: string | null
  marketValueMin?: number | null
  marketValueMax?: number | null
  salaryMin?: number | null
  salaryMax?: number | null
  contractExpiryYearMax?: number | null
  freeAgentOnly?: boolean | null
  league?: string | null
  club?: string | null
}

interface RankedResult {
  playerId: string
  score: number
  explanation: string
}

const EXTRACT_SYSTEM = `You are a football agent assistant. Extract structured search filters from a player description.
Return ONLY a valid JSON object with these fields (use null for anything not mentioned or unclear):
{
  "position": string | null,
  "positionExclude": string | null,
  "ageMin": number | null,
  "ageMax": number | null,
  "nationality": string | null,
  "preferredFoot": "Right" | "Left" | "Both" | null,
  "marketValueMin": number | null,
  "marketValueMax": number | null,
  "salaryMin": number | null,
  "salaryMax": number | null,
  "contractExpiryYearMax": number | null,
  "freeAgentOnly": boolean | null,
  "league": string | null,
  "club": string | null
}
Rules:
- position: a specific position or comma-separated list to INCLUDE (e.g. "Striker,Centre-Back"). Set to null if description says "all positions" or does not restrict by position.
- positionExclude: comma-separated positions to EXCLUDE (e.g. "LB,RB"). Use when description says "except", "not", "excluding" certain positions.
- marketValue values are in euros.
- salaryMin/salaryMax: annual salary in euros (convert if given per week or per month). Use when description mentions budget, salary, wages.
- contractExpiryYearMax: latest year the contract can expire (e.g. "expiring soon" → current year + 1).
- freeAgentOnly: true if description says "free", "free agent", "out of contract", "no transfer fee needed", "available for free".
Return no text outside the JSON object.`

const RANK_SYSTEM = `You are an expert football analyst. Given a player description and a list of candidate players, score and rank the best matches.
Each player may include: name, position, nationality, club, league, age, heightCm, marketValue, foot, passports, contractExpiry, fmWages, transferFeeExpect, transferFeeReal, salaryExpect, salaryReal, playsNational, agentName, description, fmAttributes.
Use every available field to judge fit. Pay special attention to description as it contains agent tracking context.
Return ONLY a valid JSON array of up to 10 objects, sorted by score descending:
[{"playerId": "...", "score": 85, "explanation": "..."}]
score: 0–100 (100 = perfect match). explanation: 1–2 sentences on why this player matches.
Return no text outside the JSON array.`

function calcAge(dob: Date | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function getCF(customFields: { fieldName: string; value: string }[], name: string): string {
  return customFields.find(f => f.fieldName === name)?.value ?? ''
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const message: string = body.message ?? ''
  const scopedDatabaseId: string | undefined = body.databaseId
  if (!message.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── LLM Call 1: Extract structured filters ────────────────────────────────
  const extractResp = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: [{ type: 'text', text: EXTRACT_SYSTEM, cache_control: { type: 'ephemeral' } }] as Parameters<typeof anthropic.messages.create>[0]['system'],
    messages: [{ role: 'user', content: message }],
  })

  const extractText = extractResp.content.find(b => b.type === 'text')?.text ?? '{}'
  let filters: ExtractedFilters = {}
  try {
    const m = extractText.match(/\{[\s\S]*\}/)
    if (m) filters = JSON.parse(m[0])
  } catch { /* use empty filters */ }

  // ── DB Query ──────────────────────────────────────────────────────────────
  let allDbs: { id: string; name: string }[]

  if (scopedDatabaseId) {
    const db = await prisma.playerDatabase.findUnique({
      where: { id: scopedDatabaseId },
      include: { access: { where: { agentId: user.id } } },
    })
    if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const canAccess = db.ownerId === user.id || db.access.length > 0
    if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    allDbs = [{ id: db.id, name: db.name }]
  } else {
    const [ownedDbs, sharedAccess] = await Promise.all([
      prisma.playerDatabase.findMany({ where: { ownerId: user.id }, select: { id: true, name: true } }),
      prisma.databaseAccess.findMany({
        where: { agentId: user.id },
        select: { database: { select: { id: true, name: true } } },
      }),
    ])
    allDbs = [...ownedDbs, ...sharedAccess.map(a => a.database)]
  }

  if (allDbs.length === 0) return NextResponse.json({ results: [], filters })

  const dbNameMap = Object.fromEntries(allDbs.map(d => [d.id, d.name]))

  const now = new Date()
  const ageToDate = (age: number) => new Date(now.getFullYear() - age, now.getMonth(), now.getDate())

  // Build where clause for standard fields
  // Guard: only apply position filter if it looks like a real position value (short, no "all"/"except")
  const positionFilter = filters.position &&
    filters.position.length < 40 &&
    !/\b(all|every|any|except|excluding|not)\b/i.test(filters.position)
      ? filters.position : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    databaseId: { in: allDbs.map(d => d.id) },
    ...(positionFilter && { position: { contains: positionFilter, mode: 'insensitive' } }),
    ...(filters.nationality && { nationality: { contains: filters.nationality, mode: 'insensitive' } }),
    ...(filters.club && { clubName: { contains: filters.club, mode: 'insensitive' } }),
  }

  if (filters.ageMin != null || filters.ageMax != null) {
    where.dateOfBirth = {
      ...(filters.ageMax != null ? { gte: ageToDate(filters.ageMax + 1) } : {}),
      ...(filters.ageMin != null ? { lte: ageToDate(filters.ageMin) } : {}),
    }
  }

  if (filters.marketValueMin != null || filters.marketValueMax != null) {
    where.marketValue = {
      ...(filters.marketValueMin != null ? { gte: filters.marketValueMin } : {}),
      ...(filters.marketValueMax != null ? { lte: filters.marketValueMax } : {}),
    }
  }

  const rawPlayers = await prisma.player.findMany({
    where,
    include: { customFields: { select: { fieldName: true, value: true } } },
    take: 200,
  })

  // Pre-compute excluded positions (lowercased) for fast lookup
  const excludedPositions = filters.positionExclude
    ? filters.positionExclude.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    : []

  // In-memory filter for custom fields and position exclusion
  const candidates = rawPlayers.filter(p => {
    // Position exclusion — e.g. "all positions except LB, RB"
    if (excludedPositions.length > 0 && p.position) {
      const pos = p.position.toLowerCase()
      if (excludedPositions.some(ex => pos.includes(ex))) return false
    }

    if (filters.preferredFoot) {
      const foot = getCF(p.customFields, 'foot')
      if (foot && foot.toLowerCase() !== filters.preferredFoot.toLowerCase()) return false
    }
    if (filters.league) {
      const league = getCF(p.customFields, 'league')
      if (league && !league.toLowerCase().includes(filters.league.toLowerCase())) return false
    }
    if (filters.contractExpiryYearMax != null) {
      const expiry = getCF(p.customFields, 'contractExpiry')
      if (expiry) {
        const d = new Date(expiry)
        if (!isNaN(d.getTime()) && d.getFullYear() > filters.contractExpiryYearMax) return false
      }
    }
    // Free agent: contractExpiry must be empty, or already expired / expiring this year
    if (filters.freeAgentOnly) {
      const expiry = getCF(p.customFields, 'contractExpiry')
      if (expiry) {
        const d = new Date(expiry)
        if (!isNaN(d.getTime()) && d.getFullYear() > now.getFullYear()) return false
      }
    }
    // Salary filter against salaryExpect / salaryReal / fmWages (all stored as strings)
    if (filters.salaryMin != null || filters.salaryMax != null) {
      const rawSalary = getCF(p.customFields, 'salaryExpect') ||
                        getCF(p.customFields, 'salaryReal') ||
                        getCF(p.customFields, 'fmWages')
      if (rawSalary) {
        // Extract first number from the string (handles "€70,000", "£3,000 p/w", "70000", etc.)
        const numStr = rawSalary.replace(/[^0-9.]/g, '')
        const num = parseFloat(numStr)
        if (!isNaN(num)) {
          // Rough heuristic: if value looks weekly (< 10000), multiply by 52
          const annual = num < 10000 ? num * 52 : num
          if (filters.salaryMin != null && annual < filters.salaryMin) return false
          if (filters.salaryMax != null && annual > filters.salaryMax) return false
        }
      }
    }
    return true
  }).slice(0, 50)

  if (candidates.length === 0) return NextResponse.json({ results: [], filters })

  // ── LLM Call 2: Score and rank top 10 ────────────────────────────────────
  const CF_FIELDS = [
    'foot', 'league', 'passports', 'joiningDate', 'contractExpiry',
    'fmWages', 'transferFeeExpect', 'transferFeeReal', 'salaryExpect', 'salaryReal',
    'description', 'fmAttributes', 'seasonStats',
  ]

  const playerSummaries = candidates.map(p => {
    const base: Record<string, unknown> = {
      playerId: p.id,
      name: `${p.firstName} ${p.lastName}`,
      position: p.position,
      nationality: p.nationality,
      club: p.clubName,
      age: calcAge(p.dateOfBirth),
      heightCm: p.heightCm,
      marketValue: p.marketValue,
      agentName: p.agentName,
      playsNational: p.playsNational || null,
    }
    for (const field of CF_FIELDS) {
      const val = getCF(p.customFields, field)
      if (val) base[field] = val
    }
    // Strip nulls/undefined to keep payload compact
    return Object.fromEntries(Object.entries(base).filter(([, v]) => v != null))
  })

  const rankResp = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system: [{ type: 'text', text: RANK_SYSTEM, cache_control: { type: 'ephemeral' } }] as Parameters<typeof anthropic.messages.create>[0]['system'],
    messages: [{
      role: 'user',
      content: `Description:\n${message}\n\nCandidates:\n${JSON.stringify(playerSummaries, null, 2)}`,
    }],
  })

  const rankText = rankResp.content.find(b => b.type === 'text')?.text ?? '[]'
  let ranked: RankedResult[] = []
  try {
    const m = rankText.match(/\[[\s\S]*\]/)
    if (m) ranked = JSON.parse(m[0])
  } catch { /* return empty */ }

  const playerMap = Object.fromEntries(candidates.map(p => [p.id, p]))
  const results = ranked
    .filter(r => playerMap[r.playerId])
    .slice(0, 10)
    .map(r => {
      const p = playerMap[r.playerId]
      return {
        score: r.score,
        explanation: r.explanation,
        player: {
          id: p.id,
          databaseId: p.databaseId,
          databaseName: dbNameMap[p.databaseId] ?? '',
          firstName: p.firstName,
          lastName: p.lastName,
          position: p.position ?? null,
          clubName: p.clubName ?? null,
          nationality: p.nationality ?? null,
          age: calcAge(p.dateOfBirth),
          heightCm: p.heightCm ?? null,
          marketValue: p.marketValue ?? null,
          photo: getCF(p.customFields, 'photo'),
          foot: getCF(p.customFields, 'foot'),
          league: getCF(p.customFields, 'league'),
        },
      }
    })

  return NextResponse.json({ results, filters })
}
