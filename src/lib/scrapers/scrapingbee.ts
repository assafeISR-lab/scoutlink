/** Fetch a URL via ScrapingBee to bypass Cloudflare and bot-detection. */
export async function sbFetch(
  url: string,
  renderJs = false,
  signal?: AbortSignal,
  waitMs?: number,
  postBody?: string,
): Promise<Response> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY
  if (!apiKey) throw new Error('SCRAPINGBEE_API_KEY not configured')
  const endpoint = new URL('https://app.scrapingbee.com/api/v1/')
  endpoint.searchParams.set('api_key', apiKey)
  endpoint.searchParams.set('url', url)
  endpoint.searchParams.set('render_js', renderJs ? 'true' : 'false')
  if (waitMs) endpoint.searchParams.set('wait', String(waitMs))
  if (postBody) endpoint.searchParams.set('post_body', postBody)
  return fetch(endpoint.toString(), signal ? { signal } : undefined)
}
