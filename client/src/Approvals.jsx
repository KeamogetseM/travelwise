import { useEffect, useState } from "react";
import { getApprovals, scoreTravelRequest, approveTravelRequest, rejectTravelRequest } from "./api";
import Recommendation from "./Recommendation";

// Manager view: every pending request across all users, with the ability to
// score (if not already), then approve one option or reject outright.
export default function Approvals() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null); // request currently being acted on

  function load() {
    getApprovals()
      .then((data) => setRequests(data.requests))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

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
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {requests.length === 0 && !error && <p>No pending requests.</p>}

      {requests.map((r) => (
        <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{r.destination}</strong> — {r.purpose || "no purpose"}
              <div style={{ fontSize: 13, color: "#555" }}>
                {r.requester_name || "unknown requester"} · R{r.estimated_cost} · {r.start_date} to {r.end_date}
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
