# Project Plan Changelog

All changes to the MoodleLite project plan are recorded here (append-only).

Format: Date | What Changed | Why | Timeline Impact

---

### 2026-04-10 — Initial Plan Established
- 7-phase plan based on Phase 1 analysis
- Total estimated duration: 8 working days
- 13 tables (users, roles, role_assignments, courses, sections, activities, enrollments, quiz_questions, quiz_attempts, question_attempts, question_attempt_steps, grade_items, grade_grades)
- Stack: Next.js 16.2.3 + Vercel Postgres + NextAuth.js + bcryptjs (Tailwind 미사용)
- Phase 1 (Analysis) already complete at project start
- Phase 2 (Design + Setup) 60% in progress

### 2026-04-11 — DB 백엔드: Vercel 마켓플레이스 통합 → 직접 가입한 Neon 계정
- **What:** Vercel 마켓플레이스로 프로비저닝됐던 Neon Postgres(`neon-claret-jacket`, us-east-1)를 제거하고, 사용자가 직접 가입한 Neon 계정 소유의 새 프로젝트(ap-southeast-2 / Sydney)로 이전
- **Why:**
  1. 학습 가치 — Vercel 통합은 Neon이 백엔드라는 사실을 가려서 인프라 가시성 저하
  2. 락인 회피 — Vercel 통합은 Neon 핵심 기능(브랜칭/모니터링)을 SSO 뒤에 묻고, 다른 호스팅으로 이전 시 마찰 발생
  3. 포트폴리오 어필 — 직접 운영 경험이 추상화된 통합 사용보다 가치 높음
- **Timeline impact:** 0 (코드 변경 없음, `POSTGRES_URL` 환경변수 1개 교체)
- **Lessons learned:**
  - `@vercel/postgres` 패키지는 내부적으로 `@neondatabase/serverless`에 의존 → connection string만 바꿔도 정상 동작
  - Vercel 마켓플레이스 통합으로 가입된 Neon 사용자는 같은 이메일로 직접 가입해도 Vercel-controlled organization에 묶임. 자유로운 personal organization을 만들려면 Neon UI에서 organization switcher로 별도 org 생성 필요 (또는 다른 이메일로 가입)
  - `vercel integration-resource remove` = 실제로 DB 삭제 (파괴적). `disconnect`은 연결만 해제 (DB 보존)
- **Vercel 프로젝트 자체는 유지** — 향후 배포 옵션 살림. `.vercel/project.json` 그대로

### 2026-04-13 — Phase 5: Activity Modules 설계 전략 및 구현

- **What:** 퀴즈 출제·응시·자동채점 + 과제 텍스트 제출·수동채점 전체 구현. 14번째 테이블 추가, 서버 액션 13개, 페이지 5개 라우트 신규 생성.

- **설계 배경 — 다른 LMS는 어떻게, 왜 그렇게 하는가:**
  1. **퀴즈 문제 표시 방식**: Canvas는 전체 문제를 한 번에 스크롤로 보여주고, Moodle은 페이지 단위로 나눠 보여줌. Canvas 방식이 학생의 자유로운 탐색을 허용하고 구현이 단순하여 MVP에 채택.
  2. **답변 자동 저장**: Moodle은 분당 1회, Canvas는 문제 전환 시 자동 저장. 네트워크 불안정으로 인한 답변 유실 방지가 목적. 라디오 선택 즉시 `saveAnswer` 호출 + `question_attempt_steps` 이력 기록으로 구현.
  3. **제출 전 확인**: 모든 주요 LMS가 미응답 문제 수를 경고하는 확인 모달을 띄움. 실수 방지 UX. 동일하게 채택.
  4. **즉시 채점 vs 지연 채점**: 형성 평가(formative)에서는 즉시 피드백이 학습 효과를 높임. 퀴즈 제출 즉시 채점 + 정오답 리뷰 페이지로 구현.
  5. **과제 재제출**: Canvas는 마감 전 무제한 재제출 허용(기본값), Google Classroom은 "제출 취소" 후 재제출. 학습 과정에서의 반복 수정을 장려하기 위함. `UNIQUE(activity_id, user_id)` + UPSERT로 재제출=UPDATE 처리.
  6. **단일 시도 정책**: Moodle/Canvas 모두 시도 횟수를 설정할 수 있으나, 무제한 시도는 최고점 관리 UI가 필요. MVP 간소화를 위해 1회 시도 고정.

