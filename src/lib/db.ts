import { sql } from '@vercel/postgres';
import type { VercelPoolClient } from '@vercel/postgres';

// 단일 쿼리는 @vercel/postgres에서 직접 import:
//   import { sql } from '@vercel/postgres';
//   const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;

// 트랜잭션이 필요한 경우 (여러 테이블 동시 변경)
// 사용법:
//   await withTransaction(async (tx) => {
//     await tx.sql`INSERT INTO ...`;
//     await tx.sql`UPDATE ...`;
//   });
export async function withTransaction<T>(
  fn: (tx: VercelPoolClient) => Promise<T>,
): Promise<T> {
  const client = await sql.connect();
  try {
    await client.sql`BEGIN`;
    const result = await fn(client);
    await client.sql`COMMIT`;
    return result;
  } catch (error) {
    await client.sql`ROLLBACK`;
    throw error;
  } finally {
    client.release();
  }
}
