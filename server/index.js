require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient");
const { scoreOptions, hydrate } = require("./scoringEngine");
const { predictCost } = require("./mlClient");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Verifies the bearer token from Supabase Auth and attaches req.user.
// Also lazily ensures a matching profiles row exists (first request after
// signup) since travel_requests.user_id references profiles.id.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = data.user;

  await supabase
    .from("profiles")
    .upsert(
      { id: req.user.id, name: req.user.email.split("@")[0], role: "employee" },
      { onConflict: "id", ignoreDuplicates: true }
    );

  next();
}

// Must run after requireAuth. Only lets the given profiles.role(s) through.
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (error || !profile || !allowedRoles.includes(profile.role)) {
      return res.status(403).json({ error: `Requires role: ${allowedRoles.join(" or ")}` });
    }
    next();
  };
}

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "TravelWise API is running" });
});

// The signed-in user's own profile (used by the client to decide whether
// to show the approvals view).
app.get("/api/me", requireAuth, async (req, res) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ ...profile, email: req.user.email });
});

// Proves the DB connection works: counts rows in the policies table
app.get("/api/db-check", async (req, res) => {
  const { count, error } = await supabase
    .from("policies")
    .select("*", { count: "exact", head: true });

  if (error) {
    return res.status(500).json({ connected: false, error: error.message });
  }
  res.json({ connected: true, table: "policies", rowCount: count });
});

// Create a new travel request
app.post("/api/travel-requests", requireAuth, async (req, res) => {
  const { origin, destination, travel_class, purpose, start_date, end_date, estimated_cost } = req.body;
  const user_id = req.user.id;

  // Basic validation
  if (!destination || !start_date || !end_date) {
    return res.status(400).json({
      error: "destination, start_date and end_date are required",
    });
  }

  const { data, error } = await supabase
    .from("travel_requests")
    .insert([{ user_id, origin, destination, travel_class, purpose, start_date, end_date, estimated_cost }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Call the ML service for a predicted cost. Non-fatal: if it's
  // unreachable, the request still saves and scoring falls back to
  // estimated_cost, matching the documented graceful-degradation design.
  let request = data;
  if (origin && travel_class) {
    try {
      const daysToDeparture = Math.max(
        0,
        Math.round((new Date(start_date) - new Date()) / (1000 * 60 * 60 * 24))
      );
      const prediction = await predictCost({ origin, destination, days_to_departure: daysToDeparture, travel_class });

      const { data: updated, error: updErr } = await supabase
        .from("travel_requests")
        .update({ predicted_cost: prediction.predicted_cost })
        .eq("id", data.id)
        .select()
        .single();
      if (!updErr) request = updated;
    } catch (err) {
      console.warn("Cost prediction unavailable:", err.message);
    }
  }

  res.status(201).json({ message: "Travel request created", request });
});

// List the signed-in user's travel requests (newest first)
app.get("/api/travel-requests", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("travel_requests")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ count: data.length, requests: data });
});

// Generate + score options for a request, store them, return recommendation.
// Scorable by the request's own owner, or by a supervisor reviewing it.
app.post("/api/travel-requests/:id/score", requireAuth, async (req, res) => {
  const { id } = req.params;

  // 1. Fetch the request
  const { data: request, error: reqErr } = await supabase
    .from("travel_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (reqErr || !request) {
    return res.status(404).json({ error: "Travel request not found" });
  }

  if (request.user_id !== req.user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();
    if (!profile || profile.role !== "supervisor") {
      return res.status(404).json({ error: "Travel request not found" });
    }
  }

  // 2. Reuse options already scored for this request, if any, instead of
  // generating (and inserting) a fresh duplicate set on every click.
  const { data: existing, error: existingErr } = await supabase
    .from("travel_options")
    .select("*")
    .eq("request_id", id);

  if (existingErr) {
    return res.status(500).json({ error: existingErr.message });
  }

  const { data: policies, error: policiesErr } = await supabase
    .from("policies")
    .select("*")
    .eq("active", true);
  if (policiesErr) {
    return res.status(500).json({ error: policiesErr.message });
  }

  let scored;
  if (existing.length > 0) {
    scored = hydrate(existing, request, policies);
  } else {
    const rows = scoreOptions(request, policies).map((o) => ({
      request_id: id,
      cost: o.cost,
      duration: o.duration,
      type: o.type,
      score: o.score,
    }));
    const { data: inserted, error: insErr } = await supabase.from("travel_options").insert(rows).select();
    if (insErr) {
      return res.status(500).json({ error: insErr.message });
    }
    // Re-derive from the inserted rows so the response includes each
    // option's id (needed by the approvals view) and matches the exact
    // shape returned on subsequent (cached) scoring calls.
    scored = hydrate(inserted, request, policies);
  }

  // 3. Return ranked options + the recommended one
  res.json({
    request_id: id,
    recommendation: scored[0],
    options: scored,
  });
});

