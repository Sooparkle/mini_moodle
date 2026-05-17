import Link from 'next/link';
import styles from './modeless.module.css';

export function StudentPreviewToggle({
  courseId,
  previewing,
}: {
  courseId: number;
  previewing: boolean;
}) {
  if (previewing) return null;
  return (
    <Link
      href={`/courses/${courseId}/modeless?as=student`}
      className={styles.previewToggle}
      aria-label="학생 시점으로 미리보기"
    >
      <EyeSvg />
      <span>학생으로 보기</span>
    </Link>
  );
}

function EyeSvg() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.333 8C2.667 4.667 5.333 3 8 3s5.333 1.667 6.667 5c-1.334 3.333-4 5-6.667 5S2.667 11.333 1.333 8Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}
