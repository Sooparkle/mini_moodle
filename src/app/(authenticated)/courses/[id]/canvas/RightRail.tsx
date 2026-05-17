import Link from 'next/link';
import styles from './canvas.module.css';
import type { RecentGrade } from './page';

interface Activity {
  id: number;
  type: string;
  title: string;
  due_date: string | null;
}

export function RightRail({
  role,
  isOwner,
  courseId,
  activities,
  statusByActivity,
  recentGrades,
  pendingGradingCount,
  enrolledCount,
}: {
  role: string;
  isOwner: boolean;
  courseId: number;
  activities: Activity[];
  statusByActivity: Record<number, string>;
  recentGrades: RecentGrade[];
  pendingGradingCount: number;
  enrolledCount: number;
}) {
  if (role === 'student') {
    return (
      <StudentRail
        activities={activities}
        statusByActivity={statusByActivity}
        recentGrades={recentGrades}
        courseId={courseId}
      />
    );
  }
  if (role === 'teacher' && isOwner) {
    return (
      <TeacherRail
        courseId={courseId}
        pendingGradingCount={pendingGradingCount}
        enrolledCount={enrolledCount}
      />
    );
  }
  return null;
}

function StudentRail({
  activities,
  statusByActivity,
  recentGrades,
  courseId,
}: {
  activities: Activity[];
  statusByActivity: Record<number, string>;
  recentGrades: RecentGrade[];
  courseId: number;
}) {
  const total = activities.length;
  const completed = activities.filter((a) => {
    const s = statusByActivity[a.id];
    return s === 'finished' || s === 'graded';
  }).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const now = Date.now();
  const upcoming = activities
    .filter((a) => a.due_date && new Date(a.due_date).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime(),
    )
    .slice(0, 3);

  return (
    <aside className={styles.rightRail} aria-label="진척도 패널">
      <section className={styles.railCard}>
        <p className={styles.railCardTitle}>진척도</p>
        <span className={styles.progressNumber}>{pct}%</span>
        <p className={styles.progressMeta}>
          {completed} / {total} 활동 완료
        </p>
        <div className={styles.progressBar}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className={styles.railCard}>
        <p className={styles.railCardTitle}>다가오는 마감</p>
        {upcoming.length === 0 ? (
          <p className={styles.railEmpty}>예정된 마감 없음</p>
        ) : (
          <ul className={styles.dueList}>
            {upcoming.map((a) => {
              const due = new Date(a.due_date!);
              const days = Math.ceil(
                (due.getTime() - now) / (1000 * 60 * 60 * 24),
              );
              return (
                <li key={a.id}>
                  <Link
                    href={`/courses/${courseId}/canvas?peek=${a.id}`}
                    scroll={false}
                    className={styles.dueItem}
                  >
                    <span>{a.title}</span>
                    <span
                      className={
                        days <= 3
                          ? `${styles.dueDate} ${styles.dueDateUrgent}`
                          : styles.dueDate
                      }
                    >
                      {due.toLocaleDateString('ko-KR')} · D-{days >= 0 ? days : 0}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.railCard}>
        <p className={styles.railCardTitle}>최근 성적</p>
        {recentGrades.length === 0 ? (
          <p className={styles.railEmpty}>아직 성적 없음</p>
        ) : (
          <ul className={styles.dueList}>
            {recentGrades.map((g) => {
              const grade = g.final_grade ?? g.raw_grade;
              return (
                <li key={g.activity_id} className={styles.gradeItem}>
                  <span className={styles.gradeName}>{g.item_name}</span>
                  <span className={styles.gradeValue}>
                    {grade != null ? Number(grade).toFixed(1) : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}

function TeacherRail({
  courseId,
  pendingGradingCount,
  enrolledCount,
}: {
  courseId: number;
  pendingGradingCount: number;
  enrolledCount: number;
}) {
  return (
    <aside className={styles.rightRail} aria-label="강사 패널">
      <section className={styles.railCard}>
        <p className={styles.railCardTitle}>코스 통계</p>
        <div className={styles.railStat}>
          <span className={styles.railStatLabel}>등록 학생</span>
          <span className={styles.railStatValue}>{enrolledCount}명</span>
        </div>
        <div className={styles.railStat}>
          <span className={styles.railStatLabel}>미채점</span>
          <span className={styles.railStatValue}>
            {pendingGradingCount}건
          </span>
        </div>
        <Link
          href={`/courses/${courseId}/grades`}
          className={styles.railLink}
        >
          성적표 보기 →
        </Link>
      </section>
    </aside>
  );
}
