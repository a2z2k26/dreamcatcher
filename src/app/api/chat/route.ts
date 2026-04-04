// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Chat API Route
// Uses OpenRouter for model access. Falls back to mock if no key.
// Set OPENROUTER_API_KEY in .env.local
// ═══════════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const MOCK_RESPONSES = [
  "That's an interesting direction. Let me think through the implications — there are three main considerations here that could shape the approach.",
  "I'd suggest starting with the simplest version that validates the core assumption. Build the skeleton first, then add complexity only where the data demands it.",
  "Good question. The short answer is yes, but with caveats. The longer answer involves understanding how the constraints interact with each other at scale.",
  "Here's what I'd recommend: separate the concerns first, then optimize. Premature optimization in this context would lock you into architecture decisions before you understand the problem space.",
  "That connects to something we discussed earlier in this thread. The pattern here is consistent — when you apply that constraint, the solution space narrows to two viable options.",
];

// Default model — env override or fallback
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'anthropic/claude-sonnet-4';

export async function POST(req: NextRequest) {
  try {
    const { system, messages, model, temperature } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey) {
      // Real OpenRouter API with streaming
      const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey,
      });

      const stream = await openai.chat.completions.create({
        model: model || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          ...messages,
        ],
        stream: true,
        ...(temperature !== undefined && { temperature }),
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            controller.close();
          } catch (err) {
            console.error('Stream error:', err);
            try { controller.close(); } catch {}
          }
        },
      });

      return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Mock fallback
    const mockText = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
    const words = mockText.split(' ');
    const encoder = new TextEncoder();
    let i = 0;

    const readable = new ReadableStream({
      async pull(controller) {
        if (i >= words.length) { controller.close(); return; }
        const chunk = (i === 0 ? '' : ' ') + words[i++];
        controller.enqueue(encoder.encode(chunk));
        await new Promise(r => setTimeout(r, 25));
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
