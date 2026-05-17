'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteForumPost } from '@/app/actions/forum';
import styles from './activity-detail.module.css';

export function ForumDeleteButton({
  postId,
  activityId,
  returnToList = false,
}: {
  postId: number;
  activityId: number;
  returnToList?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('이 글을 삭제하시겠습니까?')) return;
    const fd = new FormData();
    fd.set('post_id', String(postId));
    startTransition(async () => {
      const result = await deleteForumPost(fd);
      if (!result.success) {
        alert(result.error);
        return;
      }
      if (returnToList) {
        router.push(`/activities/${activityId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      className={styles.forumDeleteBtn}
      onClick={handleClick}
      disabled={isPending}
      aria-label="삭제"
    >
      {isPending ? '삭제 중...' : '삭제'}
    </button>
  );
}
