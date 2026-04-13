-- MoodleLite Schema: 13 Tables
-- Phase 1 분석 기반 설계

-- 1. users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. roles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  shortname VARCHAR(20) UNIQUE NOT NULL,
  description TEXT
);

-- 3. role_assignments
CREATE TABLE role_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  course_id INTEGER, -- nullable: NULL이면 사이트 레벨, 값이 있으면 코스 레벨
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- 4. courses
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  short_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  is_published BOOLEAN DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- role_assignments.course_id FK (courses 생성 후 추가)
ALTER TABLE role_assignments
  ADD CONSTRAINT fk_role_assignments_course
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 5. sections
CREATE TABLE sections (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  week_number INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE
);

-- 6. activities
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('quiz', 'assignment')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  sort_order INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE
);

-- 7. enrollments
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- 8. quiz_questions
CREATE TABLE quiz_questions (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,        -- ["보기1", "보기2", "보기3", "보기4"]
  correct_answer VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL
);

-- 9. quiz_attempts
CREATE TABLE quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  state VARCHAR(20) NOT NULL DEFAULT 'inprogress' CHECK (state IN ('inprogress', 'finished')),
  score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  started_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP
);

-- 10. question_attempts
CREATE TABLE question_attempts (
  id SERIAL PRIMARY KEY,
  quiz_attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  current_answer VARCHAR(255),
  is_correct BOOLEAN,
  mark DECIMAL(5,2),
  sequence_number INTEGER NOT NULL
);

-- 11. question_attempt_steps
CREATE TABLE question_attempt_steps (
  id SERIAL PRIMARY KEY,
  question_attempt_id INTEGER NOT NULL REFERENCES question_attempts(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  state VARCHAR(20) NOT NULL CHECK (state IN ('todo', 'complete', 'gaveup')),
  answer VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. grade_items
CREATE TABLE grade_items (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  grade_max DECIMAL(5,2) DEFAULT 100,
  grade_min DECIMAL(5,2) DEFAULT 0,
  sort_order INTEGER NOT NULL
);

-- 13. grade_grades
CREATE TABLE grade_grades (
  id SERIAL PRIMARY KEY,
  grade_item_id INTEGER NOT NULL REFERENCES grade_items(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_grade DECIMAL(5,2),      -- 자동 채점 즉시값
  final_grade DECIMAL(5,2),    -- 교수 수정 가능한 최종값
  feedback TEXT,
  graded_by INTEGER REFERENCES users(id),
  time_modified TIMESTAMP DEFAULT NOW()
);

-- 14. assignment_submissions
CREATE TABLE assignment_submissions (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_text TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- 인덱스 (조회 성능)
CREATE INDEX idx_role_assignments_user ON role_assignments(user_id);
CREATE INDEX idx_role_assignments_course ON role_assignments(course_id);
CREATE INDEX idx_sections_course ON sections(course_id);
CREATE INDEX idx_activities_section ON activities(section_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_quiz_attempts_user_activity ON quiz_attempts(user_id, activity_id);
CREATE INDEX idx_question_attempts_quiz ON question_attempts(quiz_attempt_id);
CREATE INDEX idx_grade_grades_item ON grade_grades(grade_item_id);
CREATE INDEX idx_grade_grades_user ON grade_grades(user_id);
CREATE INDEX idx_assignment_submissions_activity ON assignment_submissions(activity_id);
CREATE INDEX idx_assignment_submissions_user ON assignment_submissions(user_id);