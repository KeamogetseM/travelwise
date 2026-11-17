// Renders the scored options and the recommended one for a request.

function ScoreBar({ value }) {
  return (
    <div className="score-bar-track">
      <div className="score-bar-fill" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

const LABELS = { rail: "Rail + hotel", flight: "Flight + hotel", car: "Car + hotel" };

// onApprove: optional (option) => void — when given, renders an "Approve"
// button per card (used by the supervisor Approvals view; omitted for the
// requester's own read-only view). busy disables the buttons mid-request.
export default function Recommendation({ result, loading, onApprove, busy }) {
  if (loading) return <p className="muted">Scoring options…</p>;
  if (!result) return null;

  const { recommendation, options } = result;
  const anyCompliant = options.some((o) => o.compliant);

  return (
    <div style={{ marginTop: 14 }}>
      {!anyCompliant && (
        <div className="warning-banner">
          <span>⚠</span>
          <span>
            <strong>No option is within policy.</strong> Approving any of them is an exception.
          </span>
        </div>
      )}

      <div className="option-grid">
        {options.map((o, i) => {
          const isRecommended = recommendation && o.id === recommendation.id || (!recommendation?.id && i === 0);
          const label = LABELS[o.type?.toLowerCase?.()] || o.type;
          return (
            <div key={o.id ?? i} className={`option-card${isRecommended ? " recommended" : ""}`}>
              <div className="option-head">
                <div>
                  {isRecommended && <span className="badge badge-neutral" style={{ marginBottom: 6, display: "inline-block" }}>RECOMMENDED</span>}
                  <div style={{ fontWeight: 700 }}>{label}</div>
                </div>
                <div className="option-score">
                  {o.score.toFixed(2)}
                  <span className="label">score</span>
                </div>
              </div>

              <ScoreBar value={o.score} />

              <div className="option-metrics">
                <div>
                  <span className="muted">Cost</span>
                  <strong>R{o.cost}</strong>
                </div>
                <div>
                  <span className="muted">Travel time</span>
                  <strong>{o.duration}h</strong>
                </div>
              </div>

              {o.reason && <div className="muted" style={{ fontSize: 13 }}>{o.reason}</div>}

              <div className="option-flags">
                {o.compliant ? (
                  <span className="badge badge-success">Within policy</span>
                ) : (
                  (o.violations?.length ? o.violations : ["Policy violation"]).map((v, vi) => (
                    <span key={vi} className="badge badge-danger">{v}</span>
                  ))
                )}
              </div>

              {onApprove && (
                <button disabled={busy || !o.id} onClick={() => onApprove(o)} className={isRecommended ? "" : "secondary"}>
                  Approve {o.type?.toLowerCase?.() || ""}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
