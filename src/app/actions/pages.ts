'use server';

import { sql } from '@/lib/db';
import { verifyActivityOwner } from './activity';

type Result = { success: true } | { success: false; error: string };

export async function updatePageBody(formData: FormData): Promise<Result> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const auth = await verifyActivityOwner(activityId);
  if (!auth.ok) return { success: false, error: auth.error };

  const body = (formData.get('body') as string | null) ?? '';

  // type 검증
  const { rows: typeRow } = await sql`
    SELECT type FROM activities WHERE id = ${activityId}
  `;
  if (typeRow.length === 0 || typeRow[0].type !== 'page') {
    return { success: false, error: '페이지 활동이 아닙니다.' };
  }

  // UPSERT: 마이그레이션 이전에 만들어진 활동에 대비
  await sql`
    INSERT INTO activity_pages (activity_id, body)
    VALUES (${activityId}, ${body})
    ON CONFLICT (activity_id) DO UPDATE SET body = EXCLUDED.body
  `;

  return { success: true };
}
