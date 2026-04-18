import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import ReportsList from './ReportsList'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const reports = await prisma.report.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, databaseName: true, playerCount: true, createdAt: true },
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
          <h1 className="text-3xl font-bold text-white mb-1">Reports</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your saved scouting reports</p>
        </div>
        <ReportsList reports={reports.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
      </main>
    </div>
  )
}
