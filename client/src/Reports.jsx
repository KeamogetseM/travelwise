import { useEffect, useState } from "react";
import { getReports } from "./api";

function formatWhen(iso) {
  return iso ? new Date(iso).toLocaleString() : "";
}

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

  const { requests_by_status, requests_by_destination, spend, policy_compliance, recent_activity } = data;
  const maxDest = Math.max(1, ...Object.values(requests_by_destination));
  const compliantPct = policy_compliance.total_options
    ? Math.round((policy_compliance.compliant / policy_compliance.total_options) * 100)
    : 0;

  const ACTION_VARIANT = { Submitted: "badge-warning", Approved: "badge-success", Rejected: "badge-danger" };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">Requests, approved spend and policy compliance across the company.</p>
        </div>
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
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent activity</h3>
        {recent_activity.length === 0 && <p className="muted">No activity recorded yet.</p>}
        {recent_activity.length > 0 && recent_activity.map((a, i) => (
          <div key={i} className="card-row" style={{ padding: "10px 0", borderBottom: i < recent_activity.length - 1 ? "1px solid #f0f1f3" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={`badge ${ACTION_VARIANT[a.action] || "badge-neutral"}`}>{a.action}</span>
              <span>{a.details}</span>
            </div>
            <span className="muted">{formatWhen(a.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
