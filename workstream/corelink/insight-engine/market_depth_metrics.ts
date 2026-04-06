/**
 * Analyze on-chain orderbook depth for a given market
 * Upgrades (~30%):
 * - Timeout + single retry (deterministic)
 * - Safe URL encoding and JSON parsing
 * - Input normalization (positive numbers, sorted sides)
 * - Defensive math against NaN/Infinity
 */

export interface Order {
  price: number
  size: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
}

type Orderbook = { bids?: Order[]; asks?: Order[] }

export class TokenDepthAnalyzer {
  constructor(
    private rpcEndpoint: string,
    private marketId: string,
    private requestTimeoutMs: number = 10_000
  ) {}

  private async delay(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms))
  }

  private avg(arr: number[]): number {
    if (arr.length === 0) return 0
    let sum = 0
    for (let i = 0; i < arr.length; i++) sum += arr[i]
    return sum / arr.length
  }

  private normalizeSide(side: Order[] | undefined, isBid: boolean): Order[] {
    const src = Array.isArray(side) ? side : []
    const out: Order[] = []
    for (let i = 0; i < src.length; i++) {
      const p = Number(src[i]?.price)
      const s = Number(src[i]?.size)
      if (!Number.isFinite(p) || !Number.isFinite(s)) continue
      if (p <= 0 || s <= 0) continue
      out.push({ price: p, size: s })
    }
    out.sort((a, b) => (isBid ? b.price - a.price : a.price - b.price))
    return out
  }

  private async fetchOnce(url: string): Promise<Orderbook> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), this.requestTimeoutMs)
    try {
      const res = await fetch(url, { method: "GET", signal: ctrl.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as Orderbook
    } finally {
      clearTimeout(timer)
    }
  }

  async fetchOrderbook(depth = 50): Promise<{ bids: Order[]; asks: Order[] }> {
    const url =
      `${this.rpcEndpoint}/orderbook/` +
      `${encodeURIComponent(this.marketId)}?depth=${encodeURIComponent(String(depth))}`

    // single deterministic retry
    let raw: Orderbook
    try {
      raw = await this.fetchOnce(url)
    } catch {
      await this.delay(200)
      raw = await this.fetchOnce(url)
    }

    return {
      bids: this.normalizeSide(raw.bids, true),
      asks: this.normalizeSide(raw.asks, false),
    }
  }

  async analyze(depth = 50): Promise<DepthMetrics> {
    const { bids, asks } = await this.fetchOrderbook(depth)

    const bestBid = bids.length > 0 ? bids[0].price : 0
    const bestAsk = asks.length > 0 ? asks[0].price : 0

    const averageBidDepth = this.avg(bids.map(b => b.size))
    const averageAskDepth = this.avg(asks.map(a => a.size))

    const spread = bestBid > 0 && bestAsk > 0 ? Math.max(0, bestAsk - bestBid) : 0

    return { averageBidDepth, averageAskDepth, spread }
  }
}
