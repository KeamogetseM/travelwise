const { h1, h2, p, bullet, table, img, Paragraph, TextRun, PageBreak, AlignmentType } = require("./build_assignment3");

function screenshotPlaceholder(instruction) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    shading: { type: "clear", color: "auto", fill: "FFF3CD" },
    children: [new TextRun({ text: `[INSERT SCREENSHOT: ${instruction}]`, bold: true, italics: true, size: 20 })],
    spacing: { before: 120, after: 240 },
    border: { top: { style: "single", size: 4, color: "D4A017" }, bottom: { style: "single", size: 4, color: "D4A017" }, left: { style: "single", size: 4, color: "D4A017" }, right: { style: "single", size: 4, color: "D4A017" } },
  });
}

const dataDictRows = [
  ["profiles", "id", "uuid (PK)", "= auth.users.id", "Unique user identifier"],
  ["profiles", "name", "text", "not null (default: email prefix)", "Display name"],
  ["profiles", "role", "text", "CHECK IN (employee, supervisor, administrator)", "Access-control role"],
  ["profiles", "created_at", "timestamptz", "default now()", "Row creation time"],
  ["travel_requests", "id", "uuid (PK)", "default gen_random_uuid()", "Unique request identifier"],
  ["travel_requests", "user_id", "uuid (FK → profiles.id)", "not null", "Requesting employee"],
  ["travel_requests", "origin", "text", "one of 6 supported cities (app-level)", "Departure city"],
  ["travel_requests", "destination", "text", "one of 6 supported cities (app-level)", "Arrival city"],
  ["travel_requests", "travel_class", "text", "Economy or Business (app-level)", "Fare class"],
  ["travel_requests", "purpose", "text", "optional", "Free-text reason for travel"],
  ["travel_requests", "start_date / end_date", "date", "not null (app-level: end ≥ start not yet enforced)", "Trip date range"],
  ["travel_requests", "estimated_cost", "numeric", "optional, ≥ 0 (app-level)", "Employee's own cost guess"],
  ["travel_requests", "predicted_cost", "numeric", "nullable (null if ML unavailable)", "ML-predicted cost"],
  ["travel_requests", "status", "text", "pending / approved / rejected (app-level; no DB CHECK yet)", "Workflow state"],
  ["travel_requests", "selected_option_id", "uuid (FK → travel_options.id)", "nullable", "Option chosen on approval"],
  ["travel_requests", "decided_by / decided_at", "uuid (FK→profiles.id) / timestamptz", "nullable", "Who/when decided"],
  ["travel_options", "id", "uuid (PK)", "default gen_random_uuid()", "Unique option identifier"],
  ["travel_options", "request_id", "uuid (FK → travel_requests.id)", "not null", "Parent request"],
  ["travel_options", "type / cost / duration / score", "text / numeric / numeric / numeric", "not null", "Generated option and its score"],
  ["policies", "id", "uuid (PK)", "default gen_random_uuid()", "Unique policy rule identifier"],
  ["policies", "rule", "text", "not null", "Human-readable rule name shown to users"],
  ["policies", "condition", "text", "not null; \"class=X\", \"destination=Y\", or \"*\"", "Which requests this rule applies to"],
  ["policies", "threshold", "numeric", "not null", "Maximum allowed option cost under this rule"],
  ["policies", "active", "boolean", "not null, default true", "Whether this rule is currently enforced"],
];

