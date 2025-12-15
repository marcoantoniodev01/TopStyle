document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('avaliacao-dash-tab')) {
        initAvaliacaoDash();
    }
});

let g_dashReviewsCache = [];

async function initAvaliacaoDash() {
    const tbody = document.getElementById('avaliacao-dash-tbody');
    const noMsg = document.getElementById('avaliacao-dash-no-msg');
    
    if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Carregando...</td></tr>';

    try {
        const supabase = await window.initSupabaseClient();

        // 1. Busca Reviews na tabela principal
        const { data: reviews, error } = await supabase
            .from('reviews') //
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Coleta IDs para enriquecer (profiles + products + media)
        const reviewIds = reviews.map(r => r.id);
        const productIds = [...new Set(reviews.map(r => r.product_id))];
        const userIds = [...new Set(reviews.map(r => r.user_id))];

        // 2. Buscas Paralelas (Produtos, Perfis e MÍDIA)
        const [productsRes, profilesRes, mediaRes] = await Promise.all([
            supabase.from('products').select('id, nome').in('id', productIds),
            supabase.from('profiles').select('id, username, full_name, avatar_url, email, cpf, created_at, is_admin').in('id', userIds),
            supabase.from('review_media').select('review_id, media_url').in('review_id', reviewIds) //
        ]);

        const products = productsRes.data || [];
        const profiles = profilesRes.data || [];
        const medias = mediaRes.data || []; // Dados da tabela review_media

        // Busca Banimentos
        const { data: bans } = await supabase.from('user_bans').select('user_id');
        const bannedSet = new Set(bans ? bans.map(b => b.user_id) : []);

        // Criar Mapas para acesso rápido
        const productsMap = {};
        products.forEach(p => productsMap[p.id] = p.nome);

        const profilesMap = {};
        profiles.forEach(p => {
            profilesMap[p.id] = { ...p, isBanned: bannedSet.has(p.id) };
        });

        const mediaMap = {};
        // Mapeia review_id -> media_url (Assumindo 1 foto por review para simplificar, ou pega a primeira)
        medias.forEach(m => {
            mediaMap[m.review_id] = m.media_url; 
        });

        // 3. Monta Cache Completo
        g_dashReviewsCache = reviews.map(r => {
            const userProfile = profilesMap[r.user_id] || {};
            return {
                ...r,
                productName: productsMap[r.product_id] || 'Produto Removido',
                username: userProfile.username || 'Anônimo',
                userAvatar: userProfile.avatar_url,
                userFullname: userProfile.full_name,
                userEmail: userProfile.email,
                userCpf: userProfile.cpf,
                userCreatedAt: userProfile.created_at,
                userIsAdmin: userProfile.is_admin,
                userIsBanned: userProfile.isBanned,
                // AQUI ESTÁ A CORREÇÃO: Pega a url do mapa de mídia
                reviewImg: mediaMap[r.id] || null 
            };
        });

        updateAvaliacaoKPIs(g_dashReviewsCache);
        renderAvaliacaoTable(g_dashReviewsCache);
        setupAvaliacaoFilters();

    } catch (err) {
        console.error("Erro Dashboard Avaliações:", err);
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Erro: ${err.message}</td></tr>`;
    }
}

function updateAvaliacaoKPIs(reviews) {
    const elTotal = document.getElementById('avaliacao-dash-kpi-total');
    if(!elTotal) return;

    elTotal.textContent = reviews.length;

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
    if(!tbody) return;
    tbody.innerHTML = '';

    if (lista.length === 0) {
        if(noMsg) noMsg.style.display = 'block';
        return;
    }
    if(noMsg) noMsg.style.display = 'none';

    lista.forEach(review => {
        const tr = document.createElement('tr');
        let starsHtml = '';
        for(let i=1; i<=5; i++) starsHtml += i <= review.estrelas ? '★' : '☆';
        const dateStr = new Date(review.created_at).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', year:'2-digit'});
        const avatarSrc = review.userAvatar || 'https://i.ibb.co/L8r4JbN/default-avatar.png';

        // Ícone de clipe se tiver foto
        const attachmentIcon = review.reviewImg ? '<i class="bi bi-paperclip" style="color:#3b82f6; margin-left:5px;" title="Contém foto"></i>' : '';

        tr.innerHTML = `
            <td>
                <div class="avaliacao-dash-user-info">
                    <img src="${avatarSrc}" class="avaliacao-dash-avatar" alt="Avatar">
                    <div class="avaliacao-dash-meta">
                        <span class="avaliacao-dash-username">${review.username}</span>
                        <span class="avaliacao-dash-date">${dateStr}</span>
                    </div>
                </div>
            </td>
            <td><span class="avaliacao-dash-product-badge">${review.productName}</span></td>
            <td><div class="avaliacao-dash-stars">${starsHtml}</div></td>
            <td>
                <div class="avaliacao-dash-comment">
                    ${review.titulo ? `<h4>${review.titulo}</h4>` : ''}
                    <p>${review.comentario ? review.comentario.substring(0, 40) + '...' : 'Sem comentário.'} ${attachmentIcon}</p>
                </div>
            </td>
            <td>
                <div style="display:flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn-see-more-review" onclick="openReviewDetailsModal('${review.id}')"><i class="bi bi-eye"></i> Ver</button>
                    <button class="avaliacao-dash-btn-delete" onclick="deleteReviewDash('${review.id}')"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupAvaliacaoFilters() {
    const input = document.getElementById('avaliacao-dash-search');
    const select = document.getElementById('avaliacao-dash-filter-stars');
    if(!input || !select) return;

    const handleFilter = () => {
        const term = input.value.toLowerCase();
        const stars = select.value;
        const filtered = g_dashReviewsCache.filter(r => {
            const matchesText = r.username.toLowerCase().includes(term) || r.productName.toLowerCase().includes(term) || (r.comentario && r.comentario.toLowerCase().includes(term));
            const matchesStar = stars ? String(r.estrelas) === stars : true;
            return matchesText && matchesStar;
        });
        renderAvaliacaoTable(filtered);
    };
    input.addEventListener('input', handleFilter);
    select.addEventListener('change', handleFilter);
}

// ===============================================
// NOVA LÓGICA DO MODAL DE DETALHES DA AVALIAÇÃO
// ===============================================

// ===============================================
// LÓGICA DO MODAL (ATUALIZADA COM O HTML NOVO)
// ===============================================

window.openReviewDetailsModal = function(reviewId) {
    const review = g_dashReviewsCache.find(r => r.id === reviewId);
    if (!review) return;

    const modal = document.getElementById('modal-review-details');
    
    // 1. Preenche Usuário
    const avatarImg = document.getElementById('review-modal-avatar');
    const initialsSpan = document.getElementById('review-modal-initials');
    
    if (review.userAvatar) {
        avatarImg.src = review.userAvatar;
        avatarImg.style.display = 'block';
        initialsSpan.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        initialsSpan.textContent = review.username.substring(0,2).toUpperCase();
        initialsSpan.style.display = 'block';
    }

    document.getElementById('review-modal-name').textContent = review.userFullname || review.username;
    document.getElementById('review-modal-username').textContent = '@' + review.username;
    
    // 2. Preenche Review
    document.getElementById('review-modal-product').textContent = review.productName;
    let starsStr = '';
    for(let i=1; i<=5; i++) starsStr += i <= review.estrelas ? '★' : '☆';
    document.getElementById('review-modal-stars').textContent = starsStr;
    document.getElementById('review-modal-comment').textContent = review.comentario || "Sem comentário escrito.";

    const dateObj = new Date(review.created_at);
    document.getElementById('review-modal-date').textContent = "Enviado em " + dateObj.toLocaleDateString('pt-BR') + " às " + dateObj.toLocaleTimeString('pt-BR');

    // 3. Lógica da FOTO (Atualizada para o novo HTML)
    const photoContainer = document.getElementById('review-photo-container');
    const photoImg = document.getElementById('review-modal-photo');

    // Se a review tiver imagem (vinda da tabela review_media)
    if (review.reviewImg) {
        // Atualiza a estrutura HTML interna para usar o novo design
        photoContainer.innerHTML = `
            <div class="photo-label"><i class="bi bi-image"></i> Mídia Anexada</div>
            <div class="review-image-container">
                <img id="review-modal-photo" src="${review.reviewImg}" onclick="window.open(this.src, '_blank')">
            </div>
        `;
        photoContainer.classList.remove('hidden');
    } else {
        photoContainer.classList.add('hidden');
    }

    // 4. Link para Perfil (Abre modal user por cima)
    const userCard = document.getElementById('review-user-section');
    userCard.onclick = function() {
        if (window.openUserModal) {
            window.openUserModal(
                review.user_id, review.username, review.userFullname || review.username, 
                review.userEmail, review.userCpf, review.userCreatedAt, 
                review.userIsAdmin, review.userIsBanned, review.userAvatar
            );
        }
    };

    // 5. Botão Excluir
    const btnDelete = document.getElementById('btn-delete-review-modal');
    btnDelete.onclick = function() {
        window.deleteReviewDash(review.id).then(() => {
            window.closeReviewDetailsModal();
        });
    };

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
};

window.closeReviewDetailsModal = function() {
    const modal = document.getElementById('modal-review-details');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// Função de Delete Global (Usada tanto na tabela quanto no modal)
window.deleteReviewDash = async (id) => {
    const confirmed = window.showConfirmationModal 
        ? await window.showConfirmationModal("Excluir esta avaliação permanentemente?", {okText:"Excluir", cancelText:"Cancelar"})
        : confirm("Excluir?");
    if(!confirmed) return;

    try {
        const supabase = await window.initSupabaseClient();
        const { error } = await supabase.from('reviews').delete().eq('id', id); // Cascade deletará review_media automaticamente
        if (error) throw error;

        g_dashReviewsCache = g_dashReviewsCache.filter(r => r.id !== id);
        if (window.showToast) window.showToast("Avaliação excluída!");
        renderAvaliacaoTable(g_dashReviewsCache);
        updateAvaliacaoKPIs(g_dashReviewsCache);
    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast("Erro: " + err.message);
    }
};