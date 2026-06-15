// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Context Builder
// Walks the graph from root to the active node and assembles
// the messages[] array for the Claude API call.
// Enhanced with sibling branch context, clip markers, and
// token budget awareness.
// ═══════════════════════════════════════════════════════════════

import type { GraphNode, GraphEdge } from '@/types/graph';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Rough token estimate: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant in Dreamcatcher, a spatial conversation interface. The user is having a branching conversation with you on an infinite canvas. Each of your responses becomes a node in a visual graph. Be concise and substantive — your responses will be displayed as nodes, so clarity matters more than length.`;

const TOKEN_BUDGET = 800_000; // Leave headroom from 1M context window
const SYSTEM_BUDGET = 5_000;

interface BuildOptions {
  // Full graph context for sibling awareness
  allNodes?: readonly GraphNode[];
  allEdges?: readonly GraphEdge[];
}

export function buildMessages(
  path: readonly GraphNode[],
  options?: BuildOptions,
): {
  system: string;
  messages: Message[];
} {
  const systemParts: string[] = [BASE_SYSTEM_PROMPT];

  // Check if any nodes in the path are inherited (from a clip)
  const hasInherited = path.some(n => n.isInherited);
  if (hasInherited) {
    const inheritedCount = path.filter(n => n.isInherited).length;
    systemParts.push(
      `\nNote: The first ${inheritedCount} messages in this conversation were imported from a previous session via a clip. They provide context but were not part of the current session's direct conversation.`
    );
  }

  // Add sibling branch summaries if we're on a branch
  if (options?.allNodes && options?.allEdges) {
    const siblingContext = buildSiblingContext(path, options.allNodes, options.allEdges);
    if (siblingContext) {
      systemParts.push(`\n${siblingContext}`);
    }
  }

  const system = systemParts.join('');

  // Build messages with token awareness
  const messages: Message[] = [];
  const tokenCount = estimateTokens(system);
  const messageTokenBudget = TOKEN_BUDGET - SYSTEM_BUDGET;

  // Walk the path from the end (most recent = most important)
  // If we exceed budget, summarize older messages
  const fullMessages: Message[] = path.map(node => ({
    role: node.role === 'user' ? 'user' as const : 'assistant' as const,
    content: node.text,
  }));

  // Check if we need to truncate
  let totalTokens = 0;
  for (const m of fullMessages) {
    totalTokens += estimateTokens(m.content);
  }

  if (totalTokens <= messageTokenBudget) {
    // All messages fit — include them all
    return { system, messages: fullMessages };
  }

  // Over budget: keep first 2 messages (root context) and last N that fit
  const kept: Message[] = [];
  let remainingBudget = messageTokenBudget;

  // Always include first 2 messages for root context
  const head = fullMessages.slice(0, 2);
  for (const m of head) {
    kept.push(m);
    remainingBudget -= estimateTokens(m.content);
  }

  // Fill from the end (most recent first)
  const tail: Message[] = [];
  for (let i = fullMessages.length - 1; i >= 2; i--) {
    const tokens = estimateTokens(fullMessages[i].content);
    if (remainingBudget - tokens < 0) break;
    tail.unshift(fullMessages[i]);
    remainingBudget -= tokens;
  }

  // Insert a summary marker if we skipped messages
  if (tail.length < fullMessages.length - 2) {
    const skipped = fullMessages.length - 2 - tail.length;
    kept.push({
      role: 'assistant',
      content: `[${skipped} earlier messages omitted for context budget. The conversation continued from the initial context above.]`,
    });
  }

  kept.push(...tail);

  return { system, messages: kept };
}

// Build a brief summary of sibling branches for context
function buildSiblingContext(
  path: readonly GraphNode[],
  allNodes: readonly GraphNode[],
  allEdges: readonly GraphEdge[],
): string | null {
  // Find branch points along our path
  const pathIds = new Set(path.map(n => n.id));
  const branchPoints: GraphNode[] = [];

  for (const node of path) {
    const childEdges = allEdges.filter(e => e.from === node.id);
    if (childEdges.length > 1) {
      branchPoints.push(node);
    }
  }

  if (branchPoints.length === 0) return null;

  const summaries: string[] = [];
  for (const bp of branchPoints) {
    const childEdges = allEdges.filter(e => e.from === bp.id);
    const siblingEdges = childEdges.filter(e => !pathIds.has(e.to));

    for (const edge of siblingEdges) {
      const siblingNode = allNodes.find(n => n.id === edge.to);
      if (!siblingNode) continue;
      const preview = siblingNode.text.slice(0, 100);
      const edgeLabel = edge.type === 'regeneration' ? 'alternative response' : 'different direction';
      summaries.push(`After "${bp.text.slice(0, 40)}...", the user explored a ${edgeLabel}: "${preview}..."`);
    }
  }

  if (summaries.length === 0) return null;

  return `The user has explored alternative paths in this conversation:\n${summaries.slice(0, 3).map(s => `- ${s}`).join('\n')}\nThe current path diverged from those explorations.`;
}

export function buildLabel(text: string): string {
  // Take first sentence or first 30 chars, whichever is shorter
  const firstSentence = text.split(/[.!?]/)[0];
  if (firstSentence.length <= 30) return firstSentence;
  return text.slice(0, 27) + '...';
}
