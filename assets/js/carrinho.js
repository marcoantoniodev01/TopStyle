/* assets/js/carrinho.js */

document.addEventListener('DOMContentLoaded', async () => {
    // --- SELETORES DO DOM ---
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');

    // Seletores de Visualização
    const emptyCartView = document.querySelector('.carrinho-vazio');
    const cartContentView = document.querySelector('.carrinho-content'); // Corrigido seletor direto

    // Seletores do Cupom
    const cupomForm = document.querySelector('.cupom');
    const cupomAplicadoView = document.getElementById('cupom-aplicado');
    const cupomInput = document.getElementById('cupom-input');
    const cupomBtn = document.getElementById('cupom-btn');
    const removerCupomBtn = document.getElementById('trocar-cupom');
    const continuarBtn = document.getElementById('continuar-btn');

    // --- CONSTANTES & SUPABASE ---
    const COUPON_KEY = 'topstyle_coupon_v1';

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
            renderCart(); // Vai renderizar o vazio
            updateCartCountUI(0);
            return;
        }

        // Busca itens do banco
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

        // 2. RENDERIZAR A TELA CORRETA
        renderCart();

        // Atualiza contador
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

        // Cálculo do Total com Cupom
        const appliedCoupon = getAppliedCoupon();
        let total = subtotal;

        if (appliedCoupon) {
            if (cupomForm) cupomForm.style.display = 'none';
            if (cupomAplicadoView) {
                cupomAplicadoView.style.display = 'flex';

                const badge = cupomAplicadoView.querySelector('.badge-cupom');
                if (badge) {
                    badge.textContent = window.CouponManager.getCouponDisplayText(appliedCoupon) || 'CUPOM';

                    // Estilos dinâmicos do cupom
                    badge.style.border = `2px ${appliedCoupon.style?.borderStyle || 'dashed'} ${appliedCoupon.style?.primaryColor || '#000'}`;
                    badge.style.backgroundColor = appliedCoupon.style?.secondaryColor || '#eee';
                    badge.style.color = appliedCoupon.style?.primaryColor || '#000';

                    // --- NOVA LÓGICA: Clique no Badge remove o cupom ---
                    badge.title = "Clique para remover o cupom";
                    badge.onclick = async () => {
                        const confirmed = await window.showConfirmationModal(
                            'Deseja remover este cupom de desconto?',
                            { okText: 'Sim, remover', cancelText: 'Manter' }
                        );
                        if (confirmed) {
                            window.CouponManager.removeCoupon();
                            renderCart();
                        }
                    };
                }
            }

            // Link de texto antigo (mantido visível apenas no Desktop via CSS)
            const trocarLink = document.getElementById('trocar-cupom');
            if (trocarLink) {
                trocarLink.onclick = async (e) => {
                    e.preventDefault();
                    // Mesma lógica do clique no badge
                    const confirmed = await window.showConfirmationModal(
                        'Deseja remover o cupom?',
                        { okText: 'Sim', cancelText: 'Não' }
                    );
                    if (confirmed) {
                        window.CouponManager.removeCoupon();
                        renderCart();
                    }
                };
            }

            const result = window.CouponManager.calculateDiscount(appliedCoupon, subtotal, 0);
            total = result.total;
        } else {
            // ... resto do código (sem cupom)
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

        if (window.showToast) window.showToast('Atualizando...');

        const { error } = await supabase
            .from('user_cart_items')
            .update({ quantity: newQty })
            .eq('id', itemId);

        if (error) {
            console.error('Erro ao atualizar:', error);
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

        const { error } = await supabase
            .from('user_cart_items')
            .delete()
            .eq('id', itemId);

        if (error) {
            console.error('Erro ao deletar:', error);
            if (window.showToast) window.showToast('Erro ao remover item.');
        } else {
            if (window.showToast) window.showToast('Item removido.');
            fetchCart();
        }
    };

    // --- EVENT LISTENERS DE CUPOM E BOTOES ---

    if (cupomBtn) {
        cupomBtn.addEventListener('click', async () => {
            const code = cupomInput.value.trim().toUpperCase();
            if (code) {
                const coupon = await window.CouponManager.applyCoupon(code);
                if (coupon) {
                    if (window.showToast) window.showToast('✅ Cupom aplicado com sucesso!');
                    renderCart();
                } else {
                    if (window.showToast) window.showToast('😑 Cupom inválido ou expirado!', { duration: 2500 });
                }
            }
        });
    }

    if (cupomInput) {
        cupomInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                cupomBtn.click();
            }
        });
    }

    if (removerCupomBtn) {
        removerCupomBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = await window.showConfirmationModal(
                'Deseja remover o cupom de desconto?',
                { okText: 'Sim', cancelText: 'Não' }
            );
            if (confirmed) {
                window.CouponManager.removeCoupon();
                renderCart();
            }
        });
    }

    if (continuarBtn) {
        continuarBtn.addEventListener('click', () => {
            if (currentCartItems.length > 0) {
                window.location.href = 'pagamento.html';
            } else {
                if (window.showToast) window.showToast('Seu carrinho está vazio.');
            }
        });
    }

    // Adicione um listener para atualizações de cupom
    document.addEventListener('coupon-updated', () => {
        renderCart();
    });

    // INICIALIZAÇÃO
    fetchCart();
});
