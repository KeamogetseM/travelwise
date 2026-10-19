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

  return (
    <div>
      <h2>Reports</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Requests by status</h3>
        <div className="stat-row">
          <div>Pending<strong>{requests_by_status.pending}</strong></div>
          <div>Approved<strong>{requests_by_status.approved}</strong></div>
          <div>Rejected<strong>{requests_by_status.rejected}</strong></div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Approved spend</h3>
        <div className="stat-row">
          <div>Approved requests<strong>{spend.approved_count}</strong></div>
          <div>Total<strong>R{spend.total_approved}</strong></div>
          <div>Average<strong>R{spend.average_approved}</strong></div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Requests by destination</h3>
        <table>
          <tbody>
            {Object.entries(requests_by_destination).map(([city, count]) => (
              <tr key={city}>
                <td>{city}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Policy compliance (live snapshot)</h3>
        <div className="stat-row" style={{ marginBottom: 8 }}>
          <div>Compliant<strong>{policy_compliance.compliant}</strong></div>
          <div>Non-compliant<strong>{policy_compliance.non_compliant}</strong></div>
          <div>Total options scored<strong>{policy_compliance.total_options}</strong></div>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>{policy_compliance.note}</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent activity</h3>
        {recent_activity.length === 0 && <p className="muted">No activity recorded yet.</p>}
        {recent_activity.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {recent_activity.map((a, i) => (
                <tr key={i}>
                  <td className="muted">{formatWhen(a.created_at)}</td>
                  <td>{a.actor_name}</td>
                  <td>{a.action}</td>
                  <td className="muted">{a.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
