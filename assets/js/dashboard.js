// ===============================
// 🔹 SUPABASE CLIENT
// ===============================

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// 🔹 Atualiza a contagem de produtos
async function atualizarTotalProdutos() {
    const totalElement = document.getElementById("total-produtos");

    try {
        const { count, error } = await client
            .from("products")
            .select("*", { count: "exact", head: true });

        if (error) throw error;

        totalElement.textContent = count ?? 0;
    } catch (err) {
        console.error("Erro ao buscar produtos:", err.message);
        totalElement.textContent = "Erro";
    }
}

// 🔹 Escuta alterações em tempo real na tabela "products"
function ouvirMudancasProdutos() {
    client
        .channel("realtime:products")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "products" },
            (payload) => {
                console.log("Mudança detectada em products:", payload);
                atualizarTotalProdutos(); // Atualiza a contagem
            }
        )
        .subscribe();
}

// 🔹 Inicializa ao carregar
document.addEventListener("DOMContentLoaded", () => {
    atualizarTotalProdutos();
    ouvirMudancasProdutos();
});

const menuItems = document.querySelectorAll('.menu-item');
const bodyRight = document.querySelector('.body-right');

// Lógica original de submenus
menuItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        const submenu = item.nextElementSibling;

        document.querySelectorAll('.submenu').forEach((sub, i) => {
            if (i !== index) {
                sub.classList.remove('open');
                menuItems[i]?.classList.remove('active');
            }
        });

        submenu.classList.toggle('open');
        item.classList.toggle('active');
    });
});

// ✅ Carregar conteúdo na direita
document.querySelectorAll('.submenu li').forEach(li => {
    li.addEventListener('click', () => {
        const target = li.getAttribute('data-content');
        if (!target) return;

        // Marca item ativo
        document.querySelectorAll('.submenu li').forEach(i => i.classList.remove('active'));
        li.classList.add('active');

        // Transição de fade suave
        const currentPage = document.querySelector('.page.active');
        const newPage = document.getElementById(target);

        if (currentPage === newPage) return; // evita recarregar a mesma

        if (currentPage) {
            currentPage.style.opacity = 0;
            setTimeout(() => {
                currentPage.classList.remove('active');
                newPage.classList.add('active');
                setTimeout(() => (newPage.style.opacity = 1), 50);
            }, 300);
        } else {
            newPage.classList.add('active');
            setTimeout(() => (newPage.style.opacity = 1), 50);
        }
    });
});

// ====== GRÁFICO DE LINHAS ======
const lineOptions = {
    chart: {
        type: "area",
        height: 320,
        toolbar: { show: false },
    },
    colors: ["#1E90FF", "#00C9A7"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3 },
    fill: {
        type: "gradient",
        gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.4,
            opacityTo: 0.1,
            stops: [0, 100]
        }
    },
    series: [
        {
            name: "Vendidos",
            data: [10, 15, 9, 20, 25, 18, 30, 28, 25, 35, 40, 50]
        },
        {
            name: "Revendidos",
            data: [8, 12, 15, 18, 20, 15, 28, 25, 30, 32, 45, 60]
        }
    ],
    xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        labels: { style: { colors: '#666' } }
    },
    yaxis: { labels: { style: { colors: '#666' } } },
    legend: { position: "top", horizontalAlign: "right" },
    grid: { borderColor: "#f0f0f0" }
};

const lineChart = new ApexCharts(document.querySelector("#lineChart"), lineOptions);
lineChart.render();

// ====== GRÁFICO DE BARRAS ======
const barOptions = {
    chart: {
        type: 'bar',
        height: 200,
        toolbar: { show: false }
    },
    plotOptions: {
        bar: {
            borderRadius: 8,
            columnWidth: '50%'
        }
    },
    dataLabels: { enabled: false },
    colors: ['#1E90FF'],
    series: [{
        name: 'Sales',
        data: [500, 800, 1200, 1600, 2100]
    }],
    xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        labels: { style: { colors: '#666' } }
    },
    yaxis: { labels: { show: false } },
    grid: { show: false },
    legend: { show: false }
};

const barChart = new ApexCharts(document.querySelector("#barChart"), barOptions);
barChart.render();


// ===========================
//        DASHBOARD
//============================

// ===============================
// DASHBOARD: métricas calculadas no JS
// Usa a variável `client` que você já tem
// ===============================

