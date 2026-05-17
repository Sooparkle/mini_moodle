# MoodleLite Project Tracker

> Last updated: 2026-05-17 Session 14
> Overall progress: 88% (분모 13d, P10 추가)

## Phase Summary

| # | Phase | Status | Progress | Target | Notes |
|---|-------|--------|----------|--------|-------|
| 1 | Analysis | DONE | 100% | 0.5d | 13테이블 확장 스코프 확정 |
| 2 | Design + Setup | DONE | 100% | 1d | 모든 태스크 완료 |
| 3 | Auth + Dashboard | DONE | 100% | 1.5d | 모든 태스크 완료 |
| 4 | Course CRUD + Sections | DONE | 100% | 1.5d | 모든 태스크 완료 |
| 5 | Activity Modules (Quiz + Assignment) | DONE | 100% | 2d | 모든 태스크 완료 |
| 6 | Enrollment + Grades | DONE | 100% | 1d | 모든 태스크 완료 |
| 7 | Polish + Deploy | IN_PROGRESS | 80% | 0.5d | 배포만 남음 |
| 8 | xAPI Mini LRS + mini-RBAC | NOT_STARTED | 0% | 1.5d | B0–B5, P7 100% 후 IN_PROGRESS 전환 |
| 9 | Course UX 비교 (Canvas + Mode-less) | DONE | 100% | 1.5d | A/B/회고 완료 |
| 10 | Activity Registration Expansion (Resources + Forum) | DONE | 100% | 2d | Page/URL/File/Forum 4종 추가, Activity Chooser 모달 |

## Progress Formula

- Phase progress = SUM(DONE task weights) + SUM(IN_PROGRESS task weights * 0.5)
- Overall = (P1% * 0.5 + P2% * 1 + P3% * 1.5 + P4% * 1.5 + P5% * 2 + P6% * 1 + P7% * 0.5 + P8% * 1.5 + P9% * 1.5 + P10% * 2) / 13

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

## Phase 4 — Course CRUD + Sections (DONE)

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| Course creation (teacher) | DONE | 25% | /courses/new, Server Action + role 체크 |
| Course detail page | DONE | 25% | /courses/[id], 역할별 뷰 분기 + 접근 제어 |
| Section management | DONE | 25% | 섹션 CRUD + 화살표 정렬 (withTransaction) |
| Course list page | DONE | 25% | /courses, 역할별 3뷰 (admin/teacher/student) |

---

## Phase 5 — Activity Modules: Quiz + Assignment (DONE)

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| 5a: 스키마 마이그레이션 + 시드 | DONE | 10% | assignment_submissions 14번째 테이블, 퀴즈 문제 + 샘플 시도 시드 |
| 5b: Server Actions | DONE | 25% | activity.ts(CRUD), quiz.ts(문제관리+응시+채점), assignment.ts(제출+채점) |
| 5c: 코스 내 활동 CRUD UI | DONE | 15% | SectionManager 확장 + 학생 상태 배지 + 활동 링크 |
| 5d: 활동 상세 + 퀴즈 편집 | DONE | 20% | /activities/[id] 역할 분기, /activities/[id]/edit QuestionManager |
| 5e: 퀴즈 응시 플로우 | DONE | 20% | /activities/[id]/attempt (QuizPlayer) + /activities/[id]/result |
| 5f: 과제 제출 + 채점 | DONE | 10% | AssignmentSubmission + /activities/[id]/submissions (SubmissionGrader) |

---

## Phase 6 — Enrollment + Grades (DONE)

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| 6a: enrollment 서버 액션 | DONE | 15% | enrollInCourse (ON CONFLICT 멱등, is_published 검증) |
| 6b: EnrollButton 클라이언트 컴포넌트 | DONE | 10% | useTransition + router.refresh 패턴 |
| 6c: 코스 목록 + 상세 등록 UI | DONE | 20% | 목록에 등록 버튼, 상세에 배너 + 교수 성적표 링크 |
| 6d: 교수용 성적표 페이지 | DONE | 30% | CROSS JOIN 매트릭스, 통계 요약 + 항목별 평균 + 학생별 성적 |
| 6e: 학생 대시보드 성적 집계 | DONE | 25% | LATERAL JOIN, 코스별 % + 총 평균 카드 |

**Phase 6 progress: 100%**

---

## Phase 7 — Polish + Deploy (IN_PROGRESS)

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| 7a: @neondatabase/serverless 전환 | DONE | 30% | 19파일 import + 25곳 tx.query + db.ts 재작성 |
| 7b: 성능 개선 (region, 병렬화, config) | DONE | 15% | vercel.json syd1, Promise.all 병렬화, serverExternalPackages |
| 7c: UX 안전망 (loading/error/not-found) | DONE | 15% | loading.tsx, error.tsx, not-found.tsx |
| 7d: 반응형 CSS | DONE | 20% | 11개 CSS 파일 @media 768px breakpoint |
| 7e: Vercel 배포 + README | IN_PROGRESS | 20% | README 완료, 배포 대기 |

**Phase 7 progress: 80%**

---

## Phase 8 — xAPI Mini LRS + mini-RBAC (NOT_STARTED)

> 선행 조건: P7 = 100% (Vercel 배포 완료) — 이 조건 충족 전까지 IN_PROGRESS 전환 금지.
> 상세 설계·반대 논리는 `project_history/PLAN.md` Phase 8 섹션 참조.

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| 8a: xAPI 스키마 마이그레이션 | NOT_STARTED | 10% | xapi_statements, xapi_verbs, xapi_activity_types + rbac 3테이블 (총 6테이블 추가) |
| 8b: Statement emission 훅 6지점 | NOT_STARTED | 25% | enrollment, quiz start/submit/answered, assignment, page view. tx 외부 emit |
| 8c: LRS 엔드포인트 (POST/GET) | NOT_STARTED | 15% | BasicAuth, zod validation, 409 idempotency, 10개 규약 내부 테스트 |
| 8d: Timeline 대시보드 | NOT_STARTED | 15% | /admin/lrs — 학습자 선택 → verb-object 시간 역순. MUST |
| 8e: Heatmap + 정답률 차트 | NOT_STARTED | 10% | Gate 1 통과 + 시간 ≥ 4h일 때만 (조건부) |
| 8f: Moodle 5.x 호환 검증 + README LRS 섹션 | NOT_STARTED | 10% | core_xapi statement shape + core_xapi_statement_post + \core_xapi\handler 정합 확인. README는 엔드포인트 사용법만 |
| 8g: mini-RBAC 2 capability 검사 | NOT_STARTED | 15% | Gate 2 통과 시만. mod/quiz:grade + moodle/course:update |

**Phase 8 progress: 0%**

---

## Phase 9 — Course UX 비교 (Canvas + Mode-less) (IN_PROGRESS)

> 배경: Moodle opensource 강좌 페이지의 5대 UX 약점(편집/뷰 모드 전환 비용, 활동 진입 후 복귀 비용, 정보 위계 불분명, 진척도 분산, 잠금 사유 불친절) 중 처음 두 개를 정면 공격하는 2개 변형을 구축해 비교 가능하게 만든다.
> 라우팅: `/courses/[id]` (기본, 기존 유지) · `/courses/[id]/canvas` (A) · `/courses/[id]/modeless` (B, 추후) — 3-way 토글로 전환.

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| 9a: A 변형 — Single-canvas 3-pane | DONE | 45% | CourseIndex(scrollspy) + SectionCanvas + RightRail(진척도/마감/성적, 교수 통계) + ActivityPeek(?peek=N slide-over) + ViewToggle. tsc clean. |
| 9b: B 변형 — Mode-less 인라인 편집 | DONE | 45% | /modeless 라우트. InlineEditableText(hover-pen) + ModelessSectionEditor(hover-only 컨트롤) + 5초 Undo 토스트 + ?as=student 학생 미리보기 + ModelessReadOnly. tsc clean. |
| 9c: 비교 회고 + FINAL_REPORT 부록 | DONE | 10% | FINAL_REPORT.md Appendix A 추가: 5대 약점 → 2 변형 매핑, 차별점/구현 비용/한계/다음 단계 7개 표. 측정 메트릭은 설계 의도 기반 추정 (실측은 사용자 테스트 후 채움). |

**Phase 9 progress: 100%**

---

## Phase 10 — Activity Registration Expansion (Resources + Forum) (DONE)

