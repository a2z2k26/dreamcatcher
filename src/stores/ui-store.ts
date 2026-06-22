// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — UI Store (Zustand)
// Selection, zoom, panel states, hover, drag, context menu.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

interface UIState {
  // Canvas transform
  scale: number;
  panX: number;
  panY: number;

  // Selection
  selectedNodeId: string | null;       // primary selection (inspector, branch target)
  selectedNodeIds: ReadonlySet<string>; // multi-selection (for clipping)
  hoveredNodeId: string | null;

  // Drag
  dragNodeId: string | null;

  // Panels
  inspectorOpen: boolean;

  // Context menu
  contextMenu: ContextMenuState | null;

  // Model
  selectedModelId: string;

  // Input focus
  inputFocused: boolean;

  // Learn mode
  learnNodeId: string | null;

  // Canvas animation target
  animTarget: { x: number; y: number; startTime: number; duration: number } | null;

  // Highlight / overlay modes
  highlightMode: null | {
    type: 'branches';
    branchPointId: string;
    branchPaths: Record<string, readonly string[]>;
  };
  pathTrace: { nodeIds: readonly string[]; currentIndex: number } | null;

  // Branch preview popover
  branchPreview: { nodeId: string; x: number; y: number } | null;

  // Timeline view
  timelineOpen: boolean;
  timelineScrubTime: number | null;

  // Search
  searchQuery: string;
  searchResults: readonly string[];
  searchIndex: number;
  searchOpen: boolean;

  // Actions
  setTransform: (scale: number, panX: number, panY: number) => void;
  setSelectedNode: (id: string | null) => void;
  toggleMultiSelect: (id: string) => void;
  clearMultiSelect: () => void;
  setHoveredNode: (id: string | null) => void;
  setDragNode: (id: string | null) => void;
  setInspectorOpen: (open: boolean) => void;
  openContextMenu: (nodeId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
  setSelectedModel: (id: string) => void;
  setInputFocused: (focused: boolean) => void;
  openLearning: (nodeId: string) => void;
  closeLearning: () => void;
  animateTo: (worldX: number, worldY: number, duration?: number) => void;
  setHighlightMode: (mode: UIState['highlightMode']) => void;
  startPathTrace: (nodeIds: readonly string[]) => void;
  stepPathTrace: (direction: 1 | -1) => void;
  exitPathTrace: () => void;
  setBranchPreview: (preview: UIState['branchPreview']) => void;
  toggleTimeline: () => void;
  setTimelineScrubTime: (time: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: readonly string[]) => void;
  setSearchIndex: (index: number) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  scale: 1,
  panX: 0,
  panY: 0,
  selectedNodeId: null,
  selectedNodeIds: new Set<string>(),
  hoveredNodeId: null,
  dragNodeId: null,
  inspectorOpen: false,
  contextMenu: null,
  selectedModelId: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'anthropic/claude-sonnet-4',
  inputFocused: false,
  learnNodeId: null,
  animTarget: null,
  highlightMode: null,
  pathTrace: null,
  branchPreview: null,
  timelineOpen: false,
  timelineScrubTime: null,
  searchQuery: '',
  searchResults: [],
  searchIndex: 0,
  searchOpen: false,

  setTransform: (scale, panX, panY) => set({ scale, panX, panY }),
  setSelectedNode: (id) => set({
    selectedNodeId: id,
    selectedNodeIds: new Set<string>(), // clear multi-select on single click
    inspectorOpen: id !== null,
  }),
  toggleMultiSelect: (id) => {
    const { selectedNodeIds } = get();
    const next = new Set(selectedNodeIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ selectedNodeIds: next, selectedNodeId: id });
  },
  clearMultiSelect: () => set({ selectedNodeIds: new Set<string>() }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setDragNode: (id) => set({ dragNodeId: id }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  openContextMenu: (nodeId, x, y) => set({ contextMenu: { nodeId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
  setSelectedModel: (id) => set({ selectedModelId: id }),
  setInputFocused: (focused) => set({ inputFocused: focused }),
  openLearning: (nodeId) => set({ learnNodeId: nodeId }),
  closeLearning: () => set({ learnNodeId: null }),
  animateTo: (worldX, worldY, duration = 400) => {
    set({ animTarget: { x: worldX, y: worldY, startTime: performance.now(), duration } });
  },
  setHighlightMode: (mode) => set({ highlightMode: mode }),
  startPathTrace: (nodeIds) => set({ pathTrace: { nodeIds, currentIndex: nodeIds.length - 1 } }),
  stepPathTrace: (direction) => {
    const { pathTrace } = get();
    if (!pathTrace) return;
    const next = pathTrace.currentIndex + direction;
    if (next < 0 || next >= pathTrace.nodeIds.length) return;
    set({ pathTrace: { ...pathTrace, currentIndex: next } });
  },
  exitPathTrace: () => set({ pathTrace: null }),
  setBranchPreview: (preview) => set({ branchPreview: preview }),
  toggleTimeline: () => set(s => ({ timelineOpen: !s.timelineOpen, timelineScrubTime: s.timelineOpen ? null : s.timelineScrubTime })),
  setTimelineScrubTime: (time) => set({ timelineScrubTime: time }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchIndex: (index) => set({ searchIndex: index }),
  setSearchOpen: (open) => set(open ? { searchOpen: true } : { searchOpen: false, searchQuery: '', searchResults: [], searchIndex: 0 }),
}));
