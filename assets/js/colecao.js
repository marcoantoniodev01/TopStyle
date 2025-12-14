/* assets/js/colecao-slots.js */
import { supabase } from './supabaseClient.js';

/* ==========================================================================
   1. ESTADO GLOBAL E CONSTANTES
   ========================================================================== */
let g_allProducts = []; // Todos os produtos carregados do banco
let g_activeFilters = {
    colors: [],
    minPrice: null,
    maxPrice: null
};

const PRODUCT_BUCKET = 'product-images';
const FALLBACK_BUCKET = 'drop-imgs';
const PLACEHOLDER = 'https://placehold.co/400x600/eee/ccc?text=Sem+Imagem';

/* ==========================================================================
   2. HELPERS
   ========================================================================== */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function formatPriceBR(n) {
    if (n == null || isNaN(Number(n))) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Resolve URL da Imagem (tenta buckets do Supabase)
async function resolveImageUrl(imagePath) {
    if (!imagePath) return PLACEHOLDER;
    if (imagePath.startsWith('http')) return imagePath;
    
    const path = imagePath.replace(/^\/+/, '');
    
    // Tenta bucket principal
    let { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
    if (data && data.publicUrl && !data.publicUrl.endsWith('/null')) return data.publicUrl;

    // Tenta bucket fallback
    ({ data } = supabase.storage.from(FALLBACK_BUCKET).getPublicUrl(path));
    if (data && data.publicUrl) return data.publicUrl;

    return PLACEHOLDER;
}

/* ==========================================================================
   3. LOADING OVERLAY
   ========================================================================== */
function injectLoadingStyles() {
    if (document.getElementById('colecao-loading-styles')) return;
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
    style.id = 'colecao-loading-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}

function showLoading(container, msg = 'Carregando...') {
    injectLoadingStyles();
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    
    let overlay = container.querySelector('.colecao-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'colecao-loading-overlay';
        overlay.innerHTML = `<div class="colecao-loader"></div><div class="loading-msg">${msg}</div>`;
        container.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideLoading(container) {
    const overlay = container?.querySelector('.colecao-loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

/* ==========================================================================
   4. RENDERIZAÇÃO DE PRODUTOS
   ========================================================================== */

function renderProductGrid(products) {
    const container = qs('.product-content-selecao');
    if (!container) return;

    container.innerHTML = ''; // Limpa grid

    if (products.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.gridColumn = '1/-1';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.padding = '40px';
        emptyMsg.textContent = 'Nenhum produto encontrado com os filtros selecionados.';
        container.appendChild(emptyMsg);
        return;
    }

    // Renderiza Produtos (AGORA DENTRO DE .product-slot)
    products.forEach(product => {
        // 1. Cria o slot wrapper (.product-slot)
        const slotWrapper = document.createElement('div');
        slotWrapper.className = 'product-slot'; 
        
        // 2. Cria o elemento do produto (.product)
        const productEl = document.createElement('div');
        productEl.className = 'product';
        productEl.dataset.id = product.id; 

        // 3. Renderiza o conteúdo (<a>...</a>) dentro de .product
        renderSingleProductHTML(productEl, product); 
        
        // 4. Anexa .product dentro de .product-slot
        slotWrapper.appendChild(productEl);

        // 5. Metadados para Hover
        productEl.__productMeta = product;
        
        // 6. Anexa .product-slot ao container principal
        container.appendChild(slotWrapper);
    });

    // Reativa os listeners de Hover (se definidos em outro script)
    if (typeof window.prepareProductHoverAndOptions === 'function') {
        window.prepareProductHoverAndOptions();
    }
}

function renderSingleProductHTML(slotEl, p) {
    // slotEl é agora a div.product
    const name = (p.name || p.nome || 'Produto').toUpperCase();
    const price = formatPriceBR(p.price || p.preco || p['preço']);
    const img = p._resolvedImage || PLACEHOLDER;

    slotEl.innerHTML = `
        <a href="Blusa-modelo02.html?id=${p.id}" class="product-link-selecao">
            <img src="${img}" alt="${escapeHtml(name)}" loading="lazy">
            <div class="product-text">
                <span class="product-title">${escapeHtml(name)}</span>
                <span class="product-price">${price}</span>
                <div class="product-options" style="display:none;">
                    <div class="colors"></div>
                    <div class="sizes"></div>
                </div>
            </div>
        </a>
    `;
}

/* ==========================================================================
   5. LÓGICA DE FILTROS (UI & COMPORTAMENTO)
   ========================================================================== */

function populateFiltersUI(products) {
    const colorsContainer = qs('#filtro-cores-container');
    const minPriceInput = qs('#filtro-preco-min');
    const maxPriceInput = qs('#filtro-preco-max');

    if (!colorsContainer) return;

    // Extrai cores únicas
    const allColors = products.flatMap(p => {
        let cores = p.cores;
        if (typeof cores === 'string') {
            try { cores = JSON.parse(cores); } catch(e) { cores = []; }
        }
        if (!Array.isArray(cores)) cores = [];
        return cores.map(c => c.nome || c);
    });
    
    const uniqueColors = [...new Set(allColors)].filter(Boolean).sort();

    colorsContainer.innerHTML = uniqueColors.map(color => `
        <label>
            <input type="checkbox" class="filtro-cor-check" value="${color}">
            <span>${color}</span>
        </label>
    `).join('');

    // Define Placeholders de Preço
    const prices = products.map(p => Number(p.price || p.preco)).filter(n => n > 0);
    if (prices.length > 0) {
        const min = Math.floor(Math.min(...prices));
        const max = Math.ceil(Math.max(...prices));
        if(minPriceInput) minPriceInput.placeholder = `Mín: ${min}`;
        if(maxPriceInput) maxPriceInput.placeholder = `Máx: ${max}`;
    }
}

function attachFilterListeners() {
    const colorCheckboxes = qsa('.filtro-cor-check');
    const applyPriceButton = qs('#btn-aplicar-preco');
    const clearButton = qs('#btn-limpar-filtros');
    const minInput = qs('#filtro-preco-min');
    const maxInput = qs('#filtro-preco-max');

    // Cores
    qs('#filtro-cores-container')?.addEventListener('change', () => {
        g_activeFilters.colors = qsa('.filtro-cor-check:checked').map(c => c.value);
        applyFilters();
    });

    // Preço
    applyPriceButton?.addEventListener('click', (e) => {
        e.preventDefault();
        const min = minInput.value ? parseFloat(minInput.value) : null;
        const max = maxInput.value ? parseFloat(maxInput.value) : null;
        g_activeFilters.minPrice = min;
        g_activeFilters.maxPrice = max;
        applyFilters();
    });

    // Limpar
    clearButton?.addEventListener('click', (e) => {
        e.preventDefault();
        g_activeFilters = { colors: [], minPrice: null, maxPrice: null };
        if(minInput) minInput.value = '';
        if(maxInput) maxInput.value = '';
        qsa('.filtro-cor-check').forEach(c => c.checked = false);
        renderProductGrid(g_allProducts);
    });
}

function applyFilters() {
    const { colors, minPrice, maxPrice } = g_activeFilters;

    const filtered = g_allProducts.filter(p => {
        const price = Number(p.price || p.preco || 0);
        
        // Filtro Preço
        if (minPrice != null && price < minPrice) return false;
        if (maxPrice != null && price > maxPrice) return false;

        // Filtro Cor
        if (colors.length > 0) {
            let pColors = p.cores;
            if (typeof pColors === 'string') try { pColors = JSON.parse(pColors); } catch { pColors = []; }
            if (!Array.isArray(pColors)) return false;
            
            const colorNames = pColors.map(c => (c.nome || c).toString().toLowerCase());
            const hasColor = colors.some(sel => colorNames.includes(sel.toLowerCase()));
            if (!hasColor) return false;
        }

        return true;
    });

    renderProductGrid(filtered);
}

/* ==========================================================================
   6. FUNÇÃO PRINCIPAL (INICIALIZAÇÃO)
   ========================================================================== */

async function main() {
    const container = qs('.product-content-selecao');
    if (!container) return; 

    showLoading(container);

    // A. Detectar Apenas o Drop da URL
    const params = new URLSearchParams(window.location.search);
    const qDrop = params.get('drop');

    // Título da página
    const titleEl = qs('#collection-name');
    if (titleEl) {
        if (qDrop) titleEl.textContent = decodeURIComponent(qDrop);
        else titleEl.textContent = 'Coleção';
    }

    try {
        // B. Query ao Supabase
        if (!supabase) throw new Error('Cliente Supabase não inicializado');
        
        let query = supabase.from('products').select('*');

        // Lógica de busca: Apenas pelo dropName se existir
        if (qDrop) {
            query = query.eq('dropName', decodeURIComponent(qDrop));
        } else {
            // Se não houver drop, pode retornar vazio ou uma lista padrão.
            // Aqui, vamos apenas retornar a lista completa se não houver filtro, mas você pode ajustar.
        }
        
        const { data, error } = await query.order('created_at', { ascending: true });
        
        if (error) throw error;

        g_allProducts = data || [];

        // C. Resolver Imagens em Paralelo
        await Promise.all(g_allProducts.map(async (p) => {
            // Tenta pegar imagem da coluna 'image' ou do primeiro item de 'cores'
            let rawImg = p.image || p.img;
            if (!rawImg && p.cores) {
                try {
                    const c = typeof p.cores === 'string' ? JSON.parse(c) : c;
                    if (Array.isArray(c) && c.length > 0) rawImg = c[0].img1 || c[0].image;
                } catch {}
            }
            p._resolvedImage = await resolveImageUrl(rawImg);
        }));

        // D. Inicializar Interface
        hideLoading(container);
        populateFiltersUI(g_allProducts);
        attachFilterListeners();
        renderProductGrid(g_allProducts);

    } catch (err) {
        console.error('Erro ao carregar coleção:', err);
        hideLoading(container);
        container.innerHTML = '<div style="padding:20px; text-align:center;">Erro ao carregar produtos. Verifique sua conexão.</div>';
    }
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

/* ==========================================================================
   7. MODAL MOBILE (SIDEBAR FILTROS)
   ========================================================================== */
(function () {
    const FILTER_ID = 'filter';
    const CONTENT_SELECTOR = '.filtros-content';
    const MOBILE_MAX = 600;
    const filter = document.getElementById(FILTER_ID);

    if (!filter) return;

    function ensureCloseButton() {
        const content = filter.querySelector(CONTENT_SELECTOR);
        if (!content) return;
        if (!content.querySelector('.filter-close-btn')) {
            const btn = document.createElement('button');
            btn.className = 'filter-close-btn';
            btn.innerHTML = '<i class="bi bi-x-lg"></i>';
            content.appendChild(btn);
            btn.onclick = closeMobileFilter;
        }
    }

    function isMobileWidth() { return window.innerWidth <= MOBILE_MAX; }

    function openMobileFilter() {
        filter.classList.add('mobile-open');
        ensureCloseButton();
        document.body.style.overflow = 'hidden';
        filter.addEventListener('click', onBackdropClick);
    }

    function closeMobileFilter() {
        filter.classList.remove('mobile-open');
        document.body.style.overflow = '';
        filter.removeEventListener('click', onBackdropClick);
    }

    function onBackdropClick(ev) { if (ev.target === filter) closeMobileFilter(); }

    // Expõe globalmente para o onclick no HTML
    window.clickFilter = function clickFilter() {
        if (isMobileWidth()) {
            filter.classList.contains('mobile-open') ? closeMobileFilter() : openMobileFilter();
        } else {
            filter.classList.toggle('active');
        }
    };

    window.addEventListener('resize', () => {
        if (!isMobileWidth() && filter.classList.contains('mobile-open')) closeMobileFilter();
    });
})();

