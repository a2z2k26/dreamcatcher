// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Session Store
// Manages multiple sessions, each with its own graph.
// Full IndexedDB persistence — sessions survive page reload.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { useGraphStore } from './graph-store';
import type { GraphNode, GraphEdge, NodePosition, PhysicsBody } from '@/types/graph';
import type { Memory } from '@/types/memory';
import { canTransition, type SessionPhase } from '@/types/session';

// ── Session document (what gets saved) ──
export interface Session {
  readonly id: string;
  readonly name: string;
  readonly phase: SessionPhase;
  readonly createdAt: number;
  readonly updatedAt: number;
}

interface SessionSnapshot {
  session: Session;
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  positions: Record<string, NodePosition>;
  activeNodeId: string | null;
}

// ── IndexedDB ──
const DB_NAME = 'dreamcacher-sessions';
const DB_VERSION = 1;
const SESSION_STORE = 'sessions';
const SNAPSHOT_STORE = 'snapshots';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'session.id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSessionToDB(snapshot: SessionSnapshot): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([SESSION_STORE, SNAPSHOT_STORE], 'readwrite');
  tx.objectStore(SESSION_STORE).put(snapshot.session);
  tx.objectStore(SNAPSHOT_STORE).put(snapshot);
}

async function loadSessionFromDB(id: string): Promise<SessionSnapshot | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
    const req = tx.objectStore(SNAPSHOT_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function loadAllSessions(): Promise<Session[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readonly');
    const req = tx.objectStore(SESSION_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteSessionFromDB(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([SESSION_STORE, SNAPSHOT_STORE], 'readwrite');
  tx.objectStore(SESSION_STORE).delete(id);
  tx.objectStore(SNAPSHOT_STORE).delete(id);
}

// ── Store ──
interface SessionState {
  sessions: readonly Session[];
  activeSessionId: string | null;
  loaded: boolean;

  // Actions
  initialize: () => Promise<void>;
  createSession: (name?: string) => string;
  switchSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => void;
  deleteSession: (id: string) => Promise<void>;
  saveCurrentSession: () => Promise<void>;
  transitionPhase: (to: SessionPhase) => void;
  getActivePhase: () => SessionPhase;
  spawnFromClip: (memory: Memory) => string;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  loaded: false,

  initialize: async () => {
    try {
      const sessions = await loadAllSessions();
      // Sort by most recent
      const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
      set({ sessions: sorted, loaded: true });

      if (sorted.length > 0) {
        // Load the most recent session
        await get().switchSession(sorted[0].id);
      } else {
        // Create a first session
        const id = get().createSession('Untitled Session');
        set({ activeSessionId: id });
      }
    } catch (err) {
      console.error('Failed to initialize sessions:', err);
      // Create a default session anyway
      const id = get().createSession('Untitled Session');
      set({ activeSessionId: id, loaded: true });
    }
  },

  createSession: (name) => {
    const id = `session-${Date.now()}`;
    const session: Session = {
      id,
      name: name || `Session ${get().sessions.length + 1}`,
      phase: 'empty',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set(state => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
    }));

    // Clear the graph store for the new session
    const graphStore = useGraphStore.getState();
    graphStore.clearGraph();
    graphStore.setActiveNode(null);

    // Save empty session
    saveSessionToDB({
      session,
      nodes: [],
      edges: [],
      positions: {},
      activeNodeId: null,
    }).catch(console.error);

    return id;
  },

  switchSession: async (id) => {
    // Save current session first
    await get().saveCurrentSession();

    // Load target session
    const snapshot = await loadSessionFromDB(id);
    if (!snapshot) return;

    // Restore graph state
    const graphStore = useGraphStore.getState();
    graphStore.loadGraph(snapshot.nodes, snapshot.edges, snapshot.positions, snapshot.activeNodeId);

    set({ activeSessionId: id });
  },

  renameSession: (id, name) => {
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === id ? { ...s, name, updatedAt: Date.now() } : s
      ),
    }));
    // Save to DB
    get().saveCurrentSession().catch(console.error);
  },

  deleteSession: async (id) => {
    await deleteSessionFromDB(id);
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== id),
    }));
    // If we deleted the active session, switch to another or create new
    if (get().activeSessionId === id) {
      const remaining = get().sessions;
      if (remaining.length > 0) {
        await get().switchSession(remaining[0].id);
      } else {
        const newId = get().createSession('Untitled Session');
        set({ activeSessionId: newId });
      }
    }
  },

  saveCurrentSession: async () => {
    const { activeSessionId, sessions } = get();
    if (!activeSessionId) return;
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return;

    const { nodes, edges, positions, activeNodeId } = useGraphStore.getState();
    const updatedSession = { ...session, updatedAt: Date.now() };

    // Update session in state
    set(state => ({
      sessions: state.sessions.map(s => s.id === activeSessionId ? updatedSession : s),
    }));

    await saveSessionToDB({
      session: updatedSession,
      nodes,
      edges,
      positions,
      activeNodeId,
    });
  },

  transitionPhase: (to) => {
    const { activeSessionId, sessions } = get();
    if (!activeSessionId) return;
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return;
    // Validate transition; migrate legacy sessions missing phase
    const currentPhase = session.phase || 'empty';
    if (!canTransition(currentPhase, to)) return;
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === activeSessionId ? { ...s, phase: to, updatedAt: Date.now() } : s
      ),
    }));
  },

  getActivePhase: () => {
    const { activeSessionId, sessions } = get();
    if (!activeSessionId) return 'empty';
    const session = sessions.find(s => s.id === activeSessionId);
    return session?.phase || 'empty';
  },

  spawnFromClip: (memory) => {
    if (!memory.graphSnapshot) return get().createSession(`From: ${memory.name}`);

    const id = `session-${Date.now()}`;
    const session: Session = {
      id,
      name: `From: ${memory.name}`,
      phase: 'idle',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set(state => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
    }));

    // Mark all clipped nodes as inherited
    const inheritedNodes: GraphNode[] = memory.graphSnapshot.nodes.map(n => ({
      ...n,
      isInherited: true,
    }));

    // Build positions: layout inherited nodes vertically
    const positions: Record<string, NodePosition> = {};
    inheritedNodes.forEach((n, i) => {
      positions[n.id] = { x: 400, y: 100 + i * 90 };
    });

    // Find the leaf node to set as active
    const parentIds = new Set(memory.graphSnapshot.edges.map(e => e.from));
    const leafNode = inheritedNodes.find(n => !parentIds.has(n.id));
    const activeNodeId = leafNode?.id || inheritedNodes[inheritedNodes.length - 1]?.id || null;

    // Load into graph store
    const graphStore = useGraphStore.getState();
    graphStore.loadGraph(inheritedNodes, memory.graphSnapshot.edges, positions, activeNodeId);

    // Save to DB
    saveSessionToDB({
      session,
      nodes: inheritedNodes,
      edges: memory.graphSnapshot.edges,
      positions,
      activeNodeId,
    }).catch(console.error);

    return id;
  },
}));
