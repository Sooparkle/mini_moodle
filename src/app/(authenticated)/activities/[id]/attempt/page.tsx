import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { QuizPlayer } from './QuizPlayer';
import styles from './quiz-attempt.module.css';

interface QuestionWithAnswer {
  question_attempt_id: number;
  question_id: number;
  question_text: string;
  options: string[];
  sort_order: number;
  current_answer: string | null;
}

export default async function QuizAttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activityId = Number(id);
  if (isNaN(activityId)) notFound();

  const session = (await getServerSession(authOptions))!;
  const { role, id: userId } = session.user;

  if (role !== 'student') redirect(`/activities/${activityId}`);

  // 활동 확인
  const { rows: actRows } = await sql`
    SELECT a.*, s.course_id, c.title AS course_title
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId} AND a.type = 'quiz'
  `;
  if (actRows.length === 0) notFound();
  const activity = actRows[0];

  // 수강 등록 확인
  const { rows: enrollRows } = await sql`
    SELECT 1 FROM enrollments WHERE user_id = ${Number(userId)} AND course_id = ${activity.course_id}
  `;
  if (enrollRows.length === 0) redirect('/courses');

  // 기존 시도 확인
  const { rows: attempts } = await sql`
    SELECT id, state FROM quiz_attempts
    WHERE activity_id = ${activityId} AND user_id = ${Number(userId)}
    ORDER BY started_at DESC LIMIT 1
  `;

  // 완료된 시도가 있으면 결과 페이지로
  if (attempts[0]?.state === 'finished') {
    redirect(`/activities/${activityId}/result`);
  }

  let attemptId: number;

  if (attempts[0]?.state === 'inprogress') {
    attemptId = attempts[0].id;
  } else {
    // 새 시도 생성 (server action 호출 대신 직접 생성)
    const { startQuizAttempt } = await import('@/app/actions/quiz');
    const fd = new FormData();
    fd.set('activity_id', String(activityId));
    const result = await startQuizAttempt(fd);
    if (!result.success) {
      return (
        <main className={styles.content}>
          <Link href={`/activities/${activityId}`} className={styles.backLink}>
            &larr; 돌아가기
          </Link>
          <p className={styles.error}>{result.error}</p>
        </main>
      );
    }
    attemptId = result.id!;
  }

  // 문제 + 답변 조회
  const { rows: questions } = await sql`
    SELECT qa.id AS question_attempt_id, qq.id AS question_id,
      qq.question_text, qq.options, qq.sort_order,
      qa.current_answer
    FROM question_attempts qa
    JOIN quiz_questions qq ON qq.id = qa.question_id
    WHERE qa.quiz_attempt_id = ${attemptId}
    ORDER BY qq.sort_order
  `;

  return (
    <main className={styles.content}>
      <Link href={`/activities/${activityId}`} className={styles.backLink}>
        &larr; {activity.title}
      </Link>

      <QuizPlayer
        activityId={activityId}
        attemptId={attemptId}
        questions={questions as QuestionWithAnswer[]}
      />
    </main>
  );
}
