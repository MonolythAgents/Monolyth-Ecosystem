import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

/**
 * Handle a Typeform webhook payload to schedule a new task.
 */
export async function handleTypeformSubmission(
  raw: unknown
): Promise<{ success: boolean; message: string; taskId?: string; data?: TaskFormInput }> {
  const parsed = TaskFormSchema.safeParse(raw)

  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => i.message).join("; ")
    return { success: false, message: `Validation error: ${issues}` }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data

  // simple task ID generator
  const taskId = `${taskType}-${Date.now()}`

  // placeholder for scheduling logic
  // e.g. push to queue, save in DB, or register cron
  console.log("Scheduling new task:", {
    taskId,
    taskName,
    taskType,
    parameters,
    scheduleCron,
  })

  return {
    success: true,
    message: `Task "${taskName}" scheduled successfully`,
    taskId,
    data: parsed.data,
  }
}
