/* assets/js/carrinho.js */

document.addEventListener('DOMContentLoaded', async () => {
    // --- SELETORES DO DOM ---
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');

    // Seletores de Visualização
    const emptyCartView = document.querySelector('.carrinho-vazio');
    const cartContentView = document.querySelector('.carrinho-content');

    // Seletores do Cupom e Botões
    const cupomForm = document.querySelector('.cupom');
    const cupomAplicadoView = document.getElementById('cupom-aplicado');
    const cupomInput = document.getElementById('cupom-input');
    const cupomBtn = document.getElementById('cupom-btn');
    const removerCupomBtn = document.getElementById('trocar-cupom');
    const continuarBtn = document.getElementById('continuar-btn');

    // --- CONSTANTES & SUPABASE ---
    const supabase = await window.initSupabaseClient();
    let currentCartItems = [];

    // --- FUNÇÕES AUXILIARES ---
    function getAppliedCoupon() {
        return window.CouponManager ? window.CouponManager.getAppliedCoupon() : null;
    }

    function formatPriceBR(num) {
        if (typeof num !== 'number') num = 0;
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    }

    // --- LÓGICA DO CARRINHO ---
    async function fetchCart() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            currentCartItems = [];
            renderCart();
            updateCartCountUI(0);
            return;
        }

        // Busca itens do carrinho
        const { data, error } = await supabase
            .from('user_cart_items')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar carrinho:', error);
            if (window.showToast) window.showToast('Erro ao carregar carrinho.');
        } else {
            currentCartItems = data || [];
        }

        renderCart();

        // Atualiza contador global
        const totalCount = currentCartItems.reduce((acc, item) => acc + item.quantity, 0);
        updateCartCountUI(totalCount);
    }

    function updateCartCountUI(count) {
        const el = document.querySelector('#cart-count');
        if (!el) return;
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    }

    // --- RENDERIZAÇÃO ---
    function renderCart() {
        // 1. Estado Vazio
        if (currentCartItems.length === 0) {
            if (emptyCartView) {
                emptyCartView.style.display = 'flex';
                const hiddenElements = emptyCartView.querySelectorAll('.hidden');
                hiddenElements.forEach(el => el.classList.add('show'));
            }
            if (cartContentView) cartContentView.style.display = 'none';
            return;
        }

        // 2. Estado com Produtos
        if (emptyCartView) emptyCartView.style.display = 'none';
        if (cartContentView) cartContentView.style.display = 'flex';

        if (!cartItemsContainer || !cartTotalEl) return;

        cartItemsContainer.innerHTML = '';
        let subtotal = 0;

        currentCartItems.forEach((item) => {
            const itemTotal = (Number(item.price) || 0) * (item.quantity || 1);
            subtotal += itemTotal;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';

            cartItem.innerHTML = `
            <div class="cart-item-left">
                <img src="${item.img || 'https://placehold.co/150x200'}" alt="${item.nome}">
            </div>
            <div class="cart-item-info">
                <p class="cart-item-name"><b>${item.nome}</b></p>
                <p>Cor: ${item.color || 'N/A'}</p>
                <p>Tamanho: ${item.size || 'N/A'}</p>
                <p>${formatPriceBR(Number(item.price))}</p>
                
                <div class="quantity-controls">
                    <button type="button" class="quantity-decrease" onclick="updateItemQty('${item.id}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" class="quantity-increase" onclick="updateItemQty('${item.id}', ${item.quantity + 1})">+</button>
                </div>

                <button type="button" class="remove" onclick="deleteCartItem('${item.id}', '${item.nome}')">Remover</button>
            </div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });

        // Cálculo do Total
        const appliedCoupon = getAppliedCoupon();
        let total = subtotal;

        if (appliedCoupon) {
            if (cupomForm) cupomForm.style.display = 'none';
            if (cupomAplicadoView) {
                cupomAplicadoView.style.display = 'flex';
                const badge = cupomAplicadoView.querySelector('.badge-cupom');
                if (badge) {
                    badge.textContent = window.CouponManager.getCouponDisplayText(appliedCoupon) || 'CUPOM';
                    badge.style.border = `2px ${appliedCoupon.style?.borderStyle || 'dashed'} ${appliedCoupon.style?.primaryColor || '#000'}`;
                    badge.style.backgroundColor = appliedCoupon.style?.secondaryColor || '#eee';
                    badge.style.color = appliedCoupon.style?.primaryColor || '#000';
                    
                    badge.title = "Clique para remover o cupom";
                    badge.onclick = async () => {
                        const confirmed = await window.showConfirmationModal('Deseja remover este cupom?', { okText: 'Sim', cancelText: 'Manter' });
                        if (confirmed) { window.CouponManager.removeCoupon(); renderCart(); }
                    };
                }
            }
            if (removerCupomBtn) {
                removerCupomBtn.onclick = async (e) => {
                    e.preventDefault();
                    const confirmed = await window.showConfirmationModal('Deseja remover o cupom?', { okText: 'Sim', cancelText: 'Não' });
                    if (confirmed) { window.CouponManager.removeCoupon(); renderCart(); }
                };
            }
            const result = window.CouponManager.calculateDiscount(appliedCoupon, subtotal, 0);
            total = result.total;
        } else {
            if (cupomForm) cupomForm.style.display = 'flex';
            if (cupomAplicadoView) cupomAplicadoView.style.display = 'none';
            if (cupomInput) cupomInput.value = '';
        }

        cartTotalEl.textContent = formatPriceBR(total);
    }

    // --- AÇÕES DO USUÁRIO ---
    window.updateItemQty = async (itemId, newQty) => {
        if (newQty < 1) {
            const item = currentCartItems.find(i => i.id == itemId);
            if (item) deleteCartItem(itemId, item.nome);
            return;
        }
        const safeQty = Math.max(1, parseInt(newQty));
        
        // Opcional: Verificar estoque aqui também para UX imediata, 
        // mas a verificação crítica é no checkout.
        
        const { error } = await supabase
            .from('user_cart_items')
            .update({ quantity: safeQty })
            .eq('id', itemId);

        if (error) {
            if (window.showToast) window.showToast('Erro ao atualizar quantidade.');
        } else {
            fetchCart();
        }
    };

    window.deleteCartItem = async (itemId, nomeItem) => {
        const confirmed = await window.showConfirmationModal(
            `Tem certeza que deseja remover "${nomeItem}" do carrinho?`,
            { okText: 'Remover', cancelText: 'Cancelar' }
        );
        if (!confirmed) return;

        const { error } = await supabase.from('user_cart_items').delete().eq('id', itemId);
        if (error) {
            if (window.showToast) window.showToast('Erro ao remover item.');
        } else {
            if (window.showToast) window.showToast('Item removido.');
            fetchCart();
        }
    };

    // --- VALIDAÇÃO CRÍTICA DE ESTOQUE ---
    async function checkStockAndAdjust() {
        const affectedItems = []; // Lista de itens que sofreram alteração

        // 1. Coleta IDs dos produtos no carrinho
        const productIds = currentCartItems.map(item => item.product_id);
        if (productIds.length === 0) return [];

        // 2. Busca o estoque ATUAL na tabela de produtos
        const { data: productsDB, error } = await supabase
            .from('products')
            .select('id, stock, nome')
            .in('id', productIds);

        if (error || !productsDB) {
            console.error("Erro ao validar estoque:", error);
            throw new Error("Falha na conexão ao verificar estoque.");
        }

        // Cria um mapa para acesso rápido: { 'prod_id': { stock: 10, nome: '...' } }
        const stockMap = {};
        productsDB.forEach(p => stockMap[p.id] = p);

        // 3. Itera sobre o carrinho e compara
        for (const cartItem of currentCartItems) {
            const productReal = stockMap[cartItem.product_id];
            
            // Se o produto foi excluído do banco ou não existe
            if (!productReal) {
                await supabase.from('user_cart_items').delete().eq('id', cartItem.id);
                affectedItems.push({ nome: cartItem.nome, reason: 'Produto indisponível' });
                continue;
            }

            const realStock = productReal.stock;
            const requestedQty = cartItem.quantity;

            // CENÁRIO A: Estoque zerado ou negativo
            if (realStock <= 0) {
                await supabase.from('user_cart_items').delete().eq('id', cartItem.id);
                affectedItems.push({ nome: cartItem.nome, reason: 'Esgotado' });
            } 
            // CENÁRIO B: Estoque insuficiente para a quantidade pedida (Ex: Pediu 5, tem 2)
            else if (requestedQty > realStock) {
                await supabase
                    .from('user_cart_items')
                    .update({ quantity: realStock })
                    .eq('id', cartItem.id);
                
                affectedItems.push({ 
                    nome: cartItem.nome, 
                    reason: `Quantidade reduzida de ${requestedQty} para ${realStock} (Estoque máximo)` 
                });
            }
        }

        return affectedItems;
    }

    // --- MODAL DE AVISO DE ESTOQUE ---
    function showStockModal(items) {
        // Remove modal anterior se existir
        const oldModal = document.getElementById('stock-warning-modal');
        if(oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'stock-warning-modal';
        modal.className = 'confirm-overlay visible'; // Reusa estilo do confirm-overlay
        
        let itemsHtml = items.map(i => 
            `<li style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom:4px;">
                <strong>${i.nome}</strong><br>
                <span style="font-size: 0.9em; color: #dc3545;">${i.reason}</span>
            </li>`
        ).join('');

        modal.innerHTML = `
            <div class="confirm-box" style="text-align: left; max-width: 400px;">
                <h3 style="margin-bottom: 15px; color: #000;">⚠️ Atualização de Estoque</h3>
                <p style="margin-bottom: 15px; font-size: 0.95rem;">Alguns itens do seu carrinho não estão mais disponíveis na quantidade desejada:</p>
                <ul style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto; margin-bottom: 20px;">
                    ${itemsHtml}
                </ul>
                <div class="confirm-buttons">
                    <button class="confirm-button-ok" style="width: 100%;">Entendi, revisar carrinho</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const btnOk = modal.querySelector('.confirm-button-ok');
        btnOk.onclick = () => {
            modal.remove();
            fetchCart(); // Recarrega o carrinho atualizado visualmente
        };
    }

    // --- LISTENERS ---
    if (continuarBtn) {
        continuarBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Impede navegação imediata

            if (currentCartItems.length === 0) {
                if (window.showToast) window.showToast('Seu carrinho está vazio.');
                return;
            }

            const originalText = continuarBtn.textContent;
            continuarBtn.textContent = 'Verificando estoque...';
            continuarBtn.disabled = true;
            continuarBtn.style.opacity = '0.7';

            try {
                // VERIFICA ESTOQUE AGORA
                const changedItems = await checkStockAndAdjust();

                if (changedItems.length > 0) {
                    // SE HOUVE MUDANÇA (ACABOU ESTOQUE)
                    if (window.showToast) window.showToast('⚠️ Estoque atualizado.', { duration: 3000 });
                    showStockModal(changedItems);
                } else {
                    // TUDO CERTO, SEGUE O JOGO
                    window.location.href = 'pagamento.html';
                }

            } catch (err) {
                console.error(err);
                if (window.showToast) window.showToast('Erro ao validar estoque.');
            } finally {
                continuarBtn.textContent = originalText;
                continuarBtn.disabled = false;
                continuarBtn.style.opacity = '1';
            }
        });
    }

    if (cupomBtn) {
        cupomBtn.addEventListener('click', async () => {
            const code = cupomInput.value.trim().toUpperCase();
            if (code) {
                const coupon = await window.CouponManager.applyCoupon(code);
                if (coupon) {
                    if (window.showToast) window.showToast('✅ Cupom aplicado!');
                    renderCart();
                } else {
                    if (window.showToast) window.showToast('😑 Cupom inválido!', { duration: 2500 });
                }
            }
        });
    }

    if (cupomInput) {
        cupomInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); cupomBtn.click(); }
        });
    }

    document.addEventListener('coupon-updated', renderCart);

    // Inicializa
    fetchCart();
});
