'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateFileResource } from '@/app/actions/file';
import styles from './quiz-edit.module.css';

export function FileEditor({
  activityId,
  initialName,
  initialUrl,
  initialSize,
}: {
  activityId: number;
  initialName: string;
  initialUrl: string;
  initialSize: number | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [size, setSize] = useState<string>(initialSize?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setStatus(null);
    const fd = new FormData();
    fd.set('activity_id', String(activityId));
    fd.set('file_name', name);
    fd.set('file_url', url);
    if (size) fd.set('file_size_bytes', size);
    startTransition(async () => {
      const result = await updateFileResource(fd);
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
      <label className={styles.label} htmlFor="file-name">파일 이름</label>
      <input
        id="file-name"
        type="text"
        className={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 강의자료_1주차.pdf"
        required
      />
      <label className={styles.label} htmlFor="file-url">파일 URL</label>
      <input
        id="file-url"
        type="url"
        className={styles.input}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        required
      />
      <label className={styles.label} htmlFor="file-size">파일 크기 (byte, 선택)</label>
      <input
        id="file-size"
        type="number"
        min="0"
        className={styles.input}
        value={size}
        onChange={(e) => setSize(e.target.value)}
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
