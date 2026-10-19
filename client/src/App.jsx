import { useEffect, useState } from "react";
import { getTravelRequests, scoreTravelRequest, getMe } from "./api";
import { supabase } from "./supabaseClient";
import RequestForm from "./RequestForm";
import Recommendation from "./Recommendation";
import Approvals from "./Approvals";
import Policies from "./Policies";
import Reports from "./Reports";
import Auth from "./Auth";
import StatusBadge from "./StatusBadge";

const NAV = [
  { key: "mine", label: "My Requests", roles: ["employee", "supervisor", "administrator"] },
  { key: "approvals", label: "Approvals", roles: ["supervisor"] },
  { key: "policies", label: "Policies", roles: ["administrator"] },
  { key: "reports", label: "Reports", roles: ["administrator"] },
];

export default function App() {
  // undefined = still checking for an existing session, null = signed out
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null); // { id, name, role, email }
  const [view, setView] = useState("mine");

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

  const visibleNav = NAV.filter((n) => profile && n.roles.includes(profile.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">TravelWise</div>

        <nav className="sidebar-nav">
          {visibleNav.map((n) => (
            <button
              key={n.key}
              className={`sidebar-link${view === n.key ? " active" : ""}`}
              onClick={() => setView(n.key)}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {profile && (
          <div className="sidebar-footer">
            <div className="email">{session.user.email}</div>
            <div><span className="role">{profile.role}</span></div>
            <button className="secondary" style={{ width: "100%" }} onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="main">
        {view === "approvals" ? (
          <Approvals />
        ) : view === "policies" ? (
          <Policies />
        ) : view === "reports" ? (
          <Reports />
        ) : (
          <>
            <RequestForm onCreated={loadRequests} />

            <h2>Travel requests</h2>
            {error && <p className="error-text">Error: {error}</p>}
            {requests.length === 0 && !error && <p className="muted">No requests yet.</p>}

            {requests.map((r) => (
              <div key={r.id} className="card">
                <div className="card-row">
                  <div>
                    <strong>{r.origin} → {r.destination}</strong> ({r.travel_class}) — {r.purpose || "no purpose"}
                    <div className="muted" style={{ marginTop: 4 }}>
                      {r.predicted_cost != null
                        ? <>Predicted: R{r.predicted_cost} (your estimate: R{r.estimated_cost ?? "—"})</>
                        : <>Estimated: R{r.estimated_cost ?? "—"} (prediction unavailable)</>}
                      {" "}· <StatusBadge status={r.status} />
                    </div>
                    {r.decision_comment && (
                      <div className="muted" style={{ fontStyle: "italic", marginTop: 6 }}>
                        {r.status === "approved" ? "Approved" : "Rejected"}: “{r.decision_comment}”
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleScore(r.id)}>Score options</button>
                </div>

                {activeId === r.id && <Recommendation result={result} loading={loading} />}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
