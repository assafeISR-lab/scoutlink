import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import DatabasePageClient from './DatabasePageClient'

export default async function DatabaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const [db, allDatabases] = await Promise.all([
    prisma.playerDatabase.findUnique({
      where: { id },
      include: {
        owner: { select: { fullName: true } },
        players: {
          orderBy: { createdAt: 'desc' },
          include: {
            customFields: {
              select: { fieldName: true, value: true },
              where: { fieldName: { in: ['league', 'foot', 'contractExpiry', 'fmWages', 'photo'] } },
            },
          },
        },
        access: { where: { agentId: user.id } },
      },
    }),
    prisma.playerDatabase.findMany({
      where: { OR: [{ ownerId: user.id }, { access: { some: { agentId: user.id, permission: 'contributor' } } }] },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!db) notFound()

  const isOwner = db.ownerId === user.id
  const hasAccess = isOwner || db.access.length > 0
  if (!hasAccess) redirect('/databases')

  const canEdit = isOwner || db.access[0]?.permission === 'contributor'

  const players = db.players.map(p => ({
    ...p,
    dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    customFields: p.customFields.map(cf => ({ fieldName: cf.fieldName, value: cf.value })),
  }))

  return (
    <DatabasePageClient
      players={players}
      databaseId={id}
      databaseName={db.name}
      ownerName={db.owner.fullName ?? ''}
      isOwner={isOwner}
      canEdit={canEdit}
      columnConfig={Array.isArray(db.columnConfig) ? db.columnConfig as string[] : null}
      allDatabases={allDatabases}
    />
  )
}
