// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Memory Store (Zustand)
// Manages saved memories with IndexedDB persistence.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { Memory } from '@/types/memory';

// Keep the original database key for backward compatibility with existing local memories.
const DB_NAME = 'dreamcacher-memories';
const STORE_NAME = 'memories';

interface MemoryState {
  memories: readonly Memory[];
  shelfOpen: boolean;

  // Actions
  addMemory: (memory: Memory) => void;
  removeMemory: (id: string) => void;
  updateMemory: (id: string, updates: Partial<Pick<Memory, 'name' | 'tags'>>) => void;
  setShelfOpen: (open: boolean) => void;
  loadFromDB: () => Promise<void>;
}

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveMemoryToDB(memory: Memory): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(memory);
}

async function deleteMemoryFromDB(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
}

async function loadAllMemories(): Promise<Memory[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [],
  shelfOpen: false,

  addMemory: (memory) => {
    set(state => ({ memories: [...state.memories, memory] }));
    saveMemoryToDB(memory).catch(console.error);
  },

  removeMemory: (id) => {
    set(state => ({ memories: state.memories.filter(m => m.id !== id) }));
    deleteMemoryFromDB(id).catch(console.error);
  },

  updateMemory: (id, updates) => {
    set(state => ({
      memories: state.memories.map(m =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
    // Re-save updated memory
    const updated = useMemoryStore.getState().memories.find(m => m.id === id);
    if (updated) saveMemoryToDB(updated).catch(console.error);
  },

  setShelfOpen: (open) => set({ shelfOpen: open }),

  loadFromDB: async () => {
    try {
      const memories = await loadAllMemories();
      set({ memories });
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
  },
}));
