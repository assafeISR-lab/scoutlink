import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import DeletePlayerButton from './DeletePlayerButton'
import CreatePlayerReportButton from './CreatePlayerReportButton'
import PlayerProfileCard from './PlayerProfileCard'

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [player, db] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      include: {
        notes: { include: { agent: true }, orderBy: { createdAt: 'desc' } },
        fieldSources: { where: { isActive: true } },
        addedBy: { select: { fullName: true } },
        customFields: true,
      },
    }),
    prisma.playerDatabase.findUnique({
      where: { id: databaseId },
      include: { access: { where: { agentId: user.id } } },
    }),
  ])

  if (!player || !db || player.databaseId !== databaseId) notFound()
  const isOwner = db.ownerId === user.id
  if (!isOwner && db.access.length === 0) redirect('/databases')

  const canWrite = isOwner || db.access[0]?.permission === 'contributor'

  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        userId={user.id}
        playerName={`${player.firstName} ${player.lastName}`}
        playerDatabaseId={databaseId}
      />

      <main className="main-content flex-1 p-8 overflow-auto" style={{ color: 'var(--text-primary)' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-faint)' }}>
          <Link href="/databases" className="hover:text-[#00c896] transition-colors">Players Watch List</Link>
          <span>/</span>
          <Link href={`/databases/${databaseId}`} className="hover:text-[#00c896] transition-colors">{db.name}</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-muted)' }}>{player.firstName} {player.lastName}</span>
        </div>

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Player Card</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{player.firstName} {player.lastName} · {db.name}</p>
        </div>

        <PlayerProfileCard
          player={player}
          addedByName={player.addedBy.fullName}
          currentUserId={user.id}
          databaseId={databaseId}
          canWrite={canWrite}
          actionButtons={
            <>
              <CreatePlayerReportButton
                databaseId={databaseId}
                databaseName={db.name}
                player={{
                  id: player.id,
                  name: `${player.firstName}${player.middleName ? ` ${player.middleName}` : ''} ${player.lastName}`,
                  position: player.position,
                  clubName: player.clubName,
                  nationality: player.nationality,
                  age,
                  heightCm: player.heightCm,
                  weightKg: player.weightKg,
                  marketValue: player.marketValue,
                  agentName: player.agentName,
                  playsNational: player.playsNational,
                  goalsThisYear: player.goalsThisYear,
                  totalGoals: player.totalGoals,
                  totalGames: player.totalGames,
                  nationalGames: player.nationalGames,
                  yearsInProClub: player.yearsInProClub,
                  notes: player.notes.map(n => ({
                    content: n.content,
                    createdAt: n.createdAt.toISOString(),
                    agentName: n.agent?.fullName ?? null,
                  })),
                }}
              />
              {canWrite && (
                <DeletePlayerButton databaseId={databaseId} playerId={playerId} playerName={`${player.firstName} ${player.lastName}`} />
              )}
            </>
          }
        />
      </main>
    </div>
  )
}
