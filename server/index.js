require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient");
const { scoreOptions } = require("./scoringEngine");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "TravelWise API is running" });
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
app.post("/api/travel-requests", async (req, res) => {
  const { user_id, destination, purpose, start_date, end_date, estimated_cost } = req.body;

  // Basic validation
  if (!user_id || !destination || !start_date || !end_date) {
    return res.status(400).json({
      error: "user_id, destination, start_date and end_date are required",
    });
  }

  const { data, error } = await supabase
    .from("travel_requests")
    .insert([{ user_id, destination, purpose, start_date, end_date, estimated_cost }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ message: "Travel request created", request: data });
});

// List all travel requests (newest first)
app.get("/api/travel-requests", async (req, res) => {
  const { data, error } = await supabase
    .from("travel_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ count: data.length, requests: data });
});

// Generate + score options for a request, store them, return recommendation
app.post("/api/travel-requests/:id/score", async (req, res) => {
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

  // 2. Score the options
  const scored = scoreOptions(request);

  // 3. Persist options to the DB
  const rows = scored.map((o) => ({
    request_id: id,
    cost: o.cost,
    duration: o.duration,
    type: o.type,
    score: o.score,
  }));
  const { error: insErr } = await supabase.from("travel_options").insert(rows);
  if (insErr) {
    return res.status(500).json({ error: insErr.message });
  }

  // 4. Return ranked options + the recommended one
  res.json({
    request_id: id,
    recommendation: scored[0],
    options: scored,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
