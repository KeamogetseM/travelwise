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

  const box = { display: "block", width: "100%", padding: 8, margin: "4px 0 12px", boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 360, margin: "80px auto", padding: "0 16px" }}>
      <h1>TravelWise</h1>
      <form onSubmit={handleSubmit} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>{mode === "sign-up" ? "Create account" : "Sign in"}</h3>

        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
        {info && <p style={{ color: "#1F4E79" }}>{info}</p>}

        <label>Email
          <input type="email" style={box} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>Password
          <input
            type="password"
            style={box}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "sign-up" ? "Sign up" : "Sign in"}
        </button>

        <p style={{ fontSize: 13, marginTop: 12 }}>
          {mode === "sign-up" ? "Already have an account? " : "No account yet? "}
          <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>
            {mode === "sign-up" ? "Sign in" : "Sign up"}
          </a>
        </p>
      </form>
    </div>
  );
}
