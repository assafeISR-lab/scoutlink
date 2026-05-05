import type { SiteScraper } from './types'
import { sofascoreScraper } from './sofascore'
import { transfermarktScraper } from './transfermarkt'
import { fmInsideScraper } from './fminside'

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
