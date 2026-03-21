import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// POST — share database with a user by email
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({ where: { id: databaseId } })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (db.ownerId !== user.id) return NextResponse.json({ error: 'Only the owner can share this database' }, { status: 403 })

  const { email, permission } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (!['read', 'contributor'].includes(permission)) return NextResponse.json({ error: 'Invalid permission' }, { status: 400 })

  const target = await prisma.agent.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!target) return NextResponse.json({ error: 'No ScoutLink account found for that email' }, { status: 404 })
  if (target.id === user.id) return NextResponse.json({ error: 'You cannot share a database with yourself' }, { status: 400 })

  const access = await prisma.databaseAccess.upsert({
    where: { databaseId_agentId: { databaseId, agentId: target.id } },
    update: { permission },
    create: { databaseId, agentId: target.id, permission },
    include: { agent: true },
  })

  return NextResponse.json(access)
}

// GET — list current shares (owner only)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({ where: { id: databaseId } })
  if (!db || db.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const access = await prisma.databaseAccess.findMany({
    where: { databaseId },
    include: { agent: { select: { id: true, email: true, fullName: true } } },
  })

  return NextResponse.json(access)
}

// DELETE — remove access for a specific agent
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await prisma.playerDatabase.findUnique({ where: { id: databaseId } })
  if (!db || db.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { agentId } = await req.json()
  await prisma.databaseAccess.deleteMany({ where: { databaseId, agentId } })

  return NextResponse.json({ ok: true })
}
