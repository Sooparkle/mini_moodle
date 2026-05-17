'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type FocusEvent,
} from 'react';
import styles from './modeless.module.css';

type Variant = 'heading' | 'description';

interface Props {
  value: string;
  variant: Variant;
  onSave: (next: string) => Promise<{ success: true } | { success: false; error: string }>;
  placeholder?: string;
  ariaLabel?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
}

export function InlineEditableText({
  value,
  variant,
  onSave,
  placeholder = '비어 있음 — 클릭하여 편집',
  ariaLabel,
  allowEmpty = false,
  disabled = false,
}: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'saving'>('view');
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (mode === 'view') setDraft(value);
  }, [value, mode]);

  useEffect(() => {
    if (mode === 'edit' && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      } else {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [mode]);

  function enterEdit() {
    if (disabled) return;
    cancelledRef.current = false;
    setDraft(value);
    setError(null);
    setMode('edit');
  }

  function cancel() {
    cancelledRef.current = true;
    setDraft(value);
    setError(null);
    setMode('view');
  }

  async function commit() {
    const trimmed = draft.trim();
    if (!allowEmpty && !trimmed) {
      setError('비워둘 수 없습니다.');
      return;
    }
    if (trimmed === value.trim()) {
      setMode('view');
      return;
    }
    setMode('saving');
    setError(null);
    const result = await onSave(trimmed);
    if (result.success) {
      setMode('view');
    } else {
      setError(result.error);
      setMode('edit');
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }
    if (variant === 'heading' && e.key === 'Enter') {
      e.preventDefault();
      void commit();
      return;
    }
    if (variant === 'description' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void commit();
    }
  }

  function handleBlur(_e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (cancelledRef.current) return;
    void commit();
  }

  const isHeading = variant === 'heading';
  const empty = value.trim().length === 0;

  if (mode === 'view' || mode === 'saving') {
    const Wrapper = isHeading ? 'span' : 'div';
    const wrapperClass = isHeading ? styles.editable : styles.editableBlock;

    return (
      <Wrapper
        className={wrapperClass}
        data-disabled={disabled ? 'true' : undefined}
        onClick={enterEdit}
        role={disabled ? undefined : 'button'}
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            enterEdit();
          }
        }}
      >
        {isHeading ? (
          <span className={`${styles.editableValue} ${empty ? styles.editableValueEmpty : ''}`}>
            {empty ? placeholder : value}
          </span>
        ) : (
          <p className={`${styles.editableValue} ${empty ? styles.editableValueEmpty : styles.sectionDesc}`}>
            {empty ? placeholder : value}
          </p>
        )}
        {!disabled && (
          <span className={styles.penIcon} aria-hidden="true">
            <PenSvg />
          </span>
        )}
        {mode === 'saving' && <span className={styles.editableSaving}>저장 중…</span>}
      </Wrapper>
    );
  }

  return (
    <span className={styles.editableBlock} style={{ display: isHeading ? 'inline-flex' : 'flex', flexDirection: 'column', width: '100%' }}>
      {isHeading ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className={styles.editableInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={handleBlur}
          aria-label={ariaLabel}
        />
      ) : (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          className={styles.editableTextarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={handleBlur}
          aria-label={ariaLabel}
          placeholder={placeholder}
        />
      )}
      {error && <span className={styles.editableError} role="alert">{error}</span>}
    </span>
  );
}

function PenSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.333 2.667a1.886 1.886 0 1 1 2.667 2.667L5.333 14 2 14.667l.667-3.334L11.333 2.667Z" />
    </svg>
  );
}
