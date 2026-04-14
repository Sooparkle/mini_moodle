/**
 * DB 행 수 검증 스크립트 (마이그레이션 baseline 비교용)
 * 사용:
 *   기본 .env.local 사용:    npx tsx scripts/verify-counts.ts
 *   특정 URL 오버라이드:     POSTGRES_URL=... npx tsx scripts/verify-counts.ts
 */

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.POSTGRES_URL!, { fullResults: true });

async function verify() {
  const { rows } = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM users)       AS users,
      (SELECT COUNT(*)::int FROM roles)       AS roles,
      (SELECT COUNT(*)::int FROM courses)     AS courses,
      (SELECT COUNT(*)::int FROM sections)    AS sections,
      (SELECT COUNT(*)::int FROM activities)  AS activities,
      (SELECT COUNT(*)::int FROM enrollments) AS enrollments
  `;
  console.log('Row counts:', rows[0]);
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
