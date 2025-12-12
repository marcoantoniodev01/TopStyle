/* assets/js/support-chat.js - REFATORADO 2.0 (Equipe + Status Fix + Modais) */

// Credenciais (Recuperadas do dashboard.js para garantir conexão)
const CHAT_URL = "https://xhzdyatnfaxnvvrllhvs.supabase.co";
const CHAT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo";

let sb = null;
let currentUser = null;
let activeConvoId = null;
let activeProfileData = null; // Armazena dados do usuário do chat aberto
let realtimeSub = null;

// Inicialização segura
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializa Supabase
    if (window.supabase && window.supabase.createClient) {
        sb = window.supabase.createClient(CHAT_URL, CHAT_KEY);
    } else {
        console.error("Supabase não carregado.");
        return;
    }

    // 2. Verifica user
    const { data: { user } } = await sb.auth.getUser();
    currentUser = user;

    // 3. Expõe a função para o dashboard.js
    window.initAdminChat = initAdminDashboard;

    // Se estiver na página do cliente (suporte.html), inicia direto
    if (document.getElementById('client-chat-container')) {
        if (!currentUser) { window.location.href = 'index.html'; return; }
        await initClientChat();
    }
});

/* ==================================================================
   LÓGICA DO CLIENTE (SUPORTE.HTML)
   ================================================================== */
async function initClientChat() {
    const msgArea = document.getElementById('messages-area');
    const suggestions = document.getElementById('chat-suggestions');
    const form = document.getElementById('chat-form');

    // 1. Busca Conversa Existente
    let { data: convo, error } = await sb
        .from('support_conversations')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    // Se não existe, CRIA
    if (!convo) {
        const { data: newConvo, error: createError } = await sb
            .from('support_conversations')
            .insert([{
                user_id: currentUser.id,
                status: 'open',
                last_message: 'Iniciando atendimento...'
            }])
            .select()
            .single();

        if (createError) {
            console.error("Erro criar conversa:", createError);
            return;
        }
        convo = newConvo;
    }

    activeConvoId = convo.id;

    // 2. Sugestões
    if (suggestions) {
        // Se conversa fechada ou vazia, mostra sugestões
        const { count } = await sb.from('support_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', activeConvoId);
        if (count === 0 || convo.status === 'closed') {
            suggestions.style.display = 'flex';
        } else {
            suggestions.style.display = 'none';
        }
    }

    // 3. Carrega Histórico
    await loadMessages(convo.id, msgArea, false);

    // 4. Configura Envio
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        if (suggestions) suggestions.style.display = 'none';
        await handleClientSendMessage(text);
    });

    // 5. Realtime
    subscribeToChat(convo.id, msgArea, false);
}

window.sendSuggestion = async function (text) {
    const suggestions = document.getElementById('chat-suggestions');
    if (suggestions) suggestions.style.display = 'none';
    await handleClientSendMessage(text);
};

async function handleClientSendMessage(text) {
    if (!activeConvoId) return;

    const msgArea = document.getElementById('messages-area');

    // UI Otimista
    const tempMsg = {
        message: text,
        created_at: new Date().toISOString(),
        is_admin_sender: false
    };
    renderBubble(tempMsg, msgArea, false);
    scrollToBottom(msgArea);

    // DB
    await sendMessageToDb(text, false);

    // Auto Resposta
    await triggerAutoReplyIfNeeded();
}

async function triggerAutoReplyIfNeeded() {
    const { data: lastMsgs } = await sb
        .from('support_messages')
        .select('*')
        .eq('conversation_id', activeConvoId)
        .order('created_at', { ascending: false })
        .limit(3);

    const hasAdminReply = lastMsgs && lastMsgs.some(m => m.is_admin_sender);

    if (!hasAdminReply) {
        setTimeout(async () => {
            const autoText = "Olá! 👋 Recebemos sua mensagem. Um atendente da TopStyle responderá em breve.";
            await sb.from('support_messages').insert([{
                conversation_id: activeConvoId,
                sender_id: currentUser.id,
                message: autoText,
                is_admin_sender: true
            }]);
        }, 1000);
    }
}

/* ==================================================================
   LÓGICA DO ADMIN (DASHBOARD)
   ================================================================== */

