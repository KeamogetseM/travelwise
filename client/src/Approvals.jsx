import { useEffect, useState } from "react";
import { getApprovals, scoreTravelRequest, approveTravelRequest, rejectTravelRequest } from "./api";
import Recommendation from "./Recommendation";

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
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div>
        <strong>{r.origin} → {r.destination}</strong> ({r.travel_class}) — {r.purpose || "no purpose"}
      </div>
      <div style={{ fontSize: 13, color: "#555", margin: "6px 0" }}>
        {r.requester_name || "unknown requester"} · Predicted: R{r.predicted_cost ?? "—"} · {r.start_date} to {r.end_date}
      </div>
      <div style={{ fontSize: 13 }}>
        {r.status === "approved" ? "✅ Approved" : "⚠️ Rejected"} by {r.decider_name || "unknown"} on{" "}
        {formatWhen(r.decided_at)}
      </div>
      {r.status === "approved" && selected && (
        <div style={{ fontSize: 13, marginTop: 6 }}>
          Selected: <strong>{selected.type}</strong> — R{selected.cost} · {selected.duration}h
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

  function load(status) {
    getApprovals(status)
      .then((data) => setRequests(data.requests))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load(tab);
  }, [tab]);

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
      await approveTravelRequest(id, option.id);
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
      await rejectTravelRequest(id);
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

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ fontWeight: tab === t.key ? 700 : 400 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {requests.length === 0 && !error && <p>No {tab} requests.</p>}

      {tab !== "pending"
        ? requests.map((r) => <DecidedCard key={r.id} r={r} />)
        : requests.map((r) => (
            <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{r.origin} → {r.destination}</strong> ({r.travel_class}) — {r.purpose || "no purpose"}
                  <div style={{ fontSize: 13, color: "#555" }}>
                    {r.requester_name || "unknown requester"} · Predicted: R{r.predicted_cost ?? "—"} · {r.start_date} to{" "}
                    {r.end_date}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {r.options.length === 0 && (
                    <button disabled={busyId === r.id} onClick={() => handleScore(r.id)}>
                      {busyId === r.id ? "Scoring…" : "Score options"}
                    </button>
                  )}
                  <button disabled={busyId === r.id} onClick={() => handleReject(r.id)}>
                    Reject
                  </button>
                </div>
              </div>

              {r.options.length > 0 && (
                <Recommendation
                  result={{ recommendation: r.options[0], options: r.options }}
                  busy={busyId === r.id}
                  onApprove={(option) => handleApprove(r.id, option)}
                />
              )}
            </div>
          ))}
    </div>
  );
}
