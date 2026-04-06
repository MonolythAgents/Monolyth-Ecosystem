import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp: number
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}

  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    const existing = this.counts[topic]
    if (existing) {
      existing.count += 1
      existing.lastPayload = payload
      existing.lastTimestamp = timestamp
      this.counts[topic] = existing
      return existing
    }
    const created: AggregatedSignal = {
      topic,
      count: 1,
      lastPayload: payload,
      lastTimestamp: timestamp,
      firstTimestamp: timestamp,
    }
    this.counts[topic] = created
    return created
  }

  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  reset(): void {
    this.counts = {}
  }

  /**
   * Return aggregated signals sorted by most recent activity
   */
  getSortedByLast(): AggregatedSignal[] {
    return this.getAllAggregated().sort(
      (a, b) => b.lastTimestamp - a.lastTimestamp
    )
  }

  /**
   * Return aggregated signals sorted by total count
   */
  getSortedByCount(desc = true): AggregatedSignal[] {
    return this.getAllAggregated().sort((a, b) =>
      desc ? b.count - a.count : a.count - b.count
    )
  }
}