async function initAdminDashboard() {
    const listEl = document.getElementById('admin-contacts-list');
    
    if(!listEl) {
        setTimeout(initAdminDashboard, 500);
        return;
    }
    
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#64748b;">Carregando chats e equipe...</div>';

    try {
        // 1. Busca Conversas (Todas)
        const { data: convos } = await sb
            .from('support_conversations')
            .select(`*, profiles:user_id ( id, full_name, username, avatar_url, email, is_admin, cpf, created_at )`)
            .order('updated_at', { ascending: false });

        // 2. Busca Admins (Equipe) - Exceto eu mesmo
        const { data: admins } = await sb
            .from('profiles')
            .select('*')
            .eq('is_admin', true)
            .neq('id', currentUser.id);

        listEl.innerHTML = ''; 

        // Mapa para facilitar busca de conversa por ID de usuário
        const conversationMap = {};
        if (convos) {
            convos.forEach(c => {
                conversationMap[c.user_id] = c;
            });
        }

        // === SEÇÃO EQUIPE ===
        if (admins && admins.length > 0) {
            const teamHeader = document.createElement('div');
            teamHeader.className = 'chat-sidebar-section-title';
            teamHeader.innerText = 'Equipe & Admins';
            teamHeader.style.padding = '15px 20px 5px 20px';
            teamHeader.style.fontSize = '0.75rem';
            teamHeader.style.fontWeight = '700';
            teamHeader.style.color = '#94a3b8';
            teamHeader.style.textTransform = 'uppercase';
            listEl.appendChild(teamHeader);

            admins.forEach(admin => {
                // CORREÇÃO: Verifica se já existe conversa ativa com esse admin
                const existingConvo = conversationMap[admin.id];
                
                // Se existe conversa, usa a última mensagem e status dela. Se não, usa padrão.
                const lastMsg = existingConvo ? existingConvo.last_message : 'Iniciar conversa privada';
                const status = existingConvo ? existingConvo.status : 'online';
                const isActive = existingConvo && existingConvo.id === activeConvoId;

                const div = createContactItem(
                    admin, 
                    lastMsg, 
                    status, 
                    isActive
                );

                // Se já tem conversa, abre ela. Se não, cria nova (startChatWithAdmin)
                if (existingConvo) {
                    div.onclick = () => openAdminChat(existingConvo, admin);
                    // Adiciona indicador visual se tiver mensagem nova não lida (lógica simples baseada em negrito se quiser depois)
                } else {
                    div.onclick = () => startChatWithAdmin(admin);
                }
                
                listEl.appendChild(div);
            });
        }

        // === SEÇÃO CLIENTES ===
        const clientHeader = document.createElement('div');
        clientHeader.className = 'chat-sidebar-section-title';
        clientHeader.innerText = 'Clientes';
        clientHeader.style.padding = '20px 20px 5px 20px';
        clientHeader.style.fontSize = '0.75rem';
        clientHeader.style.fontWeight = '700';
        clientHeader.style.color = '#94a3b8';
        clientHeader.style.textTransform = 'uppercase';
        listEl.appendChild(clientHeader);

        // Set de IDs de admin para filtrar da lista de clientes
        const adminIds = new Set(admins ? admins.map(a => a.id) : []);

        if (!convos || convos.length === 0) {
            const empty = document.createElement('div');
            empty.innerText = 'Nenhum chamado aberto.';
            empty.style.padding = '20px';
            empty.style.color = '#64748b';
            empty.style.fontSize = '0.9rem';
            listEl.appendChild(empty);
        } else {
            let hasClients = false;
            convos.forEach(c => {
                // Filtra: Eu mesmo E outros Admins (já mostrados em cima)
                if (c.user_id === currentUser.id) return;
                if (adminIds.has(c.user_id)) return; 

                hasClients = true;
                let profile = c.profiles;
                if (Array.isArray(profile)) profile = profile[0];
                
                const displayProfile = profile || { 
                    id: c.user_id, 
                    full_name: 'Usuário Desconhecido', 
                    avatar_url: null 
                };

                const isActive = c.id === activeConvoId;
                const div = createContactItem(
                    displayProfile, 
                    c.last_message, 
                    c.status, 
                    isActive
                );
                
                div.onclick = () => openAdminChat(c, displayProfile);
                listEl.appendChild(div);
            });

            if (!hasClients) {
                const empty = document.createElement('div');
                empty.innerText = 'Nenhum cliente no momento.';
                empty.style.padding = '20px';
                empty.style.color = '#64748b';
                empty.style.fontSize = '0.9rem';
                listEl.appendChild(empty);
            }
        }

    } catch (err) {
        console.error("Erro initAdminChat:", err);
    }
}

