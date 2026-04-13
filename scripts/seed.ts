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
  await sql`DELETE FROM assignment_submissions`;
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
  const { rows: activities } = await sql`
    INSERT INTO activities (section_id, type, title, description, due_date, sort_order, is_visible) VALUES
      (${sec1.id}, 'quiz',       'HTML 태그 퀴즈',      '기본 HTML 태그에 대한 퀴즈',       '2026-03-08', 1, true),
      (${sec1.id}, 'assignment', 'HTML 페이지 만들기',   '자기소개 HTML 페이지를 작성하세요', '2026-03-10', 2, true),
      (${sec2.id}, 'quiz',       'CSS 선택자 퀴즈',     'CSS 선택자 유형에 대한 퀴즈',       '2026-03-15', 1, true),
      (${sec2.id}, 'assignment', 'CSS 스타일링 과제',    '주어진 HTML에 CSS를 적용하세요',    '2026-03-17', 2, true),
      (${sec3.id}, 'quiz',       'JavaScript 기초 퀴즈', '변수와 조건문에 대한 퀴즈',         '2026-03-22', 1, true)
    RETURNING id, type, title
  `;
  const htmlQuiz = activities[0];
  const htmlAssignment = activities[1];
  const cssQuiz = activities[2];
  const cssAssignment = activities[3];
  const jsQuiz = activities[4];
  console.log('Activities created: 5 (quiz 3 + assignment 2)');

  // 7. Enrollments (학생 2명 수강등록)
  await sql`
    INSERT INTO enrollments (user_id, course_id) VALUES
      (${student1.id}, ${courseId}),
      (${student2.id}, ${courseId})
  `;
  console.log('Enrollments created: 2 students enrolled in WEB101');

  // 8. Quiz Questions (HTML 퀴즈 3문제, CSS 퀴즈 2문제, JS 퀴즈 2문제)
  const { rows: htmlQuestions } = await sql`
    INSERT INTO quiz_questions (activity_id, question_text, options, correct_answer, sort_order) VALUES
      (${htmlQuiz.id}, 'HTML에서 가장 큰 제목 태그는?',
       ${JSON.stringify(['<h6>', '<h1>', '<head>', '<title>'])}::jsonb, '<h1>', 1),
      (${htmlQuiz.id}, '하이퍼링크를 만드는 태그는?',
       ${JSON.stringify(['<link>', '<a>', '<href>', '<url>'])}::jsonb, '<a>', 2),
      (${htmlQuiz.id}, '순서 없는 목록 태그는?',
       ${JSON.stringify(['<ol>', '<li>', '<ul>', '<list>'])}::jsonb, '<ul>', 3)
    RETURNING id
  `;

  await sql`
    INSERT INTO quiz_questions (activity_id, question_text, options, correct_answer, sort_order) VALUES
      (${cssQuiz.id}, 'CSS에서 클래스 선택자의 기호는?',
       ${JSON.stringify(['.', '#', '@', '&'])}::jsonb, '.', 1),
      (${cssQuiz.id}, 'CSS Box Model에서 콘텐츠와 테두리 사이의 영역은?',
       ${JSON.stringify(['margin', 'padding', 'border', 'outline'])}::jsonb, 'padding', 2)
  `;

  await sql`
    INSERT INTO quiz_questions (activity_id, question_text, options, correct_answer, sort_order) VALUES
      (${jsQuiz.id}, 'JavaScript에서 변수를 선언하는 키워드가 아닌 것은?',
       ${JSON.stringify(['let', 'const', 'var', 'int'])}::jsonb, 'int', 1),
      (${jsQuiz.id}, '=== 연산자의 의미는?',
       ${JSON.stringify(['대입', '값만 비교', '값과 타입 모두 비교', '타입만 비교'])}::jsonb, '값과 타입 모두 비교', 2)
  `;
  console.log('Quiz questions created: 7 (HTML 3 + CSS 2 + JS 2)');

  // 9. Grade Items (활동별 성적 항목)
  const { rows: gradeItems } = await sql`
    INSERT INTO grade_items (course_id, activity_id, item_name, grade_max, grade_min, sort_order) VALUES
      (${courseId}, ${htmlQuiz.id}, 'HTML 태그 퀴즈', 100, 0, 1),
      (${courseId}, ${htmlAssignment.id}, 'HTML 페이지 만들기', 100, 0, 2),
      (${courseId}, ${cssQuiz.id}, 'CSS 선택자 퀴즈', 100, 0, 3),
      (${courseId}, ${cssAssignment.id}, 'CSS 스타일링 과제', 100, 0, 4),
      (${courseId}, ${jsQuiz.id}, 'JavaScript 기초 퀴즈', 100, 0, 5)
    RETURNING id, activity_id
  `;
  const gradeItemMap = Object.fromEntries(gradeItems.map((g) => [g.activity_id, g.id]));
  console.log('Grade items created: 5');

  // 10. Sample quiz attempt — student1이 HTML 퀴즈 완료 (2/3 정답)
  const { rows: [htmlAttempt] } = await sql`
    INSERT INTO quiz_attempts (user_id, activity_id, state, score, max_score, started_at, submitted_at)
    VALUES (${student1.id}, ${htmlQuiz.id}, 'finished', 2, 3, '2026-03-07 10:00:00', '2026-03-07 10:15:00')
    RETURNING id
  `;

  const { rows: questionAttempts } = await sql`
    INSERT INTO question_attempts (quiz_attempt_id, question_id, current_answer, is_correct, mark, sequence_number) VALUES
      (${htmlAttempt.id}, ${htmlQuestions[0].id}, '<h1>',   true,  1, 1),
      (${htmlAttempt.id}, ${htmlQuestions[1].id}, '<link>', false, 0, 2),
      (${htmlAttempt.id}, ${htmlQuestions[2].id}, '<ul>',   true,  1, 3)
    RETURNING id
  `;

  await sql`
    INSERT INTO question_attempt_steps (question_attempt_id, sequence_number, state, answer) VALUES
      (${questionAttempts[0].id}, 1, 'complete', '<h1>'),
      (${questionAttempts[1].id}, 1, 'complete', '<link>'),
      (${questionAttempts[2].id}, 1, 'complete', '<ul>')
  `;

  // student1 HTML 퀴즈 성적 기록
  await sql`
    INSERT INTO grade_grades (grade_item_id, user_id, raw_grade, final_grade, time_modified)
    VALUES (${gradeItemMap[htmlQuiz.id]}, ${student1.id}, 66.67, 66.67, '2026-03-07 10:15:00')
  `;
  console.log('Sample data: student1 completed HTML quiz (2/3 = 66.67%)');

  // 11. Sample assignment submission — student1이 HTML 과제 제출
  await sql`
    INSERT INTO assignment_submissions (activity_id, user_id, submission_text, submitted_at)
    VALUES (${htmlAssignment.id}, ${student1.id},
      '<!DOCTYPE html>\n<html>\n<head><title>자기소개</title></head>\n<body>\n<h1>이학생</h1>\n<p>웹 프로그래밍을 배우고 있습니다.</p>\n</body>\n</html>',
      '2026-03-09 14:00:00')
  `;

  // 교수가 HTML 과제 채점 (85점)
  await sql`
    INSERT INTO grade_grades (grade_item_id, user_id, raw_grade, final_grade, feedback, graded_by, time_modified)
    VALUES (${gradeItemMap[htmlAssignment.id]}, ${student1.id}, 85, 85, 'HTML 구조가 잘 되어있습니다. 시맨틱 태그도 활용해보세요.', ${professor.id}, '2026-03-10 09:00:00')
  `;
  console.log('Sample data: student1 submitted HTML assignment (graded 85/100)');

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
