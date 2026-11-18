import { useEffect, useState } from "react";
import { getReports } from "./api";

function formatWhen(iso) {
  return iso ? new Date(iso).toLocaleString() : "";
}

const ACTION_VARIANT = { Submitted: "badge-warning", Approved: "badge-success", Rejected: "badge-danger" };

export default function Activity() {
  const [recentActivity, setRecentActivity] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReports()
      .then((data) => setRecentActivity(data.recent_activity))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error-text">Error: {error}</p>;
  if (!recentActivity) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Recent activity</h1>
          <p className="subtitle">Every submit, approve and reject across the company, most recent first.</p>
        </div>
      </div>

      <div className="card">
        {recentActivity.length === 0 && <p className="muted">No activity recorded yet.</p>}
        {recentActivity.length > 0 && (
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: "var(--color-surface, #fff)" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", borderBottom: "2px solid #e2e5ea", width: 140 }}>Action</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e2e5ea" }}>Details</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e2e5ea", width: 160 }}>Performed by</th>
                  <th style={{ textAlign: "left", padding: "8px 0 8px 12px", borderBottom: "2px solid #e2e5ea", width: 180 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((a, i) => (
                  <tr key={i} style={{ borderBottom: i < recentActivity.length - 1 ? "1px solid #f0f1f3" : "none" }}>
                    <td style={{ padding: "10px 12px 10px 0" }}>
                      <span className={`badge ${ACTION_VARIANT[a.action] || "badge-neutral"}`}>{a.action}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{a.details}</td>
                    <td style={{ padding: "10px 12px" }} className="muted">{a.actor_name}</td>
                    <td style={{ padding: "10px 0 10px 12px" }} className="muted">{formatWhen(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