// Cria o HTML do item da lista
function createContactItem(profile, lastMsg, status, isActive) {
    const div = document.createElement('div');
    div.className = `contact-item ${isActive ? 'active' : ''}`;

    // Status visual
    const statusClass = status === 'open' ? 'online' : 'closed';
    const avatarSrc = profile.avatar_url || 'https://i.ibb.co/5Y2755P/user-default.png';
    const name = profile.full_name || profile.username || 'Sem Nome';

    div.innerHTML = `
        <div class="contact-img-wrapper">
            <img src="${avatarSrc}" onerror="this.src='https://i.ibb.co/5Y2755P/user-default.png'">
            <span class="status-dot ${statusClass}"></span>
        </div>
        <div class="contact-info">
            <span class="contact-name">${name}</span>
            <span class="contact-last-msg">${lastMsg || ''}</span>
        </div>
    `;
    return div;
}

// Lógica para abrir chat com outro Admin (Cria conversa se não existir)
async function startChatWithAdmin(targetAdminProfile) {
    if (window.showToast) window.showToast("Carregando chat de equipe...");

    // Verifica se já existe conversa onde user_id é o admin alvo
    // (Na lógica simples, o Admin alvo é tratado como "user" da conversa)
    let { data: convo } = await sb
        .from('support_conversations')
        .select('*')
        .eq('user_id', targetAdminProfile.id)
        .single();

    if (!convo) {
        // Cria nova conversa
        const { data: newConvo, error } = await sb
            .from('support_conversations')
            .insert([{
                user_id: targetAdminProfile.id,
                status: 'open',
                last_message: 'Chat de equipe iniciado'
            }])
            .select()
            .single();

        if (error) {
            if (window.showToast) window.showToast("Erro ao criar chat: " + error.message, "error");
            return;
        }
        convo = newConvo;
    }

    // Abre o chat normalmente
    openAdminChat(convo, targetAdminProfile);
}


async function openAdminChat(convo, profile) {
    activeConvoId = convo.id;
    activeProfileData = profile;

    // --- LÓGICA RESPONSIVA NOVA ---
    // Ativa o modo chat no mobile (esconde sidebar, mostra chat)
    const layout = document.querySelector('.admin-chat-layout');
    if (layout) layout.classList.add('mobile-chat-active');
    // -----------------------------

    // 1. UI: Mostra tela de chat
    const emptyState = document.getElementById('chat-empty-state');
    const mainHeader = document.getElementById('chat-main-header');
    const msgArea = document.getElementById('admin-messages-area');
    const inputArea = document.getElementById('admin-input-area');

    if (emptyState) emptyState.style.display = 'none';
    if (mainHeader) mainHeader.style.display = 'flex'; // Flex é importante aqui
    if (msgArea) msgArea.style.display = 'flex';
    if (inputArea) inputArea.style.display = 'flex';

    // 2. Preenche Header
    const headerName = document.getElementById('chat-header-name');
    const headerStatus = document.getElementById('chat-header-status');
    const headerImg = document.getElementById('chat-header-img');

    if (headerName) headerName.innerText = profile.full_name || profile.username || 'Usuário';

    // CORREÇÃO STATUS: Usa o status do objeto convo (db)
    const statusText = convo.status === 'open' ? 'Em Aberto' : 'Finalizado';
    const statusColor = convo.status === 'open' ? '#10b981' : '#64748b';

    if (headerStatus) {
        headerStatus.innerText = statusText;
        headerStatus.style.color = statusColor;
        headerStatus.style.fontWeight = '600';
    }

    if (headerImg) {
        headerImg.src = profile.avatar_url || 'https://i.ibb.co/5Y2755P/user-default.png';
    }

    // 3. Carrega mensagens
    await loadMessages(convo.id, msgArea, true);

    // 4. Configura Formulário (Clona para remover listeners antigos)
    const form = document.getElementById('admin-chat-form');
    if (form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inp = document.getElementById('admin-message-input');
            const txt = inp.value.trim();
            if (!txt) return;

            inp.value = '';

            // UI Otimista
            const tempMsg = {
                message: txt,
                created_at: new Date().toISOString(),
                is_admin_sender: true
            };
            renderBubble(tempMsg, msgArea, true);
            scrollToBottom(msgArea);

            // Envia para o banco
            await sendMessageToDb(txt, true);
        });
    }

    // 5. Ativa Realtime
    subscribeToChat(convo.id, msgArea, true);

    // 6. Atualiza a lista lateral para marcar ativo
    // (Re-executa a renderização da lista para atualizar classes active)
    // Otimização: Apenas troca a classe via DOM sem recarregar tudo seria melhor, 
    // mas recarregar garante sincronia de status.
    // Para performance, vamos apenas adicionar classe visualmente aqui:
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    // (Seria complexo achar o elemento exato sem ID, então deixamos o initAdminChat atualizar no próximo refresh ou realtime)
}

