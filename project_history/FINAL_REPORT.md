# MoodleLite 프로젝트 최종 리포트

> 작성일: 2026-04-14
> 프로젝트 기간: 2026-04-10 ~ 2026-04-14 (5일, 10 세션)
> 현재 진행률: 99% (Vercel 배포만 잔여)
>
> **NOTE**: 본 리포트는 Session 10 종료 시점(2026-04-14) 스냅샷이다. 2026-04-17 Session 11에서 Phase 8(xAPI Mini LRS + mini-RBAC)이 추가되어 가중치 분모가 8d → 9.5d로 확장됨. 최신 상태는 `PROJECT_TRACKER.md` 참조.

---

## 1. 프로젝트 개요

### 1.1 목표
Moodle LMS의 핵심 학습 관리 패턴 — **"정의(Define) → 수행(Perform) → 평가(Evaluate)"** — 을 관계형 스키마 위에 재현한 미니 LMS.

### 1.2 핵심 요구사항
- 역할 기반 접근 제어 (관리자 / 교수 / 학생)
- 코스 → 섹션 → 활동(퀴즈/과제) 계층 구조
- 퀴즈 출제 · 응시 · 자동 채점
- 과제 텍스트 제출 · 수동 채점
- 자가 수강등록
- 교수용 성적표 + 학생 대시보드 성적 집계

### 1.3 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js (App Router) | 16.2.3 |
| UI | React (Server + Client Components) | 19.2.4 |
| Language | TypeScript | 5.x |
| Database | Neon Postgres | @neondatabase/serverless 1.0.2 |
| Auth | NextAuth.js (Credentials, JWT) | 4.24.13 |
| Password | bcryptjs | 3.0.3 |
| Styling | CSS Modules + Design Tokens | (Tailwind 미사용) |
| Deploy | Vercel | syd1 리전 |

---

## 2. 프로젝트 규모

### 2.1 코드 통계

| 항목 | 수치 |
|------|------|
| 총 소스 파일 | 52개 |
| 총 코드 라인 | ~8,000줄 |
| Git 커밋 | 28개 |
| 개발 기간 | 5일 / 10세션 |

### 2.2 파일 유형별 분포

| 유형 | 파일 수 | 라인 수 | 비고 |
|------|---------|---------|------|
| .tsx (페이지 + 컴포넌트) | 26 | 3,501 | Server 15 / Client 11 |
| .ts (액션 + lib + 스크립트) | 14 | 1,383 | 액션 7 / lib 2 / 스크립트 3 / 타입 1 / 설정 1 |
| .css (모듈 + 글로벌) | 12 | 2,912 | 11 모듈 + 1 글로벌 |
| .sql (스키마 + 마이그레이션) | 2 | 183 | 14 테이블 정의 |
| 설정 파일 | 5 | ~50 | next.config, tsconfig, vercel.json 등 |

### 2.3 의존성

**Production (7개)**:
`@neondatabase/serverless`, `bcryptjs`, `next`, `next-auth`, `react`, `react-dom`, `ws`

**Dev (10개)**:
`@types/bcryptjs`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/ws`, `eslint`, `eslint-config-next`, `tsx`, `typescript`, `vercel`

---

## 3. 데이터베이스 설계

### 3.1 ER 구조 (14 테이블)

```
[users] ─┬─ [role_assignments] ─── [roles]
          │
          ├─ [enrollments] ─── [courses] ─── [sections] ─── [activities]
          │                                                      │
          │                        ┌─────────────────────────────┤
          │                        │                             │
          ├─ [quiz_attempts] ──── [quiz_questions]     [assignment_submissions]
          │       │
          │  [question_attempts]
          │       │
          │  [question_attempt_steps]
          │
          └─ [grade_grades] ─── [grade_items] ─── (activities)
