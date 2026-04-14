'use server';

import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

type CourseResult =
  | { success: true; courseId: number }
  | { success: false; error: string };

export async function createCourse(formData: FormData): Promise<CourseResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') {
    return { success: false, error: '코스 생성 권한이 없습니다.' };
  }

  const title = (formData.get('title') as string)?.trim();
  const shortName = (formData.get('short_name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const startDate = (formData.get('start_date') as string) || null;
  const endDate = (formData.get('end_date') as string) || null;
  const isPublished = formData.get('is_published') === 'on';

  if (!title || !shortName) {
    return { success: false, error: '코스 제목과 코드는 필수입니다.' };
  }

  if (shortName.length > 50) {
    return { success: false, error: '코스 코드는 50자 이하여야 합니다.' };
  }

  const { rows: existing } = await sql`
    SELECT id FROM courses WHERE short_name = ${shortName}
  `;
  if (existing.length > 0) {
    return { success: false, error: '이미 사용 중인 코스 코드입니다.' };
  }

  const userId = Number(session.user.id);

  const { rows } = await sql`
    INSERT INTO courses (title, short_name, description, created_by, is_published, start_date, end_date)
    VALUES (${title}, ${shortName}, ${description}, ${userId}, ${isPublished}, ${startDate}, ${endDate})
    RETURNING id
  `;

  return { success: true, courseId: rows[0].id };
}
