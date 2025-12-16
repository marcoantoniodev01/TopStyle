/* assets/js/support-chat.js - VERSÃO CORRIGIDA E ROBUSTA */

const CHAT_URL = "https://xhzdyatnfaxnvvrllhvs.supabase.co";
const CHAT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo";

let sb = null;
let currentUser = null;
let activeConvoId = null;
let activeProfileData = null; 
let realtimeSub = null;
let dashboardListener = null;

// --- FUNÇÕES EXPORTADAS PARA O DASHBOARD ---

window.initAdminChat = async function() {
    console.log("Iniciando Chat Admin...");
    
    // Garante que o Supabase esteja carregado
    await initSupabaseSafe();

    // Se ainda não tiver usuário, tenta pegar a sessão explicitamente
    if (!currentUser && sb) {
        const { data } = await sb.auth.getSession();
        if (data && data.session) {
            currentUser = data.session.user;
        }
    }
    
    if (!currentUser) {
        console.error("ERRO CHAT: Não foi possível autenticar o usuário admin.");
        const container = document.getElementById('admin-contacts-list');
        if(container) container.innerHTML = '<div style="padding:20px; color:red">Erro de autenticação. Recarregue a página.</div>';
        return;
    }

    await initAdminDashboardInternal();
};

window.limparNotificacaoSuporte = function() {
    const badge = document.getElementById('suporte-notif-badge');
    if (badge) badge.style.display = 'none';
};

// -----------------------------------------------------------------------

async function initSupabaseSafe() {
    // 1. Tenta reutilizar o cliente global do Dashboard (JÁ AUTENTICADO)
    if (window.client) {
        sb = window.client;
        await startApp();
        return;
    }

    // 2. Fallback: Cria novo cliente se não existir
    if (window.supabase && window.supabase.createClient) {
        if (!sb) {
            sb = window.supabase.createClient(CHAT_URL, CHAT_KEY);
        }
        await startApp();
    } else {
        // Tenta novamente em 500ms se a lib ainda não carregou
        setTimeout(initSupabaseSafe, 500);
    }
}

document.addEventListener('DOMContentLoaded', initSupabaseSafe);

// Substitua a função startApp existente por esta versão corrigida:

async function startApp() {
    if (!sb) return;

    // Tenta pegar a sessão atual
    let { data: { session } } = await sb.auth.getSession();
    
    // --- CORREÇÃO PRINCIPAL: LOGIN ANÔNIMO ---
    // Se estiver na tela do Cliente (suporte.html) e NÃO tiver sessão, cria uma anônima
    if (!session && document.getElementById('client-chat-container')) {
        console.log("Visitante detectado. Iniciando sessão anônima...");
        
        const { data, error } = await sb.auth.signInAnonymously();
        
        if (error) {
            console.error("Erro no login anônimo:", error);
            // Fallback: Tenta continuar mesmo sem sessão (pode falhar se tiver RLS restrito)
        } else {
            session = data.session;
        }
    }
    // ----------------------------------------
    
    if (!session) {
        // Se for Admin e não tiver sessão, aí sim paramos
        if (document.getElementById('admin-contacts-list')) {
            console.warn("Chat Admin: Aguardando login do painel...");
        }
        return;
    }
    
    currentUser = session.user;

    // Roteamento: Cliente ou Admin
    if (document.getElementById('client-chat-container')) {
        await initClientChat();
    }
    
    // Se estiver no Dashboard, inicia o listener global de notificações
    if (document.getElementById('admin-contacts-list')) {
        startGlobalMessageListener();
    }
}

/* ================= LÓGICA DO CLIENTE (SUPORTE.HTML) ================= */
async function initClientChat() {
    const msgArea = document.getElementById('messages-area');
    const form = document.getElementById('chat-form');

    // Busca conversa existente
    let { data: convo, error } = await sb
        .from('support_conversations')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (error) { console.error("Erro busca conversa:", error); return; }

    // Se não existe, cria nova
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

        if (createError) return;
        convo = newConvo;
    }

    activeConvoId = convo.id;
    updateSuggestionsVisibility(convo);
    await loadMessages(convo.id, msgArea, false);

    if (form) {
        // Remove listeners antigos para evitar duplicação
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('message-input');
            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            document.getElementById('chat-suggestions').style.display = 'none';
            await handleClientSendMessage(text);
        });
    }

    subscribeToChat(convo.id, msgArea, false);
}

