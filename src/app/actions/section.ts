'use server';

import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

type SectionResult =
  | { success: true; sectionId?: number }
  | { success: false; error: string };

async function verifyCourseOwner(courseId: number): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { ok: false, error: '섹션 관리 권한이 없습니다.' };
  }
  const role = session.user.role;
  if (role !== 'teacher' && role !== 'admin') {
    return { ok: false, error: '섹션 관리 권한이 없습니다.' };
  }

  const userId = Number(session.user.id);
  // admin이면 owner 체크 우회
  const { rows } =
    role === 'admin'
      ? await sql`SELECT id FROM courses WHERE id = ${courseId}`
      : await sql`SELECT id FROM courses WHERE id = ${courseId} AND created_by = ${userId}`;
  if (rows.length === 0) {
    return { ok: false, error: '해당 코스의 소유자만 섹션을 관리할 수 있습니다.' };
  }

  return { ok: true, userId };
}

export async function createSection(formData: FormData): Promise<SectionResult> {
  const courseId = Number(formData.get('course_id'));
  if (isNaN(courseId)) return { success: false, error: '잘못된 코스 ID입니다.' };

  const auth = await verifyCourseOwner(courseId);
  if (!auth.ok) return { success: false, error: auth.error };

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const weekNumber = Number(formData.get('week_number'));

  if (!title) return { success: false, error: '섹션 제목은 필수입니다.' };
  if (isNaN(weekNumber) || weekNumber < 1) return { success: false, error: '주차 번호는 1 이상이어야 합니다.' };

  const { rows: maxRow } = await sql`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
    FROM sections WHERE course_id = ${courseId}
  `;

  const { rows } = await sql`
    INSERT INTO sections (course_id, title, description, week_number, sort_order)
    VALUES (${courseId}, ${title}, ${description}, ${weekNumber}, ${maxRow[0].next_order})
    RETURNING id
  `;

  return { success: true, sectionId: rows[0].id };
}

export async function updateSection(formData: FormData): Promise<SectionResult> {
  const sectionId = Number(formData.get('section_id'));
  if (isNaN(sectionId)) return { success: false, error: '잘못된 섹션 ID입니다.' };

  const { rows: sectionRows } = await sql`
    SELECT s.course_id FROM sections s WHERE s.id = ${sectionId}
  `;
  if (sectionRows.length === 0) return { success: false, error: '섹션을 찾을 수 없습니다.' };

  const auth = await verifyCourseOwner(sectionRows[0].course_id);
  if (!auth.ok) return { success: false, error: auth.error };

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const weekNumber = Number(formData.get('week_number'));
  const isVisible = formData.get('is_visible') === 'on';

  if (!title) return { success: false, error: '섹션 제목은 필수입니다.' };
  if (isNaN(weekNumber) || weekNumber < 1) return { success: false, error: '주차 번호는 1 이상이어야 합니다.' };

  await sql`
    UPDATE sections
    SET title = ${title}, description = ${description},
        week_number = ${weekNumber}, is_visible = ${isVisible}
    WHERE id = ${sectionId}
  `;

  return { success: true };
}

export async function deleteSection(formData: FormData): Promise<SectionResult> {
  const sectionId = Number(formData.get('section_id'));
  if (isNaN(sectionId)) return { success: false, error: '잘못된 섹션 ID입니다.' };

  const { rows: sectionRows } = await sql`
    SELECT s.course_id FROM sections s WHERE s.id = ${sectionId}
  `;
  if (sectionRows.length === 0) return { success: false, error: '섹션을 찾을 수 없습니다.' };

  const auth = await verifyCourseOwner(sectionRows[0].course_id);
  if (!auth.ok) return { success: false, error: auth.error };

  await sql`DELETE FROM sections WHERE id = ${sectionId}`;

  return { success: true };
}

export async function reorderSection(formData: FormData): Promise<SectionResult> {
  const sectionId = Number(formData.get('section_id'));
  const direction = formData.get('direction') as string;

  if (isNaN(sectionId)) return { success: false, error: '잘못된 섹션 ID입니다.' };
  if (direction !== 'up' && direction !== 'down') {
    return { success: false, error: '방향은 up 또는 down이어야 합니다.' };
  }

  const { rows: sectionRows } = await sql`
    SELECT s.id, s.course_id, s.sort_order
    FROM sections s WHERE s.id = ${sectionId}
  `;
  if (sectionRows.length === 0) return { success: false, error: '섹션을 찾을 수 없습니다.' };

  const current = sectionRows[0];
  const auth = await verifyCourseOwner(current.course_id);
  if (!auth.ok) return { success: false, error: auth.error };

  const adjacentQuery = direction === 'up'
    ? sql`
        SELECT id, sort_order FROM sections
        WHERE course_id = ${current.course_id} AND sort_order < ${current.sort_order}
        ORDER BY sort_order DESC LIMIT 1
      `
    : sql`
        SELECT id, sort_order FROM sections
        WHERE course_id = ${current.course_id} AND sort_order > ${current.sort_order}
        ORDER BY sort_order ASC LIMIT 1
      `;

  const { rows: adjacentRows } = await adjacentQuery;
  if (adjacentRows.length === 0) {
    return { success: false, error: '더 이상 이동할 수 없습니다.' };
  }

  const adjacent = adjacentRows[0];

  await withTransaction(async (tx) => {
    await tx.query('UPDATE sections SET sort_order = $1 WHERE id = $2', [adjacent.sort_order, current.id]);
    await tx.query('UPDATE sections SET sort_order = $1 WHERE id = $2', [current.sort_order, adjacent.id]);
  });

  return { success: true };
}
