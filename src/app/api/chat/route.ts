// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Chat API Route
// Uses OpenRouter for model access. Falls back to mock if no key.
// Set OPENROUTER_API_KEY in .env.local
// ═══════════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MODELS } from '@/lib/models';
import { createRateLimiter } from '@/lib/rate-limit';

const MOCK_RESPONSES = [
  "That's an interesting direction. Let me think through the implications — there are three main considerations here that could shape the approach.",
  "I'd suggest starting with the simplest version that validates the core assumption. Build the skeleton first, then add complexity only where the data demands it.",
  "Good question. The short answer is yes, but with caveats. The longer answer involves understanding how the constraints interact with each other at scale.",
  "Here's what I'd recommend: separate the concerns first, then optimize. Premature optimization in this context would lock you into architecture decisions before you understand the problem space.",
  "That connects to something we discussed earlier in this thread. The pattern here is consistent — when you apply that constraint, the solution space narrows to two viable options.",
];

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'anthropic/claude-sonnet-4';
const MAX_MESSAGES = 200;
const MAX_MESSAGE_CHARS = 50_000;
const MAX_SYSTEM_CHARS = 20_000;

const ALLOWED_MODEL_IDS = new Set(MODELS.map(m => m.id));

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(MAX_MESSAGE_CHARS),
});

const RequestSchema = z.object({
  system: z.string().max(MAX_SYSTEM_CHARS).default(''),
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
  model: z.string().refine(id => ALLOWED_MODEL_IDS.has(id), {
    message: 'Model not allowed',
  }).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// 20 requests/minute per IP, refilled at ~0.33/sec (~one per 3s).
const rateLimiter = createRateLimiter({ capacity: 20, refillPerSecond: 1 / 3 });

function getClientKey(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const clientKey = getClientKey(req);
    const limit = rateLimiter(clientKey);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
        },
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = RequestSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues.slice(0, 5) },
        { status: 400 },
      );
    }
    const { system, messages, model, temperature } = parsed.data;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey) {
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
    // Log full detail server-side; return generic message to avoid leaking upstream errors.
    console.error('Chat route error:', err);
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 },
    );
  }
}
