@AGENTS.md
@PROJECT_TRACKER.md

# MoodleLite Project Instructions

## Project Stack
- Next.js 16.2.3 + React 19 + TypeScript (App Router, src/)
- Vercel Postgres (@vercel/postgres)
- NextAuth.js v4 (Credentials Provider)
- bcryptjs (password hashing)
- CSS Modules (Tailwind 미사용)
- 13-table schema: src/sql/schema.sql

## Progress Tracking Rules (MANDATORY)

These rules apply to EVERY session. They are not optional.

### Rule 1: Read Context First
PROJECT_TRACKER.md는 `@` 참조로 자동 로드됨. 추가로:
- **새 Phase 시작 시**: `project_history/PLAN.md`를 읽어 해당 Phase의 상세 요구사항과 기술 결정 맥락을 파악할 것
- **기술 결정이 필요할 때**: `project_history/PLAN.md`의 "반대 논리 및 한계" 섹션을 참고할 것

### Rule 2: Update Tracker After Every Meaningful Change
After completing any of these, update PROJECT_TRACKER.md immediately:
- A task status changes (NOT_STARTED → IN_PROGRESS → DONE)
- A new file is created or a significant feature is implemented
- A phase is completed
- You are about to end your response

"Update" means: edit the relevant task row, recalculate phase percentage, recalculate overall percentage, update the "Last updated" timestamp, and add a line to the Session Log.

### Rule 3: How to Calculate Progress
- Phase progress = SUM(DONE task weights) + SUM(IN_PROGRESS task weights * 0.5)
- Overall progress = weighted average of all phases by target days:
  - P1: 0.5d, P2: 1d, P3: 1.5d, P4: 1.5d, P5: 2d, P6: 1d, P7: 0.5d (Total = 8d)
  - Overall = (P1% * 0.5 + P2% * 1 + P3% * 1.5 + P4% * 1.5 + P5% * 2 + P6% * 1 + P7% * 0.5) / 8

### Rule 4: Plan Changes
If the user requests a change that affects the project plan (adding/removing phases, changing scope, reordering):
1. Update `project_history/PLAN.md` with the new plan content
2. Update `PROJECT_TRACKER.md` with the new task structure and percentages
3. Append an entry to `project_history/CHANGELOG.md` with: Date, What Changed (before → after), Why, Timeline Impact

### Rule 5: Phase Transitions
When a phase reaches 100%:
1. Mark it DONE in the Phase Summary table
2. Expand the next phase's tasks into detailed task rows (if not already done)
3. Set the next phase to IN_PROGRESS
4. Add a Session Log entry noting the phase completion

### Rule 6: Before Stopping
Before ending any response where you made code changes, verify that PROJECT_TRACKER.md reflects the current state. Specifically check:
- Task statuses (NOT_STARTED / IN_PROGRESS / DONE)
- Phase percentages (recalculated per Rule 3)
- Overall percentage (recalculated per Rule 3)
- "Last updated" timestamp
- Session Log entry for this response

If any task status changed, a file was created, or a feature was implemented in this response, update the tracker NOW — do not defer to the next turn.

## Git Conventions

### Branch Strategy
- `main` + feature branches only (no `develop`)
- Branch naming: `{type}/p{phase}-{short-description}`
  - type: `feat`, `fix`, `refactor`, `docs`, `chore`
  - 예: `feat/p3-auth-config`, `feat/p4-course-crud`

### Commit Convention (Conventional Commits)
- Format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `db`
- Scopes: `auth`, `course`, `quiz`, `assignment`, `enrollment`, `grade`, `dashboard`, `db`, `ui`
- Subject는 영어, body는 한국어 OK
- 한 커밋 = 한 논리적 변경

### Merge Strategy
- Regular merge commit (`--no-ff`), squash/rebase 미사용
- GitHub PR 머지 시 "Create a merge commit" 선택

### PR Convention
- 제목: `[P{phase}] {description}`
- 본문: 2-3줄 변경 요약 + UI 변경 시 스크린샷

## File Conventions
- Source code: src/
- SQL files: src/sql/
- DB utilities: src/lib/
- App routes: src/app/
- Project history: project_history/
