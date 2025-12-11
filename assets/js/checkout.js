/* assets/js/checkout.js (VERSÃO COM NOVOS MODAIS DE SUCESSO E WHATSAPP) */

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES GERAIS ---
    const enderecoContainer = document.getElementById('endereco-container');
    const freteResultadoContainer = document.getElementById('frete-resultado');
    const productsContainer = document.getElementById('checkout-products');
    const resumoContainer = document.getElementById('resumo-compra');
    const totalFinalEl = document.getElementById('checkout-total');
    const btnFazerPedido = document.getElementById('btn-fazer-pedido');

    // --- SELETORES DO CUPOM ---
    const cupomForm = document.querySelector('.cupom');
    const cupomAplicadoView = document.getElementById('cupom-aplicado');
    const cupomInput = document.getElementById('cupom-input');
    const cupomBtn = document.getElementById('cupom-btn');
    const removerCupomBtn = document.getElementById('trocar-cupom');

    // --- SELETORES MODAIS DE ENDEREÇO ---
    const modalSelecaoEndereco = document.getElementById('modal-selecionar-endereco');
    const listaEnderecosContainer = document.getElementById('lista-enderecos-container');
    const btnAdicionarNovoEndereco = document.getElementById('btn-adicionar-novo-endereco');
    const btnFecharSelecaoEndereco = document.getElementById('btn-fechar-selecao');
    const modalAdicaoEndereco = document.getElementById('modal-adicionar-endereco');
    const formEndereco = document.getElementById('form-endereco');
    const cepInput = document.getElementById('endereco-cep');
    const ruaInput = document.getElementById('endereco-rua');
    const cidadeInput = document.getElementById('endereco-cidade');
    const estadoInput = document.getElementById('endereco-estado');
    const btnCancelarAdicaoEndereco = document.getElementById('btn-cancelar-adicao');

    // --- SELETORES DE PAGAMENTO ---
    const pagamentoOpcoesContainer = document.getElementById('pagamento-opcoes-container');
    const cartaoAccordion = document.getElementById('cartao-accordion');
    const cartaoAccordionHeader = document.getElementById('cartao-accordion-header');
    const cartaoAccordionContent = document.getElementById('cartao-accordion-content');
    const listaCartoesContainer = document.getElementById('lista-cartoes-container');
    const btnAbrirModalCartao = document.getElementById('btn-abrir-modal-cartao');

    // --- SELETORES MODAL CARTÃO ---
    const modalAdicaoCartao = document.getElementById('modal-adicionar-cartao');
    const formCartao = document.getElementById('form-cartao');
    const btnCancelarAdicaoCartao = document.getElementById('btn-cancelar-adicao-cartao');
    const cartaoNumeroInput = document.getElementById('cartao-numero');
    const cartaoValidadeInput = document.getElementById('cartao-validade');
    const cartaoBrandSelect = document.getElementById('cartao-brand-select');
    const cartaoBrandTrigger = document.querySelector('.custom-select-trigger');
    const cartaoBrandOptions = document.querySelector('.custom-select-options');
    const cartaoBrandSelectedText = document.getElementById('cartao-brand-selected-text');
    const cartaoBrandValue = document.getElementById('cartao-brand-value');

    // --- (NOVO) SELETORES MODAIS DE SUCESSO E WHATSAPP ---
    const modalPedidoConfirmado = document.getElementById('modal-pedido-confirmado');
    const viewCartaoConfirmacao = document.getElementById('view-cartao-confirmacao');
    const viewPixConfirmacao = document.getElementById('view-pix-confirmacao');
    const pixCodeInput = document.getElementById('pix-code-input');
    const btnCopiarPix = document.getElementById('btn-copiar-pix');
    const btnFecharConfirmacao = document.getElementById('btn-fechar-confirmacao');
    const btnVoltarInicio = document.getElementById('btn-voltar-inicio');
    const btnEnviarEmail = document.getElementById('btn-enviar-email');

    const modalSelecaoTelefone = document.getElementById('modal-selecionar-telefone');
    const listaTelefonesContainer = document.getElementById('lista-telefones-container');
    const btnAdicionarNovoTelefone = document.getElementById('btn-adicionar-novo-telefone');
    const btnFecharSelecaoTelefone = document.getElementById('btn-fechar-selecao-telefone');
    const btnEnviarWhatsApp = document.getElementById('btn-enviar-whatsapp');

    const modalAdicaoTelefone = document.getElementById('modal-adicionar-telefone');
    const formTelefone = document.getElementById('form-telefone');
    const telefoneInput = document.getElementById('telefone-input');
    const btnCancelarAdicaoTelefone = document.getElementById('btn-cancelar-adicao-telefone');
    const btnSalvarTelefone = document.getElementById('btn-salvar-telefone');

    // --- ADIÇÃO: Elementos do Seletor de País ---
    const countryWrapper = document.getElementById('country-select-wrapper');
    const countryTrigger = countryWrapper ? countryWrapper.querySelector('.country-select-trigger') : null;
    const countryOptions = countryWrapper ? countryWrapper.querySelector('.country-options') : null;
    const selectedFlag = document.getElementById('selected-flag');
    const selectedCode = document.getElementById('selected-code');


    // --- ESTADO DA PÁGINA ---
    let currentUser = null;
    let userAddresses = [];
    let userCards = [];
    let userPhones = []; // NOVO
    let selectedAddress = null;
    let selectedPhone = null; // NOVO
    let currentCartItems = [];
    let subtotal = 0;
    let frete = 0;
    let desconto = 0;
    let g_pedidoConfirmadoId = null; // NOVO: Armazena o ID do pedido criado

    // --- ADIÇÃO: Estado do Telefone ---
    let currentDDI = '+55'; // Padrão Brasil
    let currentMask = '(00) 00000-0000';

    // --- CONSTANTES ---
    const COUPON_KEY = 'topstyle_coupon_v1';
    const cardLogos = {
        'visa': 'https://i.ibb.co/zVNMbqgp/visa.webp',
        'mastercard': 'https://i.ibb.co/nsJz9M59/mastercard.webp',
        'elo': 'https://i.ibb.co/tPzvwVkJ/elo.webp',
        'default': 'https://i.ibb.co/L9Yx1gD/credit-card-logo.png'
    };

    // --- HELPERS ---
    const formatPriceBR = window.formatPriceBR || ((num) => `R$ ${Number(num).toFixed(2).replace('.', ',')}`);
    const showToast = window.showToast || alert;
    const showConfirmationModal = window.showConfirmationModal || confirm;

    // ==========================================================
    // 1. INICIALIZAÇÃO
    // ==========================================================
    async function init() {
        // Não precisa chamar show(), ele já começa visível no HTML

        try {
            const supabase = await initSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Redirecionar ou avisar
                if (document.getElementById('endereco-container'))
                    document.getElementById('endereco-container').innerHTML = '<p>Faça login.</p>';
                window.GlobalLoader.hide(); // Esconde se der erro de sessão
                return;
            }
            currentUser = session.user;

            await Promise.all([
                loadUserAddresses(),
                loadUserCards(),
                loadUserPhones()
            ]);

            const { data: cartData } = await supabase
                .from('user_cart_items')
                .select('*')
                .order('created_at', { ascending: true });

            currentCartItems = cartData || [];

            renderProductsAndSummary();
            updateCouponUI();

        } catch (err) {
            console.error("Erro no init:", err);
        } finally {
            // AQUI: Chama o loader global para sumir
            if (window.GlobalLoader) {
                window.GlobalLoader.hide();
            }
        }
    }

    // --- LÓGICA DE CUPOM ---
    function getAppliedCoupon() {
        return window.CouponManager ? window.CouponManager.getAppliedCoupon() : null;
    }

    async function applyCoupon(couponCode) {
        if (!window.CouponManager) {
            showToast('Sistema de cupons não disponível');
            return;
        }

        const coupon = await window.CouponManager.applyCoupon(couponCode);
        if (coupon) {
            updateCouponUI();
            updateSummary();
            showToast('✅ Cupom aplicado com sucesso!');
        } else {
            showToast('😑 Cupom inválido ou expirado!', { duration: 2500 });
        }
    }

    function removeCoupon() {
        if (window.CouponManager) {
            window.CouponManager.removeCoupon();
            updateCouponUI();
            updateSummary();
        }
    }

    function updateCouponUI() {
        const appliedCoupon = getAppliedCoupon();
        if (appliedCoupon) {
            if (cupomForm) cupomForm.style.display = 'none';
            if (cupomAplicadoView) {
                cupomAplicadoView.style.display = 'flex';
                const badge = cupomAplicadoView.querySelector('.badge-cupom');
                if (badge) {
                    badge.textContent = window.CouponManager.getCouponDisplayText(appliedCoupon);
                    badge.style.border = `2px ${appliedCoupon.style?.borderStyle || 'dashed'} ${appliedCoupon.style?.primaryColor || '#000'}`;
                    badge.style.backgroundColor = appliedCoupon.style?.secondaryColor || '#eee';
                    badge.style.color = appliedCoupon.style?.primaryColor || '#000';
                }
            }
        } else {
            if (cupomForm) cupomForm.style.display = 'flex';
            if (cupomAplicadoView) cupomAplicadoView.style.display = 'none';
            if (cupomInput) cupomInput.value = '';
        }
    }

    // --- LÓGICA DE ENDEREÇO ---
    async function loadUserAddresses() {
        if (!currentUser) return;
        const supabase = await initSupabaseClient();
        const { data, error } = await supabase.from('addresses').select('*').eq('user_id', currentUser.id);
        if (error) { showToast("Erro ao carregar endereços."); return; }
        userAddresses = data || [];
        if (!selectedAddress) { selectedAddress = userAddresses.find(addr => addr.is_default) || userAddresses[0]; }
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
            const addressParts = [selectedAddress.street, selectedAddress.numero, selectedAddress.complemento, selectedAddress.city, selectedAddress.state, selectedAddress.zip];
            const fullAddressString = addressParts.filter(Boolean).join(', ');
            if (enderecoContainer) enderecoContainer.innerHTML = `<div class="pagamento-endereco-bottom"><div class="text-endereco-pagamanto"><p class="name-endereco-pagamento">${userName}</p></div><p class="pagamento-endereco-data">${fullAddressString}</p><div class="pagamento-botao">${selectedAddress.is_default ? '<div class="padrão"><p>Padrão</p></div>' : ''}<button class="trocar-endereco" id="btn-trocar-endereco" type="button">Trocar</button></div></div>`;
            const btnTrocar = document.getElementById('btn-trocar-endereco');
            if (btnTrocar) btnTrocar.addEventListener('click', openAddressSelectorModal);
            calculateShipping(selectedAddress.zip);
        } else {
            if (enderecoContainer) enderecoContainer.innerHTML = `<p>Nenhum endereço cadastrado.</p><button id="btn-primeiro-endereco" class="btn-principal" type="button">Adicionar Endereço</button>`;
            const btnPrimeiro = document.getElementById('btn-primeiro-endereco');
            if (btnPrimeiro) btnPrimeiro.addEventListener('click', () => openAddEditAddressModal());
            if (freteResultadoContainer) freteResultadoContainer.innerHTML = '<p>Adicione um endereço para ver as opções de frete.</p>';
        }
    }
    async function calculateShipping(cep) {
        frete = 0; updateSummary();
        const freteOptions = [{ nome: 'PAC', prazo: 10, valor: 25.50 + Math.random() * 10 }, { nome: 'SEDEX', prazo: 3, valor: 45.80 + Math.random() * 15 }];
        if (freteResultadoContainer) freteResultadoContainer.innerHTML = '';
        freteOptions.forEach((opt, index) => {
            const isChecked = index === 0;
            if (isChecked) frete = opt.valor;
            const optionEl = document.createElement('div');
            optionEl.className = `frete-opcao ${isChecked ? 'selecionado' : ''}`;
            optionEl.innerHTML = `
                <input type="radio" name="frete" id="frete-${opt.nome}" value="${opt.valor}" ${isChecked ? 'checked' : ''}>
                <label for="frete-${opt.nome}">
                    <b>${opt.nome}</b> 
                    <span>${formatPriceBR(opt.valor)} <small>(${opt.prazo} dias)</small></span>
                </label>
            `;
            if (freteResultadoContainer) freteResultadoContainer.appendChild(optionEl);
        });
        updateSummary();
    }
    function openAddressSelectorModal() {
        if (listaEnderecosContainer) listaEnderecosContainer.innerHTML = '';
        userAddresses.forEach(addr => {
            const addrEl = document.createElement('div');
            addrEl.className = `endereco-item ${addr.id === selectedAddress.id ? 'selecionado' : ''}`;
            addrEl.innerHTML = `<div class="info"><b>${addr.label}</b><p>${addr.street}, ${addr.numero} - ${addr.city}</p>${addr.is_default ? '<span class="default-badge">Padrão</span>' : ''}</div><div class="actions"><button class="btn-selecionar" data-id="${addr.id}">Selecionar</button>${!addr.is_default ? `<button class="btn-tornar-padrao" data-id="${addr.id}">Tornar Padrão</button>` : ''}</div>`;
            if (listaEnderecosContainer) listaEnderecosContainer.appendChild(addrEl);
        });
        if (modalSelecaoEndereco) modalSelecaoEndereco.style.display = 'flex';
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
    function openAddEditAddressModal() { if (formEndereco) formEndereco.reset(); if (modalAdicaoEndereco) modalAdicaoEndereco.style.display = 'flex'; }
    if (formEndereco) {
        formEndereco.addEventListener('submit', async (e) => {
            e.preventDefault();
            const supabase = await initSupabaseClient();
            const addressData = { user_id: currentUser.id, label: document.getElementById('endereco-label').value, zip: document.getElementById('endereco-cep').value.replace(/\D/g, ''), street: document.getElementById('endereco-rua').value, city: document.getElementById('endereco-cidade').value, state: document.getElementById('endereco-estado').value, numero: document.getElementById('endereco-numero').value, complemento: document.getElementById('endereco-complemento').value, referencia: document.getElementById('endereco-referencia').value, is_default: userAddresses.length === 0 };
            const { data: newAddress, error } = await supabase.from('addresses').insert(addressData).select().single();
            if (error) { showToast("Erro ao salvar endereço: " + error.message); }
            else {
                showToast("Endereço salvo com sucesso!");
                modalAdicaoEndereco.style.display = 'none';
                userAddresses.push(newAddress);
                selectedAddress = newAddress;
                await renderAddressSection();
                if (userAddresses.length > 1) { await handleSetDefaultAddress(newAddress.id, false); }
            }
        });
    }

    // ==========================================================
    // 3. LÓGICA DE PAGAMENTO (CARTÃO)
    // ==========================================================

    async function loadUserCards() {
        if (!currentUser) return;
        const supabase = await initSupabaseClient();
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('is_default', { ascending: false });

        if (error) {
            showToast("Erro ao carregar cartões.");
            console.error(error);
            userCards = [];
        } else {
            userCards = data || [];
        }
        renderPaymentOptions();
    }
    function renderPaymentOptions() {
        if (!listaCartoesContainer) return;

        if (userCards.length === 0) {
            listaCartoesContainer.innerHTML = '<p>Nenhum cartão cadastrado.</p>';
        } else {
            listaCartoesContainer.innerHTML = '';
            userCards.forEach(card => {
                const logoUrl = cardLogos[card.brand] || cardLogos.default;
                const cardTitle = card.label || (card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Cartão');

                const cardEl = document.createElement('div');
                cardEl.className = 'cartao-salvo-opcao';

                // ALTERAÇÃO AQUI: Removemos "${card.is_default ? 'checked' : ''}" do input abaixo
                // Agora nenhum cartão vem marcado por padrão, forçando o usuário a escolher.
                cardEl.innerHTML = `
                    <input type="radio" name="payment_method" id="card-${card.id}" value="${card.id}">
                    <label for="card-${card.id}">
                        <div class="cartao-salvo-info">
                            <img src="${logoUrl}" alt="${card.brand}">
                            <div>
                                <p><b>${cardTitle}</b></p>
                                <p>Final ${card.last4} &bull; Vence ${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}</p>
                            </div>
                        </div>
                        ${card.is_default ? '<div class="padrão"><p>Padrão</p></div>' : ''}
                    </label>
                    <button type="button" class="btn-delete-card" data-id="${card.id}" title="Excluir cartão">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                `;
                listaCartoesContainer.appendChild(cardEl);

                cardEl.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-delete-card')) return;
                    const radio = cardEl.querySelector('input[type="radio"]');
                    if (radio) radio.checked = true;
                    document.querySelectorAll('.pagamento-opcao, .cartao-salvo-opcao').forEach(el => el.classList.remove('selecionado'));
                    if (cartaoAccordionHeader) cartaoAccordionHeader.classList.add('selecionado');
                    cardEl.classList.add('selecionado');
                });
            });
        }
    }
    function openAddCardModal() {
        if (formCartao) formCartao.reset();
        if (cartaoBrandSelectedText) cartaoBrandSelectedText.innerHTML = 'Selecione a marca';
        if (cartaoBrandValue) cartaoBrandValue.value = '';
        if (cartaoBrandSelect) cartaoBrandSelect.classList.remove('open');
        if (modalAdicaoCartao) modalAdicaoCartao.style.display = 'flex';
    }
    async function handleSaveCard(e) {
        e.preventDefault();
        const supabase = await initSupabaseClient();
        const brand = cartaoBrandValue.value;
        const numero = document.getElementById('cartao-numero').value.replace(/\s/g, '');
        const nomeTitular = document.getElementById('cartao-nome-titular').value.trim();
        const validade = document.getElementById('cartao-validade').value.split('/');
        const cvv = document.getElementById('cartao-cvv').value.trim();
        const nickname = document.getElementById('cartao-nickname').value.trim();

        if (!brand) return showToast('Selecione a marca do cartão.');
        if (numero.length < 13 || numero.length > 19) return showToast('Número do cartão inválido.');
        if (!nomeTitular) return showToast('Digite o nome do titular do cartão.');
        if (validade.length !== 2 || validade[0].length !== 2 || validade[1].length !== 2) return showToast('Data de validade inválida (use MM/AA).');
        if (cvv.length < 3 || cvv.length > 4) return showToast('CVV inválido.');

        const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);
        const cardData = {
            user_id: currentUser.id,
            brand: brand,
            nome_titular: nomeTitular,
            last4: numero.slice(-4),
            exp_month: parseInt(validade[0]),
            exp_year: parseInt(validade[1]),
            is_default: true,
            label: nickname || brandName
        };
        await supabase.from('cards').update({ is_default: false }).eq('user_id', currentUser.id);
        const { data: newCard, error } = await supabase.from('cards').insert(cardData).select().single();

        if (error) {
            console.error(error);
            showToast("Erro ao salvar cartão: " + error.message);
        } else {
            showToast("Cartão salvo com sucesso!");
            if (modalAdicaoCartao) modalAdicaoCartao.style.display = 'none';
            await loadUserCards();
            if (cartaoAccordion) cartaoAccordion.classList.add('open');
            setTimeout(() => {
                const newCardRadio = document.getElementById(`card-${newCard.id}`);
                if (newCardRadio) {
                    newCardRadio.closest('.cartao-salvo-opcao').click();
                }
            }, 100);
        }
    }
    async function handleDeleteCard(cardId) {
        const card = userCards.find(c => c.id == cardId);
        if (!card) return;
        const cardName = card.label || card.brand;
        const confirmed = await showConfirmationModal(
            `Tem certeza que deseja excluir o cartão "${cardName}" (Final ${card.last4})?`,
            { okText: 'Excluir', cancelText: 'Cancelar' }
        );
        if (!confirmed) return;
        const supabase = await initSupabaseClient();
        const { error } = await supabase.from('cards').delete().eq('id', cardId);
        if (error) { showToast('Erro ao excluir cartão: ' + error.message); }
        else { showToast('Cartão excluído com sucesso.'); await loadUserCards(); }
    }

    // ==========================================================
    // 4. (NOVO) LÓGICA DE TELEFONE
    // ==========================================================

    async function loadUserPhones() {
        if (!currentUser) return;
        const supabase = await initSupabaseClient();
        // Ordena pelo padrão e depois pelo mais recente
        const { data, error } = await supabase
            .from('user_phones')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            showToast("Erro ao carregar números de telefone.");
            userPhones = [];
        } else {
            userPhones = data || [];
        }
        // Seleciona o padrão ou o primeiro da lista
        selectedPhone = userPhones.find(p => p.is_default) || userPhones[0] || null;
    }

    function renderPhoneList() {
        if (!listaTelefonesContainer) return;

        if (userPhones.length === 0) {
            listaTelefonesContainer.innerHTML = '<p>Nenhum número cadastrado.</p>';
            btnEnviarWhatsApp.disabled = true; // Desabilita o botão de enviar se não houver números
            return;
        }

        listaTelefonesContainer.innerHTML = '';
        userPhones.forEach(phone => {
            const isSelected = selectedPhone && phone.id === selectedPhone.id;
            const phoneEl = document.createElement('div');
            // Reutilizando classes do modal de endereço
            phoneEl.className = `endereco-item ${isSelected ? 'selecionado' : ''}`;
            phoneEl.dataset.id = phone.id;

            phoneEl.innerHTML = `
                <div class="info">
                    <b>Número: ${phone.phone_number}</b>
                    ${phone.is_default ? '<span class="default-badge">Padrão</span>' : ''}
                </div>
                <div class="actions">
                    ${!phone.is_default ? `<button class="btn-tornar-padrao" data-id="${phone.id}">Tornar Padrão</button>` : ''}
                    <button class="btn-excluir-telefone" data-id="${phone.id}" title="Excluir"><i class="ri-delete-bin-line"></i></button>
                </div>
            `;
            listaTelefonesContainer.appendChild(phoneEl);

            // Adiciona listener para SELECIONAR
            phoneEl.addEventListener('click', (e) => {
                if (e.target.closest('.btn-tornar-padrao, .btn-excluir-telefone')) {
                    return; // Não seleciona se clicar nos botões de ação
                }
                selectedPhone = phone;
                // Atualiza visual
                document.querySelectorAll('#lista-telefones-container .endereco-item').forEach(el => el.classList.remove('selecionado'));
                phoneEl.classList.add('selecionado');
                btnEnviarWhatsApp.disabled = false; // Habilita o botão de enviar
            });
        });

        // Habilita ou desabilita o botão de enviar com base na seleção
        btnEnviarWhatsApp.disabled = !selectedPhone;
    }

    function openPhoneSelectorModal() {
        renderPhoneList(); // Renderiza a lista atual
        if (modalSelecaoTelefone) modalSelecaoTelefone.style.display = 'flex';
    }

    function openAddPhoneModal() {
        if (formTelefone) formTelefone.reset();

        // --- ADIÇÃO: Reseta o estado do input para o padrão BR ao abrir ---
        if (countryWrapper) {
            currentDDI = '+55';
            currentMask = '(00) 00000-0000';
            if (selectedCode) selectedCode.textContent = '+55';
            if (selectedFlag) selectedFlag.src = 'https://flagcdn.com/w40/br.png';
            if (telefoneInput) {
                telefoneInput.value = '';
                telefoneInput.placeholder = '(00) 00000-0000';
            }
            countryWrapper.classList.remove('open');
        }

        if (modalAdicaoTelefone) modalAdicaoTelefone.style.display = 'flex';
    }

    async function handleSetDefaultPhone(phoneId) {
        const confirmed = await showConfirmationModal('Tornar este número o seu padrão?', { okText: 'Sim', cancelText: 'Não' });
        if (!confirmed) return;

        const supabase = await initSupabaseClient();
        // Remove o padrão antigo
        await supabase.from('user_phones').update({ is_default: false }).eq('user_id', currentUser.id);
        // Define o novo padrão
        const { error } = await supabase.from('user_phones').update({ is_default: true }).eq('id', phoneId);

        if (error) {
            showToast("Erro ao definir número padrão.");
        } else {
            showToast("Número padrão atualizado!");
            await loadUserPhones(); // Recarrega
            renderPhoneList(); // Remonta a lista
        }
    }

    async function handleDeletePhone(phoneId) {
        const phone = userPhones.find(p => p.id == phoneId);
        if (!phone) return;

        const confirmed = await showConfirmationModal(`Excluir o número ${phone.phone_number}?`, { okText: 'Excluir', cancelText: 'Cancelar' });
        if (!confirmed) return;

        const supabase = await initSupabaseClient();
        const { error } = await supabase.from('user_phones').delete().eq('id', phoneId);

        if (error) {
            showToast("Erro ao excluir número.");
        } else {
            showToast("Número excluído!");
            await loadUserPhones(); // Recarrega
            if (selectedPhone && selectedPhone.id == phoneId) {
                selectedPhone = null; // Limpa a seleção se o número excluído era o selecionado
            }
            renderPhoneList(); // Remonta a lista
        }
    }

    // --- ADIÇÃO: Lógica do Dropdown de Países e Máscara ---

    // 1. Abrir/Fechar Dropdown
    if (countryTrigger) {
        countryTrigger.addEventListener('click', () => {
            countryWrapper.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (countryWrapper && !countryWrapper.contains(e.target)) {
            countryWrapper.classList.remove('open');
        }
    });

    // 2. Seleção de Opção
    if (countryOptions) {
        countryOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.country-option');
            if (!option) return;

            const code = option.dataset.code;
            const flag = option.dataset.flag;
            const mask = option.dataset.mask;

            // Atualiza UI
            currentDDI = code;
            currentMask = mask;
            selectedCode.textContent = code;
            selectedFlag.src = `https://flagcdn.com/w40/${flag}.png`;

            // Limpa input e foca
            telefoneInput.value = '';
            telefoneInput.placeholder = mask;
            telefoneInput.focus();

            countryWrapper.classList.remove('open');
        });
    }

    // 3. Máscara de Input Dinâmica
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número

            // Lógica Específica para Brasil (+55)
            if (currentDDI === '+55') {
                // Limita a 11 dígitos (DDD + 9 + 8 dígitos)
                if (value.length > 11) value = value.slice(0, 11);

                // Aplica a máscara: (XX) XXXXX-XXXX
                if (value.length > 2) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                }
                if (value.length > 10) {
                    value = `${value.slice(0, 10)}-${value.slice(10)}`;
                }
            }
            // Outras máscaras simples (apenas espaçamento genérico se não for BR)
            else {
                if (value.length > 15) value = value.slice(0, 15);
            }

            e.target.value = value;
        });
    }

    async function handleSavePhone(e) {
        e.preventDefault();

        // --- ADIÇÃO: Validação com base no país ---
        const rawValue = telefoneInput.value.replace(/\D/g, '');

        if (currentDDI === '+55') {
            if (rawValue.length < 11) {
                return showToast('⚠️ O número deve ter o DDD + 9 dígitos (ex: 619...).');
            }
            if (rawValue[2] !== '9') {
                return showToast('⚠️ No Brasil, celulares devem começar com o dígito 9.');
            }
        } else {
            if (rawValue.length < 5) {
                return showToast('⚠️ Número inválido.');
            }
        }

        // Formata para salvar no banco: +5561999999999
        const finalNumber = `${currentDDI}${rawValue}`;

        const supabase = await initSupabaseClient();

        // Seta todos os outros como NÃO padrão
        await supabase.from('user_phones').update({ is_default: false }).eq('user_id', currentUser.id);

        // Insere o novo número como PADRÃO
        const { data: newPhone, error } = await supabase
            .from('user_phones')
            .insert({
                user_id: currentUser.id,
                phone_number: finalNumber,
                is_default: true
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Erro de 'unique_constraint'
                return showToast('Este número já está cadastrado.');
            }
            return showToast("Erro ao salvar número: " + error.message);
        }

        showToast("Número salvo com sucesso!");
        if (modalAdicaoTelefone) modalAdicaoTelefone.style.display = 'none';

        await loadUserPhones(); // Recarrega a lista
        selectedPhone = newPhone; // Já deixa o novo selecionado

        // Se o modal de confirmação estiver aberto (fluxo de compra), reabre a seleção
        if (modalPedidoConfirmado && modalPedidoConfirmado.style.display === 'flex') {
            openPhoneSelectorModal();
        } else {
            // Fluxo normal
            openPhoneSelectorModal();
        }
    }

    // --- RENDERIZAÇÃO E RESUMO ---
    function renderProductsAndSummary() {
        const cart = currentCartItems;
        if (productsContainer) productsContainer.innerHTML = '';
        subtotal = 0;

        if (cart.length === 0) {
            if (productsContainer) productsContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
        }

        cart.forEach(item => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            subtotal += itemTotal;

            // ALTERAÇÃO AQUI: Adicionado Size e Color no HTML
            // Usamos a classe .checkout-product-details criada no CSS
            if (productsContainer) {
                productsContainer.innerHTML += `
                <div class="checkout-product-item">
                    <img src="${item.img || 'https://placehold.co/80x80'}" alt="${item.nome}">
                    <div class="info">
                        <p class="nome"><b>${item.nome}</b></p>
                        <div class="checkout-product-details">
                            <span>Tam: ${item.size || 'U'}</span>
                            <span>Cor: ${item.color || 'Padrão'}</span>
                            <span>Qtd: ${item.quantity}</span>
                        </div>
                    </div>
                    <p class="preco">${formatPriceBR(itemTotal)}</p>
                </div>`;
            }
        });

        updateSummary();
    }

    function updateSummary() {
        const appliedCoupon = getAppliedCoupon();
        let desconto = 0;
        let freteComDesconto = frete;
        let shippingDiscount = 0;
        let productDiscount = 0;

        if (appliedCoupon && window.CouponManager) {
            const result = window.CouponManager.calculateDiscount(appliedCoupon, subtotal, frete);
            desconto = result.discount;
            freteComDesconto = result.shipping;
            shippingDiscount = result.shippingDiscount;
            productDiscount = result.productDiscount;
        }

        const total = subtotal + freteComDesconto;
        let resumoHTML = `<div class="resumo-linha"><span>Subtotal</span><span>${formatPriceBR(subtotal)}</span></div>`;

        // Sempre mostrar o frete original
        resumoHTML += `<div class="resumo-linha"><span>Frete</span><span>${formatPriceBR(frete)}</span></div>`;

        // Se houver desconto no frete (frete grátis ou desconto percentual)
        if (shippingDiscount > 0) {
            let textoDesconto = 'Economia no frete';
            if (appliedCoupon) {
                textoDesconto += ` (${appliedCoupon.code})`;
            }
            resumoHTML += `<div class="resumo-linha desconto"><span>${textoDesconto}</span><span>-${formatPriceBR(shippingDiscount)}</span></div>`;
        }

        // Se houver desconto no produto
        if (productDiscount > 0) {
            let textoDesconto = 'Desconto';
            if (appliedCoupon) {
                textoDesconto += ` (${appliedCoupon.code})`;
            }
            resumoHTML += `<div class="resumo-linha desconto"><span>${textoDesconto}</span><span>-${formatPriceBR(productDiscount)}</span></div>`;
        }

        if (resumoContainer) resumoContainer.innerHTML = resumoHTML;
        if (totalFinalEl) totalFinalEl.textContent = `Total: ${formatPriceBR(total)}`;
    }

    // ==========================================================
    // 6. EVENT LISTENERS (Antigos e Novos)
    // ==========================================================

    // --- Listeners Antigos (Cupons, Endereços, Cartões) ---
    if (cupomBtn) { cupomBtn.addEventListener('click', () => { const code = cupomInput.value.trim(); if (code) applyCoupon(code); }); }
    if (cupomInput) { cupomInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); if (cupomBtn) cupomBtn.click(); } }); }
    if (removerCupomBtn) { removerCupomBtn.addEventListener('click', async (e) => { e.preventDefault(); const confirmed = await showConfirmationModal('Deseja remover o cupom?', { okText: 'Sim', cancelText: 'Não' }); if (confirmed) removeCoupon(); }); }
    if (freteResultadoContainer) {
        freteResultadoContainer.addEventListener('click', (e) => { const card = e.target.closest('.frete-opcao'); if (card) { const radio = card.querySelector('input[type="radio"]'); if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); } } });
        freteResultadoContainer.addEventListener('change', e => { if (e.target.name === 'frete') { frete = parseFloat(e.target.value); document.querySelectorAll('.frete-opcao').forEach(el => el.classList.remove('selecionado')); e.target.closest('.frete-opcao').classList.add('selecionado'); updateSummary(); } });
    }
    if (listaEnderecosContainer) {
        listaEnderecosContainer.addEventListener('click', e => {
            const target = e.target;
            const actionButton = target.closest('.btn-selecionar, .btn-tornar-padrao');
            if (!actionButton) return;
            const id = actionButton.dataset.id;
            if (!id) return;
            if (actionButton.classList.contains('btn-selecionar')) {
                selectedAddress = userAddresses.find(addr => addr.id == id);
                renderAddressSection();
                if (modalSelecaoEndereco) modalSelecaoEndereco.style.display = 'none';
            }
            if (actionButton.classList.contains('btn-tornar-padrao')) {
                handleSetDefaultAddress(id);
            }
        });
    }
    if (cepInput) {
        cepInput.addEventListener('input', async (e) => {
            let cep = e.target.value.replace(/\D/g, '');
            e.target.value = cep.replace(/^(\d{5})(\d)/, '$1-$2');
            if (cep.length === 8) {
                try {
                    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    if (ruaInput) ruaInput.value = data.street;
                    if (cidadeInput) cidadeInput.value = data.city;
                    if (estadoInput) estadoInput.value = data.state;
                } catch { showToast("CEP não encontrado."); }
            }
        });
    }
    if (btnFecharSelecaoEndereco) btnFecharSelecaoEndereco.addEventListener('click', () => modalSelecaoEndereco.style.display = 'none');
    if (btnAdicionarNovoEndereco) btnAdicionarNovoEndereco.addEventListener('click', () => { modalSelecaoEndereco.style.display = 'none'; openAddEditAddressModal(); });
    if (btnCancelarAdicaoEndereco) btnCancelarAdicaoEndereco.addEventListener('click', () => modalAdicaoEndereco.style.display = 'none');
    if (cartaoAccordionHeader) {
        cartaoAccordionHeader.addEventListener('click', (e) => {
            e.preventDefault();
            if (!cartaoAccordion) return;
            cartaoAccordion.classList.toggle('open');
            if (cartaoAccordion.classList.contains('open')) {
                const defaultCardRadio = listaCartoesContainer.querySelector('input[type="radio"]:checked');
                const firstCardRadio = listaCartoesContainer.querySelector('input[type="radio"]');
                const targetRadio = defaultCardRadio || firstCardRadio;
                if (targetRadio) {
                    targetRadio.closest('.cartao-salvo-opcao').click();
                } else {
                    const groupRadio = document.getElementById('payment-card-group');
                    if (groupRadio) groupRadio.checked = true;
                    document.querySelectorAll('.pagamento-opcao').forEach(el => el.classList.remove('selecionado'));
                    cartaoAccordionHeader.classList.add('selecionado');
                }
            }
        });
    }
    const pixOption = document.querySelector('.pagamento-opcao[data-method="pix"]');
    if (pixOption) {
        pixOption.addEventListener('click', () => {
            const radio = pixOption.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            if (cartaoAccordion) cartaoAccordion.classList.remove('open');
            document.querySelectorAll('.pagamento-opcao, .cartao-salvo-opcao').forEach(el => el.classList.remove('selecionado'));
            pixOption.classList.add('selecionado');
        });
    }
    if (listaCartoesContainer) {
        listaCartoesContainer.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.btn-delete-card');
            if (deleteButton) { e.stopPropagation(); const cardId = deleteButton.dataset.id; handleDeleteCard(cardId); }
        });
    }
    if (btnAbrirModalCartao) { btnAbrirModalCartao.addEventListener('click', openAddCardModal); }
    if (formCartao) { formCartao.addEventListener('submit', handleSaveCard); }
    if (btnCancelarAdicaoCartao) { btnCancelarAdicaoCartao.addEventListener('click', () => { if (modalAdicaoCartao) modalAdicaoCartao.style.display = 'none'; }); }
    if (cartaoNumeroInput) { cartaoNumeroInput.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '); }); }
    if (cartaoValidadeInput) { cartaoValidadeInput.addEventListener('input', (e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 2) { v = v.substring(0, 2) + '/' + v.substring(2, 4); } e.target.value = v; }); }
    if (cartaoBrandTrigger) { cartaoBrandTrigger.addEventListener('click', () => { if (cartaoBrandSelect) cartaoBrandSelect.classList.toggle('open'); }); }
    if (cartaoBrandOptions) {
        cartaoBrandOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-option');
            if (!option) return;
            const value = option.dataset.value;
            const content = option.innerHTML;
            if (cartaoBrandSelectedText) cartaoBrandSelectedText.innerHTML = content;
            if (cartaoBrandValue) cartaoBrandValue.value = value;
            if (cartaoBrandSelect) cartaoBrandSelect.classList.remove('open');
        });
    }
    document.addEventListener('click', (e) => { if (cartaoBrandSelect && !cartaoBrandSelect.contains(e.target)) { cartaoBrandSelect.classList.remove('open'); } });

    // --- (NOVO) Listeners para Modais de Sucesso e Telefone ---

    // Modal 1: Confirmação de Pedido
    function closeAndRedirect(type) {
        if (modalPedidoConfirmado) modalPedidoConfirmado.style.display = 'none';

        // Define qual mensagem mostrar na próxima página
        if (type === 'email') {
            sessionStorage.setItem('toastMessage', 'Compra concluída, você recebeu um email com mais informações.');
        } else {
            sessionStorage.setItem('toastMessage', 'Sua compra foi concluída com sucesso!');
        }

        window.location.href = 'inicial.html';
    }
    if (btnFecharConfirmacao) btnFecharConfirmacao.addEventListener('click', () => closeAndRedirect('default'));
    if (btnVoltarInicio) btnVoltarInicio.addEventListener('click', () => closeAndRedirect('default'));

    if (btnCopiarPix) {
        btnCopiarPix.addEventListener('click', () => {
            if (pixCodeInput) {
                navigator.clipboard.writeText(pixCodeInput.value).then(() => {
                    const copyText = document.getElementById('copy-text');
                    if (copyText) copyText.textContent = 'Copiado!';
                    btnCopiarPix.style.background = '#00bfa5';
                    setTimeout(() => {
                        if (copyText) copyText.textContent = 'Copiar';
                        btnCopiarPix.style.background = '';
                    }, 2000);
                }).catch(err => {
                    showToast("Falha ao copiar: " + err);
                });
            }
        });
    }

    if (btnEnviarEmail) {
        btnEnviarEmail.addEventListener('click', async () => {
            // Verifica se tem ID do pedido
            if (!g_pedidoConfirmadoId) {
                return showToast("Erro: ID do pedido não encontrado.");
            }

            // Pega o e-mail do usuário logado
            const userEmail = currentUser ? currentUser.email : '';
            if (!userEmail) {
                return showToast("Erro: E-mail do usuário não encontrado.");
            }

            // Muda texto do botão para feedback visual
            const originalText = btnEnviarEmail.innerHTML;
            btnEnviarEmail.innerHTML = 'Enviando... <i class="ri-loader-4-line ri-spin"></i>';
            btnEnviarEmail.disabled = true;

            try {
                const supabase = await initSupabaseClient();

                // Busca dados do pedido
                const { data: order } = await supabase.from('orders').select('*').eq('id', g_pedidoConfirmadoId).single();
                const { data: items } = await supabase.from('order_items').select('*').eq('order_id', g_pedidoConfirmadoId);

                // Formata lista de itens para o template HTML do email
                const itemsListHtml = items.map(i =>
                    `- ${i.nome} (Tam: ${i.size || 'U'}, Cor: ${i.color || 'Padrão'}) x${i.quantity} - R$ ${i.price}`
                ).join('\n');

                // Parâmetros que devem ser iguais aos configurados no EmailJS
                const templateParams = {
                    to_name: currentUser.user_metadata?.full_name || "Cliente",
                    to_email: userEmail, // Email para onde vai
                    order_id: order.id,
                    total_value: formatPriceBR(order.total),
                    items_list: itemsListHtml
                };

                // ENVIA O EMAIL (Substitua pelos seus IDs)
                await emailjs.send("SEU_SERVICE_ID", "SEU_TEMPLATE_ID", templateParams);

                // Redireciona com mensagem de Email
                closeAndRedirect('email');

            } catch (error) {
                console.error("Erro email:", error);
                showToast("Erro ao enviar e-mail. Tente novamente.");

                // Restaura botão em caso de erro
                btnEnviarEmail.innerHTML = originalText;
                btnEnviarEmail.disabled = false;
            }
        });
    }

    // Modal 2: Seleção de Telefone
    if (listaTelefonesContainer) {
        listaTelefonesContainer.addEventListener('click', (e) => {
            const target = e.target;
            const phoneId = target.closest('[data-id]')?.dataset.id;
            if (!phoneId) return;

            if (target.closest('.btn-tornar-padrao')) {
                e.stopPropagation();
                handleSetDefaultPhone(phoneId);
            }
            if (target.closest('.btn-excluir-telefone')) {
                e.stopPropagation();
                handleDeletePhone(phoneId);
            }
        });
    }

    if (btnFecharSelecaoTelefone) {
        btnFecharSelecaoTelefone.addEventListener('click', () => {
            if (modalSelecaoTelefone) modalSelecaoTelefone.style.display = 'none';
        });
    }
    if (btnAdicionarNovoTelefone) {
        btnAdicionarNovoTelefone.addEventListener('click', () => {
            if (modalSelecaoTelefone) modalSelecaoTelefone.style.display = 'none';
            openAddPhoneModal();
        });
    }

    if (btnEnviarWhatsApp) {
        btnEnviarWhatsApp.addEventListener('click', async () => {
            if (!selectedPhone || !selectedPhone.phone_number) {
                return showToast("Nenhum número selecionado.");
            }
            if (!g_pedidoConfirmadoId) {
                return showToast("Erro: ID do pedido não encontrado.");
            }

            const phone = selectedPhone.phone_number;
            const supabase = await initSupabaseClient();

            // Busca os dados do pedido para montar a mensagem
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', g_pedidoConfirmadoId)
                .single();

            const { data: items, error: itemsError } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', g_pedidoConfirmadoId);

            if (orderError || itemsError) {
                return showToast("Erro ao buscar detalhes do pedido.");
            }

            // Monta a mensagem
            const texto = encodeURIComponent(
                `🛍️ *Detalhes do Pedido - TopStyle*\n\n` +
                `Pedido nº ${order.id}\n` +
                `Status: ${order.status}\n\n` +
                `Itens:\n${items.map(i => `- ${i.nome} (x${i.quantity})`).join('\n')}\n\n` +
                `Total: ${formatPriceBR(order.total)}\n\n` +
                `Obrigado por comprar na TopStyle! ❤️`
            );

            const linkZap = `https://api.whatsapp.com/send?phone=${phone}&text=${texto}`;
            window.open(linkZap, '_blank');

            // Fecha tudo e redireciona
            if (modalSelecaoTelefone) modalSelecaoTelefone.style.display = 'none';
            closeAndRedirect();
        });
    }

    // Modal 3: Adição de Telefone
    if (formTelefone) {
        formTelefone.addEventListener('submit', handleSavePhone);
    }
    if (btnCancelarAdicaoTelefone) {
        btnCancelarAdicaoTelefone.addEventListener('click', () => {
            if (modalAdicaoTelefone) modalAdicaoTelefone.style.display = 'none';
            // Se o usuário cancelou a adição e tinha números, reabre a seleção
            if (userPhones.length > 0) {
                if (modalSelecaoTelefone) modalSelecaoTelefone.style.display = 'flex';
            }
        });
    }

    // ==========================================================
    // 7. FAZER PEDIDO (LÓGICA PRINCIPAL ATUALIZADA)
    // ==========================================================
    if (btnFazerPedido) {
        btnFazerPedido.addEventListener('click', async () => {

            const selectedPaymentRadio = document.querySelector('input[name="payment_method"]:checked');

            if (!selectedPaymentRadio) {
                return showToast('⚠️ Por favor, selecione uma forma de pagamento.', { duration: 3000 });
            }

            // 'paymentValue' armazena 'pix' ou o ID do cartão
            let paymentValue = selectedPaymentRadio.value;
            let paymentType = 'card'; // Padrão

            if (paymentValue === 'pix') {
                paymentType = 'pix';
            } else if (paymentValue === 'card_group') {
                if (userCards.length > 0) {
                    return showToast('⚠️ Por favor, selecione um cartão específico.');
                } else {
                    return showToast('⚠️ Por favor, adicione um cartão de crédito.');
                }
            } else {
                paymentValue = `card_id:${paymentValue}`; // Formato 'card_id:123'
            }

            const supabase = await initSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return showToast('⚠️ Faça login para continuar.');

            const user = session.user;
            const cart = currentCartItems;

            if (cart.length === 0) return showToast('🛒 Seu carrinho está vazio!');
            if (!selectedAddress) return showToast('📦 Selecione um endereço para entrega.');

            btnFazerPedido.disabled = true;
            btnFazerPedido.textContent = 'Processando...';

            const appliedCoupon = getAppliedCoupon();
            const result = appliedCoupon ? window.CouponManager.calculateDiscount(appliedCoupon, subtotal, frete) : { discount: 0, shipping: frete, total: subtotal + frete };
            const totalPedido = result.total;

            const { data: pedido, error: pedidoError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user.id,
                    total: totalPedido,
                    discount: result.discount,
                    status: 'PENDENTE',
                    payment_info: paymentValue
                }])
                .select()
                .single();

            if (pedidoError) {
                console.error(pedidoError);
                btnFazerPedido.disabled = false;
                btnFazerPedido.textContent = 'FAZER PEDIDO';
                return showToast('❌ Erro ao criar o pedido.');
            }

            // Salva o ID do pedido para o modal do WhatsApp
            g_pedidoConfirmadoId = pedido.id;

            const itens = cart.map(item => ({
                order_id: pedido.id,
                product_id: item.product_id,
                nome: item.nome,
                price: item.price,
                size: item.size,
                color: item.color,
                quantity: item.quantity
            }));
            await supabase.from('order_items').insert(itens);

            // ====== (NOVO) LIMPA O CARRINHO E ABRE O MODAL ======

            // Limpa o carrinho no banco
            const { error: deleteError } = await supabase
                .from('user_cart_items')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) {
                console.error("Falha ao limpar o carrinho após o pedido:", deleteError);
            }

            // Limpa o cupom local
            if (window.CouponManager) {
                window.CouponManager.removeCoupon();
            }
            // Atualiza o ícone do carrinho no header (via main.js)
            if (window.updateCartCountUI) window.updateCartCountUI();

            // Abre o modal de confirmação correto
            if (paymentType === 'pix') {
                if (viewPixConfirmacao) viewPixConfirmacao.style.display = 'flex';
                if (viewCartaoConfirmacao) viewCartaoConfirmacao.style.display = 'none';
                // (Opcional) Gerar um código pix real aqui
                // pixCodeInput.value = "gerarPixRealAqui()";
            } else {
                if (viewPixConfirmacao) viewPixConfirmacao.style.display = 'none';
                if (viewCartaoConfirmacao) viewCartaoConfirmacao.style.display = 'flex';
            }

            if (modalPedidoConfirmado) modalPedidoConfirmado.style.display = 'flex';

            // Não redireciona mais, apenas reativa o botão caso o usuário feche o modal
            btnFazerPedido.disabled = false;
            btnFazerPedido.textContent = 'FAZER PEDIDO';
        });
    }

    // Adicione listener para atualizações de cupom
    document.addEventListener('coupon-updated', () => {
        updateCouponUI();
        updateSummary();
    });

    // --- INICIALIZAÇÃO ---
    init();
});