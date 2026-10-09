import { useState } from "react";
import { createTravelRequest } from "./api";

// The cost-prediction model was trained only on these routes/classes
// (Kaggle "Flight Price Prediction" dataset covers India's 6 metro cities),
// so origin/destination/class are constrained to what it can meaningfully
// predict rather than left as free text.
const CITIES = ["Bangalore", "Chennai", "Delhi", "Hyderabad", "Kolkata", "Mumbai"];
const CLASSES = ["Economy", "Business"];

const empty = {
  origin: CITIES[0],
  destination: CITIES[1],
  travel_class: CLASSES[0],
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

    if (form.origin === form.destination) {
      setError("Origin and destination can't be the same city");
      return;
    }

    setSaving(true);
    try {
      await createTravelRequest({
        origin: form.origin,
        destination: form.destination,
        travel_class: form.travel_class,
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

      <label>Origin
        <select style={box} value={form.origin} onChange={(e) => update("origin", e.target.value)}>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label>Destination
        <select style={box} value={form.destination} onChange={(e) => update("destination", e.target.value)}>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label>Class
        <select style={box} value={form.travel_class} onChange={(e) => update("travel_class", e.target.value)}>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
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

      <label>Estimated cost (R) — your own guess, optional
        <input type="number" style={box} value={form.estimated_cost} onChange={(e) => update("estimated_cost", e.target.value)} />
      </label>

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Submit request"}
      </button>
    </form>
  );
}
