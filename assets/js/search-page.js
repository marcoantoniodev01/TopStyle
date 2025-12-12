// assets/js/colecao-slots.js
// Versão atualizada: Suporte a Pesquisa (?q=) + Loading Overlay + Coleções
(() => {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL || 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';

    const PRODUCT_BUCKET = 'product-images';
    const FALLBACK_BUCKET = 'drop-imgs';

    const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="#f3f3f3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#aaa" font-size="18">Sem imagem</text></svg>`
    );

    /* ----------------- small helpers ----------------- */
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

    // Substitua a função initSupabaseClient antiga por esta:
    async function initSupabaseClient() {
        // 1. Se já criamos o cliente antes, retorna ele
        if (window.supabaseClient) return window.supabaseClient;

        // 2. Verifica se a biblioteca foi carregada pelo HTML (Passo 1)
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            try {
                const c = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                window.supabaseClient = c;
                return c;
            } catch (err) {
                console.error('Erro ao criar cliente Supabase:', err);
                return null;
            }
        }

        // 3. Se chegou aqui, é porque esqueceu de colocar o script no HTML
        console.error('ERRO CRÍTICO: A biblioteca do Supabase não foi encontrada.');
        console.error('Adicione <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> no seu HTML antes deste script.');
        return null;
    }

    async function resolveImageUrl(supabase, imageFieldValue) {
        if (!imageFieldValue) return null;
        const s = String(imageFieldValue).trim();
        if (/^https?:\/\//i.test(s)) return s;
        const path = s.replace(/^\/+/, '');
        try {
            const tryBucket = async (bucketName) => {
                const bucket = supabase.storage.from(bucketName);
                if (typeof bucket.getPublicUrl === 'function') {
                    const res = bucket.getPublicUrl(path);
                    if (res && res.data && (res.data.publicUrl || res.data.publicURL)) return res.data.publicUrl || res.data.publicURL;
                    if (res && (res.publicUrl || res.publicURL)) return res.publicUrl || res.publicURL;
                }
                if (typeof bucket.createSignedUrl === 'function') {
                    const signed = await bucket.createSignedUrl(path, 60);
                    if (signed && (signed.signedURL || (signed.data && signed.data.signedURL))) return signed.signedURL || signed.data.signedURL;
                }
                return null;
            };

            let url = null;
            try { url = await tryBucket(PRODUCT_BUCKET); } catch (e) { /* noop */ }
            if (url) return url;
            try { url = await tryBucket(FALLBACK_BUCKET); } catch (e) { /* noop */ }
            if (url) return url;
        } catch (e) {
            console.warn('resolveImageUrl erro', e);
        }
        // fallback public path
        const prefix = SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/object/public/' + encodeURIComponent(PRODUCT_BUCKET) + '/';
        return prefix + encodeURIComponent(path).replace(/%2F/g, '/');
    }

    /* ----------------- DATA FETCHING (MODIFICADO PARA PESQUISA) ----------------- */

    async function fetchProductsFromDB(filters = {}) {
        try {
            const supabase = await initSupabaseClient();
            if (!supabase) throw new Error('Supabase não disponível');
            let query = supabase.from('products').select('*');

            // Lógica de Pesquisa (Search Term)
            if (filters.searchTerm) {
                const term = filters.searchTerm;
                // Procura no nome, categoria ou dropName (case insensitive com ilike)
                // Sintaxe do Supabase: column.ilike.%term%
                const orQuery = `nome.ilike.%${term}%,category.ilike.%${term}%,dropName.ilike.%${term}%`;
                query = query.or(orQuery);
            }
            // Lógica Padrão (Filtros de Coleção/Categoria)
            else {
                if (filters.category) query = query.eq('category', filters.category);
                if (filters.gender) query = query.eq('gender', filters.gender);
                if (filters.dropName) query = query.eq('dropName', filters.dropName);
            }

            const { data, error } = await query.order('created_at', { ascending: true });

            if (error) {
                console.warn('fetchProductsFromDB: erro query principal', error);

                // Fallback apenas se NÃO for pesquisa e tiver dropName (tentativa fuzzy)
                if (!filters.searchTerm && filters.dropName) {
                    const likeRes = await supabase.from('products').select('*').ilike('dropName', `%${filters.dropName}%`).order('created_at', { ascending: true });
                    if (likeRes.error) throw likeRes.error;
                    return likeRes.data || [];
                }
                throw error;
            }
            return data || [];
        } catch (err) {
            console.error('fetchProductsFromDB error', err);
            return [];
        }
    }

    /* ----------------- DOM HELPERS ----------------- */

    function ensureSlotIds() {
        const slots = qsa('.product-slot');
        let next = 1;
        slots.forEach(s => {
            if (!s.dataset.slot) s.dataset.slot = String(next++);
        });
    }

    function renderProductInSlot(slotEl, productData) {
        slotEl.innerHTML = '';
        const product = document.createElement('div');
        product.className = 'product';
        product.dataset.id = productData.id;
        product.dataset.tamanhos = productData.tamanhos || '';

        const mainImage = productData._resolvedImage || productData.image || 'https://placehold.co/400x600/eee/ccc?text=Produto';

        product.innerHTML = `
      <a class="product-link" href="Blusa-modelo02.html?id=${encodeURIComponent(productData.id)}">
        <img src="${escapeHtml(mainImage)}" alt="${escapeHtml((productData.name || productData.nome) || 'Produto')}">
      </a>
      <div class="product-text">
        <p class="product-title">${escapeHtml((productData.name || productData.nome || '').toString().toUpperCase())}</p>
        <p class="product-price">${formatPriceBR(productData.price ?? productData.preco ?? productData['preço'])}</p>
        <div class="product-options" style="display:none;">
          <div class="colors"></div>
          <div class="sizes"></div>
        </div>
      </div>`;

        product.__productMeta = productData;
        slotEl.appendChild(product);
    }

    function renderAddButtonInSlot(slotEl, slotId) {
        slotEl.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'add-product-btn';
        btn.textContent = '+ Adicionar Produto';
        btn.onclick = () => {
            if (typeof window.openAddProductModal === 'function') {
                window.openAddProductModal(slotId);
            } else {
                alert('Abrir modal de adicionar produto (implemente openAddProductModal). Slot: ' + slotId);
            }
        };
        slotEl.appendChild(btn);
    }

    /* ----------------- LOADING OVERLAY UTIL ----------------- */

    function injectLoadingStyles() {
        if (document.getElementById('colecao-loading-styles')) return;
        const css = `
      .colecao-loading-overlay {
        position: absolute;
        background: rgba(255,255,255,0.92);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 10px;
        padding: 16px;
        border-radius: 6px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        z-index: 99999;
        color: #222;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      }
      .colecao-loading-overlay .colecao-loader {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 5px solid rgba(0,0,0,0.08);
        border-top-color: #222;
        animation: colecao-spin 1s linear infinite;
      }
      @keyframes colecao-spin { to { transform: rotate(360deg); } }
      .colecao-loading-overlay .colecao-msg {
        font-size: 14px;
        color: #222;
      }
    `;
        const st = document.createElement('style');
        st.id = 'colecao-loading-styles';
        st.appendChild(document.createTextNode(css));
        document.head.appendChild(st);
    }

    let _colecaoOverlay = null;
    let _colecaoOverlayHandlers = null;

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
            full.style.position = 'fixed';
            full.style.top = '0';
            full.style.left = '0';
            full.style.width = '100vw';
            full.style.height = '100vh';
            full.querySelector('.colecao-msg').textContent = message;
            full.style.display = 'flex';
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

    /* ----------------- MAIN FLOW (Com Busca e Filtros) ----------------- */

    // Helper para pegar tanto ?drop= quanto ?q= (pesquisa)
    function getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            dropName: decodeURIComponent(params.get('drop') || ''),
            searchTerm: decodeURIComponent(params.get('q') || '')
        };
    }

    function extractImageFromCores(coresField) {
        if (!coresField) return null;
        try {
            let cores = coresField;
            if (typeof coresField === 'string') {
                const str = coresField.trim();
                if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
                    try { cores = JSON.parse(str); } catch (e) { cores = coresField; }
                }
            }
            if (Array.isArray(cores) && cores.length > 0) {
                const first = cores[0];
                if (!first) return null;
                return first.img1 || first.image || first.url || first.src || null;
            }
            if (typeof cores === 'object') {
                return cores.img1 || cores.image || cores.url || cores.src || null;
            }
            if (typeof cores === 'string') {
                const maybe = cores.trim();
                if (maybe) return maybe;
            }
        } catch (e) {
            console.warn('extractImageFromCores erro', e);
        }
        return null;
    }

    async function main() {
        const supabase = await initSupabaseClient();

        // Pega parâmetros de coleção ou pesquisa
        const { dropName, searchTerm } = getQueryParams();

        // Define Título da Página
        let displayTitle = 'Coleção';
        if (searchTerm) {
            displayTitle = `Resultados: "${searchTerm}"`;
        } else if (dropName) {
            displayTitle = dropName;
        }

        const container = qs('.product-content-selecao');
        if (!container) {
            console.warn('colecao-slots: container .product-content-selecao não encontrado');
            return;
        }

        // refs UI
        const filtroMinInput = qs('#filtro-preco-min');
        const filtroMaxInput = qs('#filtro-preco-max');
        const btnAplicar = qs('#btn-aplicar-preco');
        const btnLimpar = qs('#btn-limpar-filtros');
        const coresContainer = qs('#filtro-cores-container');

        // Mensagem de Loading apropriada
        const loadingMsg = searchTerm
            ? `Buscando por "${searchTerm}"...`
            : `Carregando coleção ${dropName ? `"${dropName}"` : ''}...`;

        showLoadingOverSelection(loadingMsg);

        // BUSCA PRODUTOS
        let rows = [];
        try {
            // Passa tanto dropName quanto searchTerm para a função de busca
            rows = await fetchProductsFromDB({ dropName: dropName, searchTerm: searchTerm });
        } catch (e) {
            console.error('Erro ao buscar products (principal):', e);
            hideLoadingOverlay();
            container.innerHTML = `<div class="error">Erro ao buscar produtos. Veja o console.</div>`;
            return;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            // Se a primeira busca falhar e não for pesquisa, tenta fallback (comportamento original)
            if (!searchTerm) {
                try {
                    const fallback = await fetchProductsFromDB({ dropName });
                    rows = fallback || [];
                } catch (e) {
                    console.error('Erro fallback fetchProducts:', e);
                    rows = [];
                }
            }

            if (!Array.isArray(rows) || rows.length === 0) {
                hideLoadingOverlay();
                const emptyMsg = searchTerm
                    ? `Nenhum produto encontrado para a pesquisa <strong>"${escapeHtml(searchTerm)}"</strong>.`
                    : `Nenhum produto encontrado para a coleção <strong>${escapeHtml(dropName)}</strong>.`;
                container.innerHTML = `<div class="empty">${emptyMsg}</div>`;
                return;
            }
        }

        // normaliza e resolve imagens
        const data = rows.map(r => {
            const name = r.name || r.nome || r.title || '';
            const price = (r.price !== undefined && r.price !== null) ? r.price : (r.preco !== undefined ? r.preco : (r['preço'] !== undefined ? r['preço'] : null));
            const coresField = r.cores ?? r.cores_json ?? r.coresData ?? null;
            const coresImageCandidate = extractImageFromCores(coresField);
            const image = coresImageCandidate || r.image || (Array.isArray(r.images) && r.images[0]) || r.images || null;
            const color = r.color || r.cor || '';
            const slug = r.slug || r.url_slug || '';
            return Object.assign({}, r, { name, price, image, color, slug, dropName: r.dropName || r.drop || '' });
        });

        try {
            await Promise.all(data.map(async (p) => {
                const imgField = p.image || (Array.isArray(p.images) && p.images[0]) || null;
                try {
                    p._resolvedImage = await resolveImageUrl(supabase, imgField) || PLACEHOLDER;
                } catch (e) {
                    p._resolvedImage = PLACEHOLDER;
                }
            }));
        } catch (e) {
            console.warn('Erro ao resolver imagens:', e);
        }

        // Gerenciamento de Slots
        let slots = qsa('.product-slot', container);
        if (!slots || slots.length === 0) {
            const s = document.createElement('div');
            s.className = 'product-slot';
            container.appendChild(s);
            slots = [s];
        }
        ensureSlotIds();
        slots = qsa('.product-slot', container);

        if (data.length > slots.length) {
            const toCreate = data.length - slots.length;
            const last = slots[slots.length - 1];
            for (let i = 0; i < toCreate; i++) {
                const clone = last.cloneNode(false);
                clone.innerHTML = '';
                clone.className = 'product-slot';
                container.appendChild(clone);
            }
            ensureSlotIds();
            slots = qsa('.product-slot', container);
        }

        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const prod = data[i];
            if (prod) {
                renderProductInSlot(slot, prod);
            } else {
                renderAddButtonInSlot(slot, slot.dataset.slot || (i + 1));
            }
        }

        // Filtros de cores na barra lateral
        const colors = Array.from(new Set(data.map(d => (d.color || '').trim()).filter(Boolean)));
        if (colors.length > 0 && coresContainer) {
            coresContainer.innerHTML = '';
            colors.forEach(col => {
                const id = 'cor-' + col.replace(/\s+/g, '-').toLowerCase();
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" value="${escapeHtml(col)}" id="${id}"> <span>${escapeHtml(col)}</span>`;
                coresContainer.appendChild(label);
            });
        }

        hideLoadingOverlay();

        /* ----------------- FILTROS CLIENT-SIDE (Preço/Cor) ----------------- */
        let currentList = data.slice();

        function applyFilters() {
            const min = parseFloat(filtroMinInput?.value || '');
            const max = parseFloat(filtroMaxInput?.value || '');
            const checkedColors = Array.from(document.querySelectorAll('#filtro-cores-container input[type="checkbox"]:checked')).map(i => i.value);

            let filtered = data.slice();
            if (!isNaN(min)) filtered = filtered.filter(p => Number(p.price) >= min);
            if (!isNaN(max)) filtered = filtered.filter(p => Number(p.price) <= max);
            if (checkedColors.length > 0) filtered = filtered.filter(p => checkedColors.includes((p.color || '').trim()));

            const containerSlots = qsa('.product-slot', container);
            if (filtered.length > containerSlots.length) {
                for (let i = containerSlots.length; i < filtered.length; i++) {
                    const newSlot = document.createElement('div');
                    newSlot.className = 'product-slot';
                    container.appendChild(newSlot);
                }
            }
            ensureSlotIds();
            const slotsNow = qsa('.product-slot', container);

            for (let i = 0; i < slotsNow.length; i++) {
                const slot = slotsNow[i];
                const prod = filtered[i];
                if (prod) renderProductInSlot(slot, prod);
                else renderAddButtonInSlot(slot, slot.dataset.slot || (i + 1));
            }

            currentList = filtered;
            if (currentList.length === 0) {
                container.innerHTML = `<div class="empty">Nenhum produto corresponde aos filtros.</div>`;
            }
        }

        btnAplicar?.addEventListener('click', (ev) => {
            ev?.preventDefault();
            applyFilters();
            container.scrollIntoView({ behavior: 'smooth' });
        });

        btnLimpar?.addEventListener('click', (ev) => {
            ev?.preventDefault();
            if (filtroMinInput) filtroMinInput.value = '';
            if (filtroMaxInput) filtroMaxInput.value = '';
            const checks = document.querySelectorAll('#filtro-cores-container input[type="checkbox"]');
            checks.forEach(c => c.checked = false);
            const containerSlots = qsa('.product-slot', container);
            for (let i = 0; i < containerSlots.length; i++) {
                const slot = containerSlots[i];
                const prod = data[i];
                if (prod) renderProductInSlot(slot, prod);
                else renderAddButtonInSlot(slot, slot.dataset.slot || (i + 1));
            }
            currentList = data.slice();
        });

    }

    // run on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

})();

