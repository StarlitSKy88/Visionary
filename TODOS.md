# TODOS — AI 经营助手平台 (Team Ops)

## Completed

### Team Ops MVP ✅
- [x] **Phase 1: Memory System (memory-first, from eng review)**
  - [x] Add 6 team-ops tables to `server/db/store-sqlite.js` (teams, team_members, leave_balances, leave_requests, business_rules, recurring_schedules, audit_logs)
  - [x] Add index on `recurring_schedules(enabled, next_run_at)` and `team_members(team_id, user_id)`
  - [x] Enable WAL mode: `db.run('PRAGMA journal_mode=WAL')` — for multi-user concurrent writes
  - [x] Create team repository classes via BaseRepository in `server/db/index.js`
  - [x] teamAuthMiddleware in `auth.js` — team_id validated against session on every `/api/team/*` route

- [x] **Phase 2: Team CRUD Routes**
  - [x] `server/routes/team.js` — `/api/team/members`, `/api/team/leave/*`, `/api/team/rules/*`, `/api/team/audit/*`
  - [x] Permission matrix enforced: admin (full), member (query + request), viewer (read-only)
  - [x] Frontend: `src/app/team/*` pages for team management

- [x] **Phase 3: NL Service + Integration**
  - [x] `server/lib/nl-service.js` — LLM-as-judge intent classification (6 intents)
  - [x] 10s timeout on classifyIntent() LLM call
  - [x] `POST /api/team/nl` — NL input route
  - [x] Confirmation flow (confidence < 0.8 → "Did you mean: [suggested action]?")

- [x] **Phase 4: Scheduler**
  - [x] `server/lib/scheduler.js` — node-cron in-process scheduler
  - [x] Load and reschedule jobs from `recurring_schedules` on server startup
  - [x] Backend deployment: Railway or Render (long-running Node server) — Vercel for Next.js frontend only

## Deferred

### Not MVP
- [ ] **Auto-generated tools template library** — 3-5 concrete tool templates (weekly leave summary, team poll, etc.)
- [ ] **Monetization model** — pricing, free tier, trial (deferred until after Week 4 user interviews)
- [ ] **Competitive moat analysis** — Dingtalk/Feishu response (deferred until Week 4)
- [ ] **External cron (Vercel Cron Jobs)** — only if switching away from Railway/Render

## Tech Debt ✅
- [x] **WAL mode for SQLite** — enabled in `store-sqlite.js`
- [x] **Audit log completeness** — implemented in `audit_logs` table with all required event types
- [x] **Circuit breaker for multi-model routing** — 已实现: 连续失败3次后触发冷却，5分钟后自动恢复，支持 recordSuccess/recordFailure/getCircuitBreakerStatus
- [x] **NL LLM timeout** — 10s timeout set on classifyIntent() calls

## Verification
- [x] TDD: Write tests first for team-ops. `server/__tests__/team.test.js` + `server/__tests__/nl-service.test.js`
- [x] Run `npm test` after each phase — 68 tests passing (原有 39 + 新增 29)
