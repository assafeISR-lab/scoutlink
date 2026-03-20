import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import EditPlayerButton from './EditPlayerButton'
import DeletePlayerButton from './DeletePlayerButton'

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [player, db] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      include: { notes: { include: { agent: true }, orderBy: { createdAt: 'desc' } } },
    }),
    prisma.playerDatabase.findUnique({
      where: { id: databaseId },
      include: { access: { where: { agentId: user.id } } },
    }),
  ])

  if (!player || !db || player.databaseId !== databaseId) notFound()
  const isOwner = db.ownerId === user.id
  if (!isOwner && db.access.length === 0) redirect('/databases')

  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

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
          <Link href={`/databases/${databaseId}`} className="hover:text-white/60 transition-colors">{db.name}</Link>
          <span>/</span>
          <span className="text-white/60">{player.firstName} {player.lastName}</span>
        </div>

        {/* Player header */}
        <div className="rounded-2xl border border-white/5 p-6 mb-6 flex items-start justify-between gap-4" style={{
          background: 'linear-gradient(135deg, #141720 0%, #111318 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-black flex-shrink-0" style={{
              background: 'linear-gradient(135deg, #00c896, #00a878)',
              boxShadow: '0 0 20px rgba(0,200,150,0.3)'
            }}>
              {player.firstName[0]}{player.lastName[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{player.firstName} {player.middleName ? `${player.middleName} ` : ''}{player.lastName}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {player.position && <span className="text-sm px-2.5 py-0.5 rounded-full" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>{player.position}</span>}
                {player.nationality && <span className="text-sm text-white/40">{player.nationality}</span>}
                {age && <span className="text-sm text-white/40">{age} years old</span>}
              </div>
            </div>
            {(isOwner || db.access[0]?.permission === 'contributor') && (
              <div className="flex items-center gap-2">
                <EditPlayerButton databaseId={databaseId} playerId={playerId} player={player} />
                <DeletePlayerButton databaseId={databaseId} playerId={playerId} playerName={`${player.firstName} ${player.lastName}`} />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <InfoCard title="Player Information">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Club" value={player.clubName} />
                <InfoRow label="Agent" value={player.agentName} />
                <InfoRow label="Date of Birth" value={player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : null} />
                <InfoRow label="Nationality" value={player.nationality} />
                <InfoRow label="Height" value={player.heightCm ? `${player.heightCm} cm` : null} />
                <InfoRow label="Weight" value={player.weightKg ? `${player.weightKg} kg` : null} />
                <InfoRow label="Market Value" value={player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(1)}M` : null} />
                <InfoRow label="Plays National Team" value={player.playsNational ? 'Yes' : 'No'} />
              </div>
            </InfoCard>

            {/* Career stats */}
            <InfoCard title="Career Statistics">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Goals This Year" value={player.goalsThisYear?.toString()} />
                <InfoRow label="Total Goals" value={player.totalGoals?.toString()} />
                <InfoRow label="Total Games" value={player.totalGames?.toString()} />
                <InfoRow label="National Team Games" value={player.nationalGames?.toString()} />
                <InfoRow label="Years in Pro Club" value={player.yearsInProClub?.toString()} />
              </div>
            </InfoCard>
          </div>

          {/* Notes */}
          <div>
            <InfoCard title="Scout Notes">
              {player.notes.length === 0 ? (
                <p className="text-sm text-white/20">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {player.notes.map(note => (
                    <div key={note.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-sm text-white/70">{note.content}</p>
                      <p className="text-xs text-white/25 mt-2">{note.agent.fullName} · {new Date(note.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 p-5" style={{
      background: 'linear-gradient(135deg, #141720 0%, #111318 100%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-white/30 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value ?? <span className="text-white/20">—</span>}</p>
    </div>
  )
}
