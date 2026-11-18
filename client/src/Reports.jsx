import { useEffect, useState } from "react";
import { getReports } from "./api";

export default function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReports()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error-text">Error: {error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const { requests_by_status, requests_by_destination, requests_by_class, spend, policy_compliance } = data;
  const maxDest = Math.max(1, ...Object.values(requests_by_destination));
  const maxClass = Math.max(1, ...Object.values(requests_by_class));
  const compliantPct = policy_compliance.total_options
    ? Math.round((policy_compliance.compliant / policy_compliance.total_options) * 100)
    : 0;

  function exportCsv() {
    const lines = [];
    lines.push("Section,Key,Value");
    for (const [status, count] of Object.entries(requests_by_status)) lines.push(`Requests by status,${status},${count}`);
    for (const [city, count] of Object.entries(requests_by_destination)) lines.push(`Requests by destination,${city},${count}`);
    for (const [cls, count] of Object.entries(requests_by_class)) lines.push(`Requests by class,${cls},${count}`);
    lines.push(`Spend,Total approved,${spend.total_approved}`);
    lines.push(`Spend,Average approved,${spend.average_approved}`);
    lines.push(`Policy compliance,Compliant,${policy_compliance.compliant}`);
    lines.push(`Policy compliance,Non-compliant,${policy_compliance.non_compliant}`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `travelwise-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">Requests, approved spend and policy compliance across the company.</p>
        </div>
        <button onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{requests_by_status.pending}</div>
          <span className="badge badge-warning">Awaiting supervisor</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{requests_by_status.approved}</div>
          <span className="badge badge-success">Booked</span>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value">{requests_by_status.rejected}</div>
          <span className="badge badge-danger">With comment</span>
        </div>
        <div className="stat-card dark">
          <div className="stat-label">Approved spend</div>
          <div className="stat-value">R{spend.total_approved}</div>
          <div className="muted" style={{ color: "var(--color-sidebar-text)" }}>Average R{spend.average_approved} per trip</div>
        </div>
      </div>

      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch" }}>
        <div className="card" style={{ margin: 0 }}>
          <h3>Requests by destination</h3>
          {Object.entries(requests_by_destination).map(([city, count]) => (
            <div key={city} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 80, fontSize: 13 }}>{city}</div>
              <div style={{ flex: 1 }} className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${(count / maxDest) * 100}%` }} />
              </div>
              <div style={{ width: 20, fontSize: 13, textAlign: "right" }}>{count}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ margin: 0 }}>
          <h3>Policy compliance</h3>
          <p className="muted">Live snapshot against today's active policies, across {policy_compliance.total_options} scored options.</p>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{compliantPct}% <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-muted)" }}>of options within policy</span></div>
          <div className="compliance-bar">
            <div style={{ width: `${compliantPct}%`, background: "var(--color-primary)" }} />
            <div style={{ width: `${100 - compliantPct}%`, background: "var(--color-accent)" }} />
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <span><span className="pill">■</span> Compliant <strong>{policy_compliance.compliant}</strong></span>
            <span><span className="pill">■</span> Non-compliant <strong>{policy_compliance.non_compliant}</strong></span>
          </div>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <h3>Requests by travel class</h3>
          {Object.entries(requests_by_class).map(([cls, count]) => (
            <div key={cls} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 80, fontSize: 13 }}>{cls}</div>
              <div style={{ flex: 1 }} className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${(count / maxClass) * 100}%` }} />
              </div>
              <div style={{ width: 20, fontSize: 13, textAlign: "right" }}>{count}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ margin: 0 }}>
          <h3>Spend summary</h3>
          <p className="muted">Based on {spend.approved_count} approved trip{spend.approved_count === 1 ? "" : "s"}.</p>
          <div style={{ fontSize: 34, fontWeight: 700 }}>R{spend.total_approved}</div>
          <div className="muted" style={{ marginTop: 4 }}>Average R{spend.average_approved} per approved trip</div>
        </div>
      </div>
    </div>
  );
}