function updateSuggestionsVisibility(convo) {
    const suggestions = document.getElementById('chat-suggestions');
    if (!suggestions) return;
    if (convo.status === 'closed') {
        suggestions.style.display = 'flex';
    } else {
        suggestions.style.display = 'none';
    }
}

window.sendSuggestion = async function (text) {
    const suggestions = document.getElementById('chat-suggestions');
    if (suggestions) suggestions.style.display = 'none';
    await handleClientSendMessage(text);
};

async function handleClientSendMessage(text) {
    if (!activeConvoId) return;
    const msgArea = document.getElementById('messages-area');

    // Renderiza otimista (antes de enviar)
    const tempMsg = {
        message: text,
        created_at: new Date().toISOString(),
        is_admin_sender: false,
        sender_id: currentUser.id
    };
    renderBubble(tempMsg, msgArea, false);
    scrollToBottom(msgArea);

    await sendMessageToDb(text, false);
}

/* ================= LÓGICA DO ADMIN (DASHBOARD) ================= */

async function initAdminDashboardInternal() {
    const listEl = document.getElementById('admin-contacts-list');
    if (!listEl) return;
    
    listEl.innerHTML = ''; 

    try {
        const { data: convos, error: errConvos } = await sb
            .from('support_conversations')
            .select(`*, profiles:user_id ( id, full_name, username, avatar_url, is_admin )`)
            .order('updated_at', { ascending: false });

        if(errConvos) throw errConvos;

        // Separa admins (Equipe)
        const { data: admins } = await sb
            .from('profiles')
            .select('*')
            .eq('is_admin', true)
            .neq('id', currentUser.id);

        const conversationMap = {};
        if (convos) convos.forEach(c => conversationMap[c.user_id] = c);

        // --- 1. RENDERIZA EQUIPE ---
        if (admins && admins.length > 0) {
            addSectionTitle(listEl, 'Equipe Interna');
            
            admins.forEach(admin => {
                const convoWithThem = conversationMap[admin.id];
                
                let lastMsg = 'Iniciar chat privado';
                let status = 'offline';
                let isActive = false;
                let convoObj = convoWithThem || null;

                if (convoWithThem) {
                    lastMsg = convoWithThem.last_message;
                    status = 'online';
                    if (activeConvoId === convoWithThem.id) isActive = true;
                }

                const item = createContactItem(admin, lastMsg, status, isActive);
                // Ao clicar, inicia ou abre chat
                item.onclick = () => startChatWithAdmin(admin);
                listEl.appendChild(item);
            });
        }

        // --- 2. RENDERIZA CLIENTES ---
        addSectionTitle(listEl, 'Atendimentos');
        
        const adminIds = new Set(admins ? admins.map(a => a.id) : []);
        let hasClients = false;

        if (convos) {
            convos.forEach(c => {
                // Ignora se for o próprio usuário ou outro admin (já listado acima)
                if (c.user_id === currentUser.id || adminIds.has(c.user_id)) return;

                hasClients = true;
                const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                const safeProfile = profile || { id: c.user_id, full_name: 'Usuário Desconhecido', avatar_url: null };

                const item = createContactItem(
                    safeProfile, 
                    c.last_message, 
                    c.status, 
                    c.id === activeConvoId
                );
                
                item.onclick = () => openAdminChat(c, safeProfile);
                listEl.appendChild(item);
            });
        }

        if (!hasClients) {
            listEl.innerHTML += '<div style="padding:20px; color:#64748b; font-size:0.9rem; text-align:center;">Nenhum chamado de cliente.</div>';
        }

    } catch (err) {
        console.error("Erro initAdminChat:", err);
    }
}

function addSectionTitle(container, title) {
    const div = document.createElement('div');
    div.style.padding = '15px 20px 5px 20px';
    div.style.fontSize = '0.75rem';
    div.style.fontWeight = '700';
    div.style.color = '#94a3b8';
    div.style.textTransform = 'uppercase';
    div.style.letterSpacing = '0.5px';
    div.innerText = title;
    container.appendChild(div);
}