> 배경: 활동 타입이 `quiz`/`assignment` 2종만 존재해 Moodle 핵심 콘텐츠 전달 매커니즘(Page/URL/File/Forum) 부재. COURSE_UX_REPORT.md:149의 "5.1 Add 버튼·purpose 그룹화 미적용" 갭 정면 공격.

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| 10a: DB 마이그레이션 + schema.sql 갱신 | DONE | 15% | migration-002-activity-types.sql · CHECK 6종 교체 · 4 신규 테이블 + 인덱스 |
| 10b: 서버 액션 확장 + 신규 4파일 | DONE | 20% | activity.ts(type 화이트리스트 6 + grade_items 조건부 + 자식 INSERT) · pages.ts · url.ts · file.ts · forum.ts |
| 10c: ActivityChooser 모달 컴포넌트 | DONE | 20% | basic/canvas 공통, purpose 3탭(Content/Communication/Assessment), 2단계 폼, ESC/backdrop 닫기 |
| 10d: SectionManager 모달 연동 + 배지 6종 | DONE | 10% | 인라인 select 폼 → 모달 트리거 · activityTypeLabel 헬퍼 도입 |
| 10e: Modeless 인라인 select 6종 + 조건부 필드 | DONE | 10% | hover-pen 철학 유지, URL/File 선택 시 추가 필드 인라인 노출 |
| 10f: 활동 상세 분기 (Page/URL/File/Forum) | DONE | 20% | renderActivityBody 분기 · PageView/UrlView/FileView/ForumView/ForumThread · ForumComposer/ForumDeleteButton · edit/PageEditor/UrlEditor/FileEditor · activity-content.ts 헬퍼 |
| 10g: 트래커/PLAN/CHANGELOG 갱신 | DONE | 5% | 분모 11d → 13d, Overall 재계산, Phase 10 entry |

**Phase 10 progress: 100%**

---

## Session Log

### 2026-05-17 Session 14 — Phase 10 완료 (Activity Registration Expansion)
- 신규 활동 타입 4종 추가: `page` / `url` / `file` / `forum` (총 6종)
- DB 마이그레이션 `migration-002-activity-types.sql`:
  - `activities_type_check` 제약 6종으로 교체
  - `activity_pages` (PK activity_id, body) · `activity_urls` (external_url + open_in_new_tab) · `activity_files` (file_name + file_url + size) · `forum_posts` (parent_id NULL=topic) 4 테이블
  - scripts/apply-migration.ts 신규 작성 (WebSocket Pool + multi-statement)
- 서버 액션:
  - `activity.ts`: type 화이트리스트 6종 + grade_items는 `quiz`/`assignment`만 자동 생성 + type별 자식 테이블 INSERT
  - 신규: `pages.ts`(`page.ts`는 Next.js page 컨벤션 충돌로 리네임) / `url.ts` / `file.ts` / `forum.ts`(verifyForumAccess: owner 또는 enrolled)
- Activity Chooser 모달 (`ActivityChooser.tsx`, `activity-chooser.module.css`):
  - basic + canvas 변형 공통 사용
  - purpose 3탭 (Content / Communication / Assessment) + 카드 그리드 → 2단계 type별 폼
  - design 토큰 준수 (monochrome + accent 1색, focus trap, ESC/backdrop 닫기, scroll-lock)
- Modeless 변형: `AddActivityForm` `<select>` 6 옵션 + URL/File 선택 시 조건부 필드 인라인 노출 (hover-pen 철학 유지)
- 활동 상세 6종 분기 (`/activities/[id]/page.tsx` `renderActivityBody`):
  - PageView (본문 + 강사 편집 링크) / UrlView (외부 이동 버튼) / FileView (다운로드) / ForumView+ForumThread (topic 목록 + 답글, `?topic=N` 라우팅)
  - edit 페이지 6종 분기: PageEditor / UrlEditor / FileEditor 신규
- 헬퍼: `src/lib/activity-types.ts` (라벨 매핑 + GRADED_TYPES) · `src/lib/activity-content.ts` (자식 테이블 로더)
- 하드코딩 라벨 6곳 제거: 모두 `activityTypeLabel` 사용 (page.tsx 학생뷰, ActivityPeek, ModelessReadOnly, SectionCanvas, activities/[id]/page.tsx)
- TypeScript clean · `npm run build` 성공
- 분모 11d → 13d (P10 weight 2d), Overall 85% → 88%
- **다음 진입점**: (1) `npm run dev`로 교수/학생 시나리오 동작 검증, (2) Phase 7 잔여 Vercel 배포 또는 Phase 8 진입



