import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import DatabasePageClient from './DatabasePageClient'

export default async function DatabaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = await prisma.playerDatabase.findUnique({
    where: { id },
    include: {
      owner: true,
      players: { orderBy: { createdAt: 'desc' } },
      access: { where: { agentId: user.id } },
    },
  })

  if (!db) notFound()

  const isOwner = db.ownerId === user.id
  const hasAccess = isOwner || db.access.length > 0
  if (!hasAccess) redirect('/databases')

  const canEdit = isOwner || db.access[0]?.permission === 'contributor'

  const players = db.players.map(p => ({
    ...p,
    dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }))

  return (
    <div className="min-h-screen text-white flex" style={{ background: 'linear-gradient(135deg, #0a0d14 0%, #0f1117 50%, #0a0f0d 100%)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        userId={user.id}
      />
      <main className="flex-1 p-8 overflow-auto">
        <DatabasePageClient
          players={players}
          databaseId={id}
          databaseName={db.name}
          ownerName={db.owner.fullName ?? ''}
          isOwner={isOwner}
          canEdit={canEdit}
        />
      </main>
    </div>
  )
}
