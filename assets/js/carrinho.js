/* assets/js/carrinho.js */

document.addEventListener('DOMContentLoaded', async () => {
    // --- SELETORES DO DOM ---
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');

    // Seletores de Visualização
    const emptyCartView = document.querySelector('.carrinho-vazio');
    const cartContentView = document.querySelector('.carrinho-content');

    // Seletores do Cupom
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
    function formatPriceBR(num) {
        if (typeof num !== 'number') num = 0;
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    }

    // --- LÓGICA DO CARRINHO ---

    async function fetchCart() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            currentCartItems = [];
            renderCart(null); // Passa null pois não tem user
            updateCartCountUI(0);
            // Se não tem user, carrega recomendações genéricas
            loadRecommendations(null);
            return;
        }

        const { data, error } = await supabase
            .from('user_cart_items')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar carrinho:', error);
        } else {
            currentCartItems = data || [];
        }

        renderCart(user.id);
        const totalCount = currentCartItems.reduce((acc, item) => acc + item.quantity, 0);
        updateCartCountUI(totalCount);
    }

    function updateCartCountUI(count) {
        const el = document.querySelector('#cart-count');
        if (!el) return;
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    }

    // --- RENDERIZAÇÃO PRINCIPAL ---

    function renderCart(userId) {
        // 1. Estado Vazio
        if (currentCartItems.length === 0) {
            if (emptyCartView) {
                emptyCartView.style.display = 'flex';
                // Animações de entrada
                const hiddenElements = emptyCartView.querySelectorAll('.hidden');
                hiddenElements.forEach(el => el.classList.add('show'));

                // === AQUI ESTÁ A MÁGICA ===
                // Carrega recomendações inteligentes quando o carrinho está vazio
                loadRecommendations(userId);
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

        // --- Lógica de Cupom Reintegrada (Estilo Antigo) ---
        let total = subtotal;

        if (window.CouponManager) {
            const appliedCoupon = window.CouponManager.getAppliedCoupon();

            if (appliedCoupon) {
                // 1. Esconde o input e mostra o badge
                if (cupomForm) cupomForm.style.display = 'none';

                if (cupomAplicadoView) {
                    cupomAplicadoView.style.display = 'flex';
                    const badge = cupomAplicadoView.querySelector('.badge-cupom');

                    if (badge) {
                        // Texto do cupom
                        badge.textContent = window.CouponManager.getCouponDisplayText(appliedCoupon);

                        // --- AQUI ESTÁ A LÓGICA VISUAL RESTAURADA ---
                        // Aplica as cores vindas do Supabase (style)
                        badge.style.border = `2px ${appliedCoupon.style?.borderStyle || 'dashed'} ${appliedCoupon.style?.primaryColor || '#000'}`;
                        badge.style.backgroundColor = appliedCoupon.style?.secondaryColor || '#eee';
                        badge.style.color = appliedCoupon.style?.primaryColor || '#000';
                        badge.title = "Clique para remover o cupom";

                        // Lógica de remoção ao clicar no badge
                        badge.onclick = async () => {
                            const confirmed = await window.showConfirmationModal(
                                'Deseja remover este cupom de desconto?',
                                { okText: 'Sim, remover', cancelText: 'Manter' }
                            );

                            if (confirmed) {
                                window.CouponManager.removeCoupon();
                                renderCart(userId); // Re-renderiza
                            }
                        };
                    }
                }

                // Calcula o novo total com desconto
                const result = window.CouponManager.calculateDiscount(appliedCoupon, subtotal, 0);
                total = result.total;

            } else {
                // Se não tiver cupom, mostra o campo de digitação normal
                if (cupomForm) cupomForm.style.display = 'flex';
                if (cupomAplicadoView) cupomAplicadoView.style.display = 'none';
                if (cupomInput) cupomInput.value = '';
            }
        }

        // Atualiza o texto do total na tela
        cartTotalEl.textContent = formatPriceBR(total);
    }

    // --- FUNÇÃO: RECOMENDAÇÕES INTELIGENTES ---
    // --- RECOMENDAÇÕES INTELIGENTES ---
    async function loadRecommendations(userId) {
        // Seleciona os slots do Swiper
        const slots = document.querySelectorAll('.cartSwiper .product-slot');
        if (slots.length === 0) return;

        let products = [];

        try {
            if (userId) {
                // Busca recomendação inteligente (RPC criado no passo anterior)
                const { data, error } = await supabase.rpc('get_user_recommendations', {
                    target_user_id: userId
                });

                if (!error && data && data.length > 0) {
                    products = data;
                } else {
                    // Fallback: Produtos aleatórios (excluindo os já comprados se possível)
                    const { data: fallbackData } = await supabase
                        .from('products')
                        .select('*')
                        .limit(10);

                    // Embaralha
                    products = fallbackData ? fallbackData.sort(() => 0.5 - Math.random()).slice(0, 4) : [];
                }
            } else {
                // Deslogado: Produtos aleatórios
                const { data: genericData } = await supabase
                    .from('products')
                    .select('*')
                    .limit(10);
                products = genericData ? genericData.sort(() => 0.5 - Math.random()).slice(0, 4) : [];
            }

            // Renderiza
            slots.forEach((slot, index) => {
                if (products[index]) {
                    renderRecommendedProduct(slot, products[index]);
                } else {
                    slot.innerHTML = '';
                }
            });

            // NOVO: Avisa o sistema de hover para processar os novos elementos
            if (typeof window.prepareProductHoverAndOptions === 'function') {
                window.prepareProductHoverAndOptions();
            }

            // Atualiza o Swiper (importante para o layout se ajustar)
            if (window.swiperCart) {
                window.swiperCart.update();
            }

        } catch (err) {
            console.error("Erro nas recomendações:", err);
        }
    }

    function renderRecommendedProduct(container, product) {
        const mainImg = (product.cores && product.cores.length > 0 && product.cores[0].img1)
            ? product.cores[0].img1
            : (product.img || 'assets/img/sem-foto.png');

        // Adicionada a estrutura .product-options que o main.js espera encontrar
        container.innerHTML = `
        <div class="product" data-id="${product.id}">
            <a class="product-link" href="Blusa-modelo02.html?id=${product.id}">
                <img src="${mainImg}" alt="${product.nome}">
            </a>
            <div class="product-text">
                <p class="product-title">${product.nome}</p>
                <p class="product-price">${formatPriceBR(Number(product.preco || product.price))}</p>
                
                <div class="product-options" style="display:none;">
                    <div class="colors"></div>
                    <div class="sizes"></div>
                </div>
            </div>
        </div>
    `;

        // Vincula os dados ao elemento para o main.js ler
        const productDiv = container.querySelector('.product');
        productDiv.__productMeta = product;
    }

    // --- AÇÕES DO USUÁRIO (Update/Delete) ---
    // (Mantido igual ao seu original, apenas garantindo que chame renderCart corretamente)
    window.updateItemQty = async (itemId, newQty) => {
        if (newQty < 1) { deleteCartItem(itemId, 'Item'); return; }
        await supabase.from('user_cart_items').update({ quantity: newQty }).eq('id', itemId);
        fetchCart();
    };

    window.deleteCartItem = async (itemId, nomeItem) => {
        if (await window.showConfirmationModal(`Remover ${nomeItem}?`)) {
            await supabase.from('user_cart_items').delete().eq('id', itemId);
            fetchCart();
        }
    };

    // --- LISTENERS DE CUPOM E AÇÕES FINAIS ---

    // 1. Botão de Aplicar Cupom
    if (cupomBtn) {
        cupomBtn.addEventListener('click', async () => {
            const code = cupomInput.value.trim().toUpperCase();

            if (code && window.CouponManager) {
                // Tenta aplicar e pega o retorno (objeto cupom ou null)
                const coupon = await window.CouponManager.applyCoupon(code);

                if (coupon) {
                    if (window.showToast) window.showToast('✅ Cupom aplicado com sucesso!');
                    fetchCart(); // Recarrega visualmente
                } else {
                    if (window.showToast) window.showToast('😑 Cupom inválido ou expirado!', { duration: 2500 });
                }
            }
        });
    }

    // 2. Tecla ENTER no Input do Cupom
    if (cupomInput) {
        cupomInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                cupomBtn.click(); // Simula o clique no botão
            }
        });
    }

    // 3. Botão Remover (Link de texto, caso exista no layout desktop)
    if (removerCupomBtn) {
        removerCupomBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = await window.showConfirmationModal(
                'Deseja remover o cupom?',
                { okText: 'Sim', cancelText: 'Não' }
            );
            if (confirmed) {
                window.CouponManager.removeCoupon();
                fetchCart();
            }
        });
    }

    // 4. Listener para atualizações externas (Sync entre abas ou eventos)
    document.addEventListener('coupon-updated', () => {
        fetchCart();
    });

    // 5. Botão Continuar (Ir para Pagamento)
    if (continuarBtn) {
        continuarBtn.addEventListener('click', () => {
            if (currentCartItems.length > 0) {
                window.location.href = 'pagamento.html';
            } else {
                if (window.showToast) window.showToast("Seu carrinho está vazio!", { duration: 2000 });
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    fetchCart();
    
    // --- ADICIONE ESTE BLOCO ABAIXO PARA ATUALIZAR EM TEMPO REAL ---

    // 1. Pega o usuário atual para criar o filtro
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // 2. Cria a inscrição no Realtime
        supabase
            .channel('changes_no_carrinho')
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuta tudo: quando adiciona, remove ou altera
                    schema: 'public',
                    table: 'user_cart_items',
                    filter: `user_id=eq.${user.id}` // IMPORTANTE: Só escuta o carrinho deste usuário
                },
                (payload) => {
                    // console.log('Mudança detectada!', payload);
                    fetchCart(); // Recarrega a tela automaticamente
                }
            )
            .subscribe();
    }

    // --- FIM DO BLOCO ---
}); // <-- Esse é o fechamento do