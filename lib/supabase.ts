import { createClient } from "@supabase/supabase-js";

// Server-side only — uses service role key, never exposed to browser
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export const BUCKETS = {
  TRAINING_MATERIALS: "training-materials",
  BRANDING: "branding",
} as const;
