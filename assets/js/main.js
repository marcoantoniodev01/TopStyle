/*
  assets/js/main.js
  (Função handlePreloaderAndIntro ATUALIZADA)
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
    toast.style.top = '20px';
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


function addToCart(item) {
  try {
    const cart = getCart();
    const normalized = {
      productId: item.productId || item.id || item.product_id || item.idProduto,
      nome: item.nome || item.name || '',
      price: Number(item.price || item.preco || 0),
      size: item.size || '',
      color: item.color || item.colorName || '',
      img: item.img || item.imgUrl || '',
      quantity: item.quantity || 1
    };

    const idx = cart.findIndex(ci =>
      ci.productId === normalized.productId &&
      ci.size === normalized.size &&
      ci.color === normalized.color
    );

    if (idx >= 0) {
      cart[idx].quantity = (cart[idx].quantity || 1) + normalized.quantity;
    } else {
      cart.push({ ...normalized });
    }

    saveCart(cart);
    dispatchCartUpdated();
    updateCartCountUI();

    const cartIcon = qs('.cart-icon');
    if (cartIcon) {
      cartIcon.classList.add('cart-bounce');
      setTimeout(() => cartIcon.classList.remove('cart-bounce'), 500);
    }

    showToast(`${normalized.nome} (${normalized.size || '—'}/${normalized.color || '—'}) adicionado ao carrinho!`, { duration: 1200 });
  } catch (err) {
    console.error('addToCart', err);
    showToast('Erro ao adicionar ao carrinho', { duration: 1800 });
  }
}

/* ============ Interações do Produto (Hover, Cores, Tamanhos) ============ */
function prepareProductHoverAndOptions() {
  qsa('.product').forEach(product => {
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
          btn.style.padding = '8px 16px';
          btn.style.backgroundColor = '#000';
          btn.style.color = '#fff';
          btn.style.border = 'none';
          btn.style.borderRadius = '6px';
          btn.style.cursor = 'pointer';
          btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openEditModalForProduct(product); };
          textEl.appendChild(btn);
          textEl.style.display = 'flex';
          textEl.style.alignItems = 'center';
          textEl.style.justifyContent = 'center';
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

async function applyProductsFromDBToDOM() {
  let pageCategory = document.body.dataset.category;
  if (!pageCategory) {
    const path = window.location.pathname.split('/').pop();
    if (path.includes('camisas')) pageCategory = 'camisa';
    else if (path.includes('shorts')) pageCategory = 'short';
    else if (path.includes('calcas')) pageCategory = 'calca';
    else if (path.includes('moletons')) pageCategory = 'moletom';
    else if (path.includes('bones')) pageCategory = 'bone';
  }
  const pageGender = document.body.dataset.gender;

  const filters = {};
  if (pageCategory) filters.category = pageCategory;
  if (pageGender) filters.gender = pageGender;

  const products = await fetchProductsFromDB(filters);
  const isAdmin = (localStorage.getItem('userRole') || 'cliente') === 'admin';

  if (pageCategory || pageGender) {
    const productContent = qs('.product-content-selecao') || qs('.product-content');
    if (!productContent) {
      console.error("Container '.product-content' ou '.product-content-selecao' não encontrado.");
      return;
    }

    productContent.innerHTML = ''; // Limpa o container
    let currentRow = document.createElement('div');
    currentRow.className = 'product-row product-row-selecao';
    productContent.appendChild(currentRow);

    let slotCounter = 1;

    products.forEach((productData) => {
      const slotEl = document.createElement('div');
      slotEl.className = 'product-slot';
      slotEl.dataset.slot = `category-slot-${slotCounter++}`;
      currentRow.appendChild(slotEl);
      renderProductInSlot(slotEl, productData);
    });

    if (isAdmin) {
      // Lógica para adicionar botões de "Adicionar" para admins
      const totalProducts = products.length;
      // Ajusta para 4 colunas
      const itemsPerFourCols = 4;
      const slotsInLastRow = totalProducts % itemsPerFourCols;

      if (slotsInLastRow > 0) { // Se a última linha não estiver cheia
        const remainingSlots = itemsPerFourCols - slotsInLastRow;
        for (let i = 0; i < remainingSlots; i++) {
          const slotEl = document.createElement('div');
          slotEl.className = 'product-slot';
          currentRow.appendChild(slotEl);
          renderAddButtonInSlot(slotEl, `new-${slotCounter++}`);
        }
      }

      // Adiciona uma nova linha inteira de botões "Adicionar"
      const newAdminRow = document.createElement('div');
      newAdminRow.className = 'product-row product-row-selecao';
      productContent.appendChild(newAdminRow);
      for (let i = 0; i < itemsPerFourCols; i++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'product-slot';
        newAdminRow.appendChild(slotEl);
        renderAddButtonInSlot(slotEl, `new-${slotCounter++}`);
      }
    }

    if (products.length === 0 && !isAdmin) {
      productContent.innerHTML = '<p style="text-align: center; width: 100%; padding: 40px 0;">Não há produtos nesta categoria no momento.</p>';
    }

  } else {
    // Lógica para a página inicial (inicial.html)
    ensureSlotIds();
    const productMap = products.reduce((map, p) => {
      if (p.slot) {
        map[p.slot] = p;
      }
      return map;
    }, {});

    const slots = qsa('.product-slot');
    slots.forEach(slotEl => {
      const slotId = slotEl.dataset.slot;
      const productData = productMap[slotId];
      if (productData) {
        renderProductInSlot(slotEl, productData);
      } else if (isAdmin) {
        renderAddButtonInSlot(slotEl, slotId);
      } else {
        // **CORREÇÃO AQUI**
        // Em vez de limpar, torna o slot invisível para manter o layout da grade
        slotEl.innerHTML = '';
        slotEl.style.visibility = 'hidden';
      }
    });
  }

  prepareProductHoverAndOptions();
}

function renderProductInSlot(slotEl, productData) {
  slotEl.innerHTML = '';
  const product = document.createElement('div');
  product.className = 'product';
  product.dataset.id = productData.id;
  product.dataset.tamanhos = productData.tamanhos || '';

  const mainImage = (productData.cores && productData.cores[0]?.img1) || productData.img || 'https://placehold.co/400x600/eee/ccc?text=Produto';

  product.innerHTML = `
      <a class="product-link" href="produto.html?id=${productData.id}">
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
      <label>Cores:</label>
      <div id="modal-colors-container"></div>
      <button type="button" id="modal-add-color-btn" style="margin-top: 5px;">+ Adicionar Cor</button>
      <div class="modal-actions">
        <button id="modal-cancel">Cancelar</button>
        <button id="modal-save">Salvar</button>
      </div>
    </div>`;

  const isCategoryPage = !!(document.body.dataset.category || window.location.pathname.match(/(camisas|shorts|calcas|moletons|bones)\.html/));
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
    qsa('#modal-title-input, #modal-price-input, #modal-img-input, #modal-sizes-input, #modal-category-input, #modal-gender-input, #modal-add-color-btn').forEach(el => el.disabled = !isNew);
    qs('#modal-colors-container').style.pointerEvents = isNew ? 'auto' : 'none';

    if (isNew) {
      qs('#modal-title-input').value = '';
      qs('#modal-price-input').value = '';
      qs('#modal-img-input').value = '';
      qs('#modal-sizes-input').value = '';
      qs('#modal-colors-container').innerHTML = '';
      qs('#modal-colors-container').appendChild(createColorRow());
    }
  });


  modal.style.display = 'flex';

  const colorsContainer = modal.querySelector('#modal-colors-container');
  colorsContainer.appendChild(createColorRow());
  modal.querySelector('#modal-add-color-btn').onclick = () => colorsContainer.appendChild(createColorRow());
  modal.querySelector('#modal-cancel').onclick = () => modal.style.display = 'none';
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
        modal.style.display = 'none';
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

    const novoProduto = {
      id: generatedId,
      nome: nomeProduto,
      preco: parseFloat(qs('#modal-price-input').value.replace(',', '.')) || 0,
      img: qs('#modal-img-input').value.trim(),
      tamanhos: qs('#modal-sizes-input').value.trim(),
      cores: qsa('.color-row').map(row => row.getColorObject()).filter(c => c.nome && c.img1),
      slot: isHomepageSlot ? parseInt(targetSlotId) : null,
      category: qs('#modal-category-input').value,
      gender: qs('#modal-gender-input').value
    };

    try {
      const { error } = await supabase.from('products').insert([novoProduto]);
      if (error) throw error;

      showToast('Produto adicionado com sucesso!');
      modal.style.display = 'none';
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

  modal.innerHTML = `
    <div class="modal-content">
      <h2 id="modal-title">Editar Produto</h2>
      <label>Título:</label>
      <input type="text" id="modal-title-input" value="${meta.nome || ''}">
      <label>Preço:</label>
      <input type="text" id="modal-price-input" value="${meta.preco || ''}">
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
        <option value="U">Unissex</option>
      </select>
      <label>Imagem Padrão (se não houver cores):</label>
      <input type="text" id="modal-img-input" value="${meta.img || ''}">
      <label>Tamanhos (separados por vírgula):</label>
      <input type="text" id="modal-sizes-input" value="${meta.tamanhos || ''}">
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

  qs('#modal-category-input').value = meta.category || 'outros';
  qs('#modal-gender-input').value = meta.gender || 'U';
  modal.style.display = 'flex';

  const colorsContainer = modal.querySelector('#modal-colors-container');
  if (meta.cores && meta.cores.length > 0) {
    meta.cores.forEach(cor => colorsContainer.appendChild(createColorRow(cor)));
  } else {
    colorsContainer.appendChild(createColorRow());
  }

  modal.querySelector('#modal-add-color-btn').onclick = () => colorsContainer.appendChild(createColorRow());
  modal.querySelector('#modal-cancel').onclick = () => modal.style.display = 'none';

  // --- LÓGICA DO BOTÃO "REMOVER DA PÁGINA" ---
  modal.querySelector('#modal-remove-link').onclick = async () => {
    const isCategoryPage = !!(document.body.dataset.category || window.location.pathname.match(/(camisas|shorts|calcas|moletons|bones)\.html/));

    const confirmed = await showConfirmationModal(
      `Tem certeza que deseja remover "${meta.nome}" desta página? O produto não será excluído.`,
      { okText: 'Remover', cancelText: 'Manter' }
    );
    if (!confirmed) return;

    try {
      const supabase = await initSupabaseClient();
      let updatePayload = {};
      if (isCategoryPage) {
        updatePayload = { category: 'outros' };
      } else {
        updatePayload = { slot: null };
      }

      const { error } = await supabase.from('products').update(updatePayload).eq('id', meta.id);
      if (error) throw error;

      showToast('Produto desvinculado com sucesso!');
      modal.style.display = 'none';
      await applyProductsFromDBToDOM();
    } catch (err) {
      console.error('Erro ao desvincular produto:', err);
      showToast('Erro ao desvincular produto: ' + err.message, { duration: 2500 });
    }
  };

  modal.querySelector('#modal-delete').onclick = async () => {
    const confirmed = await showConfirmationModal(
      `Tem certeza que deseja EXCLUIR PERMANENTEMENTE o produto "${meta.nome}"? Esta ação não pode ser desfeita.`,
      { okText: 'Excluir', cancelText: 'Cancelar' }
    );
    if (!confirmed) return;

    const success = await deleteProductFromDB(meta.id);
    if (success) {
      showToast('Produto excluído com sucesso!');
      modal.style.display = 'none';
      await applyProductsFromDBToDOM();
    }
  };

  modal.querySelector('#modal-save').onclick = async () => {
    const productUpdate = {
      nome: qs('#modal-title-input').value.trim(),
      preco: parseFloat(qs('#modal-price-input').value.replace(',', '.')) || 0,
      img: qs('#modal-img-input').value.trim(),
      tamanhos: qs('#modal-sizes-input').value.trim(),
      cores: qsa('.color-row').map(row => row.getColorObject()).filter(c => c.nome && c.img1),
      category: qs('#modal-category-input').value,
      gender: qs('#modal-gender-input').value,
      updated_at: new Date()
    };

    if (!productUpdate.nome) return showToast('O título é obrigatório.');

    try {
      const supabase = await initSupabaseClient();
      const { error } = await supabase.from('products').update(productUpdate).eq('id', meta.id);
      if (error) throw error;

      showToast('Produto atualizado com sucesso!');
      modal.style.display = 'none';
      await applyProductsFromDBToDOM();
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      showToast('Erro ao atualizar produto: ' + err.message, { duration: 2500 });
    }
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
function runIntro() {
  const intro = document.getElementById("intro");
  if (!intro) {
    document.body.style.overflow = "auto";
    return;
  }

  // splitLetters é chamada em handlePreloaderAndIntro agora
  gsap.set(".intro-mask.top", { yPercent: 0 });
  gsap.set(".intro-mask.bottom", { yPercent: 0 });
  gsap.set(".intro-text, .intro-text-top", { opacity: 1, y: 0 });
  gsap.set(".intro-text span, .intro-text-top span", { y: 100, opacity: 0 });

  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

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

  tl.to({}, { duration: 0.1 });

  tl.to("#intro", {
    opacity: 0,
    duration: 0.8,
    onComplete: () => {
      intro.style.display = "none";
      document.body.style.overflow = "auto";
      document.body.classList.remove('com-intro'); // Garante que a classe saia
    }
  });
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
   NOVA LÓGICA DE PRELOADER (Conforme solicitado)
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
        runIntro(); // runIntro cuida de esconder a intro e liberar o scroll
        sessionStorage.setItem("introShown", "true");
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
    if (qsa('.product-slot').length > 0 || qs('.product-content-selecao')) {
      await applyProductsFromDBToDOM();
    }

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

/* =========================================================
   Marquee
   ========================================================= */
const track = document.getElementById("marquee-track");
if (track) {
  const cloneContent = () => {
    const parentWidth = track.parentElement.offsetWidth;
    // Clona até que o conteúdo seja pelo menos 2x maior que o container
    while (track.scrollWidth < parentWidth * 2) {
      if (track.innerHTML.trim() === "") break; // Evita loop infinito se estiver vazio
      track.innerHTML += track.innerHTML;
    }
  };
  // Garante que o conteúdo exista antes de clonar
  if(track.innerHTML.trim() !== "") {
      cloneContent();
  }
}
