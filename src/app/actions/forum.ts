'use server';

import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

type Result =
  | { success: true; postId?: number }
  | { success: false; error: string };

/** 포럼 글 작성 권한: 코스 owner이거나 enrolled 학생 */
async function verifyForumAccess(activityId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false as const, error: '로그인이 필요합니다.' };

  const userId = Number(session.user.id);

  const { rows } = await sql`
    SELECT a.id, a.type, s.course_id, c.created_by,
      EXISTS(SELECT 1 FROM enrollments e
             WHERE e.user_id = ${userId} AND e.course_id = s.course_id) AS enrolled
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId}
  `;
  if (rows.length === 0) return { ok: false as const, error: '활동을 찾을 수 없습니다.' };

  const row = rows[0];
  if (row.type !== 'forum') {
    return { ok: false as const, error: '포럼 활동이 아닙니다.' };
  }

  const isOwner = row.created_by === userId;
  if (!isOwner && !row.enrolled) {
    return { ok: false as const, error: '수강 등록한 학생만 글을 작성할 수 있습니다.' };
  }

  return { ok: true as const, userId, isOwner };
}

export async function createForumTopic(formData: FormData): Promise<Result> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const auth = await verifyForumAccess(activityId);
  if (!auth.ok) return { success: false, error: auth.error };

  const subject = (formData.get('subject') as string | null)?.trim() || '';
  const body = (formData.get('body') as string | null)?.trim() || '';

  if (!subject) return { success: false, error: '제목은 필수입니다.' };
  if (!body) return { success: false, error: '내용은 필수입니다.' };

  const { rows } = await sql`
    INSERT INTO forum_posts (activity_id, user_id, parent_id, subject, body)
    VALUES (${activityId}, ${auth.userId}, NULL, ${subject}, ${body})
    RETURNING id
  `;

  return { success: true, postId: rows[0].id };
}

export async function createForumReply(formData: FormData): Promise<Result> {
  const activityId = Number(formData.get('activity_id'));
  const parentId = Number(formData.get('parent_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };
  if (isNaN(parentId)) return { success: false, error: '잘못된 부모 글 ID입니다.' };

  const auth = await verifyForumAccess(activityId);
  if (!auth.ok) return { success: false, error: auth.error };

  const body = (formData.get('body') as string | null)?.trim() || '';
  if (!body) return { success: false, error: '내용은 필수입니다.' };

  // 부모 글이 같은 활동의 topic인지 확인
  const { rows: parentRow } = await sql`
    SELECT id FROM forum_posts
    WHERE id = ${parentId} AND activity_id = ${activityId} AND parent_id IS NULL
  `;
  if (parentRow.length === 0) {
    return { success: false, error: '부모 글을 찾을 수 없습니다.' };
  }

  const { rows } = await sql`
    INSERT INTO forum_posts (activity_id, user_id, parent_id, subject, body)
    VALUES (${activityId}, ${auth.userId}, ${parentId}, NULL, ${body})
    RETURNING id
  `;

  return { success: true, postId: rows[0].id };
}

export async function deleteForumPost(formData: FormData): Promise<Result> {
  const postId = Number(formData.get('post_id'));
  if (isNaN(postId)) return { success: false, error: '잘못된 글 ID입니다.' };

  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: '로그인이 필요합니다.' };

  const userId = Number(session.user.id);

  const { rows } = await sql`
    SELECT fp.user_id AS author_id, c.created_by AS owner_id
    FROM forum_posts fp
    JOIN activities a ON a.id = fp.activity_id
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE fp.id = ${postId}
  `;
  if (rows.length === 0) return { success: false, error: '글을 찾을 수 없습니다.' };

  const { author_id, owner_id } = rows[0];
  if (author_id !== userId && owner_id !== userId) {
    return { success: false, error: '본인 글 또는 코스 소유자만 삭제할 수 있습니다.' };
  }

  await sql`DELETE FROM forum_posts WHERE id = ${postId}`;
  return { success: true };
}
