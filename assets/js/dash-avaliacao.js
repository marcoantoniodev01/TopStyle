document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('avaliacao-dash-tab')) {
        initAvaliacaoDash();
    }
});

let g_dashReviewsCache = [];

async function initAvaliacaoDash() {
    const tbody = document.getElementById('avaliacao-dash-tbody');
    const noMsg = document.getElementById('avaliacao-dash-no-msg');
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Carregando...</td></tr>';

    try {
        const supabase = await window.initSupabaseClient();

        // 1. Busca Dados
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. Coleta IDs para enriquecer (profiles + products)
        const productIds = [...new Set(reviews.map(r => r.product_id))];
        const userIds = [...new Set(reviews.map(r => r.user_id))];

        const { data: products } = await supabase.from('products').select('id, nome').in('id', productIds);
        const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
        
        const productsMap = {};
        if (products) products.forEach(p => productsMap[p.id] = p.nome);

        const profilesMap = {};
        if (profiles) profiles.forEach(p => profilesMap[p.id] = { name: p.username, avatar: p.avatar_url });

        // 3. Monta Objeto Completo
        g_dashReviewsCache = reviews.map(r => ({
            ...r,
            productName: productsMap[r.product_id] || 'Produto Removido',
            username: profilesMap[r.user_id]?.name || 'Anônimo',
            userAvatar: profilesMap[r.user_id]?.avatar || 'https://i.ibb.co/L8r4JbN/default-avatar.png'
        }));

        updateAvaliacaoKPIs(g_dashReviewsCache);
        renderAvaliacaoTable(g_dashReviewsCache);
        setupAvaliacaoFilters();

    } catch (err) {
        console.error("Erro Dashboard Avaliações:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Erro: ${err.message}</td></tr>`;
    }
}

function updateAvaliacaoKPIs(reviews) {
    document.getElementById('avaliacao-dash-kpi-total').textContent = reviews.length;

    if (reviews.length === 0) {
        document.getElementById('avaliacao-dash-kpi-avg').textContent = '0.0';
        document.getElementById('avaliacao-dash-kpi-top-product').textContent = '-';
        return;
    }

    // Média
    const soma = reviews.reduce((acc, r) => acc + Number(r.estrelas), 0);
    const media = (soma / reviews.length).toFixed(1);
    document.getElementById('avaliacao-dash-kpi-avg').textContent = media;

    // Top Produto
    const counts = {};
    reviews.forEach(r => {
        counts[r.productName] = (counts[r.productName] || 0) + 1;
    });
    
    let topName = '-';
    let maxCount = 0;
    for (const [name, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            topName = name;
        }
    }
    
    const displayTop = topName.length > 20 ? topName.substring(0,20)+'...' : topName;
    document.getElementById('avaliacao-dash-kpi-top-product').textContent = displayTop;
    document.getElementById('avaliacao-dash-kpi-top-count').textContent = `${maxCount} avaliações`;
}

function renderAvaliacaoTable(lista) {
    const tbody = document.getElementById('avaliacao-dash-tbody');
    const noMsg = document.getElementById('avaliacao-dash-no-msg');
    
    tbody.innerHTML = '';

    if (lista.length === 0) {
        noMsg.style.display = 'block';
        return;
    }
    noMsg.style.display = 'none';

    lista.forEach(review => {
        const tr = document.createElement('tr');
        
        // Estrelas HTML
        let starsHtml = '';
        for(let i=1; i<=5; i++) starsHtml += i <= review.estrelas ? '★' : '☆';

        // Data formatada
        const dateStr = new Date(review.created_at).toLocaleDateString('pt-BR', {
            day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'
        });

        tr.innerHTML = `
            <td>
                <div class="avaliacao-dash-user-info">
                    <img src="${review.userAvatar}" class="avaliacao-dash-avatar" alt="Avatar">
                    <div class="avaliacao-dash-meta">
                        <span class="avaliacao-dash-username">${review.username}</span>
                        <span class="avaliacao-dash-date">${dateStr}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="avaliacao-dash-product-badge">${review.productName}</span>
            </td>
            <td>
                <div class="avaliacao-dash-stars">${starsHtml}</div>
            </td>
            <td>
                <div class="avaliacao-dash-comment">
                    ${review.titulo ? `<h4>${review.titulo}</h4>` : ''}
                    <p>${review.comentario || 'Sem comentário.'}</p>
                </div>
            </td>
            <td>
                <button class="avaliacao-dash-btn-delete" onclick="deleteReviewDash('${review.id}')">
                    <i class="bi bi-trash"></i> Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupAvaliacaoFilters() {
    const input = document.getElementById('avaliacao-dash-search');
    const select = document.getElementById('avaliacao-dash-filter-stars');

    const handleFilter = () => {
        const term = input.value.toLowerCase();
        const stars = select.value;

        const filtered = g_dashReviewsCache.filter(r => {
            const matchesText = 
                r.username.toLowerCase().includes(term) ||
                r.productName.toLowerCase().includes(term) ||
                (r.comentario && r.comentario.toLowerCase().includes(term));
            
            const matchesStar = stars ? String(r.estrelas) === stars : true;

            return matchesText && matchesStar;
        });

        renderAvaliacaoTable(filtered);
    };

    input.addEventListener('input', handleFilter);
    select.addEventListener('change', handleFilter);
}

// Função de Delete Global
window.deleteReviewDash = async (id) => {
    // Usa a modal bonita se disponível
    const confirmed = window.showConfirmationModal 
        ? await window.showConfirmationModal("Deseja excluir esta avaliação permanentemente?", {okText:"Excluir", cancelText:"Não"})
        : confirm("Excluir permanentemente?");

    if(!confirmed) return;

    try {
        const supabase = await window.initSupabaseClient();
        const { error } = await supabase.from('reviews').delete().eq('id', id);

        if (error) throw error;

        // Sucesso: atualiza local
        g_dashReviewsCache = g_dashReviewsCache.filter(r => r.id !== id);
        
        if (window.showToast) window.showToast("Avaliação excluída!");
        
        renderAvaliacaoTable(g_dashReviewsCache);
        updateAvaliacaoKPIs(g_dashReviewsCache);

    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast("Erro: " + err.message);
    }
};
