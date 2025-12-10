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
    const prefix = SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/object/public/' + encodeURIComponent(DROPS_BUCKET) + '/';
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

  async function getSupabaseClientOrNull() {
    // 1) cliente global (já criado por outro script)
    if (window.supabaseClient) return window.supabaseClient;
    if (window.client) return window.client;
    if (window.supabase) return window.supabase; // às vezes o projeto usa window.supabase

    // 2) tentar import dinâmico (ESM)
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
      const createClient = mod.createClient || (mod.default && mod.default.createClient);
      if (typeof createClient === 'function') {
        const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // guarda global para evitar múltiplas instâncias
        window.supabaseClient = c;
        return c;
      } else {
        console.warn('[drops] import retornou módulo sem createClient:', mod);
      }
    } catch (err) {
      console.warn('[drops] import supabase-js falhou:', err);
    }

    // 3) retorno null (chamador fará fallback via REST)
    return null;
  }

  /**
   * Fallback usando REST API do Supabase (sem SDK).
   * Retorna array de objetos ou null em erro.
   */
  async function fetchDropsViaRest() {
    try {
      const url = `${SUPABASE_URL}/rest/v1/drops?select=id,name_drop,image_drop&order=name_drop.asc`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json'
        }
      });
      if (!res.ok) {
        const txt = await res.text();
        console.warn('[drops REST] status', res.status, txt);
        return null;
      }
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch (e) {
      console.error('[drops REST] erro', e);
      return null;
    }
  }

  /* MODIFIQUEI */

  /* Substitui o initMain original por uma versão que usa os fallbacks */
  async function initMain() {
    console.log('[drops] initMain: aguardando DOM...');
    const container = document.querySelector('.mega-imgs');
    if (!container) {
      console.error('[drops] container .mega-imgs não encontrado no DOM.');
      return;
    }
    console.log('[drops] container encontrado:', container);
    setContainerMessage(container, 'Carregando drops... (verifique console F12 se nada aparecer)');

    // tenta criar/pegar client
    const supabase = await getSupabaseClientOrNull();

    // Se não tem client, tenta REST fallback
    if (!supabase) {
      console.warn('[drops] Client Supabase não disponível — tentando REST fallback');
      const restData = await fetchDropsViaRest();
      if (!restData) {
        setContainerMessage(container, 'Não foi possível carregar drops (SDK e REST falharam). Veja console.');
        return;
      }
      // renderiza com dados do REST (sem usar resolveImageUrl com client)
      const resolvedUrls = restData.map(d => {
        if (!d.image_drop) return null;
        // se já for URL absoluta usa direto
        if (/^https?:\/\//i.test(String(d.image_drop))) return d.image_drop;
        // fallback: suponha bucket público
        return SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/object/public/' + encodeURIComponent(DROPS_BUCKET) + '/' + encodeURIComponent(String(d.image_drop)).replace(/%2F/g, '/');
      });
      const cols = restData.map((d, idx) => makeDropColumn(d, resolvedUrls[idx]));
      clearAndRender(container, cols);
      console.log('[drops] renderizado (REST fallback)', cols.length, 'colunas.');
      return;
    }

    console.log('[drops] Supabase client criado.');
    // a partir daqui, usa o SDK normalmente (teu código original)
    try {
      setContainerMessage(container, 'Carregando drops do banco...');
      const { data, error } = await supabase
        .from('drops')
        .select('id, name_drop, image_drop')
        .order('name_drop', { ascending: true });

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

      // resolver URLs usando o client (se possível)
      const resolvedUrls = await Promise.all(
        data.map(d => resolveImageUrl(supabase, d.image_drop).catch(e => { console.warn('resolveImageUrl erro', e); return null; }))
      );
      const cols = data.map((d, idx) => makeDropColumn(d, resolvedUrls[idx]));
      clearAndRender(container, cols);
      console.log('[drops] renderizado', cols.length, 'colunas.');

      // realtime: faça subscribe dependendo da API disponível
      const debouncedLoad = debounce(() => {
        loadDropsSafely(supabase, container).catch(e => console.warn(e));
      }, 300);

      if (typeof supabase.channel === 'function') {
        // nova API
        try {
          supabase
            .channel('public:drops')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drops' }, payload => {
              console.log('[drops realtime] payload', payload);
              debouncedLoad();
            })
            .subscribe();
          console.log('[drops] realtime via channel inscrito.');
        } catch (e) {
          console.warn('[drops] erro ao inscrever channel realtime:', e);
        }
      } else if (typeof supabase.from === 'function' && typeof supabase.from().on === 'function') {
        // API antiga (exige evento names como 'INSERT','UPDATE','DELETE')
        try {
          supabase
            .from('drops')
            .on('INSERT', payload => { console.log('[drops realtime insert] ', payload); debouncedLoad(); })
            .on('UPDATE', payload => { console.log('[drops realtime update] ', payload); debouncedLoad(); })
            .on('DELETE', payload => { console.log('[drops realtime delete] ', payload); debouncedLoad(); })
            .subscribe();
          console.log('[drops] realtime via from().on() inscrito.');
        } catch (e) {
          console.warn('[drops] realtime (antigo) falhou:', e);
        }
      }
    } catch (err) {
      console.error('[drops] erro inesperado ao carregar drops:', err);
      setContainerMessage(container, 'Erro inesperado ao carregar drops. Veja console.');
    }
  }

  // função auxiliar usada no debounce para recarregar via SDK
  async function loadDropsSafely(supabase, container) {
    try {
      const { data, error } = await supabase.from('drops').select('id,name_drop,image_drop').order('name_drop', { ascending: true });
      if (error) { console.warn('[drops] loadDropsSafely erro', error); return; }
      if (!data) return;
      const resolved = await Promise.all(data.map(d => resolveImageUrl(supabase, d.image_drop).catch(() => null)));
      const cols = data.map((d, i) => makeDropColumn(d, resolved[i]));
      clearAndRender(container, cols);
    } catch (e) { console.warn('[drops] loadDropsSafely exception', e); }
  }

  // substitui event binding do init original
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain);
  } else {
    initMain();
  }

  /* ATÉ AQUI */

  // espera DOM ready (assegura container existir mesmo com script no <head>)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain);
  } else {
    initMain();
  }

})();