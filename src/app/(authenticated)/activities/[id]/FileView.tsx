import Link from 'next/link';
import { loadFileContent } from '@/lib/activity-content';
import styles from './activity-detail.module.css';

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function FileView({
  activityId,
  canEdit,
}: {
  activityId: number;
  canEdit: boolean;
}) {
  const content = await loadFileContent(activityId);

  if (!content) {
    return (
      <section>
        <p className={styles.emptyState}>파일이 설정되지 않았습니다.</p>
        {canEdit && (
          <div className={styles.teacherActions}>
            <Link href={`/activities/${activityId}/edit`} className={styles.actionLink}>
              파일 편집
            </Link>
          </div>
        )}
      </section>
    );
  }

  const sizeLabel = formatBytes(content.file_size_bytes);

  return (
    <section>
      {canEdit && (
        <div className={styles.teacherActions}>
          <Link href={`/activities/${activityId}/edit`} className={styles.secondaryLink}>
            파일 편집
          </Link>
        </div>
      )}

      <article className={styles.fileCard}>
        <div className={styles.fileMeta}>
          <span className={styles.fileName}>{content.file_name}</span>
          {sizeLabel && <span className={styles.fileSize}>{sizeLabel}</span>}
        </div>
        <a
          href={content.file_url}
          download={content.file_name}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.actionLink}
        >
          다운로드
        </a>
      </article>
    </section>
  );
}
