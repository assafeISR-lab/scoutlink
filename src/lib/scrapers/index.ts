import type { SiteScraper, ScrapedPlayer } from './types'
import { sofascoreScraper, scrapeByUrl as sofascoreScrapeByUrl } from './sofascore'
import { transfermarktScraper, scrapeByUrl as transfermarktScrapeByUrl } from './transfermarkt'
import { fmInsideScraper, scrapeByUrl as fmInsideScrapeByUrl } from './fminside'

export { type ScrapedPlayer, type MergedPlayer } from './types'

const ALL_SCRAPERS: SiteScraper[] = [
  sofascoreScraper,
  transfermarktScraper,
  fmInsideScraper,
]

/** Returns the scraper for a given site URL, or null if unsupported */
export function getScraperForUrl(url: string): SiteScraper | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return ALL_SCRAPERS.find(s => s.domains.some(d => d.replace(/^www\./, '') === hostname)) ?? null
  } catch {
    return null
  }
}

/** Scrape a single player directly from a profile URL on any supported site. */
export async function scrapePlayerByUrl(url: string): Promise<ScrapedPlayer | null> {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    if (hostname.includes('sofascore.com'))    return await sofascoreScrapeByUrl(url)
    if (hostname.includes('transfermarkt.'))   return await transfermarktScrapeByUrl(url)
    if (hostname.includes('fminside.net'))     return await fmInsideScrapeByUrl(url)
    return null
  } catch {
    return null
  }
}