```

### 3.2 테이블 상세

#### 사용자/역할 (3 테이블)

| 테이블 | 주요 컬럼 | 역할 |
|--------|----------|------|
| **users** | id, email(UNIQUE), name, password_hash | 사용자 계정 |
| **roles** | id, shortname(UNIQUE) | student / teacher / admin |
| **role_assignments** | user_id, role_id, course_id(nullable) | 사이트 레벨(NULL) 또는 코스 레벨 역할 매핑 |

#### 코스/구조 (4 테이블)

| 테이블 | 주요 컬럼 | 역할 |
|--------|----------|------|
| **courses** | id, title, short_name(UNIQUE), created_by(FK), is_published | 코스 정의 |
| **sections** | id, course_id(FK CASCADE), title, week_number, sort_order, is_visible | 주차별 섹션 |
| **activities** | id, section_id(FK CASCADE), type(CHECK quiz/assignment), title, due_date, sort_order | 학습 활동 |
| **enrollments** | id, user_id, course_id, UNIQUE(user_id, course_id) | 수강 등록 (멱등) |

#### 퀴즈 (4 테이블)

| 테이블 | 주요 컬럼 | 역할 |
|--------|----------|------|
| **quiz_questions** | id, activity_id(FK CASCADE), question_text, options(JSONB), correct_answer, sort_order | 객관식 문제 은행 |
| **quiz_attempts** | id, user_id, activity_id, state(inprogress/finished), score, max_score | 퀴즈 시도 세션 |
| **question_attempts** | id, quiz_attempt_id(FK CASCADE), question_id, current_answer, is_correct, mark | 문제별 응답 |
| **question_attempt_steps** | id, question_attempt_id(FK CASCADE), state(todo/complete/gaveup), answer | 답변 이력 (감사 추적) |

#### 과제/성적 (3 테이블)

| 테이블 | 주요 컬럼 | 역할 |
|--------|----------|------|
| **assignment_submissions** | id, activity_id, user_id, submission_text, UNIQUE(activity_id, user_id) | 과제 제출물 (UPSERT 재제출) |
| **grade_items** | id, course_id, activity_id, item_name, grade_max, grade_min | 성적 항목 (활동 생성 시 자동 생성) |
| **grade_grades** | id, grade_item_id, user_id, raw_grade, final_grade, feedback, graded_by | 실제 성적 기록 |

### 3.3 인덱스 (11개)

- `idx_role_assignments_user`, `idx_role_assignments_course`
- `idx_sections_course`
- `idx_activities_section`
- `idx_enrollments_user`, `idx_enrollments_course`
- `idx_quiz_attempts_user_activity`
- `idx_question_attempts_quiz`
- `idx_grade_grades_item`, `idx_grade_grades_user`
- `idx_assignment_submissions_activity`, `idx_assignment_submissions_user`

---

## 4. 애플리케이션 아키텍처

### 4.1 라우트 구조 (14 페이지)

```
src/app/
├── page.tsx                          →  /              (리다이렉트 → /dashboard)
├── login/page.tsx                    →  /login          (로그인)
├── register/page.tsx                 →  /register       (회원가입)
├── not-found.tsx                     →  *               (404)
│
└── (authenticated)/                  [인증 필수 영역]
    ├── layout.tsx                    공통 레이아웃 + nav
    ├── loading.tsx                   로딩 UI
    ├── error.tsx                     에러 바운더리
    │
    ├── dashboard/page.tsx            →  /dashboard      (역할별 대시보드)
    │
    ├── courses/
    │   ├── page.tsx                  →  /courses        (코스 목록)
    │   ├── new/page.tsx              →  /courses/new    (코스 생성)
    │   └── [id]/
    │       ├── page.tsx              →  /courses/:id    (코스 상세)
    │       └── grades/page.tsx       →  /courses/:id/grades (성적표)
    │
    └── activities/[id]/
        ├── page.tsx                  →  /activities/:id           (활동 상세)
        ├── attempt/page.tsx          →  /activities/:id/attempt   (퀴즈 응시)
        ├── result/page.tsx           →  /activities/:id/result    (퀴즈 결과)
        ├── edit/page.tsx             →  /activities/:id/edit      (문제 편집)
        └── submissions/page.tsx      →  /activities/:id/submissions (과제 채점)
