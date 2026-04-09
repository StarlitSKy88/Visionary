# TODOS — AI 经营助手平台 (Team Ops)

## In Progress

### Team Ops MVP
- [ ] **Phase 1: Memory System (memory-first, from eng review)**
  - [ ] Add 6 team-ops tables to `server/db/init.js` (team_members, leave_balances, leave_requests, business_rules, recurring_schedules, audit_logs)
  - [ ] Add index on `recurring_schedules(enabled, next_run_at)`
  - [ ] Enable WAL mode: `db.run('PRAGMA journal_mode=WAL')` — for multi-user concurrent writes
  - [ ] Create team repository files: `team-member-repository.js`, `leave-repository.js`, `business-rules-repository.js`, `schedule-repository.js`, `audit-repository.js`
  - [ ] teamAuthMiddleware in `auth.js` — team_id validated against session on every `/api/team/*` route

- [ ] **Phase 2: Team CRUD Routes**
  - [ ] `server/routes/team.js` — `/api/team/members`, `/api/team/leave/*`, `/api/team/rules/*`, `/api/team/audit/*`
  - [ ] Permission matrix enforced: admin (full), member (query + request), viewer (read-only)
  - [ ] Frontend: `src/app/team/*` pages for team management

- [ ] **Phase 3: NL Service + Integration**
  - [ ] `server/lib/nl-service.js` — LLM-as-judge intent classification (6 intents: schedule_reminder, query_leave, approve_request, add_member, update_rule, general_query)
  - [ ] 10s timeout on classifyIntent() LLM call
  - [ ] `POST /api/team/nl` — NL input route
  - [ ] Confirmation flow (confidence < 0.8 → "Did you mean: [suggested action]?")

- [ ] **Phase 4: Scheduler**
  - [ ] `server/lib/scheduler.js` — node-cron in-process scheduler
  - [ ] Load and reschedule jobs from `recurring_schedules` on server startup
  - [ ] Backend deployment: Railway or Render (long-running Node server) — Vercel for Next.js frontend only

## Deferred

### Not MVP
- [ ] **Auto-generated tools template library** — 3-5 concrete tool templates (weekly leave summary, team poll, etc.)
- [ ] **Monetization model** — pricing, free tier, trial (deferred until after Week 4 user interviews)
- [ ] **Competitive moat analysis** — Dingtalk/Feishu response (deferred until Week 4)
- [ ] **External cron (Vercel Cron Jobs)** — only if switching away from Railway/Render

## Tech Debt
- [ ] **WAL mode for SQLite** — enable `PRAGMA journal_mode=WAL` in init.js for concurrent write support
- [ ] **Audit log completeness** — add: member_added, member_removed, role_changed, rule_updated, login events to audit_logs table
- [ ] **Circuit breaker for multi-model routing** — check if providers/router.js already has per-model failure tracking; add if missing (skip model after 3 consecutive failures, 5min cooldown)
- [ ] **NL LLM timeout** — set explicit 10s timeout on classifyIntent() calls

## Verification
- [ ] TDD: Write tests first for team-ops. `server/__tests__/team.test.js` + `server/__tests__/nl-service.test.js`
- [ ] Run `npm test` after each phase — existing 39 tests must still pass