function createContactItem(profile, lastMsg, status, isActive) {
    const div = document.createElement('div');
    div.className = `contact-item ${isActive ? 'active' : ''}`;
    
    const name = profile.full_name || profile.username || 'Sem Nome';
    const avatar = profile.avatar_url || 'https://i.ibb.co/5Y2755P/user-default.png';
    const statusDot = status === 'closed' ? 'closed' : 'online';

    div.innerHTML = `
        <div class="contact-img-wrapper">
            <img src="${avatar}" onerror="this.src='https://i.ibb.co/5Y2755P/user-default.png'">
            <span class="status-dot ${statusDot}"></span>
        </div>
        <div class="contact-info">
            <span class="contact-name">${name}</span>
            <span class="contact-last-msg">${lastMsg || ''}</span>
        </div>
    `;
    return div;
}

// Cria ou abre conversa com outro Admin
async function startChatWithAdmin(targetAdmin) {
    // Verifica se eu já tenho uma conversa onde EU sou o criador (não aplicável aqui pois user_id é único por conversa no design atual)
    // O design atual usa user_id na tabela conversations como o "Dono" do ticket.
    // Para chat entre admins, o ideal seria uma tabela separada, mas vamos adaptar:
    // Procuramos se já existe uma conversa onde o user_id é o targetAdmin
    
    let { data: existing, error } = await sb
        .from('support_conversations')
        .select('*')
        .eq('user_id', targetAdmin.id)
        .maybeSingle();

    if (existing) {
        openAdminChat(existing, targetAdmin);
    } else {
        // Cria nova
        const { data: newConvo, error: createErr } = await sb
            .from('support_conversations')
            .insert([{
                user_id: targetAdmin.id,
                status: 'open',
                last_message: 'Chat de equipe iniciado'
            }])
            .select()
            .single();
        
        if (createErr) {
            console.error(createErr);
            alert("Erro ao abrir chat de equipe.");
            return;
        }
        openAdminChat(newConvo, targetAdmin);
    }
}

async function openAdminChat(convo, profile) {
    activeConvoId = convo.id;
    activeProfileData = profile;

    // Mobile UX
    const layout = document.querySelector('.admin-chat-layout');
    if (layout) layout.classList.add('mobile-chat-active');

    // UI Updates
    document.getElementById('chat-empty-state').style.display = 'none';
    document.getElementById('chat-main-header').style.display = 'flex';
    document.getElementById('admin-messages-area').style.display = 'flex';
    document.getElementById('admin-input-area').style.display = 'flex';

    // Header Info
    document.getElementById('chat-header-name').innerText = profile.full_name || profile.username;
    const statusEl = document.getElementById('chat-header-status');
    
    if(profile.is_admin) {
        statusEl.innerText = 'Equipe Online';
        statusEl.style.color = '#3b82f6';
    } else {
        statusEl.innerText = convo.status === 'open' ? 'Em Aberto' : 'Finalizado';
        statusEl.style.color = convo.status === 'open' ? '#10b981' : '#64748b';
    }
    
    const imgHeader = document.getElementById('chat-header-img');
    if(imgHeader) {
        imgHeader.src = profile.avatar_url || 'https://i.ibb.co/5Y2755P/user-default.png';
    }

    // Carrega msgs
    const msgArea = document.getElementById('admin-messages-area');
    await loadMessages(convo.id, msgArea, true);
    
    // Setup Input
    const form = document.getElementById('admin-chat-form');
    const newForm = form.cloneNode(true);
    if(form.parentNode) form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inp = document.getElementById('admin-message-input');
        const txt = inp.value.trim();
        if (!txt) return;
        inp.value = '';
        
        // Render Otimista
        const tempMsg = { message: txt, created_at: new Date().toISOString(), is_admin_sender: true, sender_id: currentUser.id };
        renderBubble(tempMsg, msgArea, true);
        scrollToBottom(msgArea);
        
        await sendMessageToDb(txt, true);
    });

    subscribeToChat(convo.id, msgArea, true);
}

