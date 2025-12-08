/* assets/js/status-pedido-dash.js */

// ==========================================
// 1. CONFIGURAÇÃO DE ACESSO (MODO ADMIN)
// ==========================================

// Definindo as chaves explicitamente aqui para garantir o acesso
const ADMIN_SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co';

// Chave SERVICE_ROLE (Copiada do seu dashboard.js) 
// ATENÇÃO: Essa chave ignora as regras de segurança (RLS). Mantenha segura.
const ADMIN_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNzUyNCwiZXhwIjoyMDc0OTEzNTI0fQ.FaXzLoO9WX4Kr6W01dF8LrfSuw1SkGSdLnyXUXYwDa8';

// Cria um cliente com a chave de ADMIN isolado
// Usamos uma variável diferente para não conflitar com window.supabase ou clientes anonimos
const _supabase = window.supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_KEY, {
  auth: {
    persistSession: false, // Importante para admin: não salvar sessão no localstorage
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// ESTADO DA APLICAÇÃO
const appState = {
    pedidos: [],
    // ... restante do código segue igual abaixo ...
    filtroAtual: 'TODOS',
    colunasVisiveis: ['id', 'user_id', 'status', 'total', 'created_at'],
    colunasDisponiveis: [
        { id: 'id', label: 'ID' },
        { id: 'user_id', label: 'Usuário (UUID)' },
        { id: 'status', label: 'Status' },
        { id: 'total', label: 'Total (R$)' },
        { id: 'discount', label: 'Desconto' },
        { id: 'created_at', label: 'Data' },
        { id: 'payment_info', label: 'Pagamento' }
    ],
    modalPedidoId: null,
    modalNovoStatus: null
};

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatadorData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// --- FUNÇÕES DE DADOS ---
async function carregarPedidosDoBanco() {
    console.log("🔄 Tentando carregar pedidos com SERVICE_ROLE_KEY...");
    try {
        // Busca com a chave Admin
        const { data, error } = await _supabase
            .from('orders')
            .select('*')
            .order('id', { ascending: false });
            
        if (error) throw error;
        
        console.log(`✅ Pedidos encontrados: ${data.length}`, data); // Verifica a quantidade

        appState.pedidos = data || [];
        renderizarTudo();
    } catch (err) {
        console.error('❌ Erro CRÍTICO ao carregar pedidos:', err);
        const tbody = document.getElementById('table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="padding:20px; text-align:center; color:red;">Erro ao carregar: ${err.message}. Verifique a tabela 'orders'.</td></tr>`;
    }
}

// --- RENDERIZAÇÃO ---
function renderizarTudo() {
    // Adicionado tratamento de erro para kpi-container (se não existir, não trava)
    const kpiContainer = document.getElementById('kpi-container');
    if (kpiContainer) renderizarKPIs();
    renderizarTabela();
    setTimeout(sincronizarScrollbars, 100);
}

function renderizarKPIs() {
    const p = appState.pedidos;
    // Normaliza para maiúsculas para evitar erros de Case Sensitive (PENDENTE vs pendente)
    const pendentes = p.filter(x => (x.status || '').toUpperCase() === 'PENDENTE');
    const aprovados = p.filter(x => (x.status || '').toUpperCase() === 'CONFIRMADO');
    const cancelados = p.filter(x => (x.status || '').toUpperCase() === 'CANCELADO');
    
    const hojeStr = new Date().toISOString().split('T')[0];
    const doDia = p.filter(x => x.created_at && x.created_at.startsWith(hojeStr));
    const totalValor = aprovados.reduce((acc, cur) => acc + (parseFloat(cur.total) || 0), 0);

    // O restante da sua função renderizarKPIs
    document.getElementById('kpi-container').innerHTML = `
        <div class="kpi-card card-orange" onclick="filtrarPedidos('PENDENTE')">
            <div class="kpi-header"><span class="kpi-title">Pendentes</span><div class="kpi-icon"><i class="bi bi-clock-history"></i></div></div>
            <div class="kpi-value">${pendentes.length}</div><div class="kpi-meta" style="color: #c2410c"><i class="bi bi-exclamation-circle"></i> Aguardando</div>
        </div>
        <div class="kpi-card card-green" onclick="filtrarPedidos('CONFIRMADO')">
            <div class="kpi-header"><span class="kpi-title">Confirmados</span><div class="kpi-icon"><i class="bi bi-currency-dollar"></i></div></div>
            <div class="kpi-value">${aprovados.length}</div><div class="kpi-meta" style="color: #15803d"><i class="bi bi-graph-up-arrow"></i> ${formatadorMoeda.format(totalValor)}</div>
        </div>
        <div class="kpi-card card-red" onclick="filtrarPedidos('CANCELADO')">
            <div class="kpi-header"><span class="kpi-title">Cancelados</span><div class="kpi-icon"><i class="bi bi-x-lg"></i></div></div>
            <div class="kpi-value">${cancelados.length}</div><div class="kpi-meta" style="color: #b91c1c"><i class="bi bi-arrow-down-right"></i> Cancelados</div>
        </div>
        <div class="kpi-card card-blue" onclick="filtrarPedidos('TODOS')">
            <div class="kpi-header"><span class="kpi-title">Hoje</span><div class="kpi-icon"><i class="bi bi-calendar-check"></i></div></div>
            <div class="kpi-value">${doDia.length}</div><div class="kpi-meta" style="color: #2563eb"><i class="bi bi-activity"></i> Recentes</div>
        </div>
    `;
}

// --- RENDERIZAÇÃO DA TABELA (CORRIGIDA) ---
function renderizarTabela() {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('table-body');
    if (!thead || !tbody) return;

    // Cabeçalho
    thead.innerHTML = '';
    appState.colunasVisiveis.forEach(colId => {
        const col = appState.colunasDisponiveis.find(c => c.id === colId);
        if (col) thead.innerHTML += `<th>${col.label}</th>`;
    });

    tbody.innerHTML = '';

    // Filtragem e Ordenação
    let dados = appState.pedidos;
    if (appState.filtroAtual !== 'TODOS') {
        dados = dados.filter(p => (p.status || '').toUpperCase() === appState.filtroAtual);
    }
    // Ordena decrescente pelo ID (mais novos primeiro)
    dados.sort((a, b) => (b.id || 0) - (a.id || 0));

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 40px; color: #64748b;">Nenhum pedido encontrado.</td></tr>`;
        return;
    }

    // Renderiza Linhas
    dados.forEach(pedido => {
        const tr = document.createElement('tr');
        
        appState.colunasVisiveis.forEach(colId => {
            const td = document.createElement('td');
            const val = pedido[colId];

            if (colId === 'status') {
                // CORREÇÃO: Força virar string antes de dar UpperCase
                const st = String(val || '').toUpperCase(); 
                
                let icon = 'bi-hourglass-split', badgeClass = 'badge-pendente';
                if (st === 'CONFIRMADO') { icon = 'bi-check-lg'; badgeClass = 'badge-confirmado'; }
                else if (st === 'CANCELADO') { icon = 'bi-x-circle'; badgeClass = 'badge-cancelado'; }

                td.innerHTML = `
                    <span class="badge ${badgeClass}"><i class="bi ${icon}"></i> ${st}</span>
                    <button class="btn-action-status" onclick="abrirModalStatus(${pedido.id}, '${st}')" title="Ações">
                        <i class="bi bi-gear"></i>
                    </button>
                `;
            }
            else if (colId === 'total' || colId === 'discount') {
                td.innerText = formatadorMoeda.format(val || 0);
            }
            else if (colId === 'created_at') {
                const d = val ? new Date(val) : null; // Simplificado
                td.innerText = d && !isNaN(d) ? formatadorData.format(d) : '-';
            }
            else if (colId === 'user_id') {
                td.innerHTML = val ? `<span style="font-family:monospace; background:#e2e8f0; padding:2px 6px; border-radius:4px; color:#475569; font-size: 0.8em">${String(val).substring(0, 8)}...</span>` : '-';
            }
            else {
                td.innerText = val || '';
            }

            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// --- LÓGICA DO MODAL DE STATUS (Mantida sua lógica) ---
// Note: É essencial que essas funções sejam globais, ou seja, definidas como 'window.abrirModalStatus = function...'
// ou que o script rode em um escopo global. No seu snippet elas estavam como funções simples,
// vou mantê-las assim, mas se o problema de "função não definida" aparecer no console, use 'window.'
window.abrirModalStatus = function(id, statusAtual) {
    appState.modalPedidoId = id;
    appState.modalNovoStatus = statusAtual;
    const el = document.getElementById('modalOrderId');
    if(el) el.innerText = '#' + id;
    selecionarOpcaoModal(statusAtual);
    const modal = document.getElementById('statusModal');
    if(modal) modal.classList.add('open');
};

window.selecionarOpcaoModal = function(status) {
    appState.modalNovoStatus = status;
    ['pendente', 'confirmado', 'cancelado'].forEach(s => {
        const btn = document.getElementById(`opt-${s}`);
        if(btn) {
            btn.classList.remove(`active-${s}`);
            const icon = btn.querySelector('.check-icon');
            if(icon) icon.style.display = 'none';
        }
    });
    const btnId = `opt-${status.toLowerCase()}`;
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.classList.add(`active-${status.toLowerCase()}`);
        const icon = btn.querySelector('.check-icon');
        if(icon) icon.style.display = 'block';
    }
};

window.fecharModal = function() {
    const modal = document.getElementById('statusModal');
    if(modal) modal.classList.remove('open');
};

window.salvarAlteracaoModal = async function() {
    const id = appState.modalPedidoId;
    const novoStatus = appState.modalNovoStatus;
    fecharModal();

    const index = appState.pedidos.findIndex(p => p.id === id);
    if (index === -1) return;

    const statusAntigo = appState.pedidos[index].status;
    appState.pedidos[index].status = novoStatus;
    renderizarTudo();

    try {
        // Uso de _supabase (Admin Key)
        const { error } = await _supabase.from('orders').update({ status: novoStatus }).eq('id', id);
        if (error) throw error;
    } catch (err) {
        alert('Erro ao salvar: ' + err.message);
        appState.pedidos[index].status = statusAntigo;
        renderizarTudo();
    }
};

window.excluirPedido = function() {
    fecharModal();
    abrirDeleteModal();
};

window.abrirDeleteModal = function() {
    const id = appState.modalPedidoId;
    if (!id) return;
    const el = document.getElementById("deleteOrderId");
    if(el) el.innerText = "#" + id;
    const modal = document.getElementById("deleteModal");
    if(modal) modal.classList.add("open");
};

window.fecharDeleteModal = function() {
    const modal = document.getElementById("deleteModal");
    if(modal) modal.classList.remove("open");
};

window.confirmarExclusao = async function() {
    const id = appState.modalPedidoId;
    fecharDeleteModal();

    try {
        // Uso de _supabase (Admin Key)
        const { error } = await _supabase.from('orders').delete().eq('id', id);
        if (error) throw error;
        appState.pedidos = appState.pedidos.filter(p => p.id !== id);
        renderizarTudo();
    } catch (err) {
        alert("Erro ao excluir: " + err.message);
    }
};

// --- FILTROS E COLUNAS ---
window.filtrarPedidos = function(status) {
    appState.filtroAtual = status;
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    const idBtn = status === 'TODOS' ? 'btn-todos' : `btn-${status.toLowerCase()}`;
    const btn = document.getElementById(idBtn);
    if (btn) btn.classList.add('active');
    renderizarTabela();
};

window.toggleDropdown = function() { 
    const menu = document.getElementById('colunas-menu');
    if(menu) menu.classList.toggle('show'); 
};

function renderizarMenuColunas() {
    const menu = document.getElementById('colunas-menu');
    if(!menu) return;
    menu.innerHTML = '';
    appState.colunasDisponiveis.forEach(col => {
        const checked = appState.colunasVisiveis.includes(col.id) ? 'checked' : '';
        menu.innerHTML += `<label class="column-option"><input type="checkbox" ${checked} onchange="alternarColuna('${col.id}')"> ${col.label}</label>`;
    });
}

window.alternarColuna = function(id) {
    if (appState.colunasVisiveis.includes(id)) {
        if (appState.colunasVisiveis.length > 1) appState.colunasVisiveis = appState.colunasVisiveis.filter(c => c !== id);
    } else {
        const novaOrdem = [];
        appState.colunasDisponiveis.forEach(c => {
            if (appState.colunasVisiveis.includes(c.id) || c.id === id) novaOrdem.push(c.id);
        });
        appState.colunasVisiveis = novaOrdem;
    }
    renderizarTabela();
};

// --- SCROLL E EVENTOS ---
const topScroll = document.getElementById('topScroll');
const tableContainer = document.getElementById('tableContainer');
const topScrollContent = document.getElementById('topScrollContent');
const table = document.getElementById('tabela-pedidos');

function sincronizarScrollbars() {
    if(table && topScrollContent) topScrollContent.style.width = table.scrollWidth + 'px';
}

if(topScroll && tableContainer) {
    topScroll.addEventListener('scroll', () => { tableContainer.scrollLeft = topScroll.scrollLeft; });
    tableContainer.addEventListener('scroll', () => { topScroll.scrollLeft = tableContainer.scrollLeft; });
}
window.addEventListener('resize', sincronizarScrollbars);

// Eventos de arrastar (mantidos do seu código)
let isDown = false, startX, scrollLeft;
if(tableContainer) {
    tableContainer.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION' || e.target.closest('.btn-action-status')) return;
        isDown = true; tableContainer.classList.add('active');
        startX = e.pageX - tableContainer.offsetLeft; scrollLeft = tableContainer.scrollLeft;
    });
    tableContainer.addEventListener('mouseleave', () => { isDown = false; tableContainer.classList.remove('active'); });
    tableContainer.addEventListener('mouseup', () => { isDown = false; tableContainer.classList.remove('active'); });
    tableContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return; e.preventDefault();
        const x = e.pageX - tableContainer.offsetLeft; const walk = (x - startX) * 2;
        tableContainer.scrollLeft = scrollLeft - walk;
    });
}

// Fechar modais ao clicar no overlay
window.onclick = function (e) {
    if (!e.target.closest('.btn-config') && !e.target.closest('.dropdown-menu')) {
        const menu = document.getElementById('colunas-menu');
        if(menu) menu.classList.remove('show');
    }
    if (e.target.classList.contains('modal-overlay') && (e.target.id === 'statusModal' || e.target.id === 'deleteModal')) {
        if (e.target.id === 'statusModal') fecharModal();
        if (e.target.id === 'deleteModal') fecharDeleteModal();
    }
};

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    renderizarMenuColunas();
    carregarPedidosDoBanco();
});