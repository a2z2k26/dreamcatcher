import { describe, it, expect } from 'vitest';
import { getLOD, resolveProvider, esc, hexPath, LOD_THRESHOLDS } from './canvas-geometry';

describe('getLOD', () => {
  it('returns level 0 with full fadeIn at very low zoom', () => {
    expect(getLOD(0.05)).toEqual({ level: 0, fadeIn: 1 });
  });

  it('returns max level at high zoom', () => {
    const { level, fadeIn } = getLOD(1.5);
    expect(level).toBe(LOD_THRESHOLDS.length);
    expect(fadeIn).toBe(1);
  });

  it('crossfades in the transition zone', () => {
    // Just above threshold 0.25 boundary → inside crossfade
    const { level, fadeIn } = getLOD(0.23);
    expect(level).toBe(1);
    expect(fadeIn).toBeGreaterThan(0);
    expect(fadeIn).toBeLessThan(1);
  });

  it('level bumps up across each threshold', () => {
    expect(getLOD(0.35).level).toBe(1);
    expect(getLOD(0.60).level).toBe(2);
    expect(getLOD(0.80).level).toBe(3);
  });
});

describe('resolveProvider', () => {
  const make = (id: string) => ({ id, name: '', provider: '', icon: '', color: '' });

  it('maps anthropic ids', () => {
    expect(resolveProvider(make('anthropic/claude-sonnet-4'))).toBe('anthropic');
  });

  it('maps openai ids', () => {
    expect(resolveProvider(make('openai/gpt-4o'))).toBe('openai');
  });

  it('maps google ids', () => {
    expect(resolveProvider(make('google/gemini-2.0-flash'))).toBe('google');
  });

  it('returns null for unknown providers', () => {
    expect(resolveProvider(make('meta/llama'))).toBeNull();
  });

  it('returns null for null input', () => {
    expect(resolveProvider(null)).toBeNull();
  });
});

describe('esc', () => {
  it('escapes HTML-dangerous characters', () => {
    expect(esc('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('escapes ampersand first to avoid double-encoding', () => {
    expect(esc('&amp;')).toBe('&amp;amp;');
  });

  it('leaves safe text unchanged', () => {
    expect(esc('Hello world 123')).toBe('Hello world 123');
  });
});

describe('hexPath', () => {
  it('produces a closed SVG path with 6 points', () => {
    const d = hexPath(10);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
    // 6 vertices separated by 5 " L " joins
    expect((d.match(/ L /g) || []).length).toBe(5);
  });

  it('scales with radius', () => {
    // First vertex at r=100 is roughly (86.6, -50); at r=1 roughly (0.87, -0.5).
    expect(hexPath(100)).toContain('86.6');
    expect(hexPath(1)).toContain('0.8660');
  });
});