/* ================= CORE: ENVIAR MENSAGENS (CORRIGIDO) ================= */

async function sendMessageToDb(text, isAdmin) {
    // 1. Validação Robusta
    if (!activeConvoId) {
        console.error("Erro Chat: Nenhuma conversa ativa.");
        return;
    }

    // 2. Recuperação de Sessão se necessário
    if (!currentUser) {
        console.warn("Chat: Usuário perdido. Tentando recuperar sessão...");
        const { data } = await sb.auth.getSession();
        if (data && data.session) {
            currentUser = data.session.user;
        } else {
            alert("Sua sessão expirou. Por favor, recarregue a página.");
            return;
        }
    }

    // 3. Envio
    const { error } = await sb.from('support_messages').insert([{
        conversation_id: activeConvoId,
        sender_id: currentUser.id,
        message: text,
        is_admin_sender: isAdmin
    }]);

    if (error) {
        console.error("Erro ao enviar mensagem:", error);
        // Opcional: Mostrar erro visual no chat
    }

    // 4. Atualiza conversa (Última msg)
    await sb.from('support_conversations')
        .update({
            last_message: text,
            updated_at: new Date(),
            status: 'open' // Reabre se estava fechado
        })
        .eq('id', activeConvoId);
}

function renderBubble(msg, container, isAdminView) {
    const div = document.createElement('div');
    let type = 'received';
    
    // Lógica para determinar lado do balão
    // Se fui eu que enviei (ID bate) -> SENT
    if (currentUser && msg.sender_id === currentUser.id) {
        type = 'sent';
    } 
    // Fallback para mensagens antigas ou sistema
    else if (isAdminView && msg.is_admin_sender && !msg.sender_id) {
        type = 'sent'; 
    } else if (!isAdminView && !msg.is_admin_sender) {
        type = 'sent';
    }

    // Mensagem de Sistema
    if (msg.message.includes('🔒') || msg.message.includes('Iniciando atendimento')) {
        div.className = 'msg-system';
        div.innerText = msg.message;
    } else {
        div.className = `message-bubble ${type}`;
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `${msg.message} <span class="msg-time">${time}</span>`;
    }

    container.appendChild(div);
}

async function loadMessages(convoId, container, isAdminView) {
    container.innerHTML = '';
    const { data: msgs } = await sb
        .from('support_messages')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });

    if (msgs && msgs.length > 0) {
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
            const newMsg = payload.new;
            // Se fui eu que mandei, ignora (já renderizei otimista)
            if (currentUser && newMsg.sender_id === currentUser.id) return; 

            renderBubble(newMsg, container, isAdminView);
            scrollToBottom(container);
        })
        .subscribe();
}

function scrollToBottom(el) {
    setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
}

// Funções de UI Admin
window.endCurrentChat = async function () {
    if (!activeConvoId) return;
    if(!confirm("Finalizar este atendimento?")) return;

    // Atualiza status
    await sb.from('support_conversations').update({ status: 'closed' }).eq('id', activeConvoId);
    
    // Manda msg de sistema
    await sendMessageToDb("🔒 Atendimento encerrado.", true);
    
    // Recarrega lista
    initAdminDashboardInternal(); 
    
    // Fecha visualização mobile
    const layout = document.querySelector('.admin-chat-layout');
    if(layout) layout.classList.remove('mobile-chat-active');
};

window.backToContacts = function () {
    const layout = document.querySelector('.admin-chat-layout');
    if (layout) layout.classList.remove('mobile-chat-active');
};

function startGlobalMessageListener() {
    if(dashboardListener) return;

    // Escuta QUALQUER nova mensagem na tabela
    dashboardListener = sb.channel('global-dashboard-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
            // Se a mensagem não é minha, atualiza a lista e mostra notificação
            if(currentUser && payload.new.sender_id !== currentUser.id) {
                // Delay para garantir que o banco processou
                setTimeout(() => {
                    initAdminDashboardInternal(); 
                    const badge = document.getElementById('suporte-notif-badge');
                    if(badge) badge.style.display = 'block';
                }, 500);
            }
        })
        .subscribe();
}