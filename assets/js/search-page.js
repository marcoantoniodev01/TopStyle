// assets/js/colecao-slots.js
// Versão Limpa: Apenas Pesquisa e Renderização de Produtos
import { supabase } from './supabaseClient.js';

// Constantes
const PRODUCT_BUCKET = 'product-images';
const FALLBACK_BUCKET = 'drop-imgs'; // Mantido caso haja imagens antigas aqui

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

// Helper para resolver URL da imagem no Storage
async function resolveImageUrl(imageFieldValue) {
    if (!imageFieldValue) return null;
    const s = String(imageFieldValue).trim();
    if (/^https?:\/\//i.test(s)) return s;
    const path = s.replace(/^\/+/, '');
    
    try {
        const tryBucket = async (bucketName) => {
            const bucket = supabase.storage.from(bucketName);
            const { data } = bucket.getPublicUrl(path);
            if (data && data.publicUrl) return data.publicUrl;
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

/* ----------------- BUSCA NO BANCO DE DADOS ----------------- */

async function fetchSearchResults(searchTerm) {
    try {
        if (!supabase) throw new Error('Supabase client não importado corretamente');
        
        let query = supabase.from('products').select('*');

        if (searchTerm) {
            // Busca o termo nas colunas nome, category ou dropName
            const orQuery = `nome.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,dropName.ilike.%${searchTerm}%`;
            query = query.or(orQuery);
        } else {
            // Se não tiver termo de pesquisa, não retorna nada (ou retorne tudo se preferir)
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

/* ----------------- RENDERIZAÇÃO NO HTML ----------------- */

function ensureProductDivs(container, count) {
    // Pega as divs .product existentes
    let slots = qsa('.product', container);

    // Se não existir nenhuma, cria a primeira
    if (!slots || slots.length === 0) {
        const s = document.createElement('div');
        s.className = 'product';
        container.appendChild(s);
        slots = [s];
    }

    // Se precisar de mais, clona a última
    if (count > slots.length) {
        const toCreate = count - slots.length;
        const last = slots[slots.length - 1]; 
        for (let i = 0; i < toCreate; i++) {
            const clone = last.cloneNode(false);
            clone.innerHTML = '';
            clone.className = 'product'; 
            container.appendChild(clone);
        }
    }
    
    // Atualiza a lista e retorna
    return qsa('.product', container);
}

function renderProduct(slotEl, productData) {
    slotEl.innerHTML = ''; 
    slotEl.dataset.id = productData.id;
    slotEl.style.display = ''; // Garante que está visível

    const mainImage = productData._resolvedImage || productData.image || 'https://placehold.co/400x600/eee/ccc?text=Produto';
    const prodName = (productData.name || productData.nome || '').toString().toUpperCase();
    const prodPrice = formatPriceBR(productData.price ?? productData.preco ?? productData['preço']);

    // --- ESTRUTURA HTML SOLICITADA ---
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

    slotEl.appendChild(link);
}

/* ----------------- LOADING OVERLAY (MANTIDO PARA UX) ----------------- */

function createLoadingOverlay() {
    if (document.getElementById('colecao-loading-overlay')) return document.getElementById('colecao-loading-overlay');
    
    // Injeta CSS
    const css = `
        .colecao-loading-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255,255,255,0.92); z-index: 999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            border-radius: 6px;
        }
        .colecao-loader {
            width: 40px; height: 40px; border-radius: 50%;
            border: 4px solid #eee; border-top-color: #333;
            animation: spin 1s linear infinite; margin-bottom: 10px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    `;
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'colecao-loading-overlay';
    el.className = 'colecao-loading-overlay';
    el.innerHTML = `<div class="colecao-loader"></div><div id="loading-msg">Buscando...</div>`;
    return el;
}

function showLoading(container, msg) {
    const overlay = createLoadingOverlay();
    overlay.querySelector('#loading-msg').textContent = msg;
    // Garante que o container tenha posição relativa para o overlay cobrir ele
    if(getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(overlay);
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('colecao-loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

/* ----------------- FLUXO PRINCIPAL ----------------- */

async function main() {
    // 1. Pega o termo de pesquisa da URL (?q=term)
    const params = new URLSearchParams(window.location.search);
    const searchTerm = decodeURIComponent(params.get('q') || '').trim();

    // 2. Atualiza título da página
    if (searchTerm) {
        document.title = `Pesquisa: "${searchTerm}"`;
        const collEl = qs('#collection-name'); // Se existir elemento de título na página
        if (collEl) collEl.textContent = `Resultados para: "${searchTerm}"`;
    }

    const container = qs('.product-content-selecao');
    if (!container) {
        console.warn('Container .product-content-selecao não encontrado.');
        return;
    }

    // 3. Mostra Loading
    showLoading(container, searchTerm ? `Procurando por "${searchTerm}"...` : 'Aguardando pesquisa...');

    // 4. Busca dados
    let rows = [];
    if (searchTerm) {
        rows = await fetchSearchResults(searchTerm);
    }

    // 5. Verifica se veio vazio
    if (!rows || rows.length === 0) {
        hideLoading();
        // Limpa slots existentes ou esconde
        qsa('.product', container).forEach(el => el.style.display = 'none');
        
        // Mostra mensagem
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

    // Remove mensagem de vazio se existir
    const emptyDiv = qs('.empty-msg', container);
    if(emptyDiv) emptyDiv.style.display = 'none';

    // 6. Resolve Imagens em paralelo
    // Tenta pegar imagem do JSON de cores ou da coluna image
    const data = rows.map(r => {
        let imgSrc = r.image;
        // Tenta extrair de cores se image for nula
        if (!imgSrc && r.cores) {
            try {
                const c = typeof r.cores === 'string' ? JSON.parse(r.cores) : r.cores;
                if (Array.isArray(c) && c[0]) imgSrc = c[0].img1 || c[0].image;
                else if (typeof c === 'object') imgSrc = c.img1 || c.image;
            } catch(e){}
        }
        return { ...r, _rawImage: imgSrc };
    });

    try {
        await Promise.all(data.map(async (p) => {
            p._resolvedImage = await resolveImageUrl(p._rawImage) || PLACEHOLDER;
        }));
    } catch (e) { console.warn('Erro imagens', e); }

    // 7. Renderiza na DOM
    // Garante que temos divs .product suficientes
    const slots = ensureProductDivs(container, data.length);

    // Preenche cada slot
    for (let i = 0; i < slots.length; i++) {
        if (i < data.length) {
            renderProduct(slots[i], data[i]);
        } else {
            // Esconde slots excedentes
            slots[i].style.display = 'none';
        }
    }

    hideLoading();
}

// Inicializa
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
