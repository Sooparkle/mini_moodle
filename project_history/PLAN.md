# MoodleLite 개발 가이드라인 (재정리본)

## 전제
- **Phase 1**: 프로젝트 파일의 `MINI_Moodle_Project___Phase1_ver1_1_2026_04.09` 를 정본으로 사용 (13테이블 확장 스코프 반영)
- **Phase 2**: 아래 현황 기준으로 이어서 진행
- **작업 환경**: VS Code CLI
- **스택**: Next.js (App Router, TypeScript, src/) + Vercel Postgres + NextAuth.js + bcryptjs (Tailwind 미사용)

---

## Phase 1 — 분석 (완료)
`Phase1_ver1_1` 문서를 정본으로 참조. 산출물: 무들 핵심 테이블 6개 관계도 + "정의-수행-평가" 패턴 + **13테이블로 스코프 확장 결정**.

---

## Phase 2 — 설계 + 환경 세팅 (진행 중, 1.5일)

### 테이블 구성 (13개, Phase 1에서 확정)
`users`, `roles`, `role_assignments`, `courses`, `sections`, `activities`, `enrollments`, `quiz_questions`, `quiz_attempts`, `question_attempts`, `question_attempt_steps`, `grade_items`, `grade_grades`

### Step 2.2 — 프로젝트 초기화
**완료**
- `npx create-next-app@latest .` (TS ✅ / ESLint ✅ / Tailwind ❌ / src/ ✅ / App Router ✅ / AGENTS.md ✅)

**남은 작업**
1. 패키지 설치: `npm i @vercel/postgres next-auth bcryptjs` + `npm i -D @types/bcryptjs`
2. `npm run dev` 초기 구동 확인
3. `.env.local` 에 `POSTGRES_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` 준비

### Step 2.1 — DB SQL
- `schema.sql` 작성 완료 → Vercel Postgres에 적용 필요
- 적용 방법: Vercel 대시보드 Query 탭 또는 `psql $POSTGRES_URL -f schema.sql`
- FK 제약/인덱스/enum(CHECK) 검증

### Step 2.3 — 시드 데이터
- 교수 1, 학생 2, 코스 1(섹션 3 / 활동 5), 역할 3, 수강등록
- 비밀번호는 bcryptjs 해시로 삽입 (`seed.ts` 권장 — Node 스크립트로 해시 생성 후 INSERT)

**Phase 2 산출물**: 구동되는 Next.js + 13테이블 + 시드 데이터 로그인 가능 상태

---

## Phase 3 — 인증 + 대시보드 (1.5일)
- NextAuth Credentials Provider, 세션에 `user.role` 주입
- `/dashboard` 역할 분기 (admin / teacher / student)
- **체크포인트**: 같은 URL에서 세션 role에 따라 다른 컴포넌트 렌더링 패턴 확립 → 이후 모든 페이지 재사용

## Phase 4 — 코스 CRUD + 섹션 관리 (1.5일)
- `/courses/new` (교수), Server Actions로 insert
- `/courses/[id]` — 교수뷰(편집 UI) / 학생뷰(읽기, `is_visible=false` 숨김)
- 섹션 순서 변경은 위/아래 화살표로 `sort_order` 업데이트

## Phase 5 — 활동 모듈: 퀴즈 + 과제 (2일)
- 활동 추가 모달 (type: quiz / assignment)
- 교수: `/activities/[id]/edit` 에서 객관식 문제 CRUD → `quiz_questions`
- 학생: `/activities/[id]` 응시 → `quiz_attempts` + `question_attempts` + `question_attempt_steps` 기록
- 자동 채점 → `grade_items` / `grade_grades` 업데이트
- 과제는 텍스트 제출만 (파일 업로드 제외)

## Phase 6 — 수강 등록 + 성적표 (1일)
- `/courses` 공개 코스 목록, 자가등록 → `enrollments`
- `/courses/[id]/grades` 교수용 전체 성적표
- 학생 대시보드에 본인 성적 집계

## Phase 7 — 마무리 + 배포 (0.5일)
- 최소 CSS (Tailwind 미사용 → CSS Modules 또는 global.css)
- Vercel 배포, README에 테스트 계정 명기

---

## VS Code CLI 작업 시 권장 순서 (바로 실행용)

```bash
# 1. 패키지 설치
npm i @vercel/postgres next-auth bcryptjs
npm i -D @types/bcryptjs

# 2. 환경변수 파일
touch .env.local   # POSTGRES_URL, NEXTAUTH_SECRET, NEXTAUTH_URL 작성

# 3. DB 스키마 적용
psql $POSTGRES_URL -f schema.sql

# 4. 시드 스크립트 실행 (작성 후)
npx tsx scripts/seed.ts

# 5. 구동
npm run dev
```

---

## 반대 논리 및 한계

**첫째, Tailwind 미선택의 대가.** Phase 7 UI 정리 단계에서 CSS Modules 또는 순수 CSS로 네비게이션/카드/폼을 직접 스타일링해야 한다. Tailwind였다면 인라인 클래스로 30분이면 끝날 작업이 2~3시간으로 늘어날 수 있다. 다만 포트폴리오 관점에서 "CSS를 직접 다룰 수 있다"는 신호는 될 수 있다.

**둘째, 13테이블 확장의 비용.** 원안 7테이블 대비 `roles`, `role_assignments`, `question_attempts`, `question_attempt_steps`, `grade_items`, `grade_grades` 6개가 추가됐다. 무들의 실제 구조에 가까워지는 장점이 있지만, Phase 5~6에서 단순 INSERT 하나가 여러 테이블에 걸친 트랜잭션이 된다. 일정(7~8일)이 9~10일로 밀릴 가능성을 사전에 인정해야 한다.

**셋째, `@vercel/postgres` 종속.** 로컬 개발 시에도 Vercel 원격 DB에 붙는 구조라, 오프라인 작업이나 빠른 스키마 변경 반복에 불리하다. 대안은 로컬 Postgres(Docker) + 배포 시에만 Vercel Postgres 사용이지만, 환경변수 분기 관리가 추가된다. 현재 단계에서는 Vercel Postgres 단일 환경으로 가는 게 단순하다.

**넷째, schema.sql이 작성 완료 상태라고 했지만 실제 적용·검증 전이다.** FK 순서, enum(CHECK) 문법, Postgres 예약어 충돌(`user`는 예약어라 `users`로 간 건 OK)에서 적용 시점에 에러가 날 수 있으니 `psql -f` 실행 로그를 반드시 확인할 것.
