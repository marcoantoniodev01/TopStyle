// Importe seu cliente Supabase
import { supabase } from './supabaseClient.js'

/* ========================================================================== 
   1. ESTADO GLOBAL (DADOS E FILTROS)
   ========================================================================== */
let g_allProducts = []; // Guarda todos os produtos carregados
let g_activeFilters = {
    colors: [],
    minPrice: null,
    maxPrice: null
};

/* ========================================================================== 
   2. CONSTANTES E HELPERS
   ========================================================================== */
const PLACEHOLDER = 'https://placehold.co/400x600/eee/ccc?text=Sem+Imagem';

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function formatPriceBR(n) {
    if (n == null || isNaN(Number(n))) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));
}

// Resolve URL da Imagem (Supabase Storage). getPublicUrl é síncrono e retorna { data: { publicUrl } }
async function resolveImageUrl(imagePath) {
    if (!imagePath) return PLACEHOLDER;
    if (typeof imagePath === 'string' && imagePath.startsWith('http')) return imagePath;

    const path = String(imagePath).replace(/^\/+/, '');
    const buckets = ['product-images', 'drop-imgs'];
    try {
        for (const b of buckets) {
            const res = supabase.storage.from(b).getPublicUrl(path);
            if (res && res.data && (res.data.publicUrl || res.data.publicURL)) {
                return res.data.publicUrl || res.data.publicURL;
            }
            // alguns SDKs retornam { publicUrl } direto
            if (res && (res.publicUrl || res.publicURL)) return res.publicUrl || res.publicURL;
        }
    } catch (e) {
        console.warn('resolveImageUrl erro:', e);
    }
    return PLACEHOLDER;
}

/* ========================================================================== 
   3. SISTEMA DE FILTROS (SUA LÓGICA INTEGRADA)
   ========================================================================== */

function populateFiltersUI(products) {
    const colorsContainer = qs('#filtro-cores-container');
    const minPriceInput = qs('#filtro-preco-min');
    const maxPriceInput = qs('#filtro-preco-max');

    if (!colorsContainer) return; // Se não tiver filtro na página, sai.

    // Extrai cores únicas
    const allColors = products.flatMap(p => {
        let cores = p.cores;
        if (typeof cores === 'string') {
            try { cores = JSON.parse(cores); } catch (e) { cores = []; }
        }
        if (!Array.isArray(cores)) cores = [];
        return cores.map(c => (typeof c === 'object' ? (c.nome || '') : c));
    });

    const uniqueColors = [...new Set(allColors)].filter(Boolean).sort();

    // Renderiza Checkboxes de Cor (substitui conteúdo do container)
    colorsContainer.innerHTML = uniqueColors.map(color => `
        <label>
            <input type="checkbox" class="filtro-cor-check" value="${escapeHtml(color)}">
            ${escapeHtml(color)}
        </label>
    `).join('');

    // Define Placeholders de Preço
    const prices = products.map(p => p.price || p.preco || p['preço']).filter(n => Number(n) > 0);
    if (prices.length > 0) {
        const min = Math.floor(Math.min(...prices));
        const max = Math.ceil(Math.max(...prices));
        if (minPriceInput) minPriceInput.placeholder = `Min: ${min}`;
        if (maxPriceInput) maxPriceInput.placeholder = `Max: ${max}`;
    }
}

function attachFilterListeners() {
    // re-seleciona checkboxes (podem ter sido recriados)
    const colorCheckboxes = qsa('.filtro-cor-check');
    const applyPriceButton = qs('#btn-aplicar-preco');
    const clearButton = qs('#btn-limpar-filtros');
    const minInput = qs('#filtro-preco-min');
    const maxInput = qs('#filtro-preco-max');

    colorCheckboxes.forEach(check => {
        check.addEventListener('change', () => {
            g_activeFilters.colors = qsa('.filtro-cor-check:checked').map(c => c.value);
            applyFilters();
        });
    });

    if (applyPriceButton) {
        applyPriceButton.addEventListener('click', () => {
            const min = minInput && minInput.value ? parseFloat(minInput.value) : null;
            const max = maxInput && maxInput.value ? parseFloat(maxInput.value) : null;
            g_activeFilters.minPrice = min;
            g_activeFilters.maxPrice = max;
            applyFilters();
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            g_activeFilters = { colors: [], minPrice: null, maxPrice: null };
            if (minInput) minInput.value = '';
            if (maxInput) maxInput.value = '';
            qsa('.filtro-cor-check').forEach(c => c.checked = false);
            renderProductGrid(g_allProducts);
        });
    }
}

function applyFilters() {
    const { colors, minPrice, maxPrice } = g_activeFilters;

    const filtered = g_allProducts.filter(p => {
        const price = p.price || p.preco || p['preço'] || 0;

        if (minPrice != null && price < minPrice) return false;
        if (maxPrice != null && price > maxPrice) return false;

        if (colors.length > 0) {
            let pColors = p.cores;
            if (typeof pColors === 'string') {
                try { pColors = JSON.parse(pColors); } catch (e) { pColors = []; }
            }
            if (!Array.isArray(pColors)) return false;
            const colorNames = pColors.map(c => (typeof c === 'object' ? (c.nome || '') : c).toLowerCase());
            const hasColor = colors.some(selColor => colorNames.includes(selColor.toLowerCase()));
            if (!hasColor) return false;
        }

        return true;
    });

    renderProductGrid(filtered);
}

/* ========================================================================== 
   4. RENDERIZAÇÃO (AGORA COM .product-slot)
   ========================================================================== */

