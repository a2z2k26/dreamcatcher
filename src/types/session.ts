// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Session Phase State Machine
// Explicit lifecycle phases with validated transitions.
// Source pattern: Clui CC's tab state machine.
// ═══════════════════════════════════════════════════════════════

export type SessionPhase =
  | 'empty'      // new session, no nodes yet
  | 'idle'       // has content, no active streaming
  | 'streaming'  // AI response in progress
  | 'waiting'    // AI finished, awaiting next user input
  | 'stale';     // no activity for > 5 minutes

const VALID_TRANSITIONS: Record<SessionPhase, readonly SessionPhase[]> = {
  empty:     ['idle', 'streaming'],
  idle:      ['streaming', 'stale'],
  streaming: ['waiting', 'idle'],  // idle on error
  waiting:   ['streaming', 'idle', 'stale'],
  stale:     ['streaming', 'idle'],
} as const;

export function canTransition(from: SessionPhase, to: SessionPhase): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
