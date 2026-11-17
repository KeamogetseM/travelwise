import { useEffect, useState } from "react";
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from "./api";
import { CITIES, CLASSES } from "./constants";

const CONDITION_TYPES = [
  { key: "everyone", label: "Everyone" },
  { key: "class", label: "Travel class" },
  { key: "destination", label: "Destination" },
];

function ConditionPill({ condition }) {
  if (condition === "*") return <span className="pill">Scope <strong>Everyone</strong></span>;
  const [field, value] = condition.split("=");
  const label = field === "class" ? "Class" : field === "destination" ? "Destination" : field;
  return <span className="pill">{label} <strong>{value}</strong></span>;
}

const emptyForm = { rule: "", conditionType: "everyone", conditionValue: CLASSES[0], threshold: "" };

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

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

  function startEdit(policy) {
    const [field, value] = policy.condition === "*" ? [null, null] : policy.condition.split("=");
    setEditingId(policy.id);
    setEditForm({
      rule: policy.rule,
      conditionType: policy.condition === "*" ? "everyone" : field,
      conditionValue: policy.condition === "*" ? "" : value,
      threshold: String(policy.threshold),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  function updateEdit(field, value) {
    setEditForm((f) => ({
      ...f,
      [field]: value,
      ...(field === "conditionType" && {
        conditionValue: value === "class" ? CLASSES[0] : value === "destination" ? CITIES[0] : "",
      }),
    }));
  }

  async function handleEditSave(id) {
    setError(null);
    setBusyId(id);
    try {
      const condition = editForm.conditionType === "everyone" ? "*" : `${editForm.conditionType}=${editForm.conditionValue}`;
      await updatePolicy(id, { rule: editForm.rule, condition, threshold: Number(editForm.threshold) });
      cancelEdit();
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
      <div className="page-header">
        <div>
          <h1>Travel policies</h1>
          <p className="subtitle">Spending caps every scored option is checked against. {policies.filter((p) => p.active).length} active.</p>
        </div>
      </div>
      {error && <p className="error-text">Error: {error}</p>}

      <form onSubmit={handleSubmit} className="card">
        <h3 style={{ marginTop: 0 }}>Add a policy</h3>

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
              </tr>
            </thead>
            <tbody>
              {policies.map((p) =>
                editingId === p.id ? (
                  <tr key={p.id}>
                    <td>
                      <input value={editForm.rule} onChange={(e) => updateEdit("rule", e.target.value)} />
                    </td>
                    <td>
                      <select value={editForm.conditionType} onChange={(e) => updateEdit("conditionType", e.target.value)}>
                        {CONDITION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                      {editForm.conditionType === "class" && (
                        <select value={editForm.conditionValue} onChange={(e) => updateEdit("conditionValue", e.target.value)}>
                          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                      {editForm.conditionType === "destination" && (
                        <select value={editForm.conditionValue} onChange={(e) => updateEdit("conditionValue", e.target.value)}>
                          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      <input type="number" min="1" value={editForm.threshold} onChange={(e) => updateEdit("threshold", e.target.value)} />
                    </td>
                    <td><span className={`badge ${p.active ? "badge-success" : "badge-neutral"}`}>{p.active ? "active" : "inactive"}</span></td>
                    <td colSpan={2} style={{ display: "flex", gap: 8 }}>
                      <button disabled={busyId === p.id} onClick={() => handleEditSave(p.id)}>
                        {busyId === p.id ? "Saving..." : "Save"}
                      </button>
                      <button className="secondary" disabled={busyId === p.id} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                    <td><strong>{p.rule}</strong></td>
                    <td><ConditionPill condition={p.condition} /></td>
                    <td>R{p.threshold}</td>
                    <td><span className={`badge ${p.active ? "badge-success" : "badge-neutral"}`}>{p.active ? "Active" : "Inactive"}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="icon-btn" disabled={busyId === p.id} onClick={() => startEdit(p)} title="Edit">✎</button>
                      <button className="icon-btn" disabled={busyId === p.id} onClick={() => toggleActive(p)} title={p.active ? "Deactivate" : "Activate"}>⏻</button>
                      <button className="icon-btn" disabled={busyId === p.id} onClick={() => handleDelete(p)} title="Delete" style={{ color: "var(--color-danger)" }}>🗑</button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
