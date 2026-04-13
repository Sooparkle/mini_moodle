'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { gradeAssignment } from '@/app/actions/assignment';
import styles from './submissions.module.css';

export function SubmissionGrader({
  activityId,
  studentUserId,
  gradeMax,
  currentGrade,
  currentFeedback,
}: {
  activityId: number;
  studentUserId: number;
  gradeMax: number;
  currentGrade: number | null;
  currentFeedback: string | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(currentGrade === null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleGrade(formData: FormData) {
    formData.set('activity_id', String(activityId));
    formData.set('student_user_id', String(studentUserId));
    setError('');

    startTransition(async () => {
      const result = await gradeAssignment(formData);
      if (!result.success) {
        setError(result.error);
      } else {
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  if (!isEditing && currentGrade !== null) {
    return (
      <div className={styles.gradeForm}>
        <div className={styles.gradeRow}>
          <span className={styles.existingGrade}>
            {currentGrade} / {gradeMax}
          </span>
          <button
            type="button"
            className={styles.gradeBtn}
            onClick={() => setIsEditing(true)}
            style={{ background: 'transparent', color: 'var(--gray-600)', border: '1px solid var(--gray-200)' }}
          >
            재채점
          </button>
        </div>
        {currentFeedback && (
          <p className={styles.existingFeedback}>{currentFeedback}</p>
        )}
      </div>
    );
  }

  return (
    <form action={handleGrade} className={styles.gradeForm}>
      {error && (
        <p className={styles.error} role="alert">{error}</p>
      )}
      <div className={styles.gradeRow}>
        <label className={styles.label} htmlFor={`grade-${studentUserId}`}>
          점수
        </label>
        <input
          id={`grade-${studentUserId}`}
          name="raw_grade"
          type="number"
          min="0"
          max={gradeMax}
          step="0.01"
          className={styles.gradeInput}
          defaultValue={currentGrade ?? ''}
          required
          autoComplete="off"
        />
        <span className={styles.gradeMax}>/ {gradeMax}</span>
      </div>
      <label className={styles.label} htmlFor={`feedback-${studentUserId}`}>
        피드백 (선택)
      </label>
      <textarea
        id={`feedback-${studentUserId}`}
        name="feedback"
        className={styles.textarea}
        defaultValue={currentFeedback || ''}
        autoComplete="off"
        placeholder="학생에게 전달할 피드백을 입력하세요..."
      />
      <div className={styles.formActions}>
        <button type="submit" className={styles.gradeBtn} disabled={isPending}>
          {isPending ? '저장 중...' : '채점'}
        </button>
        {currentGrade !== null && (
          <button
            type="button"
            className={styles.gradeBtn}
            onClick={() => setIsEditing(false)}
            style={{ background: 'transparent', color: 'var(--gray-600)', border: '1px solid var(--gray-200)' }}
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
