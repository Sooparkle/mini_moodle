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

## Phase 8 — xAPI Mini LRS + mini-RBAC (1.5일, 29–39h)

### 왜 이 Phase를 추가하는가
인튜브 포트폴리오 관점에서 회사 독자 자산은 **Tube LRS**(ADL xAPI 1.0·2.0 인증, 조달청 디지털서비스몰 국내 최초 LRS 등재)이다. TubeLearn은 Moodle 기반 커스터마이징으로 유비온 Coursemos·자이닉스 LearningX 2강 구도에 편입 — 신입 기획자의 Quick Win이 도메인 깊이에서 나오기 어렵다. 학습 우선순위와 실무 우선순위가 이 지점에서 역전되므로, 원래 7순위로 뒀던 xAPI를 P8로 승격.

Moodle 4.2+ `core_xapi` 서브시스템은 statement 수신·저장만 담당하고 외부 LRS 송출은 `logstore_xapi` 같은 contrib 플러그인에 위임한다. 이 빈칸이 Tube LRS 같은 제품의 존재 이유이며, MoodleLite의 6개 이벤트 지점에서 xAPI statement를 emit하고 수신 엔드포인트·raw 대시보드를 얹어 "Tube LRS가 소비하는 데이터 shape"를 체감할 수 있는 축소판을 만든다.

### 후보 4개 비교 (채택 = B)

| 후보 | 구현 난이도 | 실전 도메인 가치 | 인튜브 활용도 | 반대 논리 |
|------|-------------|------------------|---------------|-----------|
| **B. xAPI Statement + Mini LRS** | 중 | 최상 — 회사 독자 자산 심장 | 최상 — LRS 회의 즉시 참전 | LRS 전체가 아닌 최소 재현임을 전제로 |
| A. Role×Context×Capability 3차원 권한 | 중–상 | 상 — 국내 B2B/대학 커스텀 role | 상 | LMS 시장은 유비온·자이닉스가 장악, 차별화 아님 |
| C. Plugin 아키텍처 흉내 | 상 | 중 | 중 | Next.js는 PHP Moodle과 런타임 본질 차이, 억지 모방은 오해 강화 |
| D. Backup/Restore (.mbz 미니) | 중 | 중–상 | 중 | 실제 .mbz는 primary backup 아님 — 도메인 오해 함정 |

**채택 결과**: B를 단일 주제로. B5(mini-RBAC)는 사용자 결정에 따라 처음부터 포함하되 Gate 2 조건부 drop.

### 태스크 B0–B5

- **B0 스키마 (3–4h)** — `xapi_statements` (statement_id UUID, actor_mbox, verb_iri, verb_display, object_iri/type/name, result.score_raw/min/max/scaled, result.success/completion, result.duration, context_registration/platform, timestamp/stored, authority, raw JSONB, voided), `xapi_verbs`, `xapi_activity_types` (카탈로그). RBAC: `contexts(contextlevel, instanceid, path, depth)`, `capabilities(name, captype, contextlevel, riskbitmask)`, `role_capabilities(role_id, capability_id, context_id, permission -1000|-1|0|1)`. State API·Activity Profile·Agent Profile은 out-of-scope.
- **B1 Statement 발행 훅 (6–8h)** — 6 지점 emit. (1) 코스 등록 → `registered`, (2) 퀴즈 시작 → `attempted`, (3) 퀴즈 제출 → `completed`, (4) 문항 채점 → `answered`, (5) 과제 제출 → `submitted`, (6) 활동 페이지 조회 → `experienced`. 퀴즈 관련 3개는 `withTransaction` **외부**에서 emit (emit 실패로 user action 롤백 금지).
- **B2 LRS 엔드포인트 (4–6h)** — `POST /api/xapi/statements` (BasicAuth + zod validation + 409 idempotency + 400 bad IFI), `GET /api/xapi/statements?agent=&verb=&activity=&since=&until=&limit=`. ADL LRS Conformance Test Suite 전체는 out-of-scope — 10개 핵심 규약만 내부 테스트.
- **B3 Timeline 대시보드 (3–4h)** — `/admin/lrs` 학습자 선택 → 시간 역순 verb-object 리스트 + 자연어 변환. 조건부 확장(6–8h 총 예산 중 남는 시간): Heatmap(학습자×activity 완료), 문항 정답률 차트.
- **B4 Moodle 5.x 호환 검증 + README (2–3h)** — MoodleLite의 `xapi_statements` 컬럼과 POST/GET 엔드포인트 설계가 Moodle 5.x `core_xapi` 서브시스템의 현행 API(statement shape, `core_xapi_statement_post` web service, `\core_xapi\handler` 추상 클래스)와 정합하는지 확인하고 불일치분 보정. README에는 LRS 엔드포인트 사용법(curl 예시, `LRS_BASIC_USER`/`LRS_BASIC_PASS` 환경변수) 최소 섹션만 추가. (SCORM·cmi5 비교, ADL Registry 조회, logstore_xapi transformer 해설 등 교육용 노트는 out-of-scope.)
- **B5 mini-RBAC (6–8h, 조건부)** — Moodle `db/access.php` 참고 20개 capability 카탈로그 시드 + `userHasCapability(userId, capName, contextId)` 구현. 실제 검사는 `mod/quiz:grade`(채점 버튼)와 `moodle/course:update`(코스 편집) 2개만. 6-role archetype 전체 적용은 out-of-scope.

