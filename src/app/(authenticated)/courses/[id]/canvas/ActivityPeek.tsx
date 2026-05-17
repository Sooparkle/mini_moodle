'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { activityTypeLabel } from '@/lib/activity-types';
import styles from './canvas.module.css';

interface Activity {
  id: number;
  type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_visible: boolean;
}

export function ActivityPeek({
  activity,
}: {
  activity: Activity | null;
  courseId: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!activity) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        router.replace(pathname, { scroll: false });
      }
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activity, pathname, router]);

  if (!activity) return null;

  const close = () => router.replace(pathname, { scroll: false });

  return (
    <>
      <div
        className={styles.peekBackdrop}
        onClick={close}
        aria-hidden="true"
      />
      <section
        className={styles.peekPanel}
        role="dialog"
        aria-modal="true"
        aria-label={`${activity.title} 미리보기`}
      >
        <header className={styles.peekHeader}>
          <div className={styles.peekTitle}>
            <span className={styles.typeBadge}>
              {activityTypeLabel(activity.type)}
            </span>
            <h2>{activity.title}</h2>
          </div>
          <button
            type="button"
            className={styles.peekClose}
            onClick={close}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className={styles.peekBody}>
          {activity.description ? (
            <p className={styles.peekDesc}>{activity.description}</p>
          ) : (
            <p className={styles.railEmpty}>설명 없음</p>
          )}

          <ul className={styles.peekMetaList}>
            <li>
              <span className={styles.peekMetaLabel}>유형</span>
              <span className={styles.peekMetaValue}>
                {activityTypeLabel(activity.type)}
              </span>
            </li>
            {activity.due_date && (
              <li>
                <span className={styles.peekMetaLabel}>마감</span>
                <span className={styles.peekMetaValue}>
                  {new Date(activity.due_date).toLocaleString('ko-KR')}
                </span>
              </li>
            )}
            {!activity.is_visible && (
              <li>
                <span className={styles.peekMetaLabel}>공개</span>
                <span className={styles.peekMetaValue}>숨김</span>
              </li>
            )}
          </ul>
        </div>

        <footer className={styles.peekActions}>
          <Link
            href={`/activities/${activity.id}`}
            className={styles.peekPrimary}
          >
            활동 열기
          </Link>
          <button
            type="button"
            className={styles.peekSecondary}
            onClick={close}
          >
            닫기
          </button>
        </footer>
      </section>
    </>
  );
}
