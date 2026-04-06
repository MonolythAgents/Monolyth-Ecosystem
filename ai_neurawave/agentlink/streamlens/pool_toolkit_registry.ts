import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related actions:
 * – fetch raw pool data
 * – run health / risk analysis on a liquidity pool
 * – calculate risk score for easier interpretation
 */
export const LIQUIDITY_ANALYSIS_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Utility: derive a simple risk score (0–100) from a health report
 */
export function calculateRiskScore(healthReport: {
  reserves: number
  utilization: number
  concentration: number
}): number {
  const { reserves, utilization, concentration } = healthReport
  // normalize each factor into 0–1 band
  const resFactor = reserves > 0 ? Math.min(1, Math.log10(reserves + 1) / 6) : 0
  const utilFactor = 1 - Math.min(1, utilization) // lower utilization safer
  const concFactor = 1 - Math.min(1, concentration) // lower concentration safer
  const raw = (resFactor * 0.4 + utilFactor * 0.3 + concFactor * 0.3) * 100
  return Math.max(0, Math.min(100, Math.round(raw)))
}
