const fs = require("fs");
const path = require("path");
const { Document, Packer } = require("docx");
const { h1, h2, p, bullet, table, img, Paragraph, TextRun, PageBreak, AlignmentType } = require("./build_assignment3");

const titlePage = [
  new Paragraph({ text: "Assignment 4 ISJ107V", alignment: AlignmentType.RIGHT, spacing: { after: 400 } }),
  new Paragraph({ text: "Integrated Software Project", heading: "Title" }),
  new Paragraph({ text: "Assignment 4", heading: "Heading1" }),
  new Paragraph({ text: "Functional Prototype and Presentation", spacing: { after: 300 } }),
  new Paragraph({ text: "TravelWise – An AI-Assisted Enterprise Travel Decision and Policy Optimization System", heading: "Heading2", spacing: { after: 300 } }),
  table(["Assessment information", "Details"], [
    ["Module code", "ISJ107V"],
    ["Student", "GK Mokoena (218610056)"],
    ["Document version", "1.0"],
    ["Date", "2026-10-20"],
    ["Repository", "https://github.com/KeamogetseM/travelwise"],
  ], [3200, 6150]),
  new Paragraph({ children: [new PageBreak()] }),
];

const q1 = [
  h1("Question 1 — Prototype Scope and Readiness"),
  h2("1.1 Title, problem, users, purpose, emerging technology"),
  p("Title: TravelWise – An AI-Assisted Enterprise Travel Decision and Policy Optimization System."),
  p("Problem addressed: enterprises manage travel requests manually, with guessed cost estimates, inconsistently applied policy, and slow approvals with poor auditability."),
  p("Intended users: Employee (submits requests), Supervisor (reviews, scores, approves/rejects with comment), Administrator (manages policy rules, views reports)."),
  p("Prototype purpose: demonstrate the full request → ML cost prediction → policy-aware scoring → supervisor decision pipeline as a working, tested system, not a mockup."),
  p("Emerging technology: a Random Forest Regressor (scikit-learn), trained on the real Kaggle \"Flight Price Prediction\" dataset (300,153 rows), served as an independent Python/Flask microservice."),

  h2("1.2 Functional requirements demonstrated"),
  table(
    ["Requirement", "Status", "Prototype feature", "Test case", "Evidence"],
    [
      ["FR-01 Login/Auth", "Completed", "Auth.jsx, Supabase Auth", "TC-01", "Integration test + live demo"],
      ["FR-02 Submit request", "Completed", "RequestForm.jsx", "TC-02", "Integration test + live demo"],
      ["FR-03 Predict cost (ML)", "Completed", "ml-service /predict-cost", "PT-02", "R² = 0.9711 on held-out data"],
      ["FR-04 Generate ≥ 3 options", "Completed", "scoringEngine.generateOptions()", "TC-04", "Unit test, always 3 options"],
      ["FR-05 Policy validation", "Completed", "policies table + isCompliant()", "TC-13", "Real multi-rule evaluation, tested"],
      ["FR-06 Score + recommend", "Completed", "scoringEngine.scoreOptions()", "TC-04/06", "Unit test, ranked output"],
      ["FR-07 Route to supervisor", "Completed", "GET /api/approvals", "TC-07", "Integration test"],
      ["FR-08 Approve/reject + comment", "Completed", "approve/reject routes, Approvals.jsx", "TC-08/09", "Integration test, comment required on reject"],
      ["FR-09 Audit log", "Completed", "audit_log table, logAction()", "AuditLog test", "Real rows verified per action"],
      ["FR-10 Admin reports", "Completed", "GET /api/reports, Reports.jsx", "Reports test", "Real aggregate data verified"],
    ],
    [1650, 1150, 2400, 1150, 2000]
  ),
  p("All 10 functional requirements are fully implemented in the prototype, not partial or deferred — reflecting iterative work carried out after the original Assignment 2 proposal. The two items still deferred for the final system are cloud deployment and independent user-acceptance testing (see 4.3)."),

  h2("1.3 Setup and access"),
  p("Software: Node.js 18+, Python 3.10+, a Supabase project. Hardware: any modern laptop (CPU-only ML training/inference, no GPU required)."),
  p("Setup: see README-equivalent in each folder — ml-service/ (venv + requirements.txt, python train.py, python app.py on :8000), server/ (npm install, .env with Supabase keys, npm run dev on :5000), client/ (npm install, npm run dev on :5173)."),
  p("Test credentials: employee — bookmarkkeepersonlineschool@gmail.com / travel123; supervisor — dev478670@gmail.com (password set by the student); administrator — admin-test@travelwise.test / travel123."),
  p("Repository: https://github.com/KeamogetseM/travelwise (branch: main)."),
  new Paragraph({ children: [new PageBreak()] }),
];