// Cria ou ajusta slots: cada slot é <div.product-slot><div.product>...</div></div>
function ensureProductSlots(container, count) {
    let slots = qsa('.product-slot', container);

    if (!slots || slots.length === 0) {
        // se não houver slots pre-existentes, cria um slot + product
        const s = document.createElement('div');
        s.className = 'product-slot';
        const p = document.createElement('div');
        p.className = 'product';
        s.appendChild(p);
        container.appendChild(s);
        slots = [s];
    }

    if (count > slots.length) {
        const toCreate = count - slots.length;
        const last = slots[slots.length - 1];
        for (let i = 0; i < toCreate; i++) {
            const clone = last.cloneNode(false); // sem filhos
            clone.innerHTML = '';
            clone.className = 'product-slot';
            const p = document.createElement('div');
            p.className = 'product';
            clone.appendChild(p);
            container.appendChild(clone);
        }
    }

    // garante que cada slot tem um filho .product
    slots = qsa('.product-slot', container);
    slots.forEach(slot => {
        if (!slot.querySelector(':scope > .product')) {
            const p = document.createElement('div');
            p.className = 'product';
            slot.appendChild(p);
        }
    });

    return qsa('.product-slot', container);
}

function renderSingleProductIntoSlot(slotEl, p) {
    // slotEl é .product-slot
    const prodDiv = slotEl.querySelector(':scope > .product');
    if (!prodDiv) return;
    const name = (p.name || p.nome || 'Produto sem nome').toString().toUpperCase();
    const price = formatPriceBR(p.price || p.preco || p['preço']);
    const img = p._resolvedImage || PLACEHOLDER;

    prodDiv.innerHTML = `
        <a href="Blusa-modelo02.html?id=${encodeURIComponent(p.id)}" class="product-link-selecao">
            <img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" loading="lazy">
            <div class="product-text">
                <span class="product-title">${escapeHtml(name)}</span>
                <span class="product-price">${price}</span>
            </div>
        </a>
    `;
    prodDiv.style.display = ''; // garante visível
    slotEl.style.display = '';
}

// Função que renderiza a grade inteira, garantindo o wrapper .product-slot
function renderProductGrid(products) {
    const container = qs('.product-content-selecao');
    if (!container) return;

    container.innerHTML = ''; // Limpa grid atual

    if (products.length === 0) {
        container.innerHTML = '<div class="empty-msg" style="width:100%; text-align:center; padding:40px;">Nenhum produto encontrado.</div>';
        return;
    }

    // Cria os slots
    products.forEach(product => {
        // 1. Cria o wrapper .product-slot
        const slotWrapper = document.createElement('div');
        slotWrapper.className = 'product-slot';

        // 2. Cria o elemento .product que vai DENTRO do wrapper
        const productDiv = document.createElement('div');
        productDiv.className = 'product';

        // 3. Renderiza o conteúdo do produto dentro da div .product
        renderSingleProduct(productDiv, product);

        // 4. Junta as partes
        slotWrapper.appendChild(productDiv);
        container.appendChild(slotWrapper);
    });
}

// A função renderSingleProduct (que monta o conteúdo do card) permanece a mesma
function renderSingleProduct(slotEl, p) {
    const name = (p.name || p.nome || 'Produto sem nome').toUpperCase();
    const price = formatPriceBR(p.price || p.preco || p['preço']);
    const img = p._resolvedImage || PLACEHOLDER;

    slotEl.innerHTML = `
        <a href="Blusa-modelo02.html?id=${p.id}" class="product-link-selecao">
            <img src="${img}" alt="${name}" loading="lazy">
            <div class="product-text">
                <span class="product-title">${name}</span>
                <span class="product-price">${price}</span>
            </div>
        </a>
    `;
}

/* ========================================================================== 
   5. LÓGICA PRINCIPAL (FETCH + INICIALIZAÇÃO)
   ========================================================================== */

async function main() {
    const container = qs('.product-content-selecao');
    if (container) container.innerHTML = '<div style="padding:20px; text-align:center;">Carregando produtos...</div>';

    const params = new URLSearchParams(window.location.search);
    const searchTerm = params.get('q');
    const collectionId = params.get('collection');

    try {
        let query = supabase.from('products').select('*');

        if (searchTerm) {
            const term = decodeURIComponent(searchTerm).trim();
            document.title = `Busca: ${term}`;
            const orQuery = `nome.ilike.%${term}%,category.ilike.%${term}%,dropName.ilike.%${term}%`;
            query = query.or(orQuery);
        } else if (collectionId) {
            query = query.eq('collection_id', collectionId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        g_allProducts = data || [];

        // Resolve imagens em paralelo
        await Promise.all(g_allProducts.map(async (p) => {
            let rawImg = p.image;
            if (!rawImg && p.cores) {
                try {
                    const c = typeof p.cores === 'string' ? JSON.parse(p.cores) : p.cores;
                    if (Array.isArray(c) && c[0]) rawImg = c[0].img1 || c[0].image;
                    else if (typeof c === 'object') rawImg = c.img1 || c.image;
                } catch (e) { /* noop */ }
            }
            p._resolvedImage = await resolveImageUrl(rawImg);
        }));

        // Inicializa filtros e UI
        populateFiltersUI(g_allProducts);
        attachFilterListeners();
        renderProductGrid(g_allProducts);

        const titleEl = qs('#collection-name');
        if (titleEl && searchTerm) titleEl.textContent = `Resultados para "${searchTerm}"`;

    } catch (err) {
        console.error('Erro fatal:', err);
        if (container) container.innerHTML = '<div style="padding:20px; text-align:center;">Erro ao carregar produtos.</div>';
    }
}

document.addEventListener('DOMContentLoaded', main);

/* small helper to escape HTML for inserted strings */
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}


