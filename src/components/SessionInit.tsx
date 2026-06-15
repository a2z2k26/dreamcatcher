'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Session Initializer
// Loads sessions on mount, auto-saves on graph changes,
// auto-transitions session phase based on graph activity.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useSessionStore, type Session } from '@/stores/session-store';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useMemoryStore } from '@/stores/memory-store';
import type { SessionPhase } from '@/types/session';
import {
  GREENLAND_ACTIVE_NODE_ID,
  GREENLAND_EDGES,
  GREENLAND_MEMORIES,
  GREENLAND_NODES,
  GREENLAND_POSITIONS,
} from '@/lib/greenland-fixture';

const GREENLAND_SESSION_ID = 'greenland-session';
const GREENLAND_SESSION_TIME = 1_790_000_000_000;

function getGreenlandMode(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('greenland');
}

function getGreenlandPhase(mode: string, state: string | null): SessionPhase {
  if (mode === 'empty') return 'empty';
  if (state === 'streaming') return 'streaming';
  if (state === 'idle') return 'waiting';
  return 'streaming';
}

function markGreenlandReady(): void {
  (window as Window & { __GREENLAND_READY?: boolean }).__GREENLAND_READY = true;
}

function getGreenlandBranchPreview(): { nodeId: string; x: number; y: number } {
  return {
    nodeId: 'n4',
    x: window.innerWidth / 2,
    y: Math.min(window.innerHeight * 0.6, 520),
  };
}

function getGreenlandContextMenu(): { nodeId: string; x: number; y: number } {
  const x = window.innerWidth <= 640
    ? 24
    : Math.min(window.innerWidth - 232, Math.max(12, window.innerWidth / 2 + 90));
  const y = window.innerWidth <= 640
    ? 248
    : Math.min(window.innerHeight - 310, 360);
  return { nodeId: GREENLAND_ACTIVE_NODE_ID, x, y };
}

function getGreenlandPathTrace(): { nodeIds: readonly string[]; currentIndex: number } {
  const nodeIds = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'] as const;
  return { nodeIds, currentIndex: nodeIds.length - 2 };
}

function getGreenlandViewport(mode: string, state: string | null): { scale: number; panX: number; panY: number } {
  if (mode === 'empty') return { scale: 1, panX: 0, panY: 0 };

  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width <= 640) {
    const scale = 0.48;
    return {
      scale,
      panX: width / 2 - (-40) * scale,
      panY: height * 0.46 - 640 * scale,
    };
  }
  if (width <= 1280) {
    const scale = 0.56;
    return {
      scale,
      panX: width / 2 - (-44) * scale,
      panY: height * 0.47 - 563 * scale,
    };
  }

  const scale = 0.62;
  if (state === 'inspector') {
    const inspectorWidth = 312;
    return {
      scale,
      panX: (width - inspectorWidth) / 2 - (-168) * scale,
      panY: height * 0.48 - 1086 * scale,
    };
  }

  return {
    scale,
    panX: width / 2 - (-44) * scale,
    panY: height * 0.47 - 563 * scale,
  };
}

function applyGreenlandState(mode: string): void {
  const params = new URLSearchParams(window.location.search);
  const state = params.get('state');
  const phase = getGreenlandPhase(mode, state);
  const viewport = getGreenlandViewport(mode, state);
  const session: Session = {
    id: GREENLAND_SESSION_ID,
    name: mode === 'empty' ? 'Green-Land Empty' : 'WebSocket reconnect storm',
    phase,
    createdAt: GREENLAND_SESSION_TIME,
    updatedAt: GREENLAND_SESSION_TIME,
  };

  useSessionStore.setState({
    sessions: [session],
    activeSessionId: session.id,
    loaded: true,
  });
  useMemoryStore.setState({
    memories: mode === 'empty' ? [] : GREENLAND_MEMORIES,
    shelfOpen: state === 'memory',
  });

  if (mode === 'empty') {
    useGraphStore.getState().clearGraph();
  } else {
    useGraphStore.getState().loadGraph(
      GREENLAND_NODES,
      GREENLAND_EDGES,
      GREENLAND_POSITIONS,
      GREENLAND_ACTIVE_NODE_ID
    );
  }

  useUIStore.setState({
    scale: viewport.scale,
    panX: viewport.panX,
    panY: viewport.panY,
    selectedNodeId: state === 'inspector' || state === 'learn' ? GREENLAND_ACTIVE_NODE_ID : state === 'branch' ? 'n4' : state === 'path' ? 'n9' : null,
    selectedNodeIds: state === 'clip' ? new Set(['n8', 'n9', 'n10', 'clip']) : new Set<string>(),
    hoveredNodeId: null,
    dragNodeId: null,
    inspectorOpen: state === 'inspector',
    contextMenu: state === 'context' ? getGreenlandContextMenu() : null,
    inputFocused: false,
    learnNodeId: state === 'learn' ? GREENLAND_ACTIVE_NODE_ID : null,
    animTarget: null,
    highlightMode: null,
    pathTrace: state === 'path' ? getGreenlandPathTrace() : null,
    branchPreview: state === 'branch' ? getGreenlandBranchPreview() : null,
    timelineOpen: state === 'timeline',
    timelineScrubTime: null,
    searchQuery: '',
    searchResults: [],
    searchIndex: 0,
    searchOpen: false,
  });

  markGreenlandReady();
}

export function SessionInit() {
  const initialize = useSessionStore(s => s.initialize);
  const saveCurrentSession = useSessionStore(s => s.saveCurrentSession);
  const loaded = useSessionStore(s => s.loaded);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize sessions on mount
  useEffect(() => {
    const mode = getGreenlandMode();
    if (mode) {
      applyGreenlandState(mode);
      return;
    }
    initialize();
  }, [initialize]);

  // Auto-save + phase transitions: triggers on node/edge changes
  useEffect(() => {
    if (!loaded || getGreenlandMode()) return;
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
      if (getGreenlandMode()) return;
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
