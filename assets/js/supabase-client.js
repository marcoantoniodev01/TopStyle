// substituir pelas suas chaves do projeto (NÃO comitar a anon key em repositório público)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// helper: fetch products
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  if (error) throw error;
  // transformar cores se necessário (já é jsonb)
  const map = {};
  data.forEach(p => {
    map[p.id] = {
      id: p.id,
      nome: p.nome,
      preco: p.preco ? String(p.preco).replace('.', ',') : '',
      tamanhos: p.tamanhos,
      cores: p.cores || [],
      img: p.img,
      link: p.link
    };
  });
  return map;
}

// atualizar produto
export async function updateProduct(productId, patch) {
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', productId);
  if (error) throw error;
  return data;
}
