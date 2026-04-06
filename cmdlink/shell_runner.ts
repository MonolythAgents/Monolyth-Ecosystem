import { execCommand, tryExecCommand } from "./execCommand"

export interface ShellTask {
  id: string
  command: string
  description?: string
}

export interface ShellResult {
  taskId: string
  output?: string
  error?: string
  executedAt: number
  durationMs: number
}

export class ShellTaskRunner {
  private tasks: ShellTask[] = []

  /**
   * Schedule a shell task for execution.
   */
  scheduleTask(task: ShellTask): void {
    if (this.tasks.find(t => t.id === task.id)) {
      throw new Error(`Task with id "${task.id}" already scheduled`)
    }
    this.tasks.push(task)
  }

  /**
   * Execute all scheduled tasks in sequence.
   */
  async runAll(): Promise<ShellResult[]> {
    const results: ShellResult[] = []
    for (const task of this.tasks) {
      const start = Date.now()
      try {
        const output = await execCommand(task.command)
        results.push({
          taskId: task.id,
          output,
          executedAt: start,
          durationMs: Date.now() - start,
        })
      } catch (err: any) {
        results.push({
          taskId: task.id,
          error: err.message ?? String(err),
          executedAt: start,
          durationMs: Date.now() - start,
        })
      }
    }
    this.tasks = []
    return results
  }

  /**
   * Execute a single task safely, capturing errors without throwing
   */
  async runOneSafe(task: ShellTask): Promise<ShellResult> {
    const start = Date.now()
    const res = await tryExecCommand(task.command)
    return {
      taskId: task.id,
      output: res.ok ? res.output : undefined,
      error: res.ok ? undefined : res.error,
      executedAt: start,
      durationMs: Date.now() - start,
    }
  }

  /**
   * List scheduled tasks
   */
  listTasks(): ShellTask[] {
    return [...this.tasks]
  }

  /**
   * Clear all scheduled tasks
   */
  clear(): void {
    this.tasks = []
  }
}
