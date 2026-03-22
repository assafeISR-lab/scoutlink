import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Domains with working scrapers that handle bot-protection themselves — always free
const SCRAPER_DOMAINS = [
  'transfermarkt.com', 'www.transfermarkt.com',
  'sofascore.com', 'www.sofascore.com',
  'fminside.net', 'www.fminside.net',
  'thesportsdb.com', 'www.thesportsdb.com',
  'wikipedia.org', 'en.wikipedia.org',
]

function getDomain(url: string): string {
  try { return new URL(url).hostname.toLowerCase() } catch { return '' }
}

async function detectLoginRequired(url: string): Promise<{ requiresLogin: boolean; reason: string }> {
  // Known scraper domains — always accessible, scraper handles auth/bot protection
  if (SCRAPER_DOMAINS.includes(getDomain(url))) {
    return { requiresLogin: false, reason: 'Accessible (supported scraper)' }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }

    const res = await fetch(url, { signal: controller.signal, headers, redirect: 'follow' })
    clearTimeout(timeout)

    // Hard status codes that definitively mean auth required
    if (res.status === 401) return { requiresLogin: true, reason: 'Returns 401 Unauthorized' }
    if (res.status === 407) return { requiresLogin: true, reason: 'Requires proxy authentication' }

    // 403 = bot protection (Cloudflare etc.), not a login wall
    if (res.status === 403) return { requiresLogin: false, reason: 'Accessible (bot protection active)' }

    // Check redirect to login page
    const finalUrl = res.url.toLowerCase()
    const loginUrlPatterns = ['/login', '/signin', '/sign-in', '/auth', '/account/login', '/user/login', '/members/login']
    if (loginUrlPatterns.some(p => finalUrl.includes(p))) {
      return { requiresLogin: true, reason: 'Redirects to login page' }
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return { requiresLogin: false, reason: 'Accessible' }
    }

    const html = await res.text()

    // Cloudflare / bot protection interstitial
    if (html.includes('cf-browser-verification') || html.includes('Just a moment') || html.includes('_cf_chl')) {
      return { requiresLogin: false, reason: 'Accessible (bot protection active)' }
    }

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
      { pattern: 'register to access', weight: 2 },
      { pattern: 'forgot password', weight: 1 },
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
