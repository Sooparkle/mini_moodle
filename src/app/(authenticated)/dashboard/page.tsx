import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import Link from 'next/link';
import styles from './dashboard.module.css';

export default async function DashboardPage() {
  const session = (await getServerSession(authOptions))!;
  const { role, name, id } = session.user;

  if (role === 'admin') {
    return <AdminDashboard />;
  }
  if (role === 'teacher') {
    return <TeacherDashboard userId={Number(id)} name={name} />;
  }
  return <StudentDashboard userId={Number(id)} name={name} />;
}

async function AdminDashboard() {
  const { rows: stats } = await sql`
    SELECT
      (SELECT COUNT(*) FROM users) AS user_count,
      (SELECT COUNT(*) FROM courses) AS course_count,
      (SELECT COUNT(*) FROM enrollments) AS enrollment_count
  `;
  const s = stats[0];

  return (
    <main className={styles.content}>
      <h1 className={styles.heading}>관리자 대시보드</h1>
      <p className={styles.subheading}>시스템 현황</p>
      <section className={styles.cardGrid}>
        <article className={styles.card}>
          <h3>사용자</h3>
          <p>{s.user_count}명</p>
        </article>
        <article className={styles.card}>
          <h3>코스</h3>
          <p>{s.course_count}개</p>
        </article>
        <article className={styles.card}>
          <h3>수강등록</h3>
          <p>{s.enrollment_count}건</p>
        </article>
      </section>
      <p className={styles.viewAll}>
        <Link href="/courses">코스 전체 보기 →</Link>
      </p>
    </main>
  );
}

async function TeacherDashboard({ userId, name }: { userId: number; name: string }) {
  const { rows: courses } = await sql`
    SELECT id, title, short_name, is_published,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count
    FROM courses c
    WHERE c.created_by = ${userId}
    ORDER BY c.created_at DESC
  `;

  return (
    <main className={styles.content}>
      <h1 className={styles.heading}>{name} 교수님</h1>
      <p className={styles.subheading}>내 코스 관리</p>
      {courses.length === 0 ? (
        <p className={styles.emptyState}>아직 생성한 코스가 없습니다.</p>
      ) : (
        <section className={styles.cardGrid}>
          {courses.map((c) => (
            <article key={c.id} className={styles.card}>
              <h3>{c.title}</h3>
              <p>
                {c.short_name} · 수강생 {c.student_count}명
                {c.is_published ? '' : ' · 비공개'}
              </p>
            </article>
          ))}
        </section>
      )}
      <p className={styles.viewAll}>
        <Link href="/courses">코스 전체 보기 →</Link>
      </p>
    </main>
  );
}

async function StudentDashboard({ userId, name }: { userId: number; name: string }) {
  const { rows: courses } = await sql`
    SELECT
      c.id, c.title, c.short_name,
      COALESCE(g.earned, 0) AS total_earned,
      COALESCE(g.possible, 0) AS total_possible,
      COALESCE(g.graded_count, 0) AS graded_count,
      COALESCE(g.total_items, 0) AS total_items
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN LATERAL (
      SELECT
        SUM(gg.final_grade) AS earned,
        SUM(gi.grade_max) AS possible,
        COUNT(gg.id) AS graded_count,
        COUNT(gi.id) AS total_items
      FROM grade_items gi
      LEFT JOIN grade_grades gg ON gg.grade_item_id = gi.id AND gg.user_id = e.user_id
      WHERE gi.course_id = c.id
    ) g ON true
    WHERE e.user_id = ${userId}
    ORDER BY e.enrolled_at DESC
  `;

  interface CourseWithGrade {
    id: number;
    title: string;
    short_name: string;
    total_earned: number;
    total_possible: number;
    graded_count: number;
    total_items: number;
  }
  const typedCourses = courses as unknown as CourseWithGrade[];

  // 전체 평균 계산
  const totalEarned = typedCourses.reduce((sum, c) => sum + Number(c.total_earned), 0);
  const totalPossible = typedCourses.reduce((sum, c) => sum + Number(c.total_possible), 0);
  const overallPercent = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : null;
  const hasAnyGrades = typedCourses.some((c) => Number(c.graded_count) > 0);

  return (
    <main className={styles.content}>
      <h1 className={styles.heading}>{name}님의 대시보드</h1>
      <p className={styles.subheading}>수강 중인 코스</p>

      {hasAnyGrades && (
        <section className={styles.overallCard}>
          <span className={styles.overallLabel}>총 평균</span>
          <span className={styles.overallValue}>
            {overallPercent !== null ? `${overallPercent.toFixed(1)}%` : '-'}
          </span>
        </section>
      )}

      {courses.length === 0 ? (
        <p className={styles.emptyState}>수강 중인 코스가 없습니다.</p>
      ) : (
        <section className={styles.cardGrid}>
          {typedCourses.map((c) => {
            const possible = Number(c.total_possible);
            const earned = Number(c.total_earned);
            const graded = Number(c.graded_count);
            const total = Number(c.total_items);
            const percent = possible > 0 ? ((earned / possible) * 100).toFixed(1) : null;

            return (
              <Link key={c.id} href={`/courses/${c.id}`} className={styles.cardLink}>
                <article className={styles.card}>
                  <h3>{c.title}</h3>
                  <p>{c.short_name}</p>
                  {total > 0 && (
                    <p className={styles.gradeInfo}>
                      {percent !== null ? `${percent}%` : '-'}
                      <span className={styles.gradeDetail}>
                        ({graded}/{total} 항목 채점됨)
                      </span>
                    </p>
                  )}
                </article>
              </Link>
            );
          })}
        </section>
      )}
      <p className={styles.viewAll}>
        <Link href="/courses">코스 전체 보기 →</Link>
      </p>
    </main>
  );
}
