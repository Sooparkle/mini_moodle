# MoodleLite Project Tracker

> Last updated: 2026-04-13 Session 7
> Overall progress: 65%

## Phase Summary

| # | Phase | Status | Progress | Target | Notes |
|---|-------|--------|----------|--------|-------|
| 1 | Analysis | DONE | 100% | 0.5d | 13테이블 확장 스코프 확정 |
| 2 | Design + Setup | DONE | 100% | 1d | 모든 태스크 완료 |
| 3 | Auth + Dashboard | DONE | 100% | 1.5d | 모든 태스크 완료 |
| 4 | Course CRUD + Sections | DONE | 100% | 1.5d | 모든 태스크 완료 |
| 5 | Activity Modules (Quiz + Assignment) | IN_PROGRESS | 0% | 2d | |
| 6 | Enrollment + Grades | NOT_STARTED | 0% | 1d | |
| 7 | Polish + Deploy | NOT_STARTED | 0% | 0.5d | |

## Progress Formula

- Phase progress = SUM(DONE task weights) + SUM(IN_PROGRESS task weights * 0.5)
- Overall = (P1% * 0.5 + P2% * 1 + P3% * 1.5 + P4% * 1.5 + P5% * 2 + P6% * 1 + P7% * 0.5) / 8

---

## Phase 2 — Design + Setup (DONE)

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| DB schema (schema.sql) | DONE | 40% | 13 tables, indexes, FK constraints |
| Project init (Next.js + deps) | DONE | 20% | next 16.2.3, @vercel/postgres, next-auth, bcryptjs |
| Seed data (seed.ts) | DONE | 20% | 교수1, 학생2, 코스1, 섹션3, 활동5 |
| DB connection utility (src/lib/db.ts) | DONE | 10% | query (단일) + withTransaction (트랜잭션) |
| Env setup (.env.local template) | DONE | 10% | .env.local.example + .gitignore 예외 |

**Phase 2 progress: 100%**

---

## Phase 3 — Auth + Dashboard (DONE)

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| NextAuth.js config | DONE | 20% | Credentials Provider, JWT에 id+role 주입 |
| Login/Register pages | DONE | 25% | /login, /register + Server Action |
| Auth proxy | DONE | 15% | proxy.ts (Next.js 16), 미인증→/login 리다이렉트 |
| Dashboard layout | DONE | 20% | 공통 nav (이름+역할 배지+로그아웃) |
| Role-based routing | DONE | 20% | admin/teacher/student 분기 대시보드 |

**Phase 3 progress: 100%**

---

## Current Phase: Phase 4 — Course CRUD + Sections

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| Course creation (teacher) | DONE | 25% | /courses/new, Server Action + role 체크 |
| Course detail page | DONE | 25% | /courses/[id], 역할별 뷰 분기 + 접근 제어 |
| Section management | DONE | 25% | 섹션 CRUD + 화살표 정렬 (withTransaction) |
| Course list page | DONE | 25% | /courses, 역할별 3뷰 (admin/teacher/student) |

---

## Session Log

### 2026-04-10 Session 1
- Phase 1 (Analysis) 완료 상태에서 시작
- create-next-app으로 프로젝트 생성 (TS, ESLint, App Router, src/)
- @vercel/postgres, next-auth, bcryptjs 설치
- schema.sql 작성 완료 (13 tables + indexes)
- 자동 진행도 추적 시스템 구축 (PROJECT_TRACKER.md, Stop hook, CHANGELOG)

