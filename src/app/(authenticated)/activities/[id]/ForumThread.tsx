import Link from 'next/link';
import { sql } from '@/lib/db';
import { ForumComposer } from './ForumComposer';
import { ForumDeleteButton } from './ForumDeleteButton';
import styles from './activity-detail.module.css';

interface Post {
  id: number;
  user_id: number;
  author_name: string;
  subject: string | null;
  body: string;
  created_at: string;
}

export async function ForumThread({
  activityId,
  topicId,
  currentUserId,
  isOwner,
}: {
  activityId: number;
  topicId: number;
  currentUserId: number;
  isOwner: boolean;
}) {
  const { rows: topicRows } = await sql`
    SELECT fp.id, fp.user_id, fp.subject, fp.body, fp.created_at, u.name AS author_name
    FROM forum_posts fp
    JOIN users u ON u.id = fp.user_id
    WHERE fp.id = ${topicId} AND fp.activity_id = ${activityId} AND fp.parent_id IS NULL
  `;
  const topic = topicRows[0] as Post | undefined;

  if (!topic) {
    return (
      <section>
        <Link href={`/activities/${activityId}`} className={styles.backLink}>
          &larr; 토론 목록
        </Link>
        <p className={styles.emptyState}>글을 찾을 수 없습니다.</p>
      </section>
    );
  }

  const { rows: replyRows } = await sql`
    SELECT fp.id, fp.user_id, fp.subject, fp.body, fp.created_at, u.name AS author_name
    FROM forum_posts fp
    JOIN users u ON u.id = fp.user_id
    WHERE fp.parent_id = ${topicId}
    ORDER BY fp.created_at ASC
  `;
  const replies = replyRows as Post[];

  return (
    <section className={styles.forumSection}>
      <Link href={`/activities/${activityId}`} className={styles.backLink}>
        &larr; 토론 목록
      </Link>

      <article className={styles.forumPost}>
        <header className={styles.forumPostHeader}>
          <h3 className={styles.forumPostSubject}>{topic.subject}</h3>
          <div className={styles.forumPostMeta}>
            <span>{topic.author_name}</span>
            <span>{new Date(topic.created_at).toLocaleString('ko-KR')}</span>
            {(isOwner || topic.user_id === currentUserId) && (
              <ForumDeleteButton postId={topic.id} activityId={activityId} returnToList />
            )}
          </div>
        </header>
        <div className={styles.forumPostBody}>
          {topic.body.split('\n').map((line, i) => (
            <p key={i}>{line || ' '}</p>
          ))}
        </div>
      </article>

      <h4 className={styles.forumRepliesHeading}>답글 {replies.length}</h4>
      {replies.length === 0 ? (
        <p className={styles.emptyState}>아직 답글이 없습니다.</p>
      ) : (
        <ul className={styles.forumReplyList}>
          {replies.map((r) => (
            <li key={r.id} className={styles.forumReply}>
              <div className={styles.forumPostMeta}>
                <span>{r.author_name}</span>
                <span>{new Date(r.created_at).toLocaleString('ko-KR')}</span>
                {(isOwner || r.user_id === currentUserId) && (
                  <ForumDeleteButton postId={r.id} activityId={activityId} />
                )}
              </div>
              <div className={styles.forumPostBody}>
                {r.body.split('\n').map((line, i) => (
                  <p key={i}>{line || ' '}</p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ForumComposer
        activityId={activityId}
        mode="reply"
        parentId={topicId}
      />
    </section>
  );
}
