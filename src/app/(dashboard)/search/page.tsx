import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import SearchClient from './SearchClient'

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const databases = await prisma.playerDatabase.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  })

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        userId={user.id}
      />
      <main className="main-content flex-1 p-8 overflow-auto" style={{ color: 'var(--text-primary)' }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Web Scout a Player</h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">Search for players and import them into your database</p>
        </div>
        <SearchClient databases={databases} userName={user.user_metadata?.full_name || user.email || 'Agent'} />
      </main>
    </div>
  )
}
