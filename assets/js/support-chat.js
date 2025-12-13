/* assets/js/support-chat.js - VERSÃO DEFINITIVA (Admin-to-Admin Fix) */

// Credenciais
const CHAT_URL = "https://xhzdyatnfaxnvvrllhvs.supabase.co";
const CHAT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo";

let sb = null;
let currentUser = null;
let activeConvoId = null;
let activeProfileData = null; 
let realtimeSub = null;
let dashboardListener = null;

// Inicialização segura com Retry
function initSupabaseSafe() {
    if (window.supabase && window.supabase.createClient) {
        sb = window.supabase.createClient(CHAT_URL, CHAT_KEY);
        startApp();
    } else {
        setTimeout(initSupabaseSafe, 500);
    }
}

document.addEventListener('DOMContentLoaded', initSupabaseSafe);

async function startApp() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        if (document.getElementById('client-chat-container')) console.warn("Usuário não logado.");
        return;
    }
    currentUser = session.user;

    // Expõe função para o Dashboard
    window.initAdminChat = initAdminDashboard;

    // Roteamento
    if (document.getElementById('client-chat-container')) {
        await initClientChat();
    }
    
    // Se estiver no Dashboard, inicia o listener global imediatamente
    if (document.getElementById('admin-contacts-list')) {
        startGlobalMessageListener();
    }
}

/* ==================================================================
   LÓGICA DO CLIENTE (SUPORTE.HTML)
   ================================================================== */
