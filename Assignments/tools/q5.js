const { h1, h2, p, bullet, table, Paragraph, TextRun, PageBreak, AlignmentType } = require("./build_assignment3");

function screenshotPlaceholder(instruction) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    shading: { type: "clear", color: "auto", fill: "FFF3CD" },
    children: [new TextRun({ text: `[INSERT SCREENSHOT: ${instruction}]`, bold: true, italics: true, size: 20 })],
    spacing: { before: 120, after: 240 },
    border: { top: { style: "single", size: 4, color: "D4A017" }, bottom: { style: "single", size: 4, color: "D4A017" }, left: { style: "single", size: 4, color: "D4A017" }, right: { style: "single", size: 4, color: "D4A017" } },
  });
}

const testRows = [
  ["TC-01", "Integration", "Sign up, then sign in with a fresh account", "Session established, JWT issued", "Verified via scripted signInWithPassword() and via the live UI at localhost:5173", "Pass"],
  ["TC-02", "System", "POST /travel-requests with an empty body", "400, “destination, start_date and end_date are required”", "Actual: 400 with exact message", "Pass"],
  ["TC-03", "Integration", "POST /travel-requests with a real route (Delhi→Mumbai)", "predicted_cost populated from the ML service", "Actual: predicted_cost = 5474.03 (real model output)", "Pass"],
  ["TC-04", "Integration", "POST /travel-requests/:id/score", "≥ 3 ranked options returned", "Actual: 3 options (Rail+hotel, Flight+hotel, Car+hotel), ranked by score", "Pass"],
  ["TC-05", "Unit (manual)", "Option cost vs. request budget", "compliant = true/false correctly per option", "Actual: matched expected compliance flags in all runs", "Pass (rule is a stub — see 2.2)"],
  ["TC-06", "System", "Top-ranked option's justification text", "Non-empty, references cost/time/policy", "Actual: e.g. “Recommended because it is fully policy-compliant, the cheapest option, 10h slower than the fastest.”", "Pass"],
  ["TC-07", "Integration", "Supervisor GET /approvals after an employee submits", "New request appears with status=pending", "Actual: request present in the returned list", "Pass"],
  ["TC-08", "System", "Supervisor POST /approve with a valid option_id", "status=approved, selected_option_id/decided_by/decided_at set", "Actual: all four fields set correctly", "Pass"],
  ["TC-09", "System", "Supervisor POST /reject", "status=rejected, decided_by/decided_at set", "Actual: fields set, selected_option_id stays null", "Pass"],
  ["TC-10", "Security", "Employee calls GET /approvals", "403 Forbidden", "Actual: 403, “Requires role: supervisor”", "Pass"],
  ["TC-11", "Regression", "Score the same request twice", "travel_options has 3 rows, not 6", "Actual: 3 rows confirmed after 2 scoring calls", "Pass"],
  ["TC-12", "System", "Approve an already-approved request", "400, rejected as already decided", "Actual: 400, “Request is already approved”", "Pass"],
  ["TC-13", "System", "Score requests across 4 real route/class/lead-time combinations against 4 seeded policy rules", "Compliant/non-compliant correctly split, each violation naming the specific rule broken", "Actual: 1 compliant (advance Economy, ₹2,773), 3 non-compliant with correct named violations (e.g. “Economy class cap”, “Business class cap”); a request violating 2 rules simultaneously listed both by name", "Pass"],
  ["PT-01", "Performance", "5x POST /travel-requests, timed end-to-end", "≤ 3000ms (NFR-01)", "Actual: avg 1784ms, max 2721ms, min 1532ms (n=5)", "Pass"],
  ["PT-02", "Emerging tech", "Evaluate trained model on held-out test set", "R² ≥ 0.85 (ETR-01)", "Actual: R² = 0.9658 on 60,031 rows", "Pass"],
  ["PT-03", "Emerging tech", "Time a single /predict-cost call", "≤ 500ms (ETR-02)", "Actual: 144.4ms server-side; ~300ms full round-trip", "Pass"],
  ["PT-04", "Emerging tech", "Confirm dataset scale, split, artifact reload", "≥ 10,000 rows; artifact loads and predicts (ETR-03)", "Actual: 300,154 rows, 240,122/60,031 split, model.joblib reloaded and predicted successfully in the live service", "Pass"],
];

