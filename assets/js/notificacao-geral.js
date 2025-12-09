// ==========================================
// 1. CONFIGURAÇÃO 
// ==========================================
const FIELD_DICTIONARY = {
    'id': 'Código ID', 'code': 'Código', 'created_at': 'Criado em',
    'nome': 'Nome', 'name': 'Nome', 'price': 'Preço', 'status': 'Status',
    'description': 'Descrição', 'user_id': 'Usuário', 'estoque': 'Estoque'
};
const HIDDEN_FIELDS = ['uuid', 'tenant_id', 'password_hash', 'updated_at', 'system_code'];
const LONG_TEXT_FIELDS = ['description', 'descricao', 'obs', 'observacao', 'notes'];



const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        storage: undefined
    }
});

// CORREÇÃO: IDs atualizados para bater com o HTML namespace
const container = document.getElementById('notificacao-geral-log-container');

let allLogs = [];
let currentFilterType = 'all';
let uniqueTables = new Set();
let currentPayloadOpen = null;
let currentViewMode = 'visual';

// ==========================================
// 2. LÓGICA DE FILTRAGEM (Funções Renomeadas)
// ==========================================

function notificacaoGeralSetEventType(type) {
    currentFilterType = type;
    document.querySelectorAll('.notificacao-geral-type-btn').forEach(btn => {
        btn.classList.remove('notificacao-geral-active');

        // Lógica ajustada para as classes do HTML novo
        if (type === 'all' && btn.classList.contains('notificacao-geral-all')) btn.classList.add('notificacao-geral-active');
        if (type === 'INSERT' && btn.classList.contains('notificacao-geral-insert')) btn.classList.add('notificacao-geral-active');
        if (type === 'UPDATE' && btn.classList.contains('notificacao-geral-update')) btn.classList.add('notificacao-geral-active');
        if (type === 'DELETE' && btn.classList.contains('notificacao-geral-delete')) btn.classList.add('notificacao-geral-active');
    });
    notificacaoGeralFilterLogs();
}

function notificacaoGeralFilterLogs() {
    // CORREÇÃO: IDs atualizados aqui também
    const searchTerm = document.getElementById('notificacao-geral-input-search').value.toLowerCase();
    const selectedTable = document.getElementById('notificacao-geral-select-table').value;

    const filtered = allLogs.filter(log => {
        if (currentFilterType !== 'all' && log.event_type !== currentFilterType) return false;
        if (selectedTable !== 'all' && log.table_name !== selectedTable) return false;
        if (searchTerm) {
            const searchableString = JSON.stringify(log).toLowerCase();
            if (!searchableString.includes(searchTerm)) return false;
        }
        return true;
    });
    notificacaoGeralRenderLogList(filtered);
}

function notificacaoGeralRenderLogList(logsToRender) {
    container.innerHTML = '';
    // CORREÇÃO: ID atualizado
    document.getElementById('notificacao-geral-results-count').innerText = `${logsToRender.length} registro(s) encontrado(s)`;

    if (logsToRender.length === 0) {
        container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#64748b;">
                    <i class="fa-solid fa-filter-circle-xmark" style="font-size: 2rem; margin-bottom:10px;"></i><br>
                    Nenhum registro encontrado com esses filtros.
                </div>`;
        return;
    }

    logsToRender.forEach(log => {
        const card = notificacaoGeralCreateCardElement(log);
        container.appendChild(card);
    });
}

function notificacaoGeralUpdateTableDropdown() {
    // CORREÇÃO: ID atualizado
    const select = document.getElementById('notificacao-geral-select-table');
    const currentVal = select.value;
    allLogs.forEach(log => uniqueTables.add(log.table_name));

    let html = '<option value="all">Todas as Tabelas</option>';
    Array.from(uniqueTables).sort().forEach(table => {
        html += `<option value="${table}">${capitalize(table)}</option>`;
    });

    select.innerHTML = html;
    select.value = currentVal;
}

// ==========================================
// 3. CRIAÇÃO DE ELEMENTOS
// ==========================================

function notificacaoGeralCreateCardElement(logItem) {
    const eventType = logItem.event_type;
    const tableName = logItem.table_name;
    // Usando created_at corretamente
    const time = logItem.created_at ? new Date(logItem.created_at).toLocaleTimeString('pt-BR') : 'N/A';

    const data = logItem.new_data || logItem.old_data || {};
    let displayTitle = data.nome || data.name || data.title || data.code || (data.id ? `ID: ${data.id}` : 'Registro');

    const card = document.createElement('div');
    // Usando as novas classes de CSS
    card.className = `notificacao-geral-notification-card notificacao-geral-event-${eventType}`;
    const logItemString = encodeURIComponent(JSON.stringify(logItem));

    // CORREÇÃO: Classes e chamada de função onclick atualizados
    card.innerHTML = `
            <div class="notificacao-geral-card-info">
                <div class="notificacao-geral-card-header">
                    <span class="notificacao-geral-badge notificacao-geral-badge-${eventType}">${eventType}</span>
                    <span class="notificacao-geral-table-name">${tableName}</span>
                </div>
                <span class="notificacao-geral-timestamp"><i class="fa-regular fa-clock"></i> ${time} • <strong>${displayTitle}</strong></span>
            </div>
            <button class="notificacao-geral-btn-details" onclick="notificacaoGeralOpenModal('${logItemString}')">
                <span>Detalhes</span> <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;
    return card;
}

// ==========================================
// 4. SUPABASE & DADOS
// ==========================================

async function loadInitialLogs() {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Erro ao carregar logs:', error);
        return;
    }

    allLogs = data;
    notificacaoGeralUpdateTableDropdown();
    notificacaoGeralFilterLogs();
}

