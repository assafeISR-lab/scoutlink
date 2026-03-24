'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [exchangeError, setExchangeError] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    // @supabase/ssr auto-exchanges the PKCE code on init — just wait for the session
    const timeout = setTimeout(() => setExchangeError(true), 8000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        clearTimeout(timeout)
        setReady(true)
        return
      }
      // Session not ready yet — wait for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
          clearTimeout(timeout)
          setReady(true)
        }
      })
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => {
      clearTimeout(timeout)
      unsubscribe?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-white mb-6">Set new password</h2>

      {success ? (
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[#00c896]/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#00c896]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-medium">Password updated!</p>
          <p className="text-[#8b8fa8] text-sm mt-1">Redirecting to dashboard...</p>
        </div>
      ) : exchangeError ? (
        <div className="text-center">
          <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg mb-4">
            This reset link is invalid or has expired.
          </p>
          <a href="/login" className="text-[#00c896] hover:underline text-sm">
            Back to sign in
          </a>
        </div>
      ) : !ready ? (
        <div className="text-center">
          <p className="text-[#8b8fa8] text-sm">Verifying reset link...</p>
        </div>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-[#8b8fa8] mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-[#4a4d5a] focus:outline-none focus:border-[#00c896] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#8b8fa8] mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-[#4a4d5a] focus:outline-none focus:border-[#00c896] transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#00c896] hover:bg-[#00b386] text-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <div className="w-full max-w-md px-8 py-10 bg-[#1a1d27] rounded-2xl shadow-xl border border-[#2a2d3a]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-lg opacity-70" style={{ background: '#00c896' }} />
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="ballFadeReset" cx="50%" cy="50%" r="50%">
                      <stop offset="40%" stopColor="#00c896" stopOpacity="1"/>
                      <stop offset="100%" stopColor="#00c896" stopOpacity="0"/>
                    </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="46" fill="url(#ballFadeReset)"/>
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">ScoutLink</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">Football Scouting Platform</p>
        </div>

        <Suspense fallback={<p className="text-[#8b8fa8] text-sm text-center">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