const q2 = [
  h1("Question 2 — Working Prototype"),
  h2("2.1 End-to-end workflow"),
  p("The demonstrated workflow: an Employee signs in, submits a travel request (origin/destination constrained to the 6 cities the ML model was trained on, via dropdowns — input validation at the form level, plus server-side and database-level CHECK constraints as a second layer). On submission, the Node API calls the ML service for a predicted cost (non-fatal on failure — the request still saves and scoring falls back to the employee's own estimate). The employee sees the prediction immediately in their request list, navigable via the new sidebar. A Supervisor opens Approvals, scores the request (generating 3 ranked, policy-checked options), and approves one option or rejects with a required comment. The employee then sees the decision and comment on their own list. Every step along the way surfaces errors as readable messages (e.g. “A comment explaining the rejection is required”), not raw stack traces."),

  h2("2.2 Emerging-technology integration"),
  p("The Random Forest model receives real input (origin, destination, days-to-departure, travel class) from the Node backend immediately after a request is created, and returns a predicted cost that is stored on the request and used as the baseline for option generation and scoring — an observable result that materially changes what the system recommends, not a cosmetic add-on."),
  p(`Measured on a genuine 60,031-row held-out test set: R² = 0.9711, MAE = ₹2,060.37, trained on 240,122 rows (300,153 total, 80/20 split, versioned model artifact).`),

  h2("2.3 Persistent, realistic data"),
  p("Operational data is stored in Supabase (PostgreSQL + Auth) across 6 tables: profiles, travel_requests, travel_options, policies, approvals, audit_log — all real, normalized tables, not flat/simplified columns. The ML model is trained on a real third-party dataset (Kaggle “Flight Price Prediction” by Shubham Bathwal, 300,153 EaseMyTrip bookings)."),

  h2("2.4 Security and reliability controls"),
  bullet("Role-based access control: every protected route requires a verified Supabase JWT; supervisor/administrator-only routes are explicitly role-gated (requireRole middleware) and tested for 403 on violation."),
  bullet("The database service-role key never reaches the browser — the client only holds the restricted publishable key; all privileged access happens server-side."),
  bullet("12 database-level CHECK constraints (status values, date ordering, city/class domain, non-negative costs, positive policy thresholds) back up application validation, verified by deliberately trying to violate each one."),
  bullet("Every significant action (create, score, approve, reject, policy change) is written to audit_log, non-fatally — a logging failure never blocks the underlying action."),
  bullet("A real leaked database secret key was discovered and rotated during development — a demonstrated, not just described, security practice."),
  new Paragraph({ children: [new PageBreak()] }),
];

