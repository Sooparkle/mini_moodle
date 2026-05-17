'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import styles from './role-toggle.module.css';

type Role = 'admin' | 'teacher' | 'student';

const ROLE_LABELS: Record<Role, string> = {
  admin: '관리자',
  teacher: '강사',
  student: '학생',
};

export function RoleToggle({
  sessionRole,
  current,
}: {
  sessionRole: string;
  current: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setRole(next: Role) {
    const sp = new URLSearchParams(params.toString());
    if (next === (sessionRole as Role)) {
      sp.delete('role');
    } else {
      sp.set('role', next);
    }
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <fieldset className={styles.toggle} aria-label="역할 전환 (테스트)">
      <legend className={styles.legend}>역할(테스트)</legend>
      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
        <label key={r} className={styles.option} data-active={current === r}>
          <input
            type="radio"
            name="role"
            value={r}
            checked={current === r}
            onChange={() => setRole(r)}
            disabled={isPending}
          />
          <span>{ROLE_LABELS[r]}</span>
        </label>
      ))}
    </fieldset>
  );
}
