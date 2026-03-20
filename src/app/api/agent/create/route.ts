import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  return NextResponse.json({ ok: true })
}