function setupRealtimeSubscription() {
    supabase.channel('audit-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' },
            (payload) => {
                console.log('Novo log:', payload.new);
                allLogs.unshift(payload.new);
                if (!uniqueTables.has(payload.new.table_name)) {
                    notificacaoGeralUpdateTableDropdown();
                }
                notificacaoGeralFilterLogs();
            }
        )
        .subscribe((status) => {
            const statusDiv = document.createElement('div');
            Object.assign(statusDiv.style, {
                textAlign: 'center', padding: '10px', marginBottom: '15px', borderRadius: '8px'
            });

            if (status === 'SUBSCRIBED') {
                statusDiv.innerHTML = '🟢 Conectado em Tempo Real';
                statusDiv.style.backgroundColor = 'rgba(62, 207, 142, 0.1)';
                statusDiv.style.color = '#3ecf8e';
            } else {
                statusDiv.innerHTML = '🔴 Desconectado';
                statusDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                statusDiv.style.color = '#ef4444';
            }

            // Verificação extra para evitar erro do parentNode null
            if (container && container.parentNode) {
                container.parentNode.insertBefore(statusDiv, container);
                setTimeout(() => statusDiv.remove(), 3000);
            }
        });
}

// ==========================================
// 5. MODAL & UTILITÁRIOS (Funções Renomeadas)
// ==========================================

function notificacaoGeralOpenModal(encodedLogItem) {
    const logItem = JSON.parse(decodeURIComponent(encodedLogItem));
    const payload = { eventType: logItem.event_type, table: logItem.table_name, old: logItem.old_data, new: logItem.new_data };
    currentPayloadOpen = payload;

    const icon = payload.eventType === 'DELETE' ? '❌' : (payload.eventType === 'INSERT' ? '✅' : '⚠️');
    // CORREÇÃO: ID atualizado
    document.getElementById('notificacao-geral-modal-title-text').innerText = `${icon} Alteração: ${payload.table.toUpperCase()} (ID: ${logItem.id.substring(0, 8)}...)`;

    notificacaoGeralRenderModalContent();
    // CORREÇÃO: ID atualizado
    document.getElementById('notificacao-geral-detail-modal').style.display = 'flex';
}

function notificacaoGeralCloseModal() {
    // CORREÇÃO: ID atualizado
    document.getElementById('notificacao-geral-detail-modal').style.display = 'none';
}

// Fecha modal ao clicar fora
window.onclick = function (e) {
    const modal = document.getElementById('notificacao-geral-detail-modal');
    if (e.target == modal) notificacaoGeralCloseModal();
}

function notificacaoGeralSwitchView(mode) {
    currentViewMode = mode;
    // CORREÇÃO: IDs e classes atualizados
    document.getElementById('notificacao-geral-btn-visual').classList.toggle('notificacao-geral-active', mode === 'visual');
    document.getElementById('notificacao-geral-btn-code').classList.toggle('notificacao-geral-active', mode === 'code');
    notificacaoGeralRenderModalContent();
}

function notificacaoGeralRenderModalContent() {
    const p = currentPayloadOpen;
    // CORREÇÃO: ID atualizado
    const div = document.getElementById('notificacao-geral-modal-body-content');

    // Classes atualizadas no HTML gerado
    let html = '<div class="notificacao-geral-comparison-container">';

    if (p.eventType !== 'INSERT') {
        html += `<div class="notificacao-geral-data-column"><div class="notificacao-geral-col-header notificacao-geral-header-old">Antes</div>${notificacaoGeralRenderData(p.old, currentViewMode, p.new)}</div>`;
    }
    if (p.eventType !== 'DELETE') {
        html += `<div class="notificacao-geral-data-column"><div class="notificacao-geral-col-header notificacao-geral-header-new">Depois</div>${notificacaoGeralRenderData(p.new, currentViewMode, p.old)}</div>`;
    }
    html += '</div>';
    div.innerHTML = html;
}

function notificacaoGeralRenderData(data, mode, compareData) {
    if (!data || Object.keys(data).length === 0) return mode === 'visual' ? '<div style="padding:20px; text-align:center; color:#94a3b8;">Vazio</div>' : '<pre class="notificacao-geral-code-block">{}</pre>';

    if (mode === 'code') return `<pre class="notificacao-geral-code-block">${JSON.stringify(data, null, 2)}</pre>`;

    let html = '<ul class="notificacao-geral-visual-list">';
    Object.keys(data).sort().forEach(key => {
        if (HIDDEN_FIELDS.includes(key)) return;
        const val = data[key];
        const label = FIELD_DICTIONARY[key] || capitalize(key.replace(/_/g, ' '));
        let isChanged = compareData && JSON.stringify(val) !== JSON.stringify(compareData[key]);

        let valDisplay = val;
        if (val === null) valDisplay = '<i>Nulo</i>';
        else if (typeof val === 'object') valDisplay = '<i>[Objeto]</i>';
        else if (LONG_TEXT_FIELDS.includes(key)) valDisplay = `<span class="notificacao-geral-long-text-area">${val}</span>`;

        html += `<li class="notificacao-geral-visual-item ${isChanged ? 'notificacao-geral-item-changed' : ''}">
                <span class="notificacao-geral-visual-key">${isChanged ? '⚠️ ' : ''}${label}</span>
                <span class="notificacao-geral-visual-val">${valDisplay}</span>
            </li>`;
    });
    return html + '</ul>';
}

function capitalize(s) { return s && s[0].toUpperCase() + s.slice(1); }

document.addEventListener('DOMContentLoaded', () => {
    setupRealtimeSubscription();
    loadInitialLogs();
});