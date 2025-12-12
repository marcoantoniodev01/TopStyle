/* assets/js/supabase-client.js */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- CONFIGURAÇÃO ---
// Substitua pelas suas credenciais REAIS do painel do Supabase
const SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';

let supabaseInstance = null;

async function initSupabase() {
    if (supabaseInstance) return supabaseInstance;

    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('SUA_URL')) {
            console.error("ERRO CRÍTICO: URL ou Key do Supabase não configuradas no arquivo supabase-client.js");
            return null;
        }

        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            }
        });

        // Torna global para acesso de outros scripts não-module
        window.supabase = supabaseInstance;
        console.log("✅ Supabase inicializado com sucesso!");
        return supabaseInstance;

    } catch (error) {
        console.error("Erro ao inicializar Supabase:", error);
        return null;
    }
}

// Inicializa imediatamente e expõe a promessa
window.initSupabaseClient = initSupabase;
initSupabase();