'use server';

import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

type QuizResult =
  | { success: true; id?: number }
  | { success: false; error: string };

// --- 문제 관리 (교수) ---

async function verifyQuizOwner(activityId: number) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') {
    return { ok: false as const, error: '퀴즈 관리 권한이 없습니다.' };
  }

  const userId = Number(session.user.id);
  const { rows } = await sql`
    SELECT a.id, a.type, s.course_id
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId} AND c.created_by = ${userId}
  `;
  if (rows.length === 0) {
    return { ok: false as const, error: '해당 퀴즈의 소유자만 관리할 수 있습니다.' };
  }
  if (rows[0].type !== 'quiz') {
    return { ok: false as const, error: '이 활동은 퀴즈가 아닙니다.' };
  }

  return { ok: true as const, userId, courseId: rows[0].course_id as number };
}

async function verifyQuestionOwner(questionId: number) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') {
    return { ok: false as const, error: '퀴즈 관리 권한이 없습니다.' };
  }

  const userId = Number(session.user.id);
  const { rows } = await sql`
    SELECT qq.id, qq.activity_id
    FROM quiz_questions qq
    JOIN activities a ON a.id = qq.activity_id
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE qq.id = ${questionId} AND c.created_by = ${userId}
  `;
  if (rows.length === 0) {
    return { ok: false as const, error: '해당 문제의 소유자만 관리할 수 있습니다.' };
  }

  return { ok: true as const, userId, activityId: rows[0].activity_id as number };
}

export async function createQuestion(formData: FormData): Promise<QuizResult> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const auth = await verifyQuizOwner(activityId);
  if (!auth.ok) return { success: false, error: auth.error };

  const questionText = (formData.get('question_text') as string)?.trim();
  const optionsJson = formData.get('options') as string;
  const correctAnswer = (formData.get('correct_answer') as string)?.trim();

  if (!questionText) return { success: false, error: '문제 내용은 필수입니다.' };
  if (!correctAnswer) return { success: false, error: '정답은 필수입니다.' };

  let options: string[];
  try {
    options = JSON.parse(optionsJson);
    if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
      return { success: false, error: '보기는 2~5개여야 합니다.' };
    }
  } catch {
    return { success: false, error: '보기 형식이 올바르지 않습니다.' };
  }

  if (!options.includes(correctAnswer)) {
    return { success: false, error: '정답은 보기 중 하나여야 합니다.' };
  }

  const { rows: maxRow } = await sql`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
    FROM quiz_questions WHERE activity_id = ${activityId}
  `;

  const { rows } = await sql`
    INSERT INTO quiz_questions (activity_id, question_text, options, correct_answer, sort_order)
    VALUES (${activityId}, ${questionText}, ${optionsJson}::jsonb, ${correctAnswer}, ${maxRow[0].next_order})
    RETURNING id
  `;

  return { success: true, id: rows[0].id };
}

export async function updateQuestion(formData: FormData): Promise<QuizResult> {
  const questionId = Number(formData.get('question_id'));
  if (isNaN(questionId)) return { success: false, error: '잘못된 문제 ID입니다.' };

  const auth = await verifyQuestionOwner(questionId);
  if (!auth.ok) return { success: false, error: auth.error };

  const questionText = (formData.get('question_text') as string)?.trim();
  const optionsJson = formData.get('options') as string;
  const correctAnswer = (formData.get('correct_answer') as string)?.trim();

  if (!questionText) return { success: false, error: '문제 내용은 필수입니다.' };
  if (!correctAnswer) return { success: false, error: '정답은 필수입니다.' };

  let options: string[];
  try {
    options = JSON.parse(optionsJson);
    if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
      return { success: false, error: '보기는 2~5개여야 합니다.' };
    }
  } catch {
    return { success: false, error: '보기 형식이 올바르지 않습니다.' };
  }

  if (!options.includes(correctAnswer)) {
    return { success: false, error: '정답은 보기 중 하나여야 합니다.' };
  }

  await sql`
    UPDATE quiz_questions
    SET question_text = ${questionText}, options = ${optionsJson}::jsonb,
        correct_answer = ${correctAnswer}
    WHERE id = ${questionId}
  `;

  return { success: true };
}

export async function deleteQuestion(formData: FormData): Promise<QuizResult> {
  const questionId = Number(formData.get('question_id'));
  if (isNaN(questionId)) return { success: false, error: '잘못된 문제 ID입니다.' };

  const auth = await verifyQuestionOwner(questionId);
  if (!auth.ok) return { success: false, error: auth.error };

  await sql`DELETE FROM quiz_questions WHERE id = ${questionId}`;

  return { success: true };
}

