import { describe, it, expect } from 'vitest';
import { canTransition } from './session';

describe('canTransition', () => {
  it('allows valid transitions from empty', () => {
    expect(canTransition('empty', 'idle')).toBe(true);
    expect(canTransition('empty', 'streaming')).toBe(true);
  });

  it('rejects invalid transitions from empty', () => {
    expect(canTransition('empty', 'waiting')).toBe(false);
    expect(canTransition('empty', 'stale')).toBe(false);
  });

  it('allows streaming → waiting and streaming → idle (error recovery)', () => {
    expect(canTransition('streaming', 'waiting')).toBe(true);
    expect(canTransition('streaming', 'idle')).toBe(true);
  });

  it('rejects streaming → empty (no way back to empty)', () => {
    expect(canTransition('streaming', 'empty')).toBe(false);
  });

  it('allows stale to recover to streaming or idle', () => {
    expect(canTransition('stale', 'streaming')).toBe(true);
    expect(canTransition('stale', 'idle')).toBe(true);
  });

  it('rejects self-transitions (no transition to the same phase)', () => {
    // The transition table deliberately omits self-loops; `transitionPhase`
    // treats same-phase as a no-op via the validity check.
    expect(canTransition('idle', 'idle')).toBe(false);
    expect(canTransition('streaming', 'streaming')).toBe(false);
  });
});