function formatarMoeda(valor) {
    return (Number(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    });
}

async function calcularMetricas() {
    try {
        // pega todas as vendas registradas (comprados)
        const { data: vendas, error: errVendas } = await client
            .from('comprados')
            .select('quantidade, preco_custo, lucro');

        if (errVendas) throw errVendas;

        let vendasTotais = 0;      // soma de quantidades (itens vendidos)
        let receitaTotal = 0;      // soma do custo (preco_custo * quantidade)
        let lucroTotal = 0;        // soma do campo lucro

        (vendas || []).forEach(row => {
            const qtd = Number(row.quantidade) || 0;
            const custo = Number(row.preco_custo) || 0;
            const lucro = Number(row.lucro) || 0;

            vendasTotais += qtd;
            receitaTotal += custo * qtd;   // conforme sua regra: receita = custo total
            lucroTotal += lucro;
        });

        // conta fornecedores (novos clientes)
        const { count: novosClientes, error: errFornecedores } = await client
            .from('fornecedores')
            .select('*', { count: 'exact', head: true });

        if (errFornecedores) throw errFornecedores;

        return {
            vendasTotais,
            receitaTotal,
            lucroTotal,
            novosClientes: novosClientes || 0
        };
    } catch (err) {
        console.error('Erro ao calcular métricas:', err);
        return {
            vendasTotais: 0,
            receitaTotal: 0,
            lucroTotal: 0,
            novosClientes: 0
        };
    }
}

async function atualizarDashboard() {
    const { vendasTotais, receitaTotal, lucroTotal, novosClientes } = await calcularMetricas();

    // atualiza DOM com os ids que você mostrou
    const elVendas = document.getElementById('vendas-totais');
    const elLucro = document.getElementById('lucro-total');
    const elReceita = document.getElementById('receita-total');
    const elClientes = document.getElementById('novos-clientes');

    if (elVendas) elVendas.textContent = `${vendasTotais} itens`;
    if (elLucro) elLucro.textContent = formatarMoeda(lucroTotal);
    if (elReceita) elReceita.textContent = formatarMoeda(receitaTotal);
    if (elClientes) elClientes.textContent = String(novosClientes);
}

// ativa realtime: atualiza quando houver mudanças em comprados ou fornecedores
function ativarRealtimeDashboard() {
    client
        .channel('realtime:dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comprados' }, () => atualizarDashboard())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fornecedores' }, () => atualizarDashboard())
        .subscribe();
}

// inicialização
document.addEventListener('DOMContentLoaded', () => {
    atualizarDashboard();             // primeira carga
    ativarRealtimeDashboard();        // ativa realtime
    setInterval(atualizarDashboard, 30_000); // fallback: atualiza a cada 30s
});

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // Inicia listagem de usuários se estiver na página
    if (document.getElementById('user-cards-list')) {
        mostrarProfiles();
    }
});


/* ===============================
    =================================
            SEGUNDA PARTE
            CADASTRO
=================================
    ===================================*/


const { createClient } = supabase;

// 1. SUAS CHAVES (Mantenha as que você corrigiu)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNzUyNCwiZXhwIjoyMDc0OTEzNTI0fQ.FaXzLoO9WX4Kr6W01dF8LrfSuw1SkGSdLnyXUXYwDa8';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/* =========================================================
   GESTÃO DE USUÁRIOS (Atualizado)
   ========================================================= */

// Variáveis globais de controle
let currentUserId = null;
let currentIsAdmin = false;
let currentIsBanned = false; // Novo controle

