import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { QuestionManager } from './QuestionManager';
import styles from './quiz-edit.module.css';

interface Question {
  id: number;
  activity_id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  sort_order: number;
}

export default async function QuizEditPage({
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
  if (activity.type !== 'quiz') {
    redirect(`/activities/${activityId}`);
  }

  // 문제 목록
  const { rows: questions } = await sql`
    SELECT * FROM quiz_questions
    WHERE activity_id = ${activityId}
    ORDER BY sort_order
  `;

  return (
    <main className={styles.content}>
      <Link href={`/activities/${activityId}`} className={styles.backLink}>
        &larr; {activity.title}
      </Link>

      <div className={styles.header}>
        <h1>문제 편집</h1>
      </div>

      <QuestionManager
        activityId={activityId}
        initialQuestions={questions as Question[]}
      />
    </main>
  );
}
