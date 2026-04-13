'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enrollInCourse } from '@/app/actions/enrollment';
import styles from '../courses.module.css';

export function EnrollButton({ courseId }: { courseId: number }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleEnroll() {
    setError('');
    const formData = new FormData();
    formData.set('course_id', String(courseId));

    startTransition(async () => {
      const result = await enrollInCourse(formData);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={styles.ctaButton}
        onClick={handleEnroll}
        disabled={isPending}
      >
        {isPending ? '등록 중...' : '수강 등록'}
      </button>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </>
  );
}
