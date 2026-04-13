import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { SectionManager } from './SectionManager';
import { EnrollButton } from './EnrollButton';
import styles from './course-detail.module.css';

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

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const canEdit = role === 'teacher' && isOwner;

  // 학생용 상태 배지 데이터
  let statusByActivity: Record<number, string> = {};
  if (isStudent) {
    const [quizStatusResult, assignmentStatusResult] = await Promise.all([
      sql`
        SELECT a.id AS activity_id,
          COALESCE(
            (SELECT qa.state FROM quiz_attempts qa
             WHERE qa.activity_id = a.id AND qa.user_id = ${Number(userId)}
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
          ON asub.activity_id = a.id AND asub.user_id = ${Number(userId)}
        LEFT JOIN grade_items gi ON gi.activity_id = a.id
        LEFT JOIN grade_grades gg
          ON gg.grade_item_id = gi.id AND gg.user_id = ${Number(userId)}
        WHERE s.course_id = ${courseId} AND a.type = 'assignment'
          AND s.is_visible = true AND a.is_visible = true
      `,
    ]);

    for (const row of [...quizStatusResult.rows, ...assignmentStatusResult.rows]) {
      statusByActivity[row.activity_id] = row.status;
    }
  }

  return (
    <main className={styles.content}>
      <Link href="/courses" className={styles.backLink}>
        &larr; 코스 목록
      </Link>

      <header className={styles.courseHeader}>
        <div className={styles.headerTop}>
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
              {course.start_date.toLocaleDateString('ko-KR')}
              {course.end_date &&
                ` ~ ${course.end_date.toLocaleDateString('ko-KR')}`}
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

      {canEdit ? (
        <>
          <div className={styles.courseActions}>
            <Link href={`/courses/${courseId}/grades`} className={styles.gradesLink}>
              성적표 보기 &rarr;
            </Link>
          </div>
          <SectionManager
            courseId={courseId}
            initialSections={sections}
            activitiesBySection={activitiesBySection}
          />
        </>
      ) : (
        <ReadOnlySections
          sections={sections}
          activitiesBySection={activitiesBySection}
          statusByActivity={statusByActivity}
        />
      )}
    </main>
  );
}

const STATUS_LABELS: Record<string, string> = {
  not_attempted: '미응시',
  inprogress: '진행중',
  finished: '완료',
  submitted: '제출됨',
  graded: '채점됨',
};

function ReadOnlySections({
  sections,
  activitiesBySection,
  statusByActivity,
}: {
  sections: Section[];
  activitiesBySection: Record<number, Activity[]>;
  statusByActivity: Record<number, string>;
}) {
  if (sections.length === 0) {
    return <p className={styles.emptyState}>등록된 섹션이 없습니다.</p>;
  }

  return (
    <div className={styles.sectionList}>
      {sections.map((section) => (
        <article key={section.id} className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>
              <span className={styles.weekBadge}>{section.week_number}주차</span>
              {section.title}
            </h2>
            {!section.is_visible && (
              <span className={styles.hiddenBadge}>숨김</span>
            )}
          </div>
          {section.description && (
            <p className={styles.sectionDesc}>{section.description}</p>
          )}
          <ActivityList
            activities={activitiesBySection[section.id] || []}
            statusByActivity={statusByActivity}
          />
        </article>
      ))}
    </div>
  );
}

function ActivityList({
  activities,
  statusByActivity,
}: {
  activities: Activity[];
  statusByActivity: Record<number, string>;
}) {
  if (activities.length === 0) {
    return (
      <p className={styles.noActivities}>등록된 활동이 없습니다.</p>
    );
  }

  return (
    <ul className={styles.activityList}>
      {activities.map((a) => {
        const status = statusByActivity[a.id];
        return (
          <li key={a.id} className={styles.activityItem}>
            <span className={styles.typeBadge} data-type={a.type}>
              {a.type === 'quiz' ? '퀴즈' : '과제'}
            </span>
            <Link href={`/activities/${a.id}`} className={styles.activityLink}>
              {a.title}
            </Link>
            {status && (
              <span className={styles.statusBadge} data-status={status}>
                {STATUS_LABELS[status] || status}
              </span>
            )}
            {a.due_date && (
              <span className={styles.dueDate}>
                마감: {new Date(a.due_date).toLocaleDateString('ko-KR')}
              </span>
            )}
            {!a.is_visible && (
              <span className={styles.hiddenBadge}>숨김</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
