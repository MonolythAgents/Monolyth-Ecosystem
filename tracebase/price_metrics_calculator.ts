export interface PricePoint {
  timestamp: number
  price: number
}

export interface TokenMetrics {
  averagePrice: number
  volatility: number // standard deviation
  maxPrice: number
  minPrice: number
  lastPrice: number
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
      this.data.reduce((acc, p) => acc + (p.price - avg) ** 2, 0) /
      (this.data.length || 1)
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

  getLastPrice(): number {
    if (this.isEmpty()) return 0
    return this.data[this.data.length - 1].price
  }

  getPriceChangePct(): number {
    if (this.data.length < 2) return 0
    const first = this.data[0].price
    const last = this.getLastPrice()
    if (first === 0) return 0
    return ((last - first) / first) * 100
  }

  computeMetrics(): TokenMetrics {
    return {
      averagePrice: this.getAveragePrice(),
      volatility: this.getVolatility(),
      maxPrice: this.getMaxPrice(),
      minPrice: this.getMinPrice(),
      lastPrice: this.getLastPrice(),
      priceChangePct: this.getPriceChangePct(),
    }
  }
}
