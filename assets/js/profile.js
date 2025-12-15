// assets/js/profile.js
// VERSÃO ATUALIZADA: Pagamento via 'payment_info', Imagem no Modal com JOIN de 'products(img)' via 'product_id', e Fix de erros 404/400.

// (O resto do arquivo até o início de DOMContentLoaded permanece igual — não modifiquei essa parte)
let supabase;
let currentUser = null;

// Helpers Globais
const showToast = window.showToast || alert;
const showConfirmationModal = window.showConfirmationModal || confirm;
const cardLogos = {
    'visa': 'https://i.ibb.co/zVNMbqgp/visa.webp',
    'mastercard': 'https://i.ibb.co/nsJz9M59/mastercard.webp',
    'elo': 'https://i.ibb.co/tPzvwVkJ/elo.webp',
    'default': 'https://i.ibb.co/L9Yx1gD/credit-card-logo.png'
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. CONEXÃO SEGURA
    try {
        if (window.initSupabaseClient) {
            supabase = await window.initSupabaseClient();
        } else {
            console.error("ERRO CRÍTICO: main.js não carregou o Supabase.");
            return;
        }
    } catch (err) {
        console.error("Erro ao conectar Supabase:", err);
        return;
    }

    // 2. Verifica Auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        const mainContent = document.querySelector('main');
        if(mainContent) mainContent.style.opacity = "0.1";

        const irParaLogin = await window.showConfirmationModal(
            "Você precisa estar logado para visualizar seu perfil.", 
            { 
                okText: 'Fazer Login', 
                cancelText: 'Voltar ao Início' 
            }
        );

        if (irParaLogin) {
            window.location.href = 'index.html'; 
        } else {
            window.location.href = 'inicial.html'; 
        }
        return; 
    }
    
    currentUser = session.user;

    const mainContent = document.querySelector('main');
    if(mainContent) mainContent.style.opacity = "1";

    initProfileData();
    initAddressLogic();
    initCardLogic();
    initPhoneLogic();
    initOrdersLogic(); 
});

/* ==========================================================
   1. DADOS PESSOAIS
   (sem alterações)
   ========================================================== */
// ... (o conteúdo das funções anteriores permanece igual; não repeti aqui por brevidade)
async function initProfileData() {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    
    const displayEls = {
        username: document.getElementById('username'),
        email: document.getElementById('email'),
        cpf: document.getElementById('cpf'),
        born: document.getElementById('born_Date')
    };
    
    const inputEls = {
        username: document.getElementById('username-input'),
        email: document.getElementById('email-input'),
        cpf: document.getElementById('cpf-input'),
        born: document.getElementById('born_Date-input')
    };

    const email = currentUser.email;
    const username = profile?.username || currentUser.user_metadata?.full_name || '—';
    const cpf = profile?.cpf || '—';
    const born = profile?.born_date || '';

    if(displayEls.username) displayEls.username.textContent = username;
    if(displayEls.email) displayEls.email.textContent = email;
    if(displayEls.cpf) displayEls.cpf.textContent = cpf;
    if(displayEls.born) displayEls.born.textContent = born ? formatDate(born) : '—';

    if(inputEls.username) inputEls.username.value = username !== '—' ? username : '';
    if(inputEls.email) inputEls.email.value = email;
    if(inputEls.cpf) inputEls.cpf.value = cpf !== '—' ? cpf : '';
    if(inputEls.born) inputEls.born.value = born;

    const btnEdit = document.getElementById('edit-profile-btn');
    const form = document.getElementById('profile-form');
    let isEditing = false;

    if(btnEdit) {
        btnEdit.addEventListener('click', async () => {
            if(!isEditing) {
                form.classList.add('editing');
                btnEdit.textContent = 'Salvar';
                isEditing = true;
            } else {
                btnEdit.textContent = 'Salvando...';
                const updates = {
                    username: inputEls.username.value,
                    cpf: inputEls.cpf.value,
                    born_date: inputEls.born.value,
                    updated_at: new Date()
                };

                const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id);
                
                if(error) {
                    showToast('Erro ao atualizar perfil.');
                    console.error(error);
                } else {
                    showToast('Perfil atualizado!');
                    form.classList.remove('editing');
                    btnEdit.textContent = 'Editar';
                    isEditing = false;
                    displayEls.username.textContent = updates.username;
                    displayEls.cpf.textContent = updates.cpf;
                    displayEls.born.textContent = updates.born_date ? formatDate(updates.born_date) : '—';
                }
            }
        });
    }
}

