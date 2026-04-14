import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './grades.module.css';

interface GradeRow {
  student_id: number;
  student_name: string;
  student_email: string;
  grade_item_id: number;
  item_name: string;
  grade_max: number;
  sort_order: number;
  final_grade: number | null;
}

interface StudentGrade {
  name: string;
  email: string;
  items: { item_name: string; grade_max: number; final_grade: number | null }[];
  earned: number;
  possible: number;
}

interface ItemAverage {
  item_name: string;
  grade_max: number;
  avg: number;
  count: number;
}

export default async function GradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courseId = Number(id);
  if (!courseId) notFound();

  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { role, id: userId } = session.user;

  // 코스 정보 확인
  const { rows: courseRows } = await sql`
    SELECT id, title, created_by FROM courses WHERE id = ${courseId}
  `;
  const course = courseRows[0];
  if (!course) notFound();

  // 접근 제어: 코스 소유 교수 또는 admin
  const isOwner = course.created_by === Number(userId);
  if (!(role === 'admin' || (role === 'teacher' && isOwner))) {
    redirect('/courses');
  }

  // 3개 독립 쿼리 병렬 실행
  const [{ rows }, { rows: itemRows }, { rows: enrollmentRows }] = await Promise.all([
    // 학생 × 성적항목 매트릭스
    sql`
      SELECT
        u.id AS student_id, u.name AS student_name, u.email AS student_email,
        gi.id AS grade_item_id, gi.item_name, gi.grade_max, gi.sort_order,
        gg.final_grade
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      CROSS JOIN grade_items gi
      LEFT JOIN grade_grades gg ON gg.grade_item_id = gi.id AND gg.user_id = u.id
      WHERE e.course_id = ${courseId} AND gi.course_id = ${courseId}
      ORDER BY u.name, gi.sort_order
    `,
    // 성적항목 목록
    sql`
      SELECT id, item_name, grade_max, sort_order
      FROM grade_items
      WHERE course_id = ${courseId}
      ORDER BY sort_order
    `,
    // 수강생 수
    sql`
      SELECT COUNT(*) AS count FROM enrollments WHERE course_id = ${courseId}
    `,
  ]);
  const studentCount = Number(enrollmentRows[0].count);

  // 데이터 변환: 학생별 그룹핑
  const studentMap = new Map<number, StudentGrade>();
  for (const row of rows as GradeRow[]) {
    if (!studentMap.has(row.student_id)) {
      studentMap.set(row.student_id, {
        name: row.student_name,
        email: row.student_email,
        items: [],
        earned: 0,
        possible: 0,
      });
    }
    const student = studentMap.get(row.student_id)!;
    student.items.push({
      item_name: row.item_name,
      grade_max: Number(row.grade_max),
      final_grade: row.final_grade !== null ? Number(row.final_grade) : null,
    });
    if (row.final_grade !== null) {
      student.earned += Number(row.final_grade);
    }
    student.possible += Number(row.grade_max);
  }

  const students = Array.from(studentMap.values());

  // 항목별 평균
  const itemAverages: ItemAverage[] = itemRows.map((item) => {
    const grades = (rows as GradeRow[])
      .filter((r) => r.grade_item_id === item.id && r.final_grade !== null)
      .map((r) => Number(r.final_grade));
    return {
      item_name: item.item_name,
      grade_max: Number(item.grade_max),
      avg: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
      count: grades.length,
    };
  });

  // 전체 평균
  const studentPercents = students
    .filter((s) => s.possible > 0)
    .map((s) => (s.earned / s.possible) * 100);
  const classAverage =
    studentPercents.length > 0
      ? studentPercents.reduce((a, b) => a + b, 0) / studentPercents.length
      : 0;

  const hasItems = itemRows.length > 0;

  return (
    <main className={styles.content}>
      <Link href={`/courses/${courseId}`} className={styles.backLink}>
        &larr; 코스로 돌아가기
      </Link>

      <header className={styles.header}>
        <h1>{course.title} &mdash; 성적표</h1>
        <p className={styles.subtitle}>수강생 성적 현황</p>
      </header>

      {!hasItems ? (
        <p className={styles.emptyState}>아직 성적 항목이 없습니다.</p>
      ) : (
        <>
          {/* 요약 통계 */}
          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>수강생</p>
              <p className={styles.statValue}>{studentCount}명</p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>성적 항목</p>
              <p className={styles.statValue}>{itemRows.length}개</p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>전체 평균</p>
              <p className={styles.statValue}>
                {studentPercents.length > 0 ? `${classAverage.toFixed(1)}%` : '-'}
              </p>
            </article>
          </section>

          {/* 항목별 평균 */}
          <h2 className={styles.sectionTitle}>항목별 평균</h2>
          <ul className={styles.itemList}>
            {itemAverages.map((item, i) => (
              <li key={i} className={styles.itemRow}>
                <span className={styles.itemName}>{item.item_name}</span>
                <span className={styles.itemAvg}>
                  {item.count > 0
                    ? `${item.avg.toFixed(1)} / ${item.grade_max}`
                    : `-`}
                </span>
                <span className={styles.itemCount}>{item.count}명 응시</span>
              </li>
            ))}
          </ul>

          {/* 학생별 성적 */}
          <h2 className={styles.sectionTitle}>학생별 성적</h2>
          {students.length === 0 ? (
            <p className={styles.emptyState}>수강 등록된 학생이 없습니다.</p>
          ) : (
            <section className={styles.studentList}>
              {students.map((student, i) => {
                const percent =
                  student.possible > 0
                    ? ((student.earned / student.possible) * 100).toFixed(1)
                    : '-';
                return (
                  <article key={i} className={styles.studentCard}>
                    <div className={styles.studentHeader}>
                      <div>
                        <span className={styles.studentName}>{student.name}</span>
                        <span className={styles.studentEmail}>{student.email}</span>
                      </div>
                      <span className={styles.studentPercent}>
                        {percent !== '-' ? `${percent}%` : '-'}
                      </span>
                    </div>
                    <ul className={styles.gradeList}>
                      {student.items.map((item, j) => (
                        <li key={j} className={styles.gradeRow}>
                          <span className={styles.gradeName}>{item.item_name}</span>
                          {item.final_grade !== null ? (
                            <span className={styles.gradeValue}>
                              {item.final_grade} / {item.grade_max}
                            </span>
                          ) : (
                            <span className={styles.gradeNotAttempted}>미응시</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
}
