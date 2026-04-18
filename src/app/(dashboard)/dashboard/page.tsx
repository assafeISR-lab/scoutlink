import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await prisma.agent.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email!,
      fullName: user.user_metadata?.full_name ?? 'Agent',
    },
  })

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalPlayers,
    totalReports,
    upcomingEvents,
    totalNotes,
    recentPlayers,
    recentReports,
    recentNotes,
    activityLogs,
  ] = await Promise.all([
    // Total players across all owned databases
    prisma.player.count({
      where: { database: { ownerId: user.id } },
    }),
    // Total reports
    prisma.report.count({ where: { agentId: user.id } }),
    // Upcoming calendar events (from today onwards)
    prisma.calendarEvent.count({
      where: { agentId: user.id, startAt: { gte: now } },
    }),
    // Total notes written
    prisma.playerNote.count({ where: { agentId: user.id } }),
    // Recently added players (last 5)
    prisma.player.findMany({
      where: { database: { ownerId: user.id } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, firstName: true, lastName: true,
        position: true, clubName: true, createdAt: true,
        database: { select: { id: true, name: true } },
      },
    }),
    // Recent reports (last 3)
    prisma.report.findMany({
      where: { agentId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, name: true, playerCount: true, createdAt: true },
    }),
    // Recent notes (last 5)
    prisma.playerNote.findMany({
      where: { agentId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, content: true, createdAt: true,
        player: { select: { id: true, firstName: true, lastName: true, database: { select: { id: true } } } },
      },
    }),
    // Recent activity logs
    prisma.activityLog.findMany({
      where: { agentId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, action: true, detail: true, createdAt: true },
    }),
  ])

  // Build unified activity feed: merge players + reports + notes + logs, sort by date
  type FeedItem = {
    key: string
    type: 'player' | 'report' | 'note' | 'log'
    label: string
    sub: string
    href?: string
    createdAt: Date
    color: string
  }

  const feed: FeedItem[] = [
    ...recentPlayers.map(p => ({
      key: `player-${p.id}`,
      type: 'player' as const,
      label: `${p.firstName} ${p.lastName} added`,
      sub: [p.position, p.clubName, p.database.name].filter(Boolean).join(' · '),
      href: `/databases/${p.database.id}/players/${p.id}`,
      createdAt: p.createdAt,
      color: '#00c896',
    })),
    ...recentReports.map(r => ({
      key: `report-${r.id}`,
      type: 'report' as const,
      label: `Report "${r.name}" created`,
      sub: `${r.playerCount} player${r.playerCount !== 1 ? 's' : ''}`,
      href: `/reports/${r.id}`,
      createdAt: r.createdAt,
      color: '#ff9f43',
    })),
    ...recentNotes.map(n => ({
      key: `note-${n.id}`,
      type: 'note' as const,
      label: `Note on ${n.player.firstName} ${n.player.lastName}`,
      sub: n.content.length > 80 ? n.content.slice(0, 80) + '…' : n.content,
      href: `/databases/${n.player.database.id}/players/${n.player.id}`,
      createdAt: n.createdAt,
      color: '#6c8fff',
    })),
    ...activityLogs.map(l => ({
      key: `log-${l.id}`,
      type: 'log' as const,
      label: formatAction(l.action),
      sub: l.detail ?? '',
      createdAt: l.createdAt,
      color: '#8b8fa8',
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)

  function formatAction(action: string) {
    const map: Record<string, string> = {
      search: 'Player searched',
      import: 'Player imported',
      add_player: 'Player added',
      delete: 'Record deleted',
    }
    return map[action] ?? action.replace(/_/g, ' ')
  }

  function timeAgo(date: Date) {
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'Agent'

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
          <h1 className="text-3xl font-bold text-white mb-1">
            Welcome Back, <span style={{ color: '#00c896' }}>{firstName}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">Here's what's happening in your scouting Board.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Players in Database" value={totalPlayers} icon={<IconDatabase />} color="#00c896" href="/databases" />
          <StatCard label="Scouting Notes" value={totalNotes} icon={<IconNote />} color="#6c8fff" />
          <StatCard label="Reports Generated" value={totalReports} icon={<IconReports />} color="#ff9f43" href="/reports" />
          <StatCard label="Upcoming Events" value={upcomingEvents} icon={<IconCalendar />} color="#ff6b9d" href="/calendar" />
        </div>

        <div className="rounded-2xl border border-white/5 p-6" style={{
          background: 'var(--card-bg)',
          boxShadow: 'var(--card-shadow)'
        }}>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-5">Recent Activity</h2>

          {feed.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/20 text-sm">No activity yet</p>
              <p className="text-white/10 text-xs mt-1">Start by searching for a player or adding to your database</p>
            </div>
          ) : (
            <div className="space-y-1">
              {feed.map(item => (
                item.href ? (
                  <Link key={item.key} href={item.href} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 group-hover:text-white transition-colors truncate">{item.label}</p>
                      {item.sub && <p className="text-xs text-white/30 truncate mt-0.5">{item.sub}</p>}
                    </div>
                    <span className="text-xs text-white/20 shrink-0 mt-0.5">{timeAgo(item.createdAt)}</span>
                  </Link>
                ) : (
                  <div key={item.key} className="flex items-start gap-3 px-3 py-2.5">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{item.label}</p>
                      {item.sub && <p className="text-xs text-white/30 truncate mt-0.5">{item.sub}</p>}
                    </div>
                    <span className="text-xs text-white/20 shrink-0 mt-0.5">{timeAgo(item.createdAt)}</span>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, color, href }: { label: string; value: number; icon: React.ReactNode; color: string; href?: string }) {
  const content = (
    <div className="rounded-2xl p-5 border border-white/5 relative overflow-hidden transition-all hover:border-white/10" style={{
      background: 'var(--card-bg)',
      boxShadow: 'var(--card-shadow)'
    }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ background: color }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <span className="w-4 h-4" style={{ color }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}


function IconDatabase() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4S4 11.21 4 9zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/></svg> }
function IconNote() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg> }
function IconReports() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> }
function IconCalendar() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg> }
