'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
import { InlineEditableText } from './InlineEditableText';
import { UndoToastStack, type PendingDelete } from './UndoToast';
import { activityTypeLabel } from '@/lib/activity-types';
import styles from './modeless.module.css';

type ActivityExtras = {
  external_url?: string;
  file_name?: string;
  file_url?: string;
};

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

const UNDO_DELAY_MS = 5000;

export function ModelessSectionEditor({
  courseId,
  initialSections,
  activitiesBySection,
}: {
  courseId: number;
  initialSections: Section[];
  activitiesBySection: Record<number, Activity[]>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [showAddSection, setShowAddSection] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 진행 중인 타이머 정리 (의도된 "암묵 취소")
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  function isPending(kind: 'section' | 'activity', id: number): boolean {
    return pendingKeys.has(`${kind}:${id}`);
  }

  function schedulePending(
    kind: 'section' | 'activity',
    id: number,
    label: string,
    onCommit: () => Promise<void>,
  ) {
    const key = `${kind}:${id}`;
    setPendingKeys((s) => {
      const next = new Set(s);
      next.add(key);
      return next;
    });
    setPendingDeletes((arr) => [...arr, { key, label }]);

    const timeout = setTimeout(async () => {
      timeoutsRef.current.delete(key);
      setPendingDeletes((arr) => arr.filter((p) => p.key !== key));
      setPendingKeys((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
      try {
        await onCommit();
      } catch (e) {
        setError(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.');
      } finally {
        router.refresh();
      }
    }, UNDO_DELAY_MS);

    timeoutsRef.current.set(key, timeout);
  }

  function undoPending(key: string) {
    const timeout = timeoutsRef.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(key);
    }
    setPendingDeletes((arr) => arr.filter((p) => p.key !== key));
    setPendingKeys((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }

  // -------- Section actions --------

  async function saveSectionField(
    section: Section,
    field: 'title' | 'description',
    next: string,
  ) {
    const fd = new FormData();
    fd.set('section_id', String(section.id));
    fd.set('title', field === 'title' ? next : section.title);
    fd.set(
      'description',
      field === 'description' ? next : section.description ?? '',
    );
    fd.set('week_number', String(section.week_number));
    if (section.is_visible) fd.set('is_visible', 'on');

    const result = await updateSection(fd);
    if (result.success) {
      router.refresh();
      return { success: true as const };
    }
    return result;
  }

  function handleDeleteSection(section: Section) {
    schedulePending('section', section.id, section.title, async () => {
      const fd = new FormData();
      fd.set('section_id', String(section.id));
      const result = await deleteSection(fd);
      if (!result.success) throw new Error(result.error);
    });
  }

  function handleReorderSection(section: Section, direction: 'up' | 'down') {
    setError(null);
    const fd = new FormData();
    fd.set('section_id', String(section.id));
    fd.set('direction', direction);
    startTransition(async () => {
      const result = await reorderSection(fd);
      if (!result.success) setError(result.error);
      else router.refresh();
    });
  }

  async function handleCreateSection(title: string, weekNumber: number) {
    const fd = new FormData();
    fd.set('course_id', String(courseId));
    fd.set('title', title);
    fd.set('week_number', String(weekNumber));
    const result = await createSection(fd);
    if (result.success) {
      setShowAddSection(false);
      router.refresh();
      return { success: true as const };
    }
    return result;
  }

  // -------- Activity actions --------

  async function saveActivityField(
    activity: Activity,
    field: 'title' | 'description',
    next: string,
  ) {
    const fd = new FormData();
    fd.set('activity_id', String(activity.id));
    fd.set('title', field === 'title' ? next : activity.title);
    fd.set(
      'description',
      field === 'description' ? next : activity.description ?? '',
    );
    if (activity.due_date) {
      const localIso = new Date(activity.due_date).toISOString().slice(0, 16);
      fd.set('due_date', localIso);
    }
    if (activity.is_visible) fd.set('is_visible', 'on');

    const result = await updateActivity(fd);
    if (result.success) {
      router.refresh();
      return { success: true as const };
    }
    return result;
  }

  function handleDeleteActivity(activity: Activity) {
    schedulePending('activity', activity.id, activity.title, async () => {
      const fd = new FormData();
      fd.set('activity_id', String(activity.id));
      const result = await deleteActivity(fd);
      if (!result.success) throw new Error(result.error);
    });
  }

  function handleReorderActivity(activity: Activity, direction: 'up' | 'down') {
    setError(null);
    const fd = new FormData();
    fd.set('activity_id', String(activity.id));
    fd.set('direction', direction);
    startTransition(async () => {
      const result = await reorderActivity(fd);
      if (!result.success) setError(result.error);
      else router.refresh();
    });
  }

  async function handleCreateActivity(
    sectionId: number,
    type: string,
    title: string,
    extras: ActivityExtras = {},
  ) {
    const fd = new FormData();
    fd.set('section_id', String(sectionId));
    fd.set('type', type);
    fd.set('title', title);
    if (extras.external_url) fd.set('external_url', extras.external_url);
    if (extras.file_name) fd.set('file_name', extras.file_name);
    if (extras.file_url) fd.set('file_url', extras.file_url);
    const result = await createActivity(fd);
    if (result.success) {
      router.refresh();
      return { success: true as const };
    }
    return result;
  }

  const visibleSections = initialSections.filter(
    (s) => !isPending('section', s.id),
  );

  return (
    <section>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {visibleSections.length === 0 && !showAddSection ? (
        <p className={styles.emptyState}>섹션이 없습니다. 아래에서 추가해보세요.</p>
      ) : (
        <div className={styles.sectionList}>
          {visibleSections.map((section, idx) => (
            <article
              key={section.id}
              className={`${styles.sectionCard} ${!section.is_visible ? styles.sectionCardHidden : ''}`}
            >
              <header className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <span className={styles.weekBadge}>
                    {section.week_number}주차
                  </span>
                  <InlineEditableText
                    value={section.title}
                    variant="heading"
                    ariaLabel="섹션 제목"
                    onSave={(next) => saveSectionField(section, 'title', next)}
                  />
                  {!section.is_visible && (
                    <span className={styles.hiddenBadge}>숨김</span>
                  )}
                </div>
                <div className={styles.hoverActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="위로 이동"
                    disabled={idx === 0}
                    onClick={() => handleReorderSection(section, 'up')}
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="아래로 이동"
                    disabled={idx === visibleSections.length - 1}
                    onClick={() => handleReorderSection(section, 'down')}
                  >
                    &#9660;
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    aria-label="섹션 삭제"
                    onClick={() => handleDeleteSection(section)}
                  >
                    ×
                  </button>
                </div>
              </header>

              <InlineEditableText
                value={section.description ?? ''}
                variant="description"
                ariaLabel="섹션 설명"
                placeholder="설명을 추가하려면 클릭하세요"
                allowEmpty
                onSave={(next) => saveSectionField(section, 'description', next)}
              />

              <ActivityArea
                sectionId={section.id}
                activities={activitiesBySection[section.id] || []}
                pendingFilter={(id) => !isPending('activity', id)}
                onSaveField={saveActivityField}
                onReorder={handleReorderActivity}
                onDelete={handleDeleteActivity}
                onCreate={handleCreateActivity}
              />
            </article>
          ))}
        </div>
      )}

      {showAddSection ? (
        <AddSectionForm
          existingMaxWeek={Math.max(
            0,
            ...initialSections.map((s) => s.week_number),
          )}
          onCreate={handleCreateSection}
          onCancel={() => setShowAddSection(false)}
        />
      ) : (
        <button
          type="button"
          className={styles.addCard}
          style={{ marginTop: 'var(--space-4)' }}
          onClick={() => setShowAddSection(true)}
        >
          + 섹션 추가
        </button>
      )}

      <UndoToastStack pendings={pendingDeletes} onUndo={undoPending} />
    </section>
  );
}

// -------- Activity area --------

function ActivityArea({
  sectionId,
  activities,
  pendingFilter,
  onSaveField,
  onReorder,
  onDelete,
  onCreate,
}: {
  sectionId: number;
  activities: Activity[];
  pendingFilter: (activityId: number) => boolean;
  onSaveField: (
    activity: Activity,
    field: 'title' | 'description',
    next: string,
  ) => Promise<{ success: true } | { success: false; error: string }>;
  onReorder: (activity: Activity, direction: 'up' | 'down') => void;
  onDelete: (activity: Activity) => void;
  onCreate: (
    sectionId: number,
    type: string,
    title: string,
    extras?: ActivityExtras,
  ) => Promise<{ success: true } | { success: false; error: string }>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const visible = activities.filter((a) => pendingFilter(a.id));

  return (
    <div>
      {visible.length === 0 ? (
        <p className={styles.sectionDescPlaceholder}>활동이 없습니다.</p>
      ) : (
        <ul className={styles.activityList}>
          {visible.map((a, idx) => (
            <li
              key={a.id}
              className={`${styles.activityRow} ${!a.is_visible ? styles.activityRowHidden : ''}`}
            >
              <span className={styles.typeBadge}>
                {activityTypeLabel(a.type)}
              </span>
              <div className={styles.activityTitleArea}>
                <InlineEditableText
                  value={a.title}
                  variant="heading"
                  ariaLabel="활동 제목"
                  onSave={(next) => onSaveField(a, 'title', next)}
                />
              </div>
              {a.due_date && (
                <span className={styles.dueDate}>
                  마감: {new Date(a.due_date).toLocaleDateString('ko-KR')}
                </span>
              )}
              {!a.is_visible && (
                <span className={styles.hiddenBadge}>숨김</span>
              )}
              <Link
                href={`/activities/${a.id}`}
                className={styles.activityLink}
                style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}
              >
                상세 &rarr;
              </Link>
              <div className={styles.hoverActions}>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnSmall}`}
                  aria-label="위로 이동"
                  disabled={idx === 0}
                  onClick={() => onReorder(a, 'up')}
                >
                  &#9650;
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnSmall}`}
                  aria-label="아래로 이동"
                  disabled={idx === visible.length - 1}
                  onClick={() => onReorder(a, 'down')}
                >
                  &#9660;
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnSmall} ${styles.iconBtnDanger}`}
                  aria-label="활동 삭제"
                  onClick={() => onDelete(a)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAdd ? (
        <AddActivityForm
          onCreate={async (type, title, extras) => {
            const r = await onCreate(sectionId, type, title, extras);
            if (r.success) setShowAdd(false);
            return r;
          }}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <button
          type="button"
          className={styles.addActivityBtn}
          onClick={() => setShowAdd(true)}
        >
          + 활동 추가
        </button>
      )}
    </div>
  );
}

// -------- Inline add forms --------

function AddSectionForm({
  existingMaxWeek,
  onCreate,
  onCancel,
}: {
  existingMaxWeek: number;
  onCreate: (
    title: string,
    weekNumber: number,
  ) => Promise<{ success: true } | { success: false; error: string }>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [weekNumber, setWeekNumber] = useState(String(existingMaxWeek + 1));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    const wn = Number(weekNumber);
    if (isNaN(wn) || wn < 1) {
      setError('주차 번호는 1 이상이어야 합니다.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await onCreate(title.trim(), wn);
      if (!r.success) setError(r.error);
    });
  }

  return (
    <div className={styles.inlineForm} style={{ marginTop: 'var(--space-4)' }}>
      <div className={styles.inlineFieldRow}>
        <input
          type="number"
          min={1}
          className={`${styles.inlineInput} ${styles.inlineInputWeek}`}
          value={weekNumber}
          onChange={(e) => setWeekNumber(e.target.value)}
          aria-label="주차"
        />
        <input
          type="text"
          className={styles.inlineInput}
          placeholder="새 섹션 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
          aria-label="섹션 제목"
        />
      </div>
      {error && <span className={styles.editableError} role="alert">{error}</span>}
      <div className={styles.inlineActions}>
        <button
          type="button"
          className={styles.inlinePrimary}
          onClick={submit}
          disabled={isPending}
        >
          {isPending ? '추가 중…' : '추가'}
        </button>
        <button
          type="button"
          className={styles.inlineSecondary}
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </div>
  );
}

function AddActivityForm({
  onCreate,
  onCancel,
}: {
  onCreate: (
    type: string,
    title: string,
    extras?: ActivityExtras,
  ) => Promise<{ success: true } | { success: false; error: string }>;
  onCancel: () => void;
}) {
  const [type, setType] = useState('quiz');
  const [title, setTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    if (type === 'url' && !externalUrl.trim()) {
      setError('URL 주소를 입력하세요.');
      return;
    }
    if (type === 'file' && (!fileName.trim() || !fileUrl.trim())) {
      setError('파일 이름과 URL을 입력하세요.');
      return;
    }

    const extras: ActivityExtras = {};
    if (type === 'url') extras.external_url = externalUrl.trim();
    if (type === 'file') {
      extras.file_name = fileName.trim();
      extras.file_url = fileUrl.trim();
    }

    setError(null);
    startTransition(async () => {
      const r = await onCreate(type, title.trim(), extras);
      if (!r.success) setError(r.error);
    });
  }

  return (
    <div className={styles.inlineForm}>
      <div className={styles.inlineFieldRow}>
        <select
          className={styles.inlineSelect}
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="활동 유형"
        >
          <option value="quiz">퀴즈</option>
          <option value="assignment">과제</option>
          <option value="page">페이지</option>
          <option value="url">링크</option>
          <option value="file">파일</option>
          <option value="forum">토론</option>
        </select>
        <input
          type="text"
          className={styles.inlineInput}
          placeholder="활동 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
          aria-label="활동 제목"
        />
      </div>
      {type === 'url' && (
        <input
          type="url"
          className={styles.inlineInput}
          placeholder="https://example.com"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          aria-label="외부 URL"
          style={{ marginTop: 'var(--space-2)' }}
        />
      )}
      {type === 'file' && (
        <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <input
            type="text"
            className={styles.inlineInput}
            placeholder="파일 이름 (예: 강의자료.pdf)"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            aria-label="파일 이름"
          />
          <input
            type="url"
            className={styles.inlineInput}
            placeholder="파일 URL"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            aria-label="파일 URL"
          />
        </div>
      )}
      {error && <span className={styles.editableError} role="alert">{error}</span>}
      <div className={styles.inlineActions}>
        <button
          type="button"
          className={styles.inlinePrimary}
          onClick={submit}
          disabled={isPending}
        >
          {isPending ? '추가 중…' : '추가'}
        </button>
        <button
          type="button"
          className={styles.inlineSecondary}
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </div>
  );
}
