import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import ReportView from './ReportView'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report || report.agentId !== user.id) notFound()

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        userId={user.id}
      />
      <main className="main-content flex-1 p-8 overflow-auto" style={{ color: 'var(--text-primary)' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-6">
          <Link href="/reports" className="hover:text-white/60 transition-colors">Reports</Link>
          <span>/</span>
          <span className="text-white/60">{report.name}</span>
        </div>

        <ReportView report={{
          id: report.id,
          name: report.name,
          databaseName: report.databaseName,
          playerCount: report.playerCount,
          createdAt: report.createdAt.toISOString(),
          players: report.players as any[],
        }} />
      </main>
    </div>
  )
}
