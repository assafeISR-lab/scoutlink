import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScoutSearchClient from './ScoutSearchClient'

export default async function ScoutSearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AI Player Search</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Describe the player you&apos;re looking for — position, age, style, contract situation — and AI finds the best matches from your lists.
        </p>
      </div>
      <ScoutSearchClient />
    </main>
  )
}
