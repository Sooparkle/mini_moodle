-- Migration 002: Activity Type Expansion (Page / URL / File / Forum)
-- Phase 10: Activity Registration Expansion
-- Idempotent — 재실행 시 안전 (DROP IF EXISTS / 조건부)

BEGIN;

-- 1. 기존 CHECK 제약 제거 후 확장된 화이트리스트로 재생성
ALTER TABLE activities
  DROP CONSTRAINT IF EXISTS activities_type_check;

ALTER TABLE activities
  ADD CONSTRAINT activities_type_check
  CHECK (type IN ('quiz', 'assignment', 'page', 'url', 'file', 'forum'));

-- 2. 페이지 콘텐츠 (강사가 작성한 본문)
CREATE TABLE IF NOT EXISTS activity_pages (
  activity_id INTEGER PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT ''
);

-- 3. 외부 URL 링크
CREATE TABLE IF NOT EXISTS activity_urls (
  activity_id INTEGER PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  external_url TEXT NOT NULL,
  open_in_new_tab BOOLEAN DEFAULT TRUE
);

-- 4. 파일 리소스 (V1: 외부 URL 기반)
CREATE TABLE IF NOT EXISTS activity_files (
  activity_id INTEGER PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT
);

-- 5. 포럼 게시물 (parent_id NULL=topic, NOT NULL=reply)
CREATE TABLE IF NOT EXISTS forum_posts (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 인덱스
CREATE INDEX IF NOT EXISTS idx_forum_posts_activity ON forum_posts(activity_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent ON forum_posts(parent_id);

COMMIT;