function formatDate(dateStr) {
    if(!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

/* ==========================================================
   2. ENDEREÇOS
   (sem alterações)
   ========================================================== */
// ... (mantive essas funções sem mudança)
async function initAddressLogic() {
    const listContainer = document.getElementById('addresses-list');
    const btnAdd = document.getElementById('add-address-btn');
    const modalAdd = document.getElementById('modal-adicionar-endereco');
    const formAdd = document.getElementById('form-endereco');
    const btnCancel = document.getElementById('btn-cancelar-adicao');
    const cepInput = document.getElementById('endereco-cep');

    async function loadAddresses() {
        const { data } = await supabase.from('addresses').select('*').eq('user_id', currentUser.id).order('is_default', { ascending: false });
        renderAddresses(data || []);
    }

    function renderAddresses(addresses) {
        if(!listContainer) return;
        listContainer.innerHTML = '';
        if(addresses.length === 0) {
            listContainer.innerHTML = '<p>Nenhum endereço cadastrado.</p>';
            return;
        }

        addresses.forEach(addr => {
            const el = document.createElement('div');
            el.className = 'endereco-item';
            el.innerHTML = `
                <div class="info">
                    <b>${addr.label}</b>
                    <p>${addr.street}, ${addr.numero} ${addr.complemento ? '- ' + addr.complemento : ''}</p>
                    <p>${addr.city} - ${addr.state}, ${addr.zip}</p>
                    ${addr.is_default ? '<span class="default-badge">Padrão</span>' : ''}
                </div>
                <div class="actions">
                    ${!addr.is_default ? `<button class="btn-tornar-padrao" data-id="${addr.id}">Tornar Padrão</button>` : ''}
                    <button class="btn-delete-card" data-id="${addr.id}"><i class="ri-delete-bin-line"></i></button>
                </div>
            `;
            
            el.querySelector('.btn-delete-card').addEventListener('click', () => deleteAddress(addr.id));
            const btnDefault = el.querySelector('.btn-tornar-padrao');
            if(btnDefault) btnDefault.addEventListener('click', () => setDefaultAddress(addr.id));

            listContainer.appendChild(el);
        });
    }

    async function deleteAddress(id) {
        if(await showConfirmationModal('Excluir este endereço?')) {
            await supabase.from('addresses').delete().eq('id', id);
            loadAddresses();
            showToast('Endereço excluído.');
        }
    }

    async function setDefaultAddress(id) {
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', currentUser.id);
        await supabase.from('addresses').update({ is_default: true }).eq('id', id);
        loadAddresses();
        showToast('Endereço padrão atualizado.');
    }

    if(btnAdd) btnAdd.addEventListener('click', () => {
        formAdd.reset();
        modalAdd.style.display = 'flex';
    });

    if(btnCancel) btnCancel.addEventListener('click', () => modalAdd.style.display = 'none');

    if(formAdd) formAdd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const addressData = {
            user_id: currentUser.id,
            label: document.getElementById('endereco-label').value,
            zip: document.getElementById('endereco-cep').value,
            street: document.getElementById('endereco-rua').value,
            numero: document.getElementById('endereco-numero').value,
            complemento: document.getElementById('endereco-complemento').value,
            city: document.getElementById('endereco-cidade').value,
            state: document.getElementById('endereco-estado').value,
            referencia: document.getElementById('endereco-referencia').value,
            is_default: false 
        };

        const { count } = await supabase.from('addresses').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
        if(count === 0) addressData.is_default = true;

        const { error } = await supabase.from('addresses').insert(addressData);
        if(error) {
            showToast('Erro ao salvar endereço.');
        } else {
            showToast('Endereço adicionado!');
            modalAdd.style.display = 'none';
            loadAddresses();
        }
    });

    if(cepInput) {
        cepInput.addEventListener('input', async (e) => {
            let cep = e.target.value.replace(/\D/g, '');
            e.target.value = cep.replace(/^(\d{5})(\d)/, '$1-$2');
            if(cep.length === 8) {
                try {
                    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
                    if(res.ok) {
                        const data = await res.json();
                        document.getElementById('endereco-rua').value = data.street;
                        document.getElementById('endereco-cidade').value = data.city;
                        document.getElementById('endereco-estado').value = data.state;
                    }
                } catch(err) { console.log(err); }
            }
        });
    }

    loadAddresses();
}