### 2026-05-17 Session 13 — Phase 9 B변형 (Mode-less 인라인 편집) 빌드
- 차별점 결정: 학생 보기 토글 + Hover-pen 인라인 편집 (사용자 선택, 위 둘 다)
- 신규 디렉토리 `src/app/(authenticated)/courses/[id]/modeless/` 7개 파일:
  - `page.tsx`: course/sections/activities 페치 + `?as=student` 파싱 + isTeacherOwner/previewAsStudent/editable 3분기. 학생/미리보기 시 statusByActivity 추가 페치
  - `ModelessSectionEditor.tsx` (클라이언트, 480줄): 섹션·활동 카드 리스트, hover-only 위↑↓× 컨트롤, InlineEditableText 결합, pendingDeletes Map + 5초 setTimeout 삭제 패턴. 인라인 AddSectionForm / AddActivityForm
  - `InlineEditableText.tsx`: variant heading/description, view↔edit↔saving 상태기계. Enter(heading)·Cmd+Enter(description)·blur 저장, Esc 취소. Pen SVG 아이콘 hover opacity 0→1
  - `UndoToast.tsx`: 화면 하단 stack, 5초 카운트다운 progress bar(CSS animation), "되돌리기" 클릭 시 clearTimeout
  - `ModelessReadOnly.tsx` (서버): is_visible 필터 렌더 단계에서. 학생·미리보기 공용
  - `StudentPreviewToggle.tsx`: `?as=student` Link + eye SVG. 미리보기 ON 시 self-hide (배너가 대체)
  - `modeless.module.css` (440줄): 디자인 토큰 준수(monochrome + --accent + danger), hover-pen / 토스트 / 다크 배너(`var(--gray-900)`) / 768px 반응형 + `@media (hover: none)` 터치 fallback
- 기존 SectionManager 패턴 폐기: [편집] 버튼 클릭 → 카드 전체가 폼으로 교체 → 인라인 hover-pen 1-click 진입으로 컨텍스트 전환 비용 0
- 5초 Undo 토스트: 페이지 이탈 시 setTimeout 미실행 → 의도적 "암묵 취소". DB 마이그레이션 없이 deletion soft-cancel
- ViewToggle: disabled span → Link 활성화 (3-way 토글 완성)
- 서버 액션은 기존 createSection/updateSection/deleteSection/reorderSection + activity 6개 그대로 재사용 (스코프 최소)
- TypeScript 체크 clean (exit 0)
- **9c 회고 (같은 세션 진행)**: `project_history/FINAL_REPORT.md` Appendix A 추가
  - A.1 배경: Moodle 5.x 5대 UX 약점 식별 → P9는 (1)편집/뷰 전환 비용 + (2)활동 진입 후 복귀 비용 타깃
  - A.2 라우팅 3-way 매핑 / A.3 변형별 설계 의도 / A.4 차별점 매트릭스 (클릭 수·컨텍스트 전환 횟수)
  - A.5 구현 비용 표 / A.6 한계 / A.7 다음 단계 (사용자 테스트 / A+B 통합 / dnd 정렬)
  - 측정값은 설계 의도 기반 추정치 — 실측은 사용자 테스트 후 갱신
- Phase 9 진척: 45% → 100% (DONE), Overall: 78% → 85%
- **다음 진입점**: (1) `npm run dev`로 `/courses/1/modeless` 동작 검증 (교수: prof@moodlelite.com, 학생: student1@moodlelite.com). (2) 9a+9b+9c 묶어서 단일 PR 머지 (`feat/p9-course-ux-variants` 브랜치 권장). (3) P7 잔여(Vercel 프로덕션 배포) 또는 P8(xAPI Mini LRS) 진입

