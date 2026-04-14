import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// 단일 쿼리는 이 파일에서 import:
//   import { sql } from '@/lib/db';
//   const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
//
// fullResults: true → { rows, rowCount, fields } 반환 (node-postgres 호환 형태)
export const sql = neon(process.env.POSTGRES_URL!, { fullResults: true });

// 트랜잭션이 필요한 경우 (여러 테이블 동시 변경)
// 사용법:
//   await withTransaction(async (tx) => {
//     await tx.query('INSERT INTO ... VALUES ($1)', [value]);
//     await tx.query('UPDATE ... SET x = $1 WHERE id = $2', [x, id]);
//   });
const pool = new Pool({ connectionString: process.env.POSTGRES_URL! });

export async function withTransaction<T>(
  fn: (tx: import('@neondatabase/serverless').PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
