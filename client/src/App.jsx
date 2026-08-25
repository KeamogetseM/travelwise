import { useEffect, useState } from "react";
import { getTravelRequests, scoreTravelRequest, getMe } from "./api";
import { supabase } from "./supabaseClient";
import RequestForm from "./RequestForm";
import Recommendation from "./Recommendation";
import Approvals from "./Approvals";
import Auth from "./Auth";

export default function App() {
  // undefined = still checking for an existing session, null = signed out
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null); // { id, name, role, email }
  const [view, setView] = useState("mine");      // "mine" | "approvals"

  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);

  const [activeId, setActiveId] = useState(null);   // which request we scored
  const [result, setResult] = useState(null);       // the scoring result
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function loadRequests() {
    getTravelRequests()
      .then((data) => setRequests(data.requests))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    if (session) {
      loadRequests();
      getMe().then(setProfile).catch((err) => setError(err.message));
    }
  }, [session]);

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

  if (session === undefined) return null; // avoid an auth-form flash while checking
  if (!session) return <Auth />;

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 700, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>TravelWise</h1>
        <div style={{ fontSize: 13, color: "#555" }}>
          {session.user.email} · <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      {profile?.role === "manager" && (
        <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
          <button
            onClick={() => setView("mine")}
            style={{ fontWeight: view === "mine" ? 700 : 400 }}
          >
            My requests
          </button>
          <button
            onClick={() => setView("approvals")}
            style={{ fontWeight: view === "approvals" ? 700 : 400 }}
          >
            Approvals
          </button>
        </div>
      )}

      {view === "approvals" ? (
        <Approvals />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}