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

  const box = { display: "block", width: "100%", padding: 8, margin: "4px 0 12px", boxSizing: "border-box" };

  return (
    <div>
      <h2>Travel Policies</h2>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <form onSubmit={handleSubmit} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>New policy</h3>

        <label>Rule name
          <input style={box} value={form.rule} onChange={(e) => update("rule", e.target.value)} required />
        </label>

        <label>Applies to
          <select style={box} value={form.conditionType} onChange={(e) => update("conditionType", e.target.value)}>
            {CONDITION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>

        {form.conditionType === "class" && (
          <label>Class
            <select style={box} value={form.conditionValue} onChange={(e) => update("conditionValue", e.target.value)}>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}

        {form.conditionType === "destination" && (
          <label>Destination
            <select style={box} value={form.conditionValue} onChange={(e) => update("conditionValue", e.target.value)}>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}

        <label>Maximum cost (R)
          <input type="number" min="1" style={box} value={form.threshold} onChange={(e) => update("threshold", e.target.value)} required />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add policy"}
        </button>
      </form>

      {policies.length === 0 && !error && <p>No policies defined yet.</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 6 }}>Rule</th>
            <th style={{ padding: 6 }}>Applies to</th>
            <th style={{ padding: 6 }}>Max cost</th>
            <th style={{ padding: 6 }}>Active</th>
            <th style={{ padding: 6 }} />
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #f0f0f0", opacity: p.active ? 1 : 0.5 }}>
              <td style={{ padding: 6 }}>{p.rule}</td>
              <td style={{ padding: 6 }}>{describeCondition(p.condition)}</td>
              <td style={{ padding: 6 }}>R{p.threshold}</td>
              <td style={{ padding: 6 }}>
                <button disabled={busyId === p.id} onClick={() => toggleActive(p)}>
                  {p.active ? "Deactivate" : "Activate"}
                </button>
              </td>
              <td style={{ padding: 6 }}>
                <button disabled={busyId === p.id} onClick={() => handleDelete(p)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
