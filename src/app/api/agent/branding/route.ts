import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const branding = await prisma.agentBranding.findUnique({ where: { agentId: user.id } })
  return NextResponse.json({ branding })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { agencyName, logoUrl, phone, email, website, signatureLine } = body

  const branding = await prisma.agentBranding.upsert({
    where: { agentId: user.id },
    update: { agencyName, logoUrl, phone, email, website, signatureLine },
    create: { agentId: user.id, agencyName, logoUrl, phone, email, website, signatureLine },
  })

  return NextResponse.json({ branding })
}