/* ==========================================================
   3. CARTÕES
   ========================================================== */
async function initCardLogic() {
    const listContainer = document.getElementById('cards-list');
    const btnAdd = document.getElementById('add-card-btn');
    const modalAdd = document.getElementById('modal-adicionar-cartao');
    const formAdd = document.getElementById('form-cartao');
    const btnCancel = document.getElementById('btn-cancelar-adicao-cartao');
    
    const brandSelect = document.getElementById('cartao-brand-select');
    const brandTrigger = document.querySelector('.custom-select-trigger');
    const brandOptions = document.querySelector('.custom-select-options');
    const brandInput = document.getElementById('cartao-brand-value');
    const brandText = document.getElementById('cartao-brand-selected-text');

    async function loadCards() {
        const { data } = await supabase.from('cards').select('*').eq('user_id', currentUser.id).order('is_default', { ascending: false });
        renderCards(data || []);
    }

    function renderCards(cards) {
        if(!listContainer) return;
        listContainer.innerHTML = '';
        if(cards.length === 0) {
            listContainer.innerHTML = '<p>Nenhum cartão cadastrado.</p>';
            return;
        }

        cards.forEach(card => {
            const logo = cardLogos[card.brand] || cardLogos.default;
            const el = document.createElement('div');
            el.className = 'cartao-salvo-opcao';
            el.innerHTML = `
                <div class="cartao-salvo-info">
                    <img src="${logo}" alt="${card.brand}">
                    <div>
                        <p><b>${card.label || card.brand}</b></p>
                        <p>Final ${card.last4} • ${card.exp_month}/${card.exp_year}</p>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${card.is_default ? '<div class="padrão"><p>Padrão</p></div>' : `<button class="btn-tornar-padrao" data-id="${card.id}">Tornar Padrão</button>`}
                    <button class="btn-delete-card" data-id="${card.id}"><i class="ri-delete-bin-line"></i></button>
                </div>
            `;
            
            el.querySelector('.btn-delete-card').addEventListener('click', () => deleteCard(card.id));
            const btnDef = el.querySelector('.btn-tornar-padrao');
            if(btnDef) btnDef.addEventListener('click', () => setDefaultCard(card.id));

            listContainer.appendChild(el);
        });
    }

    async function deleteCard(id) {
        if(await showConfirmationModal('Excluir este cartão?')) {
            await supabase.from('cards').delete().eq('id', id);
            loadCards();
            showToast('Cartão removido.');
        }
    }

    async function setDefaultCard(id) {
        await supabase.from('cards').update({ is_default: false }).eq('user_id', currentUser.id);
        await supabase.from('cards').update({ is_default: true }).eq('id', id);
        loadCards();
        showToast('Cartão padrão atualizado.');
    }

    if(btnAdd) btnAdd.addEventListener('click', () => {
        formAdd.reset();
        brandInput.value = '';
        brandText.textContent = 'Selecione a marca';
        modalAdd.style.display = 'flex';
    });

    if(btnCancel) btnCancel.addEventListener('click', () => modalAdd.style.display = 'none');

    if(brandTrigger) brandTrigger.addEventListener('click', () => brandSelect.classList.toggle('open'));
    if(brandOptions) brandOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-option');
        if(option) {
            brandInput.value = option.dataset.value;
            brandText.innerHTML = option.innerHTML;
            brandSelect.classList.remove('open');
        }
    });

    if(formAdd) formAdd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cardData = {
            user_id: currentUser.id,
            brand: brandInput.value,
            last4: document.getElementById('cartao-numero').value.slice(-4),
            exp_month: document.getElementById('cartao-validade').value.split('/')[0],
            exp_year: document.getElementById('cartao-validade').value.split('/')[1],
            label: document.getElementById('cartao-nickname').value || brandInput.value,
            is_default: false
        };

        const { count } = await supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
        if(count === 0) cardData.is_default = true;

        const { error } = await supabase.from('cards').insert(cardData);
        if(error) {
            showToast('Erro ao salvar cartão.');
        } else {
            showToast('Cartão adicionado!');
            modalAdd.style.display = 'none';
            loadCards();
        }
    });

    document.getElementById('cartao-numero')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
    });
    document.getElementById('cartao-validade')?.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
        e.target.value = v;
    });

    loadCards();
}

