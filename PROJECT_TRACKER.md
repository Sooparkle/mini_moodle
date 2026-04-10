# MoodleLite Project Tracker

> Last updated: 2026-04-10
> Overall progress: 14%

## Phase Summary

| # | Phase | Status | Progress | Target | Notes |
|---|-------|--------|----------|--------|-------|
| 1 | Analysis | DONE | 100% | 0.5d | 13테이블 확장 스코프 확정 |
| 2 | Design + Setup | IN_PROGRESS | 60% | 1d | schema.sql 완료, seed 미완 |
| 3 | Auth + Dashboard | NOT_STARTED | 0% | 1.5d | |
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
| Seed data (seed.ts) | NOT_STARTED | 20% | 교수1, 학생2, 코스1, 섹션3, 활동5 |
| DB connection utility (src/lib/db.ts) | NOT_STARTED | 10% | |
| Env setup (.env.local template) | NOT_STARTED | 10% | POSTGRES_URL, NEXTAUTH_SECRET, NEXTAUTH_URL |

**Phase 2 progress: 60%** (40% + 20%)

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
