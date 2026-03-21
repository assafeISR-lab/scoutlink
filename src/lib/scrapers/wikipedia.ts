import type { SiteScraper, ScrapedPlayer } from './types'

export const wikipediaScraper: SiteScraper = {
  domains: ['wikipedia.org', 'www.wikipedia.org', 'en.wikipedia.org'],
  name: 'Wikipedia',
  async search(query: string): Promise<ScrapedPlayer[]> {
    // Step 1: search Wikipedia for the player
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' footballer')}&srnamespace=0&srlimit=5&format=json&origin=*`,
      { next: { revalidate: 300 } }
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const hits: { title: string }[] = searchData?.query?.search ?? []
    if (hits.length === 0) return []

    // Step 2: fetch summary for each hit in parallel
    const summaries = await Promise.allSettled(
      hits.map(hit =>
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`, {
          next: { revalidate: 300 },
        }).then(r => r.json())
      )
    )

    const players: ScrapedPlayer[] = []
    for (const result of summaries) {
      if (result.status !== 'fulfilled') continue
      const s = result.value
      if (!s?.title) continue

      // Skip disambiguation pages and non-footballer articles
      const desc: string = s.description ?? ''
      const extract: string = s.extract ?? ''
      const combined = (desc + ' ' + extract).toLowerCase()
      const isFootballer = combined.includes('football') || combined.includes('soccer') || combined.includes('striker') || combined.includes('midfielder') || combined.includes('goalkeeper') || combined.includes('defender') || combined.includes('winger') || combined.includes('forward')
      if (!isFootballer) continue

      // Try to extract nationality from description (e.g. "Argentine professional footballer")
      const nationalityMatch = desc.match(/^([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\s/)
      const nationality = nationalityMatch?.[1] ?? null

      // Try to extract position from description
      let position: string | null = null
      if (combined.includes('goalkeeper')) position = 'Goalkeeper'
      else if (combined.includes('defender') || combined.includes('centre-back') || combined.includes('center-back') || combined.includes('full-back') || combined.includes('fullback')) position = 'Defender'
      else if (combined.includes('midfielder')) position = 'Midfielder'
      else if (combined.includes('forward') || combined.includes('striker') || combined.includes('winger') || combined.includes('attacker')) position = 'Forward'

      players.push({
        id: `wiki-${s.pageid ?? s.title}`,
        name: s.title,
        nationality,
        team: null,
        position,
        dateOfBirth: null,
        heightCm: null,
        weightKg: null,
        photo: s.thumbnail?.source ?? null,
        description: s.extract ? s.extract.slice(0, 400) + (s.extract.length > 400 ? '...' : '') : null,
        sourceUrl: s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title)}`,
        sourceName: 'Wikipedia',
      })
    }
    return players
  },
}