// Função Global: Abrir Modal do Usuário ao clicar no Header do Chat
window.openProfileFromChat = function () {
    if (!activeProfileData) return;

    // Verifica se a função global do dashboard existe
    if (typeof window.openUserModal === 'function') {
        const p = activeProfileData;
        window.openUserModal(
            p.id,
            p.username || '',
            p.full_name || '',
            p.email || '',
            p.cpf || '',
            p.created_at || new Date().toISOString(),
            p.is_admin || false,
            false, // isBanned (não temos essa info fácil aqui, assume false ou buscamos depois)
            p.avatar_url || ''
        );
    } else {
        console.error("Função openUserModal não encontrada.");
        if (window.showToast) window.showToast("Erro ao abrir modal de perfil.", "error");
    }
};

// Função Global: Encerrar Chat (Com Modal Customizado)
window.endCurrentChat = async function () {
    if (!activeConvoId) return;

    const confirmed = await window.showConfirmationModal(
        "Deseja finalizar este atendimento?",
        { okText: 'Finalizar', cancelText: 'Cancelar' }
    );

    if (!confirmed) return;

    // Atualiza DB para fechado
    await sb.from('support_conversations').update({ status: 'closed' }).eq('id', activeConvoId);

    // Insere msg de sistema
    await sb.from('support_messages').insert([{
        conversation_id: activeConvoId,
        sender_id: currentUser.id,
        message: "🔒 Atendimento encerrado pelo agente.",
        is_admin_sender: true
    }]);

    // Atualiza Header visualmente
    const headerStatus = document.getElementById('chat-header-status');
    if (headerStatus) {
        headerStatus.innerText = 'Finalizado';
        headerStatus.style.color = '#64748b';
    }

    if (window.showToast) window.showToast("Atendimento encerrado.");

    // Atualiza sidebar
    initAdminDashboard();

    // --- LÓGICA RESPONSIVA NOVA ---
    // No mobile, volta para a lista após encerrar
    if (window.innerWidth <= 991) {
        window.backToContacts();
    }
    // -----------------------------
};

/* ==================================================================
   FUNÇÕES GERAIS (DB E UI)
   ================================================================== */

async function sendMessageToDb(text, isAdmin) {
    if (!activeConvoId || !currentUser) return;

    // Envia Mensagem
    const { error } = await sb.from('support_messages').insert([{
        conversation_id: activeConvoId,
        sender_id: currentUser.id,
        message: text,
        is_admin_sender: isAdmin
    }]);

    if (error) {
        console.error("Erro envio DB:", error);
        return;
    }

    // Atualiza Conversa (Status = Open e Last Message)
    // IMPORTANTE: Sempre que manda msg, reabre o chamado.
    await sb.from('support_conversations')
        .update({
            last_message: text,
            updated_at: new Date(),
            status: 'open'
        })
        .eq('id', activeConvoId);

    // Se for admin, atualiza o header para "Em Aberto" caso estivesse fechado
    if (isAdmin) {
        const headerStatus = document.getElementById('chat-header-status');
        if (headerStatus && headerStatus.innerText === 'Finalizado') {
            headerStatus.innerText = 'Em Aberto';
            headerStatus.style.color = '#10b981';
        }
    }
}

function renderBubble(msg, container, isAdminView) {
    const div = document.createElement('div');

    // Msg Sistema
    const isSystemMsg = msg.message.includes("Recebemos sua mensagem") || msg.message.includes("Atendimento encerrado") || msg.message.includes("Chat de equipe iniciado");

    if (isSystemMsg) {
        div.className = 'msg-system';
        div.innerText = msg.message;
        container.appendChild(div);
        return;
    }

    let type = 'received';
    if (isAdminView) {
        // Admin View: Minha msg (admin) = sent, Cliente = received
        if (msg.is_admin_sender) type = 'sent';
    } else {
        // Client View: Minha msg (não admin) = sent, Admin = received
        if (!msg.is_admin_sender) type = 'sent';
    }

    div.className = `message-bubble ${type}`;
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `${msg.message} <span class="msg-time">${time}</span>`;

    container.appendChild(div);
}

