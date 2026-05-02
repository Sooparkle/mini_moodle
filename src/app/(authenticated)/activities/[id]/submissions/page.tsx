import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { SubmissionGrader } from './SubmissionGrader';
import styles from './submissions.module.css';

interface Submission {
  id: number;
  activity_id: number;
  user_id: number;
  submission_text: string;
  submitted_at: string;
  updated_at: string;
  student_name: string;
  student_email: string;
  raw_grade: number | null;
  final_grade: number | null;
  feedback: string | null;
  grade_max: number;
}

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activityId = Number(id);
  if (isNaN(activityId)) notFound();

  const session = (await getServerSession(authOptions))!;
  const { role, id: userId } = session.user;

  // 활동 + 소유자 확인
  const { rows: actRows } = await sql`
    SELECT a.*, s.course_id, c.created_by, c.title AS course_title
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId}
  `;
  if (actRows.length === 0) notFound();
  const activity = actRows[0];

  if (role !== 'teacher' || activity.created_by !== Number(userId)) {
    redirect(`/activities/${activityId}`);
  }

  // 제출물 + 성적 조회
  const { rows: submissions } = await sql`
    SELECT asub.*, u.name AS student_name, u.email AS student_email,
           gg.raw_grade, gg.final_grade, gg.feedback,
           gi.grade_max
    FROM assignment_submissions asub
    JOIN users u ON u.id = asub.user_id
    LEFT JOIN grade_items gi ON gi.activity_id = asub.activity_id
    LEFT JOIN grade_grades gg ON gg.grade_item_id = gi.id AND gg.user_id = asub.user_id
    WHERE asub.activity_id = ${activityId}
    ORDER BY asub.submitted_at
  `;

  return (
    <main className={styles.content}>
      <Link href={`/activities/${activityId}`} className={styles.backLink}>
        &larr; {activity.title}
      </Link>

      <div className={styles.header}>
        <h1>제출물 / 채점</h1>
        <p className={styles.subtitle}>{submissions.length}명 제출</p>
      </div>

      {submissions.length === 0 ? (
        <p className={styles.emptyState}>아직 제출된 과제가 없습니다.</p>
      ) : (
        <div className={styles.submissionList}>
          {(submissions as Submission[]).map((sub) => (
            <article key={sub.id} className={styles.submissionCard}>
              <div className={styles.submissionHeader}>
                <div>
                  <span className={styles.studentName}>{sub.student_name}</span>
                  <span className={styles.studentEmail}>{sub.student_email}</span>
                </div>
                <span className={styles.submittedAt}>
                  {new Date(sub.submitted_at).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className={styles.submissionText}>{sub.submission_text}</div>
              <SubmissionGrader
                activityId={activityId}
                studentUserId={sub.user_id}
                gradeMax={sub.grade_max || 100}
                currentGrade={sub.final_grade}
                currentFeedback={sub.feedback}
              />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