const q5 = [
  h1("Question 5 — Evaluation and Responsible Use"),

  h2("5.1 Test summary"),
  p("All test cases below were executed against the live, running system during development (manual and scripted integration/system tests). No automated unit-test suite (e.g. Jest, pytest) exists yet — this is disclosed as a limitation in 5.4 rather than misrepresented as covered."),
  table(["Test case", "Type", "Description", "Expected result", "Actual result", "Status"], testRows, [850, 1350, 2400, 1850, 2200, 700]),

  new Paragraph({ children: [new PageBreak()] }),

  h2("5.2 Quantitative evaluation"),
  p("NFR-01 — Performance (target: ≤ 3s end-to-end):", { bold: true }),
  p("Measured by timing 5 consecutive POST /api/travel-requests calls (each including a live call to the ML service): 2721ms, 1546ms, 1580ms, 1532ms, 1540ms — average 1784ms, maximum 2721ms. Result: PASS, though the first call in a batch runs noticeably closer to the 3s boundary than subsequent ones (likely connection-establishment overhead to the ML service), which is worth monitoring under real concurrent load."),
  p("NFR-04 — Security / RBAC (target: unauthorised attempts denied):", { bold: true }),
  p("All three supervisor-only endpoints (GET /approvals, POST /approve, POST /reject) were called with an employee-role token during testing. Result: 3/3 (100%) correctly returned 403 Forbidden. PASS on the access-control half of the requirement; the “and logged” half is not met, since no audit log records the denied attempt (see 5.4)."),
  p("ETR-01 — Emerging-technology accuracy (target: R² ≥ 0.85):", { bold: true }),
  p("R² = 0.9658 and MAE = ₹2,028.53, measured on a 60,031-row held-out test set (20% of 300,154 total rows), using scikit-learn's r2_score and mean_absolute_error against the trained pipeline's predictions. Result: PASS, 0.116 above target."),

  h2("5.3 User guide"),
  p("Employee — submitting a request:", { bold: true }),
  bullet("1. Open the app and sign in (or sign up, then sign in)."),
  bullet("2. Fill in the “New travel request” form: choose origin, destination and class from the dropdowns, enter dates and an optional cost estimate, then submit."),
  bullet("3. The request appears in “Travel requests” showing the ML-predicted cost (or your own estimate, if the prediction service was unavailable)."),
  screenshotPlaceholder("a filled-in request form immediately before submitting"),
  p("Supervisor — reviewing and deciding:", { bold: true }),
  bullet("1. Sign in with a supervisor account — an “Approvals” tab appears next to “My requests”."),
  bullet("2. Open Approvals (defaults to the Pending tab). Click “Score options” if a request hasn't been scored yet."),
  bullet("3. Review the ranked options and click “Approve” on one, or click “Reject”."),
  bullet("4. Check the Approved/Rejected tabs at any time to review past decisions."),
  screenshotPlaceholder("the Pending tab showing a scored request with its ranked options and Approve buttons"),
  p("Troubleshooting:", { bold: true }),
  bullet("“Missing authorization token” / “Invalid or expired session” — sign in again; the session has expired or was never established."),
  bullet("Predicted cost is missing on a new request — the ML service (ml-service/app.py) is not running on port 8000, or origin/destination/travel_class were not all provided; the request still saves, scoring falls back to your own estimate."),
  bullet("“Failed to execute 'json' on 'Response'” or every API call failing — the Node server is not running on port 5000, or, as encountered live during this project's development, the Supabase project has auto-paused after a period of inactivity (free tier). Resolution: open the Supabase dashboard and use “Restore/Resume project”, then flush local DNS cache if the hostname doesn't resolve immediately afterwards."),

  new Paragraph({ children: [new PageBreak()] }),

  h2("5.4 Limitations, risks, ethics, security, maintenance, and future improvements"),
  p("Current limitations:", { bold: true }),
  bullet("No cloud deployment — the system runs as three local processes against a cloud-hosted database, not the three-host Vercel/Render deployment originally proposed."),
  bullet("Approval and AuditLog are not separate entities — their state lives on TravelRequest columns rather than dedicated tables. Policy IS real and configurable (a class cap, a destination cap, and a global maximum fare are seeded and genuinely evaluated), but only 4 rules exist and there is no admin UI to add, edit or deactivate one — that requires a direct database insert (see 4.2)."),
  bullet("No automated test suite (Jest/pytest) — all evidence in 5.1 comes from manual and scripted integration/system testing performed during development, not a repeatable CI-run suite."),
  bullet("No comment field on approve/reject, despite FR-08's wording — a decision is recorded but no rationale text is captured."),
  bullet("No independent user-acceptance testing was conducted — NFR-02 is untested, not failed."),
  bullet("The model's domain (Indian metro-city flights, INR) differs from TravelWise's South African context; origin/destination are constrained to the 6 trained cities specifically to keep every prediction meaningful rather than silently wrong for unseen cities."),
  p("Unresolved risks:", { bold: true }),
  bullet("The ml-service's /predict-cost endpoint has no authentication of its own — it currently trusts that only the Node server can reach localhost:8000. In a real deployment this would need its own access control."),
  bullet("A free-tier Supabase project auto-pauses after inactivity, which took down the entire application during this project's own development on 2026-09-28 until manually resumed — a real operational risk for any environment relying on the free tier."),
  bullet("Database schema changes were applied ad hoc through the Supabase SQL editor rather than tracked migration files, making the schema's history harder to reconstruct or replay onto a new environment."),
  p("Ethical and security considerations:", { bold: true }),
  bullet("The training dataset is third-party, publicly licensed data scraped from a travel booking site (EaseMyTrip, via Kaggle) with proper attribution given (4.2); it contains no personal data about TravelWise's own users."),
  bullet("TravelWise's own data (destinations, dates, costs, employee identity) is business-personal data. It is protected by Supabase Auth (hashed credentials), a server-only service-role key, and per-request ownership/role checks equivalent to row-level security (4.2). A real leaked service-role key was found and rotated during this project (verified: the old key was confirmed rejected by Supabase after rotation) — a demonstrated, not just described, security practice."),
  bullet("Maintenance need: the model should be retrained periodically as fare patterns drift from the 2022 training window, and the ML service's uptime should be monitored independently of the Node API."),
  p("Two realistic future improvements:", { bold: true }),
  bullet("1. Give the Administrator role its first real feature: a UI over the policies table (list/add/edit/deactivate a rule), so policy management no longer requires a direct database insert, and add a per-option PolicyCheck record so a supervisor can see exactly which rule was evaluated and its outcome, not just the final compliant/violations summary."),
  bullet("2. Complete the three-host cloud deployment (React on Vercel, Node and the ML service on Render) with a proper tracked-migrations tool (e.g. the Supabase CLI) replacing ad hoc SQL editor changes, closing the deployment-related NFR-03/architecture gaps."),
];

module.exports = q5;
