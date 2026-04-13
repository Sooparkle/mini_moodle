import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { SectionManager } from './SectionManager';
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

      {canEdit ? (
        <SectionManager
          courseId={courseId}
          initialSections={sections}
          activitiesBySection={activitiesBySection}
        />
      ) : (
        <ReadOnlySections
          sections={sections}
          activitiesBySection={activitiesBySection}
        />
      )}
    </main>
  );
}

function ReadOnlySections({
  sections,
  activitiesBySection,
}: {
  sections: Section[];
  activitiesBySection: Record<number, Activity[]>;
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
          <ActivityList activities={activitiesBySection[section.id] || []} />
        </article>
      ))}
    </div>
  );
}

function ActivityList({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <p className={styles.noActivities}>등록된 활동이 없습니다.</p>
    );
  }

  return (
    <ul className={styles.activityList}>
      {activities.map((a) => (
        <li key={a.id} className={styles.activityItem}>
          <span className={styles.typeBadge} data-type={a.type}>
            {a.type === 'quiz' ? '퀴즈' : '과제'}
          </span>
          <span className={styles.activityTitle}>{a.title}</span>
          {a.due_date && (
            <span className={styles.dueDate}>
              마감: {new Date(a.due_date).toLocaleDateString('ko-KR')}
            </span>
          )}
          {!a.is_visible && (
            <span className={styles.hiddenBadge}>숨김</span>
          )}
        </li>
      ))}
    </ul>
  );
}
