import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
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

  // Seed defaults only when missing — one read, write only on first visit
  const rawWebsites = await prisma.agentWebsite.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: 'asc' },
  })

  const existingUrls = new Set(rawWebsites.map(w => w.url))
  const missing = DEFAULT_WEBSITES.filter(w => !existingUrls.has(w.url))
  if (missing.length > 0) {
    await prisma.agentWebsite.createMany({
      data: missing.map(w => ({ ...w, agentId: user.id })),
      skipDuplicates: true,
    })
    rawWebsites.push(
      ...await prisma.agentWebsite.findMany({
        where: { agentId: user.id, url: { in: missing.map(w => w.url) } },
        orderBy: { createdAt: 'asc' },
      })
    )
  }
  const websites = rawWebsites.map(w => ({
    ...w,
    password: w.password ? decrypt(w.password) : null,
  }))

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">Manage your scouting preferences</p>
      </div>
      <SettingsClient websites={websites} />
    </>
  )
}
