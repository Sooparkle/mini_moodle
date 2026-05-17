'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './canvas.module.css';

interface Activity {
  id: number;
  section_id: number;
  type: string;
  title: string;
  is_visible: boolean;
}

interface Section {
  id: number;
  title: string;
  week_number: number;
}

export function CourseIndex({
  sections,
  activitiesBySection,
  statusByActivity,
}: {
  sections: Section[];
  activitiesBySection: Record<number, Activity[]>;
  statusByActivity: Record<number, string>;
}) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<number | null>(
    sections[0]?.id ?? null,
  );

  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIds = entries
          .filter((e) => e.isIntersecting)
          .map((e) => Number((e.target as HTMLElement).dataset.sectionId))
          .filter((n) => !Number.isNaN(n));
        if (visibleIds.length > 0) {
          setActiveSection(Math.min(...visibleIds));
        }
      },
      { rootMargin: '-15% 0px -60% 0px', threshold: 0 },
    );

    for (const s of sections) {
      const el = document.getElementById(`section-${s.id}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) {
    return (
      <aside className={styles.indexAside} aria-label="코스 목차">
        <p className={styles.indexTitle}>목차</p>
        <p className={styles.railEmpty}>섹션 없음</p>
      </aside>
    );
  }

  return (
    <aside className={styles.indexAside} aria-label="코스 목차">
      <p className={styles.indexTitle}>목차</p>
      <ul className={styles.indexList}>
        {sections.map((s) => {
          const activities = activitiesBySection[s.id] || [];
          return (
            <li key={s.id} className={styles.indexSectionItem}>
              <button
                type="button"
                className={styles.indexSectionHeader}
                data-active={activeSection === s.id}
                onClick={() => {
                  const el = document.getElementById(`section-${s.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span className={styles.indexWeekBadge}>{s.week_number}주차</span>
                <span className={styles.indexSectionLabel}>{s.title}</span>
              </button>
              {activities.length > 0 && (
                <ul className={styles.indexActivityList}>
                  {activities.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`${pathname}?peek=${a.id}`}
                        scroll={false}
                        className={styles.indexActivityItem}
                      >
                        <span
                          className={styles.indexStatusDot}
                          data-status={statusByActivity[a.id]}
                          aria-hidden="true"
                        />
                        <span className={styles.indexActivityLabel}>
                          {a.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
