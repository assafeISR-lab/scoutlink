import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import SearchClient from './SearchClient'

export default async function SearchPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const databases = await prisma.playerDatabase.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  })

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Web Scout a Player</h1>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">Search for players and import them into your database</p>
      </div>
      <SearchClient databases={databases} userName={user.user_metadata?.full_name || user.email || 'Agent'} />
    </>
  )
}
