import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function detectLoginRequired(url: string): Promise<{ requiresLogin: boolean; reason: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)

    // Hard status codes
    if (res.status === 401) return { requiresLogin: true, reason: 'Returns 401 Unauthorized' }
    if (res.status === 403) return { requiresLogin: true, reason: 'Returns 403 Forbidden' }
    if (res.status === 407) return { requiresLogin: true, reason: 'Requires proxy authentication' }

    // Check if redirected to login page
    const finalUrl = res.url.toLowerCase()
    const loginUrlPatterns = ['/login', '/signin', '/sign-in', '/auth', '/account/login', '/user/login', '/members/login']
    const redirectedToLogin = loginUrlPatterns.some(p => finalUrl.includes(p))
    if (redirectedToLogin) return { requiresLogin: true, reason: 'Redirects to login page' }

    // Analyze HTML content
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return { requiresLogin: false, reason: 'Accessible' }
    }

    const html = await res.text()
    const lower = html.toLowerCase()

    const loginSignals = [
      { pattern: 'type="password"', weight: 3 },
      { pattern: "type='password'", weight: 3 },
      { pattern: 'name="password"', weight: 3 },
      { pattern: 'login required', weight: 2 },
      { pattern: 'sign in to continue', weight: 2 },
      { pattern: 'please log in', weight: 2 },
      { pattern: 'please sign in', weight: 2 },
      { pattern: 'you must be logged in', weight: 2 },
      { pattern: 'members only', weight: 2 },
      { pattern: 'create an account', weight: 1 },
      { pattern: 'forgot password', weight: 1 },
      { pattern: 'register to access', weight: 2 },
    ]

    const score = loginSignals.reduce((acc, s) => lower.includes(s.pattern) ? acc + s.weight : acc, 0)

    if (score >= 3) return { requiresLogin: true, reason: 'Page contains login form' }
    return { requiresLogin: false, reason: 'Accessible without login' }

  } catch (err: any) {
    if (err?.name === 'AbortError') return { requiresLogin: false, reason: 'Timeout — could not verify' }
    if (err?.message?.includes('ECONNREFUSED') || err?.message?.includes('ENOTFOUND')) {
      return { requiresLogin: false, reason: 'Site unreachable' }
    }
    return { requiresLogin: false, reason: 'Could not verify' }
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url?.trim()) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  const result = await detectLoginRequired(url.trim())
  return NextResponse.json({
    ...result,
    loginStatus: result.requiresLogin ? 'login_required' : 'free',
  })
}
