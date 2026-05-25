import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const BUCKET = 'player-files'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string; fileId: string }> },
) {
  try {
    const { id: databaseId, playerId, fileId } = await params
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await prisma.playerDatabase.findUnique({
      where: { id: databaseId },
      include: { access: { where: { agentId: user.id } } },
    })
    if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isOwner = db.ownerId === user.id
    const isContributor = db.access[0]?.permission === 'contributor'
    if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const file = await prisma.playerFile.findUnique({ where: { id: fileId } })
    if (!file || file.playerId !== playerId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = await createClient()
    await supabase.storage.from(BUCKET).remove([file.storagePath])
    await prisma.playerFile.delete({ where: { id: fileId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DELETE player file]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
