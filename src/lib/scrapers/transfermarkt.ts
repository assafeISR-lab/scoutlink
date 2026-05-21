import type { SiteScraper, ScrapedPlayer } from './types'
import { sbFetch } from './scrapingbee'

export const transfermarktScraper: SiteScraper = {
  domains: ['transfermarkt.com', 'www.transfermarkt.com'],
  name: 'Transfermarkt',
  async search(query: string): Promise<ScrapedPlayer[]> {
    const res = await sbFetch(
      `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}&Spieler_page=0`
    )
    console.log('[Transfermarkt] search status:', res.status)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    console.log('[Transfermarkt] html length:', html.length, '| sample:', html.slice(0, 300).replace(/\s+/g, ' '))
    if (html.includes('cf-browser-verification') || html.includes('Just a moment') || html.includes('_cf_chl')) throw new Error('Cloudflare block')

    const players: ScrapedPlayer[] = []
    const seen = new Set<string>()

    const linkRe = /<a[^>]*href="\/(([^"\/]+)\/profil\/spieler\/(\d+))"[^>]*>([^<]+)<\/a>/g
    const linkMatches = [...html.matchAll(linkRe)]

    for (const match of linkMatches) {
      const slug = match[2]
      const playerId = match[3]
      const name = match[4].trim()
      if (!name || name.length < 2 || seen.has(playerId)) continue
      seen.add(playerId)

      const linkPos = match.index!
      const before = html.slice(Math.max(0, linkPos - 600), linkPos)
      const after = html.slice(linkPos, linkPos + 2500)

      const photoMatches = [...before.matchAll(/src="(https?:\/\/[^"]+\/portrait\/[^"]+\.(?:jpg|png|webp)[^"]*)"[^>]*class="bilderrahmen/gi)]
      const photo = photoMatches.length > 0 ? photoMatches[photoMatches.length - 1][1] : null

      const posMatch = after.match(/<td[^>]*class="zentriert"[^>]*>\s*([A-Z]{1,3})\s*<\/td>/)
      const position = posMatch ? normalizePosition(posMatch[1]) : null

      // Age from search list is unreliable for DOB (off by 1 year depending on birthday timing)
      // Exact DOB is extracted from the profile page below

      const clubMatch = after.match(/href="\/[^"]+\/(?:startseite|kader)\/verein\/\d+"[^>]*title="([^"]+)"/)
        ?? after.match(/href="\/[^"]+\/(?:startseite|kader)\/verein\/\d+"[^>]*>([^<]+)<\/a>/)
      const club = clubMatch?.[1]?.trim() ?? null

      const natMatch = after.match(/class="[^"]*flagge[^"]*"[^>]+alt="([^"]+)"/i)
        ?? after.match(/alt="([^"]+)"[^>]*class="[^"]*flagge[^"]*"/i)
      const nationality = natMatch?.[1]?.trim() ?? null

      const mvMatch = after.match(/<td[^>]*class="rechts hauptlink"[^>]*>([^<]+)<\/td>/)
      const marketValue = mvMatch?.[1]?.trim() ?? null

      players.push({
        id: `tm-${playerId}`,
        name,
        nationality,
        team: club,
        league: null,
        position,
        dateOfBirth: null,
        heightCm: null,
        preferredFoot: null,
        contractUntil: null,
        passports: null,
        joiningDate: null,
        photo,
        description: null,
        marketValue,
        fmWages: null,
        fmAttributes: null,
        seasonStats: null,
        heatmap: null,
        sourceUrl: `https://www.transfermarkt.com/${slug}/profil/spieler/${playerId}`,
        sourceName: 'Transfermarkt',
        _profileUrl: `https://www.transfermarkt.com/${slug}/profil/spieler/${playerId}`,
      } as ScrapedPlayer & { _profileUrl: string })
    }

    const enriched = await Promise.allSettled(
      players.slice(0, 5).map(async (p) => {
        const profileUrl = (p as ScrapedPlayer & { _profileUrl?: string })._profileUrl
        if (!profileUrl) return p
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 6000)
        try {
          const profileRes = await sbFetch(profileUrl, false, controller.signal)
          if (!profileRes.ok) return p
          const profileHtml = await profileRes.text()

          const heightMatch = profileHtml.match(/([12][,\.]\d{2})\s+m\b/) ?? profileHtml.match(/(\d{3})\s*cm/i)
          let heightCm: number | null = null
          if (heightMatch) {
            const raw = heightMatch[1]
            heightCm = (raw.includes(',') || raw.includes('.'))
              ? Math.round(parseFloat(raw.replace(',', '.')) * 100)
              : parseInt(raw)
          }

          const dobMatch = profileHtml.match(/(\d{2})\.(\d{2})\.(\d{4})/)
          const dateOfBirth = dobMatch ? `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}` : p.dateOfBirth

          // Passports: all citizenship flags in the Citizenship block
          let passports: string | null = null
          const citizenBlock = profileHtml.match(/Citizenship:[\s\S]{0,600}?<\/li>/)?.[0] ?? ''
          if (citizenBlock) {
            const imgs = [...citizenBlock.matchAll(/<img[^>]+>/gi)]
            const titles = imgs.map(m => m[0].match(/title="([^"]+)"/)?.[1]).filter(Boolean) as string[]
            if (titles.length > 0) passports = titles.join(', ')
          }

          // Joining date: "Joined: dd/mm/yyyy"
          let joiningDate: string | null = null
          const joinMatch = profileHtml.match(/Joined:\s*<span[^>]*class="data-header__content"[^>]*>(\d{2}\/\d{2}\/\d{4})<\/span>/)
          if (joinMatch) {
            const [day, month, year] = joinMatch[1].split('/')
            joiningDate = `${year}-${month}-${day}`
          }

          const result = { ...p, heightCm, dateOfBirth, passports, joiningDate }
          delete (result as ScrapedPlayer & { _profileUrl?: string })._profileUrl
          return result
        } catch {
          return p
        } finally {
          clearTimeout(timer)
        }
      })
    )

    return enriched
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<ScrapedPlayer>).value)
  },
}

function normalizePosition(pos: string): string {
  const map: Record<string, string> = {
    GK: 'Goalkeeper', TW: 'Goalkeeper',
    CB: 'Centre-Back', DC: 'Centre-Back',
    RB: 'Right-Back', LB: 'Left-Back',
    RWB: 'Right Wing-Back', LWB: 'Left Wing-Back',
    LA: 'Left Wing-Back', RA: 'Right Wing-Back',
    CDM: 'Defensive Mid', DM: 'Defensive Mid',
    CM: 'Midfielder', ZM: 'Midfielder', OM: 'Midfielder', AM: 'Attacking Mid', CAM: 'Attacking Mid',
    RM: 'Right Mid', LM: 'Left Mid',
    RW: 'Right Winger', LW: 'Left Winger',
    ST: 'Striker', CF: 'Centre-Forward', SS: 'Second Striker',
  }
  return map[pos.toUpperCase()] ?? pos
}
