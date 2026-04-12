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
