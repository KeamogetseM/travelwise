import { useState } from "react";
import { supabase } from "./supabaseClient";

// Email/password sign-up + sign-in, backed by Supabase Auth.
// Once signed in, App.jsx picks up the session via onAuthStateChange.
export default function Auth() {
  const [mode, setMode] = useState("sign-in"); // "sign-in" | "sign-up"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Account created — check your email to confirm, then sign in.");
        setMode("sign-in");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === "sign-up" ? "sign-in" : "sign-up"));
    setError(null);
    setInfo(null);
  }

  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="auth-side-brand">
          <span className="brand-mark">✈</span> TravelWise
        </div>

        <div>
          <h1>Business travel, requested and approved in one place.</h1>
          <ul>
            <li><span className="check">✓</span> Every trip priced across rail, flight and car before it's submitted</li>
            <li><span className="check">✓</span> Options checked against your company's travel policies</li>
            <li><span className="check">✓</span> Supervisors approve with a scored recommendation</li>
          </ul>
        </div>

        <div className="copyright">© TravelWise</div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <form onSubmit={handleSubmit}>
            <h2>{mode === "sign-up" ? "Create account" : "Sign in"}</h2>
            <p className="subtitle" style={{ marginBottom: 20 }}>
              {mode === "sign-up" ? "Set up your work account." : "Welcome back. Use your work email."}
            </p>

            {error && <p className="error-text">Error: {error}</p>}
            {info && <p style={{ color: "var(--color-primary)", fontSize: 13 }}>{info}</p>}

            <label className="field">Email
              <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label className="field">Password
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: "absolute", right: 2, top: 2 }}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </label>

            <button type="submit" disabled={busy} style={{ width: "100%", marginTop: 6 }}>
              {busy ? "Please wait…" : mode === "sign-up" ? "Sign up" : "Sign in"}
            </button>

            <p style={{ fontSize: 13, marginTop: 16, textAlign: "center" }}>
              {mode === "sign-up" ? "Already have an account? " : "No account yet? "}
              <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>
                {mode === "sign-up" ? "Sign in" : "Create one"}
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
