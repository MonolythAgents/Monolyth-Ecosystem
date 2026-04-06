export interface PairInfo {
  exchange: string
  pairAddress: string
  baseSymbol: string
  quoteSymbol: string
  liquidityUsd: number
  volume24hUsd: number
  priceUsd: number
}

export interface DexSuiteConfig {
  apis: Array<{ name: string; baseUrl: string; apiKey?: string }>
  timeoutMs?: number
}

type ApiConfig = { name: string; baseUrl: string; apiKey?: string }

export class DexSuite {
  constructor(private config: DexSuiteConfig) {}

  private buildHeaders(api: ApiConfig): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (api.apiKey) headers["Authorization"] = `Bearer ${api.apiKey}`
    return headers
  }

  private async fetchFromApi<T>(api: ApiConfig, path: string): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10_000)
    try {
      const url =
        api.baseUrl.endsWith("/") ? `${api.baseUrl.slice(0, -1)}${path}` : `${api.baseUrl}${path}`
      const res = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders(api),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${api.name} ${path} HTTP ${res.status}`)
      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  private normalizePairData(apiName: string, pairAddress: string, raw: any): PairInfo {
    // defensively coerce fields and provide safe fallbacks
    const t0 = raw?.token0 ?? {}
    const t1 = raw?.token1 ?? {}
    const liq = Number(raw?.liquidityUsd ?? 0)
    const vol = Number(raw?.volume24hUsd ?? 0)
    const price = Number(raw?.priceUsd ?? 0)
    return {
      exchange: apiName,
      pairAddress,
      baseSymbol: String(t0.symbol ?? t0.sym ?? "BASE"),
      quoteSymbol: String(t1.symbol ?? t1.sym ?? "QUOTE"),
      liquidityUsd: Number.isFinite(liq) ? liq : 0,
      volume24hUsd: Number.isFinite(vol) ? vol : 0,
      priceUsd: Number.isFinite(price) ? price : 0,
    }
  }

  private emptyPairInfo(addr: string): PairInfo {
    return {
      exchange: "-",
      pairAddress: addr,
      baseSymbol: "N/A",
      quoteSymbol: "N/A",
      liquidityUsd: 0,
      volume24hUsd: 0,
      priceUsd: 0,
    }
  }

  /**
   * Retrieve aggregated pair info across all configured DEX APIs.
   * @param pairAddress Blockchain address of the trading pair
   */
  async getPairInfo(pairAddress: string): Promise<PairInfo[]> {
    if (!pairAddress) return []

    const results: PairInfo[] = []
    const tasks = this.config.apis.map(async api => {
      try {
        const data = await this.fetchFromApi<any>(api, `/pair/${encodeURIComponent(pairAddress)}`)
        results.push(this.normalizePairData(api.name, pairAddress, data))
      } catch {
        // skip failed API
      }
    })
    await Promise.all(tasks)

    // sort by liquidity desc, then volume desc for more useful ordering
    results.sort((a, b) =>
      b.liquidityUsd !== a.liquidityUsd
        ? b.liquidityUsd - a.liquidityUsd
        : b.volume24hUsd - a.volume24hUsd
    )
    return results
  }

  private getBestBy(infos: PairInfo[], key: keyof Pick<PairInfo, "volume24hUsd" | "liquidityUsd">): PairInfo {
    if (infos.length === 0) return this.emptyPairInfo("")
    let best = infos[0]
    for (let i = 1; i < infos.length; i++) {
      if (infos[i][key] > best[key]) best = infos[i]
    }
    return best
  }

  /**
   * Compare a list of pairs across exchanges, returning the best volume and liquidity.
   */
  async comparePairs(
    pairs: string[]
  ): Promise<Record<string, { bestVolume: PairInfo; bestLiquidity: PairInfo }>> {
    const entries = await Promise.all(
      pairs.map(async addr => {
        const infos = await this.getPairInfo(addr)
        if (infos.length === 0) {
          const empty = this.emptyPairInfo(addr)
          return [addr, { bestVolume: empty, bestLiquidity: empty }] as const
        }
        const bestVolume = this.getBestBy(infos, "volume24hUsd")
        const bestLiquidity = this.getBestBy(infos, "liquidityUsd")
        return [addr, { bestVolume, bestLiquidity }] as const
      })
    )
    return Object.fromEntries(entries)
  }

  /**
   * Get the best quoted price among all exchanges for a pair (prefers higher liquidity on ties).
   */
  async getBestPrice(pairAddress: string): Promise<PairInfo | null> {
    const infos = await this.getPairInfo(pairAddress)
    if (infos.length === 0) return null
    let best = infos[0]
    for (let i = 1; i < infos.length; i++) {
      const a = infos[i]
      if (a.priceUsd < best.priceUsd) best = a
      else if (a.priceUsd === best.priceUsd && a.liquidityUsd > best.liquidityUsd) best = a
    }
    return best
  }
}
