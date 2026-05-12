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
    </>
  )
}
