export interface PricePoint {
  timestamp: number
  price: number
}

export interface TokenMetrics {
  averagePrice: number
  volatility: number      // standard deviation
  maxPrice: number
  minPrice: number
  trend: "upward" | "downward" | "flat"
  priceChangePct: number
}

export class TokenAnalysisCalculator {
  constructor(private data: PricePoint[]) {}

  private isEmpty(): boolean {
    return this.data.length === 0
  }

  getAveragePrice(): number {
    if (this.isEmpty()) return 0
    const sum = this.data.reduce((acc, p) => acc + p.price, 0)
    return sum / this.data.length
  }

  getVolatility(): number {
    if (this.isEmpty()) return 0
    const avg = this.getAveragePrice()
    const variance =
      this.data.reduce((acc, p) => acc + (p.price - avg) ** 2, 0) / this.data.length
    return Math.sqrt(variance)
  }

  getMaxPrice(): number {
    if (this.isEmpty()) return 0
    return this.data.reduce((max, p) => (p.price > max ? p.price : max), -Infinity)
  }

  getMinPrice(): number {
    if (this.isEmpty()) return 0
    return this.data.reduce((min, p) => (p.price < min ? p.price : min), Infinity)
  }

  getTrend(): { trend: "upward" | "downward" | "flat"; changePct: number } {
    if (this.data.length < 2) return { trend: "flat", changePct: 0 }
    const first = this.data[0].price
    const last = this.data[this.data.length - 1].price
    const changePct = ((last - first) / first) * 100
    let trend: "upward" | "downward" | "flat" = "flat"
    if (last > first) trend = "upward"
    else if (last < first) trend = "downward"
    return { trend, changePct }
  }

  computeMetrics(): TokenMetrics {
    const { trend, changePct } = this.getTrend()
    return {
      averagePrice: this.getAveragePrice(),
      volatility: this.getVolatility(),
      maxPrice: this.getMaxPrice(),
      minPrice: this.getMinPrice(),
      trend,
      priceChangePct: changePct,
    }
  }

  /**
   * Returns normalized prices in range [0,1] for visualization.
   */
  normalizePrices(): number[] {
    if (this.isEmpty()) return []
    const min = this.getMinPrice()
    const max = this.getMaxPrice()
    if (max === min) return this.data.map(() => 0.5)
    return this.data.map(p => (p.price - min) / (max - min))
  }
}