- **핵심 설계 결정:**
  1. **`assignment_submissions` 테이블 추가 (13 → 14테이블)**: 원래 스키마에 과제 제출물 저장소가 없었음. `grade_grades.feedback`이나 `quiz_attempts` 재활용은 의미론적으로 부적절. 별도 테이블이 유일한 깨끗한 선택.
  2. **라우트 구조 `/activities/[id]/*`**: 코스 하위(`/courses/[id]/activities/[id]`)가 아닌 독립 라우트로 설계. 이유: (a) URL이 짧아짐 (b) 활동은 여러 코스에서 참조될 수 있는 독립 엔티티 (c) Moodle의 `mod/quiz/view.php?id=` 패턴과 유사
  3. **grade_item 자동 생성**: 활동 생성 시 `withTransaction`으로 `activities` + `grade_items` 동시 INSERT. 수동 생성을 잊어서 채점 실패하는 케이스를 원천 차단.
  4. **역할 분기 패턴**: `/activities/[id]` 하나의 Server Component에서 `canEdit` 판별 후 교수/학생 뷰를 분기. Phase 3에서 확립한 패턴 재사용.
  5. **CSS `composes` 전면 제거**: Turbopack(Next.js 16 기본 번들러)이 CSS Modules `composes`를 지원하지 않음 발견. 모든 파일에서 인라인 속성으로 교체.

- **데이터 흐름 (퀴즈 응시):**
  ```
  startQuizAttempt → quiz_attempts(inprogress) + question_attempts(N개) + question_attempt_steps(todo)
  saveAnswer → question_attempts.current_answer UPDATE + steps INSERT(complete)
  submitQuizAttempt → 채점(is_correct, mark) + quiz_attempts(finished, score) + grade_grades UPSERT
  ```

- **파일 구조:**
  - Server Actions 3파일: `activity.ts`(4 액션), `quiz.ts`(7 액션), `assignment.ts`(2 액션)
  - 페이지 5라우트: `/activities/[id]`, `/edit`, `/attempt`, `/result`, `/submissions`
  - Client 컴포넌트 4개: QuestionManager, QuizPlayer, AssignmentSubmission, SubmissionGrader

- **Timeline impact:** 0 (2일 예산 내 완료)

### 2026-04-17 — Phase 8 추가: xAPI Mini LRS + mini-RBAC

- **What:** 원안 7-Phase를 8-Phase로 확장. P8 = "xAPI Statement 발행 훅 + Mini LRS 엔드포인트 + 관리자 대시보드 + Moodle 5.x 호환 검증·README LRS 섹션 + mini-RBAC(2 capability 검사)". 가중치 분모 8d → 9.5d.

  - B4 범위 축소 메모(2026-04-17 재확인): 초기안의 "SCORM/xAPI/cmi5 비교표·ADL Adopter Registry 조회법·logstore_xapi transformer 해설" 같은 교육용 온보딩 노트는 제거. B4는 Moodle 5.x `core_xapi`(statement shape·`core_xapi_statement_post` web service·`\core_xapi\handler` 추상 클래스) 정합성 검증 + README 최소 섹션으로 한정.

- **Why:**
  1. 인튜브 포트폴리오 타겟팅 — 회사 독자 자산이 **Tube LRS**(ADL xAPI 1.0·2.0 인증, 조달청 디지털서비스몰 국내 최초 LRS 등재)뿐. TubeLearn은 Moodle 기반 커스터마이징으로 유비온 Coursemos·자이닉스 LearningX 2강에 편입 → 도메인 깊이로 차별화 안 됨
  2. 학습 우선순위와 실무 우선순위 역전 — 원래 문서에서 7번(낮은 우선순위)이었던 xAPI가 입사 후 회의 비중으로는 1번
  3. Moodle 4.2+ `core_xapi` 서브시스템은 LRS 외부 송출을 `logstore_xapi` contrib plugin에 위임 → 이 빈칸을 축소 모방하면 "Tube LRS가 소비하는 raw 데이터 shape" 체감 가능
  4. 2025년 본격화된 AI 디지털교과서(AIDT) 정책은 발행사마다 학습데이터 허브를 요구 — LRS는 Tube LRS의 B2G 확장 축이기도 함

