import { useState } from "react";
import { createTravelRequest } from "./api";
import { CITIES, CLASSES } from "./constants";

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

  function swap() {
    setForm((f) => ({ ...f, origin: f.destination, destination: f.origin }));
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3 style={{ marginTop: 0 }}>New travel request</h3>

      {error && <p className="error-text">Error: {error}</p>}

      <div className="form-grid" style={{ gridTemplateColumns: "1fr auto 1fr 1fr", alignItems: "end" }}>
        <label className="field">From
          <select value={form.origin} onChange={(e) => update("origin", e.target.value)}>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <button type="button" className="icon-btn" onClick={swap} title="Swap" style={{ marginBottom: 14 }}>⇄</button>

        <label className="field">To
          <select value={form.destination} onChange={(e) => update("destination", e.target.value)}>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="field">Class
          <select value={form.travel_class} onChange={(e) => update("travel_class", e.target.value)}>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <label className="field">Purpose of trip
        <input placeholder="e.g. Client workshop, vendor review" value={form.purpose} onChange={(e) => update("purpose", e.target.value)} />
      </label>

      <div className="form-grid">
        <label className="field">Departure
          <input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} required />
        </label>

        <label className="field">Return
          <input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} required />
        </label>

        <label className="field">Your budget estimate (optional)
          <input type="number" placeholder="0" value={form.estimated_cost} onChange={(e) => update("estimated_cost", e.target.value)} />
        </label>
      </div>

      <div className="card-row">
        <p className="muted" style={{ margin: 0 }}>We'll price rail, flight and car options and check them against policy.</p>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Submit request"}
        </button>
      </div>
    </form>
  );
}
