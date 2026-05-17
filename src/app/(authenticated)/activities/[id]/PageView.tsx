import Link from 'next/link';
import { loadPageContent } from '@/lib/activity-content';
import styles from './activity-detail.module.css';

export async function PageView({
  activityId,
  canEdit,
}: {
  activityId: number;
  canEdit: boolean;
}) {
  const { body } = await loadPageContent(activityId);

  return (
    <section>
      {canEdit && (
        <div className={styles.teacherActions}>
          <Link href={`/activities/${activityId}/edit`} className={styles.actionLink}>
            본문 편집
          </Link>
        </div>
      )}

      {body.trim() === '' ? (
        <p className={styles.emptyState}>
          {canEdit ? '본문이 비어 있습니다. "본문 편집"으로 내용을 추가하세요.' : '본문이 비어 있습니다.'}
        </p>
      ) : (
        <article className={styles.pageBody}>
          {body.split('\n').map((line, i) => (
            <p key={i}>{line || ' '}</p>
          ))}
        </article>
      )}
    </section>
  );
}
