import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { EnrollButton } from '../EnrollButton';
import { ViewToggle } from '../ViewToggle';
import { RoleToggle } from '../RoleToggle';
import { CourseIndex } from './CourseIndex';
import { SectionCanvas } from './SectionCanvas';
import { RightRail } from './RightRail';
import { ActivityPeek } from './ActivityPeek';
import {
  parseRoleOverride,
  effectiveRole,
  computeCanEdit,
} from '@/lib/role-override';
import styles from './canvas.module.css';

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

export interface RecentGrade {
  activity_id: number;
  type: string;
  item_name: string;
  raw_grade: number | null;
  final_grade: number | null;
}

export default async function CourseCanvasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ peek?: string; role?: string }>;
}) {
  const { id } = await params;
  const { peek, role: roleParam } = await searchParams;
  const courseId = Number(id);
  if (isNaN(courseId)) notFound();

  const session = (await getServerSession(authOptions))!;
  const { role: sessionRole, id: userId } = session.user;
  const roleOverride = parseRoleOverride(roleParam);
  const role = effectiveRole(sessionRole, roleOverride);
  const userIdNum = Number(userId);
  const isStudent = role === 'student';

  const [courseResult, sectionsResult, activitiesResult, enrollmentResult] =
    await Promise.all([
      sql`
        SELECT c.*, u.name AS teacher_name
        FROM courses c
        JOIN users u ON u.id = c.created_by
        WHERE c.id = ${courseId}
      `,
      isStudent
        ? sql`
            SELECT * FROM sections
            WHERE course_id = ${courseId} AND is_visible = true
            ORDER BY sort_order
          `
        : sql`
            SELECT * FROM sections
            WHERE course_id = ${courseId}
            ORDER BY sort_order
          `,
      isStudent
        ? sql`
            SELECT a.* FROM activities a
            JOIN sections s ON s.id = a.section_id
            WHERE s.course_id = ${courseId}
              AND s.is_visible = true
              AND a.is_visible = true
            ORDER BY s.sort_order, a.sort_order
          `
        : sql`
            SELECT a.* FROM activities a
            JOIN sections s ON s.id = a.section_id
            WHERE s.course_id = ${courseId}
            ORDER BY s.sort_order, a.sort_order
          `,
      sql`
        SELECT 1 FROM enrollments
        WHERE user_id = ${userIdNum} AND course_id = ${courseId}
      `,
    ]);

  const course = courseResult.rows[0];
  if (!course) notFound();

  const isOwner = course.created_by === userIdNum;
  const isEnrolled = enrollmentResult.rows.length > 0;

  if (isStudent && !course.is_published && !isEnrolled) {
    redirect('/courses');
  }

  const sections = sectionsResult.rows as Section[];
  const activities = activitiesResult.rows as Activity[];

  const activitiesBySection: Record<number, Activity[]> = {};
  for (const a of activities) {
    (activitiesBySection[a.section_id] ??= []).push(a);
  }

  const canEdit = computeCanEdit(sessionRole, role, isOwner);

  let statusByActivity: Record<number, string> = {};
  let recentGrades: RecentGrade[] = [];
  let pendingGradingCount = 0;
  let enrolledCount = 0;

  if (isStudent) {
    const [quizStatusResult, assignmentStatusResult, recentGradesResult] =
      await Promise.all([
        sql`
          SELECT a.id AS activity_id,
            COALESCE(
              (SELECT qa.state FROM quiz_attempts qa
               WHERE qa.activity_id = a.id AND qa.user_id = ${userIdNum}
               ORDER BY qa.started_at DESC LIMIT 1),
              'not_attempted'
            ) AS status
          FROM activities a
          JOIN sections s ON s.id = a.section_id
          WHERE s.course_id = ${courseId} AND a.type = 'quiz'
            AND s.is_visible = true AND a.is_visible = true
        `,
        sql`
          SELECT a.id AS activity_id,
            CASE
              WHEN gg.id IS NOT NULL THEN 'graded'
              WHEN asub.id IS NOT NULL THEN 'submitted'
              ELSE 'not_attempted'
            END AS status
          FROM activities a
          JOIN sections s ON s.id = a.section_id
          LEFT JOIN assignment_submissions asub
            ON asub.activity_id = a.id AND asub.user_id = ${userIdNum}
          LEFT JOIN grade_items gi ON gi.activity_id = a.id
          LEFT JOIN grade_grades gg
            ON gg.grade_item_id = gi.id AND gg.user_id = ${userIdNum}
          WHERE s.course_id = ${courseId} AND a.type = 'assignment'
            AND s.is_visible = true AND a.is_visible = true
        `,
        sql`
          SELECT a.id AS activity_id, a.type, gi.item_name,
                 gg.raw_grade, gg.final_grade
          FROM grade_grades gg
          JOIN grade_items gi ON gi.id = gg.grade_item_id
          JOIN activities a ON a.id = gi.activity_id
          WHERE gg.user_id = ${userIdNum} AND gi.course_id = ${courseId}
          ORDER BY gg.time_modified DESC
          LIMIT 3
        `,
      ]);

    for (const row of [...quizStatusResult.rows, ...assignmentStatusResult.rows]) {
      statusByActivity[row.activity_id] = row.status;
    }
    recentGrades = recentGradesResult.rows as RecentGrade[];
  } else if (canEdit) {
    const [pendingResult, enrolledResult] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS pending
        FROM assignment_submissions asub
        JOIN activities a ON a.id = asub.activity_id
        JOIN sections s ON s.id = a.section_id
        LEFT JOIN grade_items gi ON gi.activity_id = a.id
        LEFT JOIN grade_grades gg
          ON gg.grade_item_id = gi.id AND gg.user_id = asub.user_id
        WHERE s.course_id = ${courseId} AND gg.id IS NULL
      `,
      sql`
        SELECT COUNT(*)::int AS enrolled
        FROM enrollments WHERE course_id = ${courseId}
      `,
    ]);
    pendingGradingCount = pendingResult.rows[0]?.pending ?? 0;
    enrolledCount = enrolledResult.rows[0]?.enrolled ?? 0;
  }

  const peekActivity = peek
    ? activities.find((a) => a.id === Number(peek)) ?? null
    : null;

  return (
    <main className={styles.page}>
      <header className={styles.courseHeader}>
        <div className={styles.headerTop}>
          <Link href="/courses" className={styles.backLink}>
            ← 코스 목록
          </Link>
          <div className={styles.headerActions}>
            <RoleToggle sessionRole={sessionRole} current={role} />
            <ViewToggle courseId={courseId} current="canvas" />
          </div>
        </div>
        <div className={styles.headerTitle}>
          <h1>{course.title}</h1>
          {!course.is_published && (
            <span className={styles.badge}>비공개</span>
          )}
        </div>
        <p className={styles.shortName}>{course.short_name}</p>
        {course.description && (
          <p className={styles.description}>{course.description}</p>
        )}
        <div className={styles.metaRow}>
          <span>담당: {course.teacher_name}</span>
          {course.start_date && (
            <span>
              {new Date(course.start_date).toLocaleDateString('ko-KR')}
              {course.end_date &&
                ` ~ ${new Date(course.end_date).toLocaleDateString('ko-KR')}`}
            </span>
          )}
        </div>
      </header>

      {isStudent && !isEnrolled && course.is_published && (
        <section className={styles.enrollBanner}>
          <p>이 코스의 활동에 참여하려면 수강 등록이 필요합니다.</p>
          <EnrollButton courseId={courseId} />
        </section>
      )}

      <div className={styles.grid}>
        <CourseIndex
          sections={sections}
          activitiesBySection={activitiesBySection}
          statusByActivity={statusByActivity}
        />

        <SectionCanvas
          courseId={courseId}
          sections={sections}
          activitiesBySection={activitiesBySection}
          statusByActivity={statusByActivity}
          canEdit={canEdit}
        />

        <RightRail
          role={role}
          isOwner={isOwner}
          courseId={courseId}
          activities={activities}
          statusByActivity={statusByActivity}
          recentGrades={recentGrades}
          pendingGradingCount={pendingGradingCount}
          enrolledCount={enrolledCount}
        />
      </div>

      <ActivityPeek activity={peekActivity} courseId={courseId} />
    </main>
  );
}
