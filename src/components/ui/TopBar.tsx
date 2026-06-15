'use client';
import { E, T, C, ACCENT } from '@/lib/theme';

export function TopBar() {
  return (
    <header
      className="flex items-center justify-between px-3"
      style={{ background: E[0], borderBottom: '1px solid ' + E[4] + '', height: 36 }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: T.subtle, fontFamily: 'Inconsolata, monospace' }}>
          DC
        </span>
        <span style={{ fontSize: 11, color: T.ghost, fontFamily: 'Inconsolata, monospace' }}>
          Dreamcatcher
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: ACCENT, opacity: 0.6 }} />
        <span style={{ fontSize: 10, color: T.ghost, fontFamily: 'Inconsolata, monospace' }}>Active</span>
      </div>
    </header>
  );
}
