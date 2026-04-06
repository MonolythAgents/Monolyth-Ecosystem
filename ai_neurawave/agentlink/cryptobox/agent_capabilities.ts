export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canTrackValidators: boolean
  canExplainConsensus: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  enforceJsonOutput: boolean
}

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canTrackValidators: true,
  canExplainConsensus: true,
}

export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  enforceJsonOutput: true,
}

/**
 * Utility function: check if the agent has a specific capability
 */
export function hasCapability(
  caps: AgentCapabilities,
  key: keyof AgentCapabilities
): boolean {
  return Boolean(caps[key])
}

/**
 * Utility function: validate agent flags at runtime
 */
export function validateFlags(flags: AgentFlags): string[] {
  const issues: string[] = []
  if (flags.requiresExactInvocation && !flags.noAdditionalCommentary) {
    issues.push("Exact invocation requires no commentary mode enabled")
  }
  return issues
}
