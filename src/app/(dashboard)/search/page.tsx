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
    <SearchClient databases={databases} userName={user.user_metadata?.full_name || user.email || 'Agent'} />
  )
}
