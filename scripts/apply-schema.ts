/**
 * schema.sql을 Vercel Postgres(Neon)에 적용하는 스크립트
 * 실행: npx tsx scripts/apply-schema.ts
 * 전제: .env.local에 POSTGRES_URL 설정 완료
 */

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.POSTGRES_URL!, { fullResults: true });
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function applySchema() {
  const schemaPath = join(process.cwd(), 'src/sql/schema.sql');
  const raw = readFileSync(schemaPath, 'utf8');

  // 주석 줄 제거 후 세미콜론으로 분리
  const statements = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Applying ${statements.length} statements from schema.sql...`);

  for (const [i, stmt] of statements.entries()) {
    const preview = stmt.slice(0, 60).replace(/\s+/g, ' ');
    try {
      await sql.query(stmt);
      console.log(`  [${i + 1}/${statements.length}] OK  ${preview}...`);
    } catch (err) {
      console.error(`  [${i + 1}/${statements.length}] FAIL ${preview}...`);
      throw err;
    }
  }

  console.log('\nSchema applied successfully.');
}

applySchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Schema application failed:', err);
    process.exit(1);
  });
