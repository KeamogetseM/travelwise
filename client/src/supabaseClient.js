import { createClient } from "@supabase/supabase-js";

// Client-side Supabase instance, used only for Auth (sign up/in/out, session).
// Uses the publishable (anon) key, which is safe to expose in the browser —
// all actual data access still goes through the Express API with the
// user's access token, and the server enforces which rows they can see.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
