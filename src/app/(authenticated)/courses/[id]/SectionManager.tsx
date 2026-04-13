'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createSection,
  updateSection,
  deleteSection,
  reorderSection,
} from '@/app/actions/section';
import {
  createActivity,
  updateActivity,
  deleteActivity,
  reorderActivity,
} from '@/app/actions/activity';
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

export function SectionManager({
  courseId,
  initialSections,
  activitiesBySection,
}: {
  courseId: number;
  initialSections: Section[];
  activitiesBySection: Record<number, Activity[]>;
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleReorder(sectionId: number, direction: 'up' | 'down') {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;

    const prev = [...sections];
    const reordered = [...sections];
    const tempOrder = reordered[idx].sort_order;
    reordered[idx] = { ...reordered[idx], sort_order: reordered[swapIdx].sort_order };
    reordered[swapIdx] = { ...reordered[swapIdx], sort_order: tempOrder };
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setSections(reordered);

    const fd = new FormData();
    fd.set('section_id', String(sectionId));
    fd.set('direction', direction);

    startTransition(async () => {
      const result = await reorderSection(fd);
      if (!result.success) {
        setSections(prev);
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  async function handleCreate(formData: FormData) {
    formData.set('course_id', String(courseId));
    setError('');

    startTransition(async () => {
      const result = await createSection(formData);
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

    startTransition(async () => {
      const result = await updateSection(formData);
      if (!result.success) {
        setError(result.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  async function handleDelete(sectionId: number) {
    if (!confirm('이 섹션과 하위 활동이 모두 삭제됩니다. 계속하시겠습니까?')) return;
    setError('');

    const fd = new FormData();
    fd.set('section_id', String(sectionId));

    startTransition(async () => {
      const result = await deleteSection(fd);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className={styles.sectionListHeader}>
        <h2 className={styles.sectionListTitle}>섹션 관리</h2>
        <button
          type="button"
          className={styles.ctaButton}
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
          }}
        >
          {showAddForm ? '취소' : '+ 섹션 추가'}
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {showAddForm && (
        <form action={handleCreate} className={styles.sectionForm}>
          <label className={styles.label} htmlFor="new-title">
            섹션 제목
          </label>
          <input
            id="new-title"
            name="title"
            className={styles.input}
            required
            autoComplete="off"
            placeholder="예: 4주차: React 기초"
          />
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="new-week">
                주차
              </label>
              <input
                id="new-week"
                name="week_number"
                type="number"
                min="1"
                className={styles.input}
                required
                autoComplete="off"
              />
            </div>
          </div>
          <label className={styles.label} htmlFor="new-desc">
            설명 (선택)
          </label>
          <textarea
            id="new-desc"
            name="description"
            className={styles.textarea}
            autoComplete="off"
          />
          <div className={styles.formActions}>
            <button type="submit" className={styles.ctaButton} disabled={isPending}>
              {isPending ? '저장 중...' : '섹션 추가'}
            </button>
          </div>
        </form>
      )}

      {sections.length === 0 ? (
        <p className={styles.emptyState}>등록된 섹션이 없습니다.</p>
      ) : (
        <div className={styles.sectionList}>
          {sections.map((section, idx) => (
            <article key={section.id} className={styles.sectionCard}>
              {editingId === section.id ? (
                <EditSectionForm
                  section={section}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingId(null)}
                  isPending={isPending}
                />
              ) : (
                <>
                  <div className={styles.sectionHeader}>
                    <h2>
                      <span className={styles.weekBadge}>
                        {section.week_number}주차
                      </span>
                      {section.title}
                      {!section.is_visible && (
                        <span className={styles.hiddenBadge}>숨김</span>
                      )}
                    </h2>
                    <div className={styles.sectionActions}>
                      <button
                        type="button"
                        className={styles.arrowBtn}
                        disabled={idx === 0 || isPending}
                        onClick={() => handleReorder(section.id, 'up')}
                        aria-label="위로 이동"
                      >
                        &#9650;
                      </button>
                      <button
                        type="button"
                        className={styles.arrowBtn}
                        disabled={idx === sections.length - 1 || isPending}
                        onClick={() => handleReorder(section.id, 'down')}
                        aria-label="아래로 이동"
                      >
                        &#9660;
                      </button>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => {
                          setEditingId(section.id);
                          setShowAddForm(false);
                        }}
                      >
                        편집
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(section.id)}
                        disabled={isPending}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  {section.description && (
                    <p className={styles.sectionDesc}>{section.description}</p>
                  )}
                  <ActivityManager
                    sectionId={section.id}
                    activities={activitiesBySection[section.id] || []}
                  />
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Activity Manager (teacher) ---

function ActivityManager({
  sectionId,
  activities,
}: {
  sectionId: number;
  activities: Activity[];
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    formData.set('section_id', String(sectionId));
    setError('');

    startTransition(async () => {
      const result = await createActivity(formData);
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

    startTransition(async () => {
      const result = await updateActivity(formData);
      if (!result.success) {
        setError(result.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  async function handleDelete(activityId: number) {
    if (!confirm('이 활동과 관련 데이터가 모두 삭제됩니다. 계속하시겠습니까?')) return;
    setError('');

    const fd = new FormData();
    fd.set('activity_id', String(activityId));

    startTransition(async () => {
      const result = await deleteActivity(fd);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  async function handleReorder(activityId: number, direction: 'up' | 'down') {
    setError('');

    const fd = new FormData();
    fd.set('activity_id', String(activityId));
    fd.set('direction', direction);

    startTransition(async () => {
      const result = await reorderActivity(fd);
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
        <p className={styles.error} role="alert" style={{ marginTop: 'var(--space-2)' }}>
          {error}
        </p>
      )}

      {activities.length === 0 && !showAddForm ? (
        <p className={styles.noActivities}>등록된 활동이 없습니다.</p>
      ) : (
        <ul className={styles.activityList}>
          {activities.map((a, idx) =>
            editingId === a.id ? (
              <li key={a.id} className={styles.activityItem} style={{ display: 'block' }}>
                <EditActivityForm
                  activity={a}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingId(null)}
                  isPending={isPending}
                />
              </li>
            ) : (
              <li key={a.id} className={styles.activityItem}>
                <span className={styles.typeBadge} data-type={a.type}>
                  {a.type === 'quiz' ? '퀴즈' : '과제'}
                </span>
                <Link href={`/activities/${a.id}`} className={styles.activityLink}>
                  {a.title}
                </Link>
                {!a.is_visible && (
                  <span className={styles.hiddenBadge}>숨김</span>
                )}
                {a.due_date && (
                  <span className={styles.dueDate}>
                    마감: {new Date(a.due_date).toLocaleDateString('ko-KR')}
                  </span>
                )}
                <div className={styles.activityActions}>
                  <button
                    type="button"
                    className={styles.activityArrowBtn}
                    disabled={idx === 0 || isPending}
                    onClick={() => handleReorder(a.id, 'up')}
                    aria-label="위로 이동"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    className={styles.activityArrowBtn}
                    disabled={idx === activities.length - 1 || isPending}
                    onClick={() => handleReorder(a.id, 'down')}
                    aria-label="아래로 이동"
                  >
                    &#9660;
                  </button>
                  <button
                    type="button"
                    className={styles.activityEditBtn}
                    onClick={() => {
                      setEditingId(a.id);
                      setShowAddForm(false);
                    }}
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    className={styles.activityDeleteBtn}
                    onClick={() => handleDelete(a.id)}
                    disabled={isPending}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {showAddForm ? (
        <form action={handleCreate} className={styles.addActivityForm}>
          <label className={styles.label} htmlFor={`act-type-${sectionId}`}>
            활동 유형
          </label>
          <select
            id={`act-type-${sectionId}`}
            name="type"
            className={styles.select}
            required
          >
            <option value="quiz">퀴즈</option>
            <option value="assignment">과제</option>
          </select>

          <label className={styles.label} htmlFor={`act-title-${sectionId}`}>
            제목
          </label>
          <input
            id={`act-title-${sectionId}`}
            name="title"
            className={styles.input}
            required
            autoComplete="off"
            placeholder="예: 중간고사 퀴즈"
          />

          <label className={styles.label} htmlFor={`act-desc-${sectionId}`}>
            설명 (선택)
          </label>
          <textarea
            id={`act-desc-${sectionId}`}
            name="description"
            className={styles.textarea}
            autoComplete="off"
          />

          <label className={styles.label} htmlFor={`act-due-${sectionId}`}>
            마감일 (선택)
          </label>
          <input
            id={`act-due-${sectionId}`}
            name="due_date"
            type="datetime-local"
            className={styles.input}
          />

          <div className={styles.formActions}>
            <button type="submit" className={styles.ctaButton} disabled={isPending}>
              {isPending ? '추가 중...' : '활동 추가'}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setShowAddForm(false)}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className={styles.addActivityBtn}
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
        >
          + 활동 추가
        </button>
      )}
    </div>
  );
}

// --- Edit Forms ---

function EditSectionForm({
  section,
  onSubmit,
  onCancel,
  isPending,
}: {
  section: Section;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form action={onSubmit} className={styles.editForm}>
      <input type="hidden" name="section_id" value={section.id} />
      <label className={styles.label} htmlFor={`edit-title-${section.id}`}>
        섹션 제목
      </label>
      <input
        id={`edit-title-${section.id}`}
        name="title"
        className={styles.input}
        defaultValue={section.title}
        required
        autoComplete="off"
      />
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`edit-week-${section.id}`}>
            주차
          </label>
          <input
            id={`edit-week-${section.id}`}
            name="week_number"
            type="number"
            min="1"
            className={styles.input}
            defaultValue={section.week_number}
            required
            autoComplete="off"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="is_visible"
              className={styles.checkbox}
              defaultChecked={section.is_visible}
            />
            학생에게 표시
          </label>
        </div>
      </div>
      <label className={styles.label} htmlFor={`edit-desc-${section.id}`}>
        설명 (선택)
      </label>
      <textarea
        id={`edit-desc-${section.id}`}
        name="description"
        className={styles.textarea}
        defaultValue={section.description || ''}
        autoComplete="off"
      />
      <div className={styles.formActions}>
        <button type="submit" className={styles.ctaButton} disabled={isPending}>
          {isPending ? '저장 중...' : '저장'}
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

function EditActivityForm({
  activity,
  onSubmit,
  onCancel,
  isPending,
}: {
  activity: Activity;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const dueDateValue = activity.due_date
    ? new Date(activity.due_date).toISOString().slice(0, 16)
    : '';

  return (
    <form action={onSubmit} className={styles.addActivityForm}>
      <input type="hidden" name="activity_id" value={activity.id} />

      <label className={styles.label} htmlFor={`edit-act-title-${activity.id}`}>
        제목
      </label>
      <input
        id={`edit-act-title-${activity.id}`}
        name="title"
        className={styles.input}
        defaultValue={activity.title}
        required
        autoComplete="off"
      />

      <label className={styles.label} htmlFor={`edit-act-desc-${activity.id}`}>
        설명 (선택)
      </label>
      <textarea
        id={`edit-act-desc-${activity.id}`}
        name="description"
        className={styles.textarea}
        defaultValue={activity.description || ''}
        autoComplete="off"
      />

      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`edit-act-due-${activity.id}`}>
            마감일 (선택)
          </label>
          <input
            id={`edit-act-due-${activity.id}`}
            name="due_date"
            type="datetime-local"
            className={styles.input}
            defaultValue={dueDateValue}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="is_visible"
              className={styles.checkbox}
              defaultChecked={activity.is_visible}
            />
            학생에게 표시
          </label>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.ctaButton} disabled={isPending}>
          {isPending ? '저장 중...' : '저장'}
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
