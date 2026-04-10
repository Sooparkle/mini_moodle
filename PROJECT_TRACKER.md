# MoodleLite Project Tracker

> Last updated: 2026-04-10 Session 2
> Overall progress: 19%

## Phase Summary

| # | Phase | Status | Progress | Target | Notes |
|---|-------|--------|----------|--------|-------|
| 1 | Analysis | DONE | 100% | 0.5d | 13테이블 확장 스코프 확정 |
| 2 | Design + Setup | DONE | 100% | 1d | 모든 태스크 완료 |
| 3 | Auth + Dashboard | IN_PROGRESS | 0% | 1.5d | |
| 4 | Course CRUD + Sections | NOT_STARTED | 0% | 1.5d | |
| 5 | Activity Modules (Quiz + Assignment) | NOT_STARTED | 0% | 2d | |
| 6 | Enrollment + Grades | NOT_STARTED | 0% | 1d | |
| 7 | Polish + Deploy | NOT_STARTED | 0% | 0.5d | |

## Progress Formula

- Phase progress = SUM(DONE task weights) + SUM(IN_PROGRESS task weights * 0.5)
- Overall = (P1% * 0.5 + P2% * 1 + P3% * 1.5 + P4% * 1.5 + P5% * 2 + P6% * 1 + P7% * 0.5) / 8

---

## Current Phase: Phase 2 — Design + Setup

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| DB schema (schema.sql) | DONE | 40% | 13 tables, indexes, FK constraints |
| Project init (Next.js + deps) | DONE | 20% | next 16.2.3, @vercel/postgres, next-auth, bcryptjs |
| Seed data (seed.ts) | DONE | 20% | 교수1, 학생2, 코스1, 섹션3, 활동5 |
| DB connection utility (src/lib/db.ts) | DONE | 10% | query (단일) + withTransaction (트랜잭션) |
| Env setup (.env.local template) | DONE | 10% | .env.local.example + .gitignore 예외 |

**Phase 2 progress: 100%** (40% + 20% + 20% + 10% + 10%)

---

## Upcoming: Phase 3 — Auth + Dashboard

| Task | Status | Weight | Notes |
|------|--------|--------|-------|
| NextAuth.js config | NOT_STARTED | 20% | Credentials Provider |
| Login/Register pages | NOT_STARTED | 25% | |
| Auth middleware | NOT_STARTED | 15% | |
| Dashboard layout | NOT_STARTED | 20% | |
| Role-based routing | NOT_STARTED | 20% | admin / teacher / student 분기 |

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
