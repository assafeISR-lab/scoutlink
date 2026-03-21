import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function attemptLogin(
  url: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    // Step 1: GET the page to collect cookies and find the login form
    const getRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    })

    const cookies = getRes.headers.get('set-cookie') ?? ''
    const html = await getRes.text()
    const lower = html.toLowerCase()

    // Step 2: Find login form
    const formMatch = html.match(/<form[^>]*>([\s\S]*?)<\/form>/gi)
    if (!formMatch) {
      return { success: false, message: 'Could not find a login form on this page' }
    }

    // Find the form that contains a password field
    let loginForm: string | null = null
    for (const form of formMatch) {
      if (form.toLowerCase().includes('type="password"') || form.toLowerCase().includes("type='password'")) {
        loginForm = form
        break
      }
    }

    if (!loginForm) {
      return { success: false, message: 'No login form with password field found' }
    }

    // Step 3: Extract form action
    const actionMatch = loginForm.match(/action=["']([^"']+)["']/i)
    let formAction = actionMatch ? actionMatch[1] : url
    if (formAction.startsWith('/')) {
      const parsed = new URL(url)
      formAction = `${parsed.origin}${formAction}`
    } else if (!formAction.startsWith('http')) {
      formAction = url
    }

    // Step 4: Find username and password field names
    const inputMatches = [...loginForm.matchAll(/<input[^>]*>/gi)]
    let usernameField = 'username'
    let passwordField = 'password'

    for (const input of inputMatches) {
      const tag = input[0].toLowerCase()
      const nameMatch = input[0].match(/name=["']([^"']+)["']/i)
      if (!nameMatch) continue
      const name = nameMatch[1]

      if (tag.includes('type="password"') || tag.includes("type='password'")) {
        passwordField = name
      } else if (
        tag.includes('type="email"') || tag.includes("type='email'") ||
        tag.includes('type="text"') || tag.includes("type='text'") ||
        name.toLowerCase().includes('user') || name.toLowerCase().includes('email') || name.toLowerCase().includes('login')
      ) {
        usernameField = name
      }
    }

    // Step 5: Extract hidden fields (CSRF tokens, etc.)
    const body = new URLSearchParams()
    for (const input of inputMatches) {
      const typeMatch = input[0].match(/type=["']([^"']+)["']/i)
      const nameMatch = input[0].match(/name=["']([^"']+)["']/i)
      const valueMatch = input[0].match(/value=["']([^"']*)["']/i)
      if (!nameMatch) continue
      const type = typeMatch?.[1]?.toLowerCase() ?? 'text'
      if (type === 'hidden') {
        body.set(nameMatch[1], valueMatch?.[1] ?? '')
      }
    }
    body.set(usernameField, username)
    body.set(passwordField, password)

    // Step 6: POST credentials
    const postRes = await fetch(formAction, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': url,
        'Cookie': cookies,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      body: body.toString(),
      redirect: 'follow',
    })

    const responseHtml = await postRes.text()
    const responseLower = responseHtml.toLowerCase()

    // Step 7: Determine success or failure
    const failureSignals = [
      'incorrect password', 'wrong password', 'invalid password',
      'incorrect username', 'wrong username', 'invalid username',
      'invalid credentials', 'login failed', 'authentication failed',
      'incorrect email', 'invalid email', 'email not found',
      'account not found', 'user not found', 'no account',
      'contraseña incorrecta', 'usuario incorrecto', // Spanish
      'mot de passe incorrect', // French
      'falsche anmeldedaten', // German
    ]
    const hasFailure = failureSignals.some(s => responseLower.includes(s))
    if (hasFailure) {
      return { success: false, message: 'Incorrect username or password. Please try again.' }
    }

    // If no password field in response = likely logged in
    const stillHasPasswordField = responseLower.includes('type="password"') || responseLower.includes("type='password'")
    if (!stillHasPasswordField) {
      return { success: true, message: 'Login successful' }
    }

    // Still on login page — credentials likely wrong
    return { success: false, message: 'Login unsuccessful. Check your username and password.' }

  } catch (err: any) {
    if (err?.name === 'AbortError') return { success: false, message: 'Request timed out. The site may be slow or unreachable.' }
    return { success: false, message: 'Could not reach the website. Check the URL is correct.' }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, username, password } = await req.json()
  if (!url || !username || !password) {
    return NextResponse.json({ error: 'url, username and password are required' }, { status: 400 })
  }

  const result = await attemptLogin(url, username, password)
  return NextResponse.json(result)
}