const q3 = [
  h1("Question 3 — UML Models of the Prototype"),
  h2("3.1 Use-case diagram"),
  p("Updated to show Administrator's now-real functions (Manage Policies, View Reports) — both fully implemented, unlike at the Assignment 3 stage."),
  ...img("usecase.png", 5600, "Figure 1: Use-case diagram — TravelWise (Assignment 4)"),
  new Paragraph({ children: [new PageBreak()] }),
  h2("3.2 Activity diagram"),
  p("The demonstrated end-to-end workflow, including the validation decision, the emerging-technology step, and the supervisor's approve/reject decision."),
  ...img("activity.png", 5200, "Figure 2: Activity diagram — end-to-end travel request workflow"),
  new Paragraph({ children: [new PageBreak()] }),
  h2("3.3 Class diagram"),
  p("Updated since Assignment 3: Approval and AuditLog are now real, separate classes/tables (previously simplified onto TravelRequest columns) — the normalization work is complete."),
  ...img("class.png", 5600, "Figure 3: Class diagram — TravelWise domain model (Assignment 4)"),
  new Paragraph({ children: [new PageBreak()] }),
  h2("3.4 Sequence diagram"),
  p("Interaction between the React UI, the Node API, the Cost Prediction Service, and the database for the core submit-and-predict transaction."),
  ...img("sequence.png", 5600, "Figure 4: Sequence diagram — submit a travel request and predict cost"),
  new Paragraph({ children: [new PageBreak()] }),
  h2("3.5 Component and deployment diagrams"),
  p("Component diagram shows the real module boundaries across all three source trees."),
  ...img("component.png", 5600, "Figure 5: Component diagram — TravelWise"),
  p("Deployment diagram shows the system's actual current execution environment. Important difference from the original design: this still runs as three local processes against a cloud-hosted Supabase instance, not the three-host Vercel/Render deployment originally targeted — deployment is the next planned step (see 4.3)."),
  ...img("deployment.png", 5000, "Figure 6: Deployment diagram — TravelWise (current, as-run state)"),
  new Paragraph({ children: [new PageBreak()] }),
];

const q4 = [
  h1("Question 4 — Evidence and Limitations"),
  h2("4.1 Representative test cases"),
  table(
    ["Test case", "Description", "Expected", "Actual", "Status"],
    [
      ["TC-02", "POST /travel-requests with no body", "400, required-fields error", "400, exact message returned", "Pass"],
      ["TC-03", "Create request on a real route (Delhi→Mumbai)", "predicted_cost populated", "predicted_cost = real model output (e.g. ₹5,474)", "Pass"],
      ["TC-10", "Employee calls GET /approvals", "403 Forbidden", "403, “Requires role: supervisor”", "Pass"],
      ["Reject validation", "Reject with no comment", "400, comment required", "400, exact message returned", "Pass"],
      ["PT-02", "Evaluate model on held-out test set", "R² ≥ 0.85 (ETR-01)", "R² = 0.9711", "Pass"],
      ["PT-03", "Time a /predict-cost call", "≤ 500ms (ETR-02)", "~144ms server-side inference", "Pass"],
      ["DB constraint", "Insert travel_request with destination outside the 6 trained cities", "Rejected at the database level", "Rejected — CHECK constraint violation", "Pass"],
    ],
    [1150, 2550, 1750, 2250, 800]
  ),
  p(`Full automated suite, re-run today (2026-10-20): 54/54 backend tests pass (22 unit, 32 integration against the real dev database), 9/9 ML-service tests pass. 63/63 total, 100% pass rate.`),

  h2("4.2 Quantitative measures"),
  bullet("Emerging-technology accuracy: R² = 0.9711 against the ETR target of ≥ 0.85 — 0.121 above target, measured on genuine held-out data, not estimated."),
  bullet("Automated test reliability: 63/63 tests passing (100%) across unit, integration and ML-service suites, with zero residual test data left behind after each run."),

  h2("4.3 Limitations and corrective actions"),
  bullet("1. No cloud deployment yet. The system runs as three local processes against a cloud database, not the three-host Vercel/Render target from Assignment 2. Corrective action: deployment is the next planned task, immediately following this submission."),
  bullet("2. No independent user-acceptance testing has been conducted — only the developer and test accounts have used the system. Corrective action: recruit 3–5 independent testers for the final system and measure the NFR-02 target (≥ 90% completing a request unaided in under 3 minutes)."),
  new Paragraph({ children: [new PageBreak()] }),
];

const doc = new Document({ sections: [{ properties: {}, children: [...titlePage, ...q1, ...q2, ...q3, ...q4] }] });
Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "ISJ107V_Assignment4_218610056.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Written to", outPath);
});
