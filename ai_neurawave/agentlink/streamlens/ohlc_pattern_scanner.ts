import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

/*------------------------------------------------------
 * Utilities
 *----------------------------------------------------*/

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function isValidCandle(c: Candle): boolean {
  return (
    Number.isFinite(c.timestamp) &&
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close) &&
    c.high >= c.low
  )
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /* Fetch recent OHLC candles */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const url = `${this.apiUrl}/markets/${encodeURIComponent(symbol)}/candles?limit=${encodeURIComponent(
      String(limit)
    )}`
    const res = await fetch(url, { timeout: 10_000 })
    if (!res.ok) {
      throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
    }
    const raw = (await res.json()) as Candle[]
    const cleaned: Candle[] = []
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i]
      if (c && isValidCandle(c)) cleaned.push(c)
    }
    return cleaned
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle): number {
    const range = c.high - c.low
    if (range <= 0) return 0
    const body = Math.abs(c.close - c.open)
    const lowerWick = Math.min(c.open, c.close) - c.low
    const upperWick = c.high - Math.max(c.open, c.close)
    if (upperWick > body * 0.8) return 0 // upper wick should be relatively small
    const ratio = body > 0 ? lowerWick / body : 0
    const bodyShare = body / range
    if (ratio > 2 && bodyShare < 0.35) {
      return clamp01(Math.min(ratio / 3, 1))
    }
    return 0
  }

  private isShootingStar(c: Candle): number {
    const range = c.high - c.low
    if (range <= 0) return 0
    const body = Math.abs(c.close - c.open)
    const upperWick = c.high - Math.max(c.open, c.close)
    const lowerWick = Math.min(c.open, c.close) - c.low
    if (lowerWick > body * 0.8) return 0 // lower wick should be relatively small
    const ratio = body > 0 ? upperWick / body : 0
    const bodyShare = body / range
    if (ratio > 2 && bodyShare < 0.35) {
      return clamp01(Math.min(ratio / 3, 1))
    }
    return 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const prevBear = prev.close < prev.open
    const currBull = curr.close > curr.open
    const engulf =
      curr.close > prev.open && curr.open < prev.close && Math.abs(curr.close - curr.open) > 0
    if (!(prevBear && currBull && engulf)) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return clamp01(bodyPrev > 0 ? bodyCurr / bodyPrev : 0.8)
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const prevBull = prev.close > prev.open
    const currBear = curr.close < curr.open
    const engulf =
      curr.open > prev.close && curr.close < prev.open && Math.abs(curr.close - curr.open) > 0
    if (!(prevBull && currBear && engulf)) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return clamp01(bodyPrev > 0 ? bodyCurr / bodyPrev : 0.8)
  }

  private isDoji(c: Candle): number {
    const range = c.high - c.low
    if (range <= 0) return 0
    const body = Math.abs(c.close - c.open)
    const ratio = body / range
    // full confidence at ~0 body, linearly fade to 0 at 10% body-to-range
    return clamp01(ratio < 0.1 ? 1 - ratio * 10 : 0)
  }

  /* ------------------------- Context helpers ---------------------- */

  // Simple trend score based on last N closes (positive = uptrend, negative = downtrend)
  private trendScore(series: Candle[], endIdx: number, lookback = 5): number {
    const start = Math.max(0, endIdx - lookback + 1)
    let score = 0
    for (let i = start + 1; i <= endIdx; i++) {
      if (series[i].close > series[i - 1].close) score++
      else if (series[i].close < series[i - 1].close) score--
    }
    return score
  }

  /* ------------------------- Public API --------------------------- */

  /**
   * Scan a candle series for known patterns, returning signals above a confidence threshold
   * @param candles input OHLC candles in chronological order
   * @param minConfidence minimum confidence required to emit a signal (0..1)
   */
  detect(candles: Candle[], minConfidence = 0.4): PatternSignal[] {
    if (!Array.isArray(candles) || candles.length === 0) return []

    const out: PatternSignal[] = []
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      if (!isValidCandle(c)) continue

      // single-candle patterns
      const hammerConf = this.isHammer(c)
      const starConf = this.isShootingStar(c)
      const dojiConf = this.isDoji(c)

      // context-adjusted confidence: prefer hammers in downtrends, stars in uptrends
      const trend = this.trendScore(candles, i, 6)
      const hammerAdj = trend < 0 ? clamp01(hammerConf * 1.1) : hammerConf
      const starAdj = trend > 0 ? clamp01(starConf * 1.1) : starConf

      if (hammerAdj >= minConfidence) {
        out.push({ timestamp: c.timestamp, pattern: "Hammer", confidence: hammerAdj })
      }
      if (starAdj >= minConfidence) {
        out.push({ timestamp: c.timestamp, pattern: "ShootingStar", confidence: starAdj })
      }
      if (dojiConf >= minConfidence) {
        out.push({ timestamp: c.timestamp, pattern: "Doji", confidence: dojiConf })
      }

      // two-candle patterns
      if (i > 0) {
        const p = candles[i - 1]
        const bullEng = this.isBullishEngulfing(p, c)
        const bearEng = this.isBearishEngulfing(p, c)
        if (bullEng >= minConfidence) {
          out.push({ timestamp: c.timestamp, pattern: "BullishEngulfing", confidence: bullEng })
        }
        if (bearEng >= minConfidence) {
          out.push({ timestamp: c.timestamp, pattern: "BearishEngulfing", confidence: bearEng })
        }
      }
    }
    return out
  }
}
