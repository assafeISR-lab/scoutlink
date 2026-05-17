import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 1 })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  try {
    const p = await prisma.player.findFirst({ select: { id: true, available: true, playsNational: true } })
    console.log('Player query OK:', JSON.stringify(p))

    const db = await prisma.playerDatabase.findFirst({
      include: {
        players: {
          take: 2,
          include: { customFields: { select: { fieldName: true, value: true }, where: { fieldName: { in: ['league', 'foot'] } } } }
        }
      }
    })
    console.log('PlayerDatabase query OK. Players:', db?.players.length, 'First available:', db?.players[0]?.available)
  } catch(e: any) {
    console.error('PRISMA ERROR:', e.message)
    console.error('Code:', e.code, '| Meta:', JSON.stringify(e.meta))
  } finally {
    await prisma.$disconnect()
    pool.end()
  }
}
main()
