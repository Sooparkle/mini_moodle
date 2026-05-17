import Link from 'next/link';
import { activityTypeLabel } from '@/lib/activity-types';
import styles from './modeless.module.css';

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

const STATUS_LABELS: Record<string, string> = {
  not_attempted: '미응시',
  inprogress: '진행중',
  finished: '완료',
  submitted: '제출됨',
  graded: '채점됨',
};

export function ModelessReadOnly({
  sections,
  activitiesBySection,
  statusByActivity,
}: {
  sections: Section[];
  activitiesBySection: Record<number, Activity[]>;
  statusByActivity: Record<number, string>;
}) {
  const visibleSections = sections.filter((s) => s.is_visible);

  if (visibleSections.length === 0) {
    return <p className={styles.emptyState}>아직 공개된 섹션이 없습니다.</p>;
  }

  return (
    <section className={styles.sectionList}>
      {visibleSections.map((section) => {
        const visibleActivities = (activitiesBySection[section.id] || []).filter(
          (a) => a.is_visible,
        );
        return (
          <article key={section.id} className={styles.sectionCard}>
            <header className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.weekBadge}>
                  {section.week_number}주차
                </span>
                <span>{section.title}</span>
              </div>
            </header>
            {section.description && (
              <p className={styles.sectionDesc}>{section.description}</p>
            )}
            {visibleActivities.length === 0 ? (
              <p className={styles.sectionDescPlaceholder}>
                활동이 없습니다.
              </p>
            ) : (
              <ul className={styles.activityList}>
                {visibleActivities.map((a) => {
                  const status = statusByActivity[a.id];
                  return (
                    <li key={a.id} className={styles.activityRow}>
                      <span className={styles.typeBadge}>
                        {activityTypeLabel(a.type)}
                      </span>
                      <div className={styles.activityTitleArea}>
                        <Link
                          href={`/activities/${a.id}`}
                          className={styles.activityLink}
                        >
                          {a.title}
                        </Link>
                      </div>
                      {status && (
                        <span
                          className={styles.statusBadge}
                          data-status={status}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                      )}
                      {a.due_date && (
                        <span className={styles.dueDate}>
                          마감: {new Date(a.due_date).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
