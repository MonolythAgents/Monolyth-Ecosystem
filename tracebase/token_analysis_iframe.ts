import type { TokenMetrics } from "./tokenAnalysisCalculator"

export interface IframeConfig {
  containerId: string
  srcUrl: string
  metrics: TokenMetrics
  refreshIntervalMs?: number
  className?: string
}

export class TokenAnalysisIframe {
  private iframeEl: HTMLIFrameElement | null = null
  private timer?: ReturnType<typeof setInterval>

  constructor(private config: IframeConfig) {}

  init(): void {
    const container = document.getElementById(this.config.containerId)
    if (!container) {
      throw new Error("Container not found: " + this.config.containerId)
    }

    const iframe = document.createElement("iframe")
    iframe.src = this.config.srcUrl
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.style.border = "none"
    if (this.config.className) iframe.className = this.config.className
    iframe.onload = () => this.postMetrics()
    container.appendChild(iframe)
    this.iframeEl = iframe

    if (this.config.refreshIntervalMs) {
      this.timer = setInterval(() => this.postMetrics(), this.config.refreshIntervalMs)
    }
  }

  private postMetrics(): void {
    if (!this.iframeEl?.contentWindow) return
    this.iframeEl.contentWindow.postMessage(
      { type: "TOKEN_ANALYSIS_METRICS", payload: this.config.metrics },
      "*"
    )
  }

  updateMetrics(metrics: TokenMetrics): void {
    this.config.metrics = metrics
    this.postMetrics()
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer)
    this.iframeEl?.remove()
    this.iframeEl = null
  }
}