// --- LISTAGEM DE USUÁRIOS (ATUALIZADA COM FOTO) ---
async function mostrarProfiles() {
    const termoBusca = document.getElementById('filtroBusca')?.value.trim();
    const listContainer = document.getElementById('user-cards-list');

    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Carregando usuários...</div>';

    try {
        // 1. Inicia a Query (ADICIONADO: avatar_url)
        let consulta = supabaseAdmin
            .from('profiles')
            .select('id, username, full_name, email, is_admin, cpf, created_at, avatar_url')
            .order('is_admin', { ascending: false })
            .order('username', { ascending: true });

        // 2. Lógica de Filtro (Igual ao anterior)
        if (termoBusca) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(termoBusca);
            if (isUUID) {
                consulta = consulta.eq('id', termoBusca);
            } else {
                consulta = consulta.or(`username.ilike.%${termoBusca}%,full_name.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%`);
            }
        }

        const { data: profiles, error: errorProfiles } = await consulta;
        if (errorProfiles) throw errorProfiles;

        // 3. Buscar Banimentos
        const { data: bans, error: errorBans } = await supabaseAdmin.from('user_bans').select('user_id');
        if (errorBans) throw errorBans;
        const bannedIds = new Set(bans.map(b => b.user_id));

        if (!profiles || profiles.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum usuário encontrado.</p>';
            return;
        }

        // 4. Renderizar Cards
        listContainer.innerHTML = profiles.map(row => {
            const isAdmin = row.is_admin === true;
            const isBanned = bannedIds.has(row.id);
            const displayUsername = row.username || 'Sem Usuario';
            const displayName = row.full_name ? row.full_name : displayUsername;
            const initials = displayUsername.substring(0, 2).toUpperCase();

            // Lógica da Imagem
            const hasAvatar = row.avatar_url && row.avatar_url.trim() !== '';

            // Classes Visuais
            let cardClass = 'user-card';
            let avatarClass = isAdmin ? 'admin' : 'client';
            let badgeHtml = '';

            if (isBanned) {
                cardClass += ' banned-border';
                avatarClass = 'banned';
                badgeHtml = `<span class="badge-role banned">BANIDO</span>`;
            } else if (isAdmin) {
                badgeHtml = `<span class="badge-role admin">ADMIN</span>`;
            } else {
                badgeHtml = `<span class="badge-role client">CLIENTE</span>`;
            }

            // HTML do Avatar (IMG ou Sigla)
            let avatarHtml;
            if (hasAvatar) {
                avatarHtml = `<div class="user-avatar ${avatarClass} has-img"><img src="${row.avatar_url}" alt="${displayUsername}"></div>`;
            } else {
                avatarHtml = `<div class="user-avatar ${avatarClass}">${initials}</div>`;
            }

            // Tratamento de aspas para o onclick
            const safeUsername = displayUsername.replace(/'/g, "\\'");
            const safeFullname = displayName.replace(/'/g, "\\'");
            const safeAvatar = hasAvatar ? row.avatar_url : '';

            // Botão Admin
            const btnClass = isAdmin ? 'btn-revoke' : 'btn-grant';
            const btnText = isAdmin ? 'Revogar Admin' : 'Tornar Admin';

            return `
            <div class="${cardClass}">
                <div class="user-card-left">
                    ${avatarHtml}
                    <div class="user-info-col">
                        <div class="user-header-row">
                            <h3 class="user-name">${displayName}</h3>
                            ${badgeHtml}
                        </div>
                        <p class="user-email">${row.email} | ${displayUsername}</p>
                        <div class="user-id-pill" title="Clique para copiar ID" onclick="copiarIdUsuario('${row.id}')">ID: ${row.id}</div>
                    </div>
                </div>
                <div class="user-card-actions">
                    <button class="btn-action-user ${btnClass}" onclick="toggleAdmin('${row.id}', ${isAdmin})">${btnText}</button>
                    
                    <button class="btn-icon-secondary" title="Ver Perfil Detalhado" 
                        onclick="openUserModal('${row.id}', '${safeUsername}', '${safeFullname}', '${row.email}', '${row.cpf}', '${row.created_at}', ${isAdmin}, ${isBanned}, '${safeAvatar}')">
                        <i class="ri-user-settings-line"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro na busca:', error);
        listContainer.innerHTML = `<p style="text-align:center; color:red;">Erro ao carregar dados: ${error.message}</p>`;
    }
}

// ==========================================
// LÓGICA DOS MODAIS (VER DETALHES E BANIR)
// ==========================================

// --- ABRIR MODAL DE DETALHES ---
// --- ABRIR MODAL DE DETALHES (ATUALIZADO PRO) ---
function openUserModal(id, username, fullname, email, cpf, createdAt, isAdmin, isBanned, avatarUrl) {
    currentUserId = id;
    currentIsAdmin = isAdmin;
    currentIsBanned = isBanned;

    // Elementos do DOM
    const initialsEl = document.getElementById('detail-initials');
    const imgEl = document.getElementById('detail-img');
    const wrapperEl = document.getElementById('detail-avatar-wrapper');

    // Preencher Textos
    document.getElementById('detail-username').innerText = '@' + username;
    document.getElementById('detail-fullname').innerText = (fullname !== 'null' && fullname) ? fullname : username;
    document.getElementById('detail-email').innerText = email || '---';
    document.getElementById('detail-cpf').innerText = (cpf && cpf !== 'null' && cpf !== 'undefined') ? cpf : 'Não informado';
    document.getElementById('detail-id').innerText = id;

    const dateObj = new Date(createdAt);
    document.getElementById('detail-date').innerText = !isNaN(dateObj) ? dateObj.toLocaleDateString('pt-BR') : '---';

    // Lógica da Foto no Modal
    // 1. Reseta classes de cor
    wrapperEl.classList.remove('admin', 'client', 'banned');

    // 2. Aplica cor baseada no status
    if (isBanned) wrapperEl.classList.add('banned');
    else if (isAdmin) wrapperEl.classList.add('admin');
    else wrapperEl.classList.add('client');

    // 3. Mostra Imagem ou Sigla
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' && avatarUrl !== '') {
        imgEl.src = avatarUrl;
        imgEl.style.display = 'block';
        initialsEl.style.display = 'none';
    } else {
        initialsEl.innerText = username.substring(0, 2).toUpperCase();
        initialsEl.style.display = 'block';
        imgEl.style.display = 'none';
    }

    // Configura Botões de Ação
    const btnAdmin = document.getElementById('btn-toggle-admin-modal');
    btnAdmin.innerText = isAdmin ? 'Revogar Admin' : 'Tornar Admin';
    btnAdmin.onclick = () => {
        toggleAdmin(id, isAdmin).then(() => closeUserModal());
    };

    const btnBanAction = document.getElementById('btn-open-ban');

    // CORREÇÃO AQUI: Removemos estilos manuais e gerenciamos apenas as classes
    btnBanAction.style.background = ""; // Limpa qualquer cor inline antiga

    if (isBanned) {
        btnBanAction.innerText = "Remover Banimento";
        // Troca visual para o botão de desbanir (Azul)
        btnBanAction.classList.remove('btn-pro-danger');
        btnBanAction.classList.add('btn-unban');

        btnBanAction.onclick = () => unbanUser(id);
    } else {
        btnBanAction.innerText = "Banir Usuário";
        // Garante que o visual vermelho (pro-danger) está ativo
        btnBanAction.classList.remove('btn-unban');
        btnBanAction.classList.add('btn-pro-danger');

        btnBanAction.onclick = openBanModal;
    }

    // Abre Modal
    const modal = document.getElementById('modal-user-details');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeUserModal() {
    const modal = document.getElementById('modal-user-details');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// ===============================================
// LÓGICA ATUALIZADA DO MODAL DE BANIMENTO (PRO)
// ===============================================

// Inicializa os listeners do dropdown assim que o script roda
document.addEventListener("DOMContentLoaded", () => {
    setupBanDropdown();
});

function setupBanDropdown() {
    const wrapper = document.getElementById('ban-duration-wrapper');
    if (!wrapper) return;

    const trigger = wrapper.querySelector('.select-trigger');
    const options = wrapper.querySelectorAll('.select-option');
    const textSpan = document.getElementById('ban-duration-text');
    const hiddenInput = document.getElementById('ban-duration-value');
    const dateContainer = document.getElementById('ban-date-container');

    // Toggle Dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede fechar imediato
        wrapper.classList.toggle('open');
    });

    // Selecionar Opção
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            const value = opt.dataset.value;
            const textContent = opt.textContent.trim(); // Pega texto limpo
            const iconHtml = opt.querySelector('i').outerHTML; // Pega o ícone

            // Atualiza UI do Trigger
            textSpan.innerHTML = `${iconHtml} ${textContent}`;
            wrapper.classList.remove('open');

            // Remove seleção anterior
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Atualiza Input Oculto
            hiddenInput.value = value;

            // Lógica de Mostrar/Esconder Data
            if (value === 'temporary') {
                dateContainer.classList.remove('hidden');
            } else {
                dateContainer.classList.add('hidden');
            }
        });
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) wrapper.classList.remove('open');
    });
}

// --- ABRIR MODAL DE BANIMENTO ---
function openBanModal() {
    // REMOVIDA A LINHA: closeUserModal(); <--- Isso mantem o modal de fundo aberto

    const modal = document.getElementById('modal-ban-user');
    modal.classList.remove('hidden');

    // Reseta form visualmente
    document.getElementById('ban-duration-text').innerHTML = 'Selecione a duração...';
    document.getElementById('ban-duration-value').value = '';
    document.getElementById('ban-reason').value = "";
    document.getElementById('ban-date-input').value = "";
    document.getElementById('ban-date-container').classList.add('hidden');

    document.querySelectorAll('#ban-duration-wrapper .select-option').forEach(o => o.classList.remove('selected'));

    setTimeout(() => modal.classList.add('active'), 10);
}

function closeBanModal() {
    const modal = document.getElementById('modal-ban-user');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function toggleBanDateInput() {
    const select = document.getElementById('ban-duration-select');
    const dateContainer = document.getElementById('ban-date-container');

    if (select.value === 'temporary') {
        dateContainer.classList.remove('hidden');
    } else {
        dateContainer.classList.add('hidden');
    }
}

// --- AÇÃO: CONFIRMAR BANIMENTO (Atualizado) ---
async function confirmBanUser() {
    // Pega valor do input hidden (novo sistema)
    const duration = document.getElementById('ban-duration-value').value;
    const reason = document.getElementById('ban-reason').value.trim();
    const dateInput = document.getElementById('ban-date-input').value;

    if (!currentUserId) return;
    if (!duration) {
        if (window.showToast) window.showToast("Selecione a duração do banimento.");
        else alert("Selecione a duração.");
        return;
    }
    if (!reason) {
        if (window.showToast) window.showToast("Digite um motivo.");
        else alert("Digite um motivo.");
        return;
    }

    let bannedUntil = null;
    if (duration === 'temporary') {
        if (!dateInput) {
            if (window.showToast) window.showToast("Selecione a data final.");
            else alert("Selecione a data final.");
            return;
        }
        bannedUntil = new Date(dateInput).toISOString();
    }

    // Envia para o Supabase
    const { error } = await supabaseAdmin
        .from('user_bans')
        .insert({
            // ... dados ...
        });

    if (error) {
        console.error(error);
        if (window.showToast) window.showToast("Erro ao banir: " + error.message);
    } else {
        if (window.showToast) window.showToast("Usuário banido com sucesso!");

        closeBanModal();  // Fecha o de banimento
        closeUserModal(); // <--- ADICIONE ISSO: Fecha o de perfil também, pois o status mudou

        mostrarProfiles(); // Atualiza a lista visual
    }
}

// --- AÇÃO: DESBANIR USUÁRIO (NOVO) ---
async function unbanUser(userId) {
    // Fecha modal de detalhes primeiro
    closeUserModal();

    // Usa modal global de confirmação
    const confirmed = await window.showConfirmationModal(
        "Tem certeza que deseja remover o banimento deste usuário? Ele poderá acessar a loja novamente.",
        { okText: 'Sim, Desbanir', cancelText: 'Cancelar' }
    );

    if (!confirmed) return;

    const { error } = await supabaseAdmin
        .from('user_bans')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error(error);
        window.showToast("Erro ao desbanir: " + error.message);
    } else {
        window.showToast("Banimento removido com sucesso!");
        mostrarProfiles(); // Atualiza a lista para remover o badge vermelho
    }
}

// --- AÇÃO: ALTERAR ADMIN (Atualizado com Modal e Toast) ---
async function toggleAdmin(userId, currentStatus) {
    const newStatus = !currentStatus;
    const actionName = newStatus ? "tornar ADMIN" : "remover ADMIN";

    const confirmed = await window.showConfirmationModal(
        `Tem certeza que deseja ${actionName} este usuário?`,
        { okText: 'Confirmar', cancelText: 'Cancelar' }
    );

    if (!confirmed) return;

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: newStatus })
        .eq('id', userId);

    if (error) {
        console.error('Erro ao atualizar admin:', error);
        window.showToast('Falha ao atualizar status: ' + error.message);
    } else {
        mostrarProfiles();
        window.showToast(`Status atualizado com sucesso!`);
    }
}

// --- AUXILIAR: COPIAR ID ---
function copiarIdUsuario(text) {
    navigator.clipboard.writeText(text).then(() => {
        window.showToast(`ID copiado: ${text}`);
    }).catch(err => {
        console.error('Erro ao copiar', err);
    });
}

// Inicializa a lista
document.addEventListener("DOMContentLoaded", () => {
    // Se estivermos na aba ou se a função for chamada
    if (document.getElementById('user-cards-list')) {
        mostrarProfiles();
    }
});

// Roda a função quando a página carregar
mostrarProfiles();

/* =========================
        TABELA PRODUTOS
   ========================= */

window.loadProducts = loadProducts; // Permite que o main.js recarregue a tabela

async function loadProducts() {
    const { data, error } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    renderProducts(data);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    products.forEach(p => {
        const q = p.quantidade_disponível || 0;

        const card = document.createElement('div');
        card.className = 'ProCard';

        card.innerHTML = `
          <div class="ProTooltip">Clique para copiar ID</div>

          <div class="ProImgBox" onclick="copyId(${p.id})">
            ${p.img ? `<img src="${p.img}">` : 'Sem imagem'}
          </div>

          <div class="ProName">${p.nome}</div>

          <div class="ProPrice">R$ ${Number(p.preco).toFixed(2)}</div>

          <div class="ProRow"><span>Categoria:</span> <strong>${p.category || '-'}</strong></div>
          <div class="ProRow"><span>Tamanhos:</span> <strong>${p.tamanhos || '-'}</strong></div>

          <div class="ProRow" style="flex-direction: column; align-items: flex-start;">
            <span>Cores:</span>
            <div class="ProColorList">
              ${Array.isArray(p.cores)
                ? p.cores.map(c => `
                  <div class="ProColorDot">
                    <img src="${c.img1}">
                  </div>
                `).join('')
                : '<small>-</small>'
            }
            </div>
          </div>

          <div class="ProRow">
            <span>Estoque:</span>
            <strong class="${q <= 3 ? 'ProLowStock' : ''}">
              ${q}
            </strong>
          </div>

          <div class="ProRow" style="margin-top:14px; gap:6px;">
                <button class="ProEdit" onclick="window.openEditModalById('${p.id}')">Editar</button>
                <button class="ProView" onclick="openLink('${p.link || '#'}')">Ver</button>
                <button class="ProDelete" onclick="deleteProduct('${p.id}')">Excluir</button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function openLink(link) {
    if (!link || link === "#") {
        alert("Nenhum link definido para este produto.");
        return;
    }
    window.open(link, "_blank");
}

async function deleteProduct(id) {
    // Substituindo confirm() nativo pelo modal customizado
    const confirmed = await window.showConfirmationModal(
        'Tem certeza que deseja excluir este produto permanentemente?',
        { okText: 'Excluir', cancelText: 'Cancelar' }
    );

    if (!confirmed) return;

    const { error } = await client.from('products').delete().eq('id', id);

    if (error) {
        window.showToast("Erro ao excluir: " + error.message);
    } else {
        window.showToast("Produto excluído!");
        loadProducts();
    }
}

function copyId(id) {
    navigator.clipboard.writeText(id);
    window.showToast("ID do produto copiado!");
}

// NOVO
window.addProduct = function () {
    // Chama a função global definida no main.js
    // Passamos 'null' para indicar que é modo Dashboard (sem slot específico)
    if (window.openAddProductModal) {
        window.openAddProductModal(null);
    } else {
        console.error("Função openAddProductModal não carregada do main.js");
        alert("Erro: O script main.js não carregou corretamente as funções de modal.");
    }
}

loadProducts();

/* =============================================================
   LÓGICA DE CATEGORIAS (INTEGRAÇÃO)
   ============================================================= */

// Variável de controle para não carregar várias vezes desnecessariamente
let hasLoadedCategories = false;

// Função chamada quando clica no menu lateral "Categorias"
async function initCategoryPage() {
    // Só carrega se ainda não carregou ou se quiser forçar atualização
    // Aqui vamos forçar para sempre estar fresco
    await catSyncProductCategories();
    catLoadCategories();
}

// 1. LISTAR CATEGORIAS
async function catLoadCategories() {
    const loader = document.getElementById('cat-loader');
    const content = document.getElementById('cat-content');
    const list = document.getElementById('cat-list-body');
    const empty = document.getElementById('cat-empty-state');
    const statsContainer = document.getElementById('cat-stats-container');

    if (!loader || !content) return; // Segurança caso o HTML não esteja lá

    loader.classList.remove('hidden');
    content.classList.add('hidden');

    // Puxa categorias reais usando a variável global 'client' (Supabase)
    const { data: categories, error: catErr } = await client
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (catErr) {
        if (window.showToast) window.showToast('Erro ao carregar categorias: ' + catErr.message);
        return;
    }

    // Puxa produtos para contagem
    const { data: products, error: prodErr } = await client
        .from('products')
        .select('id, category');

    if (prodErr) {
        if (window.showToast) window.showToast('Erro ao carregar produtos para contagem.');
        return;
    }

    // Faz mapa: categoria -> quantidade
    const countMap = {};
    products.forEach(p => {
        if (!p.category) return;
        const cat = p.category.trim();
        // Normaliza para lowercase para contar direito se houver discrepância
        // Mas a chave de exibição será o nome da categoria oficial
        // Aqui assumimos que category no produto é o nome.
        countMap[cat] = (countMap[cat] || 0) + 1;
    });

    // Stats
    statsContainer.innerHTML = `
        <div class="cat-stat-card">
            <div class="cat-stat-icon" style="background:#eff6ff;color:#2563eb;">
                <i class="bi bi-layers-fill"></i>
            </div>
            <div class="cat-stat-info">
                <h3>${categories.length}</h3>
                <p>Categorias Cadastradas</p>
            </div>
        </div>
        <div class="cat-stat-card">
            <div class="cat-stat-icon" style="background:#f0fdf4;color:#16a34a;">
                <i class="bi bi-box-seam-fill"></i>
            </div>
            <div class="cat-stat-info">
                <h3>${products.length}</h3>
                <p>Produtos Totais</p>
            </div>
        </div>
    `;

    // Render tabela
    list.innerHTML = '';

    if (categories.length === 0) {
        empty.classList.remove('hidden');
        document.querySelector('.cat-table-wrapper').classList.add('hidden');
    } else {
        empty.classList.add('hidden');
        document.querySelector('.cat-table-wrapper').classList.remove('hidden');

        categories.forEach(cat => {
            const count = countMap[cat.name] || 0;
            const firstLetter = cat.name.charAt(0).toUpperCase();

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:32px;height:32px;background:#e0e7ff;color:#4338ca;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">
                            ${firstLetter}
                        </div>
                        <span style="font-weight:500;">${cat.name}</span>
                    </div>
                </td>
                <td style="text-align:center;">
                    <span style="background:#f1f5f9;padding:4px 10px;border-radius:20px;font-size:.85rem;font-weight:600;color:#64748b;">
                        ${count} itens
                    </span>
                </td>
                <td style="text-align:right;">
                    <button onclick="catOpenFormModal('edit','${cat.id}','${cat.name}')" class="cat-action-btn" title="Editar">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button onclick="catOpenDeleteModal('${cat.id}','${cat.name}',${count})" class="cat-action-btn delete" title="Excluir">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </td>
            `;
            list.appendChild(tr);
        });
    }

    loader.classList.add('hidden');
    content.classList.remove('hidden');
}

// 2. SINCRONIZAR CATEGORIAS (PRODUCTS -> CATEGORIES)
async function catSyncProductCategories() {
    // 1 — Puxa todas as categorias já registradas
    const { data: categories, error: catErr } = await client
        .from('categories')
        .select('name');

    if (catErr) return;

    const existingCategories = categories.map(c => c.name.trim().toLowerCase());

    // 2 — Puxa todas as categorias usadas nos produtos
    const { data: products, error: prodErr } = await client
        .from('products')
        .select('category');

    if (prodErr) return;

    // 3 — Mapa das categorias usadas nos produtos
    const productCategories = [...new Set(
        products
            .map(p => p.category)
            .filter(c => c && c.trim() !== '')
            .map(c => c.trim())
    )];

    // 4 — Categorias que estão nos produtos mas não estão na tabela categories
    const missingCategories = productCategories.filter(
        pc => !existingCategories.includes(pc.toLowerCase())
    );

    if (missingCategories.length === 0) return;

    // 5 — Inserir categorias faltantes
    const insertPayload = missingCategories.map(name => ({ name }));

    const { error: insertErr } = await client
        .from('categories')
        .insert(insertPayload);

    if (!insertErr && window.showToast) {
        window.showToast('Categorias sincronizadas automaticamente!');
    }
}

// 3. ABRIR MODAL ADD/EDIT
function catOpenFormModal(mode, id = null, name = '') {
    document.getElementById('cat-input-mode').value = mode;
    document.getElementById('cat-input-id').value = id || '';
    document.getElementById('cat-input-name').value = name;
    document.getElementById('cat-input-old-name').value = name; // Para saber qual substituir nos produtos

    if (mode === 'add') {
        document.getElementById('cat-form-title').innerText = "Nova Categoria";
    } else {
        document.getElementById('cat-form-title').innerText = "Editar Categoria";
    }

    document.getElementById('cat-modal-form').classList.add('open');
}

// 4. SALVAR (CRIAR / EDITAR)
async function catHandleSave() {
    const mode = document.getElementById('cat-input-mode').value;
    const id = document.getElementById('cat-input-id').value;
    const newName = document.getElementById('cat-input-name').value.trim();
    const oldName = document.getElementById('cat-input-old-name').value;

    if (!newName) {
        if (window.showToast) window.showToast('O nome é obrigatório.');
        return;
    }

    if (mode === 'add') {
        const { error } = await client.from('categories').insert([{ name: newName }]);
        if (error) {
            if (window.showToast) window.showToast('Erro: ' + error.message);
            return;
        }
        if (window.showToast) window.showToast('Categoria criada!');
    } else {
        // renomear: atualiza tabela categories
        const { error: e1 } = await client
            .from('categories')
            .update({ name: newName })
            .eq('id', id);

        if (e1) {
            if (window.showToast) window.showToast('Erro: ' + e1.message);
            return;
        }

        // sincronizar produtos que usam o texto antigo
        // Isso garante que os produtos não fiquem órfãos de categoria
        if (oldName && oldName !== newName) {
            const { error: e2 } = await client
                .from('products')
                .update({ category: newName })
                .eq('category', oldName);

            if (e2) console.warn("Erro ao atualizar produtos vinculados", e2);
        }

        if (window.showToast) window.showToast('Categoria renomeada!');
    }

    catCloseModals();
    catLoadCategories();
}

// 5. EXCLUIR
function catOpenDeleteModal(id, name, count) {
    // Guarda dados temporários no botão ou variáveis globais, aqui usaremos atributos no próprio modal
    const modal = document.getElementById('cat-modal-delete');
    modal.dataset.targetId = id;
    modal.dataset.targetName = name;

    document.getElementById('cat-delete-target-name').innerText = name;
    document.getElementById('cat-delete-count-warning').innerText =
        count > 0
            ? `${count} produto(s) serão desvinculados (ficarão sem categoria).`
            : `Nenhum produto vinculado.`;

    modal.classList.add('open');
}

async function catConfirmDelete() {
    const modal = document.getElementById('cat-modal-delete');
    const id = modal.dataset.targetId;
    const name = modal.dataset.targetName;

    // 1 — Apaga categoria real
    const { error } = await client.from('categories').delete().eq('id', id);

    if (error) {
        if (window.showToast) window.showToast('Erro ao excluir: ' + error.message);
        return;
    }

    // 2 — Remove categoria dos produtos (seta null ou vazio)
    await client
        .from('products')
        .update({ category: null })
        .eq('category', name);

    if (window.showToast) window.showToast('Categoria excluída!');
    catCloseModals();
    catLoadCategories();
}

// HELPERS
function catCloseModals() {
    document.querySelectorAll('.cat-modal-overlay').forEach(m => m.classList.remove('open'));
}

/* =============================================================
   FIM LÓGICA DE CATEGORIAS
   ============================================================= */

// !!! IMPORTANTE: ATUALIZAR O LISTENER DE MENU JÁ EXISTENTE NO SEU ARQUIVO !!!
// Procure no seu dashboard.js onde tem: document.querySelectorAll('.submenu li').forEach...
// E adicione a verificação para carregar a categoria:

/* EXEMPLO DE COMO DEVE FICAR SEU BLOCO DE MENU NO DASHBOARD.JS:
   (Você pode apenas copiar o trecho abaixo e substituir o listener existente ou adicionar a lógica dentro dele)
*/

document.querySelectorAll('.submenu li').forEach(li => {
    li.addEventListener('click', () => {
        const target = li.getAttribute('data-content');
        if (!target) return;

        // Se for a página de categorias, carrega a lógica
        if (target === 'categoria-produto') {
            initCategoryPage();
        }

        // ... (resto do seu código de transição de abas) ...
    });
});
