import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Ensure Agent row exists (handles users created before this was set up)
  await prisma.agent.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email!,
      fullName: user.user_metadata?.full_name ?? 'Agent',
    },
  })

  return (
    <div className="min-h-screen text-white flex" style={{ background: 'linear-gradient(135deg, #0a0d14 0%, #0f1117 50%, #0a0f0d 100%)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
      />

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            Welcome back, <span style={{ color: '#00c896' }}>{user.user_metadata?.full_name?.split(' ')[0] || 'Agent'}</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)' }} className="text-sm">Here's what's happening in your scouting hub today.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Players in Database" value="0" icon={<IconDatabase />} color="#00c896" />
          <StatCard label="Searches This Week" value="0" icon={<IconSearch />} color="#6c8fff" />
          <StatCard label="Reports Generated" value="0" icon={<IconReports />} color="#ff9f43" />
          <StatCard label="Calendar Events" value="0" icon={<IconCalendar />} color="#ff6b9d" />
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-white/5 p-6 mb-6" style={{
          background: 'linear-gradient(135deg, #141720 0%, #111318 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <span style={{ color: '#00c896' }}>⚡</span> Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickAction label="Search a Player" desc="Search the web for player data" />
            <QuickAction label="Import Database" desc="Import your existing Excel/CSV" />
            <QuickAction label="Setup Websites" desc="Add your scouting websites" />
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl p-5 border border-white/5 relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #141720 0%, #111318 100%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ background: color }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <span className="w-4 h-4" style={{ color }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
    </div>
  )
}

function QuickAction({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 border border-white/5 hover:border-white/10" style={{
      background: 'rgba(255,255,255,0.02)',
    }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#00c896' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{desc}</p>
      </div>
    </div>
  )
}

function IconDatabase() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4S4 11.21 4 9zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/></svg> }
function IconSearch() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg> }
function IconReports() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> }
function IconCalendar() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg> }
