// ===============================
// 🔹 SUPABASE CLIENT
// ===============================
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.client = client; // <--- ADICIONE ESTA LINHA

// 🔹 SUPABASE ADMIN (Mova isso pra cá para funcionar o financeiro global)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNzUyNCwiZXhwIjoyMDc0OTEzNTI0fQ.FaXzLoO9WX4Kr6W01dF8LrfSuw1SkGSdLnyXUXYwDa8'; // A que estava lá embaixo
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);



// ===============================
// 🔹 NOVAS KPI'S (USUÁRIOS E FORNECEDORES)
// ===============================

// 1. Atualizar contagem de Usuários (Profiles)
async function atualizarTotalUsuarios() {
    const el = document.getElementById('total-usuarios');
    if (!el) return;

    try {
        const { count, error } = await client
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        el.textContent = count ?? 0;
    } catch (err) {
        console.error("Erro usuarios KPI:", err);
    }
}

// 2. Atualizar contagem de Fornecedores
async function atualizarTotalFornecedores() {
    const el = document.getElementById('total-fornecedores');
    if (!el) return;

    try {
        const { count, error } = await client
            .from('fornecedores')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        el.textContent = count ?? 0;
    } catch (err) {
        console.error("Erro fornecedores KPI:", err);
    }
}

// 3. Listener Realtime Unificado para as KPIs
function iniciarRealtimeKPIs() {
    client.channel('realtime:dashboard_kpis')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            console.log("Mudança em profiles detectada!");
            atualizarTotalUsuarios();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fornecedores' }, () => {
            console.log("Mudança em fornecedores detectada!");
            atualizarTotalFornecedores();
        })
        .subscribe();
}

// 4. Adicionar na Inicialização (IMPORTANTE: Adicione isso dentro do seu DOMContentLoaded existente)
document.addEventListener("DOMContentLoaded", () => {
    // ... suas chamadas existentes
    atualizarTotalUsuarios();       // <--- NOVO
    atualizarTotalFornecedores();   // <--- NOVO
    iniciarRealtimeKPIs();          // <--- NOVO
    atualizarGraficoVendasReal(); // Adicione isso dentro do DOMContentLoaded
});

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
    loadSidebarProfile(); // <--- CHAMA AQUI
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

// assets/js/dashboard.js

// ... (código anterior mantido)

document.querySelectorAll('.submenu li').forEach(li => {
    li.addEventListener('click', () => {
        const target = li.getAttribute('data-content');
        if (!target) return;

        // Fecha sidebar no mobile
        if (window.innerWidth <= 1430) {
            const sidebar = document.querySelector('.body-left');
            if (sidebar.classList.contains('dash-open')) {
                toggleDashSidebar();
            }
        }

        // 1. SE FOR CATEGORIA
        if (target === 'categoria-produto') {
            initCategoryPage();
        }

        // 2. SE FOR CORES
        if (target === 'cores-produto') {
            initColorPage();
        }

        // 3. SE FOR CHAT DE SUPORTE (O CÓDIGO QUE FALTAVA)
        if (target === 'suporte-chat-admin') {
            // Pequeno delay para garantir que a div esteja visível (display: block)
            setTimeout(() => {
                if (typeof window.initAdminChat === 'function') {
                    console.log("Iniciando chat admin...");
                    window.initAdminChat();
                } else {
                    console.error("Função initAdminChat não encontrada no support-chat.js");
                }
            }, 100);
        }

        // Lógica de troca de abas (Visual)
        document.querySelectorAll('.submenu li').forEach(i => i.classList.remove('active'));
        li.classList.add('active');

        const currentPage = document.querySelector('.page.active');
        const newPage = document.getElementById(target);

        if (currentPage === newPage) return;

        if (currentPage) {
            currentPage.style.opacity = 0;
            setTimeout(() => {
                currentPage.classList.remove('active');
                if (newPage) {
                    newPage.classList.add('active');
                    setTimeout(() => (newPage.style.opacity = 1), 50);
                }
            }, 300);
        } else {
            if (newPage) {
                newPage.classList.add('active');
                setTimeout(() => (newPage.style.opacity = 1), 50);
            }
        }
    });
});

/* =========================================================
   GRÁFICO DE VENDAS PROFISSIONAL (Baseado em orders)
   ========================================================= */

const lineOptions = {
    chart: {
        type: "area",
        height: 350,
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
    },
    colors: ["#191D28"], // Navy TopStyle
    stroke: { curve: "smooth", width: 3 },
    fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] }
    },
    series: [{ name: "Pedidos Concluídos", data: new Array(12).fill(0) }],
    xaxis: {
        categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        axisBorder: { show: false },
        labels: { style: { colors: '#94a3b8' } }
    },
    yaxis: {
        labels: { style: { colors: '#94a3b8' } }
    },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    dataLabels: { enabled: false },
    tooltip: { theme: 'dark', x: { show: true } }
};

const lineChart = new ApexCharts(document.querySelector("#lineChart"), lineOptions);
lineChart.render();

async function atualizarGraficoVendasReal() {
    const selector = document.getElementById('chart-year-selector');
    const selectedYear = selector ? selector.value : new Date().getFullYear();

    try {
        // Buscamos na tabela orders ignorando cancelados para ter um dado real de venda
        const { data, error } = await client
            .from('orders')
            .select('created_at')
            .neq('status', 'CANCELADO')
            .gte('created_at', `${selectedYear}-01-01T00:00:00`)
            .lte('created_at', `${selectedYear}-12-31T23:59:59`);

        if (error) throw error;

        const pedidosPorMes = new Array(12).fill(0);

        data.forEach(order => {
            const date = new Date(order.created_at);
            const mes = date.getMonth();
            pedidosPorMes[mes]++;
        });

        // Lógica de Crescimento (Comparação Dezembro vs Novembro para o badge)
        const dez = pedidosPorMes[11] || 0;
        const nov = pedidosPorMes[10] || 0;
        let crescimento = 0;
        if (nov > 0) crescimento = ((dez - nov) / nov) * 100;
        else if (dez > 0) crescimento = 100;

        document.getElementById('growth-value').innerText = `${crescimento.toFixed(1)}% este mês`;

        lineChart.updateSeries([{
            name: "Pedidos Concluídos",
            data: pedidosPorMes
        }]);

    } catch (err) {
        console.error("Erro ao processar pedidos do gráfico:", err);
    }
}

// Escuta em tempo real inserções na tabela orders
function ouvirOrdersRealtime() {
    client.channel('public:orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
            atualizarGraficoVendasReal();
        })
        .subscribe();
}

// Chamar no final do arquivo dashboard.js ou no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    atualizarGraficoVendasReal();
    ouvirOrdersRealtime();
});

// =========================================================
//  DASHBOARD FINANCEIRO (VIA POLÍTICA RLS)
// =========================================================

// =========================================================
//  DASHBOARD FINANCEIRO (MODIFICADO: ABREVIAÇÃO + MODAL)
// =========================================================

// Estado global para guardar os valores exatos
let dashboardState = {
    vendasTotais: 0,
    lucroBruto: 0,
    custoTotal: 0,
    lucroLiquido: 0
};

