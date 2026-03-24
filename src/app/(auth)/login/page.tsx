'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setResetSent(true)
      setLoading(false)
    }
  }

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
                    <radialGradient id="ballFadeLogin" cx="50%" cy="50%" r="50%">
                      <stop offset="40%" stopColor="#00c896" stopOpacity="1"/>
                      <stop offset="100%" stopColor="#00c896" stopOpacity="0"/>
                    </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="46" fill="url(#ballFadeLogin)"/>
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">ScoutLink</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">Football Scouting Platform</p>
        </div>

        {forgotMode ? (
          <>
            <h2 className="text-lg font-semibold text-white mb-6">Reset your password</h2>

            {resetSent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#00c896]/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#00c896]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white font-medium">Check your email</p>
                <p className="text-[#8b8fa8] text-sm mt-1">We sent a reset link to <span className="text-white">{email}</span></p>
                <button
                  onClick={() => { setForgotMode(false); setResetSent(false) }}
                  className="text-[#00c896] hover:underline text-sm mt-4 block mx-auto"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-[#8b8fa8] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="agent@scoutlink.com"
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
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setError('') }}
                  className="text-[#8b8fa8] hover:text-white text-sm text-center transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-[#8b8fa8] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="agent@scoutlink.com"
                  className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-[#4a4d5a] focus:outline-none focus:border-[#00c896] transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm text-[#8b8fa8]">Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError('') }}
                    className="text-xs text-[#00c896] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-[#8b8fa8] text-sm mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#00c896] hover:underline">
                Register
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
