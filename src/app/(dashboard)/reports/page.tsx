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
      <div className="flex items-center gap-3 mb-4">
        <div className="mr-auto pl-3 border-l-2" style={{ borderColor: '#ff9f43' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Reports</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Scout reports and player snapshots</p>
        </div>
      </div>
      <ReportsList reports={reports.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
    </>
  )
}
