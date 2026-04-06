export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * HTTP client for fetching signals from ArchiNet
 * - Supports list, fetch by id, and search by type
 * - Basic retry with timeout
 */
export class SignalApiClient {
  constructor(
    private baseUrl: string,
    private apiKey?: string,
    private requestTimeoutMs: number = 10_000,
    private maxRetries: number = 1
  ) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async fetchJson<T>(url: string): Promise<ApiResponse<T>> {
    let lastErr: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), this.requestTimeoutMs)
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: this.getHeaders(),
          signal: ctrl.signal,
        })
        clearTimeout(timer)
        if (!res.ok) {
          return { success: false, error: `HTTP ${res.status}` }
        }
        const data = (await res.json()) as T
        return { success: true, data }
      } catch (err) {
        clearTimeout(timer)
        lastErr = err
        if (attempt < this.maxRetries) {
          await this.delay(200)
          continue
        }
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    }
    return { success: false, error: "Unreachable state" }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    return this.fetchJson<Signal[]>(`${this.baseUrl}/signals`)
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    return this.fetchJson<Signal>(`${this.baseUrl}/signals/${encodeURIComponent(id)}`)
  }

  async searchSignalsByType(type: string): Promise<ApiResponse<Signal[]>> {
    return this.fetchJson<Signal[]>(
      `${this.baseUrl}/signals?type=${encodeURIComponent(type)}`
    )
  }

  async fetchLatest(limit = 10): Promise<ApiResponse<Signal[]>> {
    return this.fetchJson<Signal[]>(
      `${this.baseUrl}/signals?limit=${encodeURIComponent(String(limit))}`
    )
  }
}
