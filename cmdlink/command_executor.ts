import { exec } from "child_process"

/**
 * Execute a shell command and return stdout or throw on error.
 * - Includes timeout support
 * - Rejects on nonzero exit code or stderr output
 * - Trims trailing newlines
 */
export function execCommand(
  command: string,
  timeoutMs: number = 30_000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = exec(
      command,
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr?.trim() || error.message || "Command failed"
          return reject(new Error(`Command failed: ${msg}`))
        }
        if (stderr && stderr.trim().length > 0) {
          return reject(new Error(`Command error output: ${stderr.trim()}`))
        }
        resolve(stdout.trim())
      }
    )

    if (!proc.pid) {
      reject(new Error("Failed to start process"))
    }
  })
}

/**
 * Try executing a command safely, capturing errors instead of throwing
 */
export async function tryExecCommand(
  command: string,
  timeoutMs?: number
): Promise<{ ok: boolean; output?: string; error?: string }> {
  try {
    const out = await execCommand(command, timeoutMs)
    return { ok: true, output: out }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