const q4 = [
  h1("Question 4 — Implementation Documentation"),

  h2("4.1 Technology stack, project structure, and modules"),
  table(
    ["Layer", "Technology", "Status"],
    [
      ["UI", "React 19 (Vite)", "Implemented"],
      ["Application API", "Node.js / Express 5", "Implemented"],
      ["Machine learning", "Python 3.13, scikit-learn 1.9, Flask 3.1", "Implemented"],
      ["Database / Auth", "Supabase (PostgreSQL + Auth)", "Implemented"],
      ["Dataset", "Kaggle “Flight Price Prediction” (300,154 rows)", "Implemented"],
      ["Deployment", "Local processes only (Vercel/Render targeted, not done)", "Not met — see 5.4"],
    ],
    [2600, 4800, 1950]
  ),
  new Paragraph({ text: "", spacing: { after: 160 } }),
  p("Project structure:", { bold: true }),
  bullet("client/ — React app. Key modules: App.jsx (session + routing between “My requests” and “Approvals”), Auth.jsx (sign up/in), RequestForm.jsx (request submission form), Approvals.jsx (supervisor queue), Recommendation.jsx (shared scored-options table), api.js (typed fetch wrapper), supabaseClient.js (Auth session only)."),
  bullet("server/ — Express API. index.js (all routes + requireAuth/requireRole middleware), scoringEngine.js (option generation, scoring, policy stub, hydrate()), mlClient.js (HTTP client for the ML service), supabaseClient.js (service-role DB client)."),
  bullet("ml-service/ — Python microservice. train.py (offline training + evaluation), build_route_lookup.py (per-route median duration lookup), app.py (Flask API: /predict-cost, /health, /meta), model/ (model.joblib, metrics.json, route_durations.json — generated artifacts, not hand-written)."),
  p("Selected interface screenshots:", { bold: true }),
  screenshotPlaceholder("the sign-in/sign-up screen (Auth.jsx)"),
  screenshotPlaceholder("the employee's “My requests” view after submitting a request, showing the predicted cost"),
  screenshotPlaceholder("the supervisor's Approvals view with a scored request ready to approve"),

  new Paragraph({ children: [new PageBreak()] }),

  h2("4.2 Database and dataset documentation"),
  p("Entity-relationship diagram (operational database — Supabase/PostgreSQL):"),
  ...img("er.png", 5400, "Figure 8: Entity-relationship diagram — TravelWise"),
  p("Data dictionary:", { bold: true }),
  table(["Table", "Column", "Type", "Constraint", "Description"], dataDictRows, [1550, 1900, 1900, 2400, 1600]),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  p("Validation rules: destination, start_date and end_date are required server-side (400 if missing); origin ≠ destination is enforced client-side; profiles.role is restricted by a database CHECK constraint to employee/supervisor/administrator. travel_requests.status and the date-range ordering (end ≥ start) are currently enforced only by application convention, not a database constraint — flagged as a gap in 5.4."),
  p("Privacy controls: passwords are hashed and managed entirely by Supabase Auth (never touched by application code). The database's service-role key (which bypasses row-level security) is held only in the server's .env and never sent to the browser — the client only ever holds the restricted “publishable” key, used solely for authentication. Every data-access route re-derives the caller's identity from their verified JWT and scopes queries to req.user.id (or to role = supervisor for the approvals queue), which is the application-level equivalent of PostgreSQL row-level security. A leaked legacy service-role key was discovered and rotated during development (see 5.4) — direct evidence of this control being exercised, not just described."),
  p("Backup: the operational database relies on Supabase's managed automatic backups for its plan tier; no separate backup/restore procedure has been implemented or tested by this project, and restore has not been rehearsed — flagged in 5.4."),
  p("Training dataset: Kaggle “Flight Price Prediction” by Shubham Bathwal (https://www.kaggle.com/datasets/shubhambathwal/flight-price-prediction) — 300,154 EaseMyTrip flight-booking records across India's 6 metro cities, collected Feb–Mar 2022. It is used only for offline model training (ml-service/train.py); it is not queried at request time and contains no TravelWise user data."),

  new Paragraph({ children: [new PageBreak()] }),

  h2("4.3 Main API and integration interfaces"),
  p("Application API (Node/Express, base /api, Bearer JWT auth on all routes except health/db-check):", { bold: true }),
  table(
    ["Method & path", "Auth", "Input", "Output", "Errors"],
    [
      ["POST /travel-requests", "Any signed-in user", "origin, destination, travel_class, purpose, start_date, end_date, estimated_cost", "201: created request (incl. predicted_cost if ML reachable)", "400 missing required fields; 401 no/invalid token"],
      ["GET /travel-requests", "Any signed-in user", "—", "200: caller's own requests, newest first", "401 no/invalid token"],
      ["POST /travel-requests/:id/score", "Owner or supervisor", "—", "200: recommendation + ranked options, each with compliant/violations[] from evaluating all active policies", "404 not found/not owner-or-supervisor"],
      ["GET /approvals?status=", "supervisor only", "status = pending│approved│rejected", "200: matching requests + requester/decider names + options (incl. compliant/violations[])", "403 wrong role"],
      ["POST /travel-requests/:id/approve", "supervisor only", "option_id", "200: updated request (status=approved)", "400 not pending / option mismatch; 403 wrong role"],
      ["POST /travel-requests/:id/reject", "supervisor only", "—", "200: updated request (status=rejected)", "400 not pending; 403 wrong role"],
      ["GET /me", "Any signed-in user", "—", "200: own profile (id, name, role, email)", "401 no/invalid token"],
    ],
    [2100, 1300, 2200, 2200, 1550]
  ),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  p("Emerging-technology API (Python/Flask, base http://localhost:8000, no auth — internal-only, see 5.4):", { bold: true }),
  table(
    ["Method & path", "Input", "Output", "Errors"],
    [
      ["POST /predict-cost", "origin, destination, days_to_departure, travel_class (duration_hours optional — auto-derived if omitted)", "200: predicted_cost, model_version, currency, duration_hours, inference_ms", "400 missing required field or unknown category"],
      ["GET /health", "—", "200: status, model_version", "—"],
      ["GET /meta", "—", "200: supported cities[] and classes[]", "—"],
    ],
    [2650, 3300, 2100, 1300]
  ),

  new Paragraph({ children: [new PageBreak()] }),

  h2("4.4 Installation, configuration, and deployment"),
  p("Minimum / recommended hardware and software (unchanged from Assignment 2, with the addition of Python):", { bold: true }),
  table(
    ["Component", "Minimum", "Recommended"],
    [
      ["Processor", "Dual-core 2.0GHz", "Quad-core 2.5GHz+"],
      ["Memory", "4GB", "8GB+ (training benefits from more)"],
      ["Storage", "10GB free", "20GB SSD"],
      ["Software", "Node.js 18+, Python 3.10+, a Supabase project", "Node.js 22, Python 3.13"],
    ],
    [2200, 3500, 3650]
  ),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  p("Setup steps (local, as actually run during development):", { bold: true }),
  bullet("1. Database: create a Supabase project; run the SQL to create profiles, travel_requests, travel_options and the role/predicted-cost columns documented in 4.2."),
  bullet("2. ML service: cd ml-service; python -m venv venv; venv\\Scripts\\pip install -r requirements.txt; place the Kaggle CSV at ml-service/data/flight_prices.csv; run python train.py (produces model/model.joblib and metrics.json) then python build_route_lookup.py; start with venv\\Scripts\\python app.py (listens on :8000)."),
  bullet("3. Server: cd server; npm install; create .env with SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, PORT=5000; run npm run dev (listens on :5000, proxies to the ML service at :8000)."),
  bullet("4. Client: cd client; npm install; create .env with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY; run npm run dev (listens on :5173)."),
  p("Cloud deployment (Vercel for the client, Render for the server and ML service) was the original target but has not been carried out — see 5.4."),
];

module.exports = q4;
