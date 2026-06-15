import { describe, expect, it } from 'vitest';
import {
  ACCENT,
  ACCENT_HISTORICAL,
  ACCENT_RETAINED,
  FF,
  STATUS,
  T,
  VENDOR,
  accentGlow,
  heavyGlass,
  inputFocusRing,
} from './theme';

describe('theme design tokens', () => {
  it('exposes the Red Stripe text and accent vocabulary', () => {
    expect(T.superHover).toBe('#EEEEEE');
    expect(T.dimSection).toBe('#505050');
    expect(ACCENT).toBe('#DD0000');
    expect(ACCENT_RETAINED).toBe('#DD000066');
    expect(ACCENT_HISTORICAL).toBe('#DD000040');
    expect(accentGlow(0.18)).toBe('rgba(221,0,0,0.18)');
  });

  it('keeps vendor and semantic status colors namespaced', () => {
    expect(VENDOR.anthropic).toBe('#E08542');
    expect(VENDOR.openai).toBe('#4A8FE0');
    expect(VENDOR.google).toBe('#EA4335');
    expect(STATUS.financial).toBe('#D4A574');
    expect(STATUS.complete).toBe('#52C41A');
  });

  it('uses the design-system font and glass recipes', () => {
    expect(FF.sans).toContain('Mulish');
    expect(FF.mono).toContain('iA Writer Mono S');
    expect(heavyGlass.borderRadius).toBe(22);
    expect(inputFocusRing.boxShadow).toContain('rgba(221,0,0,0.18)');
  });
});