async function loadMessages(convoId, container, isAdminView) {
    container.innerHTML = '';
    const { data: msgs } = await sb
        .from('support_messages')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });

    if (msgs) {
        msgs.forEach(m => renderBubble(m, container, isAdminView));
        scrollToBottom(container);
    }
}

function subscribeToChat(convoId, container, isAdminView) {
    if (realtimeSub) sb.removeChannel(realtimeSub);

    realtimeSub = sb.channel(`chat:${convoId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `conversation_id=eq.${convoId}`
        }, (payload) => {
            // Evita duplicação otimista
            if (!isAdminView && !payload.new.is_admin_sender) return;
            if (isAdminView && payload.new.is_admin_sender) return;

            renderBubble(payload.new, container, isAdminView);
            scrollToBottom(container);

            // Se recebeu msg nova e status visual estava fechado, atualiza
            if (isAdminView) {
                const headerStatus = document.getElementById('chat-header-status');
                if (headerStatus && headerStatus.innerText === 'Finalizado') {
                    headerStatus.innerText = 'Em Aberto';
                    headerStatus.style.color = '#10b981';
                }
            }
        })
        .subscribe();
}

function scrollToBottom(el) {
    setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
}

// Função para voltar à lista de contatos no Mobile
window.backToContacts = function () {
    const layout = document.querySelector('.admin-chat-layout');
    if (layout) {
        layout.classList.remove('mobile-chat-active');

        // Opcional: Limpar seleção visual da lista
        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));

        // Resetar activeConvoId se quiser forçar reload ao entrar (opcional, melhor não resetar para manter estado)
    }
};

/* ==================================================================
   SISTEMA DE NOTIFICAÇÕES GLOBAIS (BADGE + BROWSER)
   ================================================================== */

// 1. Solicitar permissão ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    
    // Inicia o listener global se for admin
    setTimeout(() => {
        if(sb && currentUser) { // Verifica se supabase e user carregaram
             startGlobalMessageListener();
        }
    }, 2000);
});

// 2. Listener Global (Roda em segundo plano na Dashboard)
function startGlobalMessageListener() {
    // Escuta QUALQUER nova mensagem na tabela support_messages
    sb.channel('global-notif-channel')
    .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'support_messages' 
    }, (payload) => {
        const newMsg = payload.new;

        // CORREÇÃO:
        // Antes: if (newMsg.is_admin_sender) return; (Isso bloqueava mensagens entre admins)
        // Agora: Bloqueia apenas se EU fui quem enviou.
        if (newMsg.sender_id === currentUser.id) return;

        // Se chegou aqui, é uma mensagem recebida (seja de cliente ou de outro admin da equipe)
        
        // 1. Atualiza visualmente a lista lateral se ela estiver aberta (sobe o contato, atualiza msg)
        // (Opcional: chamar initAdminDashboard() para refresh total, ou manipular DOM)
        if(document.getElementById('admin-contacts-list')) {
            initAdminDashboard(); 
        }

        // 2. Notificações
        mostrarBolinhaMenu();
        enviarNotificacaoNavegador(newMsg.message);
        
    })
    .subscribe();
}

// Função para mostrar a bolinha
function mostrarBolinhaMenu() {
    const badge = document.getElementById('suporte-notif-badge');
    
    // Só mostra a bolinha se o usuário NÃO estiver atualmente na tela de chat
    // Verifica se a aba "Suporte" está ativa. Se estiver ativa, não precisa notificar visualmente no menu.
    const pageSuporte = document.getElementById('suporte-chat-admin');
    const isChatOpen = pageSuporte && pageSuporte.classList.contains('active');

    if (badge && !isChatOpen) {
        badge.style.display = 'block';
    }
}

// Função chamada pelo onclick no HTML do menu (dashboard.html)
window.limparNotificacaoSuporte = function() {
    const badge = document.getElementById('suporte-notif-badge');
    if (badge) {
        badge.style.display = 'none';
    }
};

// Função de Notificação do Navegador
function enviarNotificacaoNavegador(textoMsg) {
    if (document.hidden && Notification.permission === "granted") {
        new Notification("Nova Mensagem de Suporte", {
            body: textoMsg,
            icon: "https://i.ibb.co/jPt43z3L/logo-background.png" // Seu logo
        });
    }
}