'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSection,
  updateSection,
  deleteSection,
  reorderSection,
} from '@/app/actions/section';
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
                  <ActivityList
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
