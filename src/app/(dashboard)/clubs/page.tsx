import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClubsClient, { type ClubRow } from './ClubsClient'

export default async function ClubsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const clubs = await prisma.club.findMany({
    where: { agentId: user.id },
    include: { requests: { where: { status: 'open' }, select: { id: true, teamLevel: true } } },
    orderBy: { name: 'asc' },
  })

  const serialized: ClubRow[] = clubs.map(c => ({
    id: c.id,
    name: c.name,
    country: c.country,
    contactName: c.contactName,
    contactPhone: c.contactPhone,
    contactEmail: c.contactEmail,
    notes: c.notes,
    logoUrl: c.logoUrl,
    teamLevels: (c.teamLevels as string[] | null) ?? [],
    createdAt: c.createdAt.toISOString(),
    requests: c.requests.map(r => ({ id: r.id, teamLevel: r.teamLevel })),
  }))

  return <ClubsClient initialClubs={serialized} />
}
