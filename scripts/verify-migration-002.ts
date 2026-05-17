/**
 * Migration 002 검증: CHECK 제약 6종 + 4개 신규 테이블 존재 확인
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.POSTGRES_URL!, { fullResults: true });

async function verify() {
  const { rows: constraint } = await sql.query(
    `SELECT pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE conname = 'activities_type_check'`,
  );
  console.log('CHECK 제약:', constraint[0]?.def ?? '(없음)');

  const tables = ['activity_pages', 'activity_urls', 'activity_files', 'forum_posts'];
  for (const t of tables) {
    const { rows } = await sql.query(
      `SELECT to_regclass($1) IS NOT NULL AS exists`,
      [t],
    );
    console.log(`테이블 ${t}: ${rows[0].exists ? 'OK' : 'MISSING'}`);
  }

  const { rows: count } = await sql.query(
    `SELECT count(*)::int AS n FROM activities`,
  );
  console.log(`기존 activities 행 수: ${count[0].n}`);
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
