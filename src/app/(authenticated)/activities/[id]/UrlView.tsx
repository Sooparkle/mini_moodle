import Link from 'next/link';
import { loadUrlContent } from '@/lib/activity-content';
import styles from './activity-detail.module.css';

export async function UrlView({
  activityId,
  canEdit,
}: {
  activityId: number;
  canEdit: boolean;
}) {
  const content = await loadUrlContent(activityId);

  if (!content) {
    return (
      <section>
        <p className={styles.emptyState}>URL이 설정되지 않았습니다.</p>
        {canEdit && (
          <div className={styles.teacherActions}>
            <Link href={`/activities/${activityId}/edit`} className={styles.actionLink}>
              URL 편집
            </Link>
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      {canEdit && (
        <div className={styles.teacherActions}>
          <Link href={`/activities/${activityId}/edit`} className={styles.secondaryLink}>
            URL 편집
          </Link>
        </div>
      )}

      <article className={styles.urlCard}>
        <p className={styles.urlAddress}>{content.external_url}</p>
        <a
          href={content.external_url}
          target={content.open_in_new_tab ? '_blank' : undefined}
          rel={content.open_in_new_tab ? 'noopener noreferrer' : undefined}
          className={styles.actionLink}
        >
          외부 사이트로 이동 &rarr;
        </a>
      </article>
    </section>
  );
}
