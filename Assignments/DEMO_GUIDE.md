# TravelWise — Presentation Demo Guide

Rehearsal and live-demo reference for the Assignment 4 presentation (Saturday, 2026-10-24).

## Why this system, and why it helps

Enterprise travel approval is normally run on guessed costs, inconsistently-applied
policy, and email threads with no durable audit trail. TravelWise replaces all three:

- **Guessed costs → a trained Random Forest model** (R² = 0.9711 on 60,031 held-out
  real records) predicts a genuine cost estimate the moment a request is submitted,
  instead of relying on the employee's own guess.
- **Inconsistent policy → a configurable policy engine.** Every option is checked
  against every active rule (class caps, destination caps, a global max) — the same
  rules, applied the same way, every time. An administrator can add or change a rule
  with no code change or redeploy.
- **No audit trail → a real audit log + a normalized Approval record.** Every
  significant action (create, score, approve, reject, policy change) is recorded with
  who, what, and when — and a rejection always carries a reason, visible back to the
  employee who submitted it.

The emerging-technology piece (the ML cost prediction) isn't cosmetic — it directly
sets the baseline that option generation and scoring use, so a better prediction
produces a different, better recommendation.

## Test accounts

| Role | Email | Password |
|---|---|---|
| Employee | `bookmarkkeepersonlineschool@gmail.com` | `travel123` |
| Supervisor | `dev478670@gmail.com` | **you set this yourself — make sure you remember it before Saturday** |
| Administrator | `admin-test@travelwise.test` | `travel123` |

If the supervisor password is forgotten, it can be reset the same way as before (ask
Claude to reset it via the Supabase admin API) — do this well before the demo, not
in the moment.

## Pre-demo checklist (do this before you start presenting)

1. Start all three services, in this order:
   - `ml-service/`: `venv\Scripts\python app.py` → listens on **:8000**
   - `server/`: `npm run dev` → listens on **:5000**
   - `client/`: `npm run dev` → listens on **:5173**
2. Confirm the backend is actually connected: open `http://localhost:5000/api/db-check`
   in a browser — should show `"connected": true`.
3. Open `http://localhost:5173/` and sign out of any existing session, so you start
   from the sign-in screen, not mid-session.
4. Have a second browser tab or an incognito window ready — you'll be switching
   between the Employee and Supervisor accounts during the demo, and signing in and
   out repeatedly live is slower and riskier than having both ready.

## End-to-end demo flow

Walk through this exact sequence during rehearsal until it's automatic — the
10-minute demo window is tight.

**1. Sign in as Employee.**
Point out the sidebar — it's role-aware, only "My Requests" shows for an employee.

