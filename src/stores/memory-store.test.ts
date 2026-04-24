import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMemoryStore } from './memory-store';
import type { Memory } from '@/types/memory';

// Memory-store actions update React state synchronously and fire IndexedDB
// writes in the background (errors swallowed). In Node we silence the IDB
// console.error spam; the in-memory portion is what we're testing.
vi.spyOn(console, 'error').mockImplementation(() => {});

function mem(id: string, name = id): Memory {
  return {
    id,
    name,
    content: '',
    context: '',
    tags: [],
    sourceNodeId: 'src',
    sourcePathNodeIds: [],
    createdAt: 0,
    type: 'node',
  };
}

beforeEach(() => {
  // Reset to initial state so each test starts clean
  useMemoryStore.setState({ memories: [], shelfOpen: false });
});

describe('memory-store', () => {
  it('addMemory appends to the memories array', () => {
    useMemoryStore.getState().addMemory(mem('m1'));
    useMemoryStore.getState().addMemory(mem('m2'));
    expect(useMemoryStore.getState().memories.map(m => m.id)).toEqual(['m1', 'm2']);
  });

  it('removeMemory drops the matching id', () => {
    const s = useMemoryStore.getState();
    s.addMemory(mem('m1'));
    s.addMemory(mem('m2'));
    s.addMemory(mem('m3'));
    s.removeMemory('m2');
    expect(useMemoryStore.getState().memories.map(m => m.id)).toEqual(['m1', 'm3']);
  });

  it('removeMemory is a no-op for unknown id', () => {
    useMemoryStore.getState().addMemory(mem('m1'));
    useMemoryStore.getState().removeMemory('nope');
    expect(useMemoryStore.getState().memories).toHaveLength(1);
  });

  it('updateMemory merges name and tags', () => {
    const s = useMemoryStore.getState();
    s.addMemory({ ...mem('m1', 'old'), tags: ['a'] });
    s.updateMemory('m1', { name: 'new', tags: ['a', 'b'] });
    const updated = useMemoryStore.getState().memories[0];
    expect(updated.name).toBe('new');
    expect(updated.tags).toEqual(['a', 'b']);
    // unchanged fields preserved
    expect(updated.id).toBe('m1');
    expect(updated.sourceNodeId).toBe('src');
  });

  it('updateMemory leaves other memories untouched', () => {
    const s = useMemoryStore.getState();
    s.addMemory(mem('m1'));
    s.addMemory(mem('m2'));
    s.updateMemory('m2', { name: 'renamed' });
    const after = useMemoryStore.getState().memories;
    expect(after.find(m => m.id === 'm1')?.name).toBe('m1');
    expect(after.find(m => m.id === 'm2')?.name).toBe('renamed');
  });

  it('setShelfOpen toggles the panel state', () => {
    expect(useMemoryStore.getState().shelfOpen).toBe(false);
    useMemoryStore.getState().setShelfOpen(true);
    expect(useMemoryStore.getState().shelfOpen).toBe(true);
    useMemoryStore.getState().setShelfOpen(false);
    expect(useMemoryStore.getState().shelfOpen).toBe(false);
  });

  it('addMemory creates a new array (immutability)', () => {
    useMemoryStore.getState().addMemory(mem('m1'));
    const before = useMemoryStore.getState().memories;
    useMemoryStore.getState().addMemory(mem('m2'));
    const after = useMemoryStore.getState().memories;
    expect(after).not.toBe(before);
  });
});
