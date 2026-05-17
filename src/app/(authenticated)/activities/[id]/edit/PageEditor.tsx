'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePageBody } from '@/app/actions/pages';
import styles from './quiz-edit.module.css';

export function PageEditor({
  activityId,
  initialBody,
}: {
  activityId: number;
  initialBody: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setStatus(null);
    const fd = new FormData();
    fd.set('activity_id', String(activityId));
    fd.set('body', body);
    startTransition(async () => {
      const result = await updatePageBody(fd);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus('저장됨');
      router.refresh();
    });
  }

  return (
    <section className={styles.editorSection}>
      <label className={styles.label} htmlFor="page-body">페이지 본문</label>
      <textarea
        id="page-body"
        className={styles.textarea}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={20}
        placeholder="페이지에 표시할 내용을 입력하세요"
      />
      {error && <p className={styles.error} role="alert">{error}</p>}
      {status && <p className={styles.status}>{status}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={submit}
          disabled={isPending}
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </section>
  );
}
