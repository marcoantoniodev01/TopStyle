/*
  assets/js/produto-novo.js
  Lógica adaptada para funcionar com a estrutura HTML 
  EXISTENTE de Blusa-modelo02.html, sem adicionar IDs.
*/

document.addEventListener('DOMContentLoaded', async () => {
    // Funções do main.js que vamos usar
    const { initSupabaseClient, formatPriceBR, addToCart, showToast } = window;

    if (!initSupabaseClient || !formatPriceBR || !addToCart || !showToast) {
        console.error('Erro: main.js não carregou as funções essenciais (initSupabaseClient, formatPriceBR, addToCart, showToast).');
        return;
    }

    const supabase = await initSupabaseClient();

    // --- SELETORES DO DOM (Usando as classes de Blusa-modelo02.html) ---
    const pageTitle = document.querySelector('title');
    // Seleciona o h2 dentro da div .product
    const productTitleEl = document.querySelector('.product h2'); 
    // Seleciona a div com classe .price
    const productPriceEl = document.querySelector('.price'); 
    // Seleciona a galeria de imagens
    const imageGalleryContainer = document.querySelector('.model-cloth-img'); 
    // Seleciona o container de tamanhos
    const sizeContainer = document.querySelector('.model-sizes'); 
    // Seleciona o container de cores
    const colorContainer = document.querySelector('.colors'); 
    // Seleciona o botão de adicionar ao carrinho
    const addToCartBtn = document.querySelector('.add-to-cart'); 
    // Seleciona o input de quantidade
    const quantityInput = document.querySelector('.model-qty-controls input[type="number"]'); 
    // Seleciona a imagem oculta
    const hiddenImgEl = document.querySelector('.hidden-cart-img'); 

    // --- ESTADO DA PÁGINA ---
    let selectedSize = null;
    let selectedColor = null;
    let currentProduct = null;

    // 1. PEGAR O ID DO PRODUTO DA URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        document.querySelector('.model-cloth').innerHTML = '<h1 style="text-align: center; padding: 50px; width: 100%;">Produto não encontrado.</h1>';
        return;
    }

    // 2. BUSCAR DADOS DO PRODUTO NO SUPABASE
    async function fetchProductById(id) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Erro ao buscar produto:', error);
            return null;
        }
        return data;
    }

    // 3. PREENCHER A PÁGINA (Função adaptada)
    function populatePage(product) {
        currentProduct = product;

        // Preenche informações básicas
        pageTitle.textContent = `${product.nome} - TopStyle`;
        productTitleEl.textContent = product.nome; // Substitui o H2 estático
        const precoFormatado = formatPriceBR(product.preco);
        const parcelaFormatada = formatPriceBR(product.preco / 2); // Exemplo
        productPriceEl.innerHTML = `${precoFormatado} <small>ou 2x de ${parcelaFormatada}</small>`; // Substitui o preço

        // Preenche Imagem oculta (para o carrinho)
        const firstImg = (product.cores && product.cores[0]?.img1) || product.img;
        if (hiddenImgEl) hiddenImgEl.src = firstImg;

        // Preenche os Tamanhos
        sizeContainer.innerHTML = ''; // Limpa os botões de tamanho estáticos
        const sizes = product.tamanhos ? product.tamanhos.split(',').map(s => s.trim()) : [];
        if (sizes.length > 0) {
            sizes.forEach(size => {
                const div = document.createElement('div');
                div.className = 'model-size-btn'; // Usa a sua classe de estilo
                div.dataset.size = size;
                div.textContent = size;
                sizeContainer.appendChild(div);
            });
        } else {
            sizeContainer.innerHTML = '<p>Tamanho único</p>';
            selectedSize = 'Único'; 
        }
        
        // Preenche as Cores
        colorContainer.innerHTML = ''; // Limpa as cores estáticas
        const colors = product.cores || [];
        if (colors.length > 0) {
            colors.forEach(color => {
                const div = document.createElement('div');
                div.dataset.colorName = color.nome; // Adiciona o data-atribute para o clique
                
                // Usa o 'hex' se existir (conforme produto.js), senão um fallback
                const bgColor = color.hex || (color.nome === 'Branco' ? '#fff' : (color.nome === 'Preto' ? '#000' : '#ccc'));
                
                // Recria a estrutura HTML exata da sua div de cor
                div.innerHTML = `<span style="background: ${bgColor}; border: 1px solid #ddd;"></span> ${color.nome}`;
                colorContainer.appendChild(div);
            });
        } else {
             colorContainer.innerHTML = '<p>Cor única</p>';
             selectedColor = 'Única'; 
        }


        // Preenche a Galeria de Imagens
        imageGalleryContainer.innerHTML = ''; // Limpa as imagens estáticas
        let hasImages = false;
        if (colors.length > 0) {
            product.cores.forEach(color => {
                if (color.img1) {
                    imageGalleryContainer.innerHTML += `<img src="${color.img1}" alt="${product.nome} - ${color.nome}">`;
                    hasImages = true;
                }
                if (color.img2) {
                    imageGalleryContainer.innerHTML += `<img src="${color.img2}" alt="${product.nome} - ${color.nome} (imagem 2)">`;
                    hasImages = true;
                }
            });
        }
        
        if (!hasImages && product.img) {
             imageGalleryContainer.innerHTML += `<img src="${product.img}" alt="${product.nome}">`;
             hasImages = true;
        }

        if (!hasImages) {
            imageGalleryContainer.innerHTML = `<img src="https://placehold.co/400x600/eee/ccc?text=Produto+sem+imagem" alt="Produto sem imagem">`;
        }
    }

    // 4. ADICIONAR INTERATIVIDADE (Função adaptada)
    function addInteractivity() {
        // Clique nos Tamanhos
        sizeContainer.addEventListener('click', (e) => {
            const target = e.target;
            // O target DEVE ter a classe que o populatePage adicionou
            if (target.classList.contains('model-size-btn')) {
                sizeContainer.querySelectorAll('.model-size-btn').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');
                selectedSize = target.dataset.size;
            }
        });

        // Clique nas Cores
        colorContainer.addEventListener('click', (e) => {
            // Procura pelo 'div' pai que tem o data-atribute
            const target = e.target.closest('div[data-color-name]');
            if (target) {
                colorContainer.querySelectorAll('div[data-color-name]').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');
                selectedColor = target.dataset.colorName;
                
                // Atualiza a imagem oculta para a imagem da cor selecionada
                const colorData = currentProduct.cores.find(c => c.nome === selectedColor);
                if (colorData && colorData.img1 && hiddenImgEl) {
                    hiddenImgEl.src = colorData.img1;
                }
            }
        });
        
        // Lógica dos botões de Quantidade +/-
        const qtyControls = document.querySelector('.model-qty-controls');
        if (qtyControls) {
             qtyControls.addEventListener('click', (e) => {
                 let currentValue = parseInt(quantityInput.value) || 1;
                 if(e.target.textContent === '+') {
                     currentValue++;
                 } else if (e.target.textContent === '−' && currentValue > 1) {
                     currentValue--;
                 }
                 quantityInput.value = currentValue;
             });
        }

        // Clique no botão Adicionar ao Carrinho
        addToCartBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Boa prática, embora já seja type="button" no seu HTML
            if (!selectedSize) {
                showToast('Por favor, escolha um tamanho!', { duration: 2000 });
                return;
            }
            if (!selectedColor) {
                showToast('Por favor, escolha uma cor!', { duration: 2000 });
                return;
            }

            const item = {
                productId: currentProduct.id,
                nome: currentProduct.nome,
                price: currentProduct.preco,
                size: selectedSize,
                color: selectedColor,
                img: hiddenImgEl.src, // Pega a imagem da cor selecionada
                quantity: parseInt(quantityInput.value) || 1
            };
            
            addToCart(item); // Função do main.js
        });
    }

    // --- EXECUÇÃO ---
    // Seleciona o container principal para mensagens de erro
    const mainContainer = document.querySelector('.model-cloth');

    if (!productTitleEl || !productPriceEl || !imageGalleryContainer || !sizeContainer || !colorContainer) {
        console.error('Erro fatal: A estrutura HTML de Blusa-modelo02.html mudou. Não foi possível encontrar os seletores necessários.');
        if(mainContainer) mainContainer.innerHTML = '<h1 style="text-align: center; padding: 50px; width: 100%;">Erro ao carregar a página. Verifique o console.</h1>';
        return;
    }

    const productData = await fetchProductById(productId);
    if (productData) {
        populatePage(productData);
        addInteractivity();
    } else {
        mainContainer.innerHTML = '<h1 style="text-align: center; padding: 50px; width: 100%;">Produto não encontrado ou erro ao carregar.</h1>';
    }
});