import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Extended liquidity tools registry
 * - fetch raw pool data
 * - analyze pool health
 * - utility: score pools for ranking
 */
export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Rank pools by combining risk score and liquidity reserves
 */
export function rankPools(
  pools: {
    id: string
    reserves: number
    riskScore: number
  }[]
): { id: string; rank: number }[] {
  if (!Array.isArray(pools) || pools.length === 0) return []
  // higher reserves and lower riskScore are better
  const scored = pools.map(p => {
    const liquidityFactor = Math.log10(p.reserves + 1)
    const safetyFactor = 100 - p.riskScore
    const rankValue = liquidityFactor * 0.6 + safetyFactor * 0.4
    return { id: p.id, rankValue }
  })
  scored.sort((a, b) => b.rankValue - a.rankValue)
  return scored.map((s, idx) => ({ id: s.id, rank: idx + 1 }))
}
