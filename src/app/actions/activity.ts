'use server';

import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

type ActivityResult =
  | { success: true; activityId?: number }
  | { success: false; error: string };

async function verifySectionOwner(sectionId: number) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') {
    return { ok: false as const, error: '활동 관리 권한이 없습니다.' };
  }

  const userId = Number(session.user.id);
  const { rows } = await sql`
    SELECT s.course_id FROM sections s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = ${sectionId} AND c.created_by = ${userId}
  `;
  if (rows.length === 0) {
    return { ok: false as const, error: '해당 코스의 소유자만 활동을 관리할 수 있습니다.' };
  }

  return { ok: true as const, userId, courseId: rows[0].course_id as number };
}

async function verifyActivityOwner(activityId: number) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') {
    return { ok: false as const, error: '활동 관리 권한이 없습니다.' };
  }

  const userId = Number(session.user.id);
  const { rows } = await sql`
    SELECT a.id, a.section_id, s.course_id
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId} AND c.created_by = ${userId}
  `;
  if (rows.length === 0) {
    return { ok: false as const, error: '해당 코스의 소유자만 활동을 관리할 수 있습니다.' };
  }

  return { ok: true as const, userId, sectionId: rows[0].section_id as number, courseId: rows[0].course_id as number };
}

const ALLOWED_TYPES = ['quiz', 'assignment', 'page', 'url', 'file', 'forum'] as const;
const GRADED_TYPES = new Set(['quiz', 'assignment']);
type ActivityType = (typeof ALLOWED_TYPES)[number];

function isAllowedType(t: string): t is ActivityType {
  return (ALLOWED_TYPES as readonly string[]).includes(t);
}

export async function createActivity(formData: FormData): Promise<ActivityResult> {
  const sectionId = Number(formData.get('section_id'));
  if (isNaN(sectionId)) return { success: false, error: '잘못된 섹션 ID입니다.' };

  const auth = await verifySectionOwner(sectionId);
  if (!auth.ok) return { success: false, error: auth.error };

  const type = formData.get('type') as string;
  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const dueDateStr = formData.get('due_date') as string;
  const dueDate = dueDateStr ? new Date(dueDateStr).toISOString() : null;

  if (!title) return { success: false, error: '활동 제목은 필수입니다.' };
  if (!isAllowedType(type)) {
    return { success: false, error: '지원하지 않는 활동 유형입니다.' };
  }

  // type별 추가 필드 사전 검증
  const externalUrl = (formData.get('external_url') as string | null)?.trim() || '';
  const openInNewTab = formData.get('open_in_new_tab') !== 'off';
  const fileName = (formData.get('file_name') as string | null)?.trim() || '';
  const fileUrl = (formData.get('file_url') as string | null)?.trim() || '';
  const fileSizeStr = formData.get('file_size_bytes') as string | null;
  const fileSize = fileSizeStr ? Number(fileSizeStr) : null;
  const pageBody = (formData.get('body') as string | null) ?? '';

  if (type === 'url' && !externalUrl) {
    return { success: false, error: 'URL 주소는 필수입니다.' };
  }
  if (type === 'file' && (!fileName || !fileUrl)) {
    return { success: false, error: '파일 이름과 URL은 필수입니다.' };
  }

  const activityId = await withTransaction(async (tx) => {
    const { rows: maxRow } = await tx.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM activities WHERE section_id = $1',
      [sectionId]
    );

    const { rows } = await tx.query(
      'INSERT INTO activities (section_id, type, title, description, due_date, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [sectionId, type, title, description, dueDate, maxRow[0].next_order]
    );

    const newId = rows[0].id;

    // type별 자식 테이블 row
    if (type === 'page') {
      await tx.query(
        'INSERT INTO activity_pages (activity_id, body) VALUES ($1, $2)',
        [newId, pageBody]
      );
    } else if (type === 'url') {
      await tx.query(
        'INSERT INTO activity_urls (activity_id, external_url, open_in_new_tab) VALUES ($1, $2, $3)',
        [newId, externalUrl, openInNewTab]
      );
    } else if (type === 'file') {
      await tx.query(
        'INSERT INTO activity_files (activity_id, file_name, file_url, file_size_bytes) VALUES ($1, $2, $3, $4)',
        [newId, fileName, fileUrl, fileSize]
      );
    }
    // forum: 자식 row 없음 (게시물은 사용 시점에 생성)

    // grade_item은 채점 가능 타입만
    if (GRADED_TYPES.has(type)) {
      const { rows: maxGrade } = await tx.query(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM grade_items WHERE course_id = $1',
        [auth.courseId]
      );
      await tx.query(
        'INSERT INTO grade_items (course_id, activity_id, item_name, grade_max, grade_min, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
        [auth.courseId, newId, title, 100, 0, maxGrade[0].next_order]
      );
    }

    return newId;
  });

  return { success: true, activityId };
}

