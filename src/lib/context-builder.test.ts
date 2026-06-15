import { describe, it, expect } from 'vitest';
import { buildMessages, buildLabel } from './context-builder';
import type { GraphNode, GraphEdge } from '@/types/graph';

function userNode(id: string, text: string, parentId: string | null = null): GraphNode {
  return {
    id, role: 'user', type: 'message', text, label: text.slice(0, 20),
    parentId, timestamp: 0, metadata: {},
  };
}

function aiNode(id: string, text: string, parentId: string): GraphNode {
  return {
    id, role: 'ai', type: 'message', text, label: text.slice(0, 20),
    parentId, timestamp: 0, metadata: {},
  };
}

describe('buildMessages', () => {
  it('maps user/ai roles to user/assistant', () => {
    const path = [userNode('u1', 'hi'), aiNode('a1', 'hello', 'u1')];
    const { messages } = buildMessages(path);
    expect(messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]);
  });

  it('includes base system prompt', () => {
    const { system } = buildMessages([userNode('u1', 'hi')]);
    expect(system).toContain('Dreamcatcher');
    expect(system).toContain('spatial conversation');
  });

  it('adds inherited-nodes note when path includes imported nodes', () => {
    const path: GraphNode[] = [
      { ...userNode('u1', 'imported'), isInherited: true },
      { ...aiNode('a1', 'also imported', 'u1'), isInherited: true },
      userNode('u2', 'current', 'a1'),
    ];
    const { system } = buildMessages(path);
    expect(system).toContain('2 messages in this conversation were imported');
  });

  it('omits inherited note when no inherited nodes', () => {
    const { system } = buildMessages([userNode('u1', 'hi')]);
    expect(system).not.toContain('imported');
  });

  it('passes all messages through when under token budget', () => {
    const path = Array.from({ length: 10 }, (_, i) =>
      i % 2 === 0
        ? userNode(`u${i}`, `short message ${i}`)
        : aiNode(`a${i}`, `short reply ${i}`, `u${i - 1}`),
    );
    const { messages } = buildMessages(path);
    expect(messages).toHaveLength(10);
  });

  it('truncates middle messages when over budget, keeping head + tail', () => {
    // Each ~big-message is ~200k chars → ~50k tokens. Budget ~795k tokens.
    // 20 messages × 50k = 1M tokens → must truncate.
    const big = 'x'.repeat(200_000);
    const path = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0
        ? userNode(`u${i}`, big)
        : aiNode(`a${i}`, big, `u${i - 1}`),
    );
    const { messages } = buildMessages(path);

    // Should have first 2 + omission marker + some tail
    expect(messages.length).toBeLessThan(20);
    expect(messages[0].content).toBe(big); // head preserved
    expect(messages[1].content).toBe(big);
    // Omission marker should appear somewhere after head
    const omissionMarker = messages.find(m => m.content.includes('omitted for context budget'));
    expect(omissionMarker).toBeDefined();
  });

  it('builds sibling-branch summary when options provided', () => {
    // Branch point: u1 has two children a1 (on path) and a2 (sibling)
    const u1 = userNode('u1', 'ask about options');
    const a1 = aiNode('a1', 'option A explanation', 'u1');
    const a2 = aiNode('a2', 'option B explanation', 'u1');
    const allNodes = [u1, a1, a2];
    const allEdges: GraphEdge[] = [
      { id: 'e1', from: 'u1', to: 'a1', type: 'reply', weight: 1 },
      { id: 'e2', from: 'u1', to: 'a2', type: 'regeneration', weight: 1 },
    ];

    const { system } = buildMessages([u1, a1], { allNodes, allEdges });
    expect(system).toContain('explored alternative paths');
    expect(system).toContain('alternative response');
    expect(system).toContain('option B');
  });

  it('omits sibling summary when no branches on the path', () => {
    const u1 = userNode('u1', 'hi');
    const a1 = aiNode('a1', 'hello', 'u1');
    const { system } = buildMessages([u1, a1], { allNodes: [u1, a1], allEdges: [] });
    expect(system).not.toContain('explored alternative paths');
  });
});

describe('buildLabel', () => {
  it('returns first sentence when under 30 chars', () => {
    expect(buildLabel('Short message.')).toBe('Short message');
  });

  it('truncates to 27 chars + ellipsis when long', () => {
    const long = 'a'.repeat(50);
    const label = buildLabel(long);
    expect(label).toHaveLength(30); // 27 + '...'
    expect(label.endsWith('...')).toBe(true);
  });

  it('splits on question marks and exclamation marks', () => {
    expect(buildLabel('Is this right? Yes it is.')).toBe('Is this right');
    expect(buildLabel('Wait! That changes things.')).toBe('Wait');
  });
});
