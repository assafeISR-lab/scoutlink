import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { fetchSofascoreHeatmap } from '@/lib/scrapers/sofascore'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: databaseId, playerId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [db, cfRow] = await Promise.all([
    prisma.playerDatabase.findUnique({ where: { id: databaseId }, include: { access: { where: { agentId: user.id } } } }),
    prisma.customField.findFirst({ where: { playerId, fieldName: 'sofascoreUrl' } }),
  ])

  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwner = db.ownerId === user.id
  const isContributor = db.access[0]?.permission === 'contributor'
  if (!isOwner && !isContributor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!cfRow?.value) return NextResponse.json({ error: 'No Sofascore URL for this player' }, { status: 422 })

  // Extract Sofascore player ID from the end of the URL: /player/{slug}/{numericId}
  const match = cfRow.value.match(/\/(\d+)\/?$/)
  if (!match) return NextResponse.json({ error: 'Cannot parse Sofascore player ID' }, { status: 422 })
  const sofascoreId = parseInt(match[1])

  const heatmap = await fetchSofascoreHeatmap(sofascoreId)

  if (heatmap) {
    await Promise.all([
      prisma.customField.deleteMany({ where: { playerId, fieldName: 'heatmap' } }),
    ])
    await prisma.customField.create({ data: { playerId, fieldName: 'heatmap', value: heatmap } })
  }

  return NextResponse.json({ heatmap })
}
