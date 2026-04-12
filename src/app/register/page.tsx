'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { register } from '@/app/actions/auth';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await register(formData);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push('/login?registered=1');
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1 className={styles.title}>MoodleLite</h1>
        <p className={styles.subtitle}>회원가입</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p role="alert" className={styles.error}>{error}</p>}

          <label htmlFor="name" className={styles.label}>이름</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={styles.input}
            placeholder="홍길동"
          />

          <label htmlFor="email" className={styles.label}>이메일</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={styles.input}
            placeholder="email@example.com"
          />

          <label htmlFor="password" className={styles.label}>비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={styles.input}
            placeholder="6자 이상"
          />

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className={styles.footer}>
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </p>
      </section>
    </main>
  );
}