export async function updateActivity(formData: FormData): Promise<ActivityResult> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const auth = await verifyActivityOwner(activityId);
  if (!auth.ok) return { success: false, error: auth.error };

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const dueDateStr = formData.get('due_date') as string;
  const dueDate = dueDateStr ? new Date(dueDateStr).toISOString() : null;
  const isVisible = formData.get('is_visible') === 'on';

  if (!title) return { success: false, error: '활동 제목은 필수입니다.' };

  await sql`
    UPDATE activities
    SET title = ${title}, description = ${description},
        due_date = ${dueDate}, is_visible = ${isVisible}
    WHERE id = ${activityId}
  `;

  await sql`
    UPDATE grade_items SET item_name = ${title}
    WHERE activity_id = ${activityId}
  `;

  return { success: true };
}

export async function deleteActivity(formData: FormData): Promise<ActivityResult> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const auth = await verifyActivityOwner(activityId);
  if (!auth.ok) return { success: false, error: auth.error };

  await sql`DELETE FROM activities WHERE id = ${activityId}`;

  return { success: true };
}

export async function reorderActivity(formData: FormData): Promise<ActivityResult> {
  const activityId = Number(formData.get('activity_id'));
  const direction = formData.get('direction') as string;

  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };
  if (direction !== 'up' && direction !== 'down') {
    return { success: false, error: '방향은 up 또는 down이어야 합니다.' };
  }

  const { rows: activityRows } = await sql`
    SELECT a.id, a.section_id, a.sort_order
    FROM activities a WHERE a.id = ${activityId}
  `;
  if (activityRows.length === 0) return { success: false, error: '활동을 찾을 수 없습니다.' };

  const current = activityRows[0];

  const auth = await verifySectionOwner(current.section_id);
  if (!auth.ok) return { success: false, error: auth.error };

  const adjacentQuery = direction === 'up'
    ? sql`
        SELECT id, sort_order FROM activities
        WHERE section_id = ${current.section_id} AND sort_order < ${current.sort_order}
        ORDER BY sort_order DESC LIMIT 1
      `
    : sql`
        SELECT id, sort_order FROM activities
        WHERE section_id = ${current.section_id} AND sort_order > ${current.sort_order}
        ORDER BY sort_order ASC LIMIT 1
      `;

  const { rows: adjacentRows } = await adjacentQuery;
  if (adjacentRows.length === 0) {
    return { success: false, error: '더 이상 이동할 수 없습니다.' };
  }

  const adjacent = adjacentRows[0];

  await withTransaction(async (tx) => {
    await tx.query('UPDATE activities SET sort_order = $1 WHERE id = $2', [adjacent.sort_order, current.id]);
    await tx.query('UPDATE activities SET sort_order = $1 WHERE id = $2', [current.sort_order, adjacent.id]);
  });

  return { success: true };
}

// 외부에서 사용할 수 있는 권한 검증 유틸
export { verifyActivityOwner, verifySectionOwner };
