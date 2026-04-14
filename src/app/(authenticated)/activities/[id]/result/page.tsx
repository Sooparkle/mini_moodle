import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './quiz-result.module.css';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export default async function QuizResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activityId = Number(id);
  if (isNaN(activityId)) notFound();

  const session = (await getServerSession(authOptions))!;
  const { role, id: userId } = session.user;

  // 활동 정보
  const { rows: actRows } = await sql`
    SELECT a.*, s.course_id, c.title AS course_title
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId} AND a.type = 'quiz'
  `;
  if (actRows.length === 0) notFound();
  const activity = actRows[0];

  // 완료된 시도 찾기
  const targetUserId = Number(userId);
  const { rows: attempts } = await sql`
    SELECT * FROM quiz_attempts
    WHERE activity_id = ${activityId} AND user_id = ${targetUserId} AND state = 'finished'
    ORDER BY submitted_at DESC LIMIT 1
  `;
  if (attempts.length === 0) redirect(`/activities/${activityId}`);

  const attempt = attempts[0];
  const percent = attempt.max_score > 0
    ? Math.round((attempt.score / attempt.max_score) * 100)
    : 0;

  // 문제별 결과
  const { rows: results } = await sql`
    SELECT qa.current_answer, qa.is_correct, qa.sequence_number,
           qq.question_text, qq.options, qq.correct_answer
    FROM question_attempts qa
    JOIN quiz_questions qq ON qq.id = qa.question_id
    WHERE qa.quiz_attempt_id = ${attempt.id}
    ORDER BY qq.sort_order
  `;

  return (
    <main className={styles.content}>
      <Link href={`/activities/${activityId}`} className={styles.backLink}>
        &larr; {activity.title}
      </Link>

      <section className={styles.scoreSummary}>
        <h1>퀴즈 결과</h1>
        <p>
          <span className={styles.scoreValue}>{attempt.score}</span>
          <span className={styles.scoreMax}> / {attempt.max_score}</span>
        </p>
        <p className={styles.scorePercent}>{percent}%</p>
      </section>

      <div className={styles.reviewList}>
        {results.map((r, idx) => (
          <article
            key={idx}
            className={styles.reviewCard}
            data-correct={r.is_correct}
          >
            <div className={styles.reviewHeader}>
              <span className={styles.questionNumber} data-correct={r.is_correct}>
                {idx + 1}
              </span>
              <span className={styles.questionText}>{r.question_text}</span>
              <span className={styles.resultBadge} data-correct={r.is_correct}>
                {r.is_correct ? '정답' : '오답'}
              </span>
            </div>
            <ul className={styles.optionsList}>
              {(r.options as string[]).map((opt, i) => {
                const isStudentAnswer = opt === r.current_answer;
                const isCorrectAnswer = opt === r.correct_answer;
                return (
                  <li
                    key={i}
                    className={styles.optionItem}
                    data-student-answer={isStudentAnswer}
                    data-is-correct={isStudentAnswer && isCorrectAnswer}
                    data-is-correct-answer={isCorrectAnswer && !isStudentAnswer}
                  >
                    <span className={styles.optionLabel}>{OPTION_LABELS[i]}</span>
                    {opt}
                    {isStudentAnswer && !isCorrectAnswer && ' (내 답)'}
                    {isCorrectAnswer && ' (정답)'}
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>

      <Link href={`/courses/${activity.course_id}`} className={styles.backBtn}>
        코스로 돌아가기
      </Link>
    </main>
  );
}
