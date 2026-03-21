import type { SiteScraper, ScrapedPlayer } from './types'

export const theSportsDbScraper: SiteScraper = {
  domains: ['thesportsdb.com', 'www.thesportsdb.com'],
  name: 'TheSportsDB',
  async search(query: string): Promise<ScrapedPlayer[]> {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(query)}`,
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    return (data.player || []).map((p: any) => ({
      id: `tsdb-${p.idPlayer}`,
      name: p.strPlayer,
      nationality: p.strNationality ?? null,
      team: p.strTeam ?? null,
      position: p.strPosition ?? null,
      dateOfBirth: p.dateBorn ?? null,
      heightCm: p.strHeight ? parseFloat(p.strHeight) : null,
      weightKg: p.strWeight ? parseFloat(p.strWeight) : null,
      photo: p.strThumb ?? p.strCutout ?? null,
      description: p.strDescriptionEN ?? null,
      sourceUrl: `https://www.thesportsdb.com/player/${p.idPlayer}`,
      sourceName: 'TheSportsDB',
    }))
  },
}
