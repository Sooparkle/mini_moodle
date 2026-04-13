'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { createCourse } from '@/app/actions/course';
import styles from '../courses.module.css';

export default function NewCoursePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session && session.user.role !== 'teacher') {
    router.replace('/courses');
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createCourse(formData);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/courses/${result.courseId}`);
    router.refresh();
  }

  return (
    <main className={styles.content}>
      <h1 className={styles.heading}>새 코스 만들기</h1>
      <p className={styles.subheading}>코스 기본 정보를 입력하세요</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p role="alert" className={styles.error}>{error}</p>}

        <label htmlFor="title" className={styles.label}>코스 제목 *</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className={styles.input}
          placeholder="예: 웹 프로그래밍 기초"
        />

        <label htmlFor="short_name" className={styles.label}>코스 코드 *</label>
        <input
          id="short_name"
          name="short_name"
          type="text"
          required
          maxLength={50}
          className={styles.input}
          placeholder="예: WEB101"
        />

        <label htmlFor="description" className={styles.label}>설명</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className={styles.textarea}
          placeholder="코스에 대한 간단한 설명"
        />

        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="start_date" className={styles.label}>시작일</label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              className={styles.input}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="end_date" className={styles.label}>종료일</label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              className={styles.input}
            />
          </div>
        </div>

        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="is_published" className={styles.checkbox} />
          코스 공개 (학생에게 노출)
        </label>

        <div className={styles.formActions}>
          <button type="submit" className={styles.ctaButton} disabled={loading}>
            {loading ? '생성 중...' : '코스 생성'}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push('/courses')}
          >
            취소
          </button>
        </div>
      </form>
    </main>
  );
}