// 1. Função Formatadora (Milhões, Bilhões, Trilhões)
function formatarAbreviado(valor, isMoeda = true) {
    // Se não for moeda (ex: quantidade de itens), formata normal se for pequeno
    if (!isMoeda) {
        if (valor < 1000000) return Math.floor(valor) + " itens";
    }

    // Converter para absoluto para calcular a magnitude
    let val = Math.abs(valor);
    let sufixo = "";
    let divisor = 1;

    if (val >= 1e12) { // Trilhões
        sufixo = " Trilhões";
        divisor = 1e12;
    } else if (val >= 1e9) { // Bilhões
        sufixo = " Bilhões";
        divisor = 1e9;
    } else if (val >= 1e6) { // Milhões
        sufixo = " Milhões";
        divisor = 1e6;
    } else {
        // Se for menor que 1 milhão, usa formatação padrão de moeda
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Calcula o valor abreviado
    let valorAbreviado = (valor / divisor).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    // Retorna string final (Ex: "R$ 1,52 Milhões" ou apenas "1,52 Milhões")
    return (isMoeda ? "R$ " : "") + valorAbreviado + sufixo;
}

// 2. Função de Atualização Principal
async function atualizarMetricasFinanceiras() {
    try {
        const { data: itens, error } = await client
            .from('order_items')
            .select('quantity, price');

        if (error) throw error;

        let qtdTotal = 0;
        let receitaBruta = 0;

        itens.forEach(item => {
            const qtd = Number(item.quantity) || 0;
            const preco = Number(item.price) || 0;

            qtdTotal += qtd;
            receitaBruta += (preco * qtd);
        });

        // Simulação de custos (Exemplo: 40% de custo)
        const custoTotal = receitaBruta * 0.40;
        const lucroLiquido = receitaBruta - custoTotal;

        // --- SALVA NO ESTADO GLOBAL (Valores Cheios) ---
        dashboardState.vendasTotais = qtdTotal;
        dashboardState.lucroBruto = receitaBruta;
        dashboardState.custoTotal = custoTotal;
        dashboardState.lucroLiquido = lucroLiquido;

        // --- ATUALIZA A TELA (Valores Abreviados) ---
        // Aqui atualizamos diretamente o texto para garantir a formatação correta "Mi/Bi"

        const elVendas = document.getElementById('valor-vendas-totais');
        const elBruto = document.getElementById('valor-lucro-bruto');
        const elCusto = document.getElementById('valor-custo-total');
        const elLiquido = document.getElementById('valor-lucro-liquido');

        if (elVendas) elVendas.innerText = formatarAbreviado(qtdTotal, false); // False = não é moeda
        if (elBruto) elBruto.innerText = formatarAbreviado(receitaBruta, true);
        if (elCusto) elCusto.innerText = formatarAbreviado(custoTotal, true);
        if (elLiquido) elLiquido.innerText = formatarAbreviado(lucroLiquido, true);

    } catch (err) {
        console.error("Erro financeiro:", err);
    }
}

// 3. Funções do Modal "Ver Tudo"
window.openFinanceModal = function () {
    // Preenche o modal com os valores exatos do dashboardState
    document.getElementById('modal-fin-vendas').innerText = dashboardState.vendasTotais.toLocaleString('pt-BR') + " itens";
    document.getElementById('modal-fin-bruto').innerText = dashboardState.lucroBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('modal-fin-custo').innerText = dashboardState.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('modal-fin-liquido').innerText = dashboardState.lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const modal = document.getElementById('modal-finance-details');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

window.closeFinanceModal = function () {
    const modal = document.getElementById('modal-finance-details');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// O Realtime permanece igual
function iniciarRealtimeFinanceiro() {
    client
        .channel('realtime:financeiro_geral')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'order_items' },
            (payload) => {
                // console.log('Movimentação financeira detectada');
                atualizarMetricasFinanceiras();
            }
        )
        .subscribe();
}

document.addEventListener('DOMContentLoaded', () => {
    atualizarMetricasFinanceiras();
    iniciarRealtimeFinanceiro();
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
    if (!wrapper) {
        console.warn("Dropdown de banimento não encontrado no DOM!"); // Debug
        return;
    }

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

    // Toggle Dropdown
    trigger.addEventListener('click', (e) => {
        console.log("Clicou no dropdown de banimento"); // Debug para ver se o clique chega
        e.stopPropagation();
        wrapper.classList.toggle('open');
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
    // Pega valor do input hidden (permanent ou temporary)
    const duration = document.getElementById('ban-duration-value').value;
    const reason = document.getElementById('ban-reason').value.trim();
    const dateInput = document.getElementById('ban-date-input').value;

    if (!currentUserId) {
        if (window.showToast) window.showToast("Erro: ID do usuário não encontrado.");
        return;
    }

    if (!duration) {
        if (window.showToast) window.showToast("Selecione a duração do banimento.", "error");
        return;
    }
    if (!reason) {
        if (window.showToast) window.showToast("Digite um motivo.", "error");
        return;
    }

    let bannedUntil = null;

    if (duration === 'temporary') {
        if (!dateInput) {
            if (window.showToast) window.showToast("Selecione a data final.", "error");
            return;
        }
        bannedUntil = new Date(dateInput).toISOString();
    }

    // Envia para o Supabase (AGORA COM ban_type)
    const { error } = await supabaseAdmin
        .from('user_bans')
        .insert([
            {
                user_id: currentUserId,
                reason: reason,
                banned_until: bannedUntil,
                ban_type: duration // <--- ADICIONADO: envia 'permanent' ou 'temporary'
            }
        ]);

    if (error) {
        console.error(error);
        if (window.showToast) window.showToast("Erro ao banir: " + error.message);
    } else {
        if (window.showToast) window.showToast("Usuário banido com sucesso!");

        closeBanModal();
        closeUserModal();
        mostrarProfiles();
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
        // MODIFICADO: Agora lê 'stock' conforme sua tabela SQL
        const q = (p.stock !== undefined && p.stock !== null) ? p.stock : 0;

        const card = document.createElement('div');
        card.className = 'ProCard';

        card.innerHTML = `
          <div class="ProTooltip">Clique para copiar ID</div>

          <div class="ProImgBox" onclick="copyId('${p.id}')">
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
                <button class="ProEdit" onclick="dashEditProduct('${p.id}')">Editar</button>
                <button class="ProView" onclick="openLink('${p.link || '#'}')">Ver</button>
                <button class="ProDelete" onclick="deleteProduct('${p.id}')">Excluir</button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function openLink(link) {
    if (!link || link === "#") {
        if (window.showToast) window.showToast("Nenhum link definido para este produto.", "error");
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

/* =============================================================
   DROP (COLEÇÕES)
*/

(() => {
    'use strict';

    const DROP_TABLE = 'drops';
    const PRODUCT_TABLE = 'products';
    const DROP_BUCKET = 'drop-imgs';

    async function ensureClient() {
        // 1) se existe binding 'client' (declared as const client = ... no dashboard.js), use-o
        try {
            if (typeof client !== 'undefined' && client) {
                return client;
            }
        } catch (e) { /* acessando client pode lançar se não existir */ }

        // 2) se window.client foi definido explicitamente, use-o
        if (window.client) {
            return window.client;
        }

        // 3) se window.supabase (lib carregada) e variáveis globais SUPABASE_URL/SUPABASE_KEY existirem, crie client a partir disso
        try {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                const url = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL :
                    (window.SUPABASE_URL || null);
                const key = (typeof SUPABASE_KEY !== 'undefined') ? SUPABASE_KEY :
                    (window.SUPABASE_KEY || null);

                if (url && key) {
                    // cria e armazena em window.client para reutilização
                    window.client = window.supabase.createClient(url, key);
                    return window.client;
                }
                // se não houver url/key suficientes, não quebramos: tentamos fallback abaixo
            }
        } catch (e) {
            console.warn('ensureClient: falha ao usar window.supabase.createClient', e);
        }

        // 4) fallback: importa supabase-js dinamicamente (mantemos constantes internas ao drops se não houver outras)
        try {
            const SUPABASE_URL_FALLBACK = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
            const SUPABASE_KEY_FALLBACK = (typeof SUPABASE_KEY !== 'undefined') ? SUPABASE_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';

            const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
            const createClient = mod.createClient;
            window.client = createClient(SUPABASE_URL_FALLBACK, SUPABASE_KEY_FALLBACK);
            return window.client;
        } catch (err) {
            console.error('ensureClient: não foi possível criar/obter Supabase client', err);
            throw err;
        }
    }

    function showToastSafe(msg, type = 'info') {
        if (typeof window.showToast === 'function') {
            try { window.showToast(msg, type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info'), 3500); return; } catch (e) { /* noop */ }
        }
        console.log(`[toast ${type}]`, msg);
    }

    function escapeHtml(s) {
        if (s === undefined || s === null) return '';
        return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    // util: cria nome de arquivo único
    function makeUniqueFilename(originalName = '') {
        const ext = (originalName.match(/\.[^.]+$/) || [''])[0];
        const base = originalName.replace(/\.[^.]*$/, '').replace(/[^a-z0-9_\-\.]/gi, '_').slice(0, 40);
        const t = Date.now();
        const r = Math.floor(Math.random() * 1e6);
        return `drops/${t}_${r}_${base}${ext}`;
    }

    // resolve URL pública a partir do campo image_drop: se já for URL retorna; se for path tenta obter public URL do bucket
    async function resolveDropImageUrl(client, imageValue) {
        if (!imageValue) return null;
        const s = String(imageValue).trim();
        if (/^https?:\/\//i.test(s)) return s;
        try {
            // getPublicUrl retorno está disponível
            const res = client.storage.from(DROP_BUCKET).getPublicUrl(s.replace(/^\/+/, ''));
            if (res && (res.data?.publicUrl || res.publicUrl)) {
                return res.data?.publicUrl || res.publicUrl;
            }
        } catch (e) {
            console.warn('resolveDropImageUrl erro', e);
        }
        // fallback: construir path público (se bucket for público)
        try {
            const base = window.client ? (window.client.storage?.url || '') : '';
            if (base) return `${base}/${encodeURIComponent(s)}`;
        } catch (e) { /* noop */ }
        return s;
    }

    /* -------------------- LISTAR / RENDERIZAR DROPS -------------------- */

    async function dropLoadDrops() {
        const loader = document.getElementById('drop-loader');
        const content = document.getElementById('drop-content');
        const listBody = document.getElementById('drop-list-body');
        const emptyState = document.getElementById('drop-empty-state');
        const statsContainer = document.getElementById('drop-stats-container');

        if (!loader || !content || !listBody || !statsContainer || !emptyState) {
            console.warn('dropLoadDrops: elementos DOM essenciais não encontrados.', { loader, content, listBody, emptyState, statsContainer });
            return;
        }

        loader.classList.remove('hidden');
        content.classList.add('hidden');

        let client;
        try { client = await ensureClient(); } catch (e) { loader.classList.add('hidden'); showToastSafe('Erro interno (cliente).', 'error'); return; }

        // pega drops
        let { data: drops, error: dropsErr } = await client
            .from(DROP_TABLE)
            .select('id, name_drop, image_drop')
            .order('name_drop', { ascending: true });

        if (dropsErr) {
            console.error('Erro ao buscar drops:', dropsErr);
            loader.classList.add('hidden');
            showToastSafe('Erro ao carregar drops. Veja console.', 'error');
            return;
        }

        // pega produtos para contagem por dropName
        let { data: products, error: prodErr } = await client
            .from(PRODUCT_TABLE)
            .select('id, dropName');

        if (prodErr) {
            console.warn('Erro ao buscar produtos para contagem:', prodErr);
            products = [];
        }

        // monta mapa dropName -> quantidade
        const countMap = {};
        (products || []).forEach(p => {
            if (!p.dropName) return;
            const k = String(p.dropName).trim();
            if (!k) return;
            countMap[k] = (countMap[k] || 0) + 1;
        });

        // debug log para diagnosticar porque o wrapper pode estar oculto
        console.debug('dropLoadDrops: drops length=', Array.isArray(drops) ? drops.length : 'null', 'products length=', Array.isArray(products) ? products.length : 'null');

        // stats
        statsContainer.innerHTML = `
    <div class="drop-stat-card">
      <div class="drop-stat-icon" style="background:#eff6ff;color:#2563eb;">
        <i class="bi bi-images"></i>
      </div>
      <div class="drop-stat-info">
        <h3>${drops ? drops.length : 0}</h3>
        <p>Drops Cadastrados</p>
      </div>
    </div>
    <div class="drop-stat-card">
      <div class="drop-stat-icon" style="background:#f0fdf4;color:#16a34a;">
        <i class="bi bi-box-seam-fill"></i>
      </div>
      <div class="drop-stat-info">
        <h3>${products ? products.length : 0}</h3>
        <p>Produtos Totais</p>
      </div>
    </div>
  `;

        // Render tabela — pega o wrapper dentro do content para evitar ambiguidades
        const tableWrapper = content.querySelector('.drop-table-wrapper');
        if (!tableWrapper) {
            console.warn('dropLoadDrops: .drop-table-wrapper não encontrado dentro de #drop-content. Verifique o DOM.');
        }

        listBody.innerHTML = '';
        if (!Array.isArray(drops) || drops.length === 0) {
            // não há drops: mostra estado vazio e esconde a tabela
            emptyState.classList.remove('hidden');
            if (tableWrapper) {
                tableWrapper.classList.add('hidden');
                tableWrapper.style.removeProperty('display'); // limpeza extra caso tenha sido mexido
            }
        } else {
            // há drops: esconde estado vazio e mostra a tabela
            emptyState.classList.add('hidden');

            if (tableWrapper) {
                // Garante que a classe 'hidden' seja removida (evita conflitos com CSS !important)
                tableWrapper.classList.remove('hidden');
                // Se por algum motivo a propriedade inline 'display' foi forçada para none, limpa-a
                tableWrapper.style.removeProperty('display');
            } else {
                // fallback: se por alguma razão não achou wrapper, tentar tornar visível o content inteiro
                content.classList.remove('hidden');
            }

            for (const d of drops) {
                const count = countMap[d.name_drop] || 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex:none;">
              <img src="${escapeHtml(await (resolveDropImageUrl(client, d.image_drop) || ''))}" alt="${escapeHtml(d.name_drop || '')}" style="width:48px;height:48px;object-fit:cover;display:block;" onerror="this.style.display='none'">
            </div>
            <div style="display:flex;flex-direction:column;">
              <span style="font-weight:600">${escapeHtml(d.name_drop || '')}</span>
              <small style="color:#94a3b8;font-size:.82rem">${escapeHtml(d.image_drop || '')}</small>
            </div>
          </div>
        </td>
        <td style="text-align:center;">
          <span style="background:#f1f5f9;padding:6px 12px;border-radius:20px;font-size:.85rem;font-weight:600;color:#64748b;">
            ${count} itens
          </span>
        </td>
        <td style="text-align:right;">
          <button class="drop-action-btn" title="Editar" onclick="dropOpenFormModal('edit','${escapeHtml(d.id)}','${escapeHtml(d.name_drop)}','${escapeHtml(d.image_drop || '')}')">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="drop-action-btn delete" title="Excluir" onclick="dropOpenDeleteModal('${escapeHtml(d.id)}','${escapeHtml(d.name_drop)}',${count})">
            <i class="bi bi-trash3-fill"></i>
          </button>
        </td>
      `;
                listBody.appendChild(tr);
            }
        }

        loader.classList.add('hidden');
        content.classList.remove('hidden');
    }

    /* -------------------- SINCRONIZAR DROPS (products -> drops) --------------------
       Garante que todo drop usado em products.dropName exista na tabela drops.
    */
    async function dropSyncFromProducts() {
        let client;
        try { client = await ensureClient(); } catch (e) { return; }

        // puxa drops existentes
        const { data: existing, error: existingErr } = await client.from(DROP_TABLE).select('name_drop');
        if (existingErr) { console.warn('dropSyncFromProducts: erro', existingErr); return; }
        const existingNames = (existing || []).map(x => String(x.name_drop).trim().toLowerCase());

        // pega dropName únicos do products
        const { data: products, error: prodErr } = await client.from(PRODUCT_TABLE).select('dropName');
        if (prodErr) { console.warn('dropSyncFromProducts: erro produtos', prodErr); return; }
        const usedNames = [...new Set((products || []).map(p => (p.dropName || '').toString().trim()).filter(Boolean))];

        const missing = usedNames.filter(n => !existingNames.includes(n.toLowerCase()));
        if (missing.length === 0) return;

        const payload = missing.map(n => ({ name_drop: n }));
        const { error: insertErr } = await client.from(DROP_TABLE).insert(payload);
        if (!insertErr) showToastSafe('Drops sincronizados automaticamente!', 'success');
        else console.warn('dropSyncFromProducts: insertErr', insertErr);
    }

    /* -------------------- FORM MODAL (create/edit) -------------------- */
    // HTML modal IDs used in your markup:
    // #drop-modal-form, input fields: #drop-input-name, #drop-input-old-name, #drop-input-mode, #drop-input-id
    // We will also inject a file input for upload and a URL input for image.

    function dropOpenFormModal(mode = 'add', id = '', name = '', image = '') {
        const modal = document.getElementById('drop-modal-form');
        if (!modal) { console.warn('dropOpenFormModal: modal não encontrado'); return; }

        // garante inputs existem (se não, cria)
        let inputName = document.getElementById('drop-input-name');
        let inputOldName = document.getElementById('drop-input-old-name');
        let inputMode = document.getElementById('drop-input-mode');
        let inputId = document.getElementById('drop-input-id');

        const contentWrap = modal.querySelector('.drop-modal-content') || modal;

        if (!inputName) {
            inputName = document.createElement('input');
            inputName.id = 'drop-input-name';
            inputName.className = 'drop-form-input';
            inputName.placeholder = 'Ex: Oversized';
            contentWrap.appendChild(inputName);
        }
        if (!inputOldName) {
            inputOldName = document.createElement('input'); inputOldName.type = 'hidden'; inputOldName.id = 'drop-input-old-name';
            contentWrap.appendChild(inputOldName);
        }
        if (!inputMode) {
            inputMode = document.createElement('input'); inputMode.type = 'hidden'; inputMode.id = 'drop-input-mode';
            contentWrap.appendChild(inputMode);
        }
        if (!inputId) {
            inputId = document.createElement('input'); inputId.type = 'hidden'; inputId.id = 'drop-input-id';
            contentWrap.appendChild(inputId);
        }

        // imagem: cria campo de url e file input se não existirem
        let imgUrlInput = document.getElementById('drop-input-image-url');
        if (!imgUrlInput) {
            imgUrlInput = document.createElement('input');
            imgUrlInput.id = 'drop-input-image-url';
            imgUrlInput.className = 'drop-form-input';
            imgUrlInput.placeholder = 'URL da imagem (opcional)';

            const footerEl = modal.querySelector('.drop-modal-footer');
            if (footerEl && footerEl.parentNode) {
                footerEl.parentNode.insertBefore(imgUrlInput, footerEl);
            } else {
                contentWrap.appendChild(imgUrlInput); - fallback
            }
        }

        let imgFileInput = document.getElementById('drop-input-image-file');
        if (!imgFileInput) {
            imgFileInput = document.createElement('input');
            imgFileInput.id = 'drop-input-image-file';
            imgFileInput.type = 'file';
            imgFileInput.accept = 'image/*';
            imgFileInput.style.display = 'block';
            imgFileInput.className = 'drop-form-input';

            const label = document.createElement('label');
            label.style.fontSize = '0.9rem';
            label.style.marginTop = '6px';
            label.textContent = 'Ou envie um arquivo (opcional):';

            const footerEl2 = modal.querySelector('.drop-modal-footer');
            if (footerEl2 && footerEl2.parentNode) {
                footerEl2.parentNode.insertBefore(label, footerEl2);
                footerEl2.parentNode.insertBefore(imgFileInput, footerEl2);
            } else {
                contentWrap.appendChild(label);
                contentWrap.appendChild(imgFileInput);
            }
        }

        // popula valores
        inputMode.value = mode;
        inputId.value = id || '';
        inputName.value = name || '';
        inputOldName.value = name || '';
        imgUrlInput.value = image || '';

        // abre modal
        modal.classList.add('open');
        // focus no input nome
        setTimeout(() => inputName.focus(), 120);
    }

    async function dropHandleSave() {
        const modal = document.getElementById('drop-modal-form');
        if (!modal) return;
        const inputMode = document.getElementById('drop-input-mode');
        const inputId = document.getElementById('drop-input-id');
        const inputName = document.getElementById('drop-input-name');
        const inputOldName = document.getElementById('drop-input-old-name');
        const imgUrlInput = document.getElementById('drop-input-image-url');
        const imgFileInput = document.getElementById('drop-input-image-file');

        const mode = inputMode?.value || 'add';
        const id = inputId?.value || '';
        const newName = (inputName?.value || '').trim();
        const oldName = (inputOldName?.value || '').trim();
        const imageUrlField = (imgUrlInput?.value || '').trim();
        const file = imgFileInput?.files && imgFileInput.files[0] ? imgFileInput.files[0] : null;

        if (!newName) {
            showToastSafe('Nome do drop é obrigatório.', 'error');
            return;
        }

        let client;
        try { client = await ensureClient(); } catch (e) { showToastSafe('Erro interno (cliente).', 'error'); return; }

        // função auxiliar para fazer upload (se houver file) e retornar valor a salvar em image_drop
        async function uploadIfNeeded(fileObj) {
            if (!fileObj) return null;
            try {
                const filename = makeUniqueFilename(fileObj.name || 'img.png');
                // upload (overwrite = false)
                const up = await client.storage.from(DROP_BUCKET).upload(filename, fileObj, { cacheControl: '3600', upsert: false });
                if (up.error) {
                    // se erro de conflito de nome, tenta outro nome
                    if (up.error.status === 409) {
                        const alt = makeUniqueFilename(fileObj.name || 'img.png');
                        const up2 = await client.storage.from(DROP_BUCKET).upload(alt, fileObj, { upsert: false });
                        if (up2.error) throw up2.error;
                        // retorna path
                        return alt;
                    }
                    throw up.error;
                }
                // retorna path relativo (sem /object/public prefix). Ao salvar no DB usaremos esse path
                return filename;
            } catch (err) {
                console.error('uploadIfNeeded erro', err);
                throw err;
            }
        }

        try {
            // se existir arquivo, faz upload
            let imageToSave = imageUrlField || null;
            if (file) {
                const path = await uploadIfNeeded(file);
                // cria URL público
                try {
                    const pub = client.storage.from(DROP_BUCKET).getPublicUrl(path);
                    imageToSave = (pub && (pub.data?.publicUrl || pub.publicUrl)) || path;
                } catch (e) {
                    // fallback: salva o path (backend pode saber montar URL)
                    imageToSave = path;
                }
            }

            if (mode === 'add') {
                const payload = { name_drop: newName, image_drop: imageToSave };
                const { error } = await client.from(DROP_TABLE).insert([payload]);
                if (error) throw error;
                showToastSafe('Drop criado com sucesso!', 'success');
            } else {
                // edit
                const updates = { name_drop: newName };
                if (imageToSave !== null) updates.image_drop = imageToSave;
                const { error } = await client.from(DROP_TABLE).update(updates).eq('id', id);
                if (error) throw error;

                // se o nome mudou, atualiza products.dropName que tinham o oldName
                if (oldName && oldName !== newName) {
                    const { error: e2 } = await client.from(PRODUCT_TABLE).update({ dropName: newName }).eq('dropName', oldName);
                    if (e2) console.warn('dropHandleSave: erro ao atualizar produtos vinculados', e2);
                }

                showToastSafe('Drop atualizado!', 'success');
            }
            // recarrega
            dropCloseModals();
            await dropLoadDrops();
        } catch (err) {
            console.error('dropHandleSave erro', err);
            showToastSafe('Erro ao salvar drop. Veja console.', 'error');
        }
    }

    /* -------------------- DELETAR -------------------- */
    function dropOpenDeleteModal(id, name, count) {
        const modal = document.getElementById('drop-modal-delete');
        if (!modal) return;
        modal.dataset.targetId = id;
        modal.dataset.targetName = name || '';
        const nameEl = document.getElementById('drop-delete-target-name');
        const warnEl = document.getElementById('drop-delete-count-warning');
        if (nameEl) nameEl.textContent = name || '';
        if (warnEl) warnEl.textContent = count > 0 ? `${count} produto(s) serão desvinculados (ficarão sem drop).` : 'Nenhum produto vinculado.';
        modal.classList.add('open');
    }

    async function dropConfirmDelete() {
        const modal = document.getElementById('drop-modal-delete');
        if (!modal) return;
        const id = modal.dataset.targetId;
        const name = modal.dataset.targetName;

        if (!id) { showToastSafe('ID do drop ausente.', 'error'); return; }

        let client;
        try { client = await ensureClient(); } catch (e) { showToastSafe('Erro interno (cliente).', 'error'); return; }

        try {
            const { error } = await client.from(DROP_TABLE).delete().eq('id', id);
            if (error) throw error;

            // desvincula produtos que apontavam para esse drop (set null)
            const { error: e2 } = await client.from(PRODUCT_TABLE).update({ dropName: null }).eq('dropName', name);
            if (e2) console.warn('dropConfirmDelete: erro ao desvincular produtos', e2);

            showToastSafe('Drop excluído.', 'success');
            dropCloseModals();
            await dropLoadDrops();
        } catch (err) {
            console.error('dropConfirmDelete erro', err);
            showToastSafe('Erro ao excluir drop. Veja console.', 'error');
        }
    }

    function dropCloseModals() {
        document.querySelectorAll('.drop-modal-overlay').forEach(m => m.classList.remove('open'));
    }

    /* -------------------- BOOT / BIND -------------------- */
    // expõe funções globais usadas pelo HTML onClick
    window.dropOpenFormModal = dropOpenFormModal;
    window.dropOpenDeleteModal = dropOpenDeleteModal;
    window.dropConfirmDelete = dropConfirmDelete;
    window.dropHandleSave = dropHandleSave;
    window.dropCloseModals = dropCloseModals;

    // init: sincroniza e carrega
    async function init() {
        try {
            await ensureClient();
            // sincroniza (se desejar manter sincronização automática)
            await dropSyncFromProducts();
            await dropLoadDrops();
        } catch (e) {
            console.error('drops-admin init erro', e);
        }
    }

    // inicia quando DOM pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

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

/* =========================================================
   LÓGICA DO RELATÓRIO DE VENDAS (Best Sellers)
   ========================================================= */

// Estado global do relatório
let reportState = {
    period: 'all', // all, month, week, today
    sortAsc: false, // false = mais vendidos primeiro
    offset: 0,
    limit: 10,
    loading: false
};

// Listener para inicializar quando clicar no menu
document.querySelectorAll('.submenu li[data-content="relatorio-vendas"]').forEach(li => {
    li.addEventListener('click', () => {
        // Reseta e carrega ao entrar na aba
        setReportPeriod('all');
    });
});

// 1. Define o período e recarrega
function setReportPeriod(period) {
    reportState.period = period;

    // Atualiza botões visuais
    document.querySelectorAll('.filter-group-time .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(periodToText(period))) {
            btn.classList.add('active');
        } else if (period === 'all' && btn.textContent === 'Tudo') {
            btn.classList.add('active');
        }
    });

    resetAndLoadReport();
}

// Helper para texto do botão
function periodToText(p) {
    if (p === 'month') return 'mês';
    if (p === 'week') return 'semana';
    if (p === 'today') return 'hoje';
    return 'tudo';
}

// 2. Reseta paginação e carrega do zero
function resetAndLoadReport() {
    reportState.offset = 0;
    reportState.sortAsc = document.getElementById('report-sort-select').value === 'asc';

    const grid = document.getElementById('report-grid');
    grid.innerHTML = ''; // Limpa grid
    document.getElementById('btn-report-load-more').classList.add('hidden');

    fetchBestSellers();
}

// 3. Carregar Mais (Paginação Infinita manual)
function loadMoreReport() {
    reportState.offset += reportState.limit;
    fetchBestSellers();
}

// Chame isso uma vez ao carregar a página de Relatórios
document.addEventListener('DOMContentLoaded', () => {
    // se o container do relatório está presente, inicializa
    if (document.getElementById('report-grid')) {
        // garante que o select exista antes de ler
        const sel = document.getElementById('report-sort-select');
        reportState.sortAsc = sel ? sel.value === 'asc' : false;
        resetAndLoadReport(); // carrega a primeira página
    }
});

// ----------------- fetchBestSellers (melhorada, com loader e log) -----------------
async function fetchBestSellers() {
    if (reportState.loading) return;
    reportState.loading = true;

    const loader = document.getElementById('report-loader');
    const grid = document.getElementById('report-grid');
    const btnMore = document.getElementById('btn-report-load-more');

    if (loader) loader.classList.remove('hidden');
    if (btnMore) btnMore.classList.add('hidden');

    // Calcular Data de Início
    let startDate = new Date(0).toISOString(); // default tudo
    const now = new Date();

    if (reportState.period === 'today') {
        now.setHours(0, 0, 0, 0);
        startDate = now.toISOString();
    } else if (reportState.period === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        startDate = monday.toISOString();
    } else if (reportState.period === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDay.toISOString();
    }

    try {
        // Chama a função RPC
        const { data, error } = await client.rpc('get_best_sellers_report', {
            period_start: startDate,
            sort_asc: reportState.sortAsc,
            page_limit: reportState.limit,
            page_offset: reportState.offset
        });

        if (error) throw error;

        console.log('RPC data', data);

        // Se não vier array ou vazio na primeira página, mostra vazio
        if (!Array.isArray(data) || data.length === 0) {
            if (reportState.offset === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#6b7280;">Nenhuma venda encontrada neste período.</div>';
            }
            // nada mais a fazer
        } else {
            renderReportCards(data);
            // controla botão ver mais
            if (data.length < reportState.limit) {
                btnMore?.classList.add('hidden');
            } else {
                btnMore?.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error("Erro relatório (fetchBestSellers):", err);
        if (window.showToast) window.showToast("Erro ao carregar relatório: " + (err.message || err));
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ef4444;">Erro ao buscar relatório. Veja console.</div>`;
    } finally {
        if (loader) loader.classList.add('hidden');
        reportState.loading = false;
    }
}


// 5. Renderiza HTML
function renderReportCards(products) {
    const grid = document.getElementById('report-grid');

    if (products.length === 0 && reportState.offset === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280;">Nenhuma venda encontrada neste período.</div>';
        return;
    }

    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'report-card fade-in';
        // Adiciona cursor pointer para indicar clique
        div.style.cursor = 'pointer';

        // Passamos os dados do produto para a função ao clicar
        // Precisamos escapar as aspas do nome e imagem para não quebrar o HTML
        const safeName = p.nome ? p.nome.replace(/'/g, "\\'") : '';
        const safeImg = p.img ? p.img : '';
        const safeId = p.product_id;
        const total = p.total_sold;

        // O evento onclick chama nosso novo modal
        div.setAttribute('onclick', `openProductDetailsModal('${safeId}', '${safeName}', '${safeImg}', '${total}')`);

        let icon = p.total_sold > 50 ? 'bi-fire' : 'bi-bag-check-fill';
        let badgeColor = p.total_sold > 50 ? '#ef4444' : '#191D28';

        div.innerHTML = `
            <div class="sales-badge" style="background: ${badgeColor};">
                <i class="bi ${icon}"></i>
                <span>${p.total_sold} vendidos</span>
            </div>
            
            <div class="report-img-box">
                ${p.img ? `<img src="${p.img}" alt="${p.nome}">` : '<i class="bi bi-image" style="font-size:2rem;color:#ccc;"></i>'}
            </div>
            
            <div class="report-info">
                <h3 class="report-title" title="${p.nome}">${p.nome || 'Produto sem nome'}</h3>
                <div class="report-id">ID: ${p.product_id}</div>
            </div>
        `;
        grid.appendChild(div);
    });
}

// =========================================================
// NOVO: LÓGICA DO MODAL DE DETALHES DO PRODUTO
// =========================================================
let currentViewingProductId = null; // Guarda o ID para usar no modal de histórico

function openProductDetailsModal(id, name, img, total) {
    currentViewingProductId = id;

    // Preencher Modal
    document.getElementById('prod-detail-name').innerText = name;
    document.getElementById('prod-detail-id').innerText = id;
    document.getElementById('prod-detail-total').innerText = total + " unidades";

    const imgEl = document.getElementById('prod-detail-img');
    const iconEl = document.getElementById('prod-detail-icon');

    if (img && img !== 'null') {
        imgEl.src = img;
        imgEl.style.display = 'block';
        iconEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        iconEl.style.display = 'block';
    }

    // Configurar botão de ver vendas
    const btnHistory = document.getElementById('btn-view-sales-history');
    btnHistory.onclick = () => {
        // NÃO fechamos o modal de detalhes, apenas abrimos o próximo por cima
        openProductSalesModal();
    };

    // Mostrar Modal
    const modal = document.getElementById('modal-product-details-view');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeProductDetailsModal() {
    const modal = document.getElementById('modal-product-details-view');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// =========================================================
// NOVO: LÓGICA DO MODAL DE HISTÓRICO DE VENDAS
// =========================================================

function openProductSalesModal() {
    const modal = document.getElementById('modal-product-sales-history');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);

    // Carrega dados iniciais (Filtro: Tudo)
    // Reseta botões visualmente para "Tudo"
    const buttons = modal.querySelectorAll('.filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    buttons[0].classList.add('active');

    loadProductSales('all');
}

function closeProductSalesModal() {
    const modal = document.getElementById('modal-product-sales-history');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);

    // Opcional: Reabrir o modal de detalhes ao voltar?
    // Se quiser, descomente a linha abaixo e passe os dados salvos anteriormente
    // openProductDetailsModal(currentViewingProductId, ...); 
}

async function loadProductSales(period, btnElement) {
    if (!currentViewingProductId) return;

    // Atualiza visual dos botões se foi clicado
    if (btnElement) {
        const parent = btnElement.parentElement;
        parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    const listContainer = document.getElementById('sales-history-list');
    listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color:#94a3b8;"><i class="ri-loader-4-line ri-spin"></i> Carregando vendas...</div>';

    // Calcular Data de Início (Mesma lógica do relatório principal)
    let startDate = '1970-01-01';
    const now = new Date();

    if (period === 'today') {
        now.setHours(0, 0, 0, 0);
        startDate = now.toISOString();
    } else if (period === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        startDate = monday.toISOString();
    } else if (period === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDay.toISOString();
    }

    try {
        const { data, error } = await client.rpc('get_product_sales_history', {
            p_product_id: currentViewingProductId,
            period_start: startDate
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding: 30px; color:#64748b; display:flex; flex-direction:column; align-items:center;">
                    <i class="bi bi-calendar-x" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Nenhuma venda encontrada neste período.</p>
                </div>`;
            return;
        }

        // Renderizar Lista
        listContainer.innerHTML = data.map(sale => {
            // Formatar Data
            const dateObj = new Date(sale.created_at);
            const dateStr = dateObj.toLocaleDateString('pt-BR');
            const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Iniciais para avatar
            const initials = sale.username ? sale.username.substring(0, 2).toUpperCase() : '??';

            return `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #64748b; font-size: 0.9rem; overflow:hidden;">
                        ${sale.avatar_url
                    ? `<img src="${sale.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`
                    : initials}
                    </div>
                    <div>
                        <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">${sale.username}</div>
                        <div style="color: #94a3b8; font-size: 0.8rem;">${dateStr} às ${timeStr}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 0.85rem;">
                        +${sale.quantity} uni
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Erro sales history:", err);
        listContainer.innerHTML = `<p style="text-align:center; color:red;">Erro ao buscar dados.</p>`;
    }
}

/* =========================================================
   LÓGICA DE EXPORTAÇÃO DE PDF (ATUALIZADA E CORRIGIDA)
   ========================================================= */

let selectedExportDateOption = null; // Variável para guardar qual data o usuário clicou

function openExportModal() {
    const modal = document.getElementById('modal-export-reports');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
    renderExportOptions('day'); // Padrão
}

function closeExportModal() {
    const modal = document.getElementById('modal-export-reports');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// --- NOVO: Funções do Modal de Tipo ---

function openReportTypeModal(option) {
    selectedExportDateOption = option; // Guarda a opção (Ex: "Dezembro 2025")
    const modal = document.getElementById('modal-report-type');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeReportTypeModal() {
    const modal = document.getElementById('modal-report-type');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function confirmExportGeneration(type) {
    if (selectedExportDateOption) {
        closeReportTypeModal(); // Fecha pergunta
        generatePDFReport(selectedExportDateOption, type); // Gera PDF
    }
}

// --- Renderização das datas (Modificado o onclick) ---
function renderExportOptions(type) {
    // 1. Atualiza visual dos botões (Deixa o botão clicado escuro)
    document.querySelectorAll('#modal-export-reports .filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`btn-exp-${type}`);
    if (btn) btn.classList.add('active');

    const container = document.getElementById('export-options-list');
    container.innerHTML = '';

    const now = new Date();
    const options = [];

    // ==========================
    // LÓGICA DIÁRIA
    // ==========================
    if (type === 'day') {
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const start = d.toISOString();
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);

            options.push({
                label: i === 0 ? "Hoje" : i === 1 ? "Ontem" : d.toLocaleDateString('pt-BR'),
                sub: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
                start: start,
                end: end.toISOString(),
                filename: `Vendas_${d.toLocaleDateString('pt-BR').replace(/\//g, '-')}`
            });
        }
    }
    // ==========================
    // LÓGICA SEMANAL (CORRIGIDA)
    // ==========================
    else if (type === 'week') {
        // Mostra as últimas 5 semanas
        for (let i = 0; i < 5; i++) {
            let start = new Date(now);

            // 1. Encontrar a Segunda-feira da semana atual
            // getDay(): 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
            const currentDay = start.getDay();

            // Se for Domingo (0), a segunda-feira foi há 6 dias. 
            // Se for Segunda (1), foi há 0 dias. 
            // Se for Terça (2), foi há 1 dia...
            const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

            start.setDate(start.getDate() - distanceToMonday);

            // 2. Voltar 'i' semanas para trás no tempo
            start.setDate(start.getDate() - (i * 7));
            start.setHours(0, 0, 0, 0);

            // 3. Calcular o final da semana (Domingo)
            let end = new Date(start);
            end.setDate(start.getDate() + 6); // Segunda + 6 dias = Domingo
            end.setHours(23, 59, 59, 999);

            // 4. Definir Labels bonitos
            let label = "";
            if (i === 0) label = "Esta Semana";
            else if (i === 1) label = "Semana Passada";
            else label = `Semana de ${start.toLocaleDateString('pt-BR')}`;

            options.push({
                label: label,
                sub: `${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`,
                start: start.toISOString(),
                end: end.toISOString(),
                filename: `Relatorio_Semana_${start.toLocaleDateString('pt-BR').replace(/\//g, '-')}`
            });
        }
    }
    // ==========================
    // LÓGICA MENSAL
    // ==========================
    else if (type === 'month') {
        for (let i = 0; i < 6; i++) {
            // Pega o dia 1 do mês ajustado
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

            // Início: Dia 1 às 00:00
            const start = d.toISOString();

            // Fim: Último dia do mês (Dia 0 do mês seguinte)
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            lastDay.setHours(23, 59, 59, 999);

            const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            options.push({
                label: label.charAt(0).toUpperCase() + label.slice(1), // Capitaliza (Dezembro...)
                sub: i === 0 ? "Mês Atual" : "",
                start: start,
                end: lastDay.toISOString(),
                filename: `Vendas_Mes_${d.getMonth() + 1}_${d.getFullYear()}`
            });
        }
    }

    // Renderiza HTML dos Cards
    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'export-option-card';
        div.innerHTML = `
            <div class="export-option-text">
                <span>${opt.label}</span>
                <span class="export-option-sub">${opt.sub}</span>
            </div>
            <i class="bi bi-download export-icon"></i>
        `;
        // Ao clicar, abre o modal de pergunta (Resumo vs Completo)
        div.onclick = () => openReportTypeModal(opt);
        container.appendChild(div);
    });
}

// --- GERAÇÃO DO PDF (Lógica Nova) ---
async function generatePDFReport(option, reportType) {
    const { jsPDF } = window.jspdf;
    if (window.showToast) window.showToast("Processando dados... aguarde.");

    try {
        // 1. Busca dados no Supabase
        const { data: items, error } = await client.rpc('export_sales_report', {
            start_date: option.start,
            end_date: option.end
        });

        if (error) throw error;

        if (!items || items.length === 0) {
            if (window.showToast) window.showToast("Nenhuma venda encontrada neste período.");
            return;
        }

        // 2. Processa os dados (Agrupa por Categoria e Produto)
        const categoriesMap = {};
        const productsMap = {};

        let grandTotalRevenue = 0;
        let grandTotalItems = 0;

        items.forEach(item => {
            const catName = item.category || "Sem Categoria";
            const prodName = item.prod_name || "Produto Desconhecido";

            // Preço: Prioriza histórico (item_price), senão atual (prod_price)
            let price = Number(item.item_price) || Number(item.prod_price) || 0;
            let qty = Number(item.qty) || 0;
            let total = price * qty;

            // Agrupa Categorias
            if (!categoriesMap[catName]) categoriesMap[catName] = { qty: 0, revenue: 0 };
            categoriesMap[catName].qty += qty;
            categoriesMap[catName].revenue += total;

            // Agrupa Produtos (Para relatório completo)
            if (!productsMap[prodName]) productsMap[prodName] = { qty: 0, revenue: 0, category: catName };
            productsMap[prodName].qty += qty;
            productsMap[prodName].revenue += total;

            grandTotalItems += qty;
            grandTotalRevenue += total;
        });

        // Transforma mapas em arrays para tabela
        const categoriesArray = Object.keys(categoriesMap).map(cat => [
            cat,
            categoriesMap[cat].qty,
            categoriesMap[cat].revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]).sort((a, b) => b[1] - a[1]); // Ordena por quantidade

        const productsArray = Object.keys(productsMap).map(prod => [
            prod,
            productsMap[prod].category,
            productsMap[prod].qty,
            productsMap[prod].revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]).sort((a, b) => b[2] - a[2]);

        // 3. Cria o PDF
        const doc = new jsPDF();

        // Cabeçalho
        doc.setFontSize(18); doc.setFont("helvetica", "bold");
        doc.text("Relatório de Vendas - TopStyle", 14, 22);

        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
        doc.text(`Período: ${option.label}`, 14, 29);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);

        // Totais Gerais
        doc.setTextColor(0); doc.setFontSize(11);
        doc.text(`Total Vendido: ${grandTotalItems} itens`, 14, 44);
        doc.text(`Faturamento: ${grandTotalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 80, 44);

        doc.setDrawColor(200); doc.line(14, 48, 196, 48);

        let finalY = 55;

        // --- TABELA 1: CATEGORIAS (Sempre aparece) ---
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text("1. Resumo por Categoria", 14, finalY);
        finalY += 6;

        doc.autoTable({
            startY: finalY,
            head: [['Categoria', 'Qtd', 'Receita']],
            body: categoriesArray,
            theme: 'striped',
            headStyles: { fillColor: [25, 29, 40] },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center' }, 2: { halign: 'right' } }
        });

        finalY = doc.lastAutoTable.finalY + 15;

        // --- TABELA 2: PRODUTOS (Só se for 'full') ---
        if (reportType === 'full') {
            // Se não couber na página, cria nova
            if (finalY > 250) { doc.addPage(); finalY = 20; }

            doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
            doc.text("2. Detalhamento por Produtos", 14, finalY);
            finalY += 6;

            doc.autoTable({
                startY: finalY,
                head: [['Produto', 'Categoria', 'Qtd', 'Receita']],
                body: productsArray,
                theme: 'grid',
                headStyles: { fillColor: [25, 29, 40] },
                columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' } }
            });
        }

        // Salva
        const nomeArquivo = reportType === 'full' ? `${option.filename}_Completo.pdf` : `${option.filename}_Resumo.pdf`;
        doc.save(nomeArquivo);

        if (window.showToast) window.showToast("Download concluído!");

    } catch (err) {
        console.error("Erro PDF:", err);
        if (window.showToast) window.showToast("Erro: " + err.message);
    }
}

/* =========================================================
   CARREGAR PERFIL DA SIDEBAR (CORRIGIDO)
   ========================================================= */
async function loadSidebarProfile() {
    try {
        // 1. Pega usuário logado
        const { data: { user } } = await client.auth.getUser();

        if (!user) return;

        // 2. Busca dados na tabela profiles
        const { data: profile, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        // 3. Elementos do DOM
        const elImg = document.getElementById('sidebar-img');
        const elInitials = document.getElementById('sidebar-initials');
        const elName = document.getElementById('sidebar-fullname');
        const elUser = document.getElementById('sidebar-username');
        const elEmail = document.getElementById('sidebar-email');
        const elCreated = document.getElementById('sidebar-created');
        const elWrapper = document.getElementById('sidebar-avatar-wrapper');

        // 4. Preenche Dados de Texto
        const fullName = profile.full_name || 'Administrador';
        const username = profile.username || 'admin';

        // Formatação do Nome (apenas Primeiro e Último para economizar espaço se for muito longo)
        const names = fullName.split(' ');
        const displayName = names.length > 1
            ? `${names[0]} ${names[names.length - 1]}`
            : names[0];

        if (elName) elName.innerText = displayName;
        if (elUser) elUser.innerText = '@' + username;
        if (elEmail) elEmail.innerText = profile.email || user.email;

        // Data formatada
        if (profile.created_at && elCreated) {
            const date = new Date(profile.created_at);
            elCreated.innerText = date.toLocaleDateString('pt-BR');
        }

        // 5. Lógica da Imagem (Debug Avançado)
        // Verifica se existe URL e se ela não é vazia ou null
        if (profile.avatar_url && profile.avatar_url.trim() !== "") {
            console.log("Tentando carregar avatar:", profile.avatar_url);

            elImg.src = profile.avatar_url;
            elImg.style.display = 'block';
            elInitials.style.display = 'none';

            // Força o wrapper a não ter fundo preto se tiver imagem (opcional)
            elWrapper.style.backgroundColor = 'transparent';
        } else {
            console.log("Sem avatar URL, usando iniciais.");

            // Lógica das Iniciais
            const initials = fullName
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

            elInitials.innerText = initials || "AD";
            elImg.style.display = 'none';
            elInitials.style.display = 'block';
            elWrapper.style.backgroundColor = '#191D28'; // Volta cor original
        }

    } catch (err) {
        console.error('Erro ao carregar sidebar:', err);
    }
}

/* =========================================================
   LÓGICA DE ALTERAR SENHA (DASHBOARD -> INDEX)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const btnChangePass = document.getElementById('btn-alterar-senha-dash');

    if (btnChangePass) {
        btnChangePass.addEventListener('click', async () => {
            // 1. Pega o usuário atual
            const { data: { user } } = await client.auth.getUser();

            if (!user || !user.email) {
                window.showToast("Erro: Não foi possível identificar o usuário logado.");
                return;
            }

            // 2. Modal de Confirmação
            const confirmed = await window.showConfirmationModal(
                "Deseja iniciar o processo de alteração de senha? Enviaremos um código para seu e-mail e você será redirecionado para a tela de login.",
                { okText: 'Sim, Alterar', cancelText: 'Cancelar' }
            );

            if (!confirmed) return;

            // 3. Envia o e-mail de recuperação (Step 1 automático)
            if (window.showToast) window.showToast("Enviando código de verificação...");

            const { error } = await client.auth.resetPasswordForEmail(user.email);

            if (error) {
                console.error("Erro ao enviar reset:", error);
                window.showToast("Erro ao enviar e-mail: " + error.message);
                return;
            }

            // 4. Redireciona para Index na Etapa 2
            // Passamos 'action=reset_step2' e o 'email' para preencher o form lá
            const redirectUrl = `index.html?action=reset_step2&email=${encodeURIComponent(user.email)}`;
            window.location.href = redirectUrl;
        });
    }
});

/* CONTROLE DA SIDEBAR RESPONSIVA (NOVO) */
function toggleDashSidebar() {
    const sidebar = document.querySelector('.body-left');
    const overlay = document.getElementById('dash-overlay');

    // Cria o overlay se não existir
    if (!overlay) {
        const newOverlay = document.createElement('div');
        newOverlay.id = 'dash-overlay';
        newOverlay.className = 'dash-backdrop';
        newOverlay.onclick = toggleDashSidebar; // Clicar fora fecha
        document.body.appendChild(newOverlay);
        setTimeout(() => newOverlay.classList.add('active'), 10);
    } else {
        // Se já existe, alterna estado ou remove
        if (sidebar.classList.contains('dash-open')) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    sidebar.classList.toggle('dash-open');
    document.body.classList.toggle('no-scroll');
}

// =========================================================
//  PODIUM RACE: TOP 5 CLIENTES (BASEADO EM QUANTIDADE DE ITENS)
// =========================================================

const PODIUM_POSITIONS = {
    1: { left: '41%', height: '240px', zIndex: 10, label: '1', class: 'rank-1' },
    2: { left: '62%', height: '180px', zIndex: 8, label: '2', class: 'rank-2' },
    3: { left: '20%', height: '140px', zIndex: 6, label: '3', class: 'rank-3' },
    4: { left: '82%', height: '100px', zIndex: 4, label: '4', class: 'rank-4' },
    5: { left: '0%', height: '70px', zIndex: 2, label: '5', class: 'rank-5' }
};

async function updateTopClientsPodium() {
    const container = document.getElementById('podium-container');
    if (!container) return;

    try {
        // 1. Busca dados (Mantido igual)
        const { data: rankingData, error } = await client.rpc('get_top_clients_ranking');
        if (error) throw error;

        // Limpa loading se existir
        const loading = container.querySelector('.podium-loading');
        if (loading) loading.remove();

        if (!rankingData || rankingData.length === 0) {
            container.innerHTML = '<div class="podium-loading">Nenhuma venda registrada.</div>';
            return;
        }

        // Completa array com 5 posições
        const ranking = [...rankingData];
        while (ranking.length < 5) {
            ranking.push({ user_id: null, total_items: 0 });
        }

        // 2. Busca Perfis
        const userIds = ranking.map(r => r.user_id).filter(id => id !== null);
        let profileMap = {};

        if (userIds.length > 0) {
            const { data: profiles, error: profError } = await client
                .from('profiles')
                .select('id, username, full_name, email, avatar_url')
                .in('id', userIds);

            if (!profError && profiles) {
                profiles.forEach(p => profileMap[p.id] = p);
            }
        }

        // 3. RENDERIZAÇÃO INTELIGENTE (Para Animação)
        // Lista de IDs processados nesta rodada para remover quem saiu do ranking depois
        const processedElementIds = new Set();

        ranking.forEach((rankData, index) => {
            const userId = rankData.user_id;
            const totalItems = rankData.total_items || 0;
            const rankPosition = index + 1;
            const profile = userId ? profileMap[userId] : null;
            const posConfig = PODIUM_POSITIONS[rankPosition];

            // GERA ID ÚNICO: 
            // Se tem user, o ID é atrelado ao usuário (permite movimento). 
            // Se é slot vazio, o ID é atrelado à posição (fica fixo).
            const domId = userId ? `podium-user-${userId}` : `podium-empty-${rankPosition}`;
            processedElementIds.add(domId);

            let slot = document.getElementById(domId);

            // Se o elemento não existe, cria (entra na tela)
            if (!slot) {
                slot = document.createElement('div');
                slot.id = domId;
                slot.className = 'podium-item';
                container.appendChild(slot);
            }

            // --- APLICA POSIÇÃO (Isso dispara a animação CSS se o elemento já existia) ---
            // O CSS transition fará o elemento deslizar suavemente para a nova posição
            slot.style.left = posConfig.left;
            slot.style.zIndex = posConfig.zIndex;

            // Prepara dados visuais
            let displayName = '---';
            let avatarHtml = `<div style="width:100%;height:100%;background:#e2e8f0;opacity:0.3;"></div>`;
            let barHeight = '15px';
            let labelText = '';

            if (profile) {
                if (profile.full_name && profile.full_name !== 'null') {
                    displayName = profile.full_name.split(' ')[0];
                } else {
                    displayName = profile.username || 'User';
                }

                const avatarUrl = profile.avatar_url;
                const initials = profile.username?.substring(0, 2).toUpperCase() || '?';

                if (avatarUrl && avatarUrl.length > 5) {
                    avatarHtml = `<img src="${avatarUrl}" alt="${displayName}">`;
                } else {
                    avatarHtml = `<div style="width:100%;height:100%;background:#191D28;color:white;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:bold;">${initials}</div>`;
                }

                barHeight = posConfig.height; // Altura baseada no rank atual
                labelText = posConfig.label;  // Número 1, 2, 3...
            }

            // Injeta HTML Interno
            // Nota: Se o usuário mudar de 2 para 1, atualizamos o label da barra para "1" aqui
            slot.innerHTML = `
                <div class="podium-username" style="opacity: ${userId ? 1 : 0};">${displayName}</div>
                <div class="podium-avatar" style="opacity: ${userId ? 1 : 0};">
                    ${avatarHtml}
                </div>
                <div class="podium-bar" style="height: ${barHeight};">
                    ${labelText}
                </div>
            `;

            // Reatribui eventos
            if (profile) {
                slot.onmouseenter = (e) => showPodiumTooltip(e, profile, totalItems);
                slot.onmouseleave = hidePodiumTooltip;
                slot.onclick = () => goToUserProfile(profile);
                slot.style.cursor = 'pointer';
            } else {
                slot.onmouseenter = null;
                slot.onclick = null;
                slot.style.cursor = 'default';
            }
        });

        // 4. LIMPEZA: Remove quem saiu do Top 5
        const allSlots = container.querySelectorAll('.podium-item');
        allSlots.forEach(el => {
            if (!processedElementIds.has(el.id)) {
                // Anima saída (opcional, faz descer e sumir)
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                setTimeout(() => el.remove(), 500); // Remove do DOM após fade out
            }
        });

    } catch (err) {
        console.error("Erro Crítico Podium:", err);
    }
}

// --- TOOLTIP (MANTIDO IGUAL) ---
const tooltip = document.getElementById('podium-tooltip');

function showPodiumTooltip(e, profile, count) {
    if (!profile) return;

    const tName = document.getElementById('tooltip-name');
    const tUser = document.getElementById('tooltip-user');
    const tEmail = document.getElementById('tooltip-email');
    const tTotal = document.getElementById('tooltip-total');
    const tImg = document.getElementById('tooltip-img');

    if (tName) tName.innerText = profile.full_name || profile.username;
    if (tUser) tUser.innerText = '@' + profile.username;
    if (tEmail) tEmail.innerText = profile.email;
    if (tTotal) tTotal.innerText = count + ' itens comprados';

    if (tImg) {
        if (profile.avatar_url) {
            tImg.src = profile.avatar_url;
            tImg.style.display = 'block';
        } else {
            tImg.style.display = 'none';
        }
    }

    if (tooltip) tooltip.classList.add('visible');
}

function hidePodiumTooltip() {
    if (tooltip) tooltip.classList.remove('visible');
}

// --- CLIQUE LEVA AO PERFIL ---
function goToUserProfile(profile) {
    if (!profile) return;

    // Clica na aba de usuários para carregar a lista
    const menuUsers = document.querySelector('li[data-content="usuarios-cadastro"]');
    if (menuUsers) menuUsers.click();

    // Aguarda um pouco e abre o modal com os dados do perfil
    setTimeout(() => {
        if (window.openUserModal) {
            window.openUserModal(
                profile.id,
                profile.username,
                profile.full_name,
                profile.email,
                profile.cpf,
                profile.created_at,
                profile.is_admin,
                false,
                profile.avatar_url
            );
        }
    }, 600);
}

// --- INICIALIZAÇÃO REALTIME ---
function initPodiumRealtime() {
    updateTopClientsPodium();

    // Escuta a tabela ORDERS (Insert ou Delete muda o ranking)
    client.channel('realtime:podium_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            console.log("Nova compra detectada! Atualizando pódio...");
            updateTopClientsPodium();
        })
        .subscribe();
}

// Adicionar ao DOMContentLoaded existente
document.addEventListener('DOMContentLoaded', () => {
    initPodiumRealtime();
});

/* =========================================================
   CARREGAR DESTAQUE NA HOME (DASHBOARD)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Carrega o destaque se estivermos na tela principal
    if (document.getElementById('dashboard-best-seller-card')) {
        loadDashboardBestSeller();
    }

});

async function loadDashboardBestSeller() {
    const cardContainer = document.getElementById('dashboard-best-seller-card');
    if (!cardContainer) return;

    try {
        // Usa a mesma RPC do relatório, mas limitando a 1 e ordenando DESC
        // Calculamos o período 'all' (desde 1970) para pegar o maior de todos os tempos, 
        // ou você pode mudar para pegar o destaque do mês.
        const startDate = new Date(0).toISOString();

        const { data, error } = await client.rpc('get_best_sellers_report', {
            period_start: startDate,
            sort_asc: false,
            page_limit: 1,
            page_offset: 0
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            cardContainer.innerHTML = '<div style="padding:20px; color:#64748b;">Nenhuma venda registrada ainda.</div>';
            return;
        }

        const p = data[0]; // O Top 1

        // Tratamento de dados
        const safeName = p.nome ? p.nome.replace(/'/g, "\\'") : 'Produto sem nome';
        const safeImg = p.img || '';
        const safeId = p.product_id;
        const totalSold = p.total_sold || 0;

        // Formata receita estimada (opcional, se sua RPC retornar revenue)
        // Se não tiver revenue na RPC, podemos omitir ou calcular se tiver preço
        const revenueText = "R$ ---";

        cardContainer.innerHTML = `
            <div class="bsw-badge-fire">
                <i class="bi bi-fire"></i>
                <span>#1 Top</span>
            </div>

            <div class="bsw-img-box">
                ${safeImg ? `<img src="${safeImg}" alt="${safeName}">` : '<i class="bi bi-box-seam" style="font-size:3rem; color:#cbd5e1;"></i>'}
            </div>

            <div class="bsw-content">
                <div class="bsw-meta">
                   <span class="bsw-id-pill">ID: ${safeId}</span>
                   <span><i class="bi bi-tag-fill"></i> Vestuário</span> </div>
                
                <h2 class="bsw-title">${p.nome}</h2>
                
                <div class="bsw-stats-row">
                    <div class="bsw-stat-item">
                        <span class="bsw-stat-label">Total Vendido</span>
                        <span class="bsw-stat-value">${totalSold} un.</span>
                    </div>
                    <div class="bsw-stat-item">
                         <span class="bsw-stat-label">Status</span>
                         <span class="bsw-stat-value" style="color:#10b981;">Em Alta <i class="bi bi-graph-up-arrow"></i></span>
                    </div>
                </div>
            </div>
            
            <div style="margin-left:auto; color:#cbd5e1;">
                <i class="bi bi-chevron-right" style="font-size: 2rem;"></i>
            </div>
        `;

        // Adiciona o clique no card inteiro
        cardContainer.onclick = function () {
            // Reutiliza sua função de modal existente!
            openProductDetailsModal(safeId, safeName, safeImg, totalSold);
        };

    } catch (err) {
        console.error("Erro ao carregar destaque dashboard:", err);
        cardContainer.innerHTML = '<div style="padding:20px; color:red;">Erro ao carregar destaque.</div>';
    }
}

// Função para o botão "Ver Mais" que navega para a aba de relatórios
function navigateToReports() {
    // 1. Encontra o item de menu Relatórios
    const menuItems = document.querySelectorAll('.submenu li');
    let reportItem = null;

    menuItems.forEach(item => {
        if (item.getAttribute('data-content') === 'relatorio-vendas') {
            reportItem = item;
        }
    });

    // 2. Simula o clique nele para ativar a lógica de troca de aba
    if (reportItem) {
        reportItem.click();

        // Opcional: Rola suavemente para o topo
        document.querySelector('.body-right').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/* =========================================================
   MODAL DE EDIÇÃO "GÊMEO" DO MAIN.JS (PARA DASHBOARD)
   ========================================================= */

// Função Principal chamada pelo botão "Editar" na tabela da Dashboard
async function dashEditProduct(id) {
    if (window.showToast) window.showToast("Carregando dados...");

    await forceFetchColorsForDashboard();

    try {
        // 1. GARANTE QUE AS CORES ESTÃO CARREGADAS ANTES DE ABRIR O MODAL
        if (typeof window.fetchColorsForSelect === 'function') {
            await window.fetchColorsForSelect();
        }

        // 2. Buscar dados do produto
        const { data: product, error } = await client
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // 3. Montar o Modal (HTML)
        let modal = document.getElementById('admin-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'admin-modal';
            document.body.appendChild(modal);
        }

        // --- HTML DO MODAL ATUALIZADO COM CAMPO DE ESTOQUE ---
        modal.innerHTML = `
        <div class="modal-content">
            <h2 id="modal-title">Editar Produto</h2>
            <label>Título:</label> <input type="text" id="modal-title-input" value="${product.nome || ''}">
            
            <div style="display: flex; gap: 15px;">
                <div style="flex: 1;">
                    <label>Preço:</label> 
                    <input type="text" id="modal-price-input" value="${product.preco || ''}">
                </div>
                <div style="width: 120px;">
                    <label>Estoque:</label> 
                    <input type="number" id="modal-dash-stock-input" value="${product.stock !== undefined ? product.stock : 0}" style="font-weight: bold; border: 2px solid #333;" min="0">
                </div>
            </div>
            
            <label>Categoria:</label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <select id="modal-category-input" style="flex: 1;"></select>
            </div>

            <label>Drop (Coleção):</label>
            <select id="modal-drop-input" style="width: 100%; padding: 12px 15px; border-radius: 6px; border: 2px solid transparent; background-color: #eee;"></select>

            <label>Gênero:</label>
            <select id="modal-gender-input">
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="U">Unissex</option>
            </select>

            <label>Imagem Padrão:</label> <input type="text" id="modal-img-input" value="${product.img || ''}">
            <label>Tamanhos:</label> <input type="text" id="modal-sizes-input" value="${product.tamanhos || ''}">
            <label>Descrição:</label> <textarea id="modal-description-input">${product.description || ''}</textarea>
            <label>Info Complementar:</label> <textarea id="modal-additional-info-input">${product.additional_info || ''}</textarea>
            
            <label>Cores:</label>
            <div id="modal-colors-container"></div>
            
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button type="button" id="modal-add-color-btn" style="padding: 8px 16px; background:#333; color:#fff; border:none; cursor:pointer;">+ Adicionar Cor</button>
                <button type="button" id="modal-dash-new-color-btn" title="Gerenciar Cores" style="padding: 10px; border:1px solid #ccc; cursor:pointer;"><i class="bi bi-gear-fill"></i></button>
            </div>

            <div class="modal-actions">
                <button id="modal-delete" onclick="dashDeleteProductInsideModal('${product.id}')">Excluir</button>
                <button id="modal-cancel" onclick="closeDashModal()">Cancelar</button>
                <button id="modal-save">Salvar</button>
            </div>
        </div>`;

        const dropSelect = document.getElementById('modal-drop-input');
        await dashPopulateDrops(dropSelect, product.dropName);

        // Preencher Inputs Básicos
        document.getElementById('modal-gender-input').value = product.gender || 'U';

        // Popula Categoria
        const catSelect = document.getElementById('modal-category-input');
        await dashPopulateCategories(catSelect, product.category);

        // Renderiza Cores
        const colorsContainer = document.getElementById('modal-colors-container');
        colorsContainer.innerHTML = '';

        if (product.cores && product.cores.length > 0) {
            product.cores.forEach(cor => {
                const row = dashCreateColorRow(cor);
                colorsContainer.appendChild(row);
            });
        } else {
            colorsContainer.appendChild(dashCreateColorRow());
        }

        // Listeners dos botões
        document.getElementById('modal-dash-new-color-btn').onclick = () => {
            if (typeof window.colorOpenFormModal === 'function') window.colorOpenFormModal('add');
        };
        document.getElementById('modal-add-color-btn').onclick = () => {
            colorsContainer.appendChild(dashCreateColorRow());
        };
        // Aqui chamamos o save passando o ID
        document.getElementById('modal-save').onclick = () => dashSaveProduct(product.id);

        // Exibir Modal
        modal.classList.add('flex');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast("Erro ao abrir modal: " + err.message, "error");
    }
}

// --- Helper: Fechar Modal ---
function closeDashModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.classList.remove('flex');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// --- Helper: Criar Linha de Cor (Igual ao Main) ---
function dashCreateColorRow(color = {}) {
    const row = document.createElement('div');
    row.className = 'color-row';
    row.innerHTML = `
        <input type="text" placeholder="Nome (ex: Preto)" value="${color.nome || ''}" style="flex:1;">
        <input type="text" placeholder="URL Imagem Principal" value="${color.img1 || ''}" style="flex:2;">
        <input type="text" placeholder="URL Hover (Opcional)" value="${color.img2 || ''}" style="flex:2;">
        <button type="button" class="remove-color-btn" title="Remover cor">&times;</button>
    `;

    // Remove linha ao clicar no X
    row.querySelector('.remove-color-btn').onclick = () => row.remove();

    // Anexa método para extrair dados facilmente
    row.getColorObject = () => {
        const inputs = row.querySelectorAll('input');
        return {
            nome: inputs[0].value.trim(),
            img1: inputs[1].value.trim(),
            img2: inputs[2].value.trim()
        };
    };
    return row;
}

// --- Helper: Popular Drops modal ---
async function dashPopulateDrops(selectElement, selectedValue) {
    selectElement.innerHTML = '<option value="">Carregando...</option>';
    const { data } = await client.from('drops').select('name_drop').order('name_drop');

    selectElement.innerHTML = '<option value="">Nenhum Drop</option>';
    if (data) {
        data.forEach(d => {
            const option = document.createElement('option');
            option.value = d.name_drop;
            option.textContent = d.name_drop;
            if (selectedValue && d.name_drop === selectedValue) option.selected = true;
            selectElement.appendChild(option);
        });
    }
}

// --- Helper: Popular Categorias ---
async function dashPopulateCategories(selectElement, selectedValue) {
    selectElement.innerHTML = '<option value="">Carregando...</option>';

    const { data: categories } = await client
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    selectElement.innerHTML = '<option value="">Selecione...</option>';

    if (categories) {
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
            if (selectedValue && cat.name === selectedValue) option.selected = true;
            selectElement.appendChild(option);
        });
    }
}

// --- Função de Salvar ---
async function dashSaveProduct(id) {
    // 1. Coleta dados dos inputs
    const nome = document.getElementById('modal-title-input').value.trim();
    const dropName = document.getElementById('modal-drop-input').value;
    const preco = parseFloat(document.getElementById('modal-price-input').value.replace(',', '.')) || 0;

    // CAPTURA O ESTOQUE
    let stock = parseInt(document.getElementById('modal-dash-stock-input').value) || 0;

    // === A VALIDAÇÃO NO JAVASCRIPT ESTÁ AQUI ===
    // Garante que o valor mínimo seja 0
    if (stock < 0) {
        stock = 0;
        // Opcional: Avisa o usuário que o valor foi corrigido para zero
        if (window.showToast) window.showToast("Estoque não pode ser negativo. O valor foi definido para 0.", "warning");
    }
    // ===========================================

    // Tratamento da Categoria (para permitir null)
    let category = document.getElementById('modal-category-input').value;
    if (category === "") {
        category = null;
    }
    // ... (restante da coleta de dados)

    const gender = document.getElementById('modal-gender-input').value;
    const img = document.getElementById('modal-img-input').value.trim();
    const tamanhos = document.getElementById('modal-sizes-input').value.trim();
    const description = document.getElementById('modal-description-input').value.trim();
    const additional_info = document.getElementById('modal-additional-info-input').value.trim();

    // Coleta cores
    const colorRows = Array.from(document.querySelectorAll('.color-row'));
    const cores = colorRows.map(row => row.getColorObject()).filter(c => c.nome && c.img1);

    // Validação básica
    if (!nome) {
        if (window.showToast) window.showToast("O nome do produto é obrigatório.", "error");
        return;
    }

    // 3. Objeto de atualização
    const updates = {
        nome,
        preco,
        stock, // Usa o valor corrigido (>= 0)
        category,
        gender,
        dropName,
        img,
        tamanhos,
        description,
        additional_info,
        cores,
        updated_at: new Date()
    };

    try {
        // 4. Envia para o Supabase
        const { error } = await client.from('products').update(updates).eq('id', id);

        if (error) throw error;

        if (window.showToast) window.showToast("Produto salvo com sucesso!", "success");

        closeDashModal();
        loadProducts();

    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast("Erro ao salvar: " + err.message, "error");
    }
}

// --- Função Excluir de Dentro do Modal ---
async function dashDeleteProductInsideModal(id) {
    const confirmed = await window.showConfirmationModal(
        'Tem certeza que deseja excluir este produto permanentemente?',
        { okText: 'Excluir', cancelText: 'Cancelar' }
    );

    if (!confirmed) return;

    try {
        const { error } = await client.from('products').delete().eq('id', id);
        if (error) throw error;

        if (window.showToast) window.showToast("Produto excluído com sucesso.", "success");
        closeDashModal();
        loadProducts();
    } catch (err) {
        if (window.showToast) window.showToast("Erro ao excluir: " + err.message, "error");
    }
}

/* =============================================================
   GESTÃO DE CORES BLINDADA (USANDO SUPABASE ADMIN)
   ============================================================= */

// Variável local para cache das cores na dashboard
let dashboardColorCache = [];

// Função que busca cores usando a chave MESTRA (Ignora RLS se houver erro)
async function forceFetchColorsForDashboard() {
    try {
        // Usa supabaseAdmin em vez de client comum
        const { data, error } = await supabaseAdmin
            .from('product_colors')
            .select('name, hex_code')
            .order('name', { ascending: true });

        if (error) throw error;

        dashboardColorCache = data || [];
        console.log("Cores carregadas na Dashboard:", dashboardColorCache);
        return dashboardColorCache;
    } catch (err) {
        console.error("Erro crítico ao buscar cores na Dash:", err);
        return [];
    }
}

// Substituição da função dashCreateColorRow
window.dashCreateColorRow = function (color = {}) {
    const row = document.createElement('div');
    row.className = 'color-row';
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.marginBottom = '10px';
    row.style.alignItems = 'center';

    row.innerHTML = `
        <div style="flex: 1;">
            <select class="color-select-input" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc; background-color: #eee;">
                <option value="">Carregando...</option>
            </select>
        </div>
        <input type="text" placeholder="URL Img Principal" value="${color.img1 || ''}" style="flex: 2; margin-top:0 !important;">
        <input type="text" placeholder="URL Hover (Opcional)" value="${color.img2 || ''}" style="flex: 2; margin-top:0 !important;">
        <button type="button" class="remove-color-btn" title="Remover" style="width: 36px; height: 36px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; display:flex; align-items:center; justify-content:center;">
            <i class="ri-close-line"></i>
        </button>
    `;

    const select = row.querySelector('.color-select-input');
    const btnRemove = row.querySelector('.remove-color-btn');

    // Função interna para popular este select específico usando o cache local
    const populateThisSelect = () => {
        select.innerHTML = '<option value="">Selecione...</option>';
        let found = false;
        const currentVal = color.nome || ''; // Cor que veio do banco (ex: "Preto")

        dashboardColorCache.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;

            // Verifica se é a cor selecionada (Case Insensitive)
            if (currentVal && c.name.toLowerCase().trim() === currentVal.toLowerCase().trim()) {
                opt.selected = true;
                found = true;
            }
            select.appendChild(opt);
        });

        // Se a cor do produto não está na lista do banco, mostra como Legado
        if (currentVal && !found) {
            const opt = document.createElement('option');
            opt.value = currentVal;
            opt.textContent = `${currentVal} (Legado - Salve para atualizar)`;
            opt.selected = true;
            opt.style.color = "red";
            select.appendChild(opt);
        }
    };

    // Se já temos cache, popula agora. Se não, busca e depois popula.
    if (dashboardColorCache.length > 0) {
        populateThisSelect();
    } else {
        forceFetchColorsForDashboard().then(() => {
            populateThisSelect();
        });
    }

    btnRemove.onclick = () => row.remove();

    // Método para o botão Salvar pegar os dados
    row.getColorObject = () => {
        const selectVal = row.querySelector('select').value;
        const inputs = row.querySelectorAll('input');
        return {
            nome: selectVal,
            img1: inputs[0].value.trim(),
            img2: inputs[1].value.trim()
        };
    };

    return row;
};

// Fallback específico do Dashboard se necessário
async function fetchColorsForSelectDashboard(selectEl, selectedVal) {
    const { data } = await client.from('product_colors').select('name').order('name');
    selectEl.innerHTML = '<option value="">Selecione...</option>';
    if (data) {
        data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            if (c.name === selectedVal) opt.selected = true;
            selectEl.appendChild(opt);
        });
    }
}

// Adicione esta linha no final do dashboard.js (ou após a função de busca)
window.dashPopulateColorSelects = fetchColorsForSelectDashboard;

/* =============================================================
   GESTÃO DE TABELA DE CORES (ATUALIZADO: EDIÇÃO + MODAIS PRO)
   ============================================================= */

// 1. Função chamada ao clicar na aba "Cores"
async function initColorPage() {
    await colorLoadColors();
}

// 2. Carregar e Renderizar a Tabela
async function colorLoadColors() {
    const loader = document.getElementById('color-loader');
    const content = document.getElementById('color-content');
    const listBody = document.getElementById('color-list-body');
    const emptyState = document.getElementById('color-empty-state');

    if (!loader || !content) return;

    loader.classList.remove('hidden');
    content.classList.add('hidden');

    try {
        // Usa o client (ou supabaseAdmin se preferir permissão total)
        const { data: colors, error } = await client
            .from('product_colors')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        listBody.innerHTML = '';

        if (!colors || colors.length === 0) {
            emptyState.classList.remove('hidden');
            const wrapper = content.querySelector('.cat-table-wrapper');
            if (wrapper) wrapper.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            const wrapper = content.querySelector('.cat-table-wrapper');
            if (wrapper) wrapper.classList.remove('hidden');

            colors.forEach(cor => {
                const tr = document.createElement('tr');
                // Adicionado o botão de editar (Lápis) abaixo
                tr.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="
                                width: 32px; 
                                height: 32px; 
                                border-radius: 50%; 
                                background-color: ${cor.hex_code}; 
                                border: 1px solid #e2e8f0;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            "></div>
                        </div>
                    </td>
                    <td style="font-weight: 600; color: #334155;">${cor.name}</td>
                    <td style="font-family: monospace; color: #64748b;">${cor.hex_code}</td>
                    <td style="text-align:right;">
                        <button onclick="colorOpenFormModal('edit', '${cor.id}', '${cor.name}', '${cor.hex_code}')" class="cat-action-btn" title="Editar">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button onclick="colorDelete('${cor.id}', '${cor.name}')" class="cat-action-btn delete" title="Excluir">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </td>
                `;
                listBody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Erro ao carregar cores:", err);
        if (window.showToast) window.showToast("Erro ao carregar cores: " + err.message, "error");
    } finally {
        loader.classList.add('hidden');
        content.classList.remove('hidden');
    }
}

// 3. Abrir Modal de Criar/Editar Cor
window.colorOpenFormModal = function (mode, id = '', name = '', hex = '#000000') {
    const modal = document.getElementById('color-modal-form');
    const title = document.getElementById('color-form-title'); // Certifique-se de ter esse ID no H2 do modal

    // Preenche Inputs Ocultos
    document.getElementById('color-input-mode').value = mode;
    document.getElementById('color-input-id').value = id;

    // Preenche Inputs Visíveis
    document.getElementById('color-input-name').value = name;
    document.getElementById('color-input-hex').value = hex;
    document.getElementById('color-input-picker').value = hex;

    // Atualiza Título
    if (title) {
        title.innerText = mode === 'edit' ? "Editar Cor" : "Nova Cor";
    }

    modal.classList.add('open');
}

window.colorCloseModals = function () {
    document.querySelectorAll('.cat-modal-overlay').forEach(m => m.classList.remove('open'));
}

// 4. Salvar Cor (Criar ou Editar)
window.colorHandleSave = async function () {
    const mode = document.getElementById('color-input-mode').value;
    const id = document.getElementById('color-input-id').value;
    const name = document.getElementById('color-input-name').value.trim();
    const hex = document.getElementById('color-input-hex').value.trim();

    if (!name || !hex) {
        if (window.showToast) window.showToast("Preencha o nome e o código Hex.", "error");
        return;
    }

    try {
        let error = null;

        // Verifica se é Edição ou Criação
        if (mode === 'edit' && id) {
            const res = await supabaseAdmin
                .from('product_colors')
                .update({ name: name, hex_code: hex })
                .eq('id', id);
            error = res.error;
        } else {
            const res = await supabaseAdmin
                .from('product_colors')
                .insert([{ name: name, hex_code: hex }]);
            error = res.error;
        }

        if (error) throw error;

        const msg = mode === 'edit' ? "Cor atualizada com sucesso!" : "Cor adicionada com sucesso!";
        if (window.showToast) window.showToast(msg, "success");

        colorCloseModals();

        // Recarrega a tabela visual
        await colorLoadColors();

        // Atualiza o cache do Select do modal de produtos
        if (typeof forceFetchColorsForDashboard === 'function') {
            await forceFetchColorsForDashboard();
        }

    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast("Erro ao salvar cor: " + err.message, "error");
    }
}

// 5. Excluir Cor (Com Modal Customizado)
window.colorDelete = async function (id, name) {
    // Substitui confirm() nativo pelo modal customizado
    const confirmed = await window.showConfirmationModal(
        `Tem certeza que deseja excluir a cor "${name}"?`,
        { okText: 'Sim, Excluir', cancelText: 'Cancelar' }
    );

    if (!confirmed) return;

    try {
        const { error } = await supabaseAdmin
            .from('product_colors')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (window.showToast) window.showToast("Cor excluída.", "success");

        await colorLoadColors();

        // Atualiza cache
        if (typeof forceFetchColorsForDashboard === 'function') {
            await forceFetchColorsForDashboard();
        }

    } catch (err) {
        if (window.showToast) window.showToast("Erro ao excluir: " + err.message, "error");
    }
}

/* =========================================================
   GESTÃO DE LOGS DE ERRO (SYSTEM LOGS)
   ========================================================= */

// Inicializador chamado pelo menu
document.querySelectorAll('.submenu li[data-content="system-logs"]').forEach(li => {
    li.addEventListener('click', () => {
        loadSystemLogs();
    });
});

async function loadSystemLogs() {
    const listBody = document.getElementById('logs-list-body');
    const emptyState = document.getElementById('logs-empty-state');
    const tableWrapper = document.getElementById('system-logs').querySelector('.cat-table-wrapper');
    const totalCountEl = document.getElementById('log-count-total');
    const todayCountEl = document.getElementById('log-count-today');

    if (!listBody) return;

    // Loading visual
    listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Carregando logs...</td></tr>';

    try {
        // 1. Buscar Logs do Supabase
        const { data: logs, error } = await supabaseAdmin // Usa a instância admin para garantir leitura
            .from('error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100); // Limita aos últimos 100 para não travar

        if (error) throw error;

        // 2. Atualizar Cards de Estatísticas
        if (logs) {
            totalCountEl.innerText = logs.length;

            // Filtra logs de hoje
            const today = new Date().toISOString().split('T')[0];
            const todayLogs = logs.filter(l => l.created_at.startsWith(today));
            todayCountEl.innerText = todayLogs.length;
        }

        // 3. Renderizar Tabela
        listBody.innerHTML = '';

        if (!logs || logs.length === 0) {
            emptyState.classList.remove('hidden');
            tableWrapper.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        tableWrapper.classList.remove('hidden');

        logs.forEach(log => {
            const dateObj = new Date(log.created_at);
            const dateStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR');

            // Badge Tipo
            const isRejection = log.error_type === 'PROMISE_REJECTION';
            const badgeClass = isRejection ? 'rejection' : 'error';
            const badgeText = isRejection ? 'Async Fail' : 'Error';
            const icon = isRejection ? '<i class="bi bi-lightning-fill"></i>' : '<i class="bi bi-x-octagon-fill"></i>';

            // Limpa URL
            let cleanUrl = log.source_url ? log.source_url.replace(window.location.origin, '') : 'Script Interno';
            if (cleanUrl.length > 30) cleanUrl = '...' + cleanUrl.slice(-25);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size:0.85rem; color:#64748b;">${dateStr}</td>
                <td><span class="badge-log ${badgeClass}">${icon} ${badgeText}</span></td>
                <td class="log-message-cell" title="${log.message}">${log.message}</td>
                <td class="log-url-cell" title="${log.source_url}">${cleanUrl}:${log.line_no || '?'}</td>
                <td style="text-align: right;">
                    <button class="cat-action-btn" onclick='openLogDetails(${JSON.stringify(log).replace(/'/g, "&#39;")})'>
                        <i class="bi bi-eye-fill"></i>
                    </button>
                </td>
            `;
            listBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Erro ao carregar logs:", err);
        listBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">Erro ao buscar logs: ${err.message}</td></tr>`;
    }
}

// Abrir Modal de Detalhes
function openLogDetails(log) {
    document.getElementById('modal-log-message').innerText = log.message;
    document.getElementById('modal-log-agent').innerText = log.user_agent;
    document.getElementById('modal-log-source').innerText = `${log.source_url} (Linha: ${log.line_no}, Col: ${log.col_no})`;
    document.getElementById('modal-log-stack').innerText = log.stack_trace || "Sem Stack Trace disponível.";

    const modal = document.getElementById('modal-log-details');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeLogModal() {
    const modal = document.getElementById('modal-log-details');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}
