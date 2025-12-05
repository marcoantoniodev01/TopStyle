/* assets/js/produto.js (ATUALIZADO COM CARROSSEL) */

document.addEventListener('DOMContentLoaded', async () => {
    // As funções initSupabaseClient, formatPriceBR, addToCart e showToast
    // são do seu main.js. Certifique-se de que main.js seja carregado antes deste script.
    const supabase = await initSupabaseClient();

    // --- SELETORES DO DOM ---
    const pageTitle = document.querySelector('title');
    const productTitleEl = document.querySelector('.title-informations');
    const productPriceEl = document.querySelector('.product-informations-sale p');
    const mainImageContainer = document.querySelector('.principal-image-informations');
    const thumbnailsContainer = document.querySelector('.previw-imagens-informations');
    const sizeContainer = document.querySelector('.size-escolha');
    const colorContainer = document.querySelector('.cor-content');
    const addToCartForm = document.querySelector('.product-informations-content');

    // --- ESTADO DA PÁGINA ---
    let selectedSize = null;
    let selectedColor = null;
    let currentProduct = null;
    let imageSliderInterval = null; // Para o autoplay do carrossel

    // 1. PEGAR O ID DO PRODUTO DA URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        document.querySelector('.main-selecao').innerHTML = '<h1>Produto não encontrado.</h1>';
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

    // 3. PREENCHER A PÁGINA COM OS DADOS
    function populatePage(product) {
        currentProduct = product;

        pageTitle.textContent = `${product.nome} - TopStyle`;
        productTitleEl.textContent = product.nome;
        productPriceEl.textContent = formatPriceBR(product.preco);

        sizeContainer.innerHTML = '';
        const sizes = product.tamanhos ? product.tamanhos.split(',').map(s => s.trim()) : [];
        sizes.forEach(size => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'button-size hidden fade-up';
            button.textContent = size;
            sizeContainer.appendChild(button);
        });

        colorContainer.innerHTML = '';
        product.cores.forEach(color => {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'cor-div hidden fade-up';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'cor button-color';
            button.style.backgroundColor = color.hex || '#ccc';
            button.dataset.colorName = color.nome;
            const p = document.createElement('p');
            p.textContent = color.nome;
            colorDiv.appendChild(button);
            colorDiv.appendChild(p);
            colorContainer.appendChild(colorDiv);
        });

        // VERIFICA O TAMANHO DA TELA PARA DECIDIR SE CRIA THUMBNAILS OU O CARROSSEL
        if (window.innerWidth > 992) {
            setupThumbnails(product);
        } else {
            setupImageSlider(product);
        }

        document.querySelectorAll('.hidden').forEach(el => el.classList.add('show'));
    }

    // 4. LÓGICA PARA THUMBNAILS (TELAS GRANDES)
    function setupThumbnails(product) {
        thumbnailsContainer.innerHTML = '';
        product.cores.forEach(color => {
            [color.img1, color.img2].forEach(imgUrl => {
                if (imgUrl) {
                    const thumbDiv = document.createElement('div');
                    thumbDiv.className = 'thumb-mini';
                    const img = document.createElement('img');
                    img.className = 'mini-image';
                    img.src = imgUrl;
                    img.dataset.color = color.nome;
                    thumbDiv.appendChild(img);
                    thumbnailsContainer.appendChild(thumbDiv);
                }
            });
        });
        
        mainImageContainer.innerHTML = `<img src="${product.cores?.[0]?.img1 || ''}" alt="Imagem principal do produto">`;
        thumbnailsContainer.querySelector('.thumb-mini')?.classList.add('active-thumb');
    }

    // 5. NOVA LÓGICA PARA O CARROSSEL DE IMAGENS (TELAS PEQUENAS)
    function setupImageSlider(product) {
        let allImages = [];
        product.cores.forEach(color => {
            if (color.img1) allImages.push(color.img1);
            if (color.img2) allImages.push(color.img2);
        });
        
        if (allImages.length === 0) {
             mainImageContainer.innerHTML = `<img src="https://placehold.co/600x800/eee/ccc?text=Sem+Imagem" class="slider-image active" alt="Produto sem imagem">`;
             return;
        }

        mainImageContainer.innerHTML = ''; // Limpa o container
        allImages.forEach((imgUrl, index) => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.className = 'slider-image';
            if (index === 0) img.classList.add('active');
            mainImageContainer.appendChild(img);
        });

        // Adiciona botões apenas se houver mais de uma imagem
        if (allImages.length > 1) {
            mainImageContainer.innerHTML += `
                <button class="slider-btn prev"><i class="ri-arrow-left-s-line"></i></button>
                <button class="slider-btn next"><i class="ri-arrow-right-s-line"></i></button>
            `;
            let currentIndex = 0;

            const showImage = (index) => {
                const images = mainImageContainer.querySelectorAll('.slider-image');
                images.forEach(img => img.classList.remove('active'));
                images[index].classList.add('active');
            };

            const nextImage = () => {
                currentIndex = (currentIndex + 1) % allImages.length;
                showImage(currentIndex);
            };

            const prevImage = () => {
                currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
                showImage(currentIndex);
            };
            
            mainImageContainer.querySelector('.next').addEventListener('click', () => {
                nextImage();
                clearInterval(imageSliderInterval); // Para o autoplay ao clicar
            });
            mainImageContainer.querySelector('.prev').addEventListener('click', () => {
                prevImage();
                clearInterval(imageSliderInterval); // Para o autoplay ao clicar
            });

            // Inicia o autoplay
            imageSliderInterval = setInterval(nextImage, 4000); // Muda a cada 4 segundos
        }
    }

    // 6. ADICIONAR INTERATIVIDADE
    function addInteractivity() {
        sizeContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('button-size')) {
                sizeContainer.querySelectorAll('.button-size').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                selectedSize = e.target.textContent;
            }
        });

        colorContainer.addEventListener('click', (e) => {
            const targetButton = e.target.closest('.button-color');
            if (targetButton) {
                colorContainer.querySelectorAll('.button-color').forEach(btn => btn.classList.remove('active'));
                targetButton.classList.add('active');
                selectedColor = targetButton.dataset.colorName;

                // Lógica para telas grandes
                if (window.innerWidth > 992) {
                     thumbnailsContainer.querySelectorAll('.thumb-mini').forEach(thumb => {
                        thumb.style.display = thumb.querySelector('img').dataset.color === selectedColor ? 'block' : 'none';
                    });
                    const firstImageOfColor = thumbnailsContainer.querySelector(`img[data-color="${selectedColor}"]`);
                    if (firstImageOfColor) {
                        mainImageContainer.querySelector('img').src = firstImageOfColor.src;
                    }
                }
            }
        });
        
        thumbnailsContainer.addEventListener('click', (e) => {
            const targetImg = e.target.closest('.mini-image');
            if (targetImg) {
                mainImageContainer.querySelector('img').src = targetImg.src;
                thumbnailsContainer.querySelectorAll('.thumb-mini').forEach(thumb => thumb.classList.remove('active-thumb'));
                targetImg.parentElement.classList.add('active-thumb');
            }
        });

        addToCartForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!selectedSize) {
                showToast('Por favor, escolha um tamanho!', { duration: 2000 });
                return;
            }
            if (!selectedColor) {
                showToast('Por favor, escolha uma cor!', { duration: 2000 });
                return;
            }
            const colorData = currentProduct.cores.find(c => c.nome === selectedColor);
            const itemImage = colorData ? colorData.img1 : mainImageContainer.querySelector('img').src;
            const item = {
                productId: currentProduct.id,
                nome: currentProduct.nome,
                price: currentProduct.preco,
                size: selectedSize,
                color: selectedColor,
                img: itemImage,
                quantity: 1
            };
            addToCart(item);
        });
    }

    // --- EXECUÇÃO ---
    const productData = await fetchProductById(productId);
    if (productData) {
        populatePage(productData);
        addInteractivity();
    } else {
        document.querySelector('.main-selecao').innerHTML = '<h1>Produto não encontrado ou erro ao carregar.</h1>';
    }
});