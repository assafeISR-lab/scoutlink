import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import SearchClient from './SearchClient'

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [databases, websites] = await Promise.all([
    prisma.playerDatabase.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    }),
    prisma.agentWebsite.findMany({
      where: { agentId: user.id },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return (
    <div className="min-h-screen text-white flex" style={{ background: 'linear-gradient(135deg, #0a0d14 0%, #0f1117 50%, #0a0f0d 100%)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        userId={user.id}
      />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Web Scout a Player</h1>
          <p style={{ color: 'rgba(255,255,255,0.3)' }} className="text-sm">Search for players and import them into your database</p>
        </div>
        <SearchClient databases={databases} websites={websites} />
      </main>
    </div>
  )
}
