'use server';

import { sql } from '@/lib/db';
import { verifyActivityOwner } from './activity';

type Result = { success: true } | { success: false; error: string };

export async function updateUrlResource(formData: FormData): Promise<Result> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const auth = await verifyActivityOwner(activityId);
  if (!auth.ok) return { success: false, error: auth.error };

  const externalUrl = (formData.get('external_url') as string | null)?.trim() || '';
  const openInNewTab = formData.get('open_in_new_tab') !== 'off';

  if (!externalUrl) {
    return { success: false, error: 'URL 주소는 필수입니다.' };
  }

  const { rows: typeRow } = await sql`
    SELECT type FROM activities WHERE id = ${activityId}
  `;
  if (typeRow.length === 0 || typeRow[0].type !== 'url') {
    return { success: false, error: 'URL 활동이 아닙니다.' };
  }

  await sql`
    INSERT INTO activity_urls (activity_id, external_url, open_in_new_tab)
    VALUES (${activityId}, ${externalUrl}, ${openInNewTab})
    ON CONFLICT (activity_id) DO UPDATE
      SET external_url = EXCLUDED.external_url,
          open_in_new_tab = EXCLUDED.open_in_new_tab
  `;

  return { success: true };
}
