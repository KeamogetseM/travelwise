import { useState } from "react";
import { createTravelRequest } from "./api";

// Temporary: the test user's id from your profiles table.
// This goes away once we add login — the logged-in user's id will be used instead.
const TEST_USER_ID = "f1a82286-2f1b-4d7f-8edc-836b0a134333";

const empty = {
  destination: "",
  purpose: "",
  start_date: "",
  end_date: "",
  estimated_cost: "",
};

export default function RequestForm({ onCreated }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createTravelRequest({
        user_id: TEST_USER_ID,
        destination: form.destination,
        purpose: form.purpose,
        start_date: form.start_date,
        end_date: form.end_date,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      });
      setForm(empty);        // clear the form
      onCreated();           // tell the parent to refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const box = { display: "block", width: "100%", padding: 8, margin: "4px 0 12px", boxSizing: "border-box" };

  return (
    <form onSubmit={handleSubmit} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 24 }}>
      <h3 style={{ marginTop: 0 }}>New travel request</h3>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <label>Destination
        <input style={box} value={form.destination} onChange={(e) => update("destination", e.target.value)} required />
      </label>

      <label>Purpose
        <input style={box} value={form.purpose} onChange={(e) => update("purpose", e.target.value)} />
      </label>

      <label>Start date
        <input type="date" style={box} value={form.start_date} onChange={(e) => update("start_date", e.target.value)} required />
      </label>

      <label>End date
        <input type="date" style={box} value={form.end_date} onChange={(e) => update("end_date", e.target.value)} required />
      </label>

      <label>Estimated cost (R)
        <input type="number" style={box} value={form.estimated_cost} onChange={(e) => update("estimated_cost", e.target.value)} />
      </label>

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Submit request"}
      </button>
    </form>
  );
}