'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUrlResource } from '@/app/actions/url';
import styles from './quiz-edit.module.css';

export function UrlEditor({
  activityId,
  initialUrl,
  initialOpenInNewTab,
}: {
  activityId: number;
  initialUrl: string;
  initialOpenInNewTab: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(initialOpenInNewTab);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setStatus(null);
    const fd = new FormData();
    fd.set('activity_id', String(activityId));
    fd.set('external_url', url);
    if (!openInNewTab) fd.set('open_in_new_tab', 'off');
    startTransition(async () => {
      const result = await updateUrlResource(fd);
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
      <label className={styles.label} htmlFor="url-address">URL 주소</label>
      <input
        id="url-address"
        type="url"
        className={styles.input}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        required
      />
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={openInNewTab}
          onChange={(e) => setOpenInNewTab(e.target.checked)}
        />
        새 탭에서 열기
      </label>
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
