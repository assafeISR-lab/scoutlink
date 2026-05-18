import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import CreateDatabaseButton from './CreateDatabaseButton'
import ImportDatabasesButton from './ImportDatabasesButton'
import DatabasesClient from './DatabasesClient'

export default async function DatabasesPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [ownedDbs, sharedAccess] = await Promise.all([
    prisma.playerDatabase.findMany({
      where: { ownerId: user.id },
      include: { _count: { select: { players: true } }, access: { include: { agent: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.databaseAccess.findMany({
      where: { agentId: user.id },
      include: { database: { include: { owner: true, _count: { select: { players: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const ownedSerialized = ownedDbs.map(db => ({
    id: db.id,
    name: db.name,
    playerCount: db._count.players,
    sharedWith: db.access.length,
    permission: 'owner' as const,
    createdAt: db.createdAt.toISOString(),
  }))

  const sharedSerialized = sharedAccess.map(({ database, permission }) => ({
    id: database.id,
    name: database.name,
    playerCount: database._count.players,
    sharedWith: 0,
    permission,
    ownerName: database.owner.fullName,
    createdAt: database.createdAt.toISOString(),
  }))

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="mr-auto">
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Players Watch List</h1>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Manage your scouting lists</p>
        </div>
        <ImportDatabasesButton databases={[
          ...ownedSerialized.map(d => ({ id: d.id, name: d.name })),
          ...sharedAccess.filter(a => a.permission === 'contributor').map(a => ({ id: a.database.id, name: a.database.name })),
        ]} />
        <CreateDatabaseButton />
      </div>

      <DatabasesClient ownedDbs={ownedSerialized} sharedDbs={sharedSerialized} />
    </>
  )
}
