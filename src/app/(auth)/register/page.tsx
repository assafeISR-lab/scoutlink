'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      // Email confirmation required — agent record will be created on first login
      setCheckEmail(true)
      setLoading(false)
      return
    }

    const res = await fetch('/api/agent/create', { method: 'POST' })
    if (!res.ok) {
      setError('Account setup failed. Please try signing in or contact support.')
      setLoading(false)
      return
    }
    router.push('/databases')
    router.refresh()
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
                    <radialGradient id="ballFadeRegister" cx="50%" cy="50%" r="50%">
                      <stop offset="40%" stopColor="#00c896" stopOpacity="1"/>
                      <stop offset="100%" stopColor="#00c896" stopOpacity="0"/>
                    </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="46" fill="url(#ballFadeRegister)"/>
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">ScoutLink</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">Football Scouting Platform</p>
        </div>

        {checkEmail ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#00c896]/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#00c896]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white font-medium">Check your email</p>
            <p className="text-[#8b8fa8] text-sm mt-1">We sent a confirmation link to <span className="text-white">{email}</span></p>
            <p className="text-[#8b8fa8] text-xs mt-2">Click the link to activate your account, then sign in.</p>
            <Link href="/login" className="text-[#00c896] hover:underline text-sm mt-4 block">
              Go to sign in
            </Link>
          </div>
        ) : (
        <>
        <h2 className="text-lg font-semibold text-white mb-6">Create your account</h2>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-[#8b8fa8] mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="John Smith"
              className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d3a] rounded-xl text-white placeholder-[#4a4d5a] focus:outline-none focus:border-[#00c896] transition-colors"
            />
          </div>

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
            <label className="block text-sm text-[#8b8fa8] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-[#8b8fa8] text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#00c896] hover:underline">
            Sign in
          </Link>
        </p>
        </>
        )}
      </div>
    </div>
  )
}
