# MoodleLite

Moodle의 핵심 학습 관리 패턴을 재현한 미니 LMS(Learning Management System).
"정의 - 수행 - 평가" 플로우를 13개 테이블 관계형 스키마 위에 구현했습니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **Language**: TypeScript
- **Database**: Neon Postgres (`@neondatabase/serverless`)
- **Auth**: NextAuth.js v4 (Credentials Provider, JWT)
- **Styling**: CSS Modules (디자인 토큰 기반)

## 주요 기능

- **역할 기반 접근 제어**: 관리자 / 교수 / 학생 3개 역할, 페이지별 권한 분기
- **코스 관리**: 코스 생성, 섹션 CRUD, 정렬 (교수)
- **퀴즈**: 객관식 문제 출제, 응시, 자동 채점, 결과 리뷰
- **과제**: 텍스트 제출, 교수 채점 + 피드백
- **수강 등록**: 자가 등록 (멱등 처리)
- **성적표**: 교수용 CROSS JOIN 매트릭스, 학생 대시보드 성적 집계

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@moodlelite.com | password123 |
| 교수 | prof@moodlelite.com | password123 |
| 학생 | student1@moodlelite.com | password123 |
| 학생 | student2@moodlelite.com | password123 |

## 로컬 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env.local.example 참고)
cp .env.local.example .env.local
# POSTGRES_URL, NEXTAUTH_SECRET, NEXTAUTH_URL 입력

# DB 스키마 적용 + 시드 데이터
npx tsx scripts/apply-schema.ts
npx tsx scripts/seed.ts

# 개발 서버
npm run dev
```

## DB 스키마

14개 테이블 (`src/sql/schema.sql`):

`users`, `roles`, `role_assignments`, `courses`, `sections`, `activities`,
`enrollments`, `quiz_questions`, `quiz_attempts`, `question_attempts`,
`question_attempt_steps`, `grade_items`, `grade_grades`, `assignment_submissions`

## 프로젝트 구조

```
src/
  app/
    (authenticated)/     # 인증 필요 영역 (layout + nav)
      dashboard/         # 역할별 대시보드
      courses/           # 코스 목록, 상세, 성적표
      activities/        # 활동 상세, 퀴즈 응시, 과제 제출
    actions/             # Server Actions (7 파일, 28 함수)
    login/, register/    # 인증 페이지
  lib/
    auth.ts              # NextAuth 설정
    db.ts                # Neon DB 연결 + withTransaction
  sql/
    schema.sql           # DDL
scripts/
  seed.ts                # 시드 데이터
  apply-schema.ts        # 스키마 적용
```
