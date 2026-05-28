# Pipeline — an AI-native sales CRM

> Other CRMs ask reps to feed the system. Ours feeds the rep.

A sales CRM where reps type one sentence and Claude does the rest — logs the activity, updates the deal, drafts the follow-up, flags the risk.

## Stack
- Next.js 14 App Router (TypeScript)
- Supabase (Postgres + auth-ready)
- Anthropic `claude-sonnet-4-5`
- Tailwind CSS, @dnd-kit
- Deploys to Vercel

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL          required
NEXT_PUBLIC_SUPABASE_ANON_KEY     required
SUPABASE_SERVICE_ROLE_KEY         optional (server writes bypass RLS)
ANTHROPIC_API_KEY                 optional (falls back to heuristics)
SLACK_WEBHOOK_URL                 optional
```

## Local development
```bash
npm install
cp .env.example .env.local   # paste your values
npm run dev
```
Open http://localhost:3000

## Database
Supabase project is pre-provisioned with these tables (RLS disabled for the demo):
- `users(id, name, email)`
- `companies(id, name, domain, logo_url, industry, size_estimate, created_at)`
- `contacts(id, company_id, name, email, title, created_at)`
- `deals(id, name, company_id, owner_id, value_cents, stage, stage_changed_at, expected_close, risk, risk_reason, ai_summary, next_action, created_at)`
- `activities(id, deal_id, contact_id, user_id, type, body, raw_input, signal, occurred_at)`

If you're starting fresh, run any equivalent migration in Supabase SQL editor.

## Deploy to Vercel

### One-time setup
1. Push this repo to GitHub.
2. Go to https://vercel.com/new, import the repo.
3. Framework preset auto-detects **Next.js** — leave the defaults.
4. Under **Environment Variables**, paste each row from `.env.example` (filling in the real values). Be sure to add them to all three scopes (Production, Preview, Development) — easiest is to tick all three when adding each.
5. Click **Deploy**.

### Subsequent deploys
Every push to `main` → production. Every push to a feature branch → preview URL.

### Notes
- `vercel.json` extends API route timeouts to 60s for AI endpoints (`/api/ai/*`) and CSV import endpoints (`/api/import/*`). Default is 10s — Claude responses can run longer.
- Region is pinned to `iad1` (US East). Change in `vercel.json` if your Supabase project is elsewhere.
- The Supabase URL + anon key are public (`NEXT_PUBLIC_*`) and safe to expose. The service-role key is server-only and never reaches the browser.

## Demo script (90 seconds)
1. **Land on `/`** — Claude's Monday briefing reads the pipeline state in 3 sentences.
2. **Drag a deal** Proposal → Negotiation. Slack ping fires (if configured).
3. **Open a deal** → "Draft follow-up with Claude" → modal generates a full email from past activity. Edit, click "Open in email client."
4. **Activity composer**: type *"Called Sarah, she wants pricing by Friday, budget confirmed."* — Claude parses it into a structured activity. Risk recomputes.
5. **Ask bar**: *"which deals slipped this week?"* — Claude answers in plain English with clickable deal references.
6. **Reports tab** — KPI cards, pipeline funnel, sales-rep comparison, stage-aging table with flag thresholds, month/quarter/year filter.
7. **Dashboard** — leader view: pipeline total, weighted forecast, win rate, leaderboard.
