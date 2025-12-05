// assets/js/profile.js
// Lógica completa de perfil com novos modais reutilizados do checkout
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;

// Helpers
const showToast = window.showToast || alert;
const showConfirmationModal = window.showConfirmationModal || confirm;
const cardLogos = {
    'visa': 'https://i.ibb.co/zVNMbqgp/visa.webp',
    'mastercard': 'https://i.ibb.co/nsJz9M59/mastercard.webp',
    'elo': 'https://i.ibb.co/tPzvwVkJ/elo.webp',
    'default': 'https://i.ibb.co/L9Yx1gD/credit-card-logo.png'
};

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = session.user;

    // Inicializa abas
    initProfileData();
    initAddressLogic();
    initCardLogic();
    initPhoneLogic();
    initOrdersLogic();
});

/* ==========================================================
   1. DADOS PESSOAIS (Lógica existente mantida e adaptada)
   ========================================================== */
async function initProfileData() {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    
    // Elementos de exibição
    const displayEls = {
        username: document.getElementById('username'),
        email: document.getElementById('email'),
        cpf: document.getElementById('cpf'),
        born: document.getElementById('born_Date')
    };
    
    // Inputs de edição
    const inputEls = {
        username: document.getElementById('username-input'),
        email: document.getElementById('email-input'),
        cpf: document.getElementById('cpf-input'),
        born: document.getElementById('born_Date-input')
    };

    // Preencher dados
    const email = currentUser.email;
    const username = profile?.username || currentUser.user_metadata?.full_name || '—';
    const cpf = profile?.cpf || '—';
    const born = profile?.born_date || '';

    // Renderiza Texto
    if(displayEls.username) displayEls.username.textContent = username;
    if(displayEls.email) displayEls.email.textContent = email;
    if(displayEls.cpf) displayEls.cpf.textContent = cpf;
    if(displayEls.born) displayEls.born.textContent = born ? formatDate(born) : '—';

    // Preenche Inputs
    if(inputEls.username) inputEls.username.value = username !== '—' ? username : '';
    if(inputEls.email) inputEls.email.value = email;
    if(inputEls.cpf) inputEls.cpf.value = cpf !== '—' ? cpf : '';
    if(inputEls.born) inputEls.born.value = born;

    // Botão Editar
    const btnEdit = document.getElementById('edit-profile-btn');
    const form = document.getElementById('profile-form');
    let isEditing = false;

    if(btnEdit) {
        btnEdit.addEventListener('click', async () => {
            if(!isEditing) {
                // Entrar modo edição
                form.classList.add('editing');
                btnEdit.textContent = 'Salvar';
                isEditing = true;
            } else {
                // Salvar
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
                    // Atualiza textos
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
   2. ENDEREÇOS (Reaproveitando Modais do Checkout)
   ========================================================== */
async function initAddressLogic() {
    const listContainer = document.getElementById('addresses-list');
    const btnAdd = document.getElementById('add-address-btn');
    const modalAdd = document.getElementById('modal-adicionar-endereco');
    const formAdd = document.getElementById('form-endereco');
    const btnCancel = document.getElementById('btn-cancelar-adicao');
    const cepInput = document.getElementById('endereco-cep');

    // Carregar Endereços
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
            
            // Eventos do Card
            el.querySelector('.btn-delete-card').addEventListener('click', () => deleteAddress(addr.id));
            const btnDefault = el.querySelector('.btn-tornar-padrao');
            if(btnDefault) btnDefault.addEventListener('click', () => setDefaultAddress(addr.id));

            listContainer.appendChild(el);
        });
    }

    // Ações
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

    // Modal Events
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
            is_default: false // Lógica simples para novo endereço
        };

        // Se for o primeiro, vira padrão
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

    // CEP Automático
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
   3. CARTÕES (Reaproveitando Modais do Checkout)
   ========================================================== */
async function initCardLogic() {
    const listContainer = document.getElementById('cards-list');
    const btnAdd = document.getElementById('add-card-btn');
    const modalAdd = document.getElementById('modal-adicionar-cartao');
    const formAdd = document.getElementById('form-cartao');
    const btnCancel = document.getElementById('btn-cancelar-adicao-cartao');
    
    // Select Customizado de Marca
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

    // Eventos Modal
    if(btnAdd) btnAdd.addEventListener('click', () => {
        formAdd.reset();
        brandInput.value = '';
        brandText.textContent = 'Selecione a marca';
        modalAdd.style.display = 'flex';
    });

    if(btnCancel) btnCancel.addEventListener('click', () => modalAdd.style.display = 'none');

    // Lógica do Select Customizado
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

    // Formatação input cartão
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
   4. TELEFONES (Nova Lógica com Modal de País)
   ========================================================== */
async function initPhoneLogic() {
    const listContainer = document.getElementById('phones-list');
    const btnAdd = document.getElementById('add-phone-btn');
    const modalAdd = document.getElementById('modal-adicionar-telefone');
    const formAdd = document.getElementById('form-telefone');
    const btnCancel = document.getElementById('btn-cancelar-adicao-telefone');
    const phoneInput = document.getElementById('telefone-input');

    // Variáveis de estado do input
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
            el.className = 'endereco-item'; // Reutilizando estilo de item
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

    // Modal Events
    if(btnAdd) btnAdd.addEventListener('click', () => {
        formAdd.reset();
        // Reset visual do select de país
        currentDDI = '+55';
        currentMask = '(00) 00000-0000';
        document.getElementById('selected-code').textContent = '+55';
        document.getElementById('selected-flag').src = 'https://flagcdn.com/w40/br.png';
        if(phoneInput) phoneInput.placeholder = currentMask;
        
        modalAdd.style.display = 'flex';
    });

    if(btnCancel) btnCancel.addEventListener('click', () => modalAdd.style.display = 'none');

    // Lógica Select País
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

    // Máscara Input
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

        // Checar primeiro cadastro
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
   5. PEDIDOS (Simples Listagem)
   ========================================================== */
async function initOrdersLogic() {
    const listContainer = document.getElementById('orders-list');
    
    async function loadOrders() {
        const { data } = await supabase.from('orders').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        if(!data || data.length === 0) {
            listContainer.innerHTML = '<p>Você ainda não fez nenhum pedido.</p>';
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(order => {
            const el = document.createElement('div');
            el.className = 'endereco-item';
            const date = new Date(order.created_at).toLocaleDateString('pt-BR');
            const total = parseFloat(order.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            el.innerHTML = `
                <div class="info">
                    <b>Pedido #${order.id.toString().slice(0,8)}...</b>
                    <p>Data: ${date} • Status: <strong>${order.status}</strong></p>
                    <p>Total: ${total}</p>
                </div>
            `;
            listContainer.appendChild(el);
        });
    }

    loadOrders();
}