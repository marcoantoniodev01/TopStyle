/*
  assets/js/main.js
  VERSÃO COMPLETA ATUALIZADA
  - Inclui Preloader/Intro (com lógica de admin/visitante)
  - Inclui Lógica de Carrinho (addToCart, updateCartCountUI)
  - Inclui Lógica de Admin (modais, Supabase, CRUD)
  - Inclui Lógica de Categoria (Filtros, Grade de 3 Colunas)
*/

/* ============ CONFIG SUPABASE ============ */
const SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';

/* ============ Carrega Supabase UMD (se necessário) ============ */
function loadSupabaseUmdIfNeeded() {
  return new Promise((resolve, reject) => {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      resolve(window.supabase);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
    s.onload = () => {
      if (window.supabase && typeof window.supabase.createClient === 'function') resolve(window.supabase);
      else reject(new Error('Supabase UMD carregado, mas window.supabase não disponível'));
    };
    s.onerror = (e) => reject(new Error('Falha ao carregar Supabase SDK: ' + e.message));
    document.head.appendChild(s);
  });
}

let supabaseClient = null;
async function initSupabaseClient() {
  if (!supabaseClient) {
    await loadSupabaseUmdIfNeeded();
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}
// Exporta globalmente para auth.js poder usar
window.initSupabaseClient = initSupabaseClient;

/* ============ MODAL DE CONFIRMAÇÃO CUSTOMIZADO ============ */
/**
 * Exibe um modal de confirmação customizado.
 * @param {string} message A mensagem a ser exibida.
 * @param {object} options Opções como texto dos botões.
 * @returns {Promise<boolean>} Retorna true se confirmado, false se cancelado.
 */
function showConfirmationModal(message, { okText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
  return new Promise(resolve => {
    // Remove qualquer modal existente para evitar sobreposição
    const existingModal = document.querySelector('.confirm-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'confirm-overlay';

    modalOverlay.innerHTML = `
            <div class="confirm-box">
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="confirm-button-cancel">${cancelText}</button>
                    <button class="confirm-button-ok">${okText}</button>
                </div>
            </div>
        `;

    const btnOk = modalOverlay.querySelector('.confirm-button-ok');
    const btnCancel = modalOverlay.querySelector('.confirm-button-cancel');

    const closeModal = (result) => {
      modalOverlay.classList.remove('visible');
      modalOverlay.addEventListener('transitionend', () => {
        modalOverlay.remove();
        resolve(result);
      }, { once: true });
    };

    btnOk.addEventListener('click', () => closeModal(true));
    btnCancel.addEventListener('click', () => closeModal(false));
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal(false);
      }
    });

    document.body.appendChild(modalOverlay);

    // Adiciona um pequeno delay para a animação de entrada funcionar
    requestAnimationFrame(() => {
      modalOverlay.classList.add('visible');
    });
  });
}
// Anexa a função à janela para que carrinho.js possa usá-la
window.showConfirmationModal = showConfirmationModal;


