'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      maxWidth: '480px',
      margin: 'var(--space-12) auto',
      padding: 'var(--space-8)',
      textAlign: 'center',
    }}>
      <h2 style={{ color: 'var(--gray-900)', marginBottom: 'var(--space-4)' }}>
        문제가 발생했습니다
      </h2>
      <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-6)' }}>
        {error.message || '페이지를 불러오는 중 오류가 발생했습니다.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: 'var(--space-2) var(--space-6)',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          fontSize: 'var(--text-sm)',
          fontFamily: 'inherit',
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
