import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Reject phone numbers: starts with + or has more than 3 digit characters total
function isLikelyName(v: string) {
  const t = v.trim()
  return t.length > 0 && !t.startsWith('+') && (t.match(/\d/g) ?? []).length <= 3
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Clean up any phone-number-like entries that got seeded before the filter existed
  const allAgents = await prisma.agentNameBank.findMany({ select: { id: true, name: true } })
  const badAgentIds = allAgents.filter(r => !isLikelyName(r.name)).map(r => r.id)
  if (badAgentIds.length > 0) {
    await prisma.agentNameBank.deleteMany({ where: { id: { in: badAgentIds } } })
  }

  const [agentCount, referralCount] = await Promise.all([
    prisma.agentNameBank.count(),
    prisma.referralNameBank.count(),
  ])

  // Seed from existing player data on first call (one-time, tables are empty)
  if (agentCount === 0) {
    const existing = await prisma.player.findMany({
      where: { agentName: { not: null } },
      select: { agentName: true, customFields: { where: { fieldName: 'agentPhone' }, select: { value: true } } },
      distinct: ['agentName'],
    })
    const entries = existing
      .filter(p => isLikelyName(p.agentName!))
      .map(p => ({ name: p.agentName!.trim(), phone: p.customFields[0]?.value?.trim() || null }))
    if (entries.length > 0) {
      await prisma.agentNameBank.createMany({ data: entries, skipDuplicates: true })
    }
  }

  if (referralCount === 0) {
    const existing = await prisma.customField.findMany({
      where: { fieldName: 'sentBy' },
      select: { value: true },
      distinct: ['value'],
    })
    const names = existing.map(c => c.value.trim()).filter(isLikelyName)
    if (names.length > 0) {
      await prisma.referralNameBank.createMany({
        data: names.map(name => ({ name })),
        skipDuplicates: true,
      })
    }
  }

  const [agents, referrals] = await Promise.all([
    prisma.agentNameBank.findMany({ orderBy: { name: 'asc' }, select: { name: true, phone: true } }),
    prisma.referralNameBank.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
  ])

  return NextResponse.json({
    agents: agents.map(a => ({ name: a.name, phone: a.phone ?? null })),
    referrals: referrals.map(r => r.name),
  })
}
