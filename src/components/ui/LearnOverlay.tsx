'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Learn Overlay
// Centered full-screen overlay for educational content.
// Generates on-the-fly explanations, background, alternatives.
// Interactive — user can ask follow-ups within the overlay.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { ACCENT, E, T, C, FF, overlayGlass } from '@/lib/theme';


interface LearnMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const LEARN_MODES = [
  { id: 'explain', label: 'Explain simply', sub: 'The core idea, no jargon', prompt: 'Explain the following in clear, simple terms. Break down any jargon. Assume the reader is intelligent but unfamiliar with the specifics.' },
  { id: 'why', label: 'Go deeper', sub: 'The mechanism, step by step', prompt: 'Explain the reasoning behind this decision or response. What was considered? What alternatives existed? Why was this path chosen over others?' },
  { id: 'background', label: 'Find the flaw', sub: 'Where it could still fail', prompt: 'Identify the most important flaws, hidden assumptions, and failure modes in this response. Explain what could still go wrong and how to recognize it.' },
  { id: 'alternatives', label: 'Related concepts', sub: 'Patterns that connect', prompt: 'Connect this response to adjacent concepts, patterns, and examples that would help the user understand the broader system.' },
] as const;

export function LearnOverlay() {
  const learnNodeId = useUIStore(s => s.learnNodeId);
  const closeLearning = useUIStore(s => s.closeLearning);
  const nodes = useGraphStore(s => s.nodes);
  const getAncestralPath = useGraphStore(s => s.getAncestralPath);
  const selectedModelId = useUIStore(s => s.selectedModelId);

  const [messages, setMessages] = useState<LearnMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
  const [prevLearnNodeId, setPrevLearnNodeId] = useState(learnNodeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const node = learnNodeId ? nodes.find(n => n.id === learnNodeId) : null;

  // Reset when node changes — derived during render
  if (prevLearnNodeId !== learnNodeId) {
    setPrevLearnNodeId(learnNodeId);
    setMessages([]);
    setFollowUp('');
    setSelectedModeId(null);
  }

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateContent = useCallback(async (mode: typeof LEARN_MODES[number]) => {
    if (!node || streaming) return;
    setSelectedModeId(mode.id);

    // Build context from the conversation path
    const path = getAncestralPath(node.id);
    const conversationContext = path.map(n => `${n.role === 'user' ? 'User' : 'AI'}: ${n.text}`).join('\n\n');

    const systemPrompt = `You are an educational assistant inside Dreamcatcher, a spatial conversation tool. The user is exploring a conversation graph and wants to understand a specific node better.

Here is the conversation that led to this point:
---
${conversationContext}
---

The user is asking about this specific response:
"${node.text}"

${mode.prompt}

Be concise but thorough. Use clear structure (headers, bullet points). Make it genuinely educational — teach, don't just summarize.`;

    setStreaming(true);
    const newMsg: LearnMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, { role: 'user', content: mode.label }, newMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: mode.label }],
          model: selectedModelId,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: '[Error generating educational content]' };
        return updated;
      });
      console.error(err);
    }

    setStreaming(false);
  }, [node, streaming, getAncestralPath, selectedModelId]);

  const sendFollowUp = useCallback(async () => {
    if (!followUp.trim() || streaming || !node) return;
    const text = followUp.trim();
    setFollowUp('');
    setStreaming(true);

    const path = getAncestralPath(node.id);
    const conversationContext = path.map(n => `${n.role === 'user' ? 'User' : 'AI'}: ${n.text}`).join('\n\n');

    const systemPrompt = `You are an educational assistant. The user is learning about a conversation node. Answer their follow-up question clearly and educationally.

Original conversation context:
---
${conversationContext}
---

Node being studied: "${node.text}"`;

    const apiMessages = [
      ...messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: text },
    ];

    const newAssistantMsg: LearnMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, { role: 'user', content: text }, newAssistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, messages: apiMessages, model: selectedModelId }),
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    }

    setStreaming(false);
  }, [followUp, streaming, node, messages, getAncestralPath, selectedModelId]);

  if (!learnNodeId || !node) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={closeLearning}
    >
      <div
        className="dc-learn-panel"
        style={{
          ...overlayGlass,
          borderRadius: 12,
          width: 'min(620px, calc(100vw - 32px))',
          maxHeight: 'min(680px, calc(100vh - 96px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '14px 16px',
          borderBottom: `0.5px solid ${E[4]}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)',
        }}>
          <span
            className="dc-learn-header-icon"
            aria-hidden="true"
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: ACCENT,
              background: 'rgba(221,0,0,0.07)',
              border: '0.5px solid rgba(221,0,0,0.28)',
              flex: '0 0 auto',
            }}
          >
            <svg viewBox="0 0 14 14" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 2.1v2.2" />
              <path d="M4.2 3.2 5.4 5" />
              <path d="M9.8 3.2 8.6 5" />
              <path d="M4.1 7.1a2.9 2.9 0 1 1 5.8 0c0 1.1-.6 1.8-1.2 2.4-.4.4-.7.8-.7 1.4H6c0-.6-.3-1-.7-1.4-.6-.6-1.2-1.3-1.2-2.4Z" />
              <path d="M5.8 12h2.4" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: `700 10px ${FF.mono}`, letterSpacing: 1.35, textTransform: 'uppercase' as const, color: ACCENT }}>
              Learn
            </div>
            <div style={{ fontSize: 11, color: T.subtle, marginTop: 4, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.text.slice(0, 60)}{node.text.length > 60 ? '...' : ''}
            </div>
          </div>
          <button
            onClick={closeLearning}
            style={{ marginLeft: 'auto', border: 'none', background: 'none', color: T.ghost, cursor: 'pointer', padding: 4, minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M9 3L3 9M3 3l6 6" />
            </svg>
          </button>
        </div>

        <div className="dc-learn-body" style={{ display: 'flex', minHeight: 0, flex: 1 }}>
          <div
            className="dc-learn-lens-list"
            style={{
              width: 210,
              flex: '0 0 210px',
              padding: '13px 12px',
              borderRight: `0.5px solid ${E[4]}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              overflowY: 'auto',
            }}
          >
            <div style={{
              font: `700 8px ${FF.mono}`,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: T.ghost,
              padding: '0 4px 8px',
            }}>
              Lenses
            </div>
            {LEARN_MODES.map((mode, index) => (
              <button
                className="dc-learn-mode-button"
                data-learn-mode={mode.id}
                data-active={selectedModeId === mode.id ? 'true' : 'false'}
                key={mode.id}
                onClick={() => generateContent(mode)}
                disabled={streaming}
                style={{
                  position: 'relative',
                  border: 'none',
                  background: selectedModeId === mode.id ? 'rgba(221,0,0,0.06)' : 'transparent',
                  borderRadius: 6,
                  padding: '9px 10px 9px 14px',
                  cursor: 'pointer',
                  color: T.secondary,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  columnGap: 8,
                  minHeight: 50,
                  textAlign: 'left',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { if (selectedModeId !== mode.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (selectedModeId !== mode.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <span
                  className="dc-learn-mode-rail"
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    borderRadius: 2,
                    background: selectedModeId === mode.id ? ACCENT : 'transparent',
                  }}
                />
                <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: selectedModeId === mode.id ? T.primary : T.secondary, fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mode.label}
                  </span>
                  <span style={{ color: selectedModeId === mode.id ? T.tertiary : T.dim, fontSize: 10, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mode.sub}
                  </span>
                </span>
                <span style={{
                  color: T.dim,
                  font: `700 9px ${FF.mono}`,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>

          <div
            ref={scrollRef}
            className="dc-learn-answer-stage"
            style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '16px 18px' }}
          >
            {messages.length === 0 ? (
              <div
                className="dc-learn-node-card"
                style={{
                  borderRadius: 8,
                  border: `0.5px solid ${E[5]}`,
                  background: 'rgba(255,255,255,0.022)',
                  padding: '12px 13px',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.024) inset',
                }}
              >
                <div style={{ font: `700 8px ${FF.mono}`, letterSpacing: 1, textTransform: 'uppercase', color: T.ghost, marginBottom: 8 }}>
                  Node
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: T.secondary }}>
                  {node.text}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 13 }}>
                  {m.role === 'user' ? (
                    <div style={{
                      font: `700 9px ${FF.mono}`,
                      letterSpacing: 1,
                      textTransform: 'uppercase' as const,
                      color: selectedModeId ? ACCENT : T.tertiary,
                      marginBottom: 7,
                    }}>
                      {m.content}
                    </div>
                  ) : (
                    <div
                      className="dc-learn-answer-copy"
                      style={{
                        fontSize: 13,
                        lineHeight: 1.72,
                        color: T.secondary,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.content || (streaming ? '...' : '')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Follow-up input */}
        <div
          className="dc-learn-followup-bar"
          style={{
            padding: '11px 14px',
            borderTop: `0.5px solid ${E[4]}`,
            display: 'flex', gap: 8,
            alignItems: 'center',
          }}
        >
            <input
              className="dc-learn-followup-input"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.035)', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 6, padding: '7px 10px', outline: 'none',
                fontSize: 11, color: T.secondary,
                minWidth: 0,
              }}
              placeholder="Ask a follow-up..."
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendFollowUp(); }}
              disabled={streaming}
            />
            <button
              className="dc-learn-ask-button"
              onClick={sendFollowUp}
              disabled={streaming || !followUp.trim()}
              style={{
                padding: '7px 12px', borderRadius: 6,
                border: '0.5px solid rgba(128,128,128,0.35)',
                background: 'rgba(255,255,255,0.051)',
                color: C.learn, fontSize: 10,
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Ask
            </button>
          </div>
      </div>
    </div>
  );
}
