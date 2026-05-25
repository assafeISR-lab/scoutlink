import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const BUCKET = 'player-files'
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

async function authorize(databaseId: string, userId: string, requireWrite = false) {
  const db = await prisma.playerDatabase.findUnique({
    where: { id: databaseId },
    include: { access: { where: { agentId: userId } } },
  })
  if (!db) return null
  const isOwner = db.ownerId === userId
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && db.access.length === 0) return null
  if (requireWrite && !isOwner && !isContributor) return null
  return db
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> },
) {
  const { id: databaseId, playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await authorize(databaseId, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const files = await prisma.playerFile.findMany({
    where: { playerId },
    include: { uploadedBy: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const supabase = await createClient()
  const withUrls = await Promise.all(files.map(async f => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(f.storagePath, 3600)
    return { ...f, fileUrl: data?.signedUrl ?? f.fileUrl, createdAt: f.createdAt.toISOString() }
  }))
  return NextResponse.json(withUrls)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> },
) {
  try {
    const { id: databaseId, playerId } = await params
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!await authorize(databaseId, user.id, true)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })

    const storagePath = `${playerId}/${crypto.randomUUID()}`
    const supabase = await createClient()
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
    })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    const record = await prisma.playerFile.create({
      data: {
        playerId,
        uploadedById: user.id,
        fileName: file.name,
        storagePath,
        fileUrl: publicUrl,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      },
      include: { uploadedBy: { select: { fullName: true } } },
    })
    return NextResponse.json({ ...record, createdAt: record.createdAt.toISOString() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST player files]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
