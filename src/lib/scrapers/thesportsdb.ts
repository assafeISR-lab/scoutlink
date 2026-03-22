import type { SiteScraper, ScrapedPlayer } from './types'

export const theSportsDbScraper: SiteScraper = {
  domains: ['thesportsdb.com', 'www.thesportsdb.com'],
  name: 'TheSportsDB',
  async search(query: string): Promise<ScrapedPlayer[]> {
    try {
      // Step 1: search for player IDs
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(query)}`
      )
      if (!res.ok) return []
      const data = await res.json()
      const hits: any[] = data.player || []
      if (hits.length === 0) return []

      // Step 2: lookup full details for each player in parallel (search API lacks height/weight/description)
      const details = await Promise.allSettled(
        hits.map(h =>
          fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupplayer.php?id=${h.idPlayer}`)
            .then(r => r.json())
            .then(d => d?.players?.[0] ?? h)
            .catch(() => h)
        )
      )

      return details
        .filter(r => r.status === 'fulfilled')
        .map(r => {
          const p = (r as PromiseFulfilledResult<any>).value
          return {
            id: `tsdb-${p.idPlayer}`,
            name: p.strPlayer,
            nationality: p.strNationality ?? null,
            team: p.strTeam ?? null,
            position: p.strPosition ?? null,
            dateOfBirth: p.dateBorn ?? null,
            heightCm: parseHeightToCm(p.strHeight),
            weightKg: parseWeightToKg(p.strWeight),
            photo: p.strThumb ?? p.strCutout ?? null,
            description: p.strDescriptionEN ? p.strDescriptionEN.slice(0, 400) + (p.strDescriptionEN.length > 400 ? '...' : '') : null,
            marketValue: null,
            sourceUrl: `https://www.thesportsdb.com/player/${p.idPlayer}`,
            sourceName: 'TheSportsDB',
          }
        })
    } catch {
      return []
    }
  },
}

// "1.74 m (5 ft 9 in)" → 174  |  "180cm" → 180  |  "5'10\"" → 177
function parseHeightToCm(raw: string | null | undefined): number | null {
  if (!raw) return null
  // Metres: "1.74 m" or "1.74m"
  const mMatch = raw.match(/(\d+\.\d+)\s*m/)
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 100)
  // Centimetres: "174cm" or "174 cm"
  const cmMatch = raw.match(/(\d{2,3})\s*cm/i)
  if (cmMatch) return parseInt(cmMatch[1])
  // Feet/inches: "5'10\"" or "5 ft 10 in"
  const ftMatch = raw.match(/(\d+)\s*(?:ft|')\s*(\d+)/)
  if (ftMatch) return Math.round(parseInt(ftMatch[1]) * 30.48 + parseInt(ftMatch[2]) * 2.54)
  return null
}

// "146 lbs" → 66  |  "75 kg" → 75  |  "75kg" → 75
function parseWeightToKg(raw: string | null | undefined): number | null {
  if (!raw) return null
  const num = parseFloat(raw)
  if (isNaN(num)) return null
  if (/lbs?/i.test(raw)) return Math.round(num * 0.453592)
  if (/kg/i.test(raw)) return Math.round(num)
  return null
}
