/* assets/js/checkout.js (LÓGICA DE CUPOM RESTAURADA) */

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES GERAIS ---
    const enderecoContainer = document.getElementById('endereco-container');
    const freteResultadoContainer = document.getElementById('frete-resultado');
    const productsContainer = document.getElementById('checkout-products');
    const resumoContainer = document.getElementById('resumo-compra');
    const totalFinalEl = document.getElementById('checkout-total');

    // --- SELETORES DO CUPOM (RESTAURADOS) ---
    const cupomForm = document.querySelector('.cupom');
    const cupomAplicadoView = document.getElementById('cupom-aplicado');
    const cupomInput = document.getElementById('cupom-input');
    const cupomBtn = document.getElementById('cupom-btn');
    const removerCupomBtn = document.getElementById('trocar-cupom');

    // --- SELETORES MODAIS DE ENDEREÇO ---
    const modalSelecao = document.getElementById('modal-selecionar-endereco');
    const listaEnderecosContainer = document.getElementById('lista-enderecos-container');
    const btnAdicionarNovo = document.getElementById('btn-adicionar-novo-endereco');
    const btnFecharSelecao = document.getElementById('btn-fechar-selecao');
    const modalAdicao = document.getElementById('modal-adicionar-endereco');
    const formEndereco = document.getElementById('form-endereco');
    // ... outros seletores de endereço

    // --- ESTADO DA PÁGINA ---
    let currentUser = null;
    let userAddresses = [];
    let selectedAddress = null;
    let subtotal = 0;
    let frete = 0;
    let desconto = 0;

    // --- CONSTANTES (INCLUINDO CUPOM) ---
    const COUPON_KEY = 'topstyle_coupon_v1';
    const VALID_COUPONS = { 'TOPSTYLE': 0.10 }; // 10% de desconto

    // --- HELPERS ---
    const formatPriceBR = window.formatPriceBR || ((num) => `R$ ${Number(num).toFixed(2).replace('.', ',')}`);
    const showToast = window.showToast || alert;
    const showConfirmationModal = window.showConfirmationModal || confirm;

    // ==========================================================
    // 1. INICIALIZAÇÃO
    // ==========================================================
    async function init() {
        const supabase = await initSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            enderecoContainer.innerHTML = '<p>Você precisa <a href="inicial.html">fazer login</a> para continuar.</p>';
            return;
        }
        currentUser = session.user;
        await loadUserAddresses();
        renderProductsAndSummary();
        updateCouponUI(); // <-- Adicionado para carregar o estado do cupom
    }

    // ==========================================================
    // 2. LÓGICA DE CUPOM (RESTAURADA)
    // ==========================================================
    function getAppliedCoupon() {
        return localStorage.getItem(COUPON_KEY);
    }

    function applyCoupon(couponCode) {
        if (VALID_COUPONS[couponCode.toUpperCase()]) {
            localStorage.setItem(COUPON_KEY, couponCode.toUpperCase());
            updateCouponUI();
            updateSummary();
            showToast('✅ Cupom aplicado com sucesso!');
        } else {
            showToast('😑 Insira um cupom válido!', { duration: 2500 });
        }
    }

    function removeCoupon() {
        localStorage.removeItem(COUPON_KEY);
        updateCouponUI();
        updateSummary();
    }

    function updateCouponUI() {
        const appliedCoupon = getAppliedCoupon();
        if (appliedCoupon) {
            if (cupomForm) cupomForm.style.display = 'none';
            if (cupomAplicadoView) cupomAplicadoView.style.display = 'flex';
        } else {
            if (cupomForm) cupomForm.style.display = 'flex';
            if (cupomAplicadoView) cupomAplicadoView.style.display = 'none';
            if (cupomInput) cupomInput.value = '';
        }
    }

    // ==========================================================
    // 3. LÓGICA DE ENDEREÇO (Mantida como estava)
    // ==========================================================
    async function loadUserAddresses() { /* ...código mantido... */ }
    async function renderAddressSection() { /* ...código mantido... */ }
    async function calculateShipping(cep) { /* ...código mantido... */ }
    function openAddressSelectorModal() { /* ...código mantido... */ }
    async function handleSetDefaultAddress(id, reopen) { /* ...código mantido... */ }
    function openAddEditAddressModal() { /* ...código mantido... */ }
    // ... outras funções de endereço ...

    // ==========================================================
    // 4. RENDERIZAÇÃO E RESUMO (ATUALIZADO PARA INCLUIR DESCONTO)
    // ==========================================================
    function renderProductsAndSummary() {
        const cart = JSON.parse(localStorage.getItem('topstyle_cart_v1')) || [];
        productsContainer.innerHTML = '';
        subtotal = 0;

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            productsContainer.innerHTML += `...`; // Mantido
        });
        updateSummary();
    }

    function updateSummary() {
        // Recalcula o desconto
        const appliedCoupon = getAppliedCoupon();
        desconto = 0;
        if (appliedCoupon && VALID_COUPONS[appliedCoupon]) {
            desconto = subtotal * VALID_COUPONS[appliedCoupon];
        }

        const total = subtotal + frete - desconto;

        let resumoHTML = `
            <div class="resumo-linha">
                <span>Subtotal</span>
                <span>${formatPriceBR(subtotal)}</span>
            </div>
            <div class="resumo-linha">
                <span>Frete</span>
                <span>${formatPriceBR(frete)}</span>
            </div>
        `;

        if (desconto > 0) {
            resumoHTML += `
                <div class="resumo-linha desconto">
                    <span>Desconto (${appliedCoupon})</span>
                    <span>-${formatPriceBR(desconto)}</span>
                </div>
            `;
        }

        resumoContainer.innerHTML = resumoHTML;
        totalFinalEl.textContent = `Total: ${formatPriceBR(total)}`;
    }

    // ==========================================================
    // 5. EVENT LISTENERS (INCLUINDO CUPOM)
    // ==========================================================
    if (cupomBtn) {
        cupomBtn.addEventListener('click', () => {
            const code = cupomInput.value.trim();
            if (code) applyCoupon(code);
        });
    }

    if (removerCupomBtn) {
        removerCupomBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = await showConfirmationModal(
                'Deseja remover o cupom de desconto?',
                { okText: 'Sim', cancelText: 'Não' }
            );
            if (confirmed) removeCoupon();
        });
    }

    // ... outros event listeners de endereço e frete ...

    // --- INICIALIZAÇÃO ---
    init();

    // OBS: O código das funções de endereço foi omitido acima por brevidade, 
    // mas ele está presente no bloco de código completo abaixo para você copiar.
});


