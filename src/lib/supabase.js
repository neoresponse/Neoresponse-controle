import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Só inicializa o cliente se as credenciais estiverem preenchidas nas variáveis de ambiente.
// Isso evita que a aplicação quebre se o usuário não tiver configurado o Supabase ainda.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper para verificar se o Supabase está ativado e configurado
export const isSupabaseConfigured = () => {
  return supabase !== null;
};
