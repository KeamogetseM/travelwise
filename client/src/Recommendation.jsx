// Renders the scored options and the recommended one for a request.

function Bar({ value }) {
  return (
    <div style={{ background: "var(--color-border)", borderRadius: 4, height: 8, width: 110, overflow: "hidden" }}>
      <div style={{ width: `${Math.round(value * 100)}%`, height: "100%", background: "var(--color-primary)" }} />
    </div>
  );
}

// onApprove: optional (option) => void — when given, renders an "Approve"
// button per row (used by the supervisor Approvals view; omitted for the
// requester's own read-only view). busy disables the buttons mid-request.
export default function Recommendation({ result, loading, onApprove, busy }) {
  if (loading) return <p className="muted">Scoring options…</p>;
  if (!result) return null;

  const { recommendation, options } = result;

  return (
    <div style={{ marginTop: 14 }}>
      {/* Recommended option highlighted */}
      <div
        style={{
          border: "1.5px solid var(--color-primary)",
          background: "var(--color-primary-light)",
          borderRadius: "var(--radius)",
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <strong>Recommended: {recommendation.type}</strong>
          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--color-primary)" }}>
            {recommendation.score.toFixed(2)}
          </span>
        </div>
        <div className="muted" style={{ margin: "6px 0" }}>
          R{recommendation.cost} · {recommendation.duration}h ·{" "}
          {recommendation.compliant ? (
            <span className="badge badge-success">compliant</span>
          ) : (
            <span className="badge badge-danger" title={recommendation.violations?.join("; ")}>
              {recommendation.violations?.join("; ") || "policy violation"}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13 }}>{recommendation.reason}</div>
      </div>

      {/* All options ranked */}
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Cost</th>
            <th>Time</th>
            <th>Policy</th>
            <th>Score</th>
            {onApprove && <th />}
          </tr>
        </thead>
        <tbody>
          {options.map((o, i) => (
            <tr key={o.id ?? i} style={{ background: i === 0 ? "var(--color-primary-light)" : "transparent" }}>
              <td>{o.type}</td>
              <td>R{o.cost}</td>
              <td>{o.duration}h</td>
              <td title={o.violations?.join("; ") || ""}>
                {o.compliant ? <span className="badge badge-success">✓</span> : <span className="badge badge-danger">✕</span>}
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bar value={o.score} /> {o.score.toFixed(2)}
                </div>
              </td>
              {onApprove && (
                <td>
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
