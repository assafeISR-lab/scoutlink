import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Calendar</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your schedule and player notes timeline</p>
      </div>
      <CalendarClient />
    </>
  )
}
