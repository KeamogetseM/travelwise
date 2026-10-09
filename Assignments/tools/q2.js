const { h1, h2, p, bullet, table, Paragraph, PageBreak } = require("./build_assignment3");

const frRows = [
  ["FR-01", "Must", "Register/log in with secure credentials.", "Given valid credentials, authenticate and start a session."],
  ["FR-02", "Must", "Submit a request specifying origin, destination, class, dates, purpose.", "Given a logged-in employee, saved with status “pending”."],
  ["FR-03", "Must", "Use the trained ML model to predict estimated cost.", "Given a submitted request, a predicted cost from the Random Forest model is returned and stored."],
  ["FR-04", "Must", "Generate at least three candidate travel options.", "At least 3 options with cost, duration and type are produced."],
  ["FR-05", "Must", "Validate each option against all active policy rules.", "Each option is marked compliant/non-compliant against every active policy."],
  ["FR-06", "Must", "Score each option with a weighted model and flag the best.", "Highest-scoring option flagged recommended with a justification."],
  ["FR-07", "Must", "Route scored requests to the supervisor's queue.", "Request appears in the assigned supervisor's approvals queue."],
  ["FR-08", "Must", "Supervisor approves/rejects with a comment.", "Status updates and an approval record is created."],
  ["FR-09", "Should", "Record every significant action in an audit log.", "An audit entry (user, action, timestamp) is stored."],
  ["FR-10", "Should", "Administrator views reports on requests/spend/compliance.", "Aggregate metrics displayed on a reports page."],
];

const nfrRows = [
  ["NFR-01", "Performance", "Return a prediction + recommendation within 3s.", "End-to-end response time ≤ 3s."],
  ["NFR-02", "Usability", "First-time user submits a request unaided.", "≥ 90% of test users succeed unaided in < 3 min."],
  ["NFR-03", "Reliability", "No data loss; available during testing.", "No data loss; measured uptime ≥ 99%."],
  ["NFR-04", "Security", "RBAC restricts users to permitted functions/data.", "Unauthorised attempt denied and logged."],
];

const etrRows = [
  ["ETR-01", "Must", "Cost-prediction model achieves R² ≥ 0.85.", "Measured R² on the 20% test set is ≥ 0.85."],
  ["ETR-02", "Must", "Model returns a prediction within 500ms.", "Measured inference time ≤ 500ms."],
  ["ETR-03", "Must", "Trained on ≥ 10,000 records, documented 80/20 split, versioned artifact.", "Training set ≥ 10,000; split and version recorded; artifact reloads and predicts."],
];

const traceRows = [
  ["FR-01", "UC-01 (Login/Authenticate)", "client/Auth.jsx, server requireAuth middleware", "TC-01", "Pass"],
  ["FR-02", "UC-02 (Submit Travel Request)", "client/RequestForm.jsx, POST /api/travel-requests", "TC-02", "Pass"],
  ["FR-03", "UC-03 (Predict Travel Cost)", "server/mlClient.js, ml-service/app.py", "TC-03", "Pass"],
  ["FR-04", "UC-04 (Generate Travel Options)", "server/scoringEngine.js generateOptions()", "TC-04", "Pass"],
  ["FR-05", "Validate Policy Compliance (included use case)", "server/scoringEngine.js isCompliant(), policies table", "TC-05, TC-13", "Pass — evaluates every active policy row (class/destination/global rules), not a single hardcoded check"],
  ["FR-06", "UC-05 (Score and Recommend Options)", "server/scoringEngine.js scoreOptions()/explain()", "TC-06", "Pass"],
  ["FR-07", "Supervisor Approvals queue", "GET /api/approvals", "TC-07", "Pass"],
  ["FR-08", "UC-06 (Approve or Reject Request)", "POST /approve, POST /reject", "TC-08, TC-09", "Partial — approve/reject work; no comment field captured"],
  ["FR-09", "— (not modelled as a use case)", "travel_requests.decided_by / decided_at", "—", "Partial — decision-only audit trail, no general AuditLog"],
  ["FR-10", "—", "—", "—", "Not met — no admin reporting built"],
  ["NFR-01", "Deployment model / sequence diagram", "server/mlClient.js, ml-service/app.py", "PT-01", "Pass — avg 1784ms, max 2721ms (n=5)"],
  ["NFR-02", "—", "client/RequestForm.jsx", "—", "Not tested — no independent UAT conducted"],
  ["NFR-03", "Deployment diagram", "Supabase (managed)", "—", "Partial — no data loss observed; a real project auto-pause was encountered and resolved during development (see 5.4)"],
  ["NFR-04", "Class diagram (Profile.role)", "server requireRole() middleware", "TC-10", "Partial — RBAC enforced (403 verified); denied attempts are not logged"],
  ["ETR-01", "CostPredictionService class", "ml-service/train.py", "PT-02", "Pass — R² = 0.9658"],
  ["ETR-02", "CostPredictionService class", "ml-service/app.py", "PT-03", "Pass — ~144ms server-side inference"],
  ["ETR-03", "CostPredictionService class", "ml-service/train.py, model.joblib", "PT-04", "Pass — 300,154 rows, 240,122/60,031 split, versioned artifact"],
];

