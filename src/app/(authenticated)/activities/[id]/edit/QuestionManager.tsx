'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestion,
} from '@/app/actions/quiz';
import styles from './quiz-edit.module.css';

interface Question {
  id: number;
  activity_id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  sort_order: number;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export function QuestionManager({
  activityId,
  initialQuestions,
}: {
  activityId: number;
  initialQuestions: Question[];
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const questions = initialQuestions;

  async function handleCreate(formData: FormData) {
    formData.set('activity_id', String(activityId));
    setError('');

    // 보기 + 정답 조립
    const options: string[] = [];
    for (let i = 0; i < 4; i++) {
      const opt = (formData.get(`option_${i}`) as string)?.trim();
      if (opt) options.push(opt);
    }
    formData.set('options', JSON.stringify(options));

    const correctIdx = Number(formData.get('correct_index'));
    if (isNaN(correctIdx) || !options[correctIdx]) {
      setError('정답을 선택해주세요.');
      return;
    }
    formData.set('correct_answer', options[correctIdx]);

    startTransition(async () => {
      const result = await createQuestion(formData);
      if (!result.success) {
        setError(result.error);
      } else {
        setShowAddForm(false);
        router.refresh();
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    setError('');

    const options: string[] = [];
    for (let i = 0; i < 4; i++) {
      const opt = (formData.get(`option_${i}`) as string)?.trim();
      if (opt) options.push(opt);
    }
    formData.set('options', JSON.stringify(options));

    const correctIdx = Number(formData.get('correct_index'));
    if (isNaN(correctIdx) || !options[correctIdx]) {
      setError('정답을 선택해주세요.');
      return;
    }
    formData.set('correct_answer', options[correctIdx]);

    startTransition(async () => {
      const result = await updateQuestion(formData);
      if (!result.success) {
        setError(result.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  async function handleDelete(questionId: number) {
    if (!confirm('이 문제를 삭제하시겠습니까?')) return;
    setError('');

    const fd = new FormData();
    fd.set('question_id', String(questionId));

    startTransition(async () => {
      const result = await deleteQuestion(fd);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  async function handleReorder(questionId: number, direction: 'up' | 'down') {
    setError('');

    const fd = new FormData();
    fd.set('question_id', String(questionId));
    fd.set('direction', direction);

    startTransition(async () => {
      const result = await reorderQuestion(fd);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      {error && (
        <p className={styles.error} role="alert">{error}</p>
      )}

      {questions.length === 0 && !showAddForm ? (
        <p className={styles.emptyState}>등록된 문제가 없습니다.</p>
      ) : (
        <div className={styles.questionList}>
          {questions.map((q, idx) =>
            editingId === q.id ? (
              <QuestionForm
                key={q.id}
                question={q}
                onSubmit={handleUpdate}
                onCancel={() => setEditingId(null)}
                isPending={isPending}
              />
            ) : (
              <article key={q.id} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>{idx + 1}</span>
                  <span className={styles.questionText}>{q.question_text}</span>
                  <div className={styles.questionActions}>
                    <button
                      type="button"
                      className={styles.arrowBtn}
                      disabled={idx === 0 || isPending}
                      onClick={() => handleReorder(q.id, 'up')}
                      aria-label="위로 이동"
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      className={styles.arrowBtn}
                      disabled={idx === questions.length - 1 || isPending}
                      onClick={() => handleReorder(q.id, 'down')}
                      aria-label="아래로 이동"
                    >
                      &#9660;
                    </button>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => {
                        setEditingId(q.id);
                        setShowAddForm(false);
                      }}
                    >
                      편집
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(q.id)}
                      disabled={isPending}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <ul className={styles.optionsList}>
                  {q.options.map((opt, i) => (
                    <li
                      key={i}
                      className={styles.optionItem}
                      data-correct={opt === q.correct_answer}
                    >
                      <span className={styles.optionLabel}>{OPTION_LABELS[i]}</span>
                      {opt}
                      {opt === q.correct_answer && ' (정답)'}
                    </li>
                  ))}
                </ul>
              </article>
            ),
          )}
        </div>
      )}

      {showAddForm ? (
        <QuestionForm
          onSubmit={handleCreate}
          onCancel={() => setShowAddForm(false)}
          isPending={isPending}
        />
      ) : (
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.ctaButton}
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
            }}
          >
            + 문제 추가
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionForm({
  question,
  onSubmit,
  onCancel,
  isPending,
}: {
  question?: Question;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const defaultOptions = question?.options || ['', '', '', ''];
  const defaultCorrectIdx = question
    ? question.options.indexOf(question.correct_answer)
    : -1;

  return (
    <form action={onSubmit} className={styles.questionForm}>
      {question && (
        <input type="hidden" name="question_id" value={question.id} />
      )}

      <label className={styles.label} htmlFor={`q-text-${question?.id || 'new'}`}>
        문제 내용
      </label>
      <textarea
        id={`q-text-${question?.id || 'new'}`}
        name="question_text"
        className={styles.textarea}
        defaultValue={question?.question_text || ''}
        required
        autoComplete="off"
        placeholder="문제를 입력하세요..."
      />

      <label className={styles.label}>보기 (정답에 체크)</label>
      <div className={styles.optionsEditor}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.optionRow}>
            <input
              type="radio"
              name="correct_index"
              value={i}
              defaultChecked={i === defaultCorrectIdx}
              aria-label={`보기 ${OPTION_LABELS[i]}를 정답으로 선택`}
            />
            <span className={styles.optionLabel}>{OPTION_LABELS[i]}</span>
            <input
              type="text"
              name={`option_${i}`}
              defaultValue={defaultOptions[i] || ''}
              placeholder={`보기 ${OPTION_LABELS[i]}`}
              required={i < 2}
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.ctaButton} disabled={isPending}>
          {isPending ? '저장 중...' : question ? '저장' : '문제 추가'}
        </button>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </form>
  );
}