### 2026-05-16 Session 12 — Phase 9 A변형 (Single-canvas Course View) 빌드
- Moodle 5.x 강좌 페이지 reference 분석 → mini-moodle의 갭 7개 식별 (Course index 부재, Activities overview 부재, Availability 부재 등) + Moodle opensource UX의 5대 약점 정리 (편집/뷰 모드 전환 비용, 활동 진입 후 복귀 비용 등)
- 사용자 결정: 차별화 방향 A(Single-canvas) + B(Mode-less) 둘 다 구현해 비교, A부터. 라우팅 `/canvas` 신규 + 3-way 토글
- Phase 9 신규 추가, 분모 9.5d → 11d 확장. Overall 83% → 78%로 소급 변경 (작업량 감소 아님, 분모 증가)
- 빌드 내역:
  - `src/app/(authenticated)/courses/[id]/canvas/page.tsx`: 코스 상세 데이터 페치 재사용 + 학생 최근 성적 3개 / 교수 미채점 수·등록자 수 추가 쿼리
  - `canvas/CourseIndex.tsx`: IntersectionObserver 기반 scrollspy + 클릭-스크롤 + 활동 상태 dot 표시
  - `canvas/SectionCanvas.tsx`: 교수 owner면 기존 SectionManager 그대로 wrap, 학생은 카드 그리드. ActivityCard 클릭 → `?peek=N` slide-over
  - `canvas/RightRail.tsx`: 학생(진척도% + 다가오는 마감 3 + 최근 성적 3) / 교수(등록·미채점 통계) 분기
  - `canvas/ActivityPeek.tsx`: 우측 slide-over (ESC/백드롭/X 닫기, body scroll-lock, router.replace로 ?peek 제거)
  - `[id]/ViewToggle.tsx`: 기본/캔버스/Mode-less 3-way 토글 (Mode-less 비활성)
  - 기존 `[id]/page.tsx`에 ViewToggle 끼움 (`.topRow` 추가)
- 모바일 fallback: ≤1024px flex 컬럼 + `order`로 SectionCanvas → RightRail → CourseIndex 순서 재배치. ≤768px activityGrid 1열, peek 풀스크린
- TypeScript 체크 clean
- **다음 진입점**: (1) 사용자가 `npm run dev`로 `/courses/1/canvas` 진입해 시드 데이터로 동작 확인. (2) 9b Mode-less B변형 — 편집 토글을 "학생으로 보기"로 치환. (3) 9c 회고 작성

### 2026-04-17 Session 11 — Phase 8 계획 확정 (xAPI Mini LRS + mini-RBAC)
- 입사(인튜브) 도메인 대비용 새 Phase 8 추가 결정 — 회사 독자 자산인 Tube LRS(ADL xAPI 1.0/2.0 인증, 디지털서비스몰 등재) 기반
- 후보 4개(xAPI / RBAC 3차원 / Plugin / Backup-Restore) 비교 결과 xAPI Mini LRS 단일 주제 채택. Moodle 4.2+ core_xapi 가 LRS 외부 송출을 plugin(logstore_xapi)에 맡기는 구조를 축소 모방
- 사용자 결정: (1) P7 배포 완료 후 P8 시작 (2) B3 대시보드는 Timeline 우선 + 여유 시 Heatmap/정답률 (3) B5 mini-RBAC 처음부터 포함
- B4 범위 축소(세션 말미 재확인): 초기안의 SCORM/xAPI/cmi5 비교표·ADL Registry 조회법·logstore_xapi transformer 해설 등 온보딩 노트 전부 제거. B4는 Moodle 5.x core_xapi(statement shape·core_xapi_statement_post·\core_xapi\handler) 정합성 검증 + README LRS 엔드포인트 사용법 최소 섹션만
- PROJECT_TRACKER: 가중치 분모 8d → 9.5d 확장. Overall 99% → 83%로 소급 변경 (작업량 감소 아니고 분모 증가)
- PLAN.md에 Phase 8 섹션 + 반대 논리 표 추가
- CHANGELOG.md에 Phase 8 entry 추가 (가중치 분모 변경 명기)
- Gate 1 (8d 완료): 실제 세션으로 xapi_statements 5행+ · Timeline 렌더 확인. 실패 시 8e/8g 드롭
- Gate 2 (8g 시작 전): 남은 시간 < 8h면 drop + 1.0d로 재조정
- **다음 세션 진입점**: (1) P7 Vercel 프로덕션 배포 완료 → P7=100% 마크, (2) P8 IN_PROGRESS 전환 + `feat/p8-xapi-lrs` 브랜치 생성, (3) 8a(xAPI+RBAC 스키마) 착수. 구현 상세는 `/Users/soo_parkle/.claude/plans/clever-sniffing-valley.md` 참조

