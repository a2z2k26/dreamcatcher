import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import type { NextRequest } from 'next/server';

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers);
  return {
    json: async () => body,
    headers: h,
  } as unknown as NextRequest;
}

describe('POST /api/chat — validation', () => {
  beforeEach(() => {
    // Force mock-response path: no key set.
    delete process.env.OPENROUTER_API_KEY;
  });

  it('returns 400 on invalid JSON', async () => {
    const req = {
      json: async () => { throw new SyntaxError('bad json'); },
      headers: new Headers(),
    } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 when messages missing', async () => {
    // Unique IP to avoid any rate-limit contamination from other tests
    const res = await POST(makeReq({}, { 'x-forwarded-for': '10.0.0.1' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 on invalid message role', async () => {
    const res = await POST(makeReq({
      messages: [{ role: 'system-admin', content: 'hi' }],
    }, { 'x-forwarded-for': '10.0.0.2' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on disallowed model', async () => {
    const res = await POST(makeReq({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'evil-corp/ultra-model',
    }, { 'x-forwarded-for': '10.0.0.3' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on out-of-range temperature', async () => {
    const res = await POST(makeReq({
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 5,
    }, { 'x-forwarded-for': '10.0.0.4' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when message content exceeds 50k chars', async () => {
    const huge = 'x'.repeat(50_001);
    const res = await POST(makeReq({
      messages: [{ role: 'user', content: huge }],
    }, { 'x-forwarded-for': '10.0.0.5' }));
    expect(res.status).toBe(400);
  });

  it('streams mock response on valid request without API key', async () => {
    const res = await POST(makeReq({
      messages: [{ role: 'user', content: 'hi' }],
    }, { 'x-forwarded-for': '10.0.0.6' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  it('accepts allowed model ids', async () => {
    const res = await POST(makeReq({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'anthropic/claude-sonnet-4',
    }, { 'x-forwarded-for': '10.0.0.7' }));
    expect(res.status).toBe(200);
  });

  it('rate-limits after burst capacity exhausted', async () => {
    const ip = '10.0.0.8';
    // Capacity is 20; send 21 requests and expect the last to 429.
    // Cancel each stream immediately so the test doesn't wait for word-by-word mock output.
    const body = { messages: [{ role: 'user', content: 'hi' }] };
    let last: Response | null = null;
    for (let i = 0; i < 21; i++) {
      last = await POST(makeReq(body, { 'x-forwarded-for': ip }));
      if (last.body) last.body.cancel().catch(() => {});
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get('Retry-After')).not.toBeNull();
  }, 15_000);
});