/* ============ Helpers DOM e formatação ============ */
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function formatPriceBR(num) {
  if (num == null) return 'R$ 0,00';
  const n = Number(num);
  if (Number.isNaN(n)) return 'R$ 0,00';
  const parts = n.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${intPart},${parts[1]}`;
}

/* ============ Carrinho / Cupom (localStorage) ============ */
const CART_KEY = 'topstyle_cart_v1';
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function dispatchCartUpdated() { document.dispatchEvent(new Event('cart-updated')); }
function updateCartCountUI() { const el = qs('#cart-count'); if (!el) return; const total = getCart().reduce((s, it) => s + (it.quantity || 1), 0); el.textContent = total; el.style.display = total > 0 ? 'flex' : 'none'; }

function showToast(message, { duration = 2000 } = {}) {
  let toast = qs('#topstyle-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'topstyle-toast';
    toast.style.position = 'fixed';
    let topOffset = 20; // Um valor padrão (fallback)
    const header = document.getElementById('header');
    if (header) {
      // Pega a posição exata da PARTE DE BAIXO do header na tela
      const headerBottom = header.getBoundingClientRect().bottom;
      topOffset = headerBottom + 10; // Posiciona 10px abaixo do header
    }
    toast.style.top = `${topOffset}px`;
    toast.style.right = '20px';
    toast.style.zIndex = 999999;
    document.body.appendChild(toast);
  }

  const el = document.createElement('div');
  el.className = 'topstyle-toast-item';
  el.textContent = message;
  el.style.marginBottom = '10px';
  el.style.padding = '10px 14px';
  el.style.background = 'rgba(0,0,0,0.85)';
  el.style.color = '#fff';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
  el.style.transform = 'translateY(-10px)';
  el.style.opacity = '0';
  el.style.transition = 'transform .25s ease, opacity .25s ease';
  toast.appendChild(el);

  requestAnimationFrame(() => {
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  });

  setTimeout(() => {
    el.style.transform = 'translateY(-10px)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}
// Exporta globalmente para auth.js poder usar
window.showToast = showToast;


async function addToCart(item) {
  try {
    const supabase = await initSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Verifica se está logado
    if (!user) {
      showToast('Faça login para adicionar itens ao carrinho.', { duration: 3000 });
      // Opcional: window.location.href = 'login.html';
      return;
    }

    // Normaliza os dados do item vindo do clique
    const newItem = {
      user_id: user.id,
      product_id: item.productId || item.id || item.product_id,
      nome: item.nome || item.name,
      price: Number(item.price || item.preco),
      size: item.size || 'U',
      color: item.color || item.colorName || 'Padrão',
      img: item.img || item.imgUrl || '',
      quantity: item.quantity || 1
    };

    // 2. Verifica se o item JÁ existe no banco (para somar quantidade)
    // Usamos a combinação user + produto + tamanho + cor
    const { data: existingItem, error: fetchError } = await supabase
      .from('user_cart_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', newItem.product_id)
      .eq('size', newItem.size)
      .eq('color', newItem.color)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let resultError;

    if (existingItem) {
      // CENÁRIO A: Já existe -> UPDATE (Soma quantidade)
      const newQuantity = existingItem.quantity + newItem.quantity;
      const { error } = await supabase
        .from('user_cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id);
      resultError = error;
    } else {
      // CENÁRIO B: Não existe -> INSERT (Novo item)
      const { error } = await supabase
        .from('user_cart_items')
        .insert(newItem);
      resultError = error;
    }

    if (resultError) throw resultError;

    // Sucesso
    showToast(`${newItem.nome} (${newItem.size}/${newItem.color}) adicionado!`, { duration: 1500 });

    // Atualiza o contador visualmente disparando um evento ou buscando novamente
    // Como estamos no main.js e o contador pode estar no header:
    const cartIcon = document.querySelector('.cart-icon');
    if (cartIcon) {
        cartIcon.classList.add('cart-bounce');
        setTimeout(() => cartIcon.classList.remove('cart-bounce'), 500);
    }
    
    // Atualiza o número no ícone (faz um count rápido)
    const { data: cartData } = await supabase.from('user_cart_items').select('quantity');
    if(cartData) {
        const total = cartData.reduce((acc, i) => acc + i.quantity, 0);
        const countEl = document.querySelector('#cart-count');
        if(countEl) {
             countEl.textContent = total;
             countEl.style.display = total > 0 ? 'flex' : 'none';
        }
    }

  } catch (err) {
    console.error('addToCart Error:', err);
    showToast('Erro ao adicionar: ' + err.message, { duration: 2500 });
  }
}

/* ============ Interações do Produto (Hover, Cores, Tamanhos) ============ */
function prepareProductHoverAndOptions() {
  qsa('.product').forEach(product => {

    // 1. VERIFICA SE A FUNÇÃO JÁ FOI ANEXADA
    if (product.__hoverListenersAttached) {
      return; // Pula este produto, já está pronto
    }
    // 2. MARCA O PRODUTO COMO "PRONTO"
    product.__hoverListenersAttached = true;

    const textEl = product.querySelector('.product-text');
    const titleEl = product.querySelector('.product-title');
    const priceEl = product.querySelector('.product-price');
    const imgEl = product.querySelector('.product-link img');
    const optionsContainer = product.querySelector('.product-options');

    const originalImgSrc = imgEl ? imgEl.src : '';

    product.addEventListener('mouseenter', () => {
      const role = localStorage.getItem('userRole') || 'cliente';
      const meta = product.__productMeta || {};

      if (role === 'admin') {
        if (textEl && !textEl.querySelector('.admin-edit-btn')) {
          textEl.dataset.originalHtml = textEl.innerHTML;
          textEl.innerHTML = '';
          const btn = document.createElement('button');
          btn.className = 'admin-edit-btn';
          btn.textContent = 'Editar';
          btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openEditModalForProduct(product); };
          textEl.appendChild(btn);
        }
        return;
      }

      if (titleEl) titleEl.style.display = 'none';
      if (priceEl) priceEl.style.display = 'none';
      if (optionsContainer) optionsContainer.style.display = 'flex';

      const colorsDiv = optionsContainer.querySelector('.colors');
      const sizesDiv = optionsContainer.querySelector('.sizes');
      colorsDiv.innerHTML = '';
      sizesDiv.innerHTML = '';

      const cores = meta.cores || [];
      let selectedColorMeta = product.__selectedColorMeta || (cores.length > 0 ? cores[0] : { img1: originalImgSrc });

      if (cores.length > 0) {
        cores.forEach(cor => {
          const sw = document.createElement('button');
          sw.type = 'button';
          sw.className = 'color-swatch';
          sw.title = cor.nome || '';
          if (cor.img1) {
            sw.style.backgroundImage = `url('${cor.img1}')`;
            sw.style.backgroundSize = 'cover';
          } else {
            sw.style.background = '#ccc';
          }
          if (selectedColorMeta && cor.nome === selectedColorMeta.nome) {
            sw.classList.add('active');
          }

          sw.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedColorMeta = cor;
            product.__selectedColorMeta = cor;

            if (imgEl && cor.img2) {
              imgEl.src = cor.img2;
            } else if (imgEl && cor.img1) {
              imgEl.src = cor.img1;
            }
            colorsDiv.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
            sw.classList.add('active');
          });
          colorsDiv.appendChild(sw);
        });
      }

      const tamanhos = (meta.tamanhos || '').split(',').map(s => s.trim()).filter(Boolean);
      if (tamanhos.length > 0) {
        tamanhos.forEach(size => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'size-btn';
          btn.textContent = size;
          btn.addEventListener('click', (e) => {
            e.preventDefault(); // Previne clique no link <a>
            e.stopPropagation(); // Previne 'mouseenter'
            addToCart({
              productId: meta.id,
              nome: meta.nome,
              price: meta.preco,
              size: size,
              color: selectedColorMeta ? selectedColorMeta.nome : '',
              img: selectedColorMeta?.img1 || originalImgSrc
            });
          });
          sizesDiv.appendChild(btn);
        });
      }

      const hoverImg = selectedColorMeta?.img2 || '';
      if (imgEl && hoverImg) {
        imgEl.src = hoverImg;
      }
    });

    product.addEventListener('mouseleave', () => {
      const role = localStorage.getItem('userRole') || 'cliente';
      if (role === 'admin') {
        if (textEl && textEl.dataset.originalHtml) {
          textEl.innerHTML = textEl.dataset.originalHtml;
          delete textEl.dataset.originalHtml;
          textEl.style.justifyContent = '';
          textEl.style.display = '';
          textEl.style.alignItems = '';
        }
        return;
      }

      if (titleEl) titleEl.style.display = '';
      if (priceEl) priceEl.style.display = '';
      if (optionsContainer) optionsContainer.style.display = 'none';

      const selectedColorMeta = product.__selectedColorMeta;
      if (imgEl) {
        if (selectedColorMeta && selectedColorMeta.img1) {
          imgEl.src = selectedColorMeta.img1;
        } else {
          imgEl.src = originalImgSrc;
        }
      }
    });
  });
}


/* ============ Renderização de Produtos do Supabase ============ */
async function fetchProductsFromDB(filters = {}) {
  try {
    const supabase = await initSupabaseClient();
    let query = supabase.from('products').select('*');

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.gender) {
      query = query.eq('gender', filters.gender);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('fetchProductsFromDB error', err);
    return [];
  }
}

function ensureSlotIds() {
  const slots = qsa('.product-slot');
  let next = 1;
  slots.forEach(s => {
    if (!s.dataset.slot) { // Apenas se não tiver um
      s.dataset.slot = String(next++);
    }
  });
}

function renderProductInSlot(slotEl, productData) {
  slotEl.innerHTML = '';
  const product = document.createElement('div');
  product.className = 'product';
  product.dataset.id = productData.id;
  product.dataset.tamanhos = productData.tamanhos || '';

  const mainImage = (productData.cores && productData.cores[0]?.img1) || productData.img || 'https://placehold.co/400x600/eee/ccc?text=Produto';

  product.innerHTML = `
      <a class="product-link" href="Blusa-modelo02.html?id=${productData.id}">
        <img src="${mainImage}" alt="${productData.nome}">
      </a>
      <div class="product-text">
        <p class="product-title">${productData.nome.toUpperCase()}</p>
        <p class="product-price">${formatPriceBR(productData.preco)}</p>
        <div class="product-options" style="display:none;">
          <div class="colors"></div>
          <div class="sizes"></div>
        </div>
      </div>`;

  product.__productMeta = productData;
  slotEl.appendChild(product);
}

function renderAddButtonInSlot(slotEl, slotId) {
  slotEl.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'add-product-btn';
  btn.textContent = '+ Adicionar Produto';
  btn.onclick = () => openAddProductModal(slotId);
  slotEl.appendChild(btn);
}

/* ============ Helpers do Modal de Admin (NOVO) ============ */

/** Mostra o modal e trava o scroll da página */
function showAdminModal(modal) {
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // <-- TRAVA O SCROLL
  }
}

/** Esconde o modal e libera o scroll da página */
function hideAdminModal(modal) {
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // <-- LIBERA O SCROLL
  }
}


/* ============ Lógica do Modal de Admin (Adicionar/Editar/Excluir) ============ */
async function deleteProductFromDB(productId) {
  if (!productId) {
    showToast('ID do produto não encontrado para exclusão.', { duration: 2500 });
    return false;
  }
  try {
    const supabase = await initSupabaseClient();
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    showToast('Erro ao excluir produto: ' + err.message, { duration: 2500 });
    return false;
  }
}

function createColorRow(color = {}) {
  const row = document.createElement('div');
  row.className = 'color-row';
  row.style.display = 'flex';
  row.style.gap = '5px';
  row.style.marginBottom = '5px';
  row.innerHTML = `
    <input type="text" placeholder="Nome (ex: Preto)" value="${color.nome || ''}" style="flex:1;">
    <input type="text" placeholder="URL Imagem Principal" value="${color.img1 || ''}" style="flex:2;">
    <input type="text" placeholder="URL Imagem Hover (Opcional)" value="${color.img2 || ''}" style="flex:2;">
    <button type="button" class="remove-color-btn" style="padding: 0 8px;">&times;</button>
  `;
  row.querySelector('.remove-color-btn').onclick = () => row.remove();

  row.getColorObject = () => {
    const inputs = row.querySelectorAll('input');
    return {
      nome: inputs[0].value.trim(),
      img1: inputs[1].value.trim(),
      img2: inputs[2].value.trim()
    };
  };
  return row;
}


/* ============ LÓGICA DE CATEGORIAS (NOVO) ============ */

// Busca todas as categorias do banco
async function fetchCategoriesFromDB() {
  try {
    const supabase = await initSupabaseClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    showToast('Erro ao carregar categorias.');
    return [];
  }
}

// Preenche um elemento <select> com as categorias
async function populateCategorySelect(selectElement, selectedValue = null) {
  selectElement.innerHTML = '<option value="">Carregando...</option>';
  
  const categories = await fetchCategoriesFromDB();
  
  selectElement.innerHTML = '<option value="">Selecione uma categoria</option>';
  
  categories.forEach(cat => {
    const option = document.createElement('option');
    // IMPORTANTE: Seu banco 'products' usa o NOME da categoria na coluna 'category', 
    // então o value deve ser o name, não o ID, para bater com seus triggers.
    option.value = cat.name; 
    option.textContent = cat.name.charAt(0).toUpperCase() + cat.name.slice(1); // Capitaliza
    
    if (selectedValue && (cat.name === selectedValue || cat.id === selectedValue)) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });

  return categories;
}

// Modal Específico para Gerenciar (Criar/Excluir) Categorias
function openCategoryManagerModal() {
  let modal = qs('#category-manager-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'category-manager-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <h2>Gerenciar Categorias</h2>
      
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <input type="text" id="new-cat-name" placeholder="Nova Categoria (ex: Jaquetas)" style="flex: 1;">
        <button id="btn-add-cat" style="background: #000; color: #fff;">Adicionar</button>
      </div>

      <div id="cat-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px;">
        Carregando...
      </div>

      <div class="modal-actions" style="margin-top: 20px;">
        <button id="btn-close-cat-modal">Fechar</button>
      </div>
    </div>
  `;

  showAdminModal(modal);

  const renderList = async () => {
    const listEl = modal.querySelector('#cat-list');
    listEl.innerHTML = 'Atualizando...';
    const cats = await fetchCategoriesFromDB();
    listEl.innerHTML = '';
    
    if(cats.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#999;">Nenhuma categoria encontrada.</p>';
        return;
    }

    cats.forEach(cat => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px';
      row.style.borderBottom = '1px solid #f0f0f0';
      
      row.innerHTML = `
        <span>${cat.name}</span>
        <button class="delete-cat-btn" style="background: #dc3545; color: white; padding: 4px 8px; font-size: 12px;">Excluir</button>
      `;
      
      // Botão Excluir Categoria
      row.querySelector('.delete-cat-btn').onclick = async () => {
        if(!confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`)) return;
        
        const supabase = await initSupabaseClient();
        const { error } = await supabase.from('categories').delete().eq('id', cat.id);
        
        if (error) {
            showToast('Erro ao excluir: ' + error.message);
        } else {
            showToast('Categoria excluída!');
            renderList(); // Recarrega a lista
        }
      };
      
      listEl.appendChild(row);
    });
  };

  // Botão Adicionar Categoria
  modal.querySelector('#btn-add-cat').onclick = async () => {
    const input = modal.querySelector('#new-cat-name');
    const name = input.value.trim().toLowerCase(); // Salva em minúsculo para padronizar
    if (!name) return showToast('Digite um nome para a categoria.');

    const supabase = await initSupabaseClient();
    const { error } = await supabase.from('categories').insert([{ name: name }]);

    if (error) {
        // Erro comum: violação de unique (nome duplicado)
        showToast('Erro: ' + error.message);
    } else {
        showToast('Categoria criada!');
        input.value = '';
        renderList();
    }
  };

  modal.querySelector('#btn-close-cat-modal').onclick = () => {
    hideAdminModal(modal);
    // Dispara evento para atualizar os selects dos outros modais se estiverem abertos
    document.dispatchEvent(new Event('categories-updated'));
  };

  renderList();
}


function openAddProductModal(slotId) {
  let modal = qs('#admin-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.__targetSlotId = slotId; // Armazena o slot alvo no modal

  modal.innerHTML = `
    <div class="modal-content">
      <h2 id="modal-title">Adicionar Produto (Slot ${slotId})</h2>
      
      <div id="reusable-product-section">
        <label>Reusar produto existente (opcional):</label>
        <select id="modal-existing-select" style="width: 100%; margin-bottom: 10px;">
          <option value="">-- Criar novo produto --</option>
        </select>
      </div>

      <label>Título:</label>
      <input type="text" id="modal-title-input">
      <label>Preço:</label>
      <input type="text" id="modal-price-input" placeholder="Ex: 139.99">
      <label for="modal-category-input">Categoria:</label>
      <select id="modal-category-input">
        <option value="camisa">Camisa</option>
        <option value="short">Short</option>
        <option value="calca">Calça</option>
        <option value="moletom">Moletom</option>
        <option value="bone">Boné</option>
        <option value="outros">Outros</option>
      </select>
      <label for="modal-gender-input">Gênero:</label>
      <select id="modal-gender-input">
        <option value="F">Feminino</option>
        <option value="M">Masculino</option>
        <option value="U" selected>Unissex</option>
      </select>
      <label>Imagem Padrão (se não houver cores):</label>
      <input type="text" id="modal-img-input">
      <label>Tamanhos (separados por vírgula):</label>
      <input type="text" id="modal-sizes-input" placeholder="P,M,G,GG">

      <label>Descrição:</label>
      <textarea id="modal-description-input" style="min-height: 80px;" placeholder="Descrição detalhada do produto..."></textarea>
      <label>Informações Complementares:</label>
      <textarea id="modal-additional-info-input" style="min-height: 60px;" placeholder="Ex: Composição 100% algodão, etc..."></textarea>
      <label>Cores:</label>
      <div id="modal-colors-container"></div>
      <button type="button" id="modal-add-color-btn" style="margin-top: 5px;">+ Adicionar Cor</button>
      <div class="modal-actions">
        <button id="modal-cancel">Cancelar</button>
        <button id="modal-save">Salvar</button>
      </div>
    </div>`;

  const isCategoryPage = !!(document.body.dataset.category || window.location.pathname.match(/(camisas|shorts|calcas|moletons|bones|categoria)\.html/));
  if (isCategoryPage) {
    qs('#reusable-product-section').style.display = 'none';
  }


  (async () => {
    try {
      const supabase = await initSupabaseClient();
      const { data } = await supabase.from('products').select('id,nome,category').order('created_at', { ascending: false });
      const existingSelect = qs('#modal-existing-select');
      if (data && data.length) {
        data.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = `${p.nome} (${p.category || 'sem categoria'})`;
          existingSelect.appendChild(opt);
        });
      }
    } catch (e) { console.warn('Não foi possível carregar produtos existentes', e); }
  })();

  qs('#modal-existing-select').addEventListener('change', async (e) => {
    const id = e.target.value;
    const isNew = !id;
    // ATUALIZADO: Adicionado os novos textareas ao seletor
    qsa('#modal-title-input, #modal-price-input, #modal-img-input, #modal-sizes-input, #modal-category-input, #modal-gender-input, #modal-add-color-btn, #modal-description-input, #modal-additional-info-input').forEach(el => el.disabled = !isNew);
    qs('#modal-colors-container').style.pointerEvents = isNew ? 'auto' : 'none';

    if (isNew) {
      qs('#modal-title-input').value = '';
      qs('#modal-price-input').value = '';
      qs('#modal-img-input').value = '';
      qs('#modal-sizes-input').value = '';
      qs('#modal-description-input').value = ''; // <-- Limpa o novo campo
      qs('#modal-additional-info-input').value = ''; // <-- Limpa o novo campo
      qs('#modal-colors-container').innerHTML = '';
      qs('#modal-colors-container').appendChild(createColorRow());
    }
  });


  showAdminModal(modal); // <-- MODIFICADO

  const colorsContainer = modal.querySelector('#modal-colors-container');
  colorsContainer.appendChild(createColorRow());
  modal.querySelector('#modal-add-color-btn').onclick = () => colorsContainer.appendChild(createColorRow());
  modal.querySelector('#modal-cancel').onclick = () => hideAdminModal(modal); // <-- MODIFICADO
  modal.querySelector('#modal-save').onclick = async () => {
    const supabase = await initSupabaseClient();
    const existingProductId = qs('#modal-existing-select').value;
    const targetSlotId = modal.__targetSlotId;

    if (existingProductId) {
      if (qsa(`.product[data-id="${existingProductId}"]`).length > 0) {
        return showToast('Este produto já está na página.', { duration: 2500 });
      }

      try {
        await supabase.from('products').update({ slot: null, updated_at: new Date() }).eq('slot', targetSlotId);
        const { error } = await supabase.from('products').update({ slot: targetSlotId, updated_at: new Date() }).eq('id', existingProductId);
        if (error) throw error;

        showToast('Produto vinculado com sucesso!');
        hideAdminModal(modal); // <-- MODIFICADO
        await applyProductsFromDBToDOM();
      } catch (err) {
        console.error('Erro ao vincular produto:', err);
        showToast('Erro ao vincular produto: ' + err.message, { duration: 2500 });
      }
      return;
    }

    const nomeProduto = qs('#modal-title-input').value.trim();
    if (!nomeProduto) return showToast('O título é obrigatório.');

    const generatedId = nomeProduto.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50) + '-' + Date.now();
    const isHomepageSlot = Number.isInteger(parseInt(targetSlotId));

    const newProduct = {
      id: generatedId,
      nome: nomeProduto,
      preco: parseFloat(qs('#modal-price-input').value.replace(',', '.')) || 0,
      img: qs('#modal-img-input').value.trim(),
      tamanhos: qs('#modal-sizes-input').value.trim(),
      description: qs('#modal-description-input').value.trim(), // <-- NOVO CAMPO
      additional_info: qs('#modal-additional-info-input').value.trim(), // <-- NOVO CAMPO
      cores: qsa('.color-row').map(row => row.getColorObject()).filter(c => c.nome && c.img1),
      slot: isHomepageSlot ? parseInt(targetSlotId) : null,
      category: qs('#modal-category-input').value,
      gender: qs('#modal-gender-input').value
    };

    try {
      const { error } = await supabase.from('products').insert([newProduct]);
      if (error) throw error;

      showToast('Produto adicionado com sucesso!');
      hideAdminModal(modal); // <-- MODIFICADO
      await applyProductsFromDBToDOM();
    } catch (err) {
      console.error('Erro ao adicionar produto:', err);
      showToast('Erro ao adicionar produto: ' + err.message, { duration: 2500 });
    }
  };
}

function openEditModalForProduct(productNode) {
  const meta = productNode.__productMeta;
  if (!meta) return showToast('Dados do produto não encontrados.');

  let modal = qs('#admin-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  // HTML ATUALIZADO COM O CAMPO DINÂMICO E BOTÃO
  modal.innerHTML = `
    <div class="modal-content">
      <h2 id="modal-title">Editar Produto</h2>
      <label>Título:</label>
      <input type="text" id="modal-title-input" value="${meta.nome || ''}">
      <label>Preço:</label>
      <input type="text" id="modal-price-input" value="${meta.preco || ''}">
      
      <label for="modal-category-input">Categoria:</label>
      <div style="display: flex; gap: 8px; align-items: center;">
          <select id="modal-category-input" style="flex: 1;">
             </select>
          <button type="button" id="btn-manage-cats-edit" title="Gerenciar Categorias" style="padding: 10px; background: #333; color: #fff;">
            <i class="ri-settings-3-line"></i> ⚙️
          </button>
      </div>

      <label for="modal-gender-input">Gênero:</label>
      <select id="modal-gender-input">
        <option value="F">Feminino</option>
        <option value="M">Masculino</option>
        <option value="U">Unissex</option>
      </select>
      
      <label>Imagem Padrão:</label>
      <input type="text" id="modal-img-input" value="${meta.img || ''}">
      <label>Tamanhos (separados por vírgula):</label>
      <input type="text" id="modal-sizes-input" value="${meta.tamanhos || ''}">
      <label>Descrição:</label>
      <textarea id="modal-description-input" style="min-height: 80px;">${meta.description || ''}</textarea>
      <label>Infos:</label>
      <textarea id="modal-additional-info-input" style="min-height: 60px;">${meta.additional_info || ''}</textarea>
      
      <label>Cores:</label>
      <div id="modal-colors-container"></div>
      <button type="button" id="modal-add-color-btn" style="margin-top: 5px;">+ Adicionar Cor</button>
      
      <div class="modal-actions" style="flex-wrap: wrap;">
        <button id="modal-delete" style="background-color: #dc3545; color: white;">Excluir Produto</button>
        <button id="modal-remove-link" style="background-color: #ffc107; color: black;">Remover da Página</button>
        <button id="modal-cancel">Cancelar</button>
        <button id="modal-save">Salvar Alterações</button>
      </div>
    </div>`;

  // DEFINE OS VALORES INICIAIS
  qs('#modal-gender-input').value = meta.gender || 'U';
  
  // POPULA O SELECT DE CATEGORIA E SELECIONA A ATUAL
  const catSelect = qs('#modal-category-input');
  // Passamos 'meta.category' como segundo argumento para ele já vir selecionado
  populateCategorySelect(catSelect, meta.category);

  // BOTÃO DE GERENCIAR
  qs('#btn-manage-cats-edit').onclick = () => {
    openCategoryManagerModal();
  };
  
  document.addEventListener('categories-updated', () => {
    // Tenta manter a seleção atual se possível, senão volta pro meta ou vazio
    const currentVal = catSelect.value || meta.category;
    populateCategorySelect(catSelect, currentVal);
  });

  showAdminModal(modal);

  // ... (Mantenha todo o resto da lógica original: coresContainer, delete logic, remove-link logic, save logic) ...
  // No modal.querySelector('#modal-save').onclick, apenas certifique-se que category está pegando do select:
  // category: qs('#modal-category-input').value,

  const colorsContainer = modal.querySelector('#modal-colors-container');
  if (meta.cores && meta.cores.length > 0) {
    meta.cores.forEach(cor => colorsContainer.appendChild(createColorRow(cor)));
  } else {
    colorsContainer.appendChild(createColorRow());
  }
  
  modal.querySelector('#modal-add-color-btn').onclick = () => colorsContainer.appendChild(createColorRow());
  modal.querySelector('#modal-cancel').onclick = () => hideAdminModal(modal);
  
  // ... Copie o resto da lógica dos botões Excluir/Remover/Salvar do seu arquivo original ...
  // Certifique-se que o objeto no Salvar está pegando a categoria do novo ID
  modal.querySelector('#modal-save').onclick = async () => {
    const productUpdate = {
        // ... outros campos ...
        nome: qs('#modal-title-input').value.trim(),
        preco: parseFloat(qs('#modal-price-input').value.replace(',', '.')) || 0,
        img: qs('#modal-img-input').value.trim(),
        tamanhos: qs('#modal-sizes-input').value.trim(),
        description: qs('#modal-description-input').value.trim(),
        additional_info: qs('#modal-additional-info-input').value.trim(),
        cores: qsa('.color-row').map(row => row.getColorObject()).filter(c => c.nome && c.img1),
        
        category: qs('#modal-category-input').value, // <--- IMPORTANTE: Pegar do select
        gender: qs('#modal-gender-input').value,
        updated_at: new Date()
    };
    
    // ... resto da função de salvar ...
     if (!productUpdate.nome) return showToast('O título é obrigatório.');

    try {
      const supabase = await initSupabaseClient();
      const { error } = await supabase.from('products').update(productUpdate).eq('id', meta.id);
      if (error) throw error;

      showToast('Produto atualizado com sucesso!');
      hideAdminModal(modal);
      await applyProductsFromDBToDOM();
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      showToast('Erro ao atualizar produto: ' + err.message, { duration: 2500 });
    }
  };
  
  // ... logica de remover e excluir também ...
   modal.querySelector('#modal-remove-link').onclick = async () => {
       /* copie sua logica original aqui */
       // ...
   };
   
   modal.querySelector('#modal-delete').onclick = async () => {
       /* copie sua logica original aqui */
       // ...
   };
}

/* ============ Header e UI ============ */
function initHeaderAndUIInteractions() {
  const navToggle = qs('#nav-toggle'), navMenu = qs('#nav-menu'), navClose = qs('#nav-close');
  if (navToggle && navMenu) navToggle.addEventListener('click', () => navMenu.classList.add('show'));
  if (navClose && navMenu) navClose.addEventListener('click', () => navMenu.classList.remove('show'));

  const header = qs('#header'), progress = qs('.progress-bar'), scrollUp = qs('#scroll-up');
  window.addEventListener('scroll', () => {
    if (!document.body.classList.contains('com-intro')) {
      const sc = window.scrollY;
      if (header) sc > 50 ? header.classList.add('bg-header') : header.classList.remove('bg-header');
      if (progress) {
        const h = document.documentElement;
        const pct = (h.scrollTop || document.body.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
        progress.style.width = `${pct}%`;
      }
      if (scrollUp) window.scrollY >= 560 ? scrollUp.classList.add('show-scroll') : scrollUp.classList.remove('show-scroll');
    }
  });

  const elements = document.querySelectorAll('.hidden');
  if (elements.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
        }
      });
    }, { threshold: 0.1 });
    elements.forEach(el => observer.observe(el));
  }
}

/*=============== PRELOADER + INTRO ===============*/
// (Função original de 'main.js' - runIntro)
// ATUALIZADA COM A LÓGICA DE "DERRETIMENTO"
function runIntro() {
  const intro = document.getElementById("intro");
  const skipBtn = document.getElementById("skip-intro-btn"); // Pega o botão
  let tl; // Define a timeline

  if (!intro) {
    document.body.style.overflow = "auto";
    return;
  }

  // Função única para finalizar a animação (seja pulando ou terminando)
  const finishIntro = () => {
    // Evita chamadas múltiplas
    if (intro.classList.contains('is-melting')) return;

    if (tl) tl.kill(); // Mata a timeline do GSAP se estiver rodando

    // Garante que qualquer animação pendente no intro seja morta
    gsap.killTweensOf("#intro");

    // Esconde o botão para não atrapalhar a transição
    if (skipBtn) skipBtn.style.display = 'none';

    // Adiciona a classe que dispara a transição de "derretimento" no CSS
    intro.classList.add('is-melting');

    // Adiciona um listener para QUANDO a transição CSS terminar
    intro.addEventListener('transitionend', () => {
      // Só agora podemos esconder o elemento e restaurar o scroll
      intro.style.display = "none";
      document.body.style.overflow = "auto";
      document.body.classList.remove('com-intro');
      sessionStorage.setItem("introShown", "true"); // Marca que a intro já foi vista
    }, { once: true }); // { once: true } remove o listener após ser usado
  };

  // Adiciona o listener ao botão Pular
  if (skipBtn) {
    skipBtn.addEventListener('click', finishIntro, { once: true });
  }

  // splitLetters é chamada em handlePreloaderAndIntro agora
  gsap.set(".intro-mask.top", { yPercent: 0 });
  gsap.set(".intro-mask.bottom", { yPercent: 0 });
  gsap.set(".intro-text, .intro-text-top", { opacity: 1, y: 0 });
  gsap.set(".intro-text span, .intro-text-top span", { y: 100, opacity: 0 });

  // Popula a timeline
  tl = gsap.timeline({ defaults: { ease: "power4.out" } });

  tl.to(".intro-mask.top", { yPercent: -70, duration: 2, ease: "power3.out" }, 0)
    .to(".intro-mask.bottom", { yPercent: 70, duration: 2, ease: "power3.out" }, 0)
    .to(".intro-mask.top", { yPercent: -100, duration: 2, ease: "power1.inOut" })
    .to(".intro-mask.bottom", { yPercent: 100, duration: 2, ease: "power1.inOut" }, "<");

  const texts = document.querySelectorAll(".intro-text");
  texts.forEach((el, i) => {
    const letters = el.querySelectorAll("span");
    const delay = i * 1.5 + 0.5;

    tl.to(letters, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 }, delay);
    tl.to(letters, { opacity: 0, y: -100, duration: 0.6, stagger: 0.05 }, delay + 0.8);
  });

  const lastExit = (texts.length - 1) * 1.5 + 1.3;
  const topStyleDelay = lastExit + 0.5;

  const topStyleLetters = document.querySelectorAll(".intro-text-top span");
  tl.to(topStyleLetters, {
    opacity: 1,
    y: 0,
    duration: 1,
    stagger: 0.05
  }, topStyleDelay);

  // tl.to({}, { duration: 0.1 }); // Removido

  // REMOVIDA a animação de fade-out padrão
  // tl.to("#intro", {
  //   opacity: 0,
  //   duration: 0.8,
  //   onComplete: finishIntro
  // });

  // ADICIONADO: Chamar a função finishIntro 0.5s após a última animação
  tl.call(finishIntro, [], ">+0.5");
}


// (Função original de 'main.js' - splitLetters)
function splitLetters(selector) {
  document.querySelectorAll(selector).forEach(el => {
    const text = el.textContent.trim();
    el.innerHTML = '';
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      if (char === ' ') span.style.display = "inline";
      el.appendChild(span);
    });
  });
}

/* =========================================================
   LÓGICA DE PRELOADER (Conforme solicitado)
  ========================================================= 
*/
function handlePreloaderAndIntro() {
  const minPreloaderTime = 3000; // 3 segundos conforme solicitado
  const preloader = document.getElementById('preloader');
  const intro = document.getElementById('intro');
  const body = document.body;
  const role = localStorage.getItem('userRole');
  const introAlreadyShown = sessionStorage.getItem('introShown');

  const isAdminOrReturnVisit = role === 'admin' || introAlreadyShown;

  if (isAdminOrReturnVisit) {
    // Admin ou Visita de Retorno: Mostrar preloader, esconder no 'load' (sem tempo mínimo)
    if (intro) intro.style.display = 'none';
    body.style.overflow = 'auto';
    body.classList.remove('com-intro');

    if (preloader) {
      window.addEventListener('load', () => {
        preloader.classList.add('hidden');
      }, { once: true });
    }

    // Sair para não executar a lógica de primeira visita
    return;
  }

  // Lógica da Primeira Visita (sem admin, sem session storage)
  if (body.classList.contains('com-intro')) {
    body.style.overflow = 'hidden';
  }

  let pageLoaded = false;
  let minTimeElapsed = false;

  const hidePreloaderAndRunIntro = () => {
    // Só executa quando AMBOS (tempo e load) estiverem concluídos
    if (!pageLoaded || !minTimeElapsed) return;

    if (preloader) preloader.classList.add('hidden');

    if (intro) {
      intro.style.display = 'flex';

      if (typeof splitLetters === 'function') {
        splitLetters(".intro-text, .intro-text-top");
      } else {
        console.warn('Função splitLetters não encontrada.');
      }

      if (typeof runIntro === 'function' && window.gsap) {
        runIntro(); // runIntro agora cuida de esconder a intro, liberar o scroll E setar o sessionStorage
      } else {
        console.warn('GSAP ou runIntro não encontrados. Usando fallback.');
        // Fallback caso GSAP falhe
        setTimeout(() => {
          if (intro) intro.style.display = 'none';
          body.style.overflow = 'auto';
          body.classList.remove('com-intro');
          sessionStorage.setItem("introShown", "true");
        }, 2000); // Tempo da animação fallback
      }
    } else {
      // Caso não tenha a div #intro
      body.style.overflow = 'auto';
      body.classList.remove('com-intro');
      sessionStorage.setItem("introShown", "true");
    }
  };

  // Timer para os 3 segundos
  setTimeout(() => {
    minTimeElapsed = true;
    hidePreloaderAndRunIntro();
  }, minPreloaderTime);

  // Listener para o 'load' da página
  window.addEventListener('load', () => {
    pageLoaded = true;
    hidePreloaderAndRunIntro();
  }, { once: true });
}



/* ============================================= */
/* ===== LÓGICA DE PRODUTOS E FILTROS (NOVO) ===== */
/* ============================================= */
// (Esta seção foi movida para o topo, antes da chamada 'applyProductsFromDBToDOM')

// Variáveis globais para guardar os produtos e filtros
let g_allCategoryProducts = [];
let g_activeFilters = {
  colors: [],
  minPrice: null,
  maxPrice: null
};

// Função principal que carrega tudo
async function applyProductsFromDBToDOM() {
  // 1. PEGAR FILTROS DA URL
  const urlParams = new URLSearchParams(window.location.search);
  const pageCategory = urlParams.get('tipo');
  const pageGender = urlParams.get('genero');

  if (pageCategory) {
    updateCategoryPageTitle(pageCategory);
  }

  const filters = {};
  if (pageCategory) filters.category = pageCategory;
  if (pageGender) filters.gender = pageGender;

  // 2. BUSCAR PRODUTOS NO SUPABASE
  const products = await fetchProductsFromDB(filters);
  g_allCategoryProducts = products; // Salva na variável global

  // 3. SE A PÁGINA É DE CATEGORIA (tem filtros)
  const isCategoryPage = pageCategory || pageGender;

  if (isCategoryPage && qs('.filtros')) { // Verifica se está na pág. de categoria E tem o HTML dos filtros
    // Popula a UI dos filtros (cores, preços)
    populateFiltersUI(products);

    // Renderiza os produtos na grade
    renderProductGrid(products);

    // Adiciona os "escutadores" de clique/mudança nos filtros
    attachFilterListeners();

  } else {
    // Lógica antiga da PÁGINA INICIAL (sem filtros)
    ensureSlotIds();
    const productMap = products.reduce((map, p) => {
      if (p.slot) {
        map[p.slot] = p;
      }
      return map;
    }, {});

    const slots = qsa('.product-slot');
    const isAdmin = (localStorage.getItem('userRole') || 'cliente') === 'admin';

    slots.forEach(slotEl => {
      const slotId = slotEl.dataset.slot;
      const productData = productMap[slotId];
      if (productData) {
        renderProductInSlot(slotEl, productData);
      } else if (isAdmin) {
        renderAddButtonInSlot(slotEl, slotId);
      } else {
        slotEl.innerHTML = '';
        slotEl.style.visibility = 'hidden';
      }
    });
  }

  // Prepara o hover (mouse em cima) para todos os produtos renderizados
  prepareProductHoverAndOptions();
}

/**
 * Preenche a barra lateral de filtros com base nos produtos carregados.
 */
function populateFiltersUI(products) {
  const colorsContainer = qs('#filtro-cores-container');
  const minPriceInput = qs('#filtro-preco-min');
  const maxPriceInput = qs('#filtro-preco-max');

  if (!colorsContainer || !minPriceInput || !maxPriceInput) {
    // Não está na página de categoria, ou o HTML está faltando
    return;
  }

  // --- Lógica das Cores ---
  const allColors = products.flatMap(p =>
    (p.cores || []).map(c => c.nome)
  );
  const uniqueColors = [...new Set(allColors)].filter(Boolean).sort();

  colorsContainer.innerHTML = uniqueColors.map(color => `
        <label>
            <input type="checkbox" class="filtro-cor-check" value="${color}">
            ${color}
        </label>
    `).join('');

  // --- Lógica de Preço ---
  const prices = products.map(p => p.preco).filter(Boolean);
  if (prices.length > 0) {
    const minPrice = Math.floor(Math.min(...prices));
    const maxPrice = Math.ceil(Math.max(...prices));
    minPriceInput.placeholder = `R$ ${minPrice}`;
    maxPriceInput.placeholder = `R$ ${maxPrice}`;
  }
}

/**
 * Adiciona os event listeners (escutadores) aos inputs de filtro.
 */
function attachFilterListeners() {
  const colorCheckboxes = qsa('.filtro-cor-check');
  const minPriceInput = qs('#filtro-preco-min');
  const maxPriceInput = qs('#filtro-preco-max');
  const applyPriceButton = qs('#btn-aplicar-preco');
  const clearButton = qs('#btn-limpar-filtros');

  // Função auxiliar para aplicar filtro de preço
  const applyPriceFilter = () => {
    g_activeFilters.minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    g_activeFilters.maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;

    renderProductGrid(filterProducts());

    // ADICIONADO AQUI: Re-anexa o hover aos novos produtos
    prepareProductHoverAndOptions();
  };

  // Escutador para qualquer clique em checkbox de cor
  colorCheckboxes.forEach(check => {
    check.addEventListener('change', () => {
      g_activeFilters.colors = qsa('.filtro-cor-check:checked').map(c => c.value);

      renderProductGrid(filterProducts());

      // ADICIONADO AQUI: Re-anexa o hover aos novos produtos
      prepareProductHoverAndOptions();
    });
  });

  // Aplica o filtro de preço APENAS no clique do botão
  applyPriceButton?.addEventListener('click', applyPriceFilter);


  // Limpa todos os filtros
  clearButton?.addEventListener('click', () => {
    g_activeFilters = { colors: [], minPrice: null, maxPrice: null };

    if (minPriceInput) minPriceInput.value = '';
    if (maxPriceInput) maxPriceInput.value = '';
    colorCheckboxes.forEach(check => check.checked = false);

    renderProductGrid(g_allCategoryProducts); // Mostra todos

    // ADICIONADO AQUI: Re-anexa o hover aos novos produtos
    prepareProductHoverAndOptions();
  });
}

function applyFilteredGridWithTransition(productsToRender) {
  const productContent = qs('.product-content-selecao');
  if (!productContent) {
    // Fallback caso o container não exista
    renderProductGrid(productsToRender);
    return;
  }

  // 1. Inicia o fade-out
  productContent.style.opacity = 0;

  // 2. Espera a animação de fade-out terminar (300ms)
  setTimeout(() => {
    // 3. Rerenderiza o conteúdo (agora invisível)
    renderProductGrid(productsToRender);

    // 4. Inicia o fade-in
    productContent.style.opacity = 1;
  }, 300); // 300ms (deve ser igual à duração da transição no CSS)
}

/**
 * Filtra a lista global de produtos com base nos filtros ativos.
 * @returns {Array} A lista de produtos filtrados.
 */
function filterProducts() {
  const { colors, minPrice, maxPrice } = g_activeFilters;

  return g_allCategoryProducts.filter(product => {
    // 1. Filtro de Preço
    if (minPrice != null && product.preco < minPrice) {
      return false;
    }
    if (maxPrice != null && product.preco > maxPrice) {
      return false;
    }

    // 2. Filtro de Cor
    if (colors.length > 0) {
      const productColors = (product.cores || []).map(c => c.nome);
      const hasMatchingColor = colors.some(filterColor => productColors.includes(filterColor));
      if (!hasMatchingColor) {
        return false;
      }
    }

    // Se passou por todos os filtros, mostra o produto
    return true;
  });
}

/**
 * Renderiza a grade de produtos na tela.
 * @param {Array} productsToRender Lista de produtos para mostrar.
 */
function renderProductGrid(productsToRender) {
  const productContent = qs('.product-content-selecao');
  if (!productContent) return;

  // 1. Pega os produtos atuais no DOM e guarda num Mapa
  const currentSlots = qsa('.product-slot');
  const slotMap = new Map();
  currentSlots.forEach(slot => {
    const product = slot.querySelector('.product');
    if (product && product.dataset.id) {
      slotMap.set(product.dataset.id, slot);
    } else if (slot.querySelector('.add-product-btn')) {
      slot.remove(); // Remove botões de admin antigos
    }
  });

  // 2. Pega os IDs dos produtos que DEVEM estar na tela
  const newProductIds = new Set(productsToRender.map(p => p.id));

  // 3. Marca produtos para SAIR (EXAITING)
  slotMap.forEach((slot, id) => {
    if (!newProductIds.has(id)) {
      // Este produto deve sair
      slot.classList.add('exiting');

      // Remove o item do DOM após a transição
      slot.addEventListener('transitionend', () => slot.remove(), { once: true });
      setTimeout(() => slot.remove(), 300); // Fallback
    }
  });

  // 4. Cria a lista de elementos NA ORDEM CORRETA
  const elementsToRender = productsToRender.map(productData => {
    // 4.1. Se o produto já existe no DOM, REUTILIZA ele
    if (slotMap.has(productData.id)) {
      const existingSlot = slotMap.get(productData.id);
      existingSlot.classList.remove('exiting'); // Garante que ele não saia
      return existingSlot;
    }

    // 4.2. Se o produto é NOVO, cria ele
    const slotEl = document.createElement('div');
    slotEl.className = 'product-slot entering'; // Começa invisível

    renderProductInSlot(slotEl, productData); // Renderiza o HTML

    // Inicia a animação de entrada
    requestAnimationFrame(() => {
      slotEl.classList.remove('entering');
    });

    return slotEl;
  });

  // 5. Substitui o conteúdo da grade de uma vez
  // Isso move os elementos existentes para a ordem correta
  // e insere os novos, tudo otimizado.
  productContent.replaceChildren(...elementsToRender);

  // 6. Adiciona os botões de Admin (se for admin)
  // Espera um pouco para a animação de saída terminar
  setTimeout(() => {
    addAdminButtonsToGrid(productContent, productsToRender.length);
  }, 350);
}

/* ============ ATUALIZADOR DINÂMICO DE TÍTULO DE CATEGORIA ============ */
// (Adicione esta função no seu main.js)
function updateCategoryPageTitle(category) {
  // Seleciona os elementos que vamos mudar
  const titleSpan = qs('.after-title-header-selecao'); // O <span> dentro do <h1>
  const pageTitleTag = qs('title'); // A tag <title> do navegador

  if (!category) return; // Se não houver categoria, não faz nada

  // Converte a primeira letra para maiúscula: "camisa" -> "Camisa"
  const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);

  // Tenta pluralizar (lógica simples, ajuste se precisar)
  let pluralCategory;
  if (category === 'bone') {
    pluralCategory = 'Bonés'; // Caso especial para Boné
  } else if (category === 'calca') {
    pluralCategory = 'Calças'; // Caso especial para Calça
  } else if (category.endsWith('a') || category.endsWith('o') || category.endsWith('e') || category.endsWith('r')) {
    pluralCategory = capitalizedCategory + 's'; // Camisa -> Camisas, Short -> Shorts
  } else {
    pluralCategory = capitalizedCategory; // Deixa como está
  }

  // Atualiza o <h1>
  if (titleSpan) {
    titleSpan.textContent = ` | ${pluralCategory}`;
  }

  // Atualiza o <title> da aba do navegador
  if (pageTitleTag) {
    pageTitleTag.textContent = `TopStyle - ${pluralCategory}`;
  }
}

/* ============ Inicialização Geral ============ */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Inicializa interações do header e UI geral
    // (só executa se o header existir nesta página)
    if (qs('#header')) {
        initHeaderAndUIInteractions();
    }

    // 2. Lida com o preloader e a animação de introdução
    // (só executa se o preloader existir nesta página)
    if (qs('#preloader')) {
        handlePreloaderAndIntro();
    }

    // 3. Se a página contiver slots de produto, busca e renderiza os produtos do DB
    // (Isto agora chama a lógica de filtro/página inicial)
    await applyProductsFromDBToDOM();
    

    // 4. Atualiza a contagem de itens no ícone do carrinho
    // (só executa se o contador existir)
    if(qs('#cart-count')) {
        updateCartCountUI();
        document.addEventListener('cart-updated', updateCartCountUI);
    }

    // OBS: A lógica de auth.js é carregada separadamente e tem seu próprio DOMContentLoaded.

  } catch (err) {
    console.error('Erro na inicialização do main.js', err);
  }
});

/* ===============================================
    ANIMAÇÃO CARDS DE PRODUTOS (ATUALIZADA CORRETAMENTE)
    =============================================== */

const cards = document.querySelectorAll('.card-opt');
// 1. A media query continua a mesma: verifica se a tela tem 1024px ou mais
const mediaQueryDesktop = window.matchMedia('(min-width: 1024px)');

// 2. Função central para mostrar/esconder faixas
function handleCardAnimation(mq) {
  if (mq.matches) {
    // É DESKTOP (>= 1024px) - ANIMAÇÕES DE HOVER ATIVAS
    // Esconde todas as faixas para que o hover individual possa ativá-las
    cards.forEach(card => {
      if (card._faixa && card._txt) {
        card._faixa.style.opacity = '0';
        card._faixa.style.width = '0';
        card._txt.style.opacity = '0';
      }
    });
  } else {
    // É MOBILE/TABLET (< 1024px) - FAIXAS ESTÁTICAS VISÍVEIS
    // Mostra todas as faixas permanentemente
    cards.forEach(card => {
      if (card._faixa && card._txt) {
        card._faixa.style.opacity = '1';
        card._faixa.style.width = '250%';
        card._txt.style.opacity = '1';
      }
      // Remove classes de zoom/blur para garantir que fiquem estáticos
      card.classList.remove('inactive', 'active');
    });
  }
}

// 3. Loop único para criar as faixas e adicionar listeners
cards.forEach(card => {
  // --- CRIAÇÃO DA FAIXA ---
  const faixa = document.createElement('div');
  faixa.classList.add('faixa-diagonal');
  const txt = document.createElement('div');
  txt.classList.add('texto');
  txt.textContent = card.getAttribute('data-category') || '';
  faixa.appendChild(txt);
  card.appendChild(faixa);

  // Guarda as referências no próprio elemento do card
  card._faixa = faixa;
  card._txt = txt;

  // --- LÓGICA DE HOVER (ZOOM/BLUR) ---
  card.addEventListener('mouseenter', () => {
    // SÓ EXECUTA SE FOR DESKTOP (>= 1024px)
    if (!mediaQueryDesktop.matches) return; // Lógica invertida aqui

    cards.forEach(c => {
      if (c !== card) {
        c.classList.add('inactive');
        c.classList.remove('active');
      } else {
        c.classList.add('active');
        c.classList.remove('inactive');
      }
    });
  });

  card.addEventListener('mouseleave', () => {
    // SÓ EXECUTA SE FOR DESKTOP (>= 1024px)
    if (!mediaQueryDesktop.matches) return; // Lógica invertida aqui

    cards.forEach(c => {
      c.classList.remove('inactive', 'active');
    });
  });

  // --- LÓGICA DE HOVER (FAIXA INDIVIDUAL) ---
  // hover in
  card.addEventListener('mouseenter', () => {
    // SÓ EXECUTA SE FOR DESKTOP (>= 1024px)
    if (!mediaQueryDesktop.matches) return; // Lógica invertida aqui
    faixa.style.opacity = '1';
    faixa.style.width = '250%'; // de ponta a ponta
    txt.style.opacity = '1';
  });

  // hover out
  card.addEventListener('mouseleave', () => {
    // SÓ EXECUTA SE FOR DESKTOP (>= 1024px)
    if (!mediaQueryDesktop.matches) return; // Lógica invertida aqui
    faixa.style.opacity = '0';
    faixa.style.width = '0';
    txt.style.opacity = '0';
  });

  // (Lógica do transitionend)
  card.addEventListener('transitionend', () => {
    // SÓ EXECUTA SE FOR DESKTOP (>= 1024px)
    if (!mediaQueryDesktop.matches) return; // Lógica invertida aqui

    if (card.classList.contains('active')) {
      faixa.style.opacity = '1';
      faixa.style.width = '250%';
      txt.style.opacity = '1';
    }
  });
});

// 4. Adiciona o "escutador" para mudanças de tamanho da tela
mediaQueryDesktop.addEventListener('change', handleCardAnimation);

// 5. Executa a função uma vez na carga da página
handleCardAnimation(mediaQueryDesktop);

/* banner principal */

const banner = document.getElementById('banner');

// Define os breakpoints
const mediaQueries = {
  mobilev1: window.matchMedia('(max-width: 349px)'),
  mobilev2: window.matchMedia('(min-width: 350px) and (max-width: 510px)'),
  mobilev3: window.matchMedia('(min-width: 511px) and (max-width: 767px)'),
  tablet: window.matchMedia('(min-width: 768px) and (max-width: 1023px)'),
  desktopv1: window.matchMedia('(min-width: 1024px) and (max-width: 1600px)'),
  desktopv2: window.matchMedia('(min-width: 1601px)')
};

// Função que verifica e aplica a imagem correta
function atualizarImagem() {
  if (mediaQueries.mobilev1.matches) {
    banner.src = 'mobile.jpg';
  } else if (mediaQueries.mobilev2.matches) {
    banner.src = 'https://i.ibb.co/WNnXgnQp/png002.webp';
  } else if (mediaQueries.mobilev3.matches) {
    banner.src = 'https://i.ibb.co/NgLPJN1F/png004.jpg';
  } else if (mediaQueries.tablet.matches) {
    banner.src = 'https://i.ibb.co/RGz7VzgR/png005.webp';
  } else if (mediaQueries.desktopv1.matches) {
    banner.src = 'https://i.ibb.co/tpRmMTsX/png006.jpg';
  } else if (mediaQueries.desktopv2.matches) {
    banner.src = 'https://i.ibb.co/tPpG0vHV/principalimg.png';
  }
}

// Executa na carga inicial
atualizarImagem();

// Monitora mudanças em todos os breakpoints
Object.values(mediaQueries).forEach(mq => {
  mq.addEventListener('change', atualizarImagem);

 // Função para verificar a permissão de admin e mostrar o ícone
  
});
''
// ENGRENAGEM


