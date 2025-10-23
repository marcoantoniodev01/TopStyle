/* assets/js/carrinho.js (CORRIGIDO) */

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DO DOM ---
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const emptyCartView = document.querySelector('.carrinho-vazio');
    const cartContentView = document.querySelector('.content-continuar')?.parentElement;

    // Seletores do Cupom
    const cupomForm = document.querySelector('.cupom');
    const cupomAplicadoView = document.getElementById('cupom-aplicado');
    const cupomInput = document.getElementById('cupom-input');
    const cupomBtn = document.getElementById('cupom-btn');
    const removerCupomBtn = document.getElementById('trocar-cupom');
    const cupomInvalidoAlert = document.querySelector('.cupom-invalido-alert');
    const continuarBtn = document.getElementById('continuar-btn');

    // --- CONSTANTES ---
    const CART_KEY = 'topstyle_cart_v1';
    const COUPON_KEY = 'topstyle_coupon_v1';
    const VALID_COUPONS = {
        'TOPSTYLE': 0.10 // 10% de desconto
    };

    // --- FUNÇÕES DE DADOS (CARRINHO E CUPOM) ---
    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        renderCart();
        updateCartCountUI();
    }

    function getAppliedCoupon() {
        return localStorage.getItem(COUPON_KEY);
    }

    function applyCoupon(couponCode) {
        if (VALID_COUPONS[couponCode.toUpperCase()]) {
            localStorage.setItem(COUPON_KEY, couponCode.toUpperCase());
            updateCouponUI();
            renderCart();
            // Acessa a função global de toast definida em main.js
            if (window.showToast) {
                window.showToast('✅ Cupom aplicado com sucesso!');
            }
        } else {
            if (window.showToast) {
                window.showToast('😑 Insira um cupom válido!!', { duration: 2500 });
            }
        }
    }

    function removeCoupon() {
        localStorage.removeItem(COUPON_KEY);
        updateCouponUI();
        renderCart();
    }

    // --- FUNÇÕES DE UI ---
    function updateCartCountUI() {
        const el = document.querySelector('#cart-count');
        if (!el) return;
        const total = getCart().reduce((s, it) => s + (it.quantity || 1), 0);
        el.textContent = total;
        el.style.display = total > 0 ? 'flex' : 'none';
    }

    function formatPriceBR(num) {
        if (typeof num !== 'number') num = 0;
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
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

    function renderCart() {
        const cart = getCart();

        if (cart.length === 0) {
            if (emptyCartView) {
                emptyCartView.style.display = 'flex';
                // ADIÇÃO: Força a animação dos elementos filhos
                const hiddenElements = emptyCartView.querySelectorAll('.hidden');
                hiddenElements.forEach(el => {
                    el.classList.add('show');
                });
            }
            if (cartContentView) cartContentView.style.display = 'none';
            return;
        }

        if (emptyCartView) emptyCartView.style.display = 'none';
        if (cartContentView) cartContentView.style.display = 'flex';

        if (!cartItemsContainer || !cartTotalEl) return;

        cartItemsContainer.innerHTML = '';
        let subtotal = 0;

        cart.forEach((item, index) => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
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
                <p>${formatPriceBR(item.price)}</p>
                <div class="quantity-controls">
                    <button type="button" data-index="${index}" class="quantity-decrease">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" data-index="${index}" class="quantity-increase">+</button>
                </div>
                <button type="button" data-index="${index}" class="remove">Remover</button>
            </div>
        `;
            cartItemsContainer.appendChild(cartItem);
        });

        const appliedCoupon = getAppliedCoupon();
        let total = subtotal;
        if (appliedCoupon && VALID_COUPONS[appliedCoupon]) {
            const discountPercentage = VALID_COUPONS[appliedCoupon];
            total = subtotal * (1 - discountPercentage);
        }

        cartTotalEl.textContent = formatPriceBR(total);
    }

    // --- EVENT LISTENERS ---
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', async (e) => {
            const cart = getCart();
            const index = e.target.dataset.index;

            if (index === undefined) return;
            const item = cart[index];

            if (e.target.classList.contains('quantity-increase')) {
                item.quantity++;
                saveCart(cart);
            }

            if (e.target.classList.contains('quantity-decrease')) {
                if (item.quantity > 1) {
                    item.quantity--;
                    saveCart(cart);
                } else {
                    // *** CORREÇÃO APLICADA AQUI ***
                    const confirmed = await window.showConfirmationModal(
                        `Remover "${item.nome}" do carrinho?`,
                        { okText: 'Remover', cancelText: 'Manter' }
                    );
                    if (confirmed) {
                        cart.splice(index, 1);
                        saveCart(cart);
                    }
                }
            }

            if (e.target.classList.contains('remove')) {
                // *** CORREÇÃO APLICADA AQUI ***
                const confirmed = await window.showConfirmationModal(
                    `Tem certeza que quer remover "${item.nome}" do carrinho?`,
                    { okText: 'Remover', cancelText: 'Cancelar' }
                );
                if (confirmed) {
                    cart.splice(index, 1);
                    saveCart(cart);
                }
            }
        });
    }

    if (continuarBtn) {
        continuarBtn.addEventListener('click', () => {
            window.location.href = 'pagamento.html';
        });
    }

    if (cupomBtn) {
        cupomBtn.addEventListener('click', () => {
            const code = cupomInput.value.trim();
            if (code) {
                applyCoupon(code);
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
                removeCoupon();
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    renderCart();
    updateCartCountUI();
    updateCouponUI();
});