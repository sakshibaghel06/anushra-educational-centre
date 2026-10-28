import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

const missingConfigError =
  !supabaseUrl || !supabasePublishableKey
    ? "Supabase is not configured. Copy .env.example to .env.local and provide the project URL and publishable key."
    : null;

function createSupabaseClient(): { client: ReturnType<typeof createClient<Database>> | null; error: string | null } {
  if (missingConfigError) return { client: null, error: missingConfigError };

  try {
    return {
      client: createClient<Database>(supabaseUrl!, supabasePublishableKey!, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      }),
      error: null,
    };
  } catch (error) {
    return {
      client: null,
      error: error instanceof Error ? `Invalid Supabase configuration: ${error.message}` : "Invalid Supabase configuration.",
    };
  }
}

const configuration = createSupabaseClient();

export const supabase = configuration.client;
export const supabaseConfigError = configuration.error;