### Go/No-go Gate

- **Gate 1 (B3/8d 완료 시)**: 실제 세션으로 퀴즈+과제 완료 → `xapi_statements` 5행 이상 + Timeline 렌더 확인. 실패 시 B3+/B5 드롭 후 B4로 직행.
- **Gate 2 (B5/8g 시작 전)**: 남은 시간 측정. < 8h면 B5 drop + P8 가중치 1.5d → 1.0d 재조정 + CHANGELOG 기록.

### 핵심 설계 결정 요약

| # | 결정 | 이유 |
|---|------|------|
| 1 | emit은 tx **외부** | xAPI 실패가 사용자 action 롤백해선 안 됨 |
| 2 | `crypto.randomUUID()` | pgcrypto extension 불필요, 스키마 SERIAL 일관성 유지 |
| 3 | actor = `mailto:` mbox만 | 4가지 IFI 중 단일, 나머지는 POST 400 |
| 4 | ADL vocabulary 고정 IRI | attempted/completed/answered/registered/experienced. submitted는 `activitystrea.ms/submit` (README 명기) |
| 5 | BasicAuth 단일 계정 | OAuth2·xAPI Launch out-of-scope |
| 6 | `zod` 신규 도입 | statement validation (actor·verb·object·timestamp·score range) |
| 7 | RBAC 스키마 전체, 검사는 2개만 | Moodle 모델 학습 + 1주 완료 리스크 균형 |
| 8 | page-view emit throttle 없음 | 노이즈는 Timeline UI 필터로 완화 |

### 반대 논리 및 한계 (P8 전용)

| 항목 | 내용 |
|------|------|
| B5 포함 선택으로 29–39h → 1주 상한 근접 | Gate 2에서 강제 drop 규칙. 지연 시 자동 재조정 |
| emit 동기 처리로 user latency +5–20ms | 수업 규모에선 수용, 실제 LRS는 비동기임을 README에 명기 |
| mbox 단일 IFI | 실 운영은 account(SSO 연동) 흔함 — 학습 목적 최소 subset |
| `submitted` verb가 ADL vocabulary 아님 | activitystrea.ms 커뮤니티 verb 사용, README 주석 |
| ADL Conformance Suite 미실행 | 10개 내부 규약만 → 공식 인증 ≠ 스펙 학습 |
| page-view throttle 부재 | bot·prefetch 노이즈 누적, Timeline 필터로 완화 |
| RBAC contextlevel hierarchy 단순화 | system(10)/category(40)/course(50)/module(70) 중 course·module만 실검사 |
| PROJECT_TRACKER 분모 8d→9.5d | 과거 % 소급 변경됨 (99%→83%). CHANGELOG에 명기 |

---

## Phase 10 — Activity Registration Expansion (2일)

### 왜 이 Phase를 추가하는가
P5에서 활동 모델을 `quiz`/`assignment` 2종만 구현한 결과 Moodle의 핵심 콘텐츠 전달 매커니즘(리소스 Page/URL/File, 협업 Forum)이 빠져 있다. P9 회고(`project_history/COURSE_UX_REPORT.md:149`)에서 "5.1 Add 버튼·purpose 그룹화 미적용"으로 명시된 갭이다. 강사가 "주차 학습 안내 페이지", "참고 자료 링크", "강의 PDF", "주차 토론"을 등록할 수 없는 상태로는 LMS 시연이 빈약하다. P9에서 만든 3 UX 변형(basic/canvas/modeless)의 차별점도 활동 추가 단계에서 모두 동일한 `<select>`로 평탄화되어 있어, 변형별 정체성을 활동 등록 흐름까지 확장한다.

