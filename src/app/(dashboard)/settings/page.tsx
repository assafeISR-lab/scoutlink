import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import Sidebar from '@/components/Sidebar'
import SettingsClient from './SettingsClient'

const DEFAULT_WEBSITES = [
  { name: 'Transfermarkt', url: 'https://www.transfermarkt.com', requiresLogin: false, loginStatus: 'free' },
  { name: 'Sofascore', url: 'https://www.sofascore.com', requiresLogin: false, loginStatus: 'free' },
  { name: 'FMInside', url: 'https://www.fminside.net', requiresLogin: false, loginStatus: 'free' },
]

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Ensure every default website exists for this agent (upsert so new sites get added automatically)
  for (const w of DEFAULT_WEBSITES) {
    await prisma.agentWebsite.upsert({
      where: { agentId_url: { agentId: user.id, url: w.url } },
      create: { ...w, agentId: user.id },
      update: { loginStatus: w.loginStatus }, // fix 'pending' → 'free' if needed
    })
  }

  const rawWebsites = await prisma.agentWebsite.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: 'asc' },
  })
  const websites = rawWebsites.map(w => ({
    ...w,
    password: w.password ? decrypt(w.password) : null,
  }))

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
