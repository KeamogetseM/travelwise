const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ImageRun, AlignmentType, ShadingType, PageBreak, VerticalAlign,
} = require("docx");

const DIAGRAMS = path.join(__dirname, "diagrams");
const TABLE_WIDTH = 9350;

function img(file, widthPx, captionText) {
  const buf = fs.readFileSync(path.join(DIAGRAMS, file));
  const ratio = widthPx;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: "png", data: buf, transformation: { width: ratio, height: Math.round(ratio * 0.72) } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: captionText, italics: true, size: 20 })],
      spacing: { after: 240 },
    }),
  ];
}

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } });
}
function p(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 160 } });
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}

const cellBorder = { style: BorderStyle.SINGLE, size: 2, color: "999999" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function cell(text, opts = {}) {
  const { header = false, width, bold = false } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "1F4E79" } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders,
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text), bold: header || bold, color: header ? "FFFFFF" : "000000", size: 19 })],
      }),
    ],
  });
}

function table(headers, rows, widths) {
  const colWidths = widths || headers.map(() => Math.floor(TABLE_WIDTH / headers.length));
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((hd, i) => cell(hd, { header: true, width: colWidths[i] })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, { width: colWidths[i] })) })),
    ],
  });
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const titlePage = [
  new Paragraph({ text: "Assignment 3 ISJ107V", alignment: AlignmentType.RIGHT, spacing: { after: 400 } }),
  new Paragraph({ text: "Integrated Software Project", heading: HeadingLevel.TITLE }),
  new Paragraph({ text: "Assignment 3", heading: HeadingLevel.HEADING_1 }),
  new Paragraph({ text: "Project Documentation and UML Design", spacing: { after: 300 } }),
  new Paragraph({ text: "TravelWise – An AI-Assisted Enterprise Travel Decision and Policy Optimization System", heading: HeadingLevel.HEADING_2, spacing: { after: 300 } }),
  table(
    ["Assessment information", "Details"],
    [
      ["Module code", "ISJ107V"],
      ["Student", "GK Mokoena (218610056)"],
      ["Document version", "1.0"],
      ["Date", "2026-09-29"],
      ["Repository", "TravelWise (client / server / ml-service)"],
    ],
    [3200, 6150]
  ),
  new Paragraph({ children: [new PageBreak()] }),
];

