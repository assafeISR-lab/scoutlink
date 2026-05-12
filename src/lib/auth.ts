import { cache } from 'react'
import { createClient } from './supabase/server'

// Fast path: reads JWT from the request cookie, no network call.
// Safe for page-level use since the layout already verified the session.
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
})

// Secure path: verifies the JWT with Supabase servers (~200ms).
// Used only in the layout (runs once per full page load, not on navigation).
export const getVerifiedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
