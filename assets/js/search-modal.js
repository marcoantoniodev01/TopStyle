// assets/js/search-modal.js
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {

    // usa o cliente importado
    const searchClient = supabase;

    // Elementos do DOM
    const openSearchBtn = document.getElementById('open-search-btn');
    const openSearchBtnMobile = document.getElementById('open-search-btn-mobile');
    const closeSearchBtn = document.getElementById('close-search-btn');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchOverlay = document.querySelector('.search-overlay');

    // 1. Abrir / Fechar modal
    function openModal() {
        if (!searchModal) return;
        searchModal.classList.add('active');
        setTimeout(() => searchInput?.focus(), 300);
    }

    function closeModal() {
        if (!searchModal) return;
        searchModal.classList.remove('active');
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';
    }

    openSearchBtn?.addEventListener('click', openModal);
    openSearchBtnMobile?.addEventListener('click', openModal);
    closeSearchBtn?.addEventListener('click', closeModal);
    searchOverlay?.addEventListener('click', closeModal);

    // 2. Debounce
    function debounce(func, wait = 400) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // 3. Pesquisa
    const performSearch = async (termo) => {
        if (!searchResults) return;
        if (!termo || termo.trim().length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        const q = termo.trim();

        if (!searchClient || typeof searchClient.from !== 'function') {
            searchResults.innerHTML = '<div class="no-results">Erro: Supabase não inicializado.</div>';
            console.error('Cliente Supabase não está configurado corretamente (import supabase falhou).');
            return;
        }

        searchResults.innerHTML = '<div class="no-results">Buscando...</div>';

        try {
            const { data, error } = await searchClient
                .from('products')
                .select('*')
                .or(`nome.ilike.%${q}%,category.ilike.%${q}%,dropName.ilike.%${q}%`)
                .limit(10);

            if (error) throw error;

            renderResults(data);
        } catch (err) {
            console.error('Erro na pesquisa:', err);
            searchResults.innerHTML = '<div class="no-results">Erro ao buscar. Tente novamente.</div>';
        }
    };

    // 4. Renderizar resultados
    function renderResults(produtos) {
        if (!searchResults) return;
        searchResults.innerHTML = '';

        if (!produtos || produtos.length === 0) {
            searchResults.innerHTML = '<div class="no-results">Nenhum produto encontrado.</div>';
            return;
        }

        produtos.forEach(prod => {
            const imgUrl = prod.img || prod.image || (prod.cores && (Array.isArray(prod.cores) ? prod.cores[0] : prod.cores)) || '';
            const nome = prod.nome || prod.name || prod.title || 'Produto';
            const category = prod.category || '';
            const dropName = prod.dropName || '';
            const preco = (prod.preco ?? prod.price ?? prod['preço'] ?? 0);

            const item = document.createElement('a');
            item.className = 'search-item';
            item.href = `Blusa-modelo02.html?id=${encodeURIComponent(prod.id)}`;

            item.innerHTML = `
                <img src="${escapeHtml(imgUrl) || ''}" alt="${escapeHtml(nome)}">
                <div class="search-item-info">
                    <h4>${escapeHtml(nome)}</h4>
                    <span>${escapeHtml(category)}${dropName ? ' | ' + escapeHtml(dropName) : ''}</span>
                </div>
                <div class="search-item-price">
                    ${isFinite(Number(preco)) ? 'R$ ' + Number(preco).toFixed(2) : ''}
                </div>
            `;

            searchResults.appendChild(item);
        });
    }

    // small helper (escape)
    function escapeHtml(s) {
        if (s === undefined || s === null) return '';
        return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    // 5. Input listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            performSearch(e.target.value);
        }, 350));

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const termo = searchInput.value.trim();
                if (termo.length > 0) {
                    window.location.href = `pesquisa.html?q=${encodeURIComponent(termo)}`;
                }
            }
        });
    }
});
