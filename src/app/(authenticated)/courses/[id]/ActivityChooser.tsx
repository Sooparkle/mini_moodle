'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createActivity } from '@/app/actions/activity';
import styles from './activity-chooser.module.css';

type Purpose = 'content' | 'communication' | 'assessment';
type ActivityType = 'page' | 'url' | 'file' | 'forum' | 'quiz' | 'assignment';

interface TypeMeta {
  type: ActivityType;
  label: string;
  description: string;
  purpose: Purpose;
}

const TYPE_CATALOG: TypeMeta[] = [
  { type: 'page', label: '페이지', description: '본문을 직접 작성하는 정적 페이지', purpose: 'content' },
  { type: 'url', label: '링크', description: '외부 사이트로 연결되는 URL', purpose: 'content' },
  { type: 'file', label: '파일', description: '학생이 다운로드할 수 있는 파일', purpose: 'content' },
  { type: 'forum', label: '토론', description: '학생들이 글을 작성·답글하는 토론장', purpose: 'communication' },
  { type: 'quiz', label: '퀴즈', description: '객관식 자동 채점 평가', purpose: 'assessment' },
  { type: 'assignment', label: '과제', description: '텍스트 제출 + 수동 채점', purpose: 'assessment' },
];

const PURPOSE_LABELS: Record<Purpose, string> = {
  content: 'Content',
  communication: 'Communication',
  assessment: 'Assessment',
};

export function ActivityChooser({
  sectionId,
  onClose,
  onCreated,
}: {
  sectionId: number;
  onClose: () => void;
  onCreated?: (activityId: number, type: ActivityType) => void;
}) {
  const router = useRouter();
  const [activePurpose, setActivePurpose] = useState<Purpose>('content');
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSelectType(type: ActivityType) {
    setSelectedType(type);
    setError(null);
  }

  async function handleSubmit(formData: FormData) {
    if (!selectedType) return;
    formData.set('section_id', String(sectionId));
    formData.set('type', selectedType);
    setError(null);

    startTransition(async () => {
      const result = await createActivity(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onCreated?.(result.activityId ?? 0, selectedType);
      router.refresh();
      onClose();
    });
  }

  const filtered = TYPE_CATALOG.filter((t) => t.purpose === activePurpose);
  const selected = selectedType ? TYPE_CATALOG.find((t) => t.type === selectedType) : null;

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chooser-title"
      >
        <header className={styles.header}>
          <h2 id="chooser-title" className={styles.title}>
            {selected ? `${selected.label} 추가` : '활동 추가'}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        {selected ? (
          <TypeForm
            type={selected.type}
            onSubmit={handleSubmit}
            onBack={() => {
              setSelectedType(null);
              setError(null);
            }}
            isPending={isPending}
            error={error}
          />
        ) : (
          <>
            <nav className={styles.tabs} role="tablist">
              {(Object.keys(PURPOSE_LABELS) as Purpose[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={activePurpose === p}
                  className={styles.tab}
                  data-active={activePurpose === p}
                  onClick={() => setActivePurpose(p)}
                >
                  {PURPOSE_LABELS[p]}
                </button>
              ))}
            </nav>

            <div className={styles.cardGrid}>
              {filtered.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  className={styles.card}
                  onClick={() => handleSelectType(t.type)}
                >
                  <span className={styles.cardLabel}>{t.label}</span>
                  <span className={styles.cardDesc}>{t.description}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TypeForm({
  type,
  onSubmit,
  onBack,
  isPending,
  error,
}: {
  type: ActivityType;
  onSubmit: (fd: FormData) => void;
  onBack: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <form action={onSubmit} className={styles.form}>
      <label className={styles.label} htmlFor="chooser-title-field">제목</label>
      <input
        id="chooser-title-field"
        name="title"
        className={styles.input}
        required
        autoFocus
        autoComplete="off"
      />

      <label className={styles.label} htmlFor="chooser-desc">설명 (선택)</label>
      <textarea
        id="chooser-desc"
        name="description"
        className={styles.textarea}
        autoComplete="off"
      />

      {type === 'url' && (
        <>
          <label className={styles.label} htmlFor="chooser-url">URL 주소</label>
          <input
            id="chooser-url"
            name="external_url"
            type="url"
            className={styles.input}
            required
            placeholder="https://example.com"
            autoComplete="off"
          />
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="open_in_new_tab"
              defaultChecked
              className={styles.checkbox}
            />
            새 탭에서 열기
          </label>
        </>
      )}

      {type === 'file' && (
        <>
          <label className={styles.label} htmlFor="chooser-file-name">파일 이름</label>
          <input
            id="chooser-file-name"
            name="file_name"
            className={styles.input}
            required
            placeholder="예: 강의자료_1주차.pdf"
            autoComplete="off"
          />
          <label className={styles.label} htmlFor="chooser-file-url">파일 URL</label>
          <input
            id="chooser-file-url"
            name="file_url"
            type="url"
            className={styles.input}
            required
            placeholder="https://..."
            autoComplete="off"
          />
        </>
      )}

      {type === 'page' && (
        <>
          <label className={styles.label} htmlFor="chooser-body">페이지 본문</label>
          <textarea
            id="chooser-body"
            name="body"
            className={styles.textarea}
            rows={5}
            placeholder="페이지에 표시할 내용을 입력하세요 (나중에 편집 가능)"
            autoComplete="off"
          />
        </>
      )}

      {(type === 'quiz' || type === 'assignment') && (
        <>
          <label className={styles.label} htmlFor="chooser-due">마감일 (선택)</label>
          <input
            id="chooser-due"
            name="due_date"
            type="datetime-local"
            className={styles.input}
          />
        </>
      )}

      {error && (
        <p className={styles.error} role="alert">{error}</p>
      )}

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={onBack}
          disabled={isPending}
        >
          ← 유형 다시 선택
        </button>
        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={isPending}
        >
          {isPending ? '추가 중...' : '추가'}
        </button>
      </div>
    </form>
  );
}
