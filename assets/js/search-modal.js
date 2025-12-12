document.addEventListener('DOMContentLoaded', () => {
    
    // Usa o cliente Supabase que já está disponível globalmente.
    const searchClient = window.supabase; 

    // Elementos do DOM
    const openSearchBtn = document.getElementById('open-search-btn');
    const openSearchBtnMobile = document.getElementById('open-search-btn-mobile');
    const closeSearchBtn = document.getElementById('close-search-btn');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchOverlay = document.querySelector('.search-overlay');

    // 1. Lógica de Abrir/Fechar Modal
    function openModal() {
        if(searchModal) {
            searchModal.classList.add('active');
            setTimeout(() => searchInput.focus(), 300);
        }
    }

    function closeModal() {
        if(searchModal) {
            searchModal.classList.remove('active');
            if(searchInput) searchInput.value = '';
            if(searchResults) searchResults.innerHTML = '';
        }
    }

    if(openSearchBtn) openSearchBtn.addEventListener('click', openModal);
    if(openSearchBtnMobile) openSearchBtnMobile.addEventListener('click', openModal);
    if(closeSearchBtn) closeSearchBtn.addEventListener('click', closeModal);
    if(searchOverlay) searchOverlay.addEventListener('click', closeModal);

    // 2. Função de Debounce (Espera o usuário parar de digitar)
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // 3. Lógica de Pesquisa no Supabase
    const performSearch = async (termo) => {
        if (!termo || termo.length < 2) {
            searchResults.innerHTML = '';
            return;
        }

        // VERIFICAÇÃO DE SEGURANÇA: Garante que o cliente está pronto
        if (!searchClient || typeof searchClient.from !== 'function') {
            searchResults.innerHTML = '<div class="no-results">Erro: Configuração do Supabase pendente. Tente recarregar.</div>';
            console.error('Cliente Supabase não está configurado corretamente para a pesquisa.');
            return;
        }

        searchResults.innerHTML = '<div class="no-results">Buscando...</div>';

        try {
            // Agora usamos o cliente global (searchClient = window.supabase)
            const { data, error } = await searchClient
                .from('products')
                .select('*')
                .or(`nome.ilike.%${termo}%,category.ilike.%${termo}%,dropName.ilike.%${termo}%`)
                .limit(10); 

            if (error) throw error;

            renderResults(data);

        } catch (error) {
            console.error('Erro na pesquisa:', error);
            searchResults.innerHTML = '<div class="no-results">Erro ao buscar. Tente novamente.</div>';
        }
    };

    // 4. Renderizar os resultados na tela (Função anterior, apenas mantida)
    function renderResults(produtos) {
        searchResults.innerHTML = '';

        if (!produtos || produtos.length === 0) {
            searchResults.innerHTML = '<div class="no-results">Nenhum produto encontrado.</div>';
            return;
        }

        produtos.forEach(prod => {
            // ATENÇÃO: Ajuste 'imagem' para o nome da sua coluna de foto no banco se necessário
            const imgUrl = prod.img || prod.cores; 
            
            const item = document.createElement('a');
            item.className = 'search-item';
            item.href = `Blusa-modelo02.html?id=${prod.id}`; 
            
            item.innerHTML = `
                <img src="${imgUrl}" alt="${prod.nome}">
                <div class="search-item-info">
                    <h4>${prod.nome}</h4>
                    <span>${prod.category || ''} ${prod.dropName ? '| ' + prod.dropName : ''}</span>
                </div>
                <div class="search-item-price">
                    R$ ${parseFloat(prod.preco).toFixed(2)}
                </div>
            `;

            searchResults.appendChild(item);
        });
    }

    // 5. Event Listeners do Input
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            performSearch(e.target.value);
        }, 400));

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const termo = searchInput.value;
                if (termo.length > 0) {
                    // Redireciona para a página de resultados completos
                    window.location.href = `pesquisa.html?q=${encodeURIComponent(termo)}`;
                }
            }
        });
    }
});