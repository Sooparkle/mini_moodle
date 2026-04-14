'use server';

import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

type EnrollResult =
  | { success: true }
  | { success: false; error: string };

export async function enrollInCourse(formData: FormData): Promise<EnrollResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return { success: false, error: '학생만 수강 등록할 수 있습니다.' };
  }

  const courseId = Number(formData.get('course_id'));
  if (!courseId || isNaN(courseId)) {
    return { success: false, error: '잘못된 코스입니다.' };
  }

  const userId = Number(session.user.id);

  // 공개 코스인지 확인
  const { rows } = await sql`
    SELECT id FROM courses WHERE id = ${courseId} AND is_published = true
  `;
  if (rows.length === 0) {
    return { success: false, error: '수강 등록할 수 없는 코스입니다.' };
  }

  // 멱등 등록 (이미 등록되어 있으면 무시)
  await sql`
    INSERT INTO enrollments (user_id, course_id)
    VALUES (${userId}, ${courseId})
    ON CONFLICT (user_id, course_id) DO NOTHING
  `;

  return { success: true };
}
