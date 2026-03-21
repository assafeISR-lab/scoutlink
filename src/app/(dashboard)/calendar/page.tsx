import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen text-white flex" style={{ background: 'linear-gradient(135deg, #0a0d14 0%, #0f1117 50%, #0a0f0d 100%)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        userId={user.id}
      />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Calendar</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Your scouting schedule and player notes timeline</p>
        </div>
        <CalendarClient />
      </main>
    </div>
  )
}