### 2026-04-10 Session 2
- .env.local.example 생성 (POSTGRES_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
- .gitignore에 !.env.local.example 예외 추가
- src/lib/db.ts 생성 (query export + withTransaction 헬퍼)
- db.ts 리팩토링: sql re-export 제거, withTransaction만 유지 (CLAUDE.md에 컨벤션 기록)
- scripts/seed.ts 작성 (역할3, 교수1, 학생2, 코스1, 섹션3, 활동5, 수강등록2)
- tsx dev dependency 설치
- Phase 2 완료 → Phase 3 IN_PROGRESS 전환

### 2026-04-11 Session 3
- Vercel CLI devDependency 설치 (npm i -D vercel)
- Vercel 프로젝트 생성 및 링크: sooworldfire-3143s-projects/mini-moodle
- Neon Postgres 마켓플레이스 통합 프로비저닝 (neon-claret-jacket)
- vercel integration add 과정에서 .env.local 자동 생성 (POSTGRES_URL 등 17개 키)
- scripts/apply-schema.ts 작성 — schema.sql을 세미콜론 분리해 순차 실행
- 스키마 적용 완료: 13 tables + 10 indexes + 1 ALTER (24 구문 전부 성공)
- seed.ts 실행 완료 → 교수1/학생2/코스1/섹션3/활동5/수강등록2 DB 반영
- .env.local에 NEXTAUTH_SECRET 자동 생성(crypto.randomBytes 32B base64), NEXTAUTH_URL 추가
- Phase 3 진입 준비 완료 (다음: NextAuth.js Credentials Provider 설정)

### 2026-04-11 Session 4 — DB 백엔드 마이그레이션 (Vercel-managed → Direct Neon)
- 사유: 학습 가치, 락인 회피, Neon 브랜칭 직접 활용 (자세한 내용은 project_history/CHANGELOG.md)
- 사용자가 Neon 직접 가입 후 새 organization에서 mini-moodle 프로젝트 생성 (ap-southeast-2 Sydney, Postgres 17, Neon Auth 비활성화)
- scripts/verify-counts.ts 신규 작성 — baseline/cutover 검증용 행 수 카운터
- Milestone B (병렬 셋업): 새 Neon DB에 schema.sql + seed.ts 적용, baseline과 행 수 일치 확인
- Milestone C (cutover): .env.local 정리 (Vercel 자동주입 17키 → POSTGRES_URL 1키), apply-schema 재실행으로 "already exists" 검증, seed 재실행, 행 수 재검증
- Milestone D: 사용자가 Vercel 대시보드에서 기존 neon-claret-jacket 리소스 수동 삭제 (organization 권한 문제 해결 과정에서 함께 처리됨)
- Vercel mini-moodle 프로젝트 자체는 유지 (향후 배포 옵션 보존)
- 코드 변경 0줄 — POSTGRES_URL 환경변수 1개 교체로 끝
- @vercel/postgres 패키지 그대로 사용 (내부적으로 @neondatabase/serverless 의존)
- project_history/CHANGELOG.md에 마이그레이션 항목 추가

### 2026-04-13 Session 7 — Phase 4 완료 (Course Detail + Section Management)
- /courses/[id] 코스 상세 페이지 구현 (Server Component + 역할 분기)
- 접근 제어: 소유 교수(편집), admin/다른교수/학생(읽기전용), 미수강+비공개→리다이렉트
- 학생 뷰: is_visible=false 섹션/활동 WHERE절 필터링 (데이터 누출 방지)
- SectionManager 클라이언트 컴포넌트: 섹션 CRUD + 화살표 정렬 (optimistic update)
- src/app/actions/section.ts: 4개 Server Action (create/update/delete/reorder)
- reorderSection에서 withTransaction 첫 실전 사용 (인접 섹션 sort_order swap)
- 병렬 쿼리 4개 (Promise.all): course, sections, activities, enrollment
- course-detail.module.css: 디자인 토큰 기반 스타일링
- Phase 4 완료 (100%) → Phase 5 IN_PROGRESS 전환
- Overall progress: 46% → 65%

### 2026-04-13 Session 6 — Phase 4 시작 (Course List)
- Route Group `(authenticated)` 리팩토링: dashboard/layout+nav를 공유 레이아웃으로 이동
- nav.module.css 분리 (dashboard.module.css에서 nav 스타일 추출)
- Nav에 "코스" 링크 추가
- /courses 페이지 구현: Admin(전체 코스), Teacher(내 코스 + 새 코스 CTA), Student(수강 중 + 수강 가능 2섹션)
- 대시보드 각 역할에 "코스 전체 보기 →" 링크 추가
- seed.ts에 admin 유저 추가 (admin@moodlelite.com)
- CLAUDE.md에 @vercel/postgres Phase 7 전환 예정 메모 추가
- Phase 4 progress: 0% → 25%

### 2026-04-12 Session 5 — Phase 3 완료 (Auth + Dashboard)
- src/lib/auth.ts: NextAuth Credentials Provider 설정 (JWT에 user.id, user.role 주입)
- src/types/next-auth.d.ts: Session/JWT 타입 확장
- src/app/api/auth/[...nextauth]/route.ts: NextAuth Route Handler
- src/app/login/page.tsx + login.module.css: 로그인 페이지 (signIn + 에러 처리)
- src/app/register/page.tsx: 회원가입 페이지 (Server Action으로 DB 삽입, student 역할 자동 부여)
- src/app/actions/auth.ts: register Server Action (validation + bcrypt hash)
- src/proxy.ts: Next.js 16 proxy (미인증 → /login 리다이렉트, PUBLIC_PATHS 제외)
- src/app/providers.tsx: SessionProvider 래퍼
- src/app/layout.tsx: Providers 적용, 메타데이터 업데이트
- src/app/dashboard/layout.tsx: getServerSession 기반 보호 레이아웃
- src/app/dashboard/nav.tsx: 네비게이션 (이름 + 역할 배지 + 로그아웃)
- src/app/dashboard/page.tsx: role 분기 (admin: 시스템 통계, teacher: 내 코스, student: 수강 코스)
- src/app/dashboard/dashboard.module.css: 대시보드 스타일
- src/app/page.tsx: / → /dashboard 리다이렉트
- 테스트: 교수(prof@moodlelite.com), 학생(student1@moodlelite.com) 로그인+세션+대시보드 검증
- Phase 3 완료 (100%) → Phase 4 IN_PROGRESS 전환
- Overall progress: 19% → 37%
