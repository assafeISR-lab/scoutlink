import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import CreateDatabaseButton from './CreateDatabaseButton'

export default async function DatabasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        userId={user.id}
      />

      <main className="main-content flex-1 p-8 overflow-auto" style={{ color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">My Players Watch List</h1>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">Manage your scouting Lists</p>
          </div>
          <CreateDatabaseButton />
        </div>

        {/* Owned databases */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">My Lists ({ownedDbs.length})</h2>
          {ownedDbs.length === 0 ? (
            <EmptyState message="You haven't created any databases yet." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedDbs.map(db => (
                <DatabaseCard
                  key={db.id}
                  id={db.id}
                  name={db.name}
                  playerCount={db._count.players}
                  sharedWith={db.access.length}
                  permission="owner"
                  createdAt={db.createdAt}
                />
              ))}
            </div>
          )}
        </section>

        {/* Shared databases */}
        {sharedAccess.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Shared With Me ({sharedAccess.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedAccess.map(({ database, permission }) => (
                <DatabaseCard
                  key={database.id}
                  id={database.id}
                  name={database.name}
                  playerCount={database._count.players}
                  sharedWith={0}
                  permission={permission}
                  ownerName={database.owner.fullName}
                  createdAt={database.createdAt}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function DatabaseCard({ id, name, playerCount, sharedWith, permission, ownerName, createdAt }: {
  id: string
  name: string
  playerCount: number
  sharedWith: number
  permission: string
  ownerName?: string
  createdAt: Date
}) {
  const isOwner = permission === 'owner'
  const color = isOwner ? '#00c896' : '#6c8fff'

  return (
    <a href={`/databases/${id}`} className="block rounded-2xl border border-white/5 p-5 transition-all duration-200 hover:border-white/10 hover:scale-[1.01]" style={{
      background: 'var(--card-bg)',
      boxShadow: 'var(--card-shadow)',
    }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill={color}>
            <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4S4 11.21 4 9zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/>
          </svg>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full font-medium uppercase tracking-wide" style={{
          background: `${color}15`,
          color,
        }}>
          {isOwner ? 'Owner' : permission}
        </span>
      </div>

      <h3 className="text-base font-semibold text-white mb-1 truncate">{name}</h3>
      {ownerName && <p className="text-xs text-white/30 mb-3">by {ownerName}</p>}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
        <div>
          <p className="text-xl font-bold text-white">{playerCount}</p>
          <p className="text-[10px] text-white/30">Players</p>
        </div>
        {isOwner && sharedWith > 0 && (
          <div>
            <p className="text-xl font-bold text-white">{sharedWith}</p>
            <p className="text-[10px] text-white/30">Shared</p>
          </div>
        )}
        <div className="ml-auto">
          <p className="text-[10px] text-white/20">{new Date(createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </a>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
      <p className="text-white/30 text-sm">{message}</p>
    </div>
  )
}
