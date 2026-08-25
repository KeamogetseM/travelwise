const { createClient } = require("@supabase/supabase-js");

// Backend uses the SECRET key — it bypasses Row Level Security by design,
// which is exactly why database access goes through the server, not the browser.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

module.exports = supabase;