'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createForumTopic, createForumReply } from '@/app/actions/forum';
import styles from './activity-detail.module.css';

export function ForumComposer({
  activityId,
  mode,
  parentId,
}: {
  activityId: number;
  mode: 'topic' | 'reply';
  parentId?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(mode === 'reply');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (mode === 'topic' && !subject.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    if (!body.trim()) {
      setError('내용을 입력하세요.');
      return;
    }

    const fd = new FormData();
    fd.set('activity_id', String(activityId));
    fd.set('body', body.trim());
    if (mode === 'topic') {
      fd.set('subject', subject.trim());
    } else if (parentId !== undefined) {
      fd.set('parent_id', String(parentId));
    }

    startTransition(async () => {
      const result =
        mode === 'topic'
          ? await createForumTopic(fd)
          : await createForumReply(fd);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSubject('');
      setBody('');
      if (mode === 'topic') setOpen(false);
      router.refresh();
    });
  }

  if (mode === 'topic' && !open) {
    return (
      <button
        type="button"
        className={styles.actionLink}
        onClick={() => setOpen(true)}
      >
        + 새 글 작성
      </button>
    );
  }

  return (
    <div className={styles.forumComposer}>
      <h3 className={styles.forumComposerHeading}>
        {mode === 'topic' ? '새 글 작성' : '답글 작성'}
      </h3>
      {mode === 'topic' && (
        <input
          type="text"
          className={styles.forumInput}
          placeholder="제목"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="제목"
        />
      )}
      <textarea
        className={styles.forumTextarea}
        placeholder="내용을 입력하세요"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        aria-label="내용"
      />
      {error && (
        <p className={styles.forumError} role="alert">{error}</p>
      )}
      <div className={styles.forumComposerActions}>
        <button
          type="button"
          className={styles.actionLink}
          onClick={submit}
          disabled={isPending}
        >
          {isPending ? '작성 중...' : '작성'}
        </button>
        {mode === 'topic' && (
          <button
            type="button"
            className={styles.secondaryLink}
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