const q2 = [
  h1("Question 2 — Requirements Traceability"),

  h2("2.1 Final prioritised requirements"),
  p("Functional requirements (unchanged from Assignment 2 — restated here as the final baseline):"),
  table(["ID", "Priority", "Requirement", "Acceptance criterion"], frRows, [900, 900, 3800, 3750]),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  p("Non-functional requirements (FURPS+):"),
  table(["ID", "Category", "Requirement", "Acceptance criterion"], nfrRows, [900, 1400, 3550, 3500]),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  p("Emerging-technology requirements:"),
  table(["ID", "Priority", "Requirement", "Acceptance criterion"], etrRows, [900, 900, 3800, 3750]),

  new Paragraph({ children: [new PageBreak()] }),

  h2("2.2 Requirements traceability matrix"),
  p("Status is reported honestly against the actually implemented and tested system, not the original proposal. “Partial” entries are fully functional along one dimension of the requirement and explicitly incomplete along another (detailed in the cell); “Not met” entries have no corresponding implementation. See 5.4 for the reasoning behind each gap."),
  table(["Req.", "UML reference", "Module", "Test case", "Status"], traceRows, [750, 2450, 2450, 1000, 2700]),

  new Paragraph({ children: [new PageBreak()] }),

  h2("2.3 How the implemented system satisfies the three ETRs"),
  p("ETR-01 (R² ≥ 0.85): a RandomForestRegressor (scikit-learn, 200 estimators) was trained in ml-service/train.py on the Kaggle “Flight Price Prediction” dataset (source_city, destination_city, class, duration, days_left → price), split 80/20 with random_state=42. Evaluated on the 60,031-row held-out test set, the model achieved R² = 0.9658 and a mean absolute error of ₹2,028.53 — comfortably exceeding the 0.85 target. This is a measured result from a real run, not an estimate; see model/metrics.json in the repository and the reproduction steps in 4.4."),
  p("ETR-02 (≤ 500ms inference): the Flask service in ml-service/app.py times each /predict-cost call internally and returns it as inference_ms in the response. Repeated calls during testing measured approximately 144ms of pure model-inference time, and 290–305ms including full HTTP round-trip overhead — both well inside the 500ms target."),
  p("ETR-03 (≥ 10,000 records, documented split, versioned artifact): the training dataset contains 300,154 records after cleaning, split into 240,122 training rows and 60,031 test rows (an 80/20 split, fixed by random_state=42 for reproducibility). Each training run stamps a model_version (a UTC timestamp) into model/metrics.json alongside the dataset row counts, and serialises the fitted pipeline to model/model.joblib via joblib.dump(). The service loads and predicts from that exact artifact at startup — verified working end-to-end in the E2E tests in 5.1."),
];

module.exports = q2;
