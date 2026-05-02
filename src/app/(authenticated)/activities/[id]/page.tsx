import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { AssignmentSubmission } from './AssignmentSubmission';
import styles from './activity-detail.module.css';

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activityId = Number(id);
  if (isNaN(activityId)) notFound();

  const session = (await getServerSession(authOptions))!;
  const { role, id: userId } = session.user;

  // 활동 + 코스 정보
  const { rows: actRows } = await sql`
    SELECT a.*, s.course_id, s.title AS section_title,
           c.title AS course_title, c.created_by
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId}
  `;
  if (actRows.length === 0) notFound();

  const activity = actRows[0];
  const isOwner = activity.created_by === Number(userId);
  const canEdit = role === 'teacher' && isOwner;

  // 학생: 수강등록 확인
  if (role === 'student') {
    const { rows: enrollRows } = await sql`
      SELECT 1 FROM enrollments WHERE user_id = ${Number(userId)} AND course_id = ${activity.course_id}
    `;
    if (enrollRows.length === 0) redirect('/courses');
  }

  // 퀴즈 문제 수
  const { rows: questionCountRows } = await sql`
    SELECT COUNT(*)::int AS count FROM quiz_questions WHERE activity_id = ${activityId}
  `;
  const questionCount = questionCountRows[0].count;

  return (
    <main className={styles.content}>
      <Link href={`/courses/${activity.course_id}`} className={styles.backLink}>
        &larr; {activity.course_title}
      </Link>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.typeBadge}>
            {activity.type === 'quiz' ? '퀴즈' : '과제'}
          </span>
          <h1>{activity.title}</h1>
        </div>
        {activity.description && (
          <p className={styles.description}>{activity.description}</p>
        )}
        <div className={styles.metaRow}>
          <span>{activity.section_title}</span>
          {activity.due_date && (
            <span>마감: {new Date(activity.due_date).toLocaleString('ko-KR')}</span>
          )}
          {activity.type === 'quiz' && (
            <span>문제 {questionCount}개</span>
          )}
        </div>
      </header>

      {canEdit ? (
        <TeacherView
          activity={activity}
          activityId={activityId}
          questionCount={questionCount}
        />
      ) : role === 'student' ? (
        activity.type === 'quiz' ? (
          <StudentQuizView activityId={activityId} userId={Number(userId)} questionCount={questionCount} />
        ) : (
          <StudentAssignmentView activityId={activityId} userId={Number(userId)} activity={activity} />
        )
      ) : (
        <p className={styles.emptyState}>접근할 수 없습니다.</p>
      )}
    </main>
  );
}

// --- Teacher View ---

async function TeacherView({
  activity,
  activityId,
  questionCount,
}: {
  activity: Record<string, unknown>;
  activityId: number;
  questionCount: number;
}) {
  // 응시/제출 통계
  if (activity.type === 'quiz') {
    const { rows: stats } = await sql`
      SELECT
        COUNT(*) FILTER (WHERE state = 'finished')::int AS completed,
        COUNT(*) FILTER (WHERE state = 'inprogress')::int AS in_progress,
        ROUND(AVG(CASE WHEN state = 'finished' AND max_score > 0
          THEN (score::decimal / max_score) * 100 END), 1) AS avg_percent
      FROM quiz_attempts WHERE activity_id = ${activityId}
    `;
    const stat = stats[0];

    return (
      <>
        <div className={styles.teacherActions}>
          <Link href={`/activities/${activityId}/edit`} className={styles.actionLink}>
            문제 편집 ({questionCount}문제)
          </Link>
        </div>
        <article className={styles.statsCard}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>완료</span>
              <span className={styles.statValue}>{stat.completed}명</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>진행중</span>
              <span className={styles.statValue}>{stat.in_progress}명</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>평균 점수</span>
              <span className={styles.statValue}>
                {stat.avg_percent !== null ? `${stat.avg_percent}%` : '-'}
              </span>
            </div>
          </div>
        </article>
      </>
    );
  }

  // 과제
  const { rows: stats } = await sql`
    SELECT
      COUNT(asub.id)::int AS submitted,
      COUNT(gg.id)::int AS graded
    FROM assignment_submissions asub
    LEFT JOIN grade_items gi ON gi.activity_id = asub.activity_id
    LEFT JOIN grade_grades gg ON gg.grade_item_id = gi.id AND gg.user_id = asub.user_id
    WHERE asub.activity_id = ${activityId}
  `;
  const stat = stats[0];

  return (
    <>
      <div className={styles.teacherActions}>
        <Link href={`/activities/${activityId}/submissions`} className={styles.actionLink}>
          제출물 보기 / 채점
        </Link>
      </div>
      <article className={styles.statsCard}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>제출</span>
            <span className={styles.statValue}>{stat.submitted}명</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>채점 완료</span>
            <span className={styles.statValue}>{stat.graded}명</span>
          </div>
        </div>
      </article>
    </>
  );
}