```

### 4.2 인증 흐름

```
[미인증 요청]
      │
  proxy.ts (Next.js 16 middleware)
      │
      ├── PUBLIC_PATHS (/login, /register, /api/auth/*) → 통과
      │
      └── 그 외 → 307 리다이렉트 → /login
                        │
                  NextAuth Credentials Provider
                        │
                  sql`SELECT ... FROM users JOIN roles` + bcrypt.compare
                        │
                  JWT 발급 (id, email, name, role 포함)
                        │
                  세션 쿠키 (next-auth.session-token)
```

### 4.3 Server Actions (7 파일, 29 함수)

| 파일 | 함수 수 | 라인 | 기능 |
|------|---------|------|------|
| **auth.ts** | 1 | 51 | `register` — 회원가입 (bcrypt hash + student 역할 자동 부여) |
| **course.ts** | 1 | 48 | `createCourse` — 코스 생성 (교수 전용) |
| **section.ts** | 4 | 148 | `create/update/delete/reorderSection` — 섹션 CRUD + 정렬 |
| **activity.ts** | 6 | 189 | `create/update/delete/reorderActivity` + 권한 검증 2개 |
| **quiz.ts** | 9 | 390 | `create/update/delete/reorderQuestion` + `start/save/submitQuizAttempt` + 권한 검증 2개 |
| **assignment.ts** | 2 | 116 | `submitAssignment` (UPSERT) + `gradeAssignment` (트랜잭션) |
| **enrollment.ts** | 1 | 40 | `enrollInCourse` (ON CONFLICT 멱등, is_published 검증) |

#### 트랜잭션 사용 (4 파일)

| 파일 | 트랜잭션 함수 | 이유 |
|------|-------------|------|
| activity.ts | `createActivity` | activities + grade_items 동시 INSERT |
| activity.ts | `reorderActivity` | 2개 행 sort_order 스왑 |
| section.ts | `reorderSection` | 2개 행 sort_order 스왑 |
| quiz.ts | `startQuizAttempt` | quiz_attempts + N×question_attempts + N×steps |
| quiz.ts | `submitQuizAttempt` | 채점 + quiz_attempts 완료 + grade_grades UPSERT |
| assignment.ts | `gradeAssignment` | grade_grades 조회 + INSERT/UPDATE |

### 4.4 Client Components (11개, 1,162줄)

| 컴포넌트 | 라인 | 기능 |
|----------|------|------|
| **SectionManager** | 680 | 섹션 + 활동 CRUD UI (가장 큰 컴포넌트) |
| **QuestionManager** | 310 | 퀴즈 문제 CRUD (보기 4개 + 정답 라디오) |
| **QuizPlayer** | 167 | 퀴즈 응시 (라디오 선택 즉시 저장 + 진행 요약 + 제출 확인) |
| **SubmissionGrader** | 116 | 제출물 목록 + 점수 입력 + 피드백 |
| **courses/new/page** | 118 | 코스 생성 폼 |
| **login/page** | 108 | 로그인 폼 (테스트 계정 바로가기 포함) |
| **register/page** | 86 | 회원가입 폼 |
| **AssignmentSubmission** | 83 | 과제 텍스트 제출/재제출 + 채점 결과 표시 |
| **Nav** | 45 | 네비게이션 (이름 + 역할 배지 + 로그아웃) |
| **EnrollButton** | 41 | 수강등록 버튼 (useTransition + router.refresh) |
| **Providers** | 7 | NextAuth SessionProvider 래퍼 |

---

## 5. 핵심 기능 상세

### 5.1 역할별 접근 제어

| 페이지 | 관리자 | 교수 | 학생 | 비인증 |
|--------|--------|------|------|--------|
| `/dashboard` | 시스템 통계 | 내 코스 목록 | 수강 코스 + 성적 | 리다이렉트 |
| `/courses` | 전체 코스 | 내 코스 + 새 코스 CTA | 수강 중 + 수강 가능 | 리다이렉트 |
| `/courses/new` | - | 생성 폼 | - | 리다이렉트 |
| `/courses/:id` | 읽기 전용 | 편집 UI (소유자) / 읽기 | 활동 링크 + 상태 배지 | 리다이렉트 |
| `/courses/:id/grades` | 열람 가능 | 성적 매트릭스 (소유자) | - | 리다이렉트 |
| `/activities/:id` | 읽기 | 통계 + 편집 링크 | 응시/제출/결과 | 리다이렉트 |
| `/activities/:id/edit` | - | 문제 CRUD (소유자) | - | 리다이렉트 |
| `/activities/:id/attempt` | - | - | 퀴즈 응시 | 리다이렉트 |
| `/activities/:id/submissions` | - | 채점 UI (소유자) | - | 리다이렉트 |

### 5.2 퀴즈 플로우

```
[교수] 문제 출제
  QuestionManager → createQuestion()
  │  문제 텍스트 + 보기 4개 + 정답 지정 + 정렬
  │
[학생] 퀴즈 응시
  1. startQuizAttempt()
     → quiz_attempts (state: inprogress)
     → question_attempts × N개 (sequence_number)
     → question_attempt_steps × N개 (state: todo)
  │
  2. QuizPlayer 렌더
     → 전체 문제 한 번에 표시 (Canvas 방식)
     → 라디오 선택 즉시 saveAnswer() 호출
     → 상단 진행 요약 (응답/미응답 점 표시)
  │
  3. submitQuizAttempt() [트랜잭션]
     → 정오답 판정 (question_attempts.is_correct, mark)
     → quiz_attempts.state = 'finished', score 계산
     → grade_grades UPSERT (raw_grade = score/max × grade_max)
  │
  4. /result 페이지
     → 점수 (예: 2/3, 66.7%)
     → 문제별 정오답 리뷰 (정답=녹색, 오답=빨강 좌측 테두리)
```

### 5.3 과제 플로우

```
[학생] 과제 제출
  AssignmentSubmission → submitAssignment()
  │  텍스트 입력 → UPSERT (재제출 시 UPDATE)
  │  마감일 검증 (due_date < NOW → 거부)
  │
[교수] 채점
  /submissions 페이지 → SubmissionGrader
  │  제출물 텍스트 확인
  │  점수 입력 (grade_min ~ grade_max 범위)
  │  피드백 텍스트 (선택)
  │  gradeAssignment() → grade_grades UPSERT [트랜잭션]
```

### 5.4 성적 집계

**교수용 성적표** (`/courses/:id/grades`):
- CROSS JOIN: 학생 × 성적항목 매트릭스 (빈 셀 = 미응시)
- 통계 요약: 수강생 수, 성적 항목 수, 전체 평균
- 항목별 평균: 각 퀴즈/과제의 평균 점수 + 응시 인원
- 학생별 성적: 개인 득점/만점 + 백분율

**학생 대시보드** (LATERAL JOIN):
- 코스별 성적 집계 (수강 중인 코스 × 성적 항목)
- 코스별 득점/만점 + 백분율
- 총 평균 카드 (전체 코스 평균)

---

## 6. 디자인 시스템

### 6.1 디자인 원칙

- **Monochrome + Single Accent**: 그레이스케일 6단계 + 파란색(#2563eb) 단일 액센트
- **Design Token 기반**: 모든 색상/간격/서체/반경을 CSS Custom Properties로 정의
- **CSS Modules**: 컴포넌트 단위 스타일 격리 (Tailwind 미사용, 순수 CSS)
- **Semantic HTML**: `<main>`, `<header>`, `<nav>`, `<article>`, `<section>` 활용

### 6.2 토큰 체계

**컬러 (12개)**:
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--gray-50` | #fafafa | 페이지 배경 |
| `--gray-100` | #f5f5f5 | 카드/섹션 배경 |
| `--gray-200` | #e5e5e5 | 보더 |
| `--gray-400` | #a3a3a3 | placeholder, 비활성 |
| `--gray-600` | #525252 | 본문 텍스트 |
| `--gray-900` | #171717 | 헤딩, nav 배경 |
| `--accent` | #2563eb | 인터랙티브 요소 |
| `--accent-hover` | #1d4ed8 | 호버 상태 |
| `--danger` | #dc2626 | 에러 |
| `--danger-bg` | #fef2f2 | 에러 배경 |
| `--success` | #16a34a | 성공 |
| `--success-bg` | #f0fdf4 | 성공 배경 |

**타이포그래피 (6개)**:
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--font-sans` | Geist, system | 기본 서체 |
| `--font-mono` | Geist Mono | 코드, 약어 |
| `--text-sm` | 0.875rem (14px) | 캡션, 배지 |
| `--text-base` | 1rem (16px) | 본문 |
| `--text-lg` | 1.25rem (20px) | 섹션 헤딩 |
| `--text-xl` | 1.5rem (24px) | 페이지 헤딩 |

**간격 (7개, 4px base)**:
`--space-1`(4px), `--space-2`(8px), `--space-3`(12px), `--space-4`(16px), `--space-6`(24px), `--space-8`(32px), `--space-12`(48px)

**반경 (4개)**:
`--radius-sm`(4px), `--radius-md`(6px), `--radius-lg`(8px), `--radius-full`(9999px)

### 6.3 CSS 모듈 현황 (11개, 2,775줄)

| 모듈 | 라인 | 페이지 |
|------|------|--------|
| course-detail.module.css | 611 | 코스 상세 (섹션/활동/배지/상태 등) |
| quiz-edit.module.css | 324 | 문제 편집기 |
| activity-detail.module.css | 352 | 활동 상세 |
| courses.module.css | 270 | 코스 목록 + 생성 폼 |
| quiz-attempt.module.css | 219 | 퀴즈 응시 |
| submissions.module.css | 221 | 과제 채점 |
| grades.module.css | 206 | 성적표 |
| quiz-result.module.css | 190 | 퀴즈 결과 |
| login.module.css | 152 | 로그인 |
| dashboard.module.css | 132 | 대시보드 |
| nav.module.css | 98 | 네비게이션 |

### 6.4 반응형 대응

- **Breakpoint**: 768px (태블릿 이하)
- **적용 범위**: globals.css + 11개 모듈 전체
- **주요 변경**: 카드 그리드 1열, 패딩 축소, nav 이름 숨김, 통계 그리드 1열, 폼 필드 스택

---

## 7. 성능 최적화

### 7.1 배포 최적화

| 항목 | 설정 | 효과 |
|------|------|------|
| Function Region | `syd1` (vercel.json) | DB(Sydney)와 동일 리전, ~200ms/쿼리 절감 |
| Server External Packages | `bcryptjs` (next.config.ts) | 서버 번들 크기 감소 |

### 7.2 쿼리 최적화

| 페이지 | Before | After | 절감 |
|--------|--------|-------|------|
| `/courses` (StudentCourseList) | 순차 2쿼리 | `Promise.all` 병렬 | ~1 RTT |
| `/courses/:id/grades` | 순차 3쿼리 | `Promise.all` 병렬 | ~2 RTT |
| `/courses/:id` | 이미 `Promise.all` 사용 | - | - |

### 7.3 UX 안전망

| 파일 | 위치 | 기능 |
|------|------|------|
| `loading.tsx` | `(authenticated)/` | 인증 영역 전체 네비게이션 로딩 UI |
| `error.tsx` | `(authenticated)/` | 런타임 에러 바운더리 + "다시 시도" 버튼 |
| `not-found.tsx` | `app/` | 루트 404 페이지 + 홈 링크 |

---

## 8. DB 마이그레이션 이력

### 8.1 Phase 4 (2026-04-11): Vercel 마켓플레이스 → 직접 Neon 계정

| 항목 | Before | After |
|------|--------|-------|
| Neon 소유 | Vercel-managed org | 직접 가입 personal org |
| 리전 | us-east-1 | ap-southeast-2 (Sydney) |
| 패키지 | @vercel/postgres | @vercel/postgres (변경 없음) |
| 코드 변경 | 0줄 | 환경변수 POSTGRES_URL 교체만 |

**사유**: 학습 가치 + 락인 회피 + 포트폴리오 어필

### 8.2 Phase 7 (2026-04-14): @vercel/postgres → @neondatabase/serverless

| 항목 | Before | After |
|------|--------|-------|
| 패키지 | @vercel/postgres (deprecated) | @neondatabase/serverless 1.0.2 |
| 단일 쿼리 | `import { sql } from '@vercel/postgres'` | `import { sql } from '@/lib/db'` (neon + fullResults) |
| 트랜잭션 | `tx.sql\`...\`` (tagged template) | `tx.query('...', [params])` (node-postgres API) |
| 변경 파일 | 25개 | import 19개 + tx.query 25곳 + db.ts 재작성 |

---

## 9. 개발 타임라인

### Phase 1 — 분석 (완료, 프로젝트 시작 전)
- Moodle 핵심 테이블 6개 관계도 분석
- "정의-수행-평가" 패턴 도출
- 13테이블 확장 스코프 확정

### Phase 2 — 설계 + 환경 세팅 (Session 1~3)
- 13 테이블 schema.sql 작성 + 적용
- Next.js 프로젝트 초기화
- 시드 데이터 (교수 1, 학생 2, 코스 1, 섹션 3, 활동 5)
- DB 유틸리티 (`withTransaction`)
- Neon DB 마이그레이션 (Vercel 마켓플레이스 → 직접 계정)

### Phase 3 — 인증 + 대시보드 (Session 5)
- NextAuth Credentials Provider (JWT에 id+role 주입)
- 로그인/회원가입 페이지 + Server Action
- Next.js 16 proxy (미인증 리다이렉트)
- 역할별 대시보드 (admin: 통계, teacher: 내 코스, student: 수강 코스)

### Phase 4 — 코스 CRUD + 섹션 관리 (Session 6~7)
- Route Group `(authenticated)` 리팩토링
- 코스 목록 (역할별 3뷰)
- 코스 상세 (역할별 접근 제어 + 학생 is_visible 필터링)
- SectionManager (섹션 CRUD + 화살표 정렬, withTransaction)

### Phase 5 — 활동 모듈: 퀴즈 + 과제 (Session 8)
- assignment_submissions 14번째 테이블 추가
- Server Actions 3파일 (activity, quiz, assignment) — 13개 함수
- SectionManager 확장 (활동 추가/편집/삭제/정렬)
- 퀴즈 응시 플로우 (QuizPlayer → 자동 저장 → 채점 → 결과 리뷰)
- 과제 제출 + 채점 (AssignmentSubmission + SubmissionGrader)

### Phase 6 — 수강등록 + 성적 (Session 9)
- 자가 등록 (ON CONFLICT 멱등)
- 코스 목록/상세에 등록 UI
- 교수용 성적표 (CROSS JOIN 매트릭스 + 통계 + 항목별 평균)
- 학생 대시보드 성적 집계 (LATERAL JOIN)

### Phase 7 — 마무리 + 배포 (Session 10)
- @neondatabase/serverless 전환 (25파일)
- Vercel function region syd1 설정
- 쿼리 병렬화 (Promise.all)
- UX 안전망 (loading, error, not-found)
- 반응형 CSS (768px breakpoint, 11개 모듈)
- README 작성
- **잔여: Vercel 프로덕션 배포**

---

## 10. 설계 결정 기록

### 10.1 Tailwind 미사용
- **이유**: 포트폴리오 관점에서 "CSS를 직접 다룰 수 있다"는 신호
- **비용**: CSS Modules 직접 작성으로 인한 시간 증가 (~2,900줄)
- **결과**: 디자인 토큰 체계 수립, 일관된 스타일링 달성

### 10.2 13→14 테이블 확장
- **이유**: Moodle 실제 구조에 가까운 정규화 (question_attempt_steps 감사 추적 등)
- **비용**: 트랜잭션 복잡도 증가 (INSERT 하나가 여러 테이블에 걸침)
- **결과**: 퀴즈 응시 데이터 모델이 실제 LMS와 동등한 수준

### 10.3 퀴즈 전체 문제 한번에 표시 (Canvas 방식)
- **대안**: Moodle 방식 (페이지 단위 문제 표시)
- **선택 이유**: 학생의 자유로운 탐색 허용 + 구현 단순
- **보완**: 상단 진행 요약 (응답/미응답 점 표시)

### 10.4 단일 시도 정책
- **대안**: 시도 횟수 설정 가능
- **선택 이유**: 무제한 시도 시 최고점 관리 UI 필요 → MVP 복잡도 증가
- **향후**: 시도 횟수 설정 기능 추가 가능

### 10.5 활동 독립 라우트 (`/activities/[id]`)
- **대안**: `/courses/[id]/activities/[id]` (코스 하위 중첩)
- **선택 이유**: URL 간결, 활동=독립 엔티티, Moodle `mod/quiz/view.php?id=` 패턴과 유사

### 10.6 @vercel/postgres → @neondatabase/serverless 전환
- **이유**: Vercel이 Postgres 제품을 종료하고 deprecated 처리
- **주의점**: `neon({ fullResults: true })` 필수 — 없으면 `{ rows }` 디스트럭처링 깨짐
- **트랜잭션**: `tx.sql` tagged template → `tx.query()` parameterized query 변환 필요

---

## 11. 테스트 계정 및 시드 데이터

### 사용자 (4명)

| 이메일 | 이름 | 역할 | 비밀번호 |
|--------|------|------|----------|
| admin@moodlelite.com | 관리자 | admin | password123 |
| prof@moodlelite.com | 김교수 | teacher | password123 |
| student1@moodlelite.com | 이학생 | student | password123 |
| student2@moodlelite.com | 박학생 | student | password123 |

### 시드 코스 (1개)
- **웹 프로그래밍 기초** (WEB101)
- 3개 섹션: 1주차 HTML, 2주차 CSS, 3주차 JavaScript
- 5개 활동: HTML 퀴즈, HTML 과제, CSS 퀴즈, CSS 과제, JS 퀴즈
- 수강생: student1, student2 등록 완료
- 샘플 데이터: student1의 HTML 퀴즈 완료(2/3), HTML 과제 제출+채점(85점)

---

## 12. 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `POSTGRES_URL` | Y | Neon PostgreSQL 연결 문자열 |
| `NEXTAUTH_SECRET` | Y | JWT 암호화 키 (32바이트 base64 권장) |
| `NEXTAUTH_URL` | Y | 앱 기본 URL (로컬: http://localhost:3000) |

---

## 13. 잔여 작업

| 항목 | 상태 | 비고 |
|------|------|------|
| Vercel 프로덕션 배포 | 대기 | 환경변수 설정 + `vercel deploy --prod` |
