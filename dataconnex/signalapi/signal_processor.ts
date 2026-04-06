import type { Signal } from "./SignalApiClient"

/**
 * Processes raw signals into actionable events.
 * - Provides filtering, aggregation, summarization
 * - Adds grouping by time bucket and sorting
 */
export class SignalProcessor {
  /**
   * Filter signals by type and recency.
   * @param signals Array of Signal
   * @param type Desired signal type
   * @param sinceTimestamp Only include signals after this time
   */
  filter(signals: Signal[], type: string, sinceTimestamp: number): Signal[] {
    return signals.filter(s => s.type === type && s.timestamp > sinceTimestamp)
  }

  /**
   * Aggregate signals by type, counting occurrences.
   * @param signals Array of Signal
   */
  aggregateByType(signals: Signal[]): Record<string, number> {
    return signals.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Transform a signal into a human-readable summary string.
   */
  summarize(signal: Signal): string {
    const time = new Date(signal.timestamp).toISOString()
    return `[${time}] ${signal.type.toUpperCase()}: ${JSON.stringify(signal.payload)}`
  }

  /**
   * Group signals into time buckets (e.g., per minute).
   */
  groupByMinute(signals: Signal[]): Record<string, Signal[]> {
    return signals.reduce((acc, s) => {
      const bucket = new Date(s.timestamp).toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
      if (!acc[bucket]) acc[bucket] = []
      acc[bucket].push(s)
      return acc
    }, {} as Record<string, Signal[]>)
  }

  /**
   * Sort signals chronologically.
   */
  sortByTimestamp(signals: Signal[], ascending = true): Signal[] {
    return [...signals].sort((a, b) =>
      ascending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
    )
  }
}
