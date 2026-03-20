import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import WebsitesManager from './WebsitesManager'

const DEFAULT_WEBSITES = [
  { name: 'Transfermarkt', url: 'https://www.transfermarkt.com', requiresLogin: false },
  { name: 'Sofascore', url: 'https://www.sofascore.com', requiresLogin: false },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', requiresLogin: false },
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

  const websites = await prisma.agentWebsite.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="min-h-screen text-white flex" style={{ background: 'linear-gradient(135deg, #0a0d14 0%, #0f1117 50%, #0a0f0d 100%)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
      />

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
          <p style={{ color: 'rgba(255,255,255,0.3)' }} className="text-sm">Manage your scouting preferences</p>
        </div>

        <div className="w-full">
          <WebsitesManager websites={websites} />
        </div>
      </main>
    </div>
  )
}