/*=============== SERVICES MODAL (Sidebar de Filtros Mobile) ===============*/

(function () {
    const ICON_ID = 'filter-icon';
    const FILTER_ID = 'filter';
    const CONTENT_SELECTOR = '.filtros-content';
    const MOBILE_MAX = 600;

    const icon = document.getElementById(ICON_ID);
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

    function isMobileWidth() {
        return window.innerWidth <= MOBILE_MAX;
    }

    function openMobileFilter() {
        if (!filter) return;
        filter.classList.add('mobile-open');
        ensureCloseButton();
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown);
        filter.addEventListener('click', onBackdropClick);
    }

    function closeMobileFilter() {
        if (!filter) return;
        filter.classList.remove('mobile-open');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKeyDown);
        filter.removeEventListener('click', onBackdropClick);
    }

    function onBackdropClick(ev) {
        if (ev.target === filter) closeMobileFilter();
    }

    function onKeyDown(ev) {
        if (ev.key === 'Escape' || ev.key === 'Esc') closeMobileFilter();
    }

    window.clickFilter = function clickFilter() {
        if (!filter) return;
        if (isMobileWidth()) {
            if (filter.classList.contains('mobile-open')) closeMobileFilter();
            else openMobileFilter();
        } else {
            filter.classList.toggle('active');
        }
    };

    window.addEventListener('resize', () => {
        if (!filter) return;
        if (!isMobileWidth() && filter.classList.contains('mobile-open')) {
            closeMobileFilter();
        }
    });

    window.addEventListener('pagehide', () => {
        if (filter && filter.classList.contains('mobile-open')) closeMobileFilter();
    });

    document.addEventListener('DOMContentLoaded', () => {
        if (isMobileWidth()) ensureCloseButton();
    });
})();