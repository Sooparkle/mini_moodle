import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
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
    SELECT c.id, c.title, c.short_name
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ${userId}
    ORDER BY e.enrolled_at DESC
  `;

  return (
    <main className={styles.content}>
      <h1 className={styles.heading}>{name}님의 대시보드</h1>
      <p className={styles.subheading}>수강 중인 코스</p>
      {courses.length === 0 ? (
        <p className={styles.emptyState}>수강 중인 코스가 없습니다.</p>
      ) : (
        <section className={styles.cardGrid}>
          {courses.map((c) => (
            <article key={c.id} className={styles.card}>
              <h3>{c.title}</h3>
              <p>{c.short_name}</p>
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
