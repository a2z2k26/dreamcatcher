import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: '#1F1F1F',
        color: '#F0EDE6',
        fontFamily: "'Inconsolata', monospace",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '0.04em' }}>404</h1>
      <p style={{ fontSize: 14, color: '#B0B0B0' }}>This branch does not exist.</p>
      <Link href="/" style={{ fontSize: 13, color: '#FFCC00', textDecoration: 'none' }}>
        ← Return to canvas
      </Link>
    </div>
  );
}
