import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
}

export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal) {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? port === 465,
      auth: { user, pass },
    })
    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
      text: `${signal.message}\n\nTimestamp: ${new Date(
        signal.timestamp ?? Date.now()
      ).toISOString()}`,
    })
  }

  private logConsole(signal: AlertSignal) {
    if (!this.cfg.console) return
    const ts = new Date(signal.timestamp ?? Date.now()).toISOString()
    console.log(`[Alert][${signal.level.toUpperCase()}][${ts}] ${signal.title}`)
    console.log(signal.message)
  }

  /**
   * Dispatch one or many alerts
   */
  async dispatch(signals: AlertSignal[] | AlertSignal) {
    const arr = Array.isArray(signals) ? signals : [signals]
    for (const sig of arr) {
      try {
        await this.sendEmail(sig)
        this.logConsole(sig)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`Failed to dispatch alert "${sig.title}": ${msg}`)
      }
    }
  }
}
