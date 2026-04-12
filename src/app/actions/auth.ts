'use server';

import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

type RegisterResult = { success: true } | { success: false; error: string };

export async function register(formData: FormData): Promise<RegisterResult> {
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    return { success: false, error: '모든 필드를 입력해주세요.' };
  }

  if (password.length < 6) {
    return { success: false, error: '비밀번호는 6자 이상이어야 합니다.' };
  }

  const { rows: existing } = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;

  if (existing.length > 0) {
    return { success: false, error: '이미 등록된 이메일입니다.' };
  }

  const hash = await bcrypt.hash(password, 10);

  const { rows: newUsers } = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email}, ${name}, ${hash})
    RETURNING id
  `;

  const { rows: studentRole } = await sql`
    SELECT id FROM roles WHERE shortname = 'student'
  `;

  if (studentRole.length === 0) {
    return { success: false, error: '시스템 설정 오류: student 역할이 없습니다.' };
  }

  await sql`
    INSERT INTO role_assignments (user_id, role_id)
    VALUES (${newUsers[0].id}, ${studentRole[0].id})
  `;

  return { success: true };
}
