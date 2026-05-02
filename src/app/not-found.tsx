import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      maxWidth: '480px',
      margin: 'var(--space-12) auto',
      padding: 'var(--space-8)',
      textAlign: 'center',
    }}>
      <h2 style={{ color: 'var(--gray-900)', marginBottom: 'var(--space-4)' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-6)' }}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-block',
          padding: 'var(--space-2) var(--space-6)',
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          textDecoration: 'none',
        }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
