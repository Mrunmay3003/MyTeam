import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Browser client: persists session in cookies so middleware / server can validate auth. */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
