import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ViewToggle } from '../ViewToggle';
import { EnrollButton } from '../EnrollButton';
import { ModelessSectionEditor } from './ModelessSectionEditor';
import { ModelessReadOnly } from './ModelessReadOnly';
import { StudentPreviewToggle } from './StudentPreviewToggle';
import courseStyles from '../course-detail.module.css';
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

export default async function ModelessCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { id } = await params;
  const { as: viewAs } = await searchParams;
  const courseId = Number(id);
  if (isNaN(courseId)) notFound();

  const session = (await getServerSession(authOptions))!;
  const { role, id: userId } = session.user;
  const isStudent = role === 'student';

  const [courseResult, sectionsResult, activitiesResult, enrollmentResult] =
    await Promise.all([
      sql`
        SELECT c.*, u.name AS teacher_name
        FROM courses c
        JOIN users u ON u.id = c.created_by
        WHERE c.id = ${courseId}
      `,
      sql`
        SELECT * FROM sections
        WHERE course_id = ${courseId}
        ORDER BY sort_order
      `,
      sql`
        SELECT a.* FROM activities a
        JOIN sections s ON s.id = a.section_id
        WHERE s.course_id = ${courseId}
        ORDER BY s.sort_order, a.sort_order
      `,
      sql`
        SELECT 1 FROM enrollments
        WHERE user_id = ${Number(userId)} AND course_id = ${courseId}
      `,
    ]);

  const course = courseResult.rows[0];
  if (!course) notFound();

  const isOwner = course.created_by === Number(userId);
  const isEnrolled = enrollmentResult.rows.length > 0;

  if (isStudent && !course.is_published && !isEnrolled) {
    redirect('/courses');
  }

  const sections = sectionsResult.rows as Section[];
  const activities = activitiesResult.rows as Activity[];

  const activitiesBySection: Record<number, Activity[]> = {};
  for (const a of activities) {
    if (!activitiesBySection[a.section_id]) {
      activitiesBySection[a.section_id] = [];
    }
    activitiesBySection[a.section_id].push(a);
  }

  const isTeacherOwner = role === 'teacher' && isOwner;
  const previewAsStudent = isTeacherOwner && viewAs === 'student';
  const editable = isTeacherOwner && !previewAsStudent;

  // 학생(또는 학생 미리보기) 상태 배지
  let statusByActivity: Record<number, string> = {};
  if (isStudent || previewAsStudent) {
    const targetUserId = isStudent ? Number(userId) : null;
    if (targetUserId !== null) {
      const [quizStatusResult, assignmentStatusResult] = await Promise.all([
        sql`
          SELECT a.id AS activity_id,
            COALESCE(
              (SELECT qa.state FROM quiz_attempts qa
               WHERE qa.activity_id = a.id AND qa.user_id = ${targetUserId}
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
            ON asub.activity_id = a.id AND asub.user_id = ${targetUserId}
          LEFT JOIN grade_items gi ON gi.activity_id = a.id
          LEFT JOIN grade_grades gg
            ON gg.grade_item_id = gi.id AND gg.user_id = ${targetUserId}
          WHERE s.course_id = ${courseId} AND a.type = 'assignment'
            AND s.is_visible = true AND a.is_visible = true
        `,
      ]);

      for (const row of [
        ...quizStatusResult.rows,
        ...assignmentStatusResult.rows,
      ]) {
        statusByActivity[row.activity_id] = row.status;
      }
    }
  }

  return (
    <main className={courseStyles.content}>
      <div className={courseStyles.topRow}>
        <Link href="/courses" className={courseStyles.backLink}>
          &larr; 코스 목록
        </Link>
        <ViewToggle courseId={courseId} current="modeless" />
      </div>

      {previewAsStudent && (
        <aside className={styles.previewBanner} role="status">
          <span>학생 시점으로 보고 있습니다</span>
          <Link href={`/courses/${courseId}/modeless`} className={styles.previewExit}>
            편집으로 돌아가기 &rarr;
          </Link>
        </aside>
      )}

      <header className={courseStyles.courseHeader}>
        <div className={courseStyles.headerTop}>
          <h1>{course.title}</h1>
          {!course.is_published && (
            <span className={courseStyles.badge}>비공개</span>
          )}
          {isTeacherOwner && (
            <StudentPreviewToggle
              courseId={courseId}
              previewing={previewAsStudent}
            />
          )}
        </div>
        <p className={courseStyles.shortName}>{course.short_name}</p>
        {course.description && (
          <p className={courseStyles.description}>{course.description}</p>
        )}
        <div className={courseStyles.metaRow}>
          <span>담당: {course.teacher_name}</span>
          {course.start_date && (
            <span>
              {course.start_date.toLocaleDateString('ko-KR')}
              {course.end_date &&
                ` ~ ${course.end_date.toLocaleDateString('ko-KR')}`}
            </span>
          )}
        </div>
      </header>

      {isStudent && !isEnrolled && course.is_published && (
        <section className={courseStyles.enrollBanner}>
          <p>이 코스의 활동에 참여하려면 수강 등록이 필요합니다.</p>
          <EnrollButton courseId={courseId} />
        </section>
      )}

      {editable ? (
        <ModelessSectionEditor
          courseId={courseId}
          initialSections={sections}
          activitiesBySection={activitiesBySection}
        />
      ) : (
        <ModelessReadOnly
          sections={sections}
          activitiesBySection={activitiesBySection}
          statusByActivity={statusByActivity}
        />
      )}
    </main>
  );
}
