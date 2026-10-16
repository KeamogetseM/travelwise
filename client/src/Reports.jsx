import { useEffect, useState } from "react";
import { getReports } from "./api";

function formatWhen(iso) {
  return iso ? new Date(iso).toLocaleString() : "";
}

const card = { border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 16 };

export default function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReports()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;
  if (!data) return <p>Loading…</p>;

  const { requests_by_status, requests_by_destination, spend, policy_compliance, recent_activity } = data;

  return (
    <div>
      <h2>Reports</h2>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Requests by status</h3>
        <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
          <div>Pending: <strong>{requests_by_status.pending}</strong></div>
          <div>Approved: <strong>{requests_by_status.approved}</strong></div>
          <div>Rejected: <strong>{requests_by_status.rejected}</strong></div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Approved spend</h3>
        <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
          <div>Approved requests: <strong>{spend.approved_count}</strong></div>
          <div>Total: <strong>R{spend.total_approved}</strong></div>
          <div>Average: <strong>R{spend.average_approved}</strong></div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Requests by destination</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {Object.entries(requests_by_destination).map(([city, count]) => (
              <tr key={city} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 6 }}>{city}</td>
                <td style={{ padding: 6 }}>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Policy compliance (live snapshot)</h3>
        <div style={{ display: "flex", gap: 24, fontSize: 14, marginBottom: 8 }}>
          <div>Compliant: <strong>{policy_compliance.compliant}</strong></div>
          <div>Non-compliant: <strong>{policy_compliance.non_compliant}</strong></div>
          <div>Total options scored: <strong>{policy_compliance.total_options}</strong></div>
        </div>
        <p style={{ fontSize: 12, color: "#777", margin: 0 }}>{policy_compliance.note}</p>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Recent activity</h3>
        {recent_activity.length === 0 && <p>No activity recorded yet.</p>}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: 6 }}>When</th>
              <th style={{ padding: 6 }}>Who</th>
              <th style={{ padding: 6 }}>Action</th>
              <th style={{ padding: 6 }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {recent_activity.map((a, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 6 }}>{formatWhen(a.created_at)}</td>
                <td style={{ padding: 6 }}>{a.actor_name}</td>
                <td style={{ padding: 6 }}>{a.action}</td>
                <td style={{ padding: 6 }}>{a.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
