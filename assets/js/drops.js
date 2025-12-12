// assets/js/drops.js
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

    img.src = imgUrl || PLACEHOLDER;

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

  // tenta obter um client supabase válido (com .from). retorna null se não conseguir
  async function getSupabaseClientOrNull() {
    // 1) cliente global pronto (versões diferentes do projeto podem usar window.supabase, window.client, window.supabaseClient)
    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') return window.supabaseClient;
    if (window.client && typeof window.client.from === 'function') return window.client;
    if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;

    // 2) tentar importar dinamicamente (ESM build)
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
      const createClient = mod.createClient || (mod.default && mod.default.createClient);
      if (typeof createClient === 'function') {
        const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // armazena para reuso
        window.supabaseClient = c;
        return c;
      } else {
        console.warn('[drops] import supabase-js: createClient não encontrado', mod);
      }
    } catch (err) {
      // erro ao importar; não fatal — faremos fallback REST
      console.warn('[drops] import supabase-js falhou:', err);
    }

    return null;
  }

  // fallback via REST para quando SDK não estiver disponível
  async function fetchDropsViaRest() {
    try {
      const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/drops?select=id,name_drop,image_drop&order=name_drop.asc`;
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

  // tenta resolver image_drop para uma URL pública usando o client; caso client seja null, retorna null
  async function resolveImageUrl(supabase, imageFieldValue) {
    if (!imageFieldValue) return null;
    const s = String(imageFieldValue).trim();
    if (/^https?:\/\//i.test(s)) return s;
    const path = s.replace(/^\/+/, '');

    if (!supabase || !supabase.storage || typeof supabase.storage.from !== 'function') {
      // fallback manual (assume bucket público)
      return SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/object/public/' + encodeURIComponent(DROPS_BUCKET) + '/' + encodeURIComponent(path).replace(/%2F/g, '/');
    }

    try {
      const bucket = supabase.storage.from(DROPS_BUCKET);
      if (bucket && typeof bucket.getPublicUrl === 'function') {
        const res = bucket.getPublicUrl(path);
        // lidar com variações de retorno
        if (res) {
          if (res.data && (res.data.publicUrl || res.data.publicURL)) return res.data.publicUrl || res.data.publicURL;
          if (res.publicUrl) return res.publicUrl;
          if (res.publicURL) return res.publicURL;
        }
      }
      if (bucket && typeof bucket.createSignedUrl === 'function') {
        // signed URL temporária (60s)
        const signed = await bucket.createSignedUrl(path, 60);
        if (signed && (signed.signedURL || (signed.data && signed.data.signedURL))) {
          return signed.signedURL || signed.data.signedURL;
        }
      }
    } catch (e) {
      console.warn('resolveImageUrl: supabase.storage API falhou, usando fallback manual', e);
    }

    return SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/object/public/' + encodeURIComponent(DROPS_BUCKET) + '/' + encodeURIComponent(path).replace(/%2F/g, '/');
  }

  // função que carrega e renderiza via SDK (assume supabase válido)
  async function loadDropsWithSdk(supabase, container) {
    setContainerMessage(container, 'Carregando drops do banco...');
    const q = supabase.from('drops').select('id, name_drop, image_drop').order('name_drop', { ascending: true });
    const res = await q;
    const { data, error } = res || {};
    if (error) {
      console.error('[drops] Erro na query SDK:', error);
      setContainerMessage(container, 'Erro ao buscar drops: ' + escapeHtml(String(error.message || error)));
      return false;
    }
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('[drops] Query SDK retornou vazio.');
      setContainerMessage(container, 'Nenhum drop encontrado na tabela `drops`.');
      return true; // carregou, mas vazio
    }

    // resolve imagens em paralelo
    const resolved = await Promise.all(data.map(d => resolveImageUrl(supabase, d.image_drop).catch(() => null)));
    const cols = data.map((d, i) => makeDropColumn(d, resolved[i]));
    clearAndRender(container, cols);
    console.log('[drops] renderizado (SDK)', cols.length, 'colunas.');
    return true;
  }

  // função que carrega e renderiza via REST (quando SDK indisponível)
  async function loadDropsWithRest(container) {
    setContainerMessage(container, 'Carregando drops (REST fallback)...');
    const restData = await fetchDropsViaRest();
    if (!restData) {
      setContainerMessage(container, 'Não foi possível carregar drops (SDK e REST falharam). Veja console.');
      return false;
    }
    const resolvedUrls = restData.map(d => {
      if (!d.image_drop) return null;
      if (/^https?:\/\//i.test(String(d.image_drop))) return d.image_drop;
      return SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/object/public/' + encodeURIComponent(DROPS_BUCKET) + '/' + encodeURIComponent(String(d.image_drop)).replace(/%2F/g, '/');
    });
    const cols = restData.map((d, idx) => makeDropColumn(d, resolvedUrls[idx]));
    clearAndRender(container, cols);
    console.log('[drops] renderizado (REST)', cols.length, 'colunas.');
    return true;
  }

  // tentativa segura de ativar realtime (se SDK suportar)
  function safeSubscribeRealtime(supabase, container) {
    if (!supabase) return;
    const debouncedReload = debounce(async () => {
      try {
        await loadDropsWithSdk(supabase, container);
      } catch (e) { console.warn('[drops realtime] reload error', e); }
    }, 300);

    // nova API (channel)
    if (typeof supabase.channel === 'function') {
      try {
        supabase
          .channel('public:drops')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'drops' }, () => {
            console.log('[drops realtime] payload (channel) — recarregando');
            debouncedReload();
          })
          .subscribe()
          .catch((e) => console.warn('[drops realtime] channel subscribe failed', e));
        console.log('[drops] realtime via channel inscrito.');
        return;
      } catch (e) {
        console.warn('[drops] realtime channel failed:', e);
      }
    }

    // API antiga: supabase.from('drops').on(...)
    try {
      const fromDrops = typeof supabase.from === 'function' ? supabase.from('drops') : null;
      if (fromDrops && typeof fromDrops.on === 'function') {
        fromDrops
          .on('INSERT', () => debouncedReload())
          .on('UPDATE', () => debouncedReload())
          .on('DELETE', () => debouncedReload())
          .subscribe();
        console.log('[drops] realtime via from().on() inscrito.');
      }
    } catch (e) {
      console.warn('[drops] realtime legacy subscribe failed:', e);
    }
  }

  // função principal
  async function initMain() {
    console.log('[drops] initMain: aguardando DOM...');
    const container = document.querySelector('.mega-imgs');
    if (!container) {
      console.error('[drops] container .mega-imgs não encontrado no DOM.');
      return;
    }
    console.log('[drops] container encontrado:', container);
    setContainerMessage(container, 'Carregando drops... (verifique console F12 se nada aparecer)');

    const supabase = await getSupabaseClientOrNull();

    // verifica se supabase tem a API esperada (.from)
    const hasSdk = !!(supabase && typeof supabase.from === 'function');

    if (!hasSdk) {
      console.warn('[drops] Supabase SDK não disponível ou inválido — usando REST fallback');
      const ok = await loadDropsWithRest(container);
      if (ok) {
        // nada de realtime quando só rest foi usado
      }
      return;
    }

    // temos SDK válido -> usar SDK
    try {
      const ok = await loadDropsWithSdk(supabase, container);
      if (!ok) return;
      // tentar realtime se possível
      safeSubscribeRealtime(supabase, container);
    } catch (e) {
      console.error('[drops] erro inesperado ao carregar drops via SDK:', e);
      // tenta REST como último recurso
      await loadDropsWithRest(container);
    }
  }

  // run once when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain, { once: true });
  } else {
    initMain();
  }

})();
