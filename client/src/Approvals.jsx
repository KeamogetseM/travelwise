import { useEffect, useState } from "react";
import { getApprovals, scoreTravelRequest, approveTravelRequest, rejectTravelRequest } from "./api";
import Recommendation from "./Recommendation";
import StatusBadge from "./StatusBadge";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function formatWhen(iso) {
  return iso ? new Date(iso).toLocaleString() : "";
}

// Read-only summary card for an already-decided request.
function DecidedCard({ r }) {
  const selected = r.options.find((o) => o.id === r.selected_option_id);

  return (
    <div className="card">
      <div className="card-row">
        <span>
          <strong>{r.origin} → {r.destination}</strong> ({r.travel_class}) — {r.purpose || "no purpose"}
        </span>
        <StatusBadge status={r.status} />
      </div>
      <div className="muted" style={{ margin: "6px 0" }}>
        {r.requester_name || "unknown requester"} · Predicted: R{r.predicted_cost ?? "—"} · {r.start_date} to {r.end_date}
      </div>
      <div className="muted">
        Decided by {r.decider_name || "unknown"} on {formatWhen(r.decided_at)}
      </div>
      {r.status === "approved" && selected && (
        <div style={{ fontSize: 13, marginTop: 6 }}>
          Selected: <strong>{selected.type}</strong> — R{selected.cost} · {selected.duration}h
        </div>
      )}
      {r.decision_comment && (
        <div className="muted" style={{ marginTop: 6, fontStyle: "italic" }}>
          “{r.decision_comment}”
        </div>
      )}
    </div>
  );
}

// Supervisor view: pending requests across all users (score, then approve
// one option or reject), plus tabs to review past approve/reject decisions.
export default function Approvals() {
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null); // request currently being acted on
  const [comments, setComments] = useState({}); // request id -> draft comment text

  function load(status) {
    getApprovals(status)
      .then((data) => setRequests(data.requests))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load(tab);
  }, [tab]);

  function setComment(id, value) {
    setComments((c) => ({ ...c, [id]: value }));
  }

  async function handleScore(id) {
    setError(null);
    setBusyId(id);
    try {
      const data = await scoreTravelRequest(id);
      setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, options: data.options } : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(id, option) {
    setError(null);
    setBusyId(id);
    try {
      await approveTravelRequest(id, option.id, comments[id]);
      setRequests((rs) => rs.filter((r) => r.id !== id)); // no longer pending
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setError(null);
    setBusyId(id);
    try {
      await rejectTravelRequest(id, comments[id]);
      setRequests((rs) => rs.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2>Approvals</h2>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`link-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="error-text">Error: {error}</p>}
      {requests.length === 0 && !error && <p className="muted">No {tab} requests.</p>}

      {tab !== "pending"
        ? requests.map((r) => <DecidedCard key={r.id} r={r} />)
        : requests.map((r) => {
            const comment = comments[r.id] || "";
            return (
              <div key={r.id} className="card">
                <div className="card-row">
                  <div>
                    <strong>{r.origin} → {r.destination}</strong> ({r.travel_class}) — {r.purpose || "no purpose"}
                    <div className="muted" style={{ marginTop: 4 }}>
                      {r.requester_name || "unknown requester"} · Predicted: R{r.predicted_cost ?? "—"} · {r.start_date} to{" "}
                      {r.end_date}
                    </div>
                  </div>
                  {r.options.length === 0 && (
                    <button disabled={busyId === r.id} onClick={() => handleScore(r.id)}>
                      {busyId === r.id ? "Scoring…" : "Score options"}
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Comment (required to reject, optional to approve)"
                  value={comment}
                  onChange={(e) => setComment(r.id, e.target.value)}
                  style={{ margin: "12px 0 0" }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button className="danger" disabled={busyId === r.id || !comment.trim()} onClick={() => handleReject(r.id)}>
                    Reject
                  </button>
                </div>

                {r.options.length > 0 && (
                  <Recommendation
                    result={{ recommendation: r.options[0], options: r.options }}
                    busy={busyId === r.id}
                    onApprove={(option) => handleApprove(r.id, option)}
                  />
                )}
              </div>
            );
          })}
    </div>
  );
}
