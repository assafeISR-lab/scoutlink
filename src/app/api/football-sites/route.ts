import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const club = searchParams.get('club')

  if (!club || club.trim().length < 2) {
    return NextResponse.json({ teams: [] })
  }

  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(club)}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()

    const teams = (data.teams || [])
      .filter((t: any) => t.strSport === 'Soccer' && t.strWebsite)
      .map((t: any) => ({
        id: t.idTeam,
        name: t.strTeam,
        country: t.strCountry,
        league: t.strLeague,
        website: t.strWebsite.startsWith('http') ? t.strWebsite : `https://${t.strWebsite}`,
        badge: t.strTeamBadge,
      }))

    return NextResponse.json({ teams })
  } catch {
    return NextResponse.json({ teams: [] })
  }
}
