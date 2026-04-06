import { z } from "zod"

/**
 * Base types for any action
 * - Uses Zod for input validation
 * - Lightweight helpers for success/failure responses
 * - Strict generics for better inference in execute(...)
 */

export type ActionSchema = z.ZodObject<z.ZodRawShape>

export interface ActionResponse<T> {
  /** Human-readable note for logs or UI */
  notice: string
  /** Optional typed payload on success */
  data?: T
  /** Optional status flags for consumers that prefer booleans */
  ok?: boolean
  /** Optional machine-readable error message */
  error?: string
}

export type ActionExecuteArgs<S extends ActionSchema, Ctx> = {
  payload: z.infer<S>
  context: Ctx
}

/**
 * Contract for an action
 */
export interface BaseAction<S extends ActionSchema, R, Ctx = unknown> {
  /** Unique stable identifier */
  id: string
  /** Short summary for menus or audit trails */
  summary: string
  /** Zod schema that validates input payload */
  input: S
  /** Execute with strongly typed payload and context */
  execute(args: ActionExecuteArgs<S, Ctx>): Promise<ActionResponse<R>>
}

/**
 * Helpers to build consistent responses
 */
export function success<T>(notice: string, data?: T): ActionResponse<T> {
  return { notice, data, ok: true }
}

export function failure<T = never>(notice: string, error?: string): ActionResponse<T> {
  return { notice, error: error ?? notice, ok: false }
}

/**
 * Type guard for ActionResponse
 */
export function isActionResponse<T = unknown>(val: unknown): val is ActionResponse<T> {
  if (typeof val !== "object" || val === null) return false
  const r = val as Record<string, unknown>
  return typeof r.notice === "string"
}

/**
 * Factory to define actions with full type inference
 */
export function defineAction<S extends ActionSchema, R, Ctx = unknown>(
  config: Omit<BaseAction<S, R, Ctx>, "execute"> & {
    execute: (args: ActionExecuteArgs<S, Ctx>) => Promise<ActionResponse<R>>
  }
): BaseAction<S, R, Ctx> {
  return {
    ...config,
    execute: async (args) => {
      // ensure payload matches schema before execution
      const parsed = config.input.parse(args.payload)
      return config.execute({ payload: parsed, context: args.context })
    },
  }
}
