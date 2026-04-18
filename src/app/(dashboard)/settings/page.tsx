import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import SettingsClient from './SettingsClient'

const DEFAULT_WEBSITES = [
  { name: 'Transfermarkt', url: 'https://www.transfermarkt.com', requiresLogin: false },
  { name: 'Sofascore', url: 'https://www.sofascore.com', requiresLogin: false },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', requiresLogin: false },
]

// Always ensured for every user — powers the Search Players feature
const SYSTEM_WEBSITES = [
  { name: 'TheSportsDB', url: 'https://www.thesportsdb.com', requiresLogin: false, category: 'stats' },
]

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Seed default websites if agent has none
  const existingCount = await prisma.agentWebsite.count({ where: { agentId: user.id } })
  if (existingCount === 0) {
    await prisma.agentWebsite.createMany({
      data: DEFAULT_WEBSITES.map(w => ({ ...w, agentId: user.id })),
      skipDuplicates: true,
    })
  }

  // Always ensure system websites exist (upsert so existing users get them too)
  for (const w of SYSTEM_WEBSITES) {
    await prisma.agentWebsite.upsert({
      where: { agentId_url: { agentId: user.id, url: w.url } },
      update: {},
      create: { ...w, agentId: user.id },
    })
  }

  const websites = await prisma.agentWebsite.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: 'asc' },
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
          <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">Manage your scouting preferences</p>
        </div>

        <SettingsClient websites={websites} />
      </main>
    </div>
  )
}