/* ==========================================================
   4. TELEFONES
   (sem alterações)
   ========================================================== */
// ... (mantive igual)
async function initPhoneLogic() {
    const listContainer = document.getElementById('phones-list');
    const btnAdd = document.getElementById('add-phone-btn');
    const modalAdd = document.getElementById('modal-adicionar-telefone');
    const formAdd = document.getElementById('form-telefone');
    const btnCancel = document.getElementById('btn-cancelar-adicao-telefone');
    const phoneInput = document.getElementById('telefone-input');

    let currentDDI = '+55';
    let currentMask = '(00) 00000-0000';

    async function loadPhones() {
        const { data } = await supabase.from('user_phones').select('*').eq('user_id', currentUser.id).order('is_default', { ascending: false });
        renderPhones(data || []);
    }

    function renderPhones(phones) {
        if(!listContainer) return;
        listContainer.innerHTML = '';
        if(phones.length === 0) {
            listContainer.innerHTML = '<p>Nenhum telefone cadastrado.</p>';
            return;
        }

        phones.forEach(phone => {
            const el = document.createElement('div');
            el.className = 'endereco-item'; 
            el.innerHTML = `
                <div class="info">
                    <b>${phone.phone_number}</b>
                    ${phone.is_default ? '<span class="default-badge">Padrão</span>' : ''}
                </div>
                <div class="actions">
                    ${!phone.is_default ? `<button class="btn-tornar-padrao" data-id="${phone.id}">Tornar Padrão</button>` : ''}
                    <button class="btn-delete-card" data-id="${phone.id}"><i class="ri-delete-bin-line"></i></button>
                </div>
            `;
            
            el.querySelector('.btn-delete-card').addEventListener('click', () => deletePhone(phone.id));
            const btnDef = el.querySelector('.btn-tornar-padrao');
            if(btnDef) btnDef.addEventListener('click', () => setDefaultPhone(phone.id));

            listContainer.appendChild(el);
        });
    }

    async function deletePhone(id) {
        if(await showConfirmationModal('Excluir este número?')) {
            await supabase.from('user_phones').delete().eq('id', id);
            loadPhones();
            showToast('Número removido.');
        }
    }

    async function setDefaultPhone(id) {
        await supabase.from('user_phones').update({ is_default: false }).eq('user_id', currentUser.id);
        await supabase.from('user_phones').update({ is_default: true }).eq('id', id);
        loadPhones();
        showToast('Número padrão atualizado.');
    }

    if(btnAdd) btnAdd.addEventListener('click', () => {
        formAdd.reset();
        currentDDI = '+55';
        currentMask = '(00) 00000-0000';
        document.getElementById('selected-code').textContent = '+55';
        document.getElementById('selected-flag').src = 'https://flagcdn.com/w40/br.png';
        if(phoneInput) phoneInput.placeholder = currentMask;
        
        modalAdd.style.display = 'flex';
    });

    if(btnCancel) btnCancel.addEventListener('click', () => modalAdd.style.display = 'none');

    const countryWrapper = document.getElementById('country-select-wrapper');
    if(countryWrapper) {
        countryWrapper.querySelector('.country-select-trigger').addEventListener('click', () => countryWrapper.classList.toggle('open'));
        countryWrapper.querySelector('.country-options').addEventListener('click', (e) => {
            const opt = e.target.closest('.country-option');
            if(opt) {
                currentDDI = opt.dataset.code;
                currentMask = opt.dataset.mask;
                document.getElementById('selected-code').textContent = currentDDI;
                document.getElementById('selected-flag').src = `https://flagcdn.com/w40/${opt.dataset.flag}.png`;
                phoneInput.value = '';
                phoneInput.placeholder = currentMask;
                countryWrapper.classList.remove('open');
            }
        });
    }

    if(phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if(currentDDI === '+55') {
                if(v.length > 11) v = v.slice(0, 11);
                if(v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
                if(v.length > 10) v = `${v.slice(0,10)}-${v.slice(10)}`;
            }
            e.target.value = v;
        });
    }

    if(formAdd) formAdd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawPhone = phoneInput.value.replace(/\D/g, '');
        const finalNumber = `${currentDDI}${rawPhone}`;

        const { count } = await supabase.from('user_phones').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
        const isDefault = count === 0;

        const { error } = await supabase.from('user_phones').insert({
            user_id: currentUser.id,
            phone_number: finalNumber,
            is_default: isDefault
        });

        if(error) {
            showToast('Erro ao salvar número.');
        } else {
            showToast('Número salvo!');
            modalAdd.style.display = 'none';
            loadPhones();
        }
    });

    loadPhones();
}

