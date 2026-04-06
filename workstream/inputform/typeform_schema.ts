import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 * 
 * Fields:
 * - taskName: Human-readable name for the task (3–100 chars).
 * - taskType: One of predefined categories for execution.
 * - parameters: Arbitrary key/value strings, must contain at least one entry.
 * - scheduleCron: Valid CRON expression (minute hour day month weekday).
 * - description (optional): Freeform explanation of the task.
 */
export const TaskFormSchema = z.object({
  taskName: z.string()
    .min(3, "Task name must be at least 3 characters")
    .max(100, "Task name must not exceed 100 characters"),
  taskType: z.enum(["anomalyScan", "tokenAnalytics", "whaleMonitor"]),
  parameters: z.record(z.string(), z.string())
    .refine(obj => Object.keys(obj).length > 0, { message: "Parameters must include at least one key" }),
  scheduleCron: z.string().regex(
    /^(\*|[0-5]?\d) (\*|[01]?\d|2[0-3]) (\*|[1-9]|[12]\d|3[01]) (\*|[1-9]|1[0-2]) (\*|[0-6])$/,
    "Invalid cron expression: must follow 'min hour day month weekday'"
  ),
  description: z.string().max(250).optional(),
})

export type TaskFormInput = z.infer<typeof TaskFormSchema>
