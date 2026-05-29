import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const BUCKET = 'player-files'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })

  const storagePath = `agent-logos/${user.id}/${crypto.randomUUID()}`
  const supabase = await createClient()

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: true,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  await prisma.agentBranding.upsert({
    where: { agentId: user.id },
    update: { logoUrl: publicUrl },
    create: { agentId: user.id, logoUrl: publicUrl },
  })

  return NextResponse.json({ logoUrl: publicUrl })
}
