import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import Link from 'next/link';
import styles from './courses.module.css';

export default async function CoursesPage() {
  const session = (await getServerSession(authOptions))!;
  const { role, id } = session.user;

  if (role === 'admin') {
    return <AdminCourseList />;
  }
  if (role === 'teacher') {
    return <TeacherCourseList userId={Number(id)} />;
  }
  return <StudentCourseList userId={Number(id)} />;
}

async function AdminCourseList() {
  const { rows: courses } = await sql`
    SELECT c.id, c.title, c.short_name, c.is_published,
           u.name AS teacher_name,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count
    FROM courses c
    JOIN users u ON u.id = c.created_by
    ORDER BY c.created_at DESC
  `;

  return (
    <main className={styles.content}>
      <h1 className={styles.heading}>전체 코스</h1>
      <p className={styles.subheading}>시스템에 등록된 모든 코스</p>
      {courses.length === 0 ? (
        <p className={styles.emptyState}>등록된 코스가 없습니다.</p>
      ) : (
        <section className={styles.cardGrid}>
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`} className={styles.cardLink}>
              <article className={styles.card}>
                <h3>{c.title}</h3>
                <p className={styles.shortName}>{c.short_name}</p>
                <p className={styles.meta}>
                  {c.teacher_name} · 수강생 {c.student_count}명
                </p>
                {!c.is_published && <span className={styles.badge}>비공개</span>}
              </article>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

async function TeacherCourseList({ userId }: { userId: number }) {
  const { rows: courses } = await sql`
    SELECT c.id, c.title, c.short_name, c.is_published,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count
    FROM courses c
    WHERE c.created_by = ${userId}
    ORDER BY c.created_at DESC
  `;

  return (
    <main className={styles.content}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>내 코스</h1>
        <Link href="/courses/new" className={styles.ctaButton}>
          + 새 코스
        </Link>
      </div>
      <p className={styles.subheading}>내가 생성한 코스 관리</p>
      {courses.length === 0 ? (
        <p className={styles.emptyState}>아직 생성한 코스가 없습니다.</p>
      ) : (
        <section className={styles.cardGrid}>
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`} className={styles.cardLink}>
              <article className={styles.card}>
                <h3>{c.title}</h3>
                <p className={styles.shortName}>{c.short_name}</p>
                <p className={styles.meta}>수강생 {c.student_count}명</p>
                {!c.is_published && <span className={styles.badge}>비공개</span>}
              </article>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

async function StudentCourseList({ userId }: { userId: number }) {
  const { rows: enrolled } = await sql`
    SELECT c.id, c.title, c.short_name,
           u.name AS teacher_name
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    JOIN users u ON u.id = c.created_by
    WHERE e.user_id = ${userId}
    ORDER BY e.enrolled_at DESC
  `;

  const { rows: available } = await sql`
    SELECT c.id, c.title, c.short_name,
           u.name AS teacher_name,
           (SELECT COUNT(*) FROM enrollments e2 WHERE e2.course_id = c.id) AS student_count
    FROM courses c
    JOIN users u ON u.id = c.created_by
    WHERE c.is_published = true
      AND c.id NOT IN (SELECT course_id FROM enrollments WHERE user_id = ${userId})
    ORDER BY c.created_at DESC
  `;

  return (
    <main className={styles.content}>
      <h1 className={styles.heading}>코스</h1>
      <p className={styles.subheading}>수강 중인 코스와 수강 가능한 코스</p>

      <h2 className={styles.sectionTitle}>내 코스</h2>
      {enrolled.length === 0 ? (
        <p className={styles.emptyState}>수강 중인 코스가 없습니다.</p>
      ) : (
        <section className={styles.cardGrid}>
          {enrolled.map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`} className={styles.cardLink}>
              <article className={styles.card}>
                <h3>{c.title}</h3>
                <p className={styles.shortName}>{c.short_name}</p>
                <p className={styles.meta}>{c.teacher_name}</p>
              </article>
            </Link>
          ))}
        </section>
      )}

      <div className={styles.sectionDivider}>
        <h2 className={styles.sectionTitle}>수강 가능한 코스</h2>
        {available.length === 0 ? (
          <p className={styles.emptyState}>현재 수강 가능한 코스가 없습니다.</p>
        ) : (
          <section className={styles.cardGrid}>
            {available.map((c) => (
              <Link key={c.id} href={`/courses/${c.id}`} className={styles.cardLink}>
                <article className={styles.card}>
                  <h3>{c.title}</h3>
                  <p className={styles.shortName}>{c.short_name}</p>
                  <p className={styles.meta}>
                    {c.teacher_name} · 수강생 {c.student_count}명
                  </p>
                </article>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