// --- Student Quiz View ---

async function StudentQuizView({
  activityId,
  userId,
  questionCount,
}: {
  activityId: number;
  userId: number;
  questionCount: number;
}) {
  const { rows: attempts } = await sql`
    SELECT id, state, score, max_score, submitted_at
    FROM quiz_attempts
    WHERE activity_id = ${activityId} AND user_id = ${userId}
    ORDER BY started_at DESC LIMIT 1
  `;

  const attempt = attempts[0];

  if (!attempt) {
    // 미응시
    return (
      <article className={styles.quizCard}>
        <h2>퀴즈 응시</h2>
        <p className={styles.quizMeta}>문제 {questionCount}개 | 단일 시도</p>
        {questionCount > 0 ? (
          <Link href={`/activities/${activityId}/attempt`} className={styles.startBtn}>
            퀴즈 시작
          </Link>
        ) : (
          <p className={styles.disabledMsg}>아직 출제된 문제가 없습니다.</p>
        )}
      </article>
    );
  }

  if (attempt.state === 'inprogress') {
    return (
      <article className={styles.quizCard}>
        <h2>진행 중인 퀴즈</h2>
        <p className={styles.quizMeta}>이어서 풀 수 있습니다.</p>
        <Link href={`/activities/${activityId}/attempt`} className={styles.startBtn}>
          이어서 풀기
        </Link>
      </article>
    );
  }

  // 완료
  const percent = attempt.max_score > 0
    ? Math.round((attempt.score / attempt.max_score) * 100)
    : 0;

  return (
    <article className={styles.quizCard}>
      <h2>퀴즈 결과</h2>
      <p className={styles.scoreDisplay}>{attempt.score} / {attempt.max_score}</p>
      <p className={styles.scorePercent}>{percent}%</p>
      <Link href={`/activities/${activityId}/result`} className={styles.resultLink}>
        상세 결과 보기
      </Link>
    </article>
  );
}

// --- Student Assignment View ---

async function StudentAssignmentView({
  activityId,
  userId,
  activity,
}: {
  activityId: number;
  userId: number;
  activity: Record<string, unknown>;
}) {
  const { rows: submissions } = await sql`
    SELECT * FROM assignment_submissions
    WHERE activity_id = ${activityId} AND user_id = ${userId}
  `;

  const { rows: gradeRows } = await sql`
    SELECT gg.raw_grade, gg.final_grade, gg.feedback, gi.grade_max
    FROM grade_grades gg
    JOIN grade_items gi ON gi.id = gg.grade_item_id
    WHERE gi.activity_id = ${activityId} AND gg.user_id = ${userId}
  `;

  const submission = submissions[0] || null;
  const grade = gradeRows[0] || null;
  const isPastDue = activity.due_date ? new Date(activity.due_date as string) < new Date() : false;

  return (
    <section className={styles.submissionSection}>
      <h2>과제 제출</h2>

      {grade && (
        <div className={styles.gradeResult}>
          <h3>채점 결과: {grade.final_grade} / {grade.grade_max}</h3>
          {grade.feedback && (
            <p className={styles.feedback}>{grade.feedback}</p>
          )}
        </div>
      )}

      {submission ? (
        <>
          <p className={styles.submissionMeta}>
            제출: {new Date(submission.submitted_at).toLocaleString('ko-KR')}
            {submission.updated_at !== submission.submitted_at && (
              <> | 수정: {new Date(submission.updated_at).toLocaleString('ko-KR')}</>
            )}
          </p>
          {!grade && !isPastDue ? (
            <AssignmentSubmission
              activityId={activityId}
              initialText={submission.submission_text}
            />
          ) : (
            <div className={styles.submissionText}>{submission.submission_text}</div>
          )}
        </>
      ) : isPastDue ? (
        <p className={styles.disabledMsg}>제출 마감일이 지났습니다.</p>
      ) : (
        <AssignmentSubmission activityId={activityId} initialText="" />
      )}
    </section>
  );
}
