'use server';

import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

type AssignmentResult =
  | { success: true }
  | { success: false; error: string };

export async function submitAssignment(formData: FormData): Promise<AssignmentResult> {
  const activityId = Number(formData.get('activity_id'));
  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return { success: false, error: '학생만 과제를 제출할 수 있습니다.' };
  }

  const userId = Number(session.user.id);
  const submissionText = (formData.get('submission_text') as string)?.trim();

  if (!submissionText) return { success: false, error: '제출 내용을 입력해주세요.' };

  // 활동 존재 + 과제 타입 확인
  const { rows: actRows } = await sql`
    SELECT a.id, a.type, a.due_date, s.course_id
    FROM activities a JOIN sections s ON s.id = a.section_id
    WHERE a.id = ${activityId}
  `;
  if (actRows.length === 0) return { success: false, error: '활동을 찾을 수 없습니다.' };
  if (actRows[0].type !== 'assignment') return { success: false, error: '이 활동은 과제가 아닙니다.' };

  // 수강 등록 확인
  const { rows: enrollRows } = await sql`
    SELECT 1 FROM enrollments WHERE user_id = ${userId} AND course_id = ${actRows[0].course_id}
  `;
  if (enrollRows.length === 0) return { success: false, error: '수강 등록된 코스의 과제만 제출할 수 있습니다.' };

  // 마감일 확인
  if (actRows[0].due_date && new Date(actRows[0].due_date) < new Date()) {
    return { success: false, error: '제출 마감일이 지났습니다.' };
  }

  // UPSERT (재제출 시 UPDATE)
  await sql`
    INSERT INTO assignment_submissions (activity_id, user_id, submission_text)
    VALUES (${activityId}, ${userId}, ${submissionText})
    ON CONFLICT (activity_id, user_id)
    DO UPDATE SET submission_text = ${submissionText}, updated_at = NOW()
  `;

  return { success: true };
}

export async function gradeAssignment(formData: FormData): Promise<AssignmentResult> {
  const activityId = Number(formData.get('activity_id'));
  const studentUserId = Number(formData.get('student_user_id'));
  const rawGrade = Number(formData.get('raw_grade'));
  const feedback = (formData.get('feedback') as string)?.trim() || null;

  if (isNaN(activityId)) return { success: false, error: '잘못된 활동 ID입니다.' };
  if (isNaN(studentUserId)) return { success: false, error: '잘못된 학생 ID입니다.' };
  if (isNaN(rawGrade)) return { success: false, error: '점수를 입력해주세요.' };

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') {
    return { success: false, error: '채점 권한이 없습니다.' };
  }

  const teacherId = Number(session.user.id);

  // 코스 소유자 확인
  const { rows: actRows } = await sql`
    SELECT a.id, s.course_id
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId} AND c.created_by = ${teacherId}
  `;
  if (actRows.length === 0) return { success: false, error: '해당 코스의 소유자만 채점할 수 있습니다.' };

  // grade_item 찾기
  const { rows: gradeItemRows } = await sql`
    SELECT id, grade_max, grade_min FROM grade_items WHERE activity_id = ${activityId}
  `;
  if (gradeItemRows.length === 0) return { success: false, error: '성적 항목을 찾을 수 없습니다.' };

  const gradeItem = gradeItemRows[0];

  if (rawGrade < gradeItem.grade_min || rawGrade > gradeItem.grade_max) {
    return { success: false, error: `점수는 ${gradeItem.grade_min}~${gradeItem.grade_max} 범위여야 합니다.` };
  }

  await withTransaction(async (tx) => {
    const { rows: existingGrade } = await tx.query(
      'SELECT id FROM grade_grades WHERE grade_item_id = $1 AND user_id = $2',
      [gradeItem.id, studentUserId]
    );

    if (existingGrade.length > 0) {
      await tx.query(
        'UPDATE grade_grades SET raw_grade = $1, final_grade = $2, feedback = $3, graded_by = $4, time_modified = NOW() WHERE id = $5',
        [rawGrade, rawGrade, feedback, teacherId, existingGrade[0].id]
      );
    } else {
      await tx.query(
        'INSERT INTO grade_grades (grade_item_id, user_id, raw_grade, final_grade, feedback, graded_by, time_modified) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [gradeItem.id, studentUserId, rawGrade, rawGrade, feedback, teacherId]
      );
    }
  });

  return { success: true };
}
