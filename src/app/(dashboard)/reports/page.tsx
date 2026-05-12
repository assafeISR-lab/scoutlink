import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import ReportsList from './ReportsList'

export default async function ReportsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const reports = await prisma.report.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, databaseName: true, playerCount: true, createdAt: true },
  })

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Reports</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your saved scouting reports</p>
      </div>
      <ReportsList reports={reports.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
    </>
  )
}
