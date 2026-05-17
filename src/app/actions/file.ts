'use server';

import { sql } from '@/lib/db';
import { verifyActivityOwner } from './activity';

type Result = { success: true } | { success: false; error: string };

export async function updateFileResource(formData: FormData): Promise<Result> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const auth = await verifyActivityOwner(activityId);
  if (!auth.ok) return { success: false, error: auth.error };

  const fileName = (formData.get('file_name') as string | null)?.trim() || '';
  const fileUrl = (formData.get('file_url') as string | null)?.trim() || '';
  const fileSizeStr = formData.get('file_size_bytes') as string | null;
  const fileSize = fileSizeStr ? Number(fileSizeStr) : null;

  if (!fileName || !fileUrl) {
    return { success: false, error: '파일 이름과 URL은 필수입니다.' };
  }

  const { rows: typeRow } = await sql`
    SELECT type FROM activities WHERE id = ${activityId}
  `;
  if (typeRow.length === 0 || typeRow[0].type !== 'file') {
    return { success: false, error: '파일 활동이 아닙니다.' };
  }

  await sql`
    INSERT INTO activity_files (activity_id, file_name, file_url, file_size_bytes)
    VALUES (${activityId}, ${fileName}, ${fileUrl}, ${fileSize})
    ON CONFLICT (activity_id) DO UPDATE
      SET file_name = EXCLUDED.file_name,
          file_url = EXCLUDED.file_url,
          file_size_bytes = EXCLUDED.file_size_bytes
  `;

  return { success: true };
}