**2. Submit a travel request.**
Pick origin and destination from the dropdowns (say out loud: *"constrained to the
6 cities the model was actually trained on, so every prediction is real, not a
generic fallback"*). Fill in class, dates, an optional cost guess, submit.

**3. Point out the predicted cost appears immediately on the request card.**
This is the live ML call — mention the real R² number here if you haven't already
on the slides.

**4. Switch to the Supervisor account.**
Open Approvals → Pending tab. The new request is there. Click "Score options" —
three ranked options appear, each flagged compliant/non-compliant against the real
active policy rules (point at a ✓ or ✕ badge and say which rule it's checked
against).

**5. Add a comment and approve one option** (or demonstrate a reject, which
requires a comment — a deliberate design decision: a rejected employee should
always know why).

**6. Switch back to the Employee account.**
Show the decision and the comment now visible on their own request list — this is
the audit trail closing the loop back to the requester, not just existing silently
in the database.

**7. Sign in as Administrator (time permitting).**
- **Policies tab:** show an existing rule, or add one live, to prove it's
  genuinely configurable, not hardcoded.
- **Reports tab:** show the request/status counts, approved spend, and the recent
  activity feed pulled straight from the audit log.

## If something breaks live

- **ML service unreachable:** the request still saves — predicted_cost stays null
  and scoring falls back to the employee's own estimate. Say this out loud as the
  designed graceful-degradation behaviour, not a bug, and keep going.
- **Anything else stalls:** fall back to the screenshots/evidence already in the
  written report (Q1.2's evidence table) rather than troubleshooting live in front
  of the marker.

## Likely questions and answers

Grouped by what they're really probing. Read each answer until you could say it
without the page in front of you — the marker is grading whether *you* understand
it, not whether you can read it.

### Architecture & design decisions

**"Is the ML prediction really used, or just displayed?"**
It sets the baseline cost that option generation multiplies from (Rail ×1.00,
Flight ×1.35, Car ×1.14). A different prediction produces different option costs
and a different ranking — it's load-bearing, not cosmetic.

**"Why is the ML service a separate Python microservice instead of living inside
the Node backend?"**
Python/scikit-learn is the standard tooling for this kind of model; keeping it as
its own service means it can be developed, tested, and scaled independently of the
Node API, and the Node side only ever talks to it over a plain REST contract
(`POST /predict-cost`) — it doesn't need to know anything about how the model
works internally.

**"What happens if the ML service is down?"**
The request still saves. `predicted_cost` stays null, and scoring falls back to
the employee's own declared estimate, then a fixed default if even that's
missing. This is a deliberate graceful-degradation design, not an oversight —
and it's actually tested (see the integration test for request creation).

**"Why Supabase instead of your own PostgreSQL server?"**
It bundles managed Postgres with built-in Auth, so authentication didn't need to
be built from scratch — and the service-role vs. publishable key split maps
cleanly onto "server has full access, browser only authenticates."

**"Why hasn't this been deployed to the cloud?"**
Time allocation — the working prototype and its test coverage were prioritised
first. It's an explicit, disclosed next step (Q4.3), not something overlooked.

### Emerging technology (ML)

**"How do you know R² = 0.9711 isn't overfitting?"**
It's measured on a held-out test set (60,031 rows, 20%) the model never saw
during training (240,122 rows) — that's exactly what a train/test split is for.
Mean absolute error (₹2,060) is reported alongside it as a second, independent
check.

**"Why only India's 6 metro cities? Isn't this supposed to be for a different
market?"**
The dataset (Kaggle "Flight Price Prediction") is real, public, and large enough
to train on properly — 300,000+ rows. Rather than train on a smaller or
synthetic South-African dataset that would be less trustworthy, the honest
choice was to constrain the app's inputs to exactly what the model was actually
trained on, so every prediction is genuinely meaningful instead of silently
degrading for unseen cities. That's disclosed directly in the report, not hidden.

**"How often would you retrain this in production?"**
Periodically as fare patterns drift — flight pricing isn't static. The training
script (`train.py`) is a single command and versions each model with a
timestamp, so retraining and rollback are both straightforward.

### Policy engine

**"How does a policy's condition actually work?"**
Each rule has a `condition` string: `"*"` (applies to everyone), `"class=Economy"`,
or `"destination=Mumbai"`. An option is checked against every *active* rule whose
condition matches the request, plus the employee's own declared budget — all
violations are collected and named, not just a single pass/fail flag.

**"What if multiple rules apply to the same option?"**
All of them are evaluated and every violation is listed by name (e.g. "Economy
class cap; Mumbai route cap") — tested directly, including the case where a
single option breaks two rules at once.

### Security & reliability

**"Is role-based access control enforced server-side, or just hidden in the UI?"**
Server-side, on every route — `requireRole()` middleware checks the caller's
real role from the database before the handler runs. Hiding a button in the UI
proves nothing; there's a 403 test for every role boundary (e.g. an employee
calling `/api/approvals` gets rejected, not just visually blocked).

**"Can a supervisor approve their own request, or score someone else's by
accident?"**
Scoring is restricted to the request's own owner or a supervisor; approval is
supervisor-only regardless of ownership. Ownership and role are both checked
against the verified JWT on every call, not trusted from the request body.

**"Tell me about a real security issue you had to deal with."**
A Supabase service-role key — which bypasses all access control — was
accidentally left in a committed `.env.example` file early in the project. It
was found, rotated in the Supabase dashboard, and verified rejected afterward
with a direct test against the old key before declaring it fixed. It's a real
example of catching and correcting a mistake, not something staged for this
answer.

### Testing

**"How many tests do you actually have, and what do they cover?"**
63 automated tests: 22 unit tests on the scoring/policy logic (pure functions,
no network), 32 integration tests that hit the real API and a real database
(auth, CRUD, scoring, approvals, policy management, reports, and the 12
database constraints), and 9 tests on the ML service itself. All 63 pass.

**"Why do the integration tests hit a real database instead of mocking it?"**
Mocking the database would only prove the code calls the right function names —
it wouldn't catch a real schema mismatch, a real constraint violation, or a real
RBAC bypass. Hitting the actual dev database catches real bugs; each test
creates its own throwaway data and cleans up afterward so nothing pollutes real
records.

### Data model

**"Why is Approval a separate table instead of columns on the request?"**
It matches the actual domain: a request can exist without ever being decided,
but a decision always belongs to exactly one request and one decider. Keeping
decision detail (who, which option, when, the comment) in its own table avoids
nullable columns sitting unused on every pending request, and let the audit log
reference decisions cleanly.

**"What happened to the old decided_by/decided_at columns — did you lose data?"**
Yes, honestly — two pre-existing approved requests from before that migration
lost their decision detail (who/when/which option) because the old columns were
dropped without a backfill. `status` itself survived since it was never dropped.
This is disclosed as a known, accepted, non-recoverable gap, not hidden — and
every decision made after the migration is fully captured, which the tests
confirm.

### Limitations

**"What's not done yet, and what would you do next?"**
Two things, both named explicitly in the report: cloud deployment (runs locally
today against a cloud database; Vercel + Render is the next step) and
independent user-acceptance testing (only test accounts have used it so far;
the next step is 3–5 outside testers against the NFR-02 target of 90% completing
a request unaided in under 3 minutes).