export async function reorderQuestion(formData: FormData): Promise<QuizResult> {
  const questionId = Number(formData.get('question_id'));
  const direction = formData.get('direction') as string;

  if (isNaN(questionId)) return { success: false, error: '잘못된 문제 ID입니다.' };
  if (direction !== 'up' && direction !== 'down') {
    return { success: false, error: '방향은 up 또는 down이어야 합니다.' };
  }

  const auth = await verifyQuestionOwner(questionId);
  if (!auth.ok) return { success: false, error: auth.error };

  const { rows: qRows } = await sql`
    SELECT id, activity_id, sort_order FROM quiz_questions WHERE id = ${questionId}
  `;
  if (qRows.length === 0) return { success: false, error: '문제를 찾을 수 없습니다.' };

  const current = qRows[0];

  const adjacentQuery = direction === 'up'
    ? sql`
        SELECT id, sort_order FROM quiz_questions
        WHERE activity_id = ${current.activity_id} AND sort_order < ${current.sort_order}
        ORDER BY sort_order DESC LIMIT 1
      `
    : sql`
        SELECT id, sort_order FROM quiz_questions
        WHERE activity_id = ${current.activity_id} AND sort_order > ${current.sort_order}
        ORDER BY sort_order ASC LIMIT 1
      `;

  const { rows: adjacentRows } = await adjacentQuery;
  if (adjacentRows.length === 0) {
    return { success: false, error: '더 이상 이동할 수 없습니다.' };
  }

  const adjacent = adjacentRows[0];

  await withTransaction(async (tx) => {
    await tx.query('UPDATE quiz_questions SET sort_order = $1 WHERE id = $2', [adjacent.sort_order, current.id]);
    await tx.query('UPDATE quiz_questions SET sort_order = $1 WHERE id = $2', [current.sort_order, adjacent.id]);
  });

  return { success: true };
}

// --- 퀴즈 응시 (학생) ---

export async function startQuizAttempt(formData: FormData): Promise<QuizResult> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return { success: false, error: '학생만 퀴즈를 응시할 수 있습니다.' };
  }

  const userId = Number(session.user.id);

  // 활동 존재 + 퀴즈 타입 확인
  const { rows: actRows } = await sql`
    SELECT a.id, a.type, s.course_id
    FROM activities a JOIN sections s ON s.id = a.section_id
    WHERE a.id = ${activityId}
  `;
  if (actRows.length === 0) return { success: false, error: '활동을 찾을 수 없습니다.' };
  if (actRows[0].type !== 'quiz') return { success: false, error: '이 활동은 퀴즈가 아닙니다.' };

  // 수강 등록 확인
  const { rows: enrollRows } = await sql`
    SELECT 1 FROM enrollments WHERE user_id = ${userId} AND course_id = ${actRows[0].course_id}
  `;
  if (enrollRows.length === 0) return { success: false, error: '수강 등록된 코스의 퀴즈만 응시할 수 있습니다.' };

  // 기존 완료된 시도 확인 (단일 시도 정책)
  const { rows: existingAttempts } = await sql`
    SELECT id, state FROM quiz_attempts
    WHERE user_id = ${userId} AND activity_id = ${activityId}
  `;
  const finished = existingAttempts.find((a) => a.state === 'finished');
  if (finished) return { success: false, error: '이미 완료한 퀴즈입니다. 재시도할 수 없습니다.' };

  // 진행 중인 시도가 있으면 그 ID 반환
  const inProgress = existingAttempts.find((a) => a.state === 'inprogress');
  if (inProgress) return { success: true, id: inProgress.id };

  // 문제 확인
  const { rows: questions } = await sql`
    SELECT id, sort_order FROM quiz_questions
    WHERE activity_id = ${activityId}
    ORDER BY sort_order
  `;
  if (questions.length === 0) return { success: false, error: '출제된 문제가 없습니다.' };

  // 새 시도 생성 (트랜잭션)
  const attemptId = await withTransaction(async (tx) => {
    const { rows: [attempt] } = await tx.query(
      'INSERT INTO quiz_attempts (user_id, activity_id, state, max_score) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, activityId, 'inprogress', questions.length]
    );

    for (const q of questions) {
      const { rows: [qa] } = await tx.query(
        'INSERT INTO question_attempts (quiz_attempt_id, question_id, sequence_number) VALUES ($1, $2, $3) RETURNING id',
        [attempt.id, q.id, q.sort_order]
      );

      await tx.query(
        'INSERT INTO question_attempt_steps (question_attempt_id, sequence_number, state) VALUES ($1, $2, $3)',
        [qa.id, 1, 'todo']
      );
    }

    return attempt.id;
  });

  return { success: true, id: attemptId };
}

