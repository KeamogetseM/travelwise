// Renders the scored options and the recommended one for a request.

function Bar({ value }) {
  return (
    <div style={{ background: "#eee", borderRadius: 4, height: 8, width: 120, overflow: "hidden" }}>
      <div style={{ width: `${Math.round(value * 100)}%`, height: "100%", background: "#1F4E79" }} />
    </div>
  );
}

// onApprove: optional (option) => void — when given, renders an "Approve"
// button per row (used by the manager Approvals view; omitted for the
// requester's own read-only view). busy disables the buttons mid-request.
export default function Recommendation({ result, loading, onApprove, busy }) {
  if (loading) return <p>Scoring options…</p>;
  if (!result) return null;

  const { recommendation, options } = result;

  return (
    <div style={{ marginTop: 12 }}>
      {/* Recommended option highlighted */}
      <div style={{ border: "2px solid #1F4E79", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <strong>Recommended: {recommendation.type}</strong>
          <span style={{ fontSize: 22, fontWeight: 700 }}>{recommendation.score.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: 13, color: "#555", margin: "6px 0" }}>
          R{recommendation.cost} · {recommendation.duration}h ·{" "}
          {recommendation.compliant ? "✅ policy compliant" : "⚠️ over budget"}
        </div>
        <div style={{ fontSize: 13 }}>{recommendation.reason}</div>
      </div>

      {/* All options ranked */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 6 }}>Option</th>
            <th style={{ padding: 6 }}>Cost</th>
            <th style={{ padding: 6 }}>Time</th>
            <th style={{ padding: 6 }}>Policy</th>
            <th style={{ padding: 6 }}>Score</th>
            {onApprove && <th style={{ padding: 6 }} />}
          </tr>
        </thead>
        <tbody>
          {options.map((o, i) => (
            <tr key={o.id ?? i} style={{ borderBottom: "1px solid #f0f0f0", background: i === 0 ? "#f2f6fb" : "white" }}>
              <td style={{ padding: 6 }}>{o.type}</td>
              <td style={{ padding: 6 }}>R{o.cost}</td>
              <td style={{ padding: 6 }}>{o.duration}h</td>
              <td style={{ padding: 6 }}>{o.compliant ? "✅" : "⚠️"}</td>
              <td style={{ padding: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <Bar value={o.score} /> {o.score.toFixed(2)}
              </td>
              {onApprove && (
                <td style={{ padding: 6 }}>
                  <button disabled={busy || !o.id} onClick={() => onApprove(o)}>
                    Approve
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}