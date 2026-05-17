/**
 * 단일 마이그레이션 SQL 파일을 Neon Postgres에 적용
 * 실행: npx tsx scripts/apply-migration.ts <path-to-sql>
 * 전제: 마이그레이션 SQL은 BEGIN/COMMIT 블록을 자체 포함 (트랜잭션 안전)
 */

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

neonConfig.webSocketConstructor = ws;

async function applyMigration() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npx tsx scripts/apply-migration.ts <path-to-sql>');
    process.exit(1);
  }

  const path = resolve(process.cwd(), file);
  const sqlText = readFileSync(path, 'utf8');

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL! });
  const client = await pool.connect();

  console.log(`Applying migration: ${file}`);
  try {
    // simple-query 모드: 한 connection에 multi-statement 허용
    await client.query(sqlText);
    console.log('Migration applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
