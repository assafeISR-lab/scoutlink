import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if Agent already exists (idempotent)
  const existing = await prisma.agent.findUnique({ where: { id: user.id } })
  if (existing) {
    return NextResponse.json({ ok: true })
  }

  await prisma.agent.create({
    data: {
      id: user.id,
      email: user.email!,
      fullName: user.user_metadata?.full_name ?? 'Agent',
    },
  })

  // Seed default websites so search works immediately without visiting Settings
  const defaultWebsites = [
    { name: 'Transfermarkt', url: 'https://www.transfermarkt.com', requiresLogin: false, loginStatus: 'free' },
    { name: 'Sofascore', url: 'https://www.sofascore.com', requiresLogin: false, loginStatus: 'free' },
    { name: 'FMInside', url: 'https://www.fminside.net', requiresLogin: false, loginStatus: 'free' },
  ]
  for (const w of defaultWebsites) {
    await prisma.agentWebsite.upsert({
      where: { agentId_url: { agentId: user.id, url: w.url } },
      create: { ...w, agentId: user.id },
      update: {},
    })
  }

  return NextResponse.json({ ok: true })
}