/* ================================================================== */
/* COPIE E COLE O CÓDIGO COMPLETO ABAIXO NO SEU JS            */
/* ================================================================== */

/* assets/js/checkout.js (VERSÃO COMPLETA E CORRIGIDA) */

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES GERAIS ---
    const enderecoContainer = document.getElementById('endereco-container');
    const freteResultadoContainer = document.getElementById('frete-resultado');
    const productsContainer = document.getElementById('checkout-products');
    const resumoContainer = document.getElementById('resumo-compra');
    const totalFinalEl = document.getElementById('checkout-total');

    // --- SELETORES DO CUPOM ---
    const cupomForm = document.querySelector('.cupom');
    const cupomAplicadoView = document.getElementById('cupom-aplicado');
    const cupomInput = document.getElementById('cupom-input');
    const cupomBtn = document.getElementById('cupom-btn');
    const removerCupomBtn = document.getElementById('trocar-cupom');

    // --- SELETORES MODAIS DE ENDEREÇO ---
    const modalSelecao = document.getElementById('modal-selecionar-endereco');
    const listaEnderecosContainer = document.getElementById('lista-enderecos-container');
    const btnAdicionarNovo = document.getElementById('btn-adicionar-novo-endereco');
    const btnFecharSelecao = document.getElementById('btn-fechar-selecao');
    const modalAdicao = document.getElementById('modal-adicionar-endereco');
    const formEndereco = document.getElementById('form-endereco');
    const cepInput = document.getElementById('endereco-cep');
    const ruaInput = document.getElementById('endereco-rua');
    const cidadeInput = document.getElementById('endereco-cidade');
    const estadoInput = document.getElementById('endereco-estado');
    const btnCancelarAdicao = document.getElementById('btn-cancelar-adicao');

    // --- ESTADO DA PÁGINA ---
    let currentUser = null;
    let userAddresses = [];
    let selectedAddress = null;
    let subtotal = 0;
    let frete = 0;
    let desconto = 0;

    // --- CONSTANTES ---
    const COUPON_KEY = 'topstyle_coupon_v1';
    const VALID_COUPONS = { 'TOPSTYLE': 0.10 };

    // --- HELPERS ---
    const formatPriceBR = window.formatPriceBR || ((num) => `R$ ${Number(num).toFixed(2).replace('.', ',')}`);
    const showToast = window.showToast || alert;
    const showConfirmationModal = window.showConfirmationModal || confirm;

    async function init() {
        const supabase = await initSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            enderecoContainer.innerHTML = '<p>Você precisa <a href="inicial.html">fazer login</a> para continuar.</p>';
            return;
        }
        currentUser = session.user;
        await loadUserAddresses();
        renderProductsAndSummary();
        updateCouponUI();
    }

    // --- LÓGICA DE CUPOM ---
    function getAppliedCoupon() { return localStorage.getItem(COUPON_KEY); }
    function applyCoupon(couponCode) {
        if (VALID_COUPONS[couponCode.toUpperCase()]) {
            localStorage.setItem(COUPON_KEY, couponCode.toUpperCase());
            updateCouponUI();
            updateSummary();
            showToast('✅ Cupom aplicado com sucesso!');
        } else {
            showToast('😑 Insira um cupom válido!', { duration: 2500 });
        }
    }
    function removeCoupon() {
        localStorage.removeItem(COUPON_KEY);
        updateCouponUI();
        updateSummary();
    }
    function updateCouponUI() {
        const appliedCoupon = getAppliedCoupon();
        if (appliedCoupon) {
            if (cupomForm) cupomForm.style.display = 'none';
            if (cupomAplicadoView) cupomAplicadoView.style.display = 'flex';
        } else {
            if (cupomForm) cupomForm.style.display = 'flex';
            if (cupomAplicadoView) cupomAplicadoView.style.display = 'none';
            if (cupomInput) cupomInput.value = '';
        }
    }

    // --- LÓGICA DE ENDEREÇO ---
    async function loadUserAddresses() {
        const supabase = await initSupabaseClient();
        const { data, error } = await supabase.from('addresses').select('*').eq('user_id', currentUser.id);
        if (error) { showToast("Erro ao carregar endereços."); return; }
        userAddresses = data;
        if (!selectedAddress) { selectedAddress = data.find(addr => addr.is_default) || data[0]; }
        await renderAddressSection();
    }
    async function renderAddressSection() {
        if (selectedAddress) {
            let userName = currentUser.user_metadata?.full_name;
            if (!userName) {
                const supabase = await initSupabaseClient();
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', currentUser.id).single();
                userName = profile?.full_name || 'Cliente';
            }
            const addressParts = [selectedAddress.street, selectedAddress.numero, selectedAddress.complemento, selectedAddress.cidade, selectedAddress.state, selectedAddress.zip];
            const fullAddressString = addressParts.filter(Boolean).join(', ');
            enderecoContainer.innerHTML = `<div class="pagamento-endereco-bottom"><div class="text-endereco-pagamanto"><p class="name-endereco-pagamento">${userName}</p></div><p class="pagamento-endereco-data">${fullAddressString}</p><div class="pagamento-botao">${selectedAddress.is_default ? '<div class="padrão"><p>Padrão</p></div>' : ''}<button class="trocar-endereco" id="btn-trocar-endereco" type="button">Trocar</button></div></div>`;
            document.getElementById('btn-trocar-endereco').addEventListener('click', openAddressSelectorModal);
            calculateShipping(selectedAddress.zip);
        } else {
            enderecoContainer.innerHTML = `<p>Nenhum endereço cadastrado.</p><button id="btn-primeiro-endereco" class="btn-principal" type="button">Adicionar Endereço</button>`;
            document.getElementById('btn-primeiro-endereco').addEventListener('click', () => openAddEditAddressModal());
            freteResultadoContainer.innerHTML = '<p>Adicione um endereço para ver as opções de frete.</p>';
        }
    }
    async function calculateShipping(cep) {
        frete = 0; updateSummary();
        const freteOptions = [{ nome: 'PAC', prazo: 10, valor: 25.50 + Math.random() * 10 }, { nome: 'SEDEX', prazo: 3, valor: 45.80 + Math.random() * 15 }];
        freteResultadoContainer.innerHTML = '';
        freteOptions.forEach((opt, index) => {
            const isChecked = index === 0;
            if (isChecked) frete = opt.valor;
            const optionEl = document.createElement('div');
            optionEl.className = 'frete-opcao';
            optionEl.innerHTML = `<input type="radio" name="frete" id="frete-${opt.nome.toLowerCase()}" value="${opt.valor}" ${isChecked ? 'checked' : ''}><label for="frete-${opt.nome.toLowerCase()}"><b>${opt.nome}</b> - ${formatPriceBR(opt.valor)} (aprox. ${opt.prazo} dias úteis)</label>`;
            freteResultadoContainer.appendChild(optionEl);
        });
        updateSummary();
    }
    function openAddressSelectorModal() {
        listaEnderecosContainer.innerHTML = '';
        userAddresses.forEach(addr => {
            const addrEl = document.createElement('div');
            addrEl.className = `endereco-item ${addr.id === selectedAddress.id ? 'selecionado' : ''}`;
            addrEl.innerHTML = `<div class="info"><b>${addr.label}</b><p>${addr.street}, ${addr.numero} - ${addr.cidade}</p>${addr.is_default ? '<span class="default-badge">Padrão</span>' : ''}</div><div class="actions"><button class="btn-selecionar" data-id="${addr.id}">Selecionar</button>${!addr.is_default ? `<button class="btn-tornar-padrao" data-id="${addr.id}">Tornar Padrão</button>` : ''}</div>`;
            listaEnderecosContainer.appendChild(addrEl);
        });
        modalSelecao.style.display = 'flex';
    }
    async function handleSetDefaultAddress(newDefaultId, reopenSelector = true) {
        const confirmed = await showConfirmationModal('Deseja tornar este endereço o seu padrão?', { okText: 'Sim', cancelText: 'Não' });
        if (!confirmed) return;
        const supabase = await initSupabaseClient();
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', currentUser.id);
        const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', newDefaultId);
        if (error) showToast("Erro ao definir endereço padrão.");
        else { showToast("Endereço padrão atualizado!"); await loadUserAddresses(); if (reopenSelector) openAddressSelectorModal(); }
    }
    function openAddEditAddressModal() { formEndereco.reset(); modalAdicao.style.display = 'flex'; }
    formEndereco.addEventListener('submit', async (e) => {
        e.preventDefault();
        const supabase = await initSupabaseClient();
        const addressData = { user_id: currentUser.id, label: document.getElementById('endereco-label').value, zip: document.getElementById('endereco-cep').value.replace(/\D/g, ''), street: document.getElementById('endereco-rua').value, cidade: document.getElementById('endereco-cidade').value, state: document.getElementById('endereco-estado').value, numero: document.getElementById('endereco-numero').value, complemento: document.getElementById('endereco-complemento').value, referencia: document.getElementById('endereco-referencia').value, is_default: userAddresses.length === 0 };
        const { data: newAddress, error } = await supabase.from('addresses').insert(addressData).select().single();
        if (error) { showToast("Erro ao salvar endereço: " + error.message); }
        else {
            showToast("Endereço salvo com sucesso!");
            modalAdicao.style.display = 'none';
            userAddresses.push(newAddress);
            selectedAddress = newAddress;
            await renderAddressSection();
            if (userAddresses.length > 1) { await handleSetDefaultAddress(newAddress.id, false); }
        }
    });

    // --- RENDERIZAÇÃO E RESUMO ---
    function renderProductsAndSummary() {
        const cart = JSON.parse(localStorage.getItem('topstyle_cart_v1')) || [];
        productsContainer.innerHTML = '';
        subtotal = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            productsContainer.innerHTML += `<div class="checkout-product-item"><img src="${item.img}" alt="${item.nome}"><div class="info"><p><b>${item.nome} (x${item.quantity})</b></p></div><p>${formatPriceBR(itemTotal)}</p></div>`;
        });
        updateSummary();
    }
    function updateSummary() {
        const appliedCoupon = getAppliedCoupon();
        desconto = 0;
        if (appliedCoupon && VALID_COUPONS[appliedCoupon]) { desconto = subtotal * VALID_COUPONS[appliedCoupon]; }
        const total = subtotal + frete - desconto;
        let resumoHTML = `<div class="resumo-linha"><span>Subtotal</span><span>${formatPriceBR(subtotal)}</span></div><div class="resumo-linha"><span>Frete</span><span>${formatPriceBR(frete)}</span></div>`;
        if (desconto > 0) { resumoHTML += `<div class="resumo-linha desconto"><span>Desconto (${appliedCoupon})</span><span>-${formatPriceBR(desconto)}</span></div>`; }
        resumoContainer.innerHTML = resumoHTML;
        totalFinalEl.textContent = `Total: ${formatPriceBR(total)}`;
    }

    // --- EVENT LISTENERS ---
    if (cupomBtn) { cupomBtn.addEventListener('click', () => { const code = cupomInput.value.trim(); if (code) applyCoupon(code); }); }
    if (removerCupomBtn) { removerCupomBtn.addEventListener('click', async (e) => { e.preventDefault(); const confirmed = await showConfirmationModal('Deseja remover o cupom?', { okText: 'Sim', cancelText: 'Não' }); if (confirmed) removeCoupon(); }); }
    freteResultadoContainer.addEventListener('change', e => { if (e.target.name === 'frete') { frete = parseFloat(e.target.value); updateSummary(); } });
    listaEnderecosContainer.addEventListener('click', e => { const id = e.target.dataset.id; if (!id) return; if (e.target.classList.contains('btn-selecionar')) { selectedAddress = userAddresses.find(addr => addr.id == id); renderAddressSection(); modalSelecao.style.display = 'none'; } if (e.target.classList.contains('btn-tornar-padrao')) { handleSetDefaultAddress(id); } });
    cepInput.addEventListener('input', async (e) => { let cep = e.target.value.replace(/\D/g, ''); e.target.value = cep.replace(/^(\d{5})(\d)/, '$1-$2'); if (cep.length === 8) { try { const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`); if (!res.ok) throw new Error(); const data = await res.json(); ruaInput.value = data.street; cidadeInput.value = data.city; estadoInput.value = data.state; } catch { showToast("CEP não encontrado."); } } });
    btnFecharSelecao.addEventListener('click', () => modalSelecao.style.display = 'none');
    btnAdicionarNovo.addEventListener('click', () => { modalSelecao.style.display = 'none'; openAddEditAddressModal(); });
    btnCancelarAdicao.addEventListener('click', () => modalAdicao.style.display = 'none');

    init();

    // ==========================================================
    // 6. FAZER PEDIDO + FLUXO WHATSAPP PROFISSIONAL
    // ==========================================================
    const btnFazerPedido = document.getElementById('btn-fazer-pedido');

    if (btnFazerPedido) {
        btnFazerPedido.addEventListener('click', async () => {
            const supabase = await initSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return showToast('⚠️ Faça login para continuar.');

            const user = session.user;
            const cart = JSON.parse(localStorage.getItem('topstyle_cart_v1')) || [];
            if (cart.length === 0) return showToast('🛒 Seu carrinho está vazio!');
            if (!selectedAddress) return showToast('📦 Selecione um endereço para entrega.');

            // ====== CRIA PEDIDO ======
            const appliedCoupon = localStorage.getItem('topstyle_coupon_v1');
            const desconto = appliedCoupon && VALID_COUPONS[appliedCoupon] ? subtotal * VALID_COUPONS[appliedCoupon] : 0;
            const totalPedido = subtotal + frete - desconto;

            const { data: pedido, error: pedidoError } = await supabase
                .from('orders')
                .insert([{ user_id: user.id, total: totalPedido, discount: desconto, status: 'draft' }])
                .select()
                .single();

            if (pedidoError) {
                console.error(pedidoError);
                return showToast('❌ Erro ao criar o pedido.');
            }

            const itens = cart.map(item => ({
                order_id: pedido.id,
                product_id: item.productId,
                nome: item.nome,
                price: item.price,
                size: item.size,
                color: item.color,
                quantity: item.quantity
            }));
            await supabase.from('order_items').insert(itens);

            // ====== MODAL WHATSAPP ======
            const prefKey = `topstyle_whatsapp_pref_${user.id}`;
            const pref = localStorage.getItem(prefKey);

            let enviarZap = false;
            if (pref === 'always') enviarZap = true;
            else if (pref !== 'never') {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
        <div class="modal-content">
          <h2>Receber confirmação no WhatsApp</h2>
          <p>Deseja receber a mensagem do seu pedido via WhatsApp?</p>
          <label style="display:flex;align-items:center;gap:6px;margin-top:10px;">
            <input type="checkbox" id="zap-nao-perguntar"> Não perguntar novamente
          </label>
          <div class="modal-actions">
            <button id="btn-nao" class="btn-cancelar">Não</button>
            <button id="btn-sim" class="btn-principal">Sim</button>
          </div>
        </div>
      `;
                document.body.appendChild(modal);
                modal.style.display = 'flex';

                const closeModal = () => modal.remove();

                await new Promise(resolve => {
                    modal.querySelector('#btn-nao').onclick = () => {
                        if (modal.querySelector('#zap-nao-perguntar').checked) localStorage.setItem(prefKey, 'never');
                        closeModal();
                        resolve(false);
                    };
                    modal.querySelector('#btn-sim').onclick = () => {
                        if (modal.querySelector('#zap-nao-perguntar').checked) localStorage.setItem(prefKey, 'always');
                        closeModal();
                        resolve(true);
                    };
                }).then(res => enviarZap = res);
            }

            // ====== MODAL NÚMEROS ======
            if (enviarZap) {
                const { data: existingPhones } = await supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle();
                let phone = existingPhones?.phone || '';

                const phoneModal = document.createElement('div');
                phoneModal.className = 'modal';
                phoneModal.innerHTML = `
        <div class="modal-content">
          <h2>Selecione ou adicione um número</h2>
          <div class="form-group">
            <label>Telefone (WhatsApp):</label>
            <input type="tel" id="zap-input" placeholder="Ex: 5599999999999" value="${phone || ''}">
          </div>
          <div class="modal-actions">
            <button id="btn-cancelar-zap" class="btn-cancelar">Cancelar</button>
            <button id="btn-salvar-zap" class="btn-principal">Salvar e Enviar</button>
          </div>
        </div>
      `;
                document.body.appendChild(phoneModal);
                phoneModal.style.display = 'flex';

                await new Promise(resolve => {
                    phoneModal.querySelector('#btn-cancelar-zap').onclick = () => { phoneModal.remove(); resolve(false); };
                    phoneModal.querySelector('#btn-salvar-zap').onclick = async () => {
                        const novo = phoneModal.querySelector('#zap-input').value.trim();
                        if (!/^[0-9]{10,13}$/.test(novo)) {
                            showToast('📱 Número inválido.');
                            return;
                        }
                        phone = novo;
                        await supabase.from('profiles').update({ phone }).eq('id', user.id);
                        phoneModal.remove();
                        resolve(true);
                    };
                });

                if (phone) {
                    // Mensagem formatada
                    const texto = encodeURIComponent(
                        `🛍️ *Confirmação de Pedido - TopStyle*\n\n` +
                        `Pedido nº ${pedido.id}\n` +
                        `Itens:\n${cart.map(i => `- ${i.nome} (${i.size}/${i.color}) x${i.quantity}`).join('\n')}\n\n` +
                        `Endereço: ${selectedAddress.street}, ${selectedAddress.numero} - ${selectedAddress.city}/${selectedAddress.state}\n` +
                        `Total: R$ ${totalPedido.toFixed(2).replace('.', ',')}\n\n` +
                        `Obrigado por comprar na TopStyle! ❤️`
                    );

                    // Número oficial de envio
                    const numeroLoja = '5561993505178'; // <--- substitua pelo número de envio oficial

                    const linkZap = `https://api.whatsapp.com/send?phone=${phone}&text=${texto}`;
                    window.open(linkZap, '_blank');
                }
            }

            // ====== FINALIZA ======
            localStorage.removeItem('topstyle_cart_v1');
            localStorage.removeItem('topstyle_coupon_v1');
            showToast('✅ Pedido realizado com sucesso!');
            setTimeout(() => (window.location.href = 'inicial.html'), 2500);
        });
    }
});