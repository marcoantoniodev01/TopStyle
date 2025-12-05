// 1. Importa a função para CRIAR o cliente da biblioteca do Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 2. Define suas chaves (isso só acontece AQUI)
const SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';

// 3. Cria o cliente
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 4. EXPORTA o cliente para outros arquivos poderem usar
export { supabase };
window.supabase = supabase;