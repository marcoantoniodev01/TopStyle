// assets/js/drops.js
// <script type="module" src="assets/js/drops.js"></script>
(() => {
  'use strict';

  const SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';
  const DROPS_BUCKET = 'drop-imgs';
  const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#eee" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="Arial,Helvetica,sans-serif" font-size="20">imagem indisponível</text></svg>`
  );

  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // tenta obter URL pública via supabase.storage.from(bucket).getPublicUrl(path)
  // se não existir essa API (ou falhar), monta manualmente usando o prefixo
  async function resolveImageUrl(supabase, imageFieldValue) {
    if (!imageFieldValue) return null;
    const s = String(imageFieldValue).trim();
    if (/^https?:\/\//i.test(s)) return s; // já é URL completa
    const path = s.replace(/^\/+/, '');

    // tenta usar API do client se disponível
    try {
      if (supabase && typeof supabase.storage === 'object' && typeof supabase.storage.from === 'function') {
        const bucket = supabase.storage.from(DROPS_BUCKET);
        // método getPublicUrl existe em muitas versões:
        if (typeof bucket.getPublicUrl === 'function') {
          const res = bucket.getPublicUrl(path);
          // em algumas versões res = { data: { publicUrl } } ou res = { publicURL } — lidar com ambos
          if (res) {
            if (res.data && (res.data.publicUrl || res.data.publicURL)) return res.data.publicUrl || res.data.publicURL;
            if (res.publicUrl) return res.publicUrl;
            if (res.publicURL) return res.publicURL;
          }
        }
        // fallback: tentar createSignedUrl se bucket privado (gera URL temporária)
        if (typeof bucket.createSignedUrl === 'function') {
          // 60 segundos
          const signed = await bucket.createSignedUrl(path, 60);
          if (signed && signed.signedURL) return signed.signedURL;
          if (signed && signed.data && signed.data.signedURL) return signed.data.signedURL;
        }
      }
    } catch (e) {
      // não fatal — continua para fallback manual
      console.warn('resolveImageUrl: supabase.storage API falhou, usando fallback manual', e);
    }

    // fallback manual: construir URL pública padrão (funciona se bucket for público)
    const prefix = SUPABASE_URL.replace(/\/+$/,'') + '/storage/v1/object/public/' + encodeURIComponent(DROPS_BUCKET) + '/';
    return prefix + encodeURIComponent(path).replace(/%2F/g, '/'); // preserva slashes
  }

  function setContainerMessage(container, html) {
    if (!container) return;
    container.innerHTML = `<div class="drops-debug-message" style="padding:12px;background:#fff8c6;border:1px solid #f0e08a;color:#6b4b00;border-radius:6px;font-size:14px">${html}</div>`;
  }

  function makeDropColumn({ id, name_drop, image_drop }, imgUrl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'drop-column';
    if (id !== undefined && id !== null) wrapper.dataset.dropId = id;

    const link = document.createElement('a');
    link.href = '#';
    link.className = 'drop__img';

    const img = document.createElement('img');
    img.alt = (name_drop || '').trim() || '';

    if (imgUrl) {
      img.src = imgUrl;
    } else {
      img.src = PLACEHOLDER;
    }

    // se falhar o carregamento da imagem, troca para placeholder e marca dataset
    img.addEventListener('error', () => {
      img.src = PLACEHOLDER;
      wrapper.dataset.imgError = 'true';
    });

    link.appendChild(img);

    const p = document.createElement('p');
    p.className = 'drop-name';
    p.textContent = name_drop || '—';

    wrapper.appendChild(link);
    wrapper.appendChild(p);

    return wrapper;
  }

  function clearAndRender(container, columns) {
    container.innerHTML = '';
    for (const c of columns) container.appendChild(c);
  }

  function debounce(fn, wait = 250) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  async function initMain() {
    console.log('[drops] initMain: aguardando DOM...');
    const container = document.querySelector('.mega-imgs');
    if (!container) {
      console.error('[drops] container .mega-imgs não encontrado no DOM.');
      return;
    }
    console.log('[drops] container encontrado:', container);

    // Mostrar mensagem temporária
    setContainerMessage(container, 'Carregando drops... (verifique console F12 se nada aparecer)');

    // importar supabase
    let createClient;
    try {
      ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'));
    } catch (err) {
      console.error('[drops] Erro ao importar supabase-js:', err);
      setContainerMessage(container, 'Erro ao importar biblioteca Supabase. Veja console (F12). Inserindo exemplo estático para teste do layout.');
      // fallback: inserir exemplo estático para testar o layout
      const sample = [{
        id: 'sample-1',
        name_drop: 'Exemplo de Drop',
        image_drop: null
      }];
      const cols = sample.map(s => makeDropColumn(s, null));
      clearAndRender(container, cols);
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!supabase) {
      console.error('[drops] Não foi possível criar supabase client.');
      setContainerMessage(container, 'Não foi possível criar client Supabase. Veja console.');
      return;
    }
    console.log('[drops] Supabase client criado.');

    async function loadDrops() {
      try {
        setContainerMessage(container, 'Carregando drops do banco...');
        const { data, error } = await supabase
          .from('drops')
          .select('id, name_drop, image_drop')
          .order('id', { ascending: true });

        if (error) {
          console.error('[drops] Erro na query:', error);
          setContainerMessage(container, 'Erro ao buscar drops: ' + escapeHtml(String(error.message || error)));
          return;
        }
        if (!data || data.length === 0) {
          console.warn('[drops] Query retornou vazio.');
          setContainerMessage(container, 'Nenhum drop encontrado na tabela `drops`.');
          return;
        }

        console.log('[drops] dados recebidos:', data);

        // resolver URLs em paralelo
        const resolvedUrls = await Promise.all(
          data.map(d => resolveImageUrl(supabase, d.image_drop).catch(e => { console.warn('resolveImageUrl erro', e); return null; }))
        );

        const cols = data.map((d, idx) => makeDropColumn(d, resolvedUrls[idx]));
        clearAndRender(container, cols);
        console.log('[drops] renderizado', cols.length, 'colunas.');
      } catch (err) {
        console.error('[drops] erro inesperado ao carregar drops:', err);
        setContainerMessage(container, 'Erro inesperado ao carregar drops. Veja console.');
      }
    }

    await loadDrops();

    // realtime: recarrega quando houver mudança
    try {
      const debouncedLoad = debounce(() => loadDrops(), 300);
      if (typeof supabase.channel === 'function') {
        supabase
          .channel('public:drops')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'drops' }, payload => {
            console.log('[drops realtime] payload', payload);
            debouncedLoad();
          })
          .subscribe();
        console.log('[drops] realtime via channel inscrito.');
      } else {
        // fallback para API antiga
        supabase
          .from('drops')
          .on('*', payload => {
            console.log('[drops realtime old] payload', payload);
            debouncedLoad();
          })
          .subscribe();
        console.log('[drops] realtime via from().on() inscrito.');
      }
    } catch (e) {
      console.warn('[drops] não foi possível ativar realtime:', e);
    }
  }

  // espera DOM ready (assegura container existir mesmo com script no <head>)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain);
  } else {
    initMain();
  }

})();