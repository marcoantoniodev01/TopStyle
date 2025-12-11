/*
  assets/js/produto-novo.js
  VERSÃO FINAL COM PAGINAÇÃO NUMÉRICA, FOTO DE PERFIL E SWIPER REESTILIZADO
*/
// PEGAR O PRODUCT ID PELA URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

console.log("PRODUCT ID DETECTADO:", productId);


document.addEventListener('DOMContentLoaded', async () => {

  // Guarda o estado atual da página
  let g_currentPage = 1;
  const REVIEWS_PER_PAGE = 5; // <-- Define 5 por página

  // Dependências vindas do main.js
  const { initSupabaseClient, formatPriceBR, addToCart, showToast } = window;
  if (!initSupabaseClient || !formatPriceBR || !addToCart || !showToast) {
    console.error('Erro: funções do main.js não encontradas.');
    return;
  }

  // *** RESTAURAÇÃO: Cliente Supabase é carregado via initSupabaseClient() ***
  const supabase = await initSupabaseClient();

  // FORÇA O CLIENTE SUPABASE A USAR O TOKEN ATUALIZADO
  supabase.auth.onAuthStateChange((event, session) => {
    // Isso garante que o token seja atualizado
  });


  // ======== Seletores DOM ========
  const pageTitle = document.querySelector('title');
  const productTitleEl = document.querySelector('.product h2');
  const productPriceEl = document.querySelector('.price');
  const galleryContainer = document.querySelector('.model-cloth-img.swiper.mySwiper');
  const galleryWrapper = galleryContainer ? galleryContainer.querySelector('.swiper-wrapper') : null;
  const sizeContainer = document.querySelector('.model-sizes');
  const colorContainer = document.querySelector('.colors');
  const addToCartBtn = document.querySelector('.add-to-cart');
  const quantityInput = document.querySelector('.model-qty-controls input[type="number"]');
  const hiddenImgEl = document.querySelector('.hidden-cart-img');
  const mainContainer = document.querySelector('.model-cloth');
  const descriptionContentEl = document.querySelector('.model-accordion-item:nth-child(1) .model-accordion-content');
  const additionalInfoContentEl = document.querySelector('.model-accordion-item:nth-child(3) .model-accordion-content');
  // produto-novo.js

  if (!productTitleEl || !productPriceEl || !galleryWrapper || !sizeContainer || !colorContainer) {
    console.error('Erro fatal: seletores não encontrados. Verifique a estrutura HTML.');
    if (mainContainer) mainContainer.innerHTML = '<h1 style="text-align:center;padding:50px;">Erro ao carregar a página.</h1>';
    return;
  }

  // ======== Estado ========
  let currentProduct = null;
  let selectedSize = null;
  let selectedColor = null;
  let productSwiper = null;

  // breakpoint mobile
  const MOBILE_MAX = 1200;

  // util: escapar alt text
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // util: aguardar todas as imagens dentro de um wrapper carregarem
  function waitForImagesIn(container) {
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();
    return Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', resolve);
      });
    }));
  }

  // ======== Swiper control ========
  function initSwiper() {
    if (window.innerWidth <= MOBILE_MAX) {
      if (productSwiper) {
        productSwiper.update();
        return;
      }
      productSwiper = new Swiper(galleryContainer, {
        slidesPerView: 1,
        spaceBetween: 12,
        pagination: {
          el: galleryContainer.querySelector('.swiper-pagination'),
          clickable: true
        },
        navigation: {
          nextEl: galleryContainer.querySelector('.swiper-button-next'),
          prevEl: galleryContainer.querySelector('.swiper-button-prev')
        },
        observer: true,
        observeParents: true,
        observeSlideChildren: true
      });
      return;
    }

    if (window.innerWidth > MOBILE_MAX && productSwiper) {
      productSwiper.destroy(false, true);
      productSwiper = null;
    }
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initSwiper, 120);
  });

  // ======== Fetch produto ========
  async function fetchProductById(id) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error || !data) {
      console.error('Erro ao buscar produto', error);
      return null;
    }
    return data;
  }

  // ======== populatePage ========
  // produto-novo.js

  // ======== populatePage ========
  function populatePage(product) {
    currentProduct = product;
    pageTitle.textContent = `${product.nome} - TopStyle`;
    productTitleEl.textContent = product.nome;
    const precoFormatado = formatPriceBR(product.preco);
    const parcelaFormatada = formatPriceBR(product.preco / 2);
    productPriceEl.innerHTML = `${precoFormatado} <small>ou 2x de ${parcelaFormatada}</small>`;

    const firstImg = (product.cores && product.cores[0]?.img1) || product.img;
    if (hiddenImgEl) hiddenImgEl.src = firstImg;

    sizeContainer.innerHTML = '';
    const sizes = product.tamanhos ? product.tamanhos.split(',').map(s => s.trim()) : [];
    if (sizes.length > 0) {
      sizes.forEach(size => {
        const div = document.createElement('div');
        div.className = 'model-size-btn';
        div.dataset.size = size;
        div.textContent = size;
        sizeContainer.appendChild(div);
      });
    } else {
      sizeContainer.innerHTML = '<p>Tamanho único</p>';
      selectedSize = 'Único';
    }

    colorContainer.innerHTML = '';
    const colors = product.cores || [];
    if (colors.length > 0) {
      product.cores.forEach(color => {
        const div = document.createElement('div');
        div.dataset.colorName = color.nome;

        // Usa a função global atualizada
        let hex = window.getColorHex ? window.getColorHex(color.nome) : '#ccc';

        // Fallback visual se retornar null (tenta usar a imagem se existir, ou cinza)
        if (!hex && color.img1) {
          // Se não tem cor definida, mas tem imagem, podemos usar a imagem como fundo (opcional)
          // Mas como você pediu cor sólida, deixamos cinza ou tentamos um RGB genérico
          hex = '#ccc';
        }

        div.innerHTML = `<span style="background: ${hex || '#ccc'}; border: 1px solid #ddd;"></span> ${color.nome}`;
        colorContainer.appendChild(div);
      });
    } else {
      colorContainer.innerHTML = '<p>Cor única</p>';
      selectedColor = 'Única';
    }

    galleryWrapper.innerHTML = '';
    let hasImages = false;
    if (colors.length > 0) {
      colors.forEach(color => {
        if (color.img1) {
          galleryWrapper.insertAdjacentHTML('beforeend',
            `<div class="swiper-slide"><img src="${color.img1}" alt="${escapeHtml(product.nome)} - ${escapeHtml(color.nome)}"></div>`);
          hasImages = true;
        }
        if (color.img2) {
          galleryWrapper.insertAdjacentHTML('beforeend',
            `<div class="swiper-slide"><img src="${color.img2}" alt="${escapeHtml(product.nome)} - ${escapeHtml(color.nome)} (2)"></div>`);
          hasImages = true;
        }
      });
    }

    if (!hasImages && product.img) {
      galleryWrapper.insertAdjacentHTML('beforeend',
        `<div class="swiper-slide"><img src="${product.img}" alt="${escapeHtml(product.nome)}"></div>`);
      hasImages = true;
    }

    if (!hasImages) {
      galleryWrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/400x600/eee/ccc?text=Sem+imagem" alt="Sem imagem"></div>`;
    }

    // ===========================================
    // NOVO CÓDIGO PARA O ACORDEÃO (Detalhes e Info. Complementares)
    // ===========================================

    if (descriptionContentEl) {
      // Puxa da coluna 'description'
      descriptionContentEl.innerHTML = product.description || '- Sem descrição detalhada fornecida.';
    }

    if (additionalInfoContentEl) {
      // Puxa da coluna 'additional_info'
      additionalInfoContentEl.innerHTML = product.additional_info || 'Sem informações complementares fornecidas.';
    }
  }

  // ======== adicionar interatividade ========
  function addInteractivity() {
    sizeContainer.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('model-size-btn')) {
        sizeContainer.querySelectorAll('.model-size-btn').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');
        selectedSize = target.dataset.size;
      }
    });

    colorContainer.addEventListener('click', (e) => {
      const target = e.target.closest('div[data-color-name]');
      if (target) {
        colorContainer.querySelectorAll('div[data-color-name]').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');
        selectedColor = target.dataset.colorName;
        const colorData = currentProduct.cores.find(c => c.nome === selectedColor);
        if (colorData && colorData.img1 && hiddenImgEl) {
          hiddenImgEl.src = colorData.img1;
        }
      }
    });

    const qtyControls = document.querySelector('.model-qty-controls');
    const qtyInput = document.querySelector('.model-qty-controls input[type="number"]'); // Seletor direto

    // 1. Bloqueio ao digitar (Input manual)
    if (qtyInput) {
      qtyInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        // Se for menor que 1 ou não for número, força 1
        if (isNaN(val) || val < 1) {
          e.target.value = 1;
          window.showToast("A quantidade mínima é 1 item."); // Feedback visual
        }
      });

      // Impede digitar sinal de menos
      qtyInput.addEventListener('keydown', (e) => {
        if (e.key === '-' || e.key === 'e') {
          e.preventDefault();
        }
      });
    }

    // 2. Bloqueio nos botões (+ e -)
    if (qtyControls) {
      qtyControls.addEventListener('click', (e) => {
        // Usa o input capturado acima ou busca novamente
        const input = qtyControls.querySelector('input');
        let currentValue = parseInt(input.value) || 1;

        if (e.target.textContent === '+') {
          currentValue++;
        } else if (e.target.textContent === '−' || e.target.textContent === '-') { // Copie o caractere exato do seu HTML
          if (currentValue > 1) {
            currentValue--;
          } else {
            // Opcional: Feedback se tentar baixar de 1
            // window.showToast("Quantidade mínima alcançada.");
          }
        }
        input.value = currentValue;
      });
    }

    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
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
          img: hiddenImgEl.src,
          quantity: parseInt(quantityInput.value) || 1
        };
        addToCart(item);
      });
    }
  }

  // ======== rotina principal ========
  if (!productId) {
    if (mainContainer) mainContainer.innerHTML = '<h1 style="text-align:center;padding:50px;">Produto não encontrado.</h1>';
    return;
  }

  const productData = await fetchProductById(productId);
  if (!productData) {
    if (mainContainer) mainContainer.innerHTML = '<h1 style="text-align:center;padding:50px;">Produto não encontrado.</h1>';
    return;
  }

  populatePage(productData);
  addInteractivity();

  await waitForImagesIn(galleryWrapper);

  carregarReviews(productId, 1); // Carrega a página 1
  carregarRatingSummary(productId); // Carrega o sumário

  initSwiper();
  if (!productSwiper) galleryWrapper.style.transform = '';

  // =========================
  // ======== Reviews Module
  // =========================

  async function criarReview({ productId, rating, titulo, comentario, arquivos }) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("Usuário não autenticado.");
      }

      const userId = userData.user.id;

      // 1. Criar review
      const { data: review, error: reviewError } = await supabase
        .from("reviews")
        .insert({
          user_id: userId,
          product_id: productId,
          estrelas: rating,
          titulo: titulo,
          comentario
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      const reviewId = review.id;

      if (!arquivos || arquivos.length === 0) {
        return { review, medias: [] };
      }

      const medias = [];

      // 2. Upload + salvar no banco
      for (const arquivo of arquivos) {
        const ext = arquivo.name.split(".").pop();
        const nomeArquivo = `${reviewId}/${Date.now()}-${Math.random()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("fotos_avaliacoes")
          .upload(nomeArquivo, arquivo);

        if (uploadError) throw uploadError;

        const { data: urlPublica } = supabase.storage
          .from("fotos_avaliacoes")
          .getPublicUrl(nomeArquivo);

        const tipo = arquivo.type.startsWith("image")
          ? "image"
          : "video";

        // 3. Inserir na review_media
        const { data: mediaRow, error: mediaError } = await supabase
          .from("review_media")
          .insert({
            review_id: reviewId,
            media_url: urlPublica.publicUrl,
            media_type: tipo
          })
          .select()
          .single();

        if (mediaError) throw mediaError;

        medias.push(mediaRow);
      }

      return { review, medias };

    } catch (err) {
      console.error("ERRO AO CRIAR REVIEW:", err);
      throw err;
    }
  }


  const stars = document.querySelectorAll("#starContainer span");
  const notaInput = document.getElementById("notaReview");

  stars.forEach(star => {
    star.addEventListener("click", () => {
      const nota = star.getAttribute("data-value");
      notaInput.value = nota;

      stars.forEach(s => s.classList.remove("selected"));

      for (let i = 0; i < nota; i++) {
        stars[i].classList.add("selected");
      }
    });

    star.addEventListener("mouseover", () => {
      const hover = star.getAttribute("data-value");
      stars.forEach((s, index) => {
        s.style.color = index < hover ? "#0059ff" : "#ccc";
      });
    });

    star.addEventListener("mouseout", () => {
      stars.forEach((s, index) => {
        s.style.color = s.classList.contains("selected") ? "#0059ff" : "#ccc";
      });
    });
  });


  // ================================
  // PREVIEW DE MÍDIAS
  // ================================
  let arquivosSelecionados = [];

  const inputArquivos = document.getElementById("review-files");
  const previewContainer = document.getElementById("review-preview");

  inputArquivos.addEventListener("change", (e) => {
    const novosArquivos = Array.from(e.target.files);
    arquivosSelecionados.push(...novosArquivos);
    renderPreview();
  });

  function renderPreview() {
    previewContainer.innerHTML = "";

    arquivosSelecionados.forEach((file, index) => {
      const div = document.createElement("div");
      div.className = "review-preview-item";

      const btnRemove = document.createElement("button");
      btnRemove.className = "review-remove";
      btnRemove.innerHTML = "×";
      btnRemove.onclick = () => {
        arquivosSelecionados.splice(index, 1);
        renderPreview();
      };

      div.appendChild(btnRemove);

      if (file.type.startsWith("image")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        div.appendChild(img);
      }
      else if (file.type.startsWith("video")) {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);
        video.controls = true;
        div.appendChild(video);
      }

      previewContainer.appendChild(div);
    });
  }

  function getArquivosSelecionados() {
    return arquivosSelecionados;
  }
  window.getArquivosSelecionados = getArquivosSelecionados;

  // ===================================
  // MÓDULO DE SUMÁRIO DE AVALIAÇÃO
  // ===================================
  async function carregarRatingSummary(productId) {
    const supabase = await initSupabaseClient();

    const { data, error, count } = await supabase
      .from("reviews")
      .select("estrelas", { count: "exact" })
      .eq("product_id", productId);

    if (error || !data) {
      console.error("Erro ao carregar sumário:", error);
      return;
    }

    const totalReviews = count || 0;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;

    data.forEach(review => {
      const estrelas = Number(review.estrelas);
      if (estrelas >= 1 && estrelas <= 5) {
        counts[estrelas]++;
        totalRating += estrelas;
      }
    });

    const avgRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : "0.0";

    const avgRatingEl = document.getElementById("summary-avg-rating");
    const totalReviewsEl = document.getElementById("summary-total-reviews");

    if (avgRatingEl) avgRatingEl.textContent = avgRating;
    if (totalReviewsEl) totalReviewsEl.textContent = `Baseado em ${totalReviews} avaliações`;

    const starsTotalContainer = document.getElementById("summary-stars-total");
    if (starsTotalContainer) {
      let starsHTML = "";
      const avgRounded = Math.round(avgRating);
      for (let i = 1; i <= 5; i++) {
        starsHTML += `<span class="star ${i <= avgRounded ? 'on' : ''}">★</span>`;
      }
      starsTotalContainer.innerHTML = starsHTML;
    }

    for (let i = 1; i <= 5; i++) {
      const num = counts[i];
      const pct = totalReviews > 0 ? (num / totalReviews) * 100 : 0;

      const barEl = document.getElementById(`summary-bar-${i}`);
      const countEl = document.getElementById(`summary-count-${i}`);

      if (barEl) barEl.value = pct;
      if (countEl) countEl.textContent = `(${num})`;
    }
  }

  // ================================
  // LISTAGEM DE REVIEWS (COM PAGINAÇÃO, BYPASS DE JOIN E DELETAR)
  // ================================ 
  async function carregarReviews(productId, page = 1) {
    g_currentPage = page;
    const reviewsContainer = document.getElementById("reviewsList");
    const paginationContainer = document.getElementById("reviewsPagination");

    if (!reviewsContainer || !paginationContainer) return;

    reviewsContainer.innerHTML = `<p>Carregando avaliações...</p>`;
    paginationContainer.innerHTML = "";

    const supabase = await initSupabaseClient();

    // NOVO: Pega o ID do usuário logado uma única vez
    const { data: userSession } = await supabase.auth.getSession();
    const currentUserId = userSession?.session?.user?.id;

    // 1. Calcular o range da paginação
    const from = (page - 1) * REVIEWS_PER_PAGE;
    const to = from + REVIEWS_PER_PAGE - 1;

    // 2. BUSCAR REVIEWS SEM JOIN
    const { data: reviewsData, error, count } = await supabase
      .from("reviews")
      .select(`*`, { count: "exact" })
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Erro ao carregar reviews:", error);
      reviewsContainer.innerHTML = `<p>Erro ao carregar avaliações.</p>`;
      return;
    }

    const totalReviews = count || 0;
    if (totalReviews === 0) {
      reviewsContainer.innerHTML = `<p>Nenhuma avaliação ainda.</p>`;
    }

    // 3. Coletar IDs de usuário e buscar perfis (agora incluindo avatar_url)
    const userIds = reviewsData.map(r => r.user_id).filter(id => id);
    let reviews = reviewsData;

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        // NOVO: Puxando avatar_url
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (profileError) {
        console.warn("Aviso: Falha ao carregar nomes/avatares de usuário.", profileError);
      } else {
        const profileMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = {
            username: profile.username,
            // NOVO: Mapeando avatar_url
            avatar_url: profile.avatar_url
          };
          return acc;
        }, {});

        reviews = reviewsData.map(review => ({
          ...review,
          username: profileMap[review.user_id]?.username,
          // NOVO: Adicionando avatar_url ao objeto review
          avatar_url: profileMap[review.user_id]?.avatar_url
        }));
      }
    }


    reviewsContainer.innerHTML = "";

    // 4. Renderizar reviews
    for (const review of reviews) {
      // Buscar mídias
      const { data: medias } = await supabase
        .from("review_media")
        .select("*")
        .eq("review_id", review.id);

      const div = document.createElement("div");
      div.className = "review-item";

      // --- Estrelas ---
      let estrelasHTML = "";
      for (let i = 0; i < 5; i++) {
        estrelasHTML += `<span class="star ${i < review.estrelas ? "on" : ""}">★</span>`;
      }

      // --- Avatar ---
      const defaultAvatar = 'https://i.ibb.co/L8r4JbN/default-avatar.png'; // Use uma imagem padrão se a URL estiver vazia
      const avatarSrc = review.avatar_url || defaultAvatar;

      // --- Galeria ---
      let galeriaHTML = "";
      if (medias?.length > 0) {
        const swiperId = `swiperReview${review.id}`;
        galeriaHTML = `
  <div class="review-media-gallery">
       <div class="swiper review-swiper" id="${swiperId}">
         <div class="swiper-wrapper">
           ${medias.map(m => {
          if (m.media_type === "image") {
            return `
                 <div class="swiper-slide">
                   <img src="${m.media_url}" alt="foto avaliação">
                 </div>
               `;
          } else {
            return `
                 <div class="swiper-slide">
                   <video src="${m.media_url}" controls></video>
                 </div>
               `;
          }
        }).join("")}
         </div>

         <div class="swiper-pagination"></div> <!-- bullets ficam aqui -->

         <div class="swiper-button-next"></div>
         <div class="swiper-button-prev"></div>
       </div>
   </div>
`;

      }

      const username = review.username || "Usuário Anônimo";

      // NOVO: Botão de Excluir
      const deleteButton =
        currentUserId && currentUserId === review.user_id ?
          `<button class="review-delete-btn" data-review-id="${review.id}">
             <i class="bi bi-trash"></i> Excluir
           </button>` :
          '';

      // --- HTML final ---
      div.innerHTML = `
        <div class="review-header">
          <img class="review-avatar" src="${avatarSrc}" alt="Avatar de ${username}">
          <div class="review-info-group">
            <div class="review-stars">${estrelasHTML}</div>
            <strong class="review-username">${username}</strong>
            <small>${new Date(review.created_at).toLocaleDateString("pt-BR")}</small>
          </div>
        </div>
      <div class="title-coment-block">
        <h4 class="review-title">${review.titulo || ""}</h4>
        <p class="review-text">${review.comentario || ""}</p>
      </div>
        ${galeriaHTML}

        <div class="review-actions">
            ${deleteButton}
        </div>
      `;

      reviewsContainer.appendChild(div);

      // iniciar swiper da avaliação
      // iniciar swiper da avaliação
      if (medias?.length > 0) {
        new Swiper(`#swiperReview${review.id}`, {
          slidesPerView: 2,         // Agora mostra 2 por vez
          spaceBetween: 0,
          loop: medias.length > 1,

          pagination: {
            el: `#swiperReview${review.id} .swiper-pagination`,
            clickable: true,        // Bullets clicáveis
          },

          navigation: {
            nextEl: `#swiperReview${review.id} .swiper-button-next`,
            prevEl: `#swiperReview${review.id} .swiper-button-prev`,
          }
        });
      }

    }

    // 5. Adicionar listener para o botão de exclusão
    document.querySelectorAll('.review-delete-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const reviewIdToDelete = e.currentTarget.getAttribute('data-review-id');
        if (confirm("Tem certeza que deseja apagar esta avaliação?")) {
          try {
            const { error: deleteError } = await supabase
              .from('reviews')
              .delete()
              .eq('id', reviewIdToDelete); // Deleta a review pelo ID

            if (deleteError) {
              // Se for erro de permissão (RLS), o Supabase retorna um erro 406
              if (deleteError.code === 'PGRST406' || deleteError.message.includes('permission')) {
                throw new Error("Você só pode apagar suas próprias avaliações.");
              }
              throw deleteError;
            }

            showToast("Avaliação apagada com sucesso!");
            // Recarrega as reviews para atualizar a lista
            carregarReviews(productId, g_currentPage);
            carregarRatingSummary(productId);

          } catch (err) {
            console.error("Erro ao apagar review:", err);
            showToast(err.message || "Falha ao apagar. Verifique suas permissões.", { duration: 3000 });
          }
        }
      });
    });

    // 6. RENDERIZAR A PAGINAÇÃO
    const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);

    if (totalPages > 1) {
      // Função auxiliar para criar botões de página
      const createPageButton = (pageNumber, text) => {
        const btn = document.createElement("button");
        btn.className = "pagination-number-btn";
        btn.textContent = text || pageNumber;
        btn.onclick = () => carregarReviews(productId, pageNumber);
        if (pageNumber === page) {
          btn.classList.add("active");
          btn.disabled = true;
        }
        return btn;
      };

      // Adiciona botão "Anterior"
      if (page > 1) {
        const prevBtn = document.createElement("button");
        prevBtn.className = "pagination-btn-nav";
        prevBtn.textContent = "« Anterior";
        prevBtn.onclick = () => carregarReviews(productId, page - 1);
        paginationContainer.appendChild(prevBtn);
      }

      const maxPagesToShow = 5; // Mostrar no máximo 5 botões de número
      let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      // Ajuste para garantir que 5 botões sejam sempre mostrados no final
      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      // Se houver mais de 1 página antes do início (mostra 1 + ...)
      if (startPage > 1) {
        paginationContainer.appendChild(createPageButton(1));
        if (startPage > 2) {
          const dots = document.createElement("span");
          dots.textContent = "...";
          dots.className = "pagination-dots";
          paginationContainer.appendChild(dots);
        }
      }

      // Renderiza os números das páginas visíveis
      for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createPageButton(i));
      }

      // Se houver mais de 1 página após o fim (mostra ... + TotalPages)
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          const dots = document.createElement("span");
          dots.textContent = "...";
          dots.className = "pagination-dots";
          paginationContainer.appendChild(dots);
        }
        paginationContainer.appendChild(createPageButton(totalPages));
      }

      // Adiciona botão "Próxima"
      if (page < totalPages) {
        const nextBtn = document.createElement("button");
        nextBtn.className = "pagination-btn-nav";
        nextBtn.textContent = "Próxima »";
        nextBtn.onclick = () => carregarReviews(productId, page + 1);
        paginationContainer.appendChild(nextBtn);
      }
    }
  }


  // ================================
  // ENVIO FINAL DA REVIEW
  // ================================

  document.getElementById("reviewForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("btnEnviarReview");
    const nota = document.getElementById("notaReview").value;
    const titulo = document.getElementById("tituloReview").value.trim();
    const comentario = document.getElementById("comment").value.trim();
    const arquivos = getArquivosSelecionados();

    if (!nota || nota < 1) {
      showToast("Escolha uma nota!", { duration: 2500 });
      return;
    }

    if (!titulo) {
      showToast("Escreva um título!", { duration: 2500 });
      return;
    }
    if (!comentario) {
      showToast("Escreva um comentário!", { duration: 2500 });
    }

    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
      await criarReview({
        productId,
        rating: Number(nota),
        titulo: titulo,
        comentario,
        arquivos
      });

      showToast("Avaliação enviada com sucesso!");

      document.getElementById("notaReview").value = 0;
      document.getElementById("comment").value = "";
      // Limpa os arquivos selecionados
      arquivosSelecionados = [];
      renderPreview();
      // Recarrega a lista
      carregarReviews(productId, 1);
      carregarRatingSummary(productId);

    } catch (err) {
      console.error("Erro detalhado no envio:", err);

      let mensagemErro = err.message || "Ocorreu um erro desconhecido.";
      if (err.message.includes("authenticated")) {
        mensagemErro = "Você precisa estar logado para enviar uma avaliação.";
      }

      showToast(mensagemErro, { duration: 4000 });

    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar";
    }
  });


}); // fim DOMContentLoaded
