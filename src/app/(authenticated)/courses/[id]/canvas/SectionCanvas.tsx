import Link from 'next/link';
import { SectionManager } from '../SectionManager';
import { activityTypeLabel } from '@/lib/activity-types';
import styles from './canvas.module.css';

const STATUS_LABELS: Record<string, string> = {
  not_attempted: '미응시',
  inprogress: '진행중',
  finished: '완료',
  submitted: '제출됨',
  graded: '채점됨',
};

interface Activity {
  id: number;
  section_id: number;
  type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  sort_order: number;
  is_visible: boolean;
}

interface Section {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  week_number: number;
  sort_order: number;
  is_visible: boolean;
}

export function SectionCanvas({
  courseId,
  sections,
  activitiesBySection,
  statusByActivity,
  canEdit,
}: {
  courseId: number;
  sections: Section[];
  activitiesBySection: Record<number, Activity[]>;
  statusByActivity: Record<number, string>;
  canEdit: boolean;
}) {
  if (canEdit) {
    return (
      <div className={styles.canvasMain}>
        <SectionManager
          courseId={courseId}
          initialSections={sections}
          activitiesBySection={activitiesBySection}
        />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className={styles.canvasMain}>
        <p className={styles.emptyState}>아직 섹션이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.canvasMain}>
      {sections.map((s) => (
        <article
          key={s.id}
          id={`section-${s.id}`}
          data-section-id={s.id}
          className={
            s.is_visible
              ? styles.sectionCard
              : `${styles.sectionCard} ${styles.sectionCardHidden}`
          }
        >
          <header className={styles.sectionHeader}>
            <h2>
              <span className={styles.weekBadge}>{s.week_number}주차</span>
              {s.title}
            </h2>
            {!s.is_visible && <span className={styles.hiddenBadge}>숨김</span>}
          </header>
          {s.description && (
            <p className={styles.sectionDesc}>{s.description}</p>
          )}
          <ActivityList
            courseId={courseId}
            activities={activitiesBySection[s.id] || []}
            statusByActivity={statusByActivity}
          />
        </article>
      ))}
    </div>
  );
}

function ActivityList({
  courseId,
  activities,
  statusByActivity,
}: {
  courseId: number;
  activities: Activity[];
  statusByActivity: Record<number, string>;
}) {
  if (activities.length === 0) {
    return <p className={styles.noActivities}>활동 없음</p>;
  }

  return (
    <div className={styles.activityGrid}>
      {activities.map((a) => {
        const status = statusByActivity[a.id];
        return (
          <Link
            key={a.id}
            href={`/courses/${courseId}/canvas?peek=${a.id}`}
            scroll={false}
            className={
              a.is_visible
                ? styles.activityCard
                : `${styles.activityCard} ${styles.activityCardHidden}`
            }
          >
            <div className={styles.activityCardTop}>
              <span className={styles.typeBadge}>
                {activityTypeLabel(a.type)}
              </span>
              {status && (
                <span className={styles.statusBadge} data-status={status}>
                  {STATUS_LABELS[status] || status}
                </span>
              )}
            </div>
            <span className={styles.activityTitle}>{a.title}</span>
            <span className={styles.activityMeta}>
              {a.due_date && (
                <span>
                  마감 {new Date(a.due_date).toLocaleDateString('ko-KR')}
                </span>
              )}
              {!a.is_visible && <span>숨김</span>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
