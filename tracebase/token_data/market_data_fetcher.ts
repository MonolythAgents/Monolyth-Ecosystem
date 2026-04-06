export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export class TokenDataFetcher {
  constructor(
    private apiBase: string,
    private requestTimeoutMs: number = 10_000
  ) {}

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string, limit?: number): Promise<TokenDataPoint[]> {
    const url =
      `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history` +
      (limit ? `?limit=${encodeURIComponent(String(limit))}` : "")

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), this.requestTimeoutMs)

    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) {
        throw new Error(`Failed to fetch history for ${symbol}: HTTP ${res.status}`)
      }
      const raw = (await res.json()) as any[]
      return raw
        .filter(r => r && r.time && r.priceUsd)
        .map(r => ({
          timestamp: Number(r.time) * 1000,
          priceUsd: Number(r.priceUsd),
          volumeUsd: Number(r.volumeUsd ?? 0),
          marketCapUsd: Number(r.marketCapUsd ?? 0),
        }))
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Fetch the latest datapoint only.
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const history = await this.fetchHistory(symbol, 1)
    return history.length > 0 ? history[0] : null
  }
}
