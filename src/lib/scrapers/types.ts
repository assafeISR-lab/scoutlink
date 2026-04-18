export interface ScrapedPlayer {
  id: string
  name: string
  nationality: string | null
  team: string | null
  position: string | null
  dateOfBirth: string | null
  heightCm: number | null
  weightKg: number | null
  photo: string | null
  description: string | null
  marketValue: string | null
  sourceUrl: string
  sourceName: string
}

export interface SiteScraper {
  /** Domains this scraper handles, e.g. ['sofascore.com', 'www.sofascore.com'] */
  domains: string[]
  /** Human-readable name shown in results */
  name: string
  search: (query: string) => Promise<ScrapedPlayer[]>
}

/** A player record merged from one or more scraper sources */
export interface MergedPlayer {
  id: string
  name: string
  nationality: string | null
  team: string | null
  position: string | null
  dateOfBirth: string | null
  heightCm: number | null
  weightKg: number | null
  photo: string | null
  description: string | null
  marketValue: string | null
  transfermarktUrl: string | null
  sofascoreUrl: string | null
  fmInsideUrl: string | null
  /** Which scraper names contributed data to this record */
  sources: string[]
}
