'use client';

import styles from './modeless.module.css';

export interface PendingDelete {
  key: string;
  label: string;
}

export function UndoToastStack({
  pendings,
  onUndo,
}: {
  pendings: PendingDelete[];
  onUndo: (key: string) => void;
}) {
  if (pendings.length === 0) return null;
  return (
    <div className={styles.toastStack} aria-live="polite">
      {pendings.map((p) => (
        <div key={p.key} className={styles.toast} role="status">
          <span className={styles.toastMessage}>
            &lsquo;{p.label}&rsquo; 삭제됨
          </span>
          <button
            type="button"
            className={styles.toastUndo}
            onClick={() => onUndo(p.key)}
          >
            되돌리기
          </button>
          <span className={styles.toastProgress} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
