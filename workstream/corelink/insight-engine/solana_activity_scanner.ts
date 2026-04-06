/**
 * Analyze on-chain SPL token activity: fetch signatures for an address,
 * load transactions via Solana JSON-RPC, and summarize token balance deltas
 *
 * Improvements (kept compact):
 * - JSON-RPC POST with timeout + single retry
 * - Defensive typing and normalization
 * - Pair pre/post balances by accountIndex (more accurate)
 * - Sorted newest-first result
 */

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string | null
  destination: string | null
  amount: number
}

type Commitment = "processed" | "confirmed" | "finalized"

interface SignatureInfo {
  signature: string
  slot: number
  blockTime: number | null
  confirmationStatus?: Commitment
}

interface UiTokenAmount {
  uiAmount: number | null
  amount: string
  decimals: number
  uiAmountString?: string
}

interface TokenBalanceEntry {
  accountIndex: number
  mint: string
  owner?: string
  uiTokenAmount: UiTokenAmount
}

interface TxMeta {
  preTokenBalances?: TokenBalanceEntry[]
  postTokenBalances?: TokenBalanceEntry[]
  err: unknown | null
}

interface ParsedTx {
  slot: number
  blockTime: number | null
  meta: TxMeta | null
}

export class TokenActivityAnalyzer {
  constructor(
    private rpcEndpoint: string,
    private commitment: Commitment = "confirmed",
    private requestTimeoutMs: number = 10_000
  ) {}

  // ---- JSON-RPC helper (single retry, deterministic) ----
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const attempt = async (): Promise<T> => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs)
      try {
        const res = await fetch(this.rpcEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${method}`)
        const json = await res.json()
        if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`)
        return json.result as T
      } finally {
        clearTimeout(timer)
      }
    }

    try {
      return await attempt()
    } catch {
      // single retry
      return await attempt()
    }
  }

  async fetchRecentSignatures(address: string, limit = 100): Promise<SignatureInfo[]> {
    const opts = { limit, commitment: this.commitment }
    const list = await this.rpc<SignatureInfo[]>("getSignaturesForAddress", [address, opts])
    return Array.isArray(list) ? list : []
  }

  private async fetchTransaction(signature: string): Promise<ParsedTx | null> {
    const cfg = { maxSupportedTransactionVersion: 0, commitment: this.commitment }
    return this.rpc<ParsedTx | null>("getTransaction", [signature, cfg])
  }

  /**
   * analyzeActivity(mintOrAddress, limit)
   * For backward compatibility with original code, the first arg is used
   * as the address for getSignaturesForAddress and as the mint filter if present in balances.
   */
  async analyzeActivity(mint: string, limit = 50): Promise<ActivityRecord[]> {
    const sigInfos = await this.fetchRecentSignatures(mint, limit)
    const records: ActivityRecord[] = []

    for (const s of sigInfos) {
      const tx = await this.fetchTransaction(s.signature)
      const meta = tx?.meta
      if (!meta) continue

      const pre = meta.preTokenBalances ?? []
      const post = meta.postTokenBalances ?? []

      // index pre by accountIndex for pairing
      const preByIdx = new Map<number, TokenBalanceEntry>()
      for (let i = 0; i < pre.length; i++) preByIdx.set(pre[i].accountIndex, pre[i])

      for (let i = 0; i < post.length; i++) {
        const p = post[i]
        const q = preByIdx.get(p.accountIndex)
        // keep behavior close to original: when q missing, treat as 0 with unknown owner
        const preUi = q?.uiTokenAmount?.uiAmount ?? 0
        const postUi = p.uiTokenAmount?.uiAmount ?? 0
        const delta = (postUi || 0) - (preUi || 0)
        if (delta === 0) continue

        // optional mint filter: if caller passed a mint, prefer matches
        if (p.mint && mint && p.mint !== mint) continue

        const isReceive = delta > 0
        const source = isReceive ? (q?.owner ?? null) : (p.owner ?? null)
        const destination = isReceive ? (p.owner ?? null) : (q?.owner ?? null)

        records.push({
          timestamp: (tx?.blockTime ?? 0) * 1000,
          signature: s.signature,
          source,
          destination,
          amount: Math.abs(delta),
        })
      }
    }

    // newest first
    records.sort((a, b) => b.timestamp - a.timestamp)
    return records
  }
}
