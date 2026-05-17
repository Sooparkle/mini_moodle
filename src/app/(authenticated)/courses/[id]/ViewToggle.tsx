import Link from 'next/link';
import styles from './view-toggle.module.css';

type View = 'default' | 'canvas' | 'modeless';

export function ViewToggle({
  courseId,
  current,
}: {
  courseId: number;
  current: View;
}) {
  return (
    <nav className={styles.toggle} aria-label="뷰 전환">
      <Link
        href={`/courses/${courseId}`}
        className={styles.toggleBtn}
        data-active={current === 'default'}
      >
        기본
      </Link>
      <Link
        href={`/courses/${courseId}/canvas`}
        className={styles.toggleBtn}
        data-active={current === 'canvas'}
      >
        캔버스
      </Link>
      <Link
        href={`/courses/${courseId}/modeless`}
        className={styles.toggleBtn}
        data-active={current === 'modeless'}
      >
        Mode-less
      </Link>
    </nav>
  );
}
