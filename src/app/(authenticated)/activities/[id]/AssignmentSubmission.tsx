'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitAssignment } from '@/app/actions/assignment';
import styles from './activity-detail.module.css';

export function AssignmentSubmission({
  activityId,
  initialText,
}: {
  activityId: number;
  initialText: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!initialText);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    formData.set('activity_id', String(activityId));
    setError('');

    startTransition(async () => {
      const result = await submitAssignment(formData);
      if (!result.success) {
        setError(result.error);
      } else {
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  if (!isEditing && initialText) {
    return (
      <>
        <div className={styles.submissionText}>{initialText}</div>
        <button
          type="button"
          className={styles.editBtn}
          onClick={() => setIsEditing(true)}
        >
          수정
        </button>
      </>
    );
  }

  return (
    <form action={handleSubmit}>
      {error && (
        <p className={styles.error} role="alert">{error}</p>
      )}
      <label className={styles.label} htmlFor="submission-text">
        제출 내용
      </label>
      <textarea
        id="submission-text"
        name="submission_text"
        className={styles.textarea}
        defaultValue={initialText}
        required
        autoComplete="off"
        placeholder="과제 내용을 입력하세요..."
      />
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn} disabled={isPending}>
          {isPending ? '제출 중...' : initialText ? '재제출' : '제출'}
        </button>
        {initialText && (
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => setIsEditing(false)}
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
