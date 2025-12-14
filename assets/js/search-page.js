// assets/js/colecao-slots.js
// Versão Limpa: Apenas Pesquisa e Renderização de Produtos (cada .product fica dentro de .product-slot)
import { supabase } from './supabaseClient.js';

// Constantes
const PRODUCT_BUCKET = 'product-images';
const FALLBACK_BUCKET = 'drop-imgs';

const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="#f3f3f3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#aaa" font-size="18">Sem imagem</text></svg>`
);

/* ----------------- HELPERS BÁSICOS ----------------- */
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

/* ----------------- Helper resolver imagem ----------------- */
async function resolveImageUrl(imageFieldValue) {
    if (!imageFieldValue) return null;
    const s = String(imageFieldValue).trim();
    if (/^https?:\/\//i.test(s)) return s;
    const path = s.replace(/^\/+/, '');

    try {
        const tryBucket = async (bucketName) => {
            const bucket = supabase.storage.from(bucketName);
            // getPublicUrl pode retornar { data: { publicUrl } }
            const res = bucket.getPublicUrl(path);
            if (res && res.data && (res.data.publicUrl || res.data.publicURL)) return res.data.publicUrl || res.data.publicURL;
            if (res && (res.publicUrl || res.publicURL)) return res.publicUrl || res.publicURL;
            return null;
        };

        let url = null;
        try { url = await tryBucket(PRODUCT_BUCKET); } catch (e) { /* noop */ }
        if (url) return url;
        try { url = await tryBucket(FALLBACK_BUCKET); } catch (e) { /* noop */ }
        if (url) return url;
    } catch (e) {
        console.warn('Erro ao resolver imagem:', e);
    }
    return null;
}

/* ----------------- BUSCA ----------------- */
async function fetchSearchResults(searchTerm) {
    try {
        if (!supabase) throw new Error('Supabase client não importado corretamente');
        let query = supabase.from('products').select('*');

        if (searchTerm) {
            const orQuery = `nome.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,dropName.ilike.%${searchTerm}%`;
            query = query.or(orQuery);
        } else {
            return [];
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Erro na busca:', err);
        return [];
    }
}

/* ----------------- SLOTS (cada .product dentro de .product-slot) ----------------- */
function ensureProductSlots(container, count) {
    // retorna lista de elementos .product-slot (cada um deve conter um .product)
    let slots = qsa('.product-slot', container);

    // se não existir nenhum slot, cria um com .product dentro
    if (!slots || slots.length === 0) {
        const s = document.createElement('div');
        s.className = 'product-slot';
        const p = document.createElement('div');
        p.className = 'product';
        s.appendChild(p);
        container.appendChild(s);
        slots = [s];
    }

    // se precisar de mais slots, clona o último slot (sem conteúdo interno) e coloca um .product filho
    if (count > slots.length) {
        const toCreate = count - slots.length;
        const last = slots[slots.length - 1];
        for (let i = 0; i < toCreate; i++) {
            const clone = last.cloneNode(false); // não clona filhos
            clone.innerHTML = '';
            clone.className = 'product-slot';
            const p = document.createElement('div');
            p.className = 'product';
            clone.appendChild(p);
            container.appendChild(clone);
        }
    }

    // atualizar lista
    slots = qsa('.product-slot', container);

    // garantir que cada slot tenha exatamente um elemento .product como filho direto
    slots.forEach(slot => {
        let prod = slot.querySelector(':scope > .product');
        if (!prod) {
            prod = document.createElement('div');
            prod.className = 'product';
            slot.appendChild(prod);
        }
    });

    return qsa('.product-slot', container);
}

/* ----------------- RENDER de produto dentro do slot ----------------- */
function renderProductInSlot(slotEl, productData) {
    // slotEl é .product-slot
    let prod = slotEl.querySelector(':scope > .product');
    if (!prod) {
        prod = document.createElement('div');
        prod.className = 'product';
        slotEl.appendChild(prod);
    }
    // garantir visibilidade do slot e produto
    slotEl.style.display = '';
    prod.style.display = '';

    prod.dataset.id = productData.id ?? '';
    prod.innerHTML = ''; // limpa

    const mainImage = productData._resolvedImage || productData.image || 'https://placehold.co/300x400/eee/999?text=Produto';
    const prodName = (productData.name || productData.nome || '').toString().toUpperCase();
    const prodPrice = formatPriceBR(productData.price ?? productData.preco ?? productData['preço']);

    // construímos a estrutura pedida: <a class="product-link-selecao"> ... </a>
    const link = document.createElement('a');
    link.href = `produto.html?id=${encodeURIComponent(productData.id)}`;
    link.className = 'product-link-selecao';

    link.innerHTML = `
        <img src="${escapeHtml(mainImage)}" alt="${escapeHtml(prodName)}">
        <div class="product-text">
            <span class="product-title">${escapeHtml(prodName)}</span>
            <span class="product-price">${prodPrice}</span>
        </div>
    `;

    prod.appendChild(link);
}

/* ----------------- Render fallback slot (botão) ----------------- */
function renderAddButtonInSlot(slotEl, slotId) {
    let prod = slotEl.querySelector(':scope > .product');
    if (!prod) {
        prod = document.createElement('div');
        prod.className = 'product';
        slotEl.appendChild(prod);
    }
    prod.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'add-product-btn';
    btn.type = 'button';
    btn.textContent = '+ Adicionar Produto';
    btn.addEventListener('click', () => {
        if (typeof window.openAddProductModal === 'function') window.openAddProductModal(slotId);
        else alert('Abrir modal de adicionar produto (implemente openAddProductModal). Slot: ' + slotId);
    });
    prod.appendChild(btn);
}

/* ----------------- Loading overlay (apenas nó, sem CSS injetado) ----------------- */
function createLoadingOverlay() {
    let existing = document.getElementById('colecao-loading-overlay');
    if (existing) return existing;
    const el = document.createElement('div');
    el.id = 'colecao-loading-overlay';
    el.className = 'colecao-loading-overlay';
    const loader = document.createElement('div');
    loader.className = 'colecao-loader';
    const msg = document.createElement('div');
    msg.id = 'loading-msg';
    msg.textContent = 'Buscando...';
    el.appendChild(loader);
    el.appendChild(msg);
    return el;
}

function showLoading(container, msg) {
    const overlay = createLoadingOverlay();
    const msgEl = overlay.querySelector('#loading-msg');
    if (msgEl) msgEl.textContent = msg || 'Carregando...';
    if (!container.contains(overlay)) container.appendChild(overlay);
    overlay.classList.add('visible');
}

function hideLoading() {
    const overlay = document.getElementById('colecao-loading-overlay');
    if (!overlay) return;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

/* ----------------- FLUXO PRINCIPAL ----------------- */
async function main() {
    const params = new URLSearchParams(window.location.search);
    const searchTerm = decodeURIComponent(params.get('q') || '').trim();

    if (searchTerm) {
        document.title = `Pesquisa: "${searchTerm}"`;
        const collEl = qs('#collection-name');
        if (collEl) collEl.textContent = `Resultados para: "${searchTerm}"`;
    }

    const container = qs('.product-content-selecao');
    if (!container) {
        console.warn('Container .product-content-selecao não encontrado.');
        return;
    }

    showLoading(container, searchTerm ? `Procurando por "${searchTerm}"...` : 'Aguardando pesquisa...');

    let rows = [];
    if (searchTerm) rows = await fetchSearchResults(searchTerm);

    if (!rows || rows.length === 0) {
        hideLoading();
        // esconde produtos existentes
        qsa('.product-slot', container).forEach(slot => slot.style.display = 'none');

        const msg = searchTerm
            ? `Nenhum produto encontrado para "<strong>${escapeHtml(searchTerm)}</strong>".`
            : `Digite algo para pesquisar.`;

        let emptyDiv = qs('.empty-msg', container);
        if (!emptyDiv) {
            emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-msg';
            emptyDiv.style.gridColumn = '1/-1';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.style.padding = '40px';
            container.appendChild(emptyDiv);
        }
        emptyDiv.innerHTML = msg;
        emptyDiv.style.display = 'block';
        return;
    }

    const emptyDiv = qs('.empty-msg', container);
    if (emptyDiv) emptyDiv.style.display = 'none';

    // prepara dados com imagens
    const data = rows.map(r => {
        let imgSrc = r.image;
        if (!imgSrc && r.cores) {
            try {
                const c = typeof r.cores === 'string' ? JSON.parse(r.cores) : r.cores;
                if (Array.isArray(c) && c[0]) imgSrc = c[0].img1 || c[0].image;
                else if (typeof c === 'object') imgSrc = c.img1 || c.image;
            } catch (e) {}
        }
        return { ...r, _rawImage: imgSrc };
    });

    try {
        await Promise.all(data.map(async p => {
            p._resolvedImage = await resolveImageUrl(p._rawImage) || PLACEHOLDER;
        }));
    } catch (e) {
        console.warn('Erro resolvendo imagens', e);
    }

    // garante slots
    const slots = ensureProductSlots(container, data.length);

    // renderiza
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (i < data.length) {
            renderProductInSlot(slot, data[i]);
        } else {
            // esconde slot extra
            slot.style.display = 'none';
        }
    }

    hideLoading();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
