import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getUser } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>
      <Sidebar
        userName={user.user_metadata?.full_name || 'Agent'}
        userEmail={user.email || ''}
        userInitial={user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        userId={user.id}
      />
      <main className="main-content flex-1 p-8 overflow-auto" style={{ color: 'var(--text-primary)' }}>
        {children}
      </main>
    </div>
  )
}
