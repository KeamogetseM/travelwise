import { useEffect, useMemo, useState } from "react";
import { getTravelRequests, scoreTravelRequest, getMe, getApprovals } from "./api";
import { supabase } from "./supabaseClient";
import RequestForm from "./RequestForm";
import Recommendation from "./Recommendation";
import Approvals from "./Approvals";
import Policies from "./Policies";
import Reports from "./Reports";
import Activity from "./Activity";
import Auth from "./Auth";
import StatusBadge from "./StatusBadge";

const NAV = [
  { key: "mine", label: "My requests", icon: "📄", roles: ["employee", "supervisor", "administrator"] },
  { key: "approvals", label: "Approvals", icon: "✅", roles: ["supervisor"] },
  { key: "policies", label: "Policies", icon: "🛡", roles: ["administrator"] },
  { key: "reports", label: "Reports", icon: "📊", roles: ["administrator"] },
  { key: "activity", label: "Activity", icon: "🕘", roles: ["administrator"] },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function App() {
  // undefined = still checking for an existing session, null = signed out
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null); // { id, name, role, email }
  const [view, setView] = useState("mine");
  const [filter, setFilter] = useState("all");

  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);

  const [activeId, setActiveId] = useState(null);   // which request we scored
  const [result, setResult] = useState(null);       // the scoring result
  const [loading, setLoading] = useState(false);

  const [pendingApprovals, setPendingApprovals] = useState(0); // team requests awaiting this supervisor

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

  function loadPendingApprovals() {
    getApprovals("pending")
      .then((data) => setPendingApprovals(data.requests.length))
      .catch(() => {});
  }

  useEffect(() => {
    if (session) {
      loadRequests();
      getMe().then(setProfile).catch((err) => setError(err.message));
    }
  }, [session]);

  useEffect(() => {
    if (profile?.role === "supervisor") loadPendingApprovals();
  }, [profile]);

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

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  const visibleRequests = useMemo(
    () => (filter === "all" ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  );

  if (session === undefined) return null; // avoid an auth-form flash while checking
  if (!session) return <Auth />;

  const visibleNav = NAV.filter((n) => profile && n.roles.includes(profile.role));
  const initials = (profile?.name || session.user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">✈</span> TravelWise
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((n) => (
            <button
              key={n.key}
              className={`sidebar-link${view === n.key ? " active" : ""}`}
              onClick={() => setView(n.key)}
            >
              <span>{n.icon} {n.label}</span>
              {n.key === "approvals" && pendingApprovals > 0 && (
                <span className="nav-count">{pendingApprovals}</span>
              )}
            </button>
          ))}
        </nav>

        {profile && (
          <div className="sidebar-footer">
            <div className="avatar">{initials}</div>
            <div className="who">
              <div className="email">{session.user.email}</div>
              <div className="role">{profile.role}</div>
            </div>
            <button onClick={() => supabase.auth.signOut()} title="Sign out">⎋</button>
          </div>
        )}
      </aside>

      <main className="main">
        {view === "approvals" ? (
          <Approvals onDecision={loadPendingApprovals} />
        ) : view === "policies" ? (
          <Policies />
        ) : view === "reports" ? (
          <Reports />
        ) : view === "activity" ? (
          <Activity />
        ) : (
          <>
            <div className="page-header">
              <div>
                <h1>My requests</h1>
                <p className="subtitle">Plan a trip, see what it should cost, and track its approval.</p>
              </div>
              <div className="page-header-stats">
                <span className="badge badge-warning">{counts.pending} pending</span>
                <span className="badge badge-success">{counts.approved} approved</span>
                <span className="badge badge-danger">{counts.rejected} rejected</span>
              </div>
            </div>

            <RequestForm onCreated={loadRequests} />

            <div className="card-row" style={{ marginBottom: 4 }}>
              <h2 style={{ marginBottom: 0 }}>Your requests</h2>
            </div>
            <div className="tabs">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`link-tab${filter === f.key ? " active" : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {error && <p className="error-text">Error: {error}</p>}
            {visibleRequests.length === 0 && !error && <p className="muted">No {filter === "all" ? "" : filter + " "}requests yet.</p>}

            {visibleRequests.map((r) => (
              <div key={r.id} className="card">
                <div className="card-row">
                  <div>
                    <strong>{r.origin} → {r.destination}</strong>{" "}
                    <span className="pill">{r.travel_class}</span>
                    <div className="muted" style={{ marginTop: 4 }}>{r.purpose || "No purpose given"}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {r.predicted_cost != null
                        ? <>Predicted cost: <strong style={{ color: "var(--color-text)" }}>R{r.predicted_cost}</strong> (your estimate: R{r.estimated_cost ?? "—"})</>
                        : <>Estimated: R{r.estimated_cost ?? "—"} (prediction unavailable)</>}
                      {" "}· <StatusBadge status={r.status} />
                    </div>
                    {r.decision_comment && (
                      <div className="muted" style={{ fontStyle: "italic", marginTop: 6 }}>
                        {r.status === "approved" ? "Approved" : "Rejected"}: “{r.decision_comment}”
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleScore(r.id)}>View options</button>
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
