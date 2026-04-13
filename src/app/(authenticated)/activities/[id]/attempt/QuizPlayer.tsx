'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveAnswer, submitQuizAttempt } from '@/app/actions/quiz';
import styles from './quiz-attempt.module.css';

interface QuestionWithAnswer {
  question_attempt_id: number;
  question_id: number;
  question_text: string;
  options: string[];
  sort_order: number;
  current_answer: string | null;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export function QuizPlayer({
  activityId,
  attemptId,
  questions,
}: {
  activityId: number;
  attemptId: number;
  questions: QuestionWithAnswer[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const q of questions) {
      if (q.current_answer) initial[q.question_attempt_id] = q.current_answer;
    }
    return initial;
  });
  const [savedIds, setSavedIds] = useState<Set<number>>(() => {
    return new Set(questions.filter((q) => q.current_answer).map((q) => q.question_attempt_id));
  });
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const unansweredCount = totalCount - answeredCount;

  function handleAnswerChange(questionAttemptId: number, answer: string) {
    setAnswers((prev) => ({ ...prev, [questionAttemptId]: answer }));

    // 자동 저장
    const fd = new FormData();
    fd.set('question_attempt_id', String(questionAttemptId));
    fd.set('answer', answer);

    startTransition(async () => {
      const result = await saveAnswer(fd);
      if (result.success) {
        setSavedIds((prev) => new Set(prev).add(questionAttemptId));
      }
    });
  }

  function handleSubmit() {
    if (unansweredCount > 0) {
      if (!confirm(`${unansweredCount}개 문제가 미응답입니다. 그래도 제출하시겠습니까?`)) {
        return;
      }
    } else {
      if (!confirm('제출하면 수정할 수 없습니다. 제출하시겠습니까?')) {
        return;
      }
    }

    setError('');

    const fd = new FormData();
    fd.set('quiz_attempt_id', String(attemptId));

    startTransition(async () => {
      const result = await submitQuizAttempt(fd);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push(`/activities/${activityId}/result`);
      }
    });
  }

  return (
    <div>
      <div className={styles.header}>
        <h1>퀴즈 응시</h1>
        <p className={styles.progress}>
          {answeredCount} / {totalCount} 문제 답변 완료
        </p>
      </div>

      {error && (
        <p className={styles.error} role="alert">{error}</p>
      )}

      <div className={styles.questionList}>
        {questions.map((q, idx) => (
          <article
            key={q.question_attempt_id}
            className={styles.questionCard}
            data-saved={savedIds.has(q.question_attempt_id)}
          >
            <div className={styles.questionHeader}>
              <span
                className={styles.questionNumber}
                data-answered={!!answers[q.question_attempt_id]}
              >
                {idx + 1}
              </span>
              <span className={styles.questionText}>{q.question_text}</span>
              {savedIds.has(q.question_attempt_id) && (
                <span className={styles.savedIndicator}>저장됨</span>
              )}
            </div>
            <div className={styles.optionsList}>
              {q.options.map((opt, i) => (
                <label key={i} className={styles.optionLabel}>
                  <input
                    type="radio"
                    name={`q_${q.question_attempt_id}`}
                    value={opt}
                    checked={answers[q.question_attempt_id] === opt}
                    onChange={() => handleAnswerChange(q.question_attempt_id, opt)}
                  />
                  <span className={styles.optionLetter}>{OPTION_LABELS[i]}</span>
                  {opt}
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.submitSection}>
        <div className={styles.answerSummary}>
          {questions.map((q, idx) => (
            <span
              key={q.question_attempt_id}
              className={styles.answerDot}
              data-answered={!!answers[q.question_attempt_id]}
            >
              {idx + 1}
            </span>
          ))}
        </div>
        {unansweredCount > 0 && (
          <p className={styles.warning}>
            {unansweredCount}개 문제가 아직 미응답입니다.
          </p>
        )}
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? '제출 중...' : '퀴즈 제출'}
        </button>
      </div>
    </div>
  );
}
