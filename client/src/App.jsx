import { useEffect, useState } from "react";
import { getTravelRequests, scoreTravelRequest } from "./api";
import RequestForm from "./RequestForm";
import Recommendation from "./Recommendation";

export default function App() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);

  const [activeId, setActiveId] = useState(null);   // which request we scored
  const [result, setResult] = useState(null);       // the scoring result
  const [loading, setLoading] = useState(false);

  function loadRequests() {
    getTravelRequests()
      .then((data) => setRequests(data.requests))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleScore(id) {
    setActiveId(id);
    setResult(null);
    setLoading(true);
    try {
      const data = await scoreTravelRequest(id);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 700, margin: "40px auto", padding: "0 16px" }}>
      <h1>TravelWise</h1>

      <RequestForm onCreated={loadRequests} />

      <h2>Travel requests</h2>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {requests.length === 0 && !error && <p>No requests yet.</p>}

      {requests.map((r) => (
        <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{r.destination}</strong> — {r.purpose || "no purpose"}
              <div style={{ fontSize: 13, color: "#555" }}>
                R{r.estimated_cost} · {r.status}
              </div>
            </div>
            <button onClick={() => handleScore(r.id)}>Score options</button>
          </div>

          {activeId === r.id && <Recommendation result={result} loading={loading} />}
        </div>
      ))}
    </div>
  );
}