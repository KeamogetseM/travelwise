import { useState } from "react";
import { supabase } from "./supabaseClient";

// Email/password sign-up + sign-in, backed by Supabase Auth.
// Once signed in, App.jsx picks up the session via onAuthStateChange.
export default function Auth() {
  const [mode, setMode] = useState("sign-in"); // "sign-in" | "sign-up"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <div className="auth-card">
        <div className="auth-brand">TravelWise</div>
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0 }}>{mode === "sign-up" ? "Create account" : "Sign in"}</h3>

          {error && <p className="error-text">Error: {error}</p>}
          {info && <p style={{ color: "var(--color-primary)", fontSize: 13 }}>{info}</p>}

          <label className="field">Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label className="field">Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          <button type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Please wait…" : mode === "sign-up" ? "Sign up" : "Sign in"}
          </button>

          <p style={{ fontSize: 13, marginTop: 16, textAlign: "center" }}>
            {mode === "sign-up" ? "Already have an account? " : "No account yet? "}
            <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>
              {mode === "sign-up" ? "Sign in" : "Sign up"}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
