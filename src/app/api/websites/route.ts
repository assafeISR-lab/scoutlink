import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, url, requiresLogin, loginStatus, username, password, country, category } = await req.json()
  if (!name?.trim() || !url?.trim()) return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })

  const website = await prisma.agentWebsite.create({
    data: {
      agentId: user.id,
      name: name.trim(),
      url: url.trim(),
      requiresLogin: requiresLogin ?? false,
      loginStatus: loginStatus ?? 'pending',
      username: username?.trim() || null,
      password: password?.trim() || null,
      country: country?.trim() || null,
      category: category?.trim() || null,
    },
  })

  return NextResponse.json(website)
}