/* ==========================================================
   5. PEDIDOS (ATUALIZADO: Fix 404/400, Imagem no Modal com JOIN, e Nome do Cartão)
   ========================================================== */

// --- NOVO ESTADO E HELPER PARA CARTÕES EM PEDIDOS ---
const cardCache = new Map();

/**
 * Busca label e brand do cartão por ID, usando cache.
 * Retorna objeto { label, brand } ou null.
 * @param {string|number} cardId
 */
async function fetchCardDetails(cardId) {
    if (!cardId) return null;
    const key = String(cardId);
    if (cardCache.has(key)) return cardCache.get(key);

    try {
        const { data, error } = await supabase
            .from('cards')
            .select('label, brand')
            .eq('id', cardId)
            .single();

        if (error || !data) {
            console.warn(`Card details not found for ID ${cardId}.`, error);
            cardCache.set(key, null);
            return null;
        }

        const result = { label: data.label || null, brand: data.brand || null };
        cardCache.set(key, result);
        return result;
    } catch (e) {
        console.warn('Erro fetchCardDetails', e);
        cardCache.set(key, null);
        return null;
    }
}

// ----------------------------------------------------

async function initOrdersLogic() {
    // ---------------- CONSTANTES ----------------
    const ORDER_TABLE_CANDIDATES = ['order', 'orders', 'user_orders', 'orders_table', 'purchases', 'customer_orders'];
    const ORDER_ITEMS_CANDIDATES = ['order_items', 'orderitems', 'order_items_table', 'orders_items', 'order_items'];
    const USER_FK_COLS = ['user_id', 'profile_id', 'owner_id', 'uid', 'email'];

    // ---------------- HELPERS ----------------
    function escapeHtml(s) {
        if (s === undefined || s === null) return '';
        return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }
    function formatPriceBR(n) {
        if (n == null || isNaN(Number(n))) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));
    }
    function formatDateTime(v) {
        if (!v) return '';
        try { return new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
        catch (e) { return String(v); }
    }

    // Normaliza / extrai payment_info mesmo se for string
    function parsePaymentInfo(raw) {
        if (!raw) return { method: null, card_id: null, raw: raw };

        // Se já for objeto, tenta extrair diretamente
        if (typeof raw === 'object') {
            const method = (raw.method && String(raw.method).toLowerCase()) || null;
            return { method, card_id: raw.card_id || raw.cardId || raw.card || null, raw };
        }

        // Se for string - tenta JSON.parse
        if (typeof raw === 'string') {
            const s = raw.trim();

            // quick check for 'pix'
            if (/pix/i.test(s)) return { method: 'pix', card_id: null, raw: s };

            try {
                const parsed = JSON.parse(s);
                if (typeof parsed === 'object') {
                    const method = (parsed.method && String(parsed.method).toLowerCase()) || null;
                    return { method, card_id: parsed.card_id || parsed.cardId || parsed.card || null, raw: parsed };
                }
            } catch (e) {
                // não JSON - tenta extrair card_id via regex (ex: "card_id:123" ou '"card_id": "123"')
                const cardMatch = s.match(/card[_-]id\s*[:=]\s*["']?([a-zA-Z0-9-_]+)["']?/i)
                    || s.match(/"card[_-]id"\s*:\s*["']?([a-zA-Z0-9-_]+)["']?/i)
                    || s.match(/cardId\s*[:=]\s*["']?([a-zA-Z0-9-_]+)["']?/i);
                const cardId = cardMatch ? cardMatch[1] : null;

                // tenta detectar método/pix textual
                const method = /pix/i.test(s) ? 'pix' : ( /card|credit|credito/i.test(s) ? 'card' : null );

                return { method, card_id: cardId, raw: s };
            }
        }

        // fallback
        return { method: null, card_id: null, raw };
    }

    // Adaptado para usar o texto final de pagamento (payment_display_text) se existir.
    function formatPaymentInfo(info) {
        if (!info) return 'Não informado';
        
        // Se a lógica principal já calculou o texto final (e o armazenou), usa ele.
        if (typeof info === 'object' && info.payment_display_text) {
             return info.payment_display_text;
        }

        if (typeof info === 'object') {
            return info.method || info.label || info.type || 'Detalhes (JSON)';
        }
        return String(info);
    }

    // NOVO makeOrderCard para aceitar o texto de pagamento já resolvido
    function makeOrderCard(order, resolvedPaymentText) {
        const wrapper = document.createElement('div');
        wrapper.className = 'order-card';
        wrapper.dataset.orderId = order.id;

        const paymentText = resolvedPaymentText; // Usa o texto resolvido

        const header = document.createElement('div');
        header.className = 'order-card-header';
        header.innerHTML = `
            <div class="order-card-title"><strong>Pedido #${escapeHtml(order.id)}</strong></div>
            <div class="order-card-meta">
                <div class="meta-row">
                    <span class="meta-date">${escapeHtml(formatDateTime(order.created_at))}</span> 
                    <span class="meta-total">${escapeHtml(formatPriceBR(order.total))}</span>
                </div>
            </div>
        `;

        const infoList = document.createElement('div');
        infoList.className = 'order-card-info';
        const statusHTML = `<div class="order-card-info-row"><strong>Status:</strong> <span class="order-status-badge">${escapeHtml(order.status || '')}</span></div>`;
        
        // Usa o resolvedPaymentText no .order-payment
        const payHTML = `<div class="order-card-info-row"><strong>Pagamento:</strong> <span class="order-payment">${escapeHtml(paymentText)}</span></div>`;
        
        infoList.innerHTML = statusHTML + payHTML;

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'order-card-items';
        itemsContainer.innerHTML = `<div class="loading">Carregando itens...</div>`;

        const footer = document.createElement('div');
        footer.className = 'order-card-footer';
        const btnView = document.createElement('button');
        btnView.className = 'btn-view-items';
        btnView.type = 'button';
        btnView.textContent = 'Ver itens';
        footer.appendChild(btnView);

        wrapper.appendChild(header);
        wrapper.appendChild(infoList);
        wrapper.appendChild(itemsContainer);
        wrapper.appendChild(footer);

        return { wrapper, itemsContainer, btnView, infoList };
    }

    // NOVO normalizeItems (unchanged)
    function normalizeItems(items) {
        if (!Array.isArray(items)) return [];
        return items.map(item => {
            const normalized = { ...item };
            if (typeof item.product_id === 'object' && item.product_id !== null) {
                normalized.img = item.product_id.img; 
            }
            delete normalized.product_id; 
            return normalized;
        });
    }

    // ---------------- BUSCAS (unchanged) ----------------
    
    async function findOrdersForUser(userId, userEmail) {
        const selectCols = 'id, created_at, total, status, payment_info';
        
        for (const tbl of ORDER_TABLE_CANDIDATES) {
            for (const col of USER_FK_COLS) {
                try {
                    const valueToUse = (col === 'email' && userEmail) ? userEmail : userId;
                    
                    if (!valueToUse) continue; 

                    const q = supabase.from(tbl).select(selectCols).eq(col, valueToUse).order('created_at', { ascending: false });
                    const res = await q;
                    
                    if (res.error) {
                        const status = res.error?.status || res.error?.code;
                        if (status === 404 || (res.error?.message && /not found|no relation/i.test(res.error.message))) {
                            const test = await supabase.from(tbl).select('id').limit(1);
                            if (test.error) break; 
                            continue; 
                        }
                        console.warn(`orders logic: tentativa ${tbl} .${col} -> erro:`, res.error.message || res.error);
                        continue;
                    }

                    if (Array.isArray(res.data)) {
                        console.log(`orders logic: encontrou pedidos na tabela "${tbl}" usando coluna "${col}"`);
                        return { data: res.data, table: tbl, usedCol: col };
                    }
                } catch (e) { 
                    console.warn('orders logic: erro inesperado ao consultar', tbl, col, e);
                }
            }
        }
        return { data: null, table: null, usedCol: null };
    }

    async function fetchItemsForOrder(orderId) {
        const fullSelectWithJoin = 'id, nome, price, color, size, quantity, product_id (img)';
        const minimalSelectWithJoin = 'id, nome, price, quantity, product_id (img)'; 

        for (const tbl of ORDER_ITEMS_CANDIDATES) {
            try {
                let res = await supabase.from(tbl).select(fullSelectWithJoin).eq('order_id', orderId).order('id', { ascending: true });
                
                if (!res.error) return normalizeItems(res.data);

                if (res.error?.status === 400) {
                    console.warn(`orders logic: Tabela de itens "${tbl}" falhou com 400 (Colunas 'color' ou 'size' ausentes?). Tentando colunas mínimas com JOIN...`);
                    res = await supabase.from(tbl).select(minimalSelectWithJoin).eq('order_id', orderId).order('id', { ascending: true });

                    if (!res.error) return normalizeItems(res.data);
                } 
                
                if (res.error?.status === 404 || (res.error?.message && /not found|no relation/i.test(res.error.message))) {
                    continue; 
                } else if (res.error) {
                    console.warn('orders logic: erro ao consultar itens em', tbl, res.error);
                }

            } catch (e) {
                console.warn('orders logic: erro fetchItemsForOrder', e);
            }
        }
        return [];
    }

    // ---------------- UI ----------------

    // Função openOrderModalWithItems ajustada para usar order.payment_display_text
    function openOrderModalWithItems(order, items) {
        const modal = document.getElementById('order-modal');
        const backdrop = document.getElementById('order-modal-backdrop');
        const itemsList = document.getElementById('order-items-list');
        const closeBtn = document.getElementById('order-modal-close');

        if (!modal || !itemsList) {
            console.warn('orders logic: HTML do modal ausente.');
            return;
        }

        const idEl = document.getElementById('order-summary-id');
        const dateEl = document.getElementById('order-summary-date');
        const totalEl = document.getElementById('order-summary-total');
        const statusEl = document.getElementById('order-summary-status');
        const paymentEl = document.getElementById('order-summary-payment');

        // PEGA O TEXTO JÁ RESOLVIDO DURANTE A RENDERIZAÇÃO
        const paymentText = order.payment_display_text || formatPaymentInfo(order.payment_info);

        if (idEl) idEl.textContent = order.id || '';
        if (dateEl) dateEl.textContent = formatDateTime(order.created_at);
        if (totalEl) totalEl.textContent = order.total !== undefined ? formatPriceBR(order.total) : '';
        if (statusEl) statusEl.textContent = order.status || '';
        if (paymentEl) paymentEl.textContent = paymentText; // USANDO paymentText RESOLVIDO

        itemsList.innerHTML = '';
        if (!items || items.length === 0) {
            itemsList.innerHTML = `<div class="empty">Nenhum item neste pedido.</div>`;
        } else {
            items.forEach(it => {
                const itEl = document.createElement('div');
                itEl.className = 'order-item';
                
                const imgUrl = it.img || it.image || 'https://placehold.co/50x50?text=Sem+Foto';
                
                itEl.innerHTML = `
                    <div style="display:flex; gap:10px; width:100%; align-items:center;">
                        <img src="${escapeHtml(imgUrl)}" alt="Produto" style="width:50px; height:50px; object-fit:cover; border-radius:4px; flex-shrink:0;">
                        <div style="flex:1;">
                            <div class="order-item-row" style="margin-bottom:4px;">
                                <div class="oi-name" style="font-weight:600;">${escapeHtml(it.nome || '')}</div>
                                <div class="oi-qty" style="color:#666;">x${escapeHtml(String(it.quantity || 0))}</div>
                            </div>
                            <div class="order-item-row meta" style="font-size:0.85rem; color:#888;">
                                <div class="oi-price">${formatPriceBR(it.price)}</div>
                                <div class="oi-attrs">${escapeHtml(it.color || '')}${it.size ? ' • ' + escapeHtml(it.size) : ''}</div>
                            </div>
                        </div>
                    </div>
                `;
                itemsList.appendChild(itEl);
            });
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        function close() {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.style.overflow = '';
            if (backdrop) backdrop.removeEventListener('click', backdropHandler);
            if (closeBtn) closeBtn.removeEventListener('click', close);
        }
        function backdropHandler(ev) { if (ev.target === backdrop) close(); }

        if (backdrop) backdrop.addEventListener('click', backdropHandler);
        if (closeBtn) closeBtn.addEventListener('click', close);
    }

    // ---------------- EXECUÇÃO ----------------
    
    const container = document.getElementById('orders-list');
    if (!container) return;

    container.innerHTML = `<div class="loading">Buscando pedidos...</div>`;

    const authUid = currentUser.id;
    const authEmail = currentUser.email || null;

    try {
        const found = await findOrdersForUser(authUid, authEmail);
        
        if (!found || !found.data || found.data.length === 0) {
            container.innerHTML = `<div class="empty">Você ainda não fez pedidos.</div>`;
            return;
        }

        container.innerHTML = '';
        for (const ord of found.data) {
            let order = ord;
            
            // --- LÓGICA DE PAGAMENTO: Cartão vs. Outros ---
            let paymentText = formatPaymentInfo(order.payment_info);
            let cardId = null;

            // Parse robusto do payment_info (objeto, JSON-string ou texto)
            const parsed = parsePaymentInfo(order.payment_info);

            // Se método for pix (detectado), mantemos 'PIX' e NÃO buscamos cartão
            if (parsed.method && String(parsed.method).toLowerCase() === 'pix') {
                paymentText = 'PIX';
            } else if (parsed.card_id) {
                cardId = parsed.card_id;
            }

            if (cardId) {
                // Busca detalhes do cartão (label, brand)
                const cardDetails = await fetchCardDetails(cardId);
                if (cardDetails) {
                    // Mostra label se existir, senão a brand
                    paymentText = cardDetails.label || (cardDetails.brand ? String(cardDetails.brand).toUpperCase() : 'Cartão');
                } else {
                    // fallback textual
                    paymentText = 'Cartão';
                }
            }

            // Armazena o texto final no objeto order para uso no modal (openOrderModalWithItems)
            order.payment_display_text = paymentText;
            // ------------------------------------------------

            const { wrapper, itemsContainer, btnView } = makeOrderCard(order, paymentText);
            container.appendChild(wrapper);

            // Busca Itens e preenche preview
            (async () => {
                const items = await fetchItemsForOrder(ord.id);
                itemsContainer.innerHTML = '';
                if (!items || items.length === 0) {
                    itemsContainer.innerHTML = '<div class="empty">Nenhum item neste pedido.</div>';
                } else {
                    const preview = document.createElement('div'); 
                    preview.className = 'order-items-preview';
                    
                    items.slice(0, 3).forEach(it => {
                        const li = document.createElement('div'); 
                        li.className = 'order-item-preview';
                        li.innerHTML = `<span class="oi-name">${escapeHtml(it.nome || '')}</span><span class="oi-qty">x${escapeHtml(String(it.quantity || 0))}</span>`;
                        preview.appendChild(li);
                    });
                    
                    if (items.length > 3) { 
                        const more = document.createElement('div'); 
                        more.className = 'order-items-more'; 
                        more.textContent = `+ ${items.length - 3} outros`; 
                        preview.appendChild(more); 
                    }
                    itemsContainer.appendChild(preview);
                }

                btnView.addEventListener('click', (ev) => { 
                    ev.preventDefault(); 
                    openOrderModalWithItems(ord, items); 
                });
            })();
        }

    } catch (e) {
        console.error('orders logic: erro geral', e);
        container.innerHTML = `<div class="error">Erro ao carregar pedidos.</div>`;
    }
}

/* ==========================================================
   6. LOGOUT
   ========================================================== */
const btnLogout = document.getElementById('logout');

if(btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const confirmar = await showConfirmationModal(
            "Tem certeza que deseja sair da sua conta?",
            { okText: "Sair", cancelText: "Ficar" }
        );

        if (confirmar) {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                window.location.href = "index.html"; 
            } catch (err) {
                console.error("Erro ao sair:", err);
                window.location.href = "index.html";
            }
        }
    });
}
