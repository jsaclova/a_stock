import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// 빌드 시 URL이 비어 있으면(CasaOS 배포) 같은 origin의 프록시를 통해 접속
const url =
  envUrl && envUrl !== ""
    ? envUrl
    : typeof window !== "undefined"
      ? window.location.origin
      : "";

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
