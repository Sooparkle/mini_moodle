'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import styles from './nav.module.css';

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  teacher: '교수',
  student: '학생',
};

export default function Nav({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  return (
    <header className={styles.nav}>
      <nav className={styles.navLeft}>
        <Link href="/dashboard" className={styles.logo}>
          MoodleLite
        </Link>
        <Link href="/courses" className={styles.navLink}>
          코스
        </Link>
      </nav>

      <div className={styles.navRight}>
        <span className={styles.userInfo}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.roleBadge}>
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={styles.logoutBtn}
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
