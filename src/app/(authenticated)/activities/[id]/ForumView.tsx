import { sql } from '@/lib/db';
import { ForumComposer } from './ForumComposer';
import { ForumThread } from './ForumThread';
import styles from './activity-detail.module.css';

interface Topic {
  id: number;
  user_id: number;
  author_name: string;
  subject: string;
  body: string;
  created_at: string;
  reply_count: number;
}

export async function ForumView({
  activityId,
  currentUserId,
  isOwner,
  selectedTopicId,
}: {
  activityId: number;
  currentUserId: number;
  isOwner: boolean;
  selectedTopicId: number | null;
}) {
  if (selectedTopicId !== null) {
    return (
      <ForumThread
        activityId={activityId}
        topicId={selectedTopicId}
        currentUserId={currentUserId}
        isOwner={isOwner}
      />
    );
  }

  const { rows } = await sql`
    SELECT fp.id, fp.user_id, fp.subject, fp.body, fp.created_at,
           u.name AS author_name,
           (SELECT COUNT(*)::int FROM forum_posts r WHERE r.parent_id = fp.id) AS reply_count
    FROM forum_posts fp
    JOIN users u ON u.id = fp.user_id
    WHERE fp.activity_id = ${activityId} AND fp.parent_id IS NULL
    ORDER BY fp.created_at DESC
  `;

  const topics = rows as Topic[];

  return (
    <section className={styles.forumSection}>
      <ForumComposer activityId={activityId} mode="topic" />

      {topics.length === 0 ? (
        <p className={styles.emptyState}>아직 작성된 글이 없습니다.</p>
      ) : (
        <ul className={styles.forumTopicList}>
          {topics.map((t) => (
            <li key={t.id} className={styles.forumTopicItem}>
              <a
                href={`?topic=${t.id}`}
                className={styles.forumTopicLink}
              >
                <h3 className={styles.forumTopicSubject}>{t.subject}</h3>
                <p className={styles.forumTopicPreview}>
                  {t.body.length > 120 ? t.body.slice(0, 120) + '…' : t.body}
                </p>
                <div className={styles.forumTopicMeta}>
                  <span>{t.author_name}</span>
                  <span>{new Date(t.created_at).toLocaleString('ko-KR')}</span>
                  <span>답글 {t.reply_count}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
