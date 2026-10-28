import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";
import { supabase, supabaseConfigError } from "../../lib/supabase";

export type SchoolClient = SupabaseClient<Database>;

export function requireSchoolClient(): SchoolClient {
  if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured.");
  return supabase;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
