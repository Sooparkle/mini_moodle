/**
 * 시드 데이터 스크립트
 * 실행: npx tsx scripts/seed.ts
 * 전제: .env.local에 POSTGRES_URL 설정 + schema.sql 적용 완료
 */

import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding started...');

  // 기존 데이터 정리 (FK 순서 역순)
  await sql`DELETE FROM grade_grades`;
  await sql`DELETE FROM grade_items`;
  await sql`DELETE FROM question_attempt_steps`;
  await sql`DELETE FROM question_attempts`;
  await sql`DELETE FROM quiz_attempts`;
  await sql`DELETE FROM quiz_questions`;
  await sql`DELETE FROM enrollments`;
  await sql`DELETE FROM activities`;
  await sql`DELETE FROM sections`;
  await sql`DELETE FROM role_assignments`;
  await sql`DELETE FROM courses`;
  await sql`DELETE FROM roles`;
  await sql`DELETE FROM users`;
  console.log('Existing data cleared.');

  // 1. Roles (3개)
  const { rows: roles } = await sql`
    INSERT INTO roles (name, shortname, description) VALUES
      ('관리자', 'admin', '시스템 관리자'),
      ('교수', 'teacher', '코스 생성 및 관리'),
      ('학생', 'student', '코스 수강')
    RETURNING id, shortname
  `;
  const roleMap = Object.fromEntries(roles.map((r) => [r.shortname, r.id]));
  console.log('Roles created:', Object.keys(roleMap).join(', '));

  // 2. Users (관리자 1, 교수 1, 학생 2) — 비밀번호: password123
  const hash = await bcrypt.hash('password123', 10);

  const { rows: users } = await sql`
    INSERT INTO users (email, name, password_hash) VALUES
      ('admin@moodlelite.com', '관리자', ${hash}),
      ('prof@moodlelite.com', '김교수', ${hash}),
      ('student1@moodlelite.com', '이학생', ${hash}),
      ('student2@moodlelite.com', '박학생', ${hash})
    RETURNING id, email
  `;
  const [admin, professor, student1, student2] = users;
  console.log('Users created:', users.map((u) => u.email).join(', '));

  // 3. Role assignments (사이트 레벨)
  await sql`
    INSERT INTO role_assignments (user_id, role_id) VALUES
      (${admin.id}, ${roleMap.admin}),
      (${professor.id}, ${roleMap.teacher}),
      (${student1.id}, ${roleMap.student}),
      (${student2.id}, ${roleMap.student})
  `;
  console.log('Role assignments created.');

  // 4. Course (1개)
  const { rows: courses } = await sql`
    INSERT INTO courses (title, short_name, description, created_by, is_published, start_date, end_date)
    VALUES (
      '웹 프로그래밍 기초',
      'WEB101',
      'HTML, CSS, JavaScript 기초를 배우는 입문 코스',
      ${professor.id},
      true,
      '2026-03-01',
      '2026-06-30'
    )
    RETURNING id
  `;
  const courseId = courses[0].id;
  console.log('Course created: WEB101');

  // 5. Sections (3개)
  const { rows: sections } = await sql`
    INSERT INTO sections (course_id, title, description, week_number, sort_order, is_visible) VALUES
      (${courseId}, '1주차: HTML 기초', 'HTML 태그와 문서 구조를 학습합니다.', 1, 1, true),
      (${courseId}, '2주차: CSS 기초', 'CSS 선택자와 박스 모델을 학습합니다.', 2, 2, true),
      (${courseId}, '3주차: JavaScript 기초', '변수, 조건문, 함수를 학습합니다.', 3, 3, true)
    RETURNING id
  `;
  const [sec1, sec2, sec3] = sections;
  console.log('Sections created: 3');

  // 6. Activities (5개: 퀴즈 3 + 과제 2)
  await sql`
    INSERT INTO activities (section_id, type, title, description, due_date, sort_order, is_visible) VALUES
      (${sec1.id}, 'quiz',       'HTML 태그 퀴즈',      '기본 HTML 태그에 대한 퀴즈',       '2026-03-08', 1, true),
      (${sec1.id}, 'assignment', 'HTML 페이지 만들기',   '자기소개 HTML 페이지를 작성하세요', '2026-03-10', 2, true),
      (${sec2.id}, 'quiz',       'CSS 선택자 퀴즈',     'CSS 선택자 유형에 대한 퀴즈',       '2026-03-15', 1, true),
      (${sec2.id}, 'assignment', 'CSS 스타일링 과제',    '주어진 HTML에 CSS를 적용하세요',    '2026-03-17', 2, true),
      (${sec3.id}, 'quiz',       'JavaScript 기초 퀴즈', '변수와 조건문에 대한 퀴즈',         '2026-03-22', 1, true)
  `;
  console.log('Activities created: 5 (quiz 3 + assignment 2)');

  // 7. Enrollments (학생 2명 수강등록)
  await sql`
    INSERT INTO enrollments (user_id, course_id) VALUES
      (${student1.id}, ${courseId}),
      (${student2.id}, ${courseId})
  `;
  console.log('Enrollments created: 2 students enrolled in WEB101');

  console.log('\nSeeding completed!');
  console.log('Test accounts (password: password123):');
  console.log('  관리자: admin@moodlelite.com');
  console.log('  교수: prof@moodlelite.com');
  console.log('  학생1: student1@moodlelite.com');
  console.log('  학생2: student2@moodlelite.com');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