// --- Question 1 --------------------------------------------------------
const q1 = [
  h1("Question 1 — Final Project Baseline"),

  h2("1.1 Title, purpose, users, emerging technology, executive summary"),
  p("Title: TravelWise – An AI-Assisted Enterprise Travel Decision and Policy Optimization System."),
  p("Purpose: TravelWise streamlines how employees request, evaluate and obtain approval for work travel. A submitted request is automatically costed by a trained machine-learning model, scored against a weighted policy/cost/time model, and routed to a supervisor for a decision."),
  p("Intended users: Employee (submits requests), Supervisor (reviews and approves/rejects), Administrator (role exists and is enforced by the system, but has no implemented functionality yet — see 5.4 Limitations)."),
  p("Emerging technology: a Random Forest Regressor (scikit-learn), trained on a real, historical, third-party dataset (Kaggle \"Flight Price Prediction\", 300,154 records), served as an independent Python/Flask microservice with a POST /predict-cost endpoint."),
  p("Executive summary: the implemented system is a genuine three-tier application — a React SPA, a Node/Express REST API, and a Python ML microservice, backed by Supabase (PostgreSQL + Auth). Every core workflow step described in Assignment 2 is implemented and has been verified with real, reproducible test runs: authentication, request submission, ML-based cost prediction (with a real measured R² of 0.9658), a genuine multi-rule policy engine, rule-based option generation and scoring, and a full supervisor approval/rejection flow with an audit trail on the request itself. The two most significant gaps against the original proposal are that the system has not been deployed to the cloud (it runs as three local processes against a cloud-hosted Supabase database) and that approvals and audit logging are simplified into fields on existing tables rather than the separate Approval/AuditLog entities originally modelled. Both are disclosed and discussed in 5.4."),

  h2("1.2 Final aim, objectives, scope, and changes since Assignment 2"),
  p("Aim (unchanged): to develop a web-based system that uses machine learning to predict travel costs and produce explainable, policy-compliant travel recommendations, thereby reducing approval time and improving cost control."),
  p("Final measurable objectives and their outcome:"),
  bullet("Train a Random Forest cost-prediction model achieving R² ≥ 0.85 on held-out test data — ACHIEVED (R² = 0.9658 on a 60,031-row held-out test set; see 5.2)."),
  bullet("Reduce simulated approval turnaround time by at least 25% versus a manual baseline — NOT FORMALLY MEASURED. No timed manual baseline was established; this objective is reported as not evaluated rather than achieved."),
  bullet("Automatically evaluate each request against 100% of defined policy rules and generate at least three scored alternative options per request — ACHIEVED. Option generation and scoring produce exactly three ranked options for every request. Policy validation evaluates every active row in the policies table that applies to a request (a class-based cap, a destination-based cap, and a global maximum fare were seeded as real rules), plus the traveller's own declared budget — not a single hardcoded check. The current limitation is scale, not mechanism: only 4 rules are seeded, and there is no admin UI to manage them yet (see 5.4)."),
  p("Scope boundaries (unchanged from Assignment 2): in scope — authentication, travel-request submission, ML-based cost prediction, policy validation, option scoring and recommendation, approval workflow. Out of scope — real booking and payment processing, live airline/GDS integration, and payroll/HR integration; travel options remain simulated."),
  p("Implementation adjustments made since Assignment 2 (flagged here for lecturer review — these are pragmatic engineering decisions made to keep the emerging-technology integration genuinely meaningful, not previously pre-approved changes):"),
  bullet("Origin, destination and travel class are now constrained to the 6 Indian metro cities and 2 classes present in the training dataset, rather than accepting free text. Predicting a cost for a city the model has never seen would silently degrade to a meaningless generic estimate; constraining the input keeps every prediction genuinely meaningful and honestly evaluable."),
  bullet("Predicted and displayed costs are in INR (the training dataset's native currency), not ZAR. This is a direct consequence of using a real, publicly available dataset rather than a South African one; it is disclosed rather than silently converted with a fabricated exchange rate."),
  bullet("The Approval and AuditLog entities from the Assignment 2 class diagram were simplified into additional columns on TravelRequest (predicted_cost, selected_option_id, decided_by, decided_at) rather than built as separate tables. Policy, by contrast, was built as designed — a real table, genuinely queried and evaluated against every option (see 4.2)."),

  h2("1.3 Document control"),
  table(
    ["Field", "Value"],
    [
      ["Version", "1.0"],
      ["Date", "2026-09-29"],
      ["Author", "GK Mokoena (218610056)"],
      ["Module", "ISJ107V — Integrated Software Project, S2 2026"],
    ],
    [3200, 6150]
  ),
  new Paragraph({ text: "", spacing: { after: 160 } }),
  p("Revision history:", { bold: true }),
  table(
    ["Version", "Date", "Change"],
    [
      ["0.1", "2026-09-18", "Assignment 2 proposal accepted as project baseline"],
      ["0.5", "2026-09-28", "ML microservice built and integrated; roles aligned to Employee/Supervisor/Administrator"],
      ["1.0", "2026-09-29", "Assignment 3 documentation finalised against the implemented system"],
    ],
    [1800, 1800, 5750]
  ),
  new Paragraph({ text: "", spacing: { after: 160 } }),
  p("Glossary:", { bold: true }),
  bullet("FR / NFR / ETR — Functional / Non-Functional / Emerging-Technology Requirement"),
  bullet("R² (coefficient of determination) — proportion of variance in actual cost explained by the model's predictions; 1.0 is a perfect fit"),
  bullet("MAE — Mean Absolute Error, the average absolute difference between predicted and actual cost"),
  bullet("RLS — Row-Level Security (a PostgreSQL/Supabase feature; see 4.2 for how TravelWise achieves equivalent access control)"),
  bullet("JWT — JSON Web Token, used by Supabase Auth for session tokens"),
  p("Referenced project artefacts:", { bold: true }),
  bullet("Assignment 2 — Formal System Proposal and Specification (project baseline)"),
  bullet("Kaggle dataset: \"Flight Price Prediction\" by Shubham Bathwal — https://www.kaggle.com/datasets/shubhambathwal/flight-price-prediction"),
  bullet("Repository structure: client/ (React), server/ (Node/Express), ml-service/ (Python/Flask)"),

  new Paragraph({ children: [new PageBreak()] }),
];

module.exports = { titlePage, q1, h1, h2, p, bullet, table, img, cell, TABLE_WIDTH, Paragraph, TextRun, PageBreak, AlignmentType };
