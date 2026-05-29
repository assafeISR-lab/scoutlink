import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 1 })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  // Last 7 days of activity
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const logs = await prisma.activityLog.findMany({
    where: { createdAt: { gte: since } },
    include: { agent: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  if (logs.length === 0) {
    console.log('No activity in the last 7 days.')
    return
  }

  // Group by user
  const byUser = new Map<string, { name: string; email: string; counts: Record<string, number>; latest: Date }>()
  for (const log of logs) {
    const key = log.agentId
    if (!byUser.has(key)) {
      byUser.set(key, {
        name: log.agent.fullName,
        email: log.agent.email,
        counts: {},
        latest: log.createdAt,
      })
    }
    const entry = byUser.get(key)!
    entry.counts[log.action] = (entry.counts[log.action] ?? 0) + 1
    if (log.createdAt > entry.latest) entry.latest = log.createdAt
  }

  console.log(`\n=== Activity last 7 days (${logs.length} total events) ===\n`)
  for (const [, u] of byUser) {
    console.log(`👤 ${u.name} <${u.email}>  (last active: ${u.latest.toLocaleString()})`)
    for (const [action, count] of Object.entries(u.counts).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${action.padEnd(15)} × ${count}`)
    }
    console.log('')
  }

  // Show last 20 search/import events in detail
  const scrapeEvents = logs.filter(l => l.action === 'search' || l.action === 'import')
  if (scrapeEvents.length > 0) {
    console.log(`=== Last ${Math.min(20, scrapeEvents.length)} scrape/search events ===\n`)
    for (const log of scrapeEvents.slice(0, 20)) {
      console.log(`  ${log.createdAt.toLocaleString()}  [${log.action}]  ${log.agent.fullName}  →  ${log.detail ?? ''}`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
