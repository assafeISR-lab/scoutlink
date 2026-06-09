import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clubId = searchParams.get('clubId') || undefined
  const status = searchParams.get('status') || undefined
  const transferType = searchParams.get('transferType') || undefined

  const requests = await prisma.clubRequest.findMany({
    where: {
      club: { agentId: user.id },
      ...(clubId ? { clubId } : {}),
      ...(status ? { status } : {}),
      ...(transferType ? { transferType } : {}),
    },
    include: {
      club: { select: { id: true, name: true } },
      proposals: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
              clubName: true,
              databaseId: true,
              database: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ club: { name: 'asc' } }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ requests })
}
