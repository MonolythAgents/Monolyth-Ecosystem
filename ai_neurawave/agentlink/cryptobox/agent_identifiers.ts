/**
 * Stable identifier for the Solana Knowledge Agent
 */
export const SOLANA_KNOWLEDGE_AGENT_ID = "solana-knowledge-agent" as const

/**
 * Optional metadata about this agent
 */
export const SOLANA_KNOWLEDGE_AGENT_META = {
  id: SOLANA_KNOWLEDGE_AGENT_ID,
  displayName: "Solana Knowledge Agent",
  description:
    "Provides authoritative answers on Solana protocols, tokens, tooling, validators, and ecosystem updates",
  version: "1.0.0",
  category: "knowledge",
  language: "en",
} as const

/**
 * Utility function to verify if an id is the Solana Knowledge Agent
 */
export function isSolanaKnowledgeAgent(id: string): boolean {
  return id === SOLANA_KNOWLEDGE_AGENT_ID
}
