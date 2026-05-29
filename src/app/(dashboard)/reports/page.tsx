import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import ReportsList from './ReportsList'

export default async function ReportsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [reports, scoutReports] = await Promise.all([
    prisma.report.findMany({
      where: { agentId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, databaseName: true, playerCount: true, createdAt: true },
    }),
    prisma.playerReport.findMany({
      where: { agentId: user.id, reportFinalized: true },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, position: true, clubName: true, databaseId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="mr-auto pl-3 border-l-2" style={{ borderColor: '#ff9f43' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Reports</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Scout reports and player snapshots</p>
        </div>
      </div>
      <ReportsList
        reports={reports.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        scoutReports={scoutReports.map(e => ({
          id: e.id,
          updatedAt: e.updatedAt.toISOString(),
          player: {
            id: e.player.id,
            name: `${e.player.firstName} ${e.player.lastName}`,
            position: e.player.position,
            clubName: e.player.clubName,
            databaseId: e.player.databaseId,
          },
        }))}
      />
    </>
  )
}
