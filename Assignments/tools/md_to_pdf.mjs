import { chromium } from "playwright";
import fs from "fs";

const md = fs.readFileSync(process.argv[2], "utf8");

// Minimal, purpose-built Markdown -> HTML (headings, bold, inline code, tables,
// bullet lists, horizontal rules) — enough for this one document.
function mdToHtml(src) {
  const lines = src.split("\n");
  let html = "";
  let inList = false;
  let inTable = false;
  let tableRows = [];

  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function flushTable() {
    if (!tableRows.length) return;
    const [header, , ...rows] = tableRows;
    html += "<table><thead><tr>" + header.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>";
    for (const r of rows) html += "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
    html += "</tbody></table>";
    tableRows = [];
    inTable = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      inTable = true;
      tableRows.push(trimmed.slice(1, -1).split("|").map((c) => c.trim()));
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (trimmed.startsWith("# ")) { html += `<h1>${inline(trimmed.slice(2))}</h1>`; continue; }
    if (trimmed.startsWith("## ")) { html += `<h2>${inline(trimmed.slice(3))}</h2>`; continue; }
    if (trimmed.startsWith("### ")) { html += `<h3>${inline(trimmed.slice(4))}</h3>`; continue; }
    if (trimmed.startsWith("- ")) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(trimmed.slice(2))}</li>`;
      continue;
    } else if (inList) {
      html += "</ul>";
      inList = false;
    }
    if (trimmed === "") { html += ""; continue; }
    html += `<p>${inline(trimmed)}</p>`;
  }
  if (inList) html += "</ul>";
  flushTable();
  return html;
}

const body = mdToHtml(md);
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1d23; max-width: 760px; margin: 0 auto; padding: 24px 0; font-size: 13px; line-height: 1.5; }
h1 { color: #16314A; font-size: 26px; border-bottom: 2px solid #16314A; padding-bottom: 8px; }
h2 { color: #16314A; font-size: 19px; margin-top: 28px; }
h3 { font-size: 15px; margin-bottom: 2px; }
strong { color: #16314A; }
code { background: #f0f1f3; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 12.5px; }
th, td { border: 1px solid #e2e5ea; padding: 6px 8px; text-align: left; }
th { background: #16314A; color: white; }
ul { margin: 4px 0 12px; padding-left: 22px; }
li { margin-bottom: 4px; }
p { margin: 4px 0; }
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.setContent(page, { waitUntil: "load" });
await pg.pdf({ path: process.argv[3], format: "A4", margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" } });
await browser.close();
console.log("written", process.argv[3]);
