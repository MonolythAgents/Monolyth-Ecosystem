/**
 * Simple task executor: registers and runs tasks by name.
 */
type Handler = (params: any) => Promise<any>

interface Task {
  id: string
  type: string
  params: any
  enqueuedAt: number
}

interface TaskResult {
  id: string
  result?: any
  error?: string
  startedAt: number
  finishedAt: number
  durationMs: number
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Task[] = []

  register(type: string, handler: Handler): void {
    this.handlers[type] = handler
  }

  unregister(type: string): void {
    delete this.handlers[type]
  }

  enqueue(id: string, type: string, params: any): void {
    if (!this.handlers[type]) throw new Error(`No handler for ${type}`)
    this.queue.push({ id, type, params, enqueuedAt: Date.now() })
  }

  getPendingTasks(): Task[] {
    return [...this.queue]
  }

  async runAll(): Promise<TaskResult[]> {
    const results: TaskResult[] = []
    while (this.queue.length) {
      const task = this.queue.shift()!
      const startedAt = Date.now()
      try {
        const data = await this.handlers[task.type](task.params)
        const finishedAt = Date.now()
        results.push({
          id: task.id,
          result: data,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        })
      } catch (err: any) {
        const finishedAt = Date.now()
        results.push({
          id: task.id,
          error: err.message,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        })
      }
    }
    return results
  }
}