### 2026-04-14 Session 10 — Phase 7 진행 (Polish + Deploy)
- @vercel/postgres (deprecated) → @neondatabase/serverless 전환 (commit: 6751e74)
- src/lib/db.ts 재작성: neon() + Pool + withTransaction (PoolClient 기반)
- 16개 앱 파일 import 변경, 4개 action tx.sql→tx.query(), 3개 스크립트 변경
- vercel.json: regions syd1, next.config.ts: serverExternalPackages bcryptjs
- 쿼리 병렬화: courses/page.tsx StudentCourseList, grades/page.tsx 3쿼리 Promise.all
- UX 안전망: loading.tsx, error.tsx (인증 영역), not-found.tsx (루트)
- 반응형 CSS: globals.css breakpoint + 11개 모듈 @media 768px
- nav.tsx userName span 추가 (모바일에서 이름 숨김)
- README.md 재작성 (테스트 계정, 로컬 실행, 프로젝트 구조)
- Phase 7 progress: 0% → 80%, Overall: 94% → 99%

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

### 2026-04-13 Session 9 — Phase 6 완료 (Enrollment + Grades)
- src/app/actions/enrollment.ts: enrollInCourse 서버액션 (ON CONFLICT DO NOTHING 멱등, is_published 체크)
- src/app/(authenticated)/courses/[id]/EnrollButton.tsx: useTransition + router.refresh 클라이언트 컴포넌트
- courses/page.tsx 수정: 수강 가능 코스에 EnrollButton 추가 (카드 Link 분리)
- courses/[id]/page.tsx 수정: 비등록 학생용 등록 배너 + 교수용 "성적표 보기" 링크
- courses/[id]/grades/ 신규: 교수용 성적표 (CROSS JOIN 학생×항목 매트릭스, 통계 + 항목별 평균 + 학생별 성적)
- dashboard/page.tsx 수정: LATERAL JOIN으로 코스별 성적 집계, 총 평균 카드 추가
- CSS 확장: courses.module.css, course-detail.module.css, dashboard.module.css, grades.module.css (신규)
- TypeScript 타입 체크 통과
- Phase 6 완료 (100%) → Phase 7 대기
- Overall progress: 90% → 94%

### 2026-04-13 Session 8 — Phase 5 완료 (Activity Modules: Quiz + Assignment)
- assignment_submissions 14번째 테이블 추가 (마이그레이션 + schema.sql 업데이트)
- seed.ts 확장: 퀴즈 문제 7개, grade_items 5개, student1 HTML 퀴즈 완료(2/3), HTML 과제 제출+채점(85점) 샘플 데이터
- Server Actions 3파일: activity.ts(CRUD 4개), quiz.ts(문제CRUD 4개 + 응시3개), assignment.ts(제출+채점)
- SectionManager 확장: 활동 추가/편집/삭제/정렬 + ActivityManager 컴포넌트
- 코스 상세 학생뷰: 활동 링크화 + 상태 배지(미응시/진행중/완료/제출됨/채점됨)
- /activities/[id] 역할 분기: 교수(통계+편집링크), 학생+퀴즈(응시/결과), 학생+과제(제출/채점결과)
- /activities/[id]/edit: QuestionManager (문제 CRUD + 보기4개 + 정답 라디오)
- /activities/[id]/attempt: QuizPlayer (전체문제 한번에 + 자동저장 + 확인모달)
- /activities/[id]/result: 점수 + 문제별 정오답 리뷰 (정답=녹색, 오답=빨간 왼쪽 테두리)
- /activities/[id]/submissions: SubmissionGrader (제출물 목록 + 점수입력 + 피드백)
- AssignmentSubmission 클라이언트 컴포넌트: 제출/재제출 + 채점결과 표시
- CSS composes 전체 제거 (Turbopack 비호환 → 인라인 속성으로 교체)
- Phase 5 완료 (100%) → Phase 6 대기
- Overall progress: 65% → 90%

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
