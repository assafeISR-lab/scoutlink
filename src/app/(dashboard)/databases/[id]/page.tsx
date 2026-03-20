import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import AddPlayerButton from './AddPlayerButton'

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

  return (
    <div className="min-h-screen text-white flex" style={{ background: 'linear-gradient(135deg, #0a0d14 0%, #0f1117 50%, #0a0f0d 100%)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
      />

      <main className="flex-1 p-8 overflow-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-6">
          <Link href="/databases" className="hover:text-white/60 transition-colors">My Database</Link>
          <span>/</span>
          <span className="text-white/60">{db.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{db.name}</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {db.players.length} player{db.players.length !== 1 ? 's' : ''} · {isOwner ? 'You own this database' : `Shared by ${db.owner.fullName}`}
            </p>
          </div>
          {(isOwner || db.access[0]?.permission === 'contributor') && (
            <AddPlayerButton databaseId={id} />
          )}
        </div>

        {/* Players table */}
        {db.players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#00c89615', border: '1px solid #00c89630' }}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#00c896"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <p className="text-white/40 text-sm mb-1">No players yet</p>
            <p className="text-white/20 text-xs">Click "Add Player" to add your first player</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #141720 0%, #111318 100%)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-white/30 font-medium">Player</th>
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-white/30 font-medium">Position</th>
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-white/30 font-medium">Club</th>
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-white/30 font-medium">Age</th>
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-white/30 font-medium">Market Value</th>
                </tr>
              </thead>
              <tbody>
                {db.players.map((player, i) => {
                  const age = player.dateOfBirth
                    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                    : null

                  return (
                    <tr key={player.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors cursor-pointer" style={i % 2 === 0 ? {} : { background: 'rgba(255,255,255,0.01)' }}>
                      <td className="px-6 py-4">
                        <Link href={`/databases/${id}/players/${player.id}`} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                            {player.firstName[0]}{player.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{player.firstName} {player.lastName}</p>
                            {player.nationality && <p className="text-xs text-white/30">{player.nationality}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/50">{player.position || '—'}</td>
                      <td className="px-6 py-4 text-sm text-white/50">{player.clubName || '—'}</td>
                      <td className="px-6 py-4 text-sm text-white/50">{age ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-white/50">
                        {player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(1)}M` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
