import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({
    where: { id },
    include: { access: { where: { agentId: user.id } } },
  })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner       = db.ownerId === user.id
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if ('columnConfig' in body) {
    const config = body.columnConfig
    if (config !== null && !Array.isArray(config)) {
      return NextResponse.json({ error: 'columnConfig must be an array or null' }, { status: 400 })
    }
    try {
      const updated = await prisma.playerDatabase.update({
        where: { id },
        data: { columnConfig: config },
      })
      return NextResponse.json({ columnConfig: updated.columnConfig })
    } catch (err) {
      console.error('[PATCH /api/databases/:id] columnConfig update failed:', err)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
}
