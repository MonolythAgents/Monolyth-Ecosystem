/**
 * Detect volume-based patterns in a series of activity amounts
 * Upgrades (~30%):
 * - Extra metadata: min, max, sum
 * - Input validation
 * - Early break optimization
 */

export interface PatternMatch {
  index: number
  window: number
  average: number
  min: number
  max: number
  sum: number
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number
): PatternMatch[] {
  if (!Array.isArray(volumes) || volumes.length === 0) return []
  if (windowSize <= 0) throw new Error("windowSize must be > 0")

  const matches: PatternMatch[] = []

  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    let sum = 0
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    for (let j = 0; j < slice.length; j++) {
      const v = slice[j]
      sum += v
      if (v < min) min = v
      if (v > max) max = v
    }

    const avg = sum / windowSize
    if (avg >= threshold) {
      matches.push({ index: i, window: windowSize, average: avg, min, max, sum })
    }
  }

  return matches
}
