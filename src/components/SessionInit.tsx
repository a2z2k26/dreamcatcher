'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Session Initializer
// Loads sessions on mount, auto-saves on graph changes,
// auto-transitions session phase based on graph activity.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useGraphStore } from '@/stores/graph-store';

export function SessionInit() {
  const initialize = useSessionStore(s => s.initialize);
  const saveCurrentSession = useSessionStore(s => s.saveCurrentSession);
  const loaded = useSessionStore(s => s.loaded);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize sessions on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-save + phase transitions: triggers on node/edge changes
  useEffect(() => {
    if (!loaded) return;
    const unsub = useGraphStore.subscribe((state, prevState) => {
      if (state.nodes !== prevState.nodes || state.edges !== prevState.edges) {
        const { transitionPhase, getActivePhase } = useSessionStore.getState();
        const phase = getActivePhase();

        // Detect new AI node with empty text → streaming started
        const newNodes = state.nodes.filter(
          n => !prevState.nodes.some(p => p.id === n.id)
        );
        const hasNewStreamingAI = newNodes.some(n => n.role === 'ai' && !n.text);
        if (hasNewStreamingAI) {
          transitionPhase('streaming');
        }

        // Detect AI node text completed (was empty, now has content + label changed from '...')
        const completedAI = state.nodes.some(n =>
          n.role === 'ai' && n.text && n.label !== '...' &&
          prevState.nodes.some(p => p.id === n.id && p.label === '...')
        );
        if (completedAI && getActivePhase() === 'streaming') {
          transitionPhase('waiting');
        }

        // Any new user node → transition from empty/waiting to streaming (message sent)
        const hasNewUser = newNodes.some(n => n.role === 'user');
        if (hasNewUser && (phase === 'empty' || phase === 'waiting' || phase === 'stale')) {
          transitionPhase('streaming');
        }

        // Debounce saves
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          const { bodies } = useGraphStore.getState();
          const positions: Record<string, { x: number; y: number }> = {};
          for (const [id, body] of Object.entries(bodies)) {
            positions[id] = { x: body.x, y: body.y };
          }
          useGraphStore.setState({ positions });
          saveCurrentSession();
        }, 2000);
      }
    });

    // Stale detection: check every 60s if session should become stale
    staleTimerRef.current = setInterval(() => {
      const { getActivePhase, transitionPhase, activeSessionId, sessions } = useSessionStore.getState();
      const phase = getActivePhase();
      if (phase !== 'waiting' && phase !== 'idle') return;
      const session = sessions.find(s => s.id === activeSessionId);
      if (!session) return;
      if (Date.now() - session.updatedAt > 5 * 60 * 1000) {
        transitionPhase('stale');
      }
    }, 60000);

    return () => {
      unsub();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (staleTimerRef.current) clearInterval(staleTimerRef.current);
    };
  }, [loaded, saveCurrentSession]);

  // Save on page unload
  useEffect(() => {
    const handleUnload = () => {
      const { bodies } = useGraphStore.getState();
      const positions: Record<string, { x: number; y: number }> = {};
      for (const [id, body] of Object.entries(bodies)) {
        positions[id] = { x: body.x, y: body.y };
      }
      useGraphStore.setState({ positions });
      // Synchronous-ish save attempt
      saveCurrentSession();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [saveCurrentSession]);

  return null; // This component renders nothing — it's a side-effect runner
}
