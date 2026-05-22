import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import Link from 'next/link'
import ReportView from './ReportView'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report || report.agentId !== user.id) notFound()

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-faint)' }}>
        <Link href="/reports" className="transition-colors" style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          Reports
        </Link>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        <span style={{ color: 'var(--text-secondary)' }}>{report.name}</span>
      </div>

      <ReportView report={{
        id: report.id,
        name: report.name,
        databaseName: report.databaseName,
        playerCount: report.playerCount,
        createdAt: report.createdAt.toISOString(),
        players: report.players as any[],
      }} />
    </>
  )
}