// Requests across all users, for a supervisor to review — includes the
// requester's name, the decider's name (once decided), and any options
// already scored for that request. Defaults to the pending queue;
// ?status=approved or ?status=rejected reviews past decisions.
app.get("/api/approvals", requireAuth, requireRole("supervisor"), async (req, res) => {
  const status = ["pending", "approved", "rejected"].includes(req.query.status)
    ? req.query.status
    : "pending";

  const { data, error } = await supabase
    .from("travel_requests")
    .select(
      "*, requester:profiles!travel_requests_user_id_fkey(name), decider:profiles!travel_requests_decided_by_fkey(name), travel_options!travel_options_request_id_fkey(*)"
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const { data: policies, error: policiesErr } = await supabase
    .from("policies")
    .select("*")
    .eq("active", true);
  if (policiesErr) {
    return res.status(500).json({ error: policiesErr.message });
  }

  const requests = data.map(({ requester, decider, travel_options, ...request }) => ({
    ...request,
    requester_name: requester?.name || null,
    decider_name: decider?.name || null,
    options: travel_options.length > 0 ? hydrate(travel_options, request, policies) : [],
  }));

  res.json({ count: requests.length, requests });
});

// Approve a request: pick one of its scored options and record the decision.
app.post("/api/travel-requests/:id/approve", requireAuth, requireRole("supervisor"), async (req, res) => {
  const { id } = req.params;
  const { option_id } = req.body;

  if (!option_id) {
    return res.status(400).json({ error: "option_id is required" });
  }

  const { data: request, error: reqErr } = await supabase
    .from("travel_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (reqErr || !request) {
    return res.status(404).json({ error: "Travel request not found" });
  }
  if (request.status !== "pending") {
    return res.status(400).json({ error: `Request is already ${request.status}` });
  }

  // Confirm the chosen option actually belongs to this request
  const { data: option, error: optErr } = await supabase
    .from("travel_options")
    .select("id")
    .eq("id", option_id)
    .eq("request_id", id)
    .single();
  if (optErr || !option) {
    return res.status(400).json({ error: "option_id does not belong to this request" });
  }

  const { data: updated, error: updErr } = await supabase
    .from("travel_requests")
    .update({
      status: "approved",
      selected_option_id: option_id,
      decided_by: req.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updErr) {
    return res.status(500).json({ error: updErr.message });
  }
  res.json({ message: "Request approved", request: updated });
});

// Reject a request outright — no option is selected.
app.post("/api/travel-requests/:id/reject", requireAuth, requireRole("supervisor"), async (req, res) => {
  const { id } = req.params;

  const { data: request, error: reqErr } = await supabase
    .from("travel_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (reqErr || !request) {
    return res.status(404).json({ error: "Travel request not found" });
  }
  if (request.status !== "pending") {
    return res.status(400).json({ error: `Request is already ${request.status}` });
  }

  const { data: updated, error: updErr } = await supabase
    .from("travel_requests")
    .update({
      status: "rejected",
      decided_by: req.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updErr) {
    return res.status(500).json({ error: updErr.message });
  }
  res.json({ message: "Request rejected", request: updated });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