### 스코프

| 산출물 | 위치 |
|--------|------|
| DB 마이그레이션 | `src/sql/migration-002-activity-types.sql` |
| CHECK 제약 6종 | `activities.type IN ('quiz','assignment','page','url','file','forum')` |
| 신규 테이블 4종 | `activity_pages`, `activity_urls`, `activity_files`, `forum_posts` (1-level reply) |
| Activity Chooser 모달 | `ActivityChooser.tsx` — basic/canvas 공통, purpose 3탭 |
| Modeless 인라인 확장 | `AddActivityForm` select 6종 + URL/File 조건부 필드 |
| 활동 상세 분기 | PageView · UrlView · FileView · ForumView · ForumThread |
| 활동 편집 분기 | PageEditor · UrlEditor · FileEditor (quiz는 기존 QuestionManager) |
| 헬퍼 | `src/lib/activity-types.ts` (라벨/GRADED), `src/lib/activity-content.ts` (자식 로더) |

### 핵심 설계 결정

| # | 결정 | 이유 |
|---|------|------|
| 1 | grade_items은 quiz/assignment에만 자동 생성 | Page/URL/File/Forum은 평가 대상 아님 — 성적표 깨끗하게 유지 |
| 2 | File은 URL 기반 (Vercel Blob 미사용) | P7 배포·token 발급 전에는 외부 URL이 단순 · Blob 전환은 후속 작업 |
| 3 | Forum은 1-level reply (depth=2) | mini-moodle 규모. 깊은 스레드는 N+1 위험·복잡도 비대비 |
| 4 | Forum 작성 권한: owner 또는 enrolled | 학생은 등록한 코스에서만 글 작성 |
| 5 | basic/canvas는 모달 chooser, modeless는 인라인 select | 변형별 UX 철학 보존: modeless는 컨텍스트 전환 비용 0 |
| 6 | `src/app/actions/page.ts` → `pages.ts` 리네임 | Next.js App Router의 `page.ts` 파일 컨벤션과 충돌 |
| 7 | type별 자식 INSERT는 createActivity 트랜잭션 내부 | 부모-자식 정합 보장, 실패 시 활동 자체도 롤백 |

### xAPI verb 매핑 (Phase 8 사전 기록)

신규 4 타입의 Phase 8 statement emission 매핑:

| 활동 타입 | xAPI verb | 발화 시점 |
|-----------|-----------|-----------|
| page | `http://adlnet.gov/expapi/verbs/experienced` | 페이지 view 시 |
| url | `http://adlnet.gov/expapi/verbs/experienced` | 외부 이동 클릭 시 |
| file | `http://activitystrea.ms/schema/1.0/download` | 다운로드 클릭 시 |
| forum (topic) | `http://activitystrea.ms/schema/1.0/post` | createForumTopic 성공 시 |
| forum (reply) | `http://activitystrea.ms/schema/1.0/reply` | createForumReply 성공 시 |

(P8 B1 6 emission 지점이 6개 → 11개로 확장 가능. Gate 1 통과 후 추가 여부 결정)

### 범위 외 (의도적 폐기)

- Lesson, Workshop, Choice, Glossary, Wiki, SCORM, H5P, LTI, BBB 등 (포트폴리오 규모 초과)
- Forum 깊이 > 2 (N+1·복잡도 비대비)
- 드래그앤드롭 정렬 (P9에서 화살표 결정 유지)
- Vercel Blob 업로드 (V2 후속)
- File MIME 타입 검증 / 바이러스 스캔

### 반대 논리 및 한계 (P10 전용)

| 항목 | 내용 |
|------|------|
| File이 URL 기반이라 실제 업로드 UX 부재 | 실 LMS는 multipart upload + 스토리지. Blob 전환 시까지 강사는 외부 URL(GitHub/Drive) 수동 업로드 |
| Forum이 1-level reply라 학술 토론 부적합 | Moodle도 nested 기본은 1-level이지만 옵션 존재. Phase 10 범위에선 미지원 |
| Activity Chooser 모달의 카테고리 = 3개 고정 | Moodle 5.1은 6개(Recommended + Content + ...). 시각적 단순성 위해 축소 |
| basic/canvas/modeless 3 변형 유지로 SectionManager 수정이 modeless에 영향 | type 배지·시그니처는 별도 헬퍼로 격리. 향후 통일하려면 P11 |
| 분모 11d → 13d로 Overall % 소급 변경 | 작업량 감소 아니라 분모 증가. CHANGELOG에 명기 |

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
