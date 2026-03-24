import type { SiteScraper, ScrapedPlayer } from './types'

export const transfermarktScraper: SiteScraper = {
  domains: ['transfermarkt.com', 'www.transfermarkt.com'],
  name: 'Transfermarkt',
  async search(query: string): Promise<ScrapedPlayer[]> {
    try {
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }

    // Step 1: visit homepage to collect cookies
    let cookieStr = ''
    try {
      const homeRes = await fetch('https://www.transfermarkt.com/', {
        headers: { ...baseHeaders, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      })
      const setCookies = (homeRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.()
      if (setCookies?.length) {
        cookieStr = setCookies.map(c => c.split(';')[0]).join('; ')
      } else {
        const raw = homeRes.headers.get('set-cookie') ?? ''
        cookieStr = raw.split(',').map(c => c.trim().split(';')[0]).join('; ')
      }
    } catch { /* continue without cookies */ }

    // Step 2: perform search
    const res = await fetch(
      `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}&Spieler_page=0`,
      {
        headers: {
          ...baseHeaders,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://www.transfermarkt.com/',
          ...(cookieStr ? { 'Cookie': cookieStr } : {}),
        },
      }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    if (html.includes('cf-browser-verification') || html.includes('Just a moment') || html.includes('_cf_chl')) throw new Error('Cloudflare block')

    const players: ScrapedPlayer[] = []
    const seen = new Set<string>()

    // Find all player profile anchor tags
    // Structure: <a title="Name" href="/slug/profil/spieler/ID">Name</a>
    const linkRe = /<a[^>]*href="\/(([^"\/]+)\/profil\/spieler\/(\d+))"[^>]*>([^<]+)<\/a>/g
    const linkMatches = [...html.matchAll(linkRe)]

    for (const match of linkMatches) {
      const slug = match[2]
      const playerId = match[3]
      const name = match[4].trim()
      if (!name || name.length < 2 || seen.has(playerId)) continue
      seen.add(playerId)

      const linkPos = match.index!

      // Photo appears just before the player name link in the same row
      const before = html.slice(Math.max(0, linkPos - 600), linkPos)
      // Position, club, nationality, age appear in the outer row AFTER the player link
      const after = html.slice(linkPos, linkPos + 2500)

      // Photo: Transfermarkt uses tmssl.akamaized.net CDN, portrait images
      const photoMatches = [...before.matchAll(/src="(https?:\/\/[^"]+\/portrait\/[^"]+\.(?:jpg|png|webp)[^"]*)"[^>]*class="bilderrahmen/gi)]
      const photo = photoMatches.length > 0 ? photoMatches[photoMatches.length - 1][1] : null

      // Position: 1–3 uppercase letters in a zentriert td — appears in outer row after link
      const posMatch = after.match(/<td[^>]*class="zentriert"[^>]*>\s*([A-Z]{1,3})\s*<\/td>/)
      const position = posMatch ? normalizePosition(posMatch[1]) : null

      // Age: 2-digit number in a zentriert td (distinct from position — numbers only)
      const ageMatches = [...after.matchAll(/<td[^>]*class="zentriert"[^>]*>\s*(\d{1,2})\s*<\/td>/g)]
      const age = ageMatches.length > 0 ? parseInt(ageMatches[0][1]) : null
      const approxDob = age && age > 14 && age < 55
        ? new Date(new Date().getFullYear() - age, 0, 1).toISOString().split('T')[0]
        : null

      // Club: verein link — prefer title attribute, fallback to inner text
      const clubMatch = after.match(/href="\/[^"]+\/(?:startseite|kader)\/verein\/\d+"[^>]*title="([^"]+)"/)
        ?? after.match(/href="\/[^"]+\/(?:startseite|kader)\/verein\/\d+"[^>]*>([^<]+)<\/a>/)
      const club = clubMatch?.[1]?.trim() ?? null

      // Nationality: flag image alt text
      const natMatch = after.match(/class="[^"]*flagge[^"]*"[^>]+alt="([^"]+)"/i)
        ?? after.match(/alt="([^"]+)"[^>]*class="[^"]*flagge[^"]*"/i)
      const nationality = natMatch?.[1]?.trim() ?? null

      // Market value: <td class="rechts hauptlink">€1.00m</td>
      const mvMatch = after.match(/<td[^>]*class="rechts hauptlink"[^>]*>([^<]+)<\/td>/)
      const marketValue = mvMatch?.[1]?.trim() ?? null

      players.push({
        id: `tm-${playerId}`,
        name,
        nationality,
        team: club,
        position,
        dateOfBirth: approxDob,
        heightCm: null,
        weightKg: null,
        photo,
        description: null,
        marketValue,
        sourceUrl: `https://www.transfermarkt.com/${slug}/profil/spieler/${playerId}`,
        sourceName: 'Transfermarkt',
        _profileUrl: `https://www.transfermarkt.com/${slug}/profil/spieler/${playerId}`,
      } as any)
    }

    // Fetch height/weight from each player's profile page in parallel
    const enriched = await Promise.allSettled(
      players.map(async (p: any) => {
        try {
          const profileRes = await fetch(p._profileUrl, {
            headers: {
              ...baseHeaders,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Referer': 'https://www.transfermarkt.com/',
              ...(cookieStr ? { 'Cookie': cookieStr } : {}),
            },
          })
          if (!profileRes.ok) return p
          const profileHtml = await profileRes.text()

          // Height: "1,76 m" or "176 cm"
          const heightMatch = profileHtml.match(/(\d[,\.]\d{2})\s*m\b/) ?? profileHtml.match(/(\d{3})\s*cm/i)
          let heightCm: number | null = null
          if (heightMatch) {
            const raw = heightMatch[1]
            if (raw.includes(',') || raw.includes('.')) {
              heightCm = Math.round(parseFloat(raw.replace(',', '.')) * 100)
            } else {
              heightCm = parseInt(raw)
            }
          }

          // Weight: "70 kg"
          const weightMatch = profileHtml.match(/(\d{2,3})\s*kg/i)
          const weightKg = weightMatch ? parseInt(weightMatch[1]) : null

          // Date of birth: "Jan 5, 2002" or "05.01.2002"
          const dobMatch = profileHtml.match(/(\d{2})\.(\d{2})\.(\d{4})/)
          const dateOfBirth = dobMatch ? `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}` : p.dateOfBirth

          delete p._profileUrl
          return { ...p, heightCm, weightKg, dateOfBirth }
        } catch {
          delete p._profileUrl
          return p
        }
      })
    )

    return enriched
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
    } catch {
      return []
    }
  },
}

function normalizePosition(pos: string): string {
  const map: Record<string, string> = {
    GK: 'Goalkeeper', TW: 'Goalkeeper',
    CB: 'Defender', RB: 'Defender', LB: 'Defender', RWB: 'Defender', LWB: 'Defender',
    LA: 'Defender', RA: 'Defender',
    CDM: 'Midfielder', DM: 'Midfielder', CM: 'Midfielder', ZM: 'Midfielder',
    CAM: 'Midfielder', OM: 'Midfielder', AM: 'Midfielder', RM: 'Midfielder', LM: 'Midfielder',
    RW: 'Forward', LW: 'Forward', ST: 'Forward', CF: 'Forward', SS: 'Forward',
  }
  return map[pos.toUpperCase()] ?? pos
}
