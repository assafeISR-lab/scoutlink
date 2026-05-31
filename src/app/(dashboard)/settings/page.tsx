import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import SettingsClient from './SettingsClient'

const DEFAULT_WEBSITES = [
  { name: 'Transfermarkt', url: 'https://www.transfermarkt.com', requiresLogin: false, loginStatus: 'free' },
  { name: 'Sofascore', url: 'https://www.sofascore.com', requiresLogin: false, loginStatus: 'free' },
  { name: 'FMInside', url: 'https://www.fminside.net', requiresLogin: false, loginStatus: 'free' },
]

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  // Seed default websites if missing — ensures search works even for users
  // created before agent/create started seeding these automatically
  const existingCount = await prisma.agentWebsite.count({ where: { agentId: user.id } })
  if (existingCount === 0) {
    await prisma.agentWebsite.createMany({
      data: DEFAULT_WEBSITES.map(w => ({ ...w, agentId: user.id })),
      skipDuplicates: true,
    })
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">Manage your scouting preferences</p>
      </div>
      <SettingsClient />
    </>
  )
}
