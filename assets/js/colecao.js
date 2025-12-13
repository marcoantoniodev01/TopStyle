// assets/js/colecao-slots.js
// carregar como módulo: <script type="module" src="assets/js/colecao-slots.js"></script>
import { supabase as importedSupabase } from './supabaseClient.js';

(() => {
  'use strict';

  const SUPABASE_URL = window.SUPABASE_URL || 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';
  const PRODUCT_BUCKET = 'product-images';
  const FALLBACK_BUCKET = 'drop-imgs'; // agora usado como fallback

  const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="#f3f3f3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#aaa" font-size="18">Sem imagem</text></svg>`
  );

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function formatPriceBR(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));
  }

  async function getClient() {
    if (importedSupabase) return importedSupabase;
    if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
    if (window.supabaseClient) return window.supabaseClient;
    try {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
      if (mod && typeof mod.createClient === 'function') {
        const c = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = c;
        return c;
      }
    } catch (e) {
      console.warn('getClient dynamic import falhou', e);
    }
    return null;
  }

  // tenta extrair uma string de URL / caminho a partir de vários formatos possíveis
  function extractImageCandidate(row) {
    if (!row) return null;

    // possíveis nomes de campo que já vi por aí
    const directCandidates = [
      'image', 'img', 'imagem', 'photo', 'foto', 'cover', 'thumbnail'
    ];
    for (const k of directCandidates) {
      if (row[k]) {
        const v = row[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
        if (typeof v === 'object' && v !== null) {
          // se for objeto com campos comuns
          const candidate = (v.img1 || v.image || v.url || v.src || null);
          if (candidate && typeof candidate === 'string') return candidate;
        }
      }
    }

    // coluna 'images' possivelmente array
    if (Array.isArray(row.images) && row.images.length) {
      const first = row.images[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object' && first !== null) {
        return first.img1 || first.image || first.url || first.src || null;
      }
    }

    // coluna 'cores' (pode ser string JSON, array ou objeto)
    const coresFields = [row.cores, row.cores_json, row.coresData, row.colours];
    for (const cf of coresFields) {
      if (!cf) continue;
      try {
        let candidate = cf;
        if (typeof cf === 'string') {
          // se for JSON string tente parse
          const str = cf.trim();
          if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
            try { candidate = JSON.parse(str); } catch (e) { candidate = str; }
          } else {
            // se for string simples provavelmente é caminho
            if (str) return str;
          }
        }
        if (Array.isArray(candidate) && candidate.length) {
          const f = candidate[0];
          if (typeof f === 'string') return f;
          if (typeof f === 'object' && f !== null) {
            return f.img1 || f.image || f.url || f.src || null;
          }
        }
        if (typeof candidate === 'object' && candidate !== null) {
          return candidate.img1 || candidate.image || candidate.url || candidate.src || null;
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    // por fim, se existe campo 'images' como string (csv) tente separar
    if (typeof row.images === 'string') {
      const s = row.images.split(',').map(x => x.trim()).find(Boolean);
      if (s) return s;
    }

    return null;
  }

  // tenta obter URL pública usando storage do client; tenta ambos os buckets
  async function resolveImageUrl(supabase, imageFieldValue) {
    if (!imageFieldValue) return null;
    const s = String(imageFieldValue).trim();
    if (/^https?:\/\//i.test(s)) return s;
    const path = s.replace(/^\/+/, '');

    async function tryBucket(bucketName) {
      try {
        if (!supabase || !supabase.storage || typeof supabase.storage.from !== 'function') return null;
        const bucket = supabase.storage.from(bucketName);
        if (typeof bucket.getPublicUrl === 'function') {
          const res = bucket.getPublicUrl(path);
          if (res) {
            if (res.data && (res.data.publicUrl || res.data.publicURL)) return res.data.publicUrl || res.data.publicURL;
            if (res.publicUrl) return res.publicUrl;
            if (res.publicURL) return res.publicURL;
          }
        }
        if (typeof bucket.createSignedUrl === 'function') {
          const signed = await bucket.createSignedUrl(path, 60);
          if (signed && (signed.signedURL || (signed.data && signed.data.signedURL))) return signed.signedURL || signed.data.signedURL;
        }
      } catch (e) {
        // não fatal
      }
      return null;
    }

    // tenta product bucket primeiro, depois fallback bucket
    let url = null;
    url = await tryBucket(PRODUCT_BUCKET);
    if (url) return url;
    url = await tryBucket(FALLBACK_BUCKET);
    if (url) return url;

    // fallback público construído (product bucket)
    const prefix = SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/object/public/' + encodeURIComponent(PRODUCT_BUCKET) + '/';
    return prefix + encodeURIComponent(path).replace(/%2F/g, '/');
  }

  async function fetchProductsFromDB(filters = {}) {
    const client = await getClient();
    if (!client) throw new Error('Supabase não disponível');
    let q = client.from('products').select('*');
    if (filters.dropName) q = q.ilike('dropName', `%${filters.dropName}%`);
    if (filters.category) q = q.ilike('category', `%${filters.category}%`);
    if (filters.limit) q = q.limit(filters.limit);
    const { data, error } = await q.order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // monta node .product no exato markup que você pediu
  function makeProductNode(prod) {
    const imgSrc = prod._resolvedImage || prod.image || PLACEHOLDER;
    const name = prod.name || prod.nome || prod.title || 'Produto';
    const price = prod.price ?? prod.preco ?? prod['preço'] ?? null;
    const href = `Blusa-modelo02.html?id=${encodeURIComponent(prod.id)}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'product';

    const a = document.createElement('a');
    a.className = 'product-link-selecao';
    a.href = href;

    const imgEl = document.createElement('img');
    imgEl.src = imgSrc;
    imgEl.alt = name;
    imgEl.loading = 'lazy';

    const txt = document.createElement('div');
    txt.className = 'product-text';

    const title = document.createElement('span');
    title.className = 'product-title';
    title.textContent = String(name).toUpperCase();

    const priceEl = document.createElement('span');
    priceEl.className = 'product-price';
    priceEl.textContent = price != null ? formatPriceBR(price) : '';

    txt.appendChild(title);
    txt.appendChild(priceEl);

    a.appendChild(imgEl);
    a.appendChild(txt);
    wrapper.appendChild(a);
    return wrapper;
  }

  // overlay simples (mantive a implementação)
  function injectLoadingStyles() {
    if (document.getElementById('colecao-loading-styles')) return;
    const css = `
      .colecao-loading-overlay { position:absolute;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:16px;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,0.12);z-index:99999;color:#222;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;}
      .colecao-loading-overlay .colecao-loader { width:48px;height:48px;border-radius:50%;border:5px solid rgba(0,0,0,0.08);border-top-color:#222;animation:colecao-spin 1s linear infinite; }
      @keyframes colecao-spin { to{ transform:rotate(360deg); } }
      .colecao-loading-overlay .colecao-msg { font-size:14px;color:#222; }
    `;
    const st = document.createElement('style');
    st.id = 'colecao-loading-styles';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }
  let _colecaoOverlay = null, _colecaoOverlayHandlers = null;
  function createLoadingOverlay() {
    if (_colecaoOverlay) return _colecaoOverlay;
    injectLoadingStyles();
    const el = document.createElement('div');
    el.className = 'colecao-loading-overlay';
    el.style.display = 'none';
    el.innerHTML = `<div class="colecao-loader" aria-hidden="true"></div><div class="colecao-msg">Carregando...</div>`;
    document.body.appendChild(el);
    _colecaoOverlay = el;
    return el;
  }
  function positionOverlayOverSection(overlay, sectionEl) {
    if (!overlay || !sectionEl) return;
    const rect = sectionEl.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const left = rect.left + window.scrollX;
    overlay.style.position = 'absolute';
    overlay.style.top = `${top}px`;
    overlay.style.left = `${left}px`;
    overlay.style.width = `${Math.max(0, rect.width)}px`;
    overlay.style.height = `${Math.max(0, rect.height)}px`;
  }
  function showLoadingOverSelection(message = 'Carregando...') {
    const section = document.querySelector('.selecao-products');
    if (!section) {
      let full = createLoadingOverlay();
      full.style.position = 'fixed'; full.style.top = '0'; full.style.left = '0';
      full.style.width = '100vw'; full.style.height = '100vh';
      full.querySelector('.colecao-msg').textContent = message; full.style.display = 'flex';
      return;
    }
    const overlay = createLoadingOverlay();
    overlay.querySelector('.colecao-msg').textContent = message;
    positionOverlayOverSection(overlay, section);
    overlay.style.display = 'flex';
    const handler = () => positionOverlayOverSection(overlay, section);
    _colecaoOverlayHandlers = handler;
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
  }
  function hideLoadingOverlay() {
    if (!_colecaoOverlay) return;
    _colecaoOverlay.style.display = 'none';
    if (_colecaoOverlayHandlers) {
      window.removeEventListener('scroll', _colecaoOverlayHandlers);
      window.removeEventListener('resize', _colecaoOverlayHandlers);
      _colecaoOverlayHandlers = null;
    }
  }

  async function main() {
    const dropName = (new URLSearchParams(window.location.search)).get('drop') || '';
    const container = qs('.product-content-selecao') || qs('.product-content');
    if (!container) { console.warn('container .product-content-selecao não encontrado'); return; }

    showLoadingOverSelection(`Carregando produtos da coleção ${dropName ? `"${dropName}"` : ''}`);

    let rows = [];
    try {
      rows = await fetchProductsFromDB({ dropName, limit: 48 });
    } catch (e) {
      console.error('Erro ao buscar products:', e);
      hideLoadingOverlay();
      container.innerHTML = `<div class="error">Erro ao buscar produtos. Veja console.</div>`;
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      hideLoadingOverlay();
      container.innerHTML = `<div class="empty">Nenhum produto encontrado para a coleção <strong>${escapeHtml(dropName)}</strong>.</div>`;
      return;
    }

    const client = await getClient();

    // resolve imagens para cada produto (usa extractImageCandidate)
    await Promise.all(rows.map(async r => {
      try {
        const candidate = extractImageCandidate(r) || r.image || r.img || (Array.isArray(r.images) && r.images[0]) || null;
        r._resolvedImage = await resolveImageUrl(client, candidate) || PLACEHOLDER;
      } catch (e) {
        r._resolvedImage = PLACEHOLDER;
      }
    }));

    // renderiza mantendo o markup que você pediu
    container.innerHTML = '';
    for (const p of rows) {
      container.appendChild(makeProductNode(p));
    }

    hideLoadingOverlay();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main); else main();

  // ===== mobile filter modal (mantive lógica anterior, sem alterações importantes) =====
  (function () {
    const ICON_ID = 'filter-icon';
    const FILTER_ID = 'filter';
    const CONTENT_SELECTOR = '.filtros-content';
    const MOBILE_MAX = 600;
    const filter = document.getElementById(FILTER_ID);

    function ensureCloseButton() {
      if (!filter) return null;
      const content = filter.querySelector(CONTENT_SELECTOR);
      if (!content) return null;
      let btn = content.querySelector('.filter-close-btn');
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-close-btn';
        btn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
        content.appendChild(btn);
        btn.addEventListener('click', closeMobileFilter);
      }
      return btn;
    }

    function isMobileWidth() { return window.innerWidth <= MOBILE_MAX; }
    function openMobileFilter() { if (!filter) return; filter.classList.add('mobile-open'); ensureCloseButton(); document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', onKeyDown); filter.addEventListener('click', onBackdropClick); }
    function closeMobileFilter() { if (!filter) return; filter.classList.remove('mobile-open'); document.documentElement.style.overflow = ''; document.body.style.overflow = ''; document.removeEventListener('keydown', onKeyDown); filter.removeEventListener('click', onBackdropClick); }
    function onBackdropClick(ev) { if (ev.target === filter) closeMobileFilter(); }
    function onKeyDown(ev) { if (ev.key === 'Escape' || ev.key === 'Esc') closeMobileFilter(); }

    window.clickFilter = function clickFilter() {
      if (!filter) return;
      if (isMobileWidth()) {
        if (filter.classList.contains('mobile-open')) closeMobileFilter(); else openMobileFilter();
      } else {
        filter.classList.toggle('active');
      }
    };

    window.addEventListener('resize', () => { if (!filter) return; if (!isMobileWidth() && filter.classList.contains('mobile-open')) closeMobileFilter(); });
    window.addEventListener('pagehide', () => { if (filter && filter.classList.contains('mobile-open')) closeMobileFilter(); });
    document.addEventListener('DOMContentLoaded', () => { if (isMobileWidth()) ensureCloseButton(); });
  })();

})();
