'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Learn Overlay
// Centered full-screen overlay for educational content.
// Generates on-the-fly explanations, background, alternatives.
// Interactive — user can ask follow-ups within the overlay.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { E, T, C, ACCENT, glass } from '@/lib/theme';


interface LearnMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const LEARN_MODES = [
  { id: 'explain', label: 'Explain this', icon: '?', prompt: 'Explain the following in clear, simple terms. Break down any jargon. Assume the reader is intelligent but unfamiliar with the specifics.' },
  { id: 'why', label: 'Why this decision?', icon: '→', prompt: 'Explain the reasoning behind this decision or response. What was considered? What alternatives existed? Why was this path chosen over others?' },
  { id: 'background', label: 'Teach me the background', icon: '◊', prompt: 'Provide the background knowledge needed to fully understand this content. Cover the foundational concepts, relevant history, and key terminology. Make it educational, not just informational.' },
  { id: 'alternatives', label: 'What are the alternatives?', icon: '⊕', prompt: 'What other approaches, answers, or directions could have been taken at this point? For each alternative, briefly explain the tradeoffs.' },
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const node = learnNodeId ? nodes.find(n => n.id === learnNodeId) : null;

  // Reset when node changes
  useEffect(() => {
    setMessages([]);
    setFollowUp('');
  }, [learnNodeId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateContent = useCallback(async (mode: typeof LEARN_MODES[number]) => {
    if (!node || streaming) return;

    // Build context from the conversation path
    const path = getAncestralPath(node.id);
    const conversationContext = path.map(n => `${n.role === 'user' ? 'User' : 'AI'}: ${n.text}`).join('\n\n');

    const systemPrompt = `You are an educational assistant inside Dreamcacher, a spatial conversation tool. The user is exploring a conversation graph and wants to understand a specific node better.

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
        style={{
          ...glass,
          borderRadius: 16,
          width: '90%',
          maxWidth: 640,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const, color: ACCENT }}>
              Learn Mode
            </div>
            <div style={{ fontSize: 11, color: T.subtle, marginTop: 2 }}>
              {node.text.slice(0, 60)}{node.text.length > 60 ? '...' : ''}
            </div>
          </div>
          <button
            onClick={closeLearning}
            style={{ border: 'none', background: 'none', color: T.ghost, cursor: 'pointer', padding: 4, minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M9 3L3 9M3 3l6 6" />
            </svg>
          </button>
        </div>

        {/* Mode buttons — show before any content generated */}
        {messages.length === 0 && (
          <div style={{ padding: '16px 18px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {LEARN_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => generateContent(mode)}
                disabled={streaming}
                style={{
                  ...glass,
                  borderRadius: 8,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: T.secondary,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flex: '1 1 calc(50% - 4px)',
                  minWidth: 180,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `rgba(221,0,0,0.3)`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <span style={{ color: ACCENT, fontSize: 14, fontWeight: 700 }}>{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
        )}

        {/* Content area */}
        {messages.length > 0 && (
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                {m.role === 'user' ? (
                  <div style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                    textTransform: 'uppercase' as const,
                    color: ACCENT, marginBottom: 4,
                  }}>
                    {m.content}
                  </div>
                ) : (
                  <div style={{
                    fontSize: 13, lineHeight: 1.7, color: T.secondary,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {m.content || (streaming ? '...' : '')}
                  </div>
                )}
              </div>
            ))}

            {/* Follow-up mode buttons after first response */}
            {!streaming && messages.length > 0 && messages.length <= 2 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {LEARN_MODES.filter(m => !messages.some(msg => msg.content === m.label)).map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => generateContent(mode)}
                    style={{
                      padding: '5px 10px', borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.02)',
                      color: T.tertiary, fontSize: 11, fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = `rgba(221,0,0,0.2)`}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <span style={{ color: ACCENT, marginRight: 4 }}>{mode.icon}</span>
                    {mode.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Follow-up input */}
        {messages.length > 0 && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8,
          }}>
            <input
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, padding: '6px 10px', outline: 'none',
                fontSize: 11, color: T.secondary,
              }}
              placeholder="Ask a follow-up..."
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendFollowUp(); }}
              disabled={streaming}
            />
            <button
              onClick={sendFollowUp}
              disabled={streaming || !followUp.trim()}
              style={{
                padding: '6px 12px', borderRadius: 6,
                border: `1px solid rgba(221,0,0,0.2)`,
                background: `rgba(221,0,0,0.05)`,
                color: ACCENT, fontSize: 10,
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Ask
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
