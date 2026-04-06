import type { BaseAction, ActionResponse } from "./action_contracts"
import { z } from "zod"

interface AgentContext {
  apiEndpoint: string
  apiKey: string
}

/**
 * Central Agent: routes calls to registered actions
 * - Registers actions with schema
 * - Validates payloads with Zod before execution
 * - Provides list/lookup helpers
 */
export class Agent {
  private actions = new Map<string, BaseAction<any, any, AgentContext>>()

  register<S, R>(action: BaseAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" already registered`)
    }
    this.actions.set(action.id, action)
  }

  /**
   * Safely invoke an action by id
   */
  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext
  ): Promise<ActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) {
      return { notice: `Unknown action "${actionId}"`, ok: false, error: "not_found" }
    }

    try {
      const parsed = action.input.parse(payload)
      return await action.execute({ payload: parsed, context: ctx })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Validation or execution failed"
      return { notice: "Execution failed", error: msg, ok: false }
    }
  }

  /**
   * Returns all registered action IDs
   */
  listActionIds(): string[] {
    return Array.from(this.actions.keys())
  }

  /**
   * Returns summary info for registered actions
   */
  describeActions(): { id: string; summary: string }[] {
    return Array.from(this.actions.values()).map(a => ({
      id: a.id,
      summary: a.summary,
    }))
  }
}