async function initClientChat() {
    const msgArea = document.getElementById('messages-area');
    const form = document.getElementById('chat-form');

    let { data: convo, error } = await sb
        .from('support_conversations')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (error) { console.error("Erro busca:", error); return; }

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
        form.addEventListener('submit', async (e) => {
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

    const tempMsg = {
        message: text,
        created_at: new Date().toISOString(),
        is_admin_sender: false
    };
    renderBubble(tempMsg, msgArea, false);
    scrollToBottom(msgArea);

    await sendMessageToDb(text, false);
}

/* ==================================================================
   LÓGICA DO ADMIN (DASHBOARD) - AGORA COM CHAT ENTRE ADMS
   ================================================================== */

async function initAdminDashboard() {
    const listEl = document.getElementById('admin-contacts-list');
    if (!listEl) return;
    
    // Salva scroll atual ou estado se necessário, mas aqui vamos recriar
    // Para evitar "flicker", poderíamos limpar só depois, mas vamos simplificar
    listEl.innerHTML = ''; 

    try {
        // 1. Busca Conversas
        const { data: convos, error: errConvos } = await sb
            .from('support_conversations')
            .select(`*, profiles:user_id ( id, full_name, username, avatar_url, is_admin )`)
            .order('updated_at', { ascending: false });

        if(errConvos) throw errConvos;

        // 2. Busca Equipe (Outros Admins)
        const { data: admins } = await sb
            .from('profiles')
            .select('*')
            .eq('is_admin', true)
            .neq('id', currentUser.id);

        const conversationMap = {};
        if (convos) convos.forEach(c => conversationMap[c.user_id] = c);

        // --- SEÇÃO EQUIPE (LÓGICA UNIFICADA) ---
        if (admins && admins.length > 0) {
            addSectionTitle(listEl, 'Equipe');
            
            admins.forEach(admin => {
                // Tenta encontrar DUAS conversas possíveis:
                // 1. Onde EU estou falando com ELE (user_id = admin.id)
                const convoWithThem = conversationMap[admin.id];
                
                // 2. Onde ELE está falando COMIGO (user_id = currentUser.id)
                // Para saber isso, precisamos verificar quem mandou a última mensagem na MINHA conversa
                // Mas como simplificação, vamos checar se "Minha Conversa" existe
                const myConvo = conversationMap[currentUser.id];
                
                // Decide qual conversa abrir/exibir
                let targetConvo = null;
                let lastMsg = 'Iniciar chat privado';
                let status = 'offline'; // "offline" aqui é só visual para equipe
                let isActive = false;

                // Lógica de Prioridade: Mostra a que teve atualização mais recente
                const timeThem = convoWithThem ? new Date(convoWithThem.updated_at).getTime() : 0;
                // Só consideramos a "minha" conversa se a última mensagem NÃO fui eu quem mandou (ou seja, foi ele)
                // Como não temos sender no conversation, assumimos pelo timestamp por enquanto
                const timeMe = myConvo ? new Date(myConvo.updated_at).getTime() : 0;

                // Escolhe a conversa mais recente para interagir
                if (convoWithThem && timeThem >= timeMe) {
                    targetConvo = convoWithThem;
                    lastMsg = targetConvo.last_message;
                    status = 'online';
                } else if (myConvo && timeMe > timeThem) {
                    // Aqui tem um truque: se a minha conversa é a mais recente, 
                    // precisamos garantir que foi ESSE admin que falou comigo.
                    // Sem uma query complexa de mensagens, vamos assumir que se eu clico nele,
                    // eu prefiro abrir a conversa onde ELE é o dono (padrão) OU a minha se for resposta.
                    
                    // Para simplificar e resolver o bug: Vamos abrir a conversa DELE se existir.
                    // Se não, abrimos a minha.
                    if(convoWithThem) {
                         targetConvo = convoWithThem;
                         lastMsg = targetConvo.last_message; 
                         status = 'online';
                    } else {
                        // Se só existe a minha conversa (ele falou comigo, eu nunca falei com ele no canal dele)
                        // Precisamos saber se foi ele. Como não sabemos sem fetch extra,
                        // vamos forçar a criação do canal DELE ao clicar, para padronizar.
                        lastMsg = "Nova mensagem (Verificar)"; 
                        status = 'online';
                        // targetConvo será null, forçando create/fetch no click
                    }
                }

                // Verifica se está ativo visualmente
                if (targetConvo && activeConvoId === targetConvo.id) isActive = true;

                const item = createContactItem(admin, lastMsg, status, isActive);
                
                // Ao clicar: Sempre tentamos abrir a conversa onde user_id = AMIGO.
                // Isso centraliza o histórico num lugar só (O canal do amigo).
                item.onclick = () => startChatWithAdmin(admin);
                
                listEl.appendChild(item);
            });
        }

        // --- SEÇÃO CLIENTES ---
        addSectionTitle(listEl, 'Clientes');
        
        const adminIds = new Set(admins ? admins.map(a => a.id) : []);
        let hasClients = false;

        if (convos) {
            convos.forEach(c => {
                // Filtra: Eu mesmo E outros Admins (já listados acima)
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
            listEl.innerHTML += '<div style="padding:20px; color:#64748b; font-size:0.9rem;">Nenhum chamado de cliente.</div>';
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
    div.innerText = title;
    container.appendChild(div);
}

function createContactItem(profile, lastMsg, status, isActive) {
    const div = document.createElement('div');
    div.className = `contact-item ${isActive ? 'active' : ''}`;
    
    const name = profile.full_name || profile.username || 'Sem Nome';
    const avatar = profile.avatar_url || 'https://i.ibb.co/5Y2755P/user-default.png';
    // Status visual: Se for admin (status online/offline fake), se cliente (open/closed)
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

// LÓGICA CORRIGIDA: Chat entre Admins sempre busca unificar no ID do Target
async function startChatWithAdmin(targetAdmin) {
    // Tenta encontrar conversa onde user_id = targetAdmin
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
                user_id: targetAdmin.id, // O chat pertence ao "Destinatário" para centralizar
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

    // UI Mobile
    const layout = document.querySelector('.admin-chat-layout');
    if (layout) layout.classList.add('mobile-chat-active');

    // UI Reset
    document.getElementById('chat-empty-state').style.display = 'none';
    document.getElementById('chat-main-header').style.display = 'flex';
    document.getElementById('admin-messages-area').style.display = 'flex';
    document.getElementById('admin-input-area').style.display = 'flex';

    // Header Info
    document.getElementById('chat-header-name').innerText = profile.full_name || profile.username;
    const statusEl = document.getElementById('chat-header-status');
    // Para equipe, sempre mostra online, para clientes mostra status real
    if(profile.is_admin) {
        statusEl.innerText = 'Equipe Online';
        statusEl.style.color = '#3b82f6';
    } else {
        statusEl.innerText = convo.status === 'open' ? 'Em Aberto' : 'Finalizado';
        statusEl.style.color = convo.status === 'open' ? '#10b981' : '#64748b';
    }
    document.getElementById('chat-header-img').src = profile.avatar_url || 'https://i.ibb.co/5Y2755P/user-default.png';

    // Carregar e Subscrever
    const msgArea = document.getElementById('admin-messages-area');
    await loadMessages(convo.id, msgArea, true);
    
    // Configura Form de Envio
    const form = document.getElementById('admin-chat-form');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inp = document.getElementById('admin-message-input');
        const txt = inp.value.trim();
        if (!txt) return;
        inp.value = '';
        
        // Renderiza Otimista
        const tempMsg = { message: txt, created_at: new Date().toISOString(), is_admin_sender: true };
        renderBubble(tempMsg, msgArea, true);
        scrollToBottom(msgArea);
        
        await sendMessageToDb(txt, true);
    });

    subscribeToChat(convo.id, msgArea, true);
}

/* ==================================================================
   FUNÇÕES GERAIS DE CHAT (DB & UI)
   ================================================================== */

async function sendMessageToDb(text, isAdmin) {
    if (!activeConvoId || !currentUser) return;

    // Insert msg
    const { error } = await sb.from('support_messages').insert([{
        conversation_id: activeConvoId,
        sender_id: currentUser.id,
        message: text,
        is_admin_sender: isAdmin
    }]);

    if (error) console.error("Erro envio:", error);

    // Update conversation status/last_message
    await sb.from('support_conversations')
        .update({
            last_message: text,
            updated_at: new Date(),
            status: 'open' // Sempre reabre ao mandar mensagem
        })
        .eq('id', activeConvoId);
}

function renderBubble(msg, container, isAdminView) {
    const div = document.createElement('div');
    
    // LÓGICA DE LADO (ESQUERDA/DIREITA)
    // Se sou Admin na View Admin: Minhas msgs (is_admin_sender=true) vao p/ direita.
    // Se sou Cliente: Minhas msgs (is_admin_sender=false) vao p/ direita.
    
    // POREM, no chat entre ADMINS, ambos sao is_admin_sender=true.
    // Então precisamos checar o sender_id real se disponível, senão fallback.
    
    let type = 'received';
    
    if (msg.sender_id === currentUser.id) {
        type = 'sent';
    } else if (isAdminView && msg.is_admin_sender && !msg.sender_id) {
        // Fallback antigo caso nao tenha sender_id no objeto local
        type = 'sent'; 
    } else if (!isAdminView && !msg.is_admin_sender) {
        type = 'sent';
    }

    // Sistema
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
            if (newMsg.sender_id === currentUser.id) return; // Ignora minha própria msg (já renderizada)

            renderBubble(newMsg, container, isAdminView);
            scrollToBottom(container);
            
            // Toca som se quiser
            // const audio = new Audio('assets/sounds/notification.mp3'); audio.play().catch(()=>{});
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'support_conversations',
            filter: `id=eq.${convoId}`
        }, (payload) => {
            const newStatus = payload.new.status;
            if(!isAdminView && newStatus === 'closed') {
                const sugg = document.getElementById('chat-suggestions');
                if(sugg) sugg.style.display = 'flex';
            }
        })
        .subscribe();
}

function scrollToBottom(el) {
    setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
}

window.endCurrentChat = async function () {
    if (!activeConvoId) return;
    if(!confirm("Finalizar este atendimento?")) return;

    await sb.from('support_conversations').update({ status: 'closed' }).eq('id', activeConvoId);
    
    await sb.from('support_messages').insert([{
        conversation_id: activeConvoId,
        sender_id: currentUser.id,
        message: "🔒 Atendimento encerrado.",
        is_admin_sender: true
    }]);
    
    initAdminDashboard(); 
    
    // Mobile back
    const layout = document.querySelector('.admin-chat-layout');
    if(layout) layout.classList.remove('mobile-chat-active');
};

window.backToContacts = function () {
    const layout = document.querySelector('.admin-chat-layout');
    if (layout) layout.classList.remove('mobile-chat-active');
};

// LISTENER GLOBAL PODEROSO (ADMIN DASHBOARD)
// Escuta TUDO na tabela support_messages para garantir que o Admin veja atualizações
// mesmo que seja uma conversa "dele" ou "de outro".
function startGlobalMessageListener() {
    if(dashboardListener) return;

    dashboardListener = sb.channel('global-dashboard-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
            // Se a mensagem não é minha, atualiza a lista lateral para mostrar a novidade
            if(payload.new.sender_id !== currentUser.id) {
                // Pequeno delay para garantir que o DB processou triggers se houver
                setTimeout(() => {
                    initAdminDashboard();
                    const badge = document.getElementById('suporte-notif-badge');
                    if(badge) badge.style.display = 'block';
                }, 500);
            }
        })
        .subscribe();
}

window.limparNotificacaoSuporte = function() {
    const badge = document.getElementById('suporte-notif-badge');
    if (badge) badge.style.display = 'none';
};