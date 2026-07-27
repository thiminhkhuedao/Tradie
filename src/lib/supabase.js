// src/lib/supabase.js — mobile, using Clerk for auth
import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Tradie] Missing Supabase env vars.\n" +
    "Copy .env.example → .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Same pattern as the web client: Clerk owns the session, Supabase
// just needs the current token forwarded on every request so RLS
// policies checking auth.jwt() ->> 'sub' against profiles.clerk_id
// work correctly. Set via setClerkTokenGetter() at app startup,
// from a component that has access to Clerk's useAuth().
let clerkGetToken = null;

export function setClerkTokenGetter(fn) {
  clerkGetToken = fn;
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  accessToken: async () => {
    if (!clerkGetToken) return null;
    try {
      return await clerkGetToken();
    } catch (err) {
      console.error("[supabase] failed to get Clerk token:", err);
      return null;
    }
  },
});
