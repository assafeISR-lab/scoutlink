import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const site = await prisma.agentWebsite.findUnique({ where: { id: websiteId } })
  if (!site || site.agentId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  try {
    const updated = await prisma.agentWebsite.update({
      where: { id: websiteId },
      data: {
        name: body.name?.trim() ?? undefined,
        url: body.url?.trim() ?? undefined,
        requiresLogin: body.requiresLogin ?? undefined,
        loginStatus: body.loginStatus ?? undefined,
        useForSearch: body.useForSearch ?? undefined,
        username: body.username?.trim() || null,
        password: body.password?.trim() || null,
        isActive: body.isActive ?? undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[PATCH /api/websites]', err)
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const site = await prisma.agentWebsite.findUnique({ where: { id: websiteId } })
  if (!site || site.agentId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.agentWebsite.delete({ where: { id: websiteId } })
  return NextResponse.json({ ok: true })
}
