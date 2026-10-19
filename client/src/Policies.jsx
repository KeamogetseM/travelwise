import { useEffect, useState } from "react";
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from "./api";
import { CITIES, CLASSES } from "./constants";

const CONDITION_TYPES = [
  { key: "everyone", label: "Everyone" },
  { key: "class", label: "Travel class" },
  { key: "destination", label: "Destination" },
];

function describeCondition(condition) {
  if (condition === "*") return "Everyone";
  const [field, value] = condition.split("=");
  if (field === "class") return `Class: ${value}`;
  if (field === "destination") return `Destination: ${value}`;
  return condition;
}

const emptyForm = { rule: "", conditionType: "everyone", conditionValue: CLASSES[0], threshold: "" };

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function load() {
    getPolicies()
      .then((data) => setPolicies(data.policies))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  function update(field, value) {
    setForm((f) => ({
      ...f,
      [field]: value,
      // Reset the value picker to a sensible default when the type changes.
      ...(field === "conditionType" && {
        conditionValue: value === "class" ? CLASSES[0] : value === "destination" ? CITIES[0] : "",
      }),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const condition = form.conditionType === "everyone" ? "*" : `${form.conditionType}=${form.conditionValue}`;
      await createPolicy({ rule: form.rule, condition, threshold: Number(form.threshold) });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(policy) {
    setError(null);
    setBusyId(policy.id);
    try {
      await updatePolicy(policy.id, { active: !policy.active });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(policy) {
    setError(null);
    setBusyId(policy.id);
    try {
      await deletePolicy(policy.id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2>Travel Policies</h2>
      {error && <p className="error-text">Error: {error}</p>}

      <form onSubmit={handleSubmit} className="card">
        <h3 style={{ marginTop: 0 }}>New policy</h3>

        <label className="field">Rule name
          <input value={form.rule} onChange={(e) => update("rule", e.target.value)} required />
        </label>

        <div className="form-grid">
          <label className="field">Applies to
            <select value={form.conditionType} onChange={(e) => update("conditionType", e.target.value)}>
              {CONDITION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </label>

          {form.conditionType === "class" && (
            <label className="field">Class
              <select value={form.conditionValue} onChange={(e) => update("conditionValue", e.target.value)}>
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}

          {form.conditionType === "destination" && (
            <label className="field">Destination
              <select value={form.conditionValue} onChange={(e) => update("conditionValue", e.target.value)}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}

          <label className="field">Maximum cost (R)
            <input type="number" min="1" value={form.threshold} onChange={(e) => update("threshold", e.target.value)} required />
          </label>
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add policy"}
        </button>
      </form>

      <div className="card">
        {policies.length === 0 && !error && <p className="muted">No policies defined yet.</p>}
        {policies.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Applies to</th>
                <th>Max cost</th>
                <th>Status</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                  <td>{p.rule}</td>
                  <td>{describeCondition(p.condition)}</td>
                  <td>R{p.threshold}</td>
                  <td><span className={`badge ${p.active ? "badge-success" : "badge-neutral"}`}>{p.active ? "active" : "inactive"}</span></td>
                  <td>
                    <button className="secondary" disabled={busyId === p.id} onClick={() => toggleActive(p)}>
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                  <td>
                    <button className="danger" disabled={busyId === p.id} onClick={() => handleDelete(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