export async function saveAnswer(formData: FormData): Promise<QuizResult> {
  const questionAttemptId = Number(formData.get('question_attempt_id'));
  const answer = (formData.get('answer') as string)?.trim();

  if (isNaN(questionAttemptId)) return { success: false, error: '잘못된 문제 시도 ID입니다.' };
  if (!answer) return { success: false, error: '답변을 선택해주세요.' };

  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: '로그인이 필요합니다.' };

  const userId = Number(session.user.id);

  // 소유권 + 진행 중 확인
  const { rows } = await sql`
    SELECT qa.id, qa.quiz_attempt_id, qat.state, qat.user_id
    FROM question_attempts qa
    JOIN quiz_attempts qat ON qat.id = qa.quiz_attempt_id
    WHERE qa.id = ${questionAttemptId} AND qat.user_id = ${userId} AND qat.state = 'inprogress'
  `;
  if (rows.length === 0) return { success: false, error: '유효하지 않은 시도입니다.' };

  // 답변 저장
  await sql`
    UPDATE question_attempts SET current_answer = ${answer}
    WHERE id = ${questionAttemptId}
  `;

  // 답변 기록 step 추가
  const { rows: maxStep } = await sql`
    SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_seq
    FROM question_attempt_steps WHERE question_attempt_id = ${questionAttemptId}
  `;

  await sql`
    INSERT INTO question_attempt_steps (question_attempt_id, sequence_number, state, answer)
    VALUES (${questionAttemptId}, ${maxStep[0].next_seq}, 'complete', ${answer})
  `;

  return { success: true };
}

export async function submitQuizAttempt(formData: FormData): Promise<QuizResult> {
  const quizAttemptId = Number(formData.get('quiz_attempt_id'));
  if (isNaN(quizAttemptId)) return { success: false, error: '잘못된 시도 ID입니다.' };

  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: '로그인이 필요합니다.' };

  const userId = Number(session.user.id);

  // 소유권 + 진행 중 확인
  const { rows: attemptRows } = await sql`
    SELECT id, activity_id, state FROM quiz_attempts
    WHERE id = ${quizAttemptId} AND user_id = ${userId}
  `;
  if (attemptRows.length === 0) return { success: false, error: '시도를 찾을 수 없습니다.' };
  if (attemptRows[0].state === 'finished') return { success: false, error: '이미 제출된 시도입니다.' };

  const activityId = attemptRows[0].activity_id;

  await withTransaction(async (tx) => {
    // 모든 문제 답변 + 정답 가져오기
    const { rows: answers } = await tx.query(
      'SELECT qa.id, qa.current_answer, qq.correct_answer FROM question_attempts qa JOIN quiz_questions qq ON qq.id = qa.question_id WHERE qa.quiz_attempt_id = $1',
      [quizAttemptId]
    );

    let score = 0;
    const maxScore = answers.length;

    // 채점
    for (const a of answers) {
      const isCorrect = a.current_answer === a.correct_answer;
      const mark = isCorrect ? 1 : 0;
      if (isCorrect) score++;

      await tx.query(
        'UPDATE question_attempts SET is_correct = $1, mark = $2 WHERE id = $3',
        [isCorrect, mark, a.id]
      );
    }

    // 시도 완료 처리
    await tx.query(
      'UPDATE quiz_attempts SET state = $1, score = $2, max_score = $3, submitted_at = NOW() WHERE id = $4',
      ['finished', score, maxScore, quizAttemptId]
    );

    // grade_grades upsert
    const { rows: gradeItemRows } = await tx.query(
      'SELECT id, grade_max FROM grade_items WHERE activity_id = $1',
      [activityId]
    );
    if (gradeItemRows.length > 0) {
      const gradeItem = gradeItemRows[0];
      const rawGrade = maxScore > 0
        ? Math.round((score / maxScore) * gradeItem.grade_max * 100) / 100
        : 0;

      const { rows: existingGrade } = await tx.query(
        'SELECT id FROM grade_grades WHERE grade_item_id = $1 AND user_id = $2',
        [gradeItem.id, userId]
      );

      if (existingGrade.length > 0) {
        await tx.query(
          'UPDATE grade_grades SET raw_grade = $1, final_grade = $2, time_modified = NOW() WHERE id = $3',
          [rawGrade, rawGrade, existingGrade[0].id]
        );
      } else {
        await tx.query(
          'INSERT INTO grade_grades (grade_item_id, user_id, raw_grade, final_grade, time_modified) VALUES ($1, $2, $3, $4, NOW())',
          [gradeItem.id, userId, rawGrade, rawGrade]
        );
      }
    }
  });

  return { success: true };
}
