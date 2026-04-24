'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
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
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '0.04em' }}>
          Something broke.
        </h1>
        <p style={{ fontSize: 13, color: '#B0B0B0', maxWidth: 480, textAlign: 'center' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => unstable_retry()}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontFamily: 'inherit',
            color: '#1F1F1F',
            background: '#FFCC00',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
