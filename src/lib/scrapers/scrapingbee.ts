/** Fetch a URL via ScrapingBee to bypass Cloudflare and bot-detection. */
export async function sbFetch(
  url: string,
  renderJs = false,
  signal?: AbortSignal,
  waitMs?: number,
): Promise<Response> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY
  if (!apiKey) throw new Error('SCRAPINGBEE_API_KEY not configured')
  const endpoint = new URL('https://app.scrapingbee.com/api/v1/')
  endpoint.searchParams.set('api_key', apiKey)
  endpoint.searchParams.set('url', url)
  endpoint.searchParams.set('render_js', renderJs ? 'true' : 'false')
  if (waitMs) endpoint.searchParams.set('wait', String(waitMs))
  return fetch(endpoint.toString(), signal ? { signal } : undefined)
}

/** Fetch via ScrapingBee with a JS interaction scenario (fill inputs, click, wait). */
export async function sbInteract(
  url: string,
  instructions: object[],
  signal?: AbortSignal,
): Promise<Response> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY
  if (!apiKey) throw new Error('SCRAPINGBEE_API_KEY not configured')
  const endpoint = new URL('https://app.scrapingbee.com/api/v1/')
  endpoint.searchParams.set('api_key', apiKey)
  endpoint.searchParams.set('url', url)
  endpoint.searchParams.set('render_js', 'true')
  endpoint.searchParams.set('js_scenario', JSON.stringify({ instructions }))
  return fetch(endpoint.toString(), signal ? { signal } : undefined)
}