- **후보 4개 비교 → B 채택:**
  - B. xAPI Statement + Mini LRS (채택) — 스펙 명확해 25h에 "돌아가는 것" 가능, 인튜브 활용도 최상
  - A. Role×Context×Capability 3차원 권한 — LMS 시장은 유비온·자이닉스가 장악, 차별화 아님. B의 보완책으로 B5 축소판 포함
  - C. Plugin 아키텍처 흉내 — Next.js와 PHP Moodle 런타임 본질 차이. 오해 강화 위험
  - D. Backup/Restore (.mbz 미니) — 실 운영에서 .mbz는 primary backup 아님. 도메인 오해 함정

- **사용자 결정:**
  1. P7 배포 완료 후 P8 시작 (게이트)
  2. B3 Timeline 우선, 시간 여유 시 Heatmap·정답률 차트
  3. B5 mini-RBAC 처음부터 계획에 포함 — Gate 2로 조건부 drop 규칙 보완

- **Timeline impact:** 8d → 9.5d (가중치 분모 확장). Overall 진행률은 작업량 감소 없이 분모 증가로 **99% → 83%**로 소급 변경됨을 명시적으로 기록.

- **Out of Scope (명시):** ADL LRS Conformance Suite 전체 통과 / State API·Activity Profile·Agent Profile / cmi5 / OAuth2·xAPI Launch / SCORM 어댑터 / 6-role archetype 전체 권한 분화 / voided statement 체인 / 학습자용 LRS 대시보드.

- **핵심 설계 결정:**
  - emit은 `withTransaction` **외부**에서 호출 — xAPI 실패로 사용자 action 롤백 금지
  - `statement_id`는 `crypto.randomUUID()` (pgcrypto 확장 enable 불필요)
  - actor identity = `mailto:` mbox 한 가지만 — 나머지 3 IFI는 POST 400
  - verb IRI는 ADL vocabulary 고정 (submitted만 `activitystrea.ms/submit` 커뮤니티 verb — README 주석)
  - LRS 인증 = BasicAuth 단일 `LRS_BASIC_USER`/`LRS_BASIC_PASS`(bcrypt 해시)
  - `zod` 신규 도입으로 Statement schema validation
  - RBAC 스키마는 Moodle 충실, 실제 검사는 `mod/quiz:grade` + `moodle/course:update` 2개만

- **Go/No-go Gate:**
  - Gate 1 (B3/8d 완료): 실제 세션으로 xapi_statements 5행+ · Timeline 렌더 확인 → 실패 시 B3+/B5 드롭
  - Gate 2 (B5/8g 시작 전): 남은 시간 < 8h면 B5 drop + P8 가중치 1.5d→1.0d 재조정 + CHANGELOG 추가

### 2026-04-12 — CLAUDE.md 리팩토링: @참조 → SKILL.md 전환
- **What:**
  - `@PROJECT_TRACKER.md` 참조 제거 → Rule 1에서 Read tool로 세션 시작 시 읽도록 전환
  - `@project_history/DESIGN_GUIDELINE.md` 참조 제거 → `.claude/skills/design/SKILL.md`로 이동 (paths: `src/**/*.css`, `src/**/*.tsx`)
  - `@AGENTS.md` (5행) 유지 — Next.js 16 breaking change 경고, 매 세션 필수
- **Why:**
  - 세션 시작 시 컨텍스트 381행 → 100행으로 절감 (74% 감소)
  - PROJECT_TRACKER의 Session Log는 세션마다 누적되어 대부분의 과거 기록이 새 세션에서 불필요
  - DESIGN_GUIDELINE은 CSS/TSX 작업 시에만 필요 — SQL/Server Action 작업 시 158행 낭비
  - SKILL.md의 paths 조건부 로드로 필요할 때만 가이드라인 자동 주입
- **Timeline impact:** 0 (구조 변경만, 기능 변경 없음)
