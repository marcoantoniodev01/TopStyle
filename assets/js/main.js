/*
  assets/js/main.js
  VERSÃO COMPLETA - MERGE (Sua Base + Lógica de Categorias do Parceiro)
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


/* ============ MAPA DE CORES DINÂMICO ============ */
let globalColorMap = {}; // Cache local

// Função que busca cores do Supabase e popula o mapa
async function initColorMap() {
  try {
    const supabase = await initSupabaseClient();
    const { data, error } = await supabase.from('product_colors').select('name, hex_code');

    if (!error && data) {
      data.forEach(c => {
        globalColorMap[c.name.toLowerCase().trim()] = c.hex_code;
      });
      console.log("Mapa de cores carregado:", globalColorMap);
    }
  } catch (err) {
    console.error("Erro ao carregar mapa de cores:", err);
  }
}

// Nova função getColorHex que consulta o mapa dinâmico
function getColorHex(colorName) {
  if (!colorName) return '#cccccc';
  const name = colorName.toLowerCase().trim();

  // Tenta pegar do banco dinâmico
  if (globalColorMap[name]) return globalColorMap[name];

  // Fallbacks básicos hardcoded para segurança caso o banco falhe
  const fallbacks = {
    'branco': '#ffffff', 'preto': '#000000', 'Cinza': '#adadadff'
  };
  return fallbacks[name] || null;
}

// Expor globalmente
window.getColorHex = getColorHex;

// Chamar a inicialização assim que o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  initColorMap();
});


/* ============ MODAL DE CONFIRMAÇÃO CUSTOMIZADO ============ */
function showConfirmationModal(message, { okText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
  return new Promise(resolve => {
    const existingModal = document.querySelector('.confirm-overlay');
    if (existingModal) existingModal.remove();

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
      if (e.target === modalOverlay) closeModal(false);
    });

    document.body.appendChild(modalOverlay);
    requestAnimationFrame(() => {
      modalOverlay.classList.add('visible');
    });
  });
}
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

/* ============ POP UP ============ */
function showToast(message, { duration = 2000 } = {}) {
  let toast = qs('#topstyle-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'topstyle-toast';
    toast.style.position = 'fixed';
    let topOffset = 20;
    const header = document.getElementById('header');
    if (header) {
      const headerBottom = header.getBoundingClientRect().bottom;
      topOffset = headerBottom + 10;
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
window.showToast = showToast;

/* ============ LÓGICA NOVA DO CARRINHO (SUPABASE EM TEMPO REAL) ============ */
window.refreshCartCount = async function () {
  const el = document.querySelector('#cart-count');
  if (!el) return;

  try {
    const supabase = await window.initSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      el.textContent = '0';
      el.style.display = 'none';
      return;
    }

    const { data, error } = await supabase
      .from('user_cart_items')
      .select('quantity');

    if (error) throw error;
    const total = data ? data.reduce((acc, item) => acc + item.quantity, 0) : 0;

    el.textContent = total;
    if (total > 0) {
      el.style.display = 'flex';
      el.classList.remove('cart-bounce');
      void el.offsetWidth;
      el.classList.add('cart-bounce');
    } else {
      el.style.display = 'none';
    }

  } catch (err) {
    console.error('Erro ao atualizar contador:', err);
  }
};

// ATUALIZAÇÃO DA FUNÇÃO ADD TO CART PARA USAR O GUARD
// ATUALIZAÇÃO DA FUNÇÃO ADD TO CART COM VERIFICAÇÃO DE ESTOQUE
async function addToCart(item) {
  try {
    const supabase = await window.initSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const irParaLogin = await window.showConfirmationModal(
        "Você precisa estar logado para comprar. Deseja entrar agora?",
        { okText: 'Entrar', cancelText: 'Cancelar' }
      );
      if (irParaLogin) window.location.href = 'index.html';
      return;
    }

    // Verifica se o usuário foi banido
    if (await checkIfBanned(user.id)) return;

    // 1. VERIFICAÇÃO DE ESTOQUE EM TEMPO REAL
    // Buscamos o estoque atual no banco de dados para garantir precisão
    const productId = item.productId || item.id || item.product_id;

    const { data: productDb, error: stockError } = await supabase
      .from('products')
      .select('stock, nome')
      .eq('id', productId)
      .single();

    if (stockError || !productDb) {
      showToast('Erro ao verificar estoque do produto.', { duration: 2500 });
      return;
    }

    const currentStock = productDb.stock;
    const requestedQty = item.quantity || 1;

    // --- CENÁRIO A: Item Esgotado ---
    if (currentStock <= 0) {
      showToast('🚫 Item sem estoque no momento.', { duration: 3000 });
      return;
    }

    let quantityToAdd = requestedQty;
    let toastMessage = `${item.nome || productDb.nome} adicionado!`;
    let isPartial = false;

    // --- CENÁRIO B: Cliente quer 60, mas só tem 50 ---
    if (requestedQty > currentStock) {
      quantityToAdd = currentStock; // Ajusta para o máximo disponível
      isPartial = true;
      toastMessage = `⚠️ Adicionado apenas ${quantityToAdd} unidades. (Falta no estoque para ${requestedQty})`;
    }

    const newItem = {
      user_id: user.id,
      product_id: productId,
      nome: item.nome || item.name,
      price: Number(item.price || item.preco),
      size: item.size || 'U',
      color: item.color || item.colorName || 'Padrão',
      img: item.img || item.imgUrl || '',
      quantity: quantityToAdd // Usa a quantidade ajustada pelo estoque
    };

    // Verifica se o item já existe no carrinho para somar
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
      // Se já existe, verifica se a SOMA (antigo + novo) ultrapassa o estoque
      const totalDesired = existingItem.quantity + quantityToAdd;

      if (totalDesired > currentStock) {
        const availableSpace = currentStock - existingItem.quantity;

        if (availableSpace <= 0) {
          showToast(`🚫 Você já possui todo o estoque disponível (${currentStock}) no carrinho.`);
          return;
        }

        // Adiciona apenas o que falta para completar o estoque
        newItem.quantity = availableSpace;
        toastMessage = `Completamos seu carrinho com as últimas ${availableSpace} unidades disponíveis.`;

        const { error } = await supabase
          .from('user_cart_items')
          .update({ quantity: existingItem.quantity + newItem.quantity })
          .eq('id', existingItem.id);
        resultError = error;
      } else {
        // Soma normal
        const { error } = await supabase
          .from('user_cart_items')
          .update({ quantity: existingItem.quantity + newItem.quantity })
          .eq('id', existingItem.id);
        resultError = error;
      }
    } else {
      // Item novo no carrinho
      const { error } = await supabase
        .from('user_cart_items')
        .insert(newItem);
      resultError = error;
    }

    if (resultError) throw resultError;

    // Exibe o Toast com a mensagem lógica (parcial ou sucesso)
    showToast(toastMessage, { duration: isPartial ? 4000 : 1500 });
    await window.refreshCartCount();

  } catch (err) {
    console.error('addToCart Error:', err);
    showToast('Erro ao processar: ' + err.message, { duration: 2500 });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#cart-count')) {
    window.refreshCartCount();
  }
});

/* ============ Interações do Produto (Hover, Cores, Tamanhos) ============ */
function prepareProductHoverAndOptions() {
  qsa('.product').forEach(product => {
    if (product.__hoverListenersAttached) return;
    product.__hoverListenersAttached = true;

    const textEl = product.querySelector('.product-text');
    const titleEl = product.querySelector('.product-title');
    const priceEl = product.querySelector('.product-price');
    const imgEl = product.querySelector('.product-link img');
    const optionsContainer = product.querySelector('.product-options');
    const originalImgSrc = imgEl ? imgEl.src : '';

    // --- EVENTO DE MOUSE ENTRANDO ---
    product.addEventListener('mouseenter', () => {

      // === AQUI ESTÁ A CORREÇÃO ===
      // Verifica se o dispositivo NÃO tem cursor preciso (mouse).
      // Se for touch (celular/tablet), encerra a função aqui.
      // O clique vai direto para o link do produto.
      if (window.matchMedia('(hover: none)').matches) return;
      // ============================

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
      if (colorsDiv) colorsDiv.innerHTML = '';
      if (sizesDiv) sizesDiv.innerHTML = '';

      const cores = meta.cores || [];
      let selectedColorMeta = product.__selectedColorMeta || (cores.length > 0 ? cores[0] : { img1: originalImgSrc });

      if (cores.length > 0 && colorsDiv) {
        cores.forEach(cor => {
          const sw = document.createElement('button');
          sw.type = 'button';
          sw.className = 'color-swatch';
          sw.title = cor.nome || '';
          const hexColor = getColorHex(cor.nome);

          // Lógica: Se tiver cor no dicionário, usa a cor. 
          // Se não tiver, tenta usar a imagem pequena. Se não, usa cinza.
          if (hexColor) {
            sw.style.backgroundColor = hexColor;
            // Se for branco ou off white, coloca uma borda sutil para não sumir no fundo branco
            if (hexColor === '#ffffff' || hexColor === '#f8f8ff') {
              sw.style.border = '1px solid #000000ff';
            }
          } else if (cor.img1) {
            // Fallback: Se digitou uma cor estranha (ex: "Galáxia"), usa a foto
            sw.style.backgroundImage = `url('${cor.img1}')`;
            sw.style.backgroundSize = 'cover';
          } else {
            sw.style.background = '#ccc';
          }

          sw.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedColorMeta = cor;
            product.__selectedColorMeta = cor;
            if (imgEl && cor.img2) imgEl.src = cor.img2;
            else if (imgEl && cor.img1) imgEl.src = cor.img1;
            colorsDiv.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
            sw.classList.add('active');
          });
          colorsDiv.appendChild(sw);
        });
      }

      const tamanhos = (meta.tamanhos || '').split(',').map(s => s.trim()).filter(Boolean);
      if (tamanhos.length > 0 && sizesDiv) {
        tamanhos.forEach(size => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'size-btn';
          btn.textContent = size;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
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
      if (imgEl && hoverImg) imgEl.src = hoverImg;
    });

    // --- EVENTO DE MOUSE SAINDO ---
    product.addEventListener('mouseleave', () => {
      // Opcional: também bloqueia o mouseleave em touch para economizar processamento,
      // embora não seja estritamente necessário pois o style não foi alterado.
      if (window.matchMedia('(hover: none)').matches) return;

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
        if (selectedColorMeta && selectedColorMeta.img1) imgEl.src = selectedColorMeta.img1;
        else imgEl.src = originalImgSrc;
      }
    });
  });
}

/* ============ Renderização de Produtos do Supabase ============ */
/* ============ MAPA DE GRUPOS (PARA O "VER TODOS" FUNCIONAR) ============ */
// Isso define quais sub-categorias pertencem a cada grupo principal
/* ============ MAPA DE GRUPOS (CONFIGURAÇÃO DO "VER TODOS") ============ */
const CATEGORY_GROUPS = {
  // Grupo VESTUÁRIO (Agrupa tudo que é roupa)
  'vestuario': [
    'camisetas',
    'camiseta',
    'camiseta-plus-size',
    'plus-size',
    'camiseta-manga-longa',
    'manga-longa',
    'moletons',
    'moletom',
    'jaquetas',
    'jaquetas-e-casacos',
    'casacos',
    'camisas',
    'camisa',
    'calcas',
    'calça',
    'calca', // sem cedilha
    'shorts',
    'shorts-e-bermudas',
    'bermudas'
  ],

  // Grupo OUTROS
  'outros': [
    'juvenil',
    'feminino',
    'packs',
    'outros'
  ],

  // Grupo ACESSÓRIOS
  'acessorios': [
    'chaveiros',
    'chaveiros-e-adesivos',
    'adesivos',
    'cuecas',
    'gorros',
    'toucas',
    'pochetes',
    'mochilas',
    'meias',
    'bags',
    'shoulder-bag',
    'bones',
    'bone', // sem acento
    'bucket',
    'carteiras'
  ],

  // Grupo CALÇADOS
  'calcados': [
    'chinelos',
    'tenis',
    'sandalias'
  ]
};


/* ============ Renderização de Produtos do Supabase ============ */
async function fetchProductsFromDB(filters = {}) {
  try {
    const supabase = await initSupabaseClient();
    let query = supabase.from('products').select('*');

    // CASO 1: Link "Ver Todos" (Ex: ?categoria=vestuario)
    // O código busca uma LISTA de categorias definida no CATEGORY_GROUPS
    if (filters.categoryList && filters.categoryList.length > 0) {
      console.log("Buscando grupo de categorias:", filters.categoryList);
      // O comando .in diz ao banco: "Me dê produtos onde a categoria seja QUALQUER UMA dessas"
      query = query.in('category', filters.categoryList);
    }
    // CASO 2: Link Específico (Ex: ?tipo=moletons)
    else if (filters.category) {
      console.log("Buscando categoria única:", filters.category);
      query = query.eq('category', filters.category);
    }

    if (filters.gender) query = query.eq('gender', filters.gender);

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`Produtos encontrados: ${data.length}`, data);
    return data || [];

  } catch (err) {
    console.error('Erro no fetchProductsFromDB:', err);
    return [];
  }
}

function ensureSlotIds() {
  const slots = qsa('.product-slot');
  let next = 1;
  slots.forEach(s => {
    if (!s.dataset.slot) s.dataset.slot = String(next++);
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

/* ============ Helpers do Modal de Admin ============ */
function showAdminModal(modal) {
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function hideAdminModal(modal) {
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

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
  row.style.alignItems = 'center';

  // HTML da linha: Select + Inputs de Imagem + Botão Remover
  row.innerHTML = `
    <div style="flex: 1; min-width: 120px;">
        <select class="color-select-input" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc; background: #eee;">
            <option value="">Carregando...</option>
        </select>
    </div>
    <input type="text" placeholder="URL Imagem Principal" value="${color.img1 || ''}" style="flex: 2;">
    <input type="text" placeholder="URL Imagem Hover (Opcional)" value="${color.img2 || ''}" style="flex: 2;">
    <button type="button" class="remove-color-btn" style="padding: 0 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">&times;</button>
  `;

  const select = row.querySelector('select');

  // Chama a função corrigida (ela agora é async e lida com o fetch internamente)
  populateColorSelectElement(select, color.nome);

  // Popula o select imediatamente (se cache existir) ou busca
  if (globalColorCache.length > 0) {
    populateColorSelectElement(select, color.nome);
  } else {
    fetchColorsForSelect().then(() => populateColorSelectElement(select, color.nome));
  }

  // Ação de remover linha
  row.querySelector('.remove-color-btn').onclick = () => row.remove();

  // Método auxiliar para o botão Salvar pegar os dados
  row.getColorObject = () => {
    const inputs = row.querySelectorAll('input');
    const selectVal = row.querySelector('select').value;
    return {
      nome: selectVal, // Pega do Select
      img1: inputs[0].value.trim(),
      img2: inputs[1].value.trim()
    };
  };

  return row;
}

// Função auxiliar para preencher o Select de Drops
async function populateDropSelect(selectElement, selectedValue = null) {
  selectElement.innerHTML = '<option value="">Carregando...</option>';

  try {
    const supabase = await window.initSupabaseClient();
    // Puxa da tabela 'drops'
    const { data: drops, error } = await supabase
      .from('drops')
      .select('name_drop')
      .order('name_drop', { ascending: true });

    if (error) throw error;

    selectElement.innerHTML = '<option value="">Nenhum Drop</option>';

    drops.forEach(d => {
      const option = document.createElement('option');
      option.value = d.name_drop; // Salvaremos o NOME do drop
      option.textContent = d.name_drop;

      // Verifica se é o drop selecionado
      if (selectedValue && d.name_drop === selectedValue) {
        option.selected = true;
      }
      selectElement.appendChild(option);
    });
  } catch (err) {
    console.error("Erro ao carregar drops:", err);
    selectElement.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

/* ============ HELPER GESTÃO DE CORES GLOBAL (CORRIGIDO E EXPOSTO) ============ */
window.globalColorCache = []; // Exposto no window para acesso da dashboard

// Função para buscar cores
window.fetchColorsForSelect = async function () {
  try {
    const supabase = await window.initSupabaseClient();
    const { data, error } = await supabase
      .from('product_colors')
      .select('name, hex_code')
      .order('name', { ascending: true });

    if (!error && data) {
      window.globalColorCache = data;
      return data;
    }
  } catch (err) {
    console.error("Erro ao buscar cores:", err);
  }
  return [];
};

// Função para preencher um select específico
window.populateColorSelectElement = async function (selectEl, selectedValue = null) {
  // Se o cache estiver vazio, busca primeiro
  if (!window.globalColorCache || window.globalColorCache.length === 0) {
    // Coloca um loading visual
    if (selectEl.options.length === 0) selectEl.innerHTML = '<option value="">Carregando...</option>';
    await window.fetchColorsForSelect();
  }

  // Limpa e adiciona opção padrão
  selectEl.innerHTML = '<option value="">Selecione...</option>';
  const currentVal = selectedValue || selectEl.value;
  let found = false;

  window.globalColorCache.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;

    // Tenta selecionar se bater o nome (case insensitive)
    if (currentVal && c.name.toLowerCase().trim() === currentVal.toLowerCase().trim()) {
      opt.selected = true;
      found = true;
    }

    // Bolinha de cor visual (funciona em alguns navegadores desktop)
    opt.style.color = '#000';
    selectEl.appendChild(opt);
  });

  // Lógica do "Legado": Se existe um valor selecionado, mas ele NÃO está na lista do banco
  if (currentVal && !found) {
    const opt = document.createElement('option');
    opt.value = currentVal;
    opt.textContent = currentVal + " (Legado)";
    opt.selected = true;
    opt.style.fontWeight = "bold";
    opt.style.color = "red";
    selectEl.appendChild(opt);
  }
};

// Escuta global para atualizar todos os selects quando uma cor nova for criada
document.addEventListener('colors-updated', async () => {
  await window.fetchColorsForSelect();
  document.querySelectorAll('.color-select-input').forEach(select => {
    // Preserva o valor que estava selecionado
    const val = select.value;
    window.populateColorSelectElement(select, val);
  });
});

// Inicializa cache ao carregar
document.addEventListener('DOMContentLoaded', () => {
  window.fetchColorsForSelect();
});

/* ============ LÓGICA DE CATEGORIAS (NOVA) ============ */
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
    option.value = cat.name;
    option.textContent = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);

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

    if (cats.length === 0) {
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

      row.querySelector('.delete-cat-btn').onclick = async () => {
        if (!confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`)) return;

        const supabase = await initSupabaseClient();
        const { error } = await supabase.from('categories').delete().eq('id', cat.id);

        if (error) {
          showToast('Erro ao excluir: ' + error.message);
        } else {
          showToast('Categoria excluída!');
          renderList();
        }
      };

      listEl.appendChild(row);
    });
  };

  modal.querySelector('#btn-add-cat').onclick = async () => {
    const input = modal.querySelector('#new-cat-name');
    const name = input.value.trim().toLowerCase();
    if (!name) return showToast('Digite um nome para a categoria.');

    const supabase = await initSupabaseClient();
    const { error } = await supabase.from('categories').insert([{ name: name }]);

    if (error) {
      showToast('Erro: ' + error.message);
    } else {
      showToast('Categoria criada!');
      input.value = '';
      renderList();
    }
  };

  modal.querySelector('#btn-close-cat-modal').onclick = () => {
    hideAdminModal(modal);
    document.dispatchEvent(new Event('categories-updated'));
  };

  renderList();
}


/* ============ main.js - ATUALIZAÇÃO ============ */

// Torna a função global para ser usada no Dashboard

// ============================================
// FUNÇÃO DE ADICIONAR PRODUTO (CORRIGIDA)
// ============================================

window.openAddProductModal = function (slotId = null) {
  let modal = document.querySelector('#admin-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  modal.__targetSlotId = slotId;
  const isDashboardMode = (slotId === null);

  // 1. Renderiza o HTML (Com o campo de estoque incluso)
  modal.innerHTML = `
    <div class="modal-content">
      <h2 id="modal-title">${isDashboardMode ? 'Adicionar Produto (Loja)' : `Adicionar Produto (Slot ${slotId})`}</h2>
      
      <div id="reusable-product-section" style="${isDashboardMode ? 'display:none;' : ''}">
        <label>Reusar produto existente (opcional):</label>
        <select id="modal-existing-select" style="width: 100%; margin-bottom: 10px;">
          <option value="">-- Criar novo produto --</option>
        </select>
      </div>

      <label>Título:</label>
      <input type="text" id="modal-title-input">

      <div style="display:flex; gap: 15px;">
        <div style="flex: 1;">
            <label>Preço:</label>
            <input type="text" id="modal-price-input" placeholder="Ex: 139.99">
        </div>
        <div style="width: 120px;">
            <label>Estoque:</label>
            <input type="number" id="modal-stock-input" value="0" min="0" style="font-weight: bold; border: 2px solid #333;">
        </div>
      </div>
      
      <label>Categoria:</label>
      <div style="display: flex; gap: 8px; align-items: center;">
          <select id="modal-category-input" style="flex: 1;"></select>
          <button type="button" id="btn-manage-cats-add" title="Gerenciar Categorias" style="padding: 8px; background: #fff; border: 1px solid #ccc; border-radius: 6px; cursor: pointer;">
            <i class="ri-settings-3-line"></i> 
          </button>
      </div>

      <label>Drop (Coleção):</label>
      <select id="modal-drop-input" style="width: 100%;"></select>

      <label>Gênero:</label>
      <select id="modal-gender-input">
        <option value="F">Feminino</option>
        <option value="M">Masculino</option>
        <option value="U" selected>Unissex</option>
      </select>
      
      <label>Imagem Padrão:</label>
      <input type="text" id="modal-img-input">
      
      <label>Tamanhos (separados por vírgula):</label>
      <input type="text" id="modal-sizes-input" placeholder="P,M,G,GG">

      <label>Descrição:</label>
      <textarea id="modal-description-input" style="min-height: 80px;" placeholder="Descrição detalhada..."></textarea>
      
      <label>Informações Complementares:</label>
      <textarea id="modal-additional-info-input" style="min-height: 60px;" placeholder="Ex: Algodão..."></textarea>
      
      <label>Cores:</label>
      <div id="modal-colors-container"></div>
      
      <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
          <button type="button" id="modal-add-color-btn">+ Adicionar Cor</button>
          <button type="button" id="modal-manage-colors-btn" title="Criar nova cor" style="padding: 8px; border: 1px solid #ccc; border-radius: 6px;">
            <i class="ri-settings-3-line"></i> 
          </button>
      </div>
      
      <div class="modal-actions">
        <button id="modal-cancel">Cancelar</button>
        <button id="modal-save">Salvar</button>
      </div>
    </div>`;

  // 2. Abre o modal IMEDIATAMENTE (para não parecer que travou)
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';


  const dropSelect = modal.querySelector('#modal-drop-input');
  populateDropSelect(dropSelect);

  // 3. Inicializa Lógica com Proteção de Erros
  try {
    // --- LÓGICA DE CATEGORIAS ---
    const catSelect = modal.querySelector('#modal-category-input');
    // Prioriza a função da Dashboard se existir
    if (typeof window.dashPopulateCategories === 'function') {
      window.dashPopulateCategories(catSelect, '');
    } else if (typeof populateCategorySelect === 'function') {
      populateCategorySelect(catSelect);
    }

    // --- LÓGICA DE CORES (AQUI ESTAVA O PROBLEMA) ---
    const colorsContainer = modal.querySelector('#modal-colors-container');
    const btnAddColor = modal.querySelector('#modal-add-color-btn');

    // Verifica qual função de criar linha usar
    let createRowFn;
    if (typeof window.dashCreateColorRow === 'function') {
      createRowFn = window.dashCreateColorRow; // Usa a da Dashboard (Admin)
    } else if (typeof createColorRow === 'function') {
      createRowFn = createColorRow; // Usa a da Loja (Main)
    }

    if (createRowFn) {
      // Cria a primeira linha vazia
      colorsContainer.appendChild(createRowFn());
      // Configura o botão de +
      btnAddColor.onclick = () => colorsContainer.appendChild(createRowFn());
    } else {
      colorsContainer.innerHTML = '<p style="color:red;">Erro: Função de cores não carregada.</p>';
    }

    // --- OUTROS BOTÕES ---
    modal.querySelector('#modal-manage-colors-btn').onclick = () => {
      if (typeof window.colorOpenFormModal === 'function') window.colorOpenFormModal('add');
      else alert("A gestão de cores deve ser feita pelo Painel Admin.");
    };

    modal.querySelector('#modal-cancel').onclick = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    };

    modal.querySelector('#btn-manage-cats-add').onclick = () => {
      if (typeof window.openCategoryManagerModal === 'function') window.openCategoryManagerModal();
      else if (typeof openCategoryManagerModal === 'function') openCategoryManagerModal();
    };

    // --- LÓGICA DE SALVAR ---
    modal.querySelector('#modal-save').onclick = async () => {
      const nomeProduto = modal.querySelector('#modal-title-input').value.trim();
      if (!nomeProduto) return showToast('Título obrigatório');

      const generatedId = nomeProduto.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50) + '-' + Date.now();
      const finalSlot = modal.__targetSlotId ? parseInt(modal.__targetSlotId) : null;

      // Captura cores usando o método seguro
      const colorRows = Array.from(modal.querySelectorAll('.color-row'));
      const coresData = colorRows.map(row => {
        if (row.getColorObject) return row.getColorObject(); // Método injetado na criação
        // Fallback manual se algo falhou
        const inputs = row.querySelectorAll('input');
        const select = row.querySelector('select');
        return {
          nome: select ? select.value : '',
          img1: inputs[0] ? inputs[0].value : '',
          img2: inputs[1] ? inputs[1].value : ''
        };
      }).filter(c => c.nome && c.img1);

      const newProduct = {
        id: generatedId,
        nome: nomeProduto,
        preco: parseFloat(modal.querySelector('#modal-price-input').value.replace(',', '.')) || 0,
        stock: parseInt(modal.querySelector('#modal-stock-input').value) || 0,
        img: modal.querySelector('#modal-img-input').value.trim(),
        tamanhos: modal.querySelector('#modal-sizes-input').value.trim(),
        description: modal.querySelector('#modal-description-input').value.trim(),
        additional_info: modal.querySelector('#modal-additional-info-input').value.trim(),
        cores: coresData,
        slot: finalSlot,
        category: modal.querySelector('#modal-category-input').value,
        dropName: modal.querySelector('#modal-drop-input').value,
        gender: modal.querySelector('#modal-gender-input').value
      };

      try {
        const supabase = await window.initSupabaseClient();
        const { error } = await supabase.from('products').insert([newProduct]);

        if (error) throw error;

        showToast('Produto criado com sucesso!');
        modal.style.display = 'none';
        document.body.style.overflow = '';

        // Atualiza a tela correta dependendo de onde estamos
        if (typeof loadProducts === 'function') loadProducts(); // Dashboard
        if (typeof applyProductsFromDBToDOM === 'function') applyProductsFromDBToDOM(); // Loja

      } catch (err) {
        console.error(err);
        showToast('Erro: ' + err.message);
      }
    };

  } catch (err) {
    console.error("Erro Crítico no Modal:", err);
    alert("Ocorreu um erro ao inicializar o formulário: " + err.message);
  }
};

// ... (Mantenha o restante do main.js inalterado, como funções de filtro, renderização, etc.) ...

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

  // --- ATUALIZAÇÃO HTML: CAMPO ESTOQUE INSERIDO ---
  modal.innerHTML = `
    <div class="modal-content">
      <h2 id="modal-title">Editar Produto</h2>
      <label>Título:</label>
      <input type="text" id="modal-title-input" value="${meta.nome || ''}">
      
      <div style="display:flex; gap: 15px;">
        <div style="flex: 1;">
            <label>Preço:</label>
            <input type="text" id="modal-price-input" value="${meta.preco || ''}">
        </div>
        <div style="width: 120px;">
            <label>Estoque:</label>
            <input type="number" id="modal-stock-input" value="${meta.stock !== undefined ? meta.stock : 0}" min="0" style="font-weight: bold; border: 2px solid #333;">
        </div>
      </div>
      
      <label for="modal-category-input">Categoria:</label>
      <div style="display: flex; gap: 8px; align-items: center;">
          <select id="modal-category-input" style="flex: 1;">
             </select>
          <button type="button" id="btn-manage-cats-edit" title="Gerenciar Categorias" style="padding: 8px; background: #fff; border: 1px solid #ccc; border-radius: 6px; cursor: pointer;">
            <i class="ri-settings-3-line"></i> 
          </button>
      </div>

      <label>Drop (Coleção):</label>
      <select id="modal-drop-input" style="width: 100%;"></select>

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
      
      <label>Descrição:</label>
      <textarea id="modal-description-input" style="min-height: 80px;">${meta.description || ''}</textarea>
      <label>Informações Complementares:</label>
      <textarea id="modal-additional-info-input" style="min-height: 60px;">${meta.additional_info || ''}</textarea>
      
      <label>Cores:</label>
      <div id="modal-colors-container"></div>
      
      <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
          <button type="button" id="modal-add-color-btn">+ Adicionar Cor</button>
          
          <button type="button" id="modal-manage-colors-btn" title="Criar nova cor" style="padding: 8px; background: #fff; border: 1px solid #ccc; border-radius: 6px; cursor: pointer;">
            <i class="ri-settings-3-line" style="font-size: 1.2rem; color: #333;"></i> 
          </button>
      </div>

      <div class="modal-actions" style="flex-wrap: wrap;">
        <button id="modal-delete" style="background-color: #dc3545; color: white;">Excluir Produto</button>
        <button id="modal-remove-link" style="background-color: #ffc107; color: black;">Remover da Página</button>
        <button id="modal-cancel">Cancelar</button>
        <button id="modal-save">Salvar Alterações</button>
      </div>
    </div>`;

  qs('#modal-gender-input').value = meta.gender || 'U';

  modal.querySelector('#modal-add-color-btn').onclick = () => {
    const container = modal.querySelector('#modal-colors-container');
    container.appendChild(createColorRow());
  };

  modal.querySelector('#modal-manage-colors-btn').onclick = () => {
    if (typeof window.colorOpenFormModal === 'function') {
      window.colorOpenFormModal('add');
    } else {
      alert("A criação de cores deve ser feita pelo Painel Admin -> Cores.");
    }
  };

  const catSelect = qs('#modal-category-input');
  populateCategorySelect(catSelect, meta.category);

  qs('#btn-manage-cats-edit').onclick = () => {
    openCategoryManagerModal();
  };

  document.addEventListener('categories-updated', () => {
    const currentVal = catSelect.value || meta.category;
    populateCategorySelect(catSelect, currentVal);
  });

  showAdminModal(modal);

  const dropSelect = qs('#modal-drop-input');
  populateDropSelect(dropSelect, meta.dropName);

  const colorsContainer = modal.querySelector('#modal-colors-container');
  if (meta.cores && meta.cores.length > 0) {
    meta.cores.forEach(cor => colorsContainer.appendChild(createColorRow(cor)));
  } else {
    colorsContainer.appendChild(createColorRow());
  }

  modal.querySelector('#modal-add-color-btn').onclick = () => colorsContainer.appendChild(createColorRow());
  modal.querySelector('#modal-cancel').onclick = () => hideAdminModal(modal);

  modal.querySelector('#modal-remove-link').onclick = async () => {
    const isCategoryPage = !!(document.body.dataset.category || window.location.pathname.match(/(camisas|shorts|calcas|moletons|bones|categoria)\.html/));

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
      hideAdminModal(modal);
      await applyProductsFromDBToDOM();
    } catch (err) {
      console.error('Erro ao desvinculado produto:', err);
      showToast('Erro ao desvinculado produto: ' + err.message, { duration: 2500 });
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
      hideAdminModal(modal);
      await applyProductsFromDBToDOM();
    }
  };

  // --- LÓGICA DE SALVAR ATUALIZADA ---
  modal.querySelector('#modal-save').onclick = async () => {
    const productUpdate = {
      nome: qs('#modal-title-input').value.trim(),
      preco: parseFloat(qs('#modal-price-input').value.replace(',', '.')) || 0,

      // >>> ATUALIZAÇÃO: CAPTURA O ESTOQUE DO INPUT <<<
      stock: parseInt(qs('#modal-stock-input').value) || 0,

      img: qs('#modal-img-input').value.trim(),
      tamanhos: qs('#modal-sizes-input').value.trim(),
      description: qs('#modal-description-input').value.trim(),
      additional_info: qs('#modal-additional-info-input').value.trim(),
      cores: qsa('.color-row').map(row => row.getColorObject()).filter(c => c.nome && c.img1),
      category: qs('#modal-category-input').value,
      gender: qs('#modal-gender-input').value,
      dropName: qs('#modal-drop-input').value,
      updated_at: new Date()
    };

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

/*=============== PRELOADER + INTRO OTIMIZADA ===============*/
function runIntro() {
  const intro = document.getElementById("intro");
  const skipBtn = document.getElementById("skip-intro-btn");
  let tl;

  if (!intro) {
    document.body.style.overflow = "auto";
    return;
  }

  // --- FUNÇÃO ÚNICA DE SAÍDA RÁPIDA ---
  // Serve tanto para o clique em "Pular" quanto para o final natural
  const executeFastExit = () => {
    // 1. Mata animações pendentes
    if (tl) tl.kill();
    if (window.gsap) {
      gsap.killTweensOf("#intro");
      gsap.killTweensOf(".intro-text span");
      gsap.killTweensOf(".intro-text-top span");
      gsap.killTweensOf(".intro-mask");
    }

    // 2. Esconde botão
    if (skipBtn) skipBtn.style.display = 'none';

    // 3. Verifica se já está saindo para não rodar duas vezes
    if (intro.classList.contains('simple-fade-out')) return;

    // 4. Adiciona classe de saída rápida (definida no CSS)
    intro.classList.add('simple-fade-out');

    // 5. Remove do DOM assim que o fade terminar (0.5s)
    setTimeout(() => {
      intro.style.display = "none";
      document.body.style.overflow = "auto";
      document.body.classList.remove('com-intro');
      sessionStorage.setItem("introShown", "true");
    }, 550);
  };

  // Evento do botão Pular
  if (skipBtn) {
    skipBtn.addEventListener('click', executeFastExit, { once: true });
  }

  // --- GSAP TIMELINE ---
  gsap.set(".intro-mask.top", { yPercent: 0 });
  gsap.set(".intro-mask.bottom", { yPercent: 0 });
  gsap.set(".intro-text, .intro-text-top", { opacity: 1, y: 0 });
  gsap.set(".intro-text span, .intro-text-top span", { y: 100, opacity: 0 });

  tl = gsap.timeline({ defaults: { ease: "power4.out" } });

  // 1. Animação das Máscaras (Abrem)
  tl.to(".intro-mask.top", { yPercent: -70, duration: 2, ease: "power3.out" }, 0)
    .to(".intro-mask.bottom", { yPercent: 70, duration: 2, ease: "power3.out" }, 0)
    .to(".intro-mask.top", { yPercent: -100, duration: 2, ease: "power1.inOut" })
    .to(".intro-mask.bottom", { yPercent: 100, duration: 2, ease: "power1.inOut" }, "<");

  // 2. Animação dos Textos (ESTILO / OUSADIA)
  const texts = document.querySelectorAll(".intro-text");
  texts.forEach((el, i) => {
    const letters = el.querySelectorAll("span");
    const delay = i * 1.5 + 0.5;

    tl.to(letters, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 }, delay);
    tl.to(letters, { opacity: 0, y: -100, duration: 0.6, stagger: 0.05 }, delay + 0.8);
  });

  // 3. Animação final (TopStyle)
  // Calcula o tempo exato para começar logo após o último texto sair
  const lastExit = texts.length > 0 ? (texts.length - 1) * 1.5 + 1.3 : 2;
  const topStyleDelay = lastExit + 0.3; // Delay reduzido para ser mais ágil

  const topStyleLetters = document.querySelectorAll(".intro-text-top span");

  if (topStyleLetters.length > 0) {
    tl.to(topStyleLetters, {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.05
    }, topStyleDelay);
  }

  // 4. CHAMA A SAÍDA IMEDIATAMENTE APÓS O TEXTO APARECER
  // O ">" significa "imediatamente após a última animação terminar"
  tl.call(executeFastExit, [], ">");
}

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
// Dentro de main.js

function handlePreloaderAndIntro() {
  const preloader = document.getElementById('preloader');
  const intro = document.getElementById('intro');
  const body = document.body;
  const role = localStorage.getItem('userRole');
  const introAlreadyShown = sessionStorage.getItem('introShown');

  // Define se devemos pular a animação (Admin ou já viu a intro)
  const skipAnimation = (role === 'admin' || introAlreadyShown);

  // Trava a rolagem se for mostrar a intro
  if (!skipAnimation && body.classList.contains('com-intro')) {
    body.style.overflow = 'hidden';
  } else if (skipAnimation && intro) {
    // Se for pular, esconde o intro visualmente, mas mantém preloader até carregar tudo
    intro.style.display = 'none';
  }

  // === CRIAÇÃO DAS PROMISES (As travas de segurança) ===

  // 1. Tempo Mínimo (3s) - Só usado se NÃO for pular a animação
  const minTimePromise = new Promise(resolve => setTimeout(resolve, 3000));

  // 2. Window Load (Imagens, CSS e Scripts carregados)
  const windowLoadPromise = new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve);
  });

  // 3. Lógica Admin (Espera o admiconedash.js terminar)
  const adminCheckPromise = new Promise(resolve => {
    if (document.body.classList.contains('admin-logic-complete')) {
      resolve();
    } else {
      document.addEventListener('admin-logic-complete', resolve, { once: true });
      // Timeout de segurança de 7s caso o Supabase falhe
      setTimeout(resolve, 7000);
    }
  });

  // 4. Lógica Produtos (Espera o applyProductsFromDBToDOM terminar)
  const productsLoadPromise = new Promise(resolve => {
    // Se não estiver na home (sem slots), resolve rápido
    if (!document.querySelector('.product-slot') && !document.querySelector('.product-content-selecao')) {
      resolve();
      return;
    }

    if (document.body.classList.contains('products-logic-complete')) {
      resolve();
    } else {
      document.addEventListener('products-logic-complete', resolve, { once: true });
      // Timeout de segurança de 10s (banco de dados pode demorar)
      setTimeout(resolve, 10000);
    }
  });

  // === LISTA DE COISAS A ESPERAR ===
  const promisesToWait = [
    windowLoadPromise,
    adminCheckPromise,
    productsLoadPromise
  ];

  // Se for usuário novo, adiciona o tempo mínimo de 3s na espera
  if (!skipAnimation) {
    promisesToWait.push(minTimePromise);
  }

  // === QUANDO TUDO TERMINAR ===
  Promise.all(promisesToWait).then(() => {
    // Esconde o preloader
    if (preloader) {
      preloader.classList.add('hidden');
      // Remove do DOM após o fade-out CSS
      setTimeout(() => preloader.style.display = 'none', 500);
    }

    if (skipAnimation) {
      // Modo Rápido: Libera a tela imediatamente
      body.style.overflow = 'auto';
      body.classList.remove('com-intro');
    } else {
      // Modo Animação: Inicia a Intro (Derretimento/Letras)
      if (intro) {
        intro.style.display = 'flex';

        if (typeof splitLetters === 'function') {
          splitLetters(".intro-text, .intro-text-top");
        }

        if (typeof runIntro === 'function' && window.gsap) {
          runIntro();
        } else {
          // Fallback se GSAP falhar
          setTimeout(() => {
            intro.style.display = 'none';
            body.style.overflow = 'auto';
            body.classList.remove('com-intro');
            sessionStorage.setItem("introShown", "true");
          }, 2000);
        }
      }
    }
  });
}

/* ============ LÓGICA DE PRODUTOS E FILTROS (ATUALIZADO) ============ */
let g_allCategoryProducts = [];
let g_activeFilters = {
  colors: [],
  minPrice: null,
  maxPrice: null
};

// Função principal que carrega tudo
// Dentro de main.js

/* =========================================================
   LÓGICA HÍBRIDA MAIS VENDIDOS (CORRIGIDA)
   1. Busca Ranking de Vendas
   2. Hidrata com dados reais da tabela Products (Corrige preço R$ 0,00 e img)
   3. Completa com Aleatórios se faltar
   ========================================================= */
async function loadHomepageBestSellers() {
  const container = document.querySelector('.products-inicio .product-row');
  if (!container) return; // Não estamos na home

  container.innerHTML = '<div style="width:100%; text-align:center; padding:20px;">Carregando destaques...</div>';

  try {
    const supabase = await initSupabaseClient();
    const TOTAL_SLOTS = 4;
    let finalDisplayList = [];
    let excludedIds = new Set(); // Para não repetir produtos

    // --- PASSO 1: BUSCAR O RANKING DE VENDAS (IDs e Quantidades) ---
    // Usamos a RPC apenas para saber QUEM vendeu mais, não para pegar os dados de exibição
    const { data: salesReport, error: salesError } = await supabase.rpc('get_best_sellers_report', {
      period_start: '1970-01-01T00:00:00.000Z', // Desde sempre
      sort_asc: false,
      page_limit: 4,
      page_offset: 0
    });

    // Se a RPC funcionou e trouxe vendas
    if (!salesError && salesReport && salesReport.length > 0) {
      // Extrai apenas os IDs dos produtos vendidos
      const soldProductIds = salesReport.map(item => item.product_id);

      // --- PASSO 2: BUSCAR DADOS REAIS DESSES PRODUTOS NA TABELA 'PRODUCTS' ---
      // Isso garante que o Preço e a Imagem sejam os atuais do cadastro, não do histórico de pedido
      const { data: realProducts, error: prodError } = await supabase
        .from('products')
        .select('*')
        .in('id', soldProductIds);

      if (!prodError && realProducts) {
        // O banco não retorna na ordem dos IDs passados, então precisamos reordenar
        // baseando-se na ordem do salesReport (que é o ranking)
        const productMap = {};
        realProducts.forEach(p => productMap[p.id] = p);

        // Reconstrói a lista na ordem de vendas
        soldProductIds.forEach(id => {
          if (productMap[id]) {
            finalDisplayList.push(productMap[id]);
            excludedIds.add(id);
          }
        });
      }
    }

    // --- PASSO 3: PREENCHER SLOTS VAZIOS (LÓGICA ALEATÓRIA) ---
    // Se temos menos que 4 produtos vindos das vendas
    if (finalDisplayList.length < TOTAL_SLOTS) {
      const slotsNeeded = TOTAL_SLOTS - finalDisplayList.length;

      // Busca produtos para completar (traz um pouco a mais para garantir aleatoriedade)
      const { data: randomPool, error: randomError } = await supabase
        .from('products')
        .select('*')
        .limit(20); // Traz um lote para sortear

      if (!randomError && randomPool) {
        // Filtra os que já estão na lista de mais vendidos
        const available = randomPool.filter(p => !excludedIds.has(p.id));

        // Embaralha (Fisher-Yates)
        for (let i = available.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [available[i], available[j]] = [available[j], available[i]];
        }

        // Pega os necessários
        const fillers = available.slice(0, slotsNeeded);
        finalDisplayList = [...finalDisplayList, ...fillers];
      }
    }

    // --- PASSO 4: RENDERIZAR ---
    container.innerHTML = ''; // Limpa loader

    if (finalDisplayList.length === 0) {
      container.innerHTML = '<p>Nenhum produto disponível.</p>';
      return;
    }

    finalDisplayList.forEach((productData, index) => {
      const slotDiv = document.createElement('div');
      slotDiv.className = 'product-slot';
      slotDiv.dataset.slot = index + 1; // 1, 2, 3, 4...

      // Renderiza o card (função auxiliar já existente no seu código)
      renderProductInSlot(slotDiv, productData);
      container.appendChild(slotDiv);
    });

    // Reativa os efeitos de hover (tamanhos, cores)
    prepareProductHoverAndOptions();

  } catch (err) {
    console.error("Erro Crítico Best Sellers:", err);
    container.innerHTML = '<p>Erro ao carregar vitrine.</p>';
  }
}

/* =========================================================
   LÓGICA SWIPER (DROPS / PROMOÇÕES)
   ========================================================= */
async function loadPromotionsSwiper() {
  // Procura o wrapper do Swiper
  const swiperWrapper = document.querySelector('.promotions-day .swiper-wrapper');
  if (!swiperWrapper) return;

  swiperWrapper.innerHTML = ''; // Limpa slots vazios do HTML

  try {
    const supabase = await initSupabaseClient();

    // Busca produtos para o carrossel (Ex: últimos 6 adicionados ou de uma categoria específica)
    // Aqui estou pegando os 8 mais recentes para preencher o carrossel
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) throw error;

    if (products && products.length > 0) {
      products.forEach(productData => {
        // Estrutura necessária para o Swiper funcionar
        const slideDiv = document.createElement('div');
        slideDiv.className = 'swiper-slide';

        const slotDiv = document.createElement('div');
        slotDiv.className = 'product-slot';

        renderProductInSlot(slotDiv, productData);
        slideDiv.appendChild(slotDiv);

        swiperWrapper.appendChild(slideDiv);
      });

      prepareProductHoverAndOptions();

      // Importante: Atualizar o Swiper se ele já foi inicializado
      if (document.querySelector('.mySwiper') && document.querySelector('.mySwiper').swiper) {
        document.querySelector('.mySwiper').swiper.update();
      }
    } else {
      swiperWrapper.innerHTML = '<div class="swiper-slide"><p>Novidades em breve.</p></div>';
    }

  } catch (err) {
    console.error("Erro Swiper:", err);
  }
}

/* =========================================================
   FUNÇÃO PRINCIPAL (ORQUESTRADOR)
   ========================================================= */
async function applyProductsFromDBToDOM() {
  // Prepara o evento de finalização
  const dispatchProductEvent = () => {
    document.body.classList.add('products-logic-complete');
    document.dispatchEvent(new Event('products-logic-complete'));
  };

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const pageGroup = urlParams.get('categoria');
    const pageSpecificType = urlParams.get('tipo');
    const pageGender = urlParams.get('genero');

    const isCategoryPage = pageGroup || pageSpecificType || pageGender;

    // --- CENÁRIO 1: PÁGINA DE CATEGORIA ---
    if (isCategoryPage) {
      // Atualiza título da página
      const displayTitle = pageSpecificType || pageGroup;
      if (displayTitle) {
        updateCategoryPageTitle(displayTitle);
      }

      const filters = {};
      if (pageSpecificType) {
        filters.category = pageSpecificType;
      } else if (pageGroup && CATEGORY_GROUPS[pageGroup]) {
        filters.categoryList = CATEGORY_GROUPS[pageGroup];
      }
      if (pageGender) filters.gender = pageGender;

      // Busca no banco
      const products = await fetchProductsFromDB(filters);
      g_allCategoryProducts = products;

      if (qs('.filtros')) {
        populateFiltersUI(products);
        renderProductGrid(products);
        attachFilterListeners();

        if (products.length === 0) {
          const container = qs('.product-content-selecao');
          if (container) container.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">Nenhum produto encontrado nesta categoria.</p>';
        }
      }
      prepareProductHoverAndOptions();
    }

    // --- CENÁRIO 2: HOME PAGE (Lógica Nova) ---
    else {
      // 1. Carrega o Swiper (Promoções/Drops)
      await loadPromotionsSwiper();

      // 2. Carrega os Mais Vendidos (Top 4 + Aleatórios)
      await loadHomepageBestSellers();
    }

  } catch (err) {
    console.error('Erro ao aplicar produtos:', err);
  } finally {
    // === IMPORTANTE: Avisa que acabou de carregar os produtos ===
    dispatchProductEvent();
  }
}

function populateFiltersUI(products) {
  const colorsContainer = qs('#filtro-cores-container');
  const minPriceInput = qs('#filtro-preco-min');
  const maxPriceInput = qs('#filtro-preco-max');

  if (!colorsContainer || !minPriceInput || !maxPriceInput) return;

  const allColors = products.flatMap(p => (p.cores || []).map(c => c.nome));
  const uniqueColors = [...new Set(allColors)].filter(Boolean).sort();

  colorsContainer.innerHTML = uniqueColors.map(color => `
        <label>
            <input type="checkbox" class="filtro-cor-check" value="${color}">
            ${color}
        </label>
    `).join('');

  const prices = products.map(p => p.preco).filter(Boolean);
  if (prices.length > 0) {
    const minPrice = Math.floor(Math.min(...prices));
    const maxPrice = Math.ceil(Math.max(...prices));
    minPriceInput.placeholder = `R$ ${minPrice}`;
    maxPriceInput.placeholder = `R$ ${maxPrice}`;
  }
}

function attachFilterListeners() {
  const colorCheckboxes = qsa('.filtro-cor-check');
  const minPriceInput = qs('#filtro-preco-min');
  const maxPriceInput = qs('#filtro-preco-max');
  const applyPriceButton = qs('#btn-aplicar-preco');
  const clearButton = qs('#btn-limpar-filtros');

  const applyPriceFilter = () => {
    g_activeFilters.minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    g_activeFilters.maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
    renderProductGrid(filterProducts());
    prepareProductHoverAndOptions();
  };

  colorCheckboxes.forEach(check => {
    check.addEventListener('change', () => {
      g_activeFilters.colors = qsa('.filtro-cor-check:checked').map(c => c.value);
      renderProductGrid(filterProducts());
      prepareProductHoverAndOptions();
    });
  });

  applyPriceButton?.addEventListener('click', applyPriceFilter);

  clearButton?.addEventListener('click', () => {
    g_activeFilters = { colors: [], minPrice: null, maxPrice: null };
    if (minPriceInput) minPriceInput.value = '';
    if (maxPriceInput) maxPriceInput.value = '';
    colorCheckboxes.forEach(check => check.checked = false);
    renderProductGrid(g_allCategoryProducts);
    prepareProductHoverAndOptions();
  });
}

function applyFilteredGridWithTransition(productsToRender) {
  const productContent = qs('.product-content-selecao');
  if (!productContent) {
    renderProductGrid(productsToRender);
    return;
  }
  productContent.style.opacity = 0;
  setTimeout(() => {
    renderProductGrid(productsToRender);
    productContent.style.opacity = 1;
  }, 300);
}

function filterProducts() {
  const { colors, minPrice, maxPrice } = g_activeFilters;
  return g_allCategoryProducts.filter(product => {
    if (minPrice != null && product.preco < minPrice) return false;
    if (maxPrice != null && product.preco > maxPrice) return false;
    if (colors.length > 0) {
      const productColors = (product.cores || []).map(c => c.nome);
      const hasMatchingColor = colors.some(filterColor => productColors.includes(filterColor));
      if (!hasMatchingColor) return false;
    }
    return true;
  });
}

function renderProductGrid(productsToRender) {
  const productContent = qs('.product-content-selecao');
  if (!productContent) return;

  const currentSlots = qsa('.product-slot');
  const slotMap = new Map();
  currentSlots.forEach(slot => {
    const product = slot.querySelector('.product');
    if (product && product.dataset.id) {
      slotMap.set(product.dataset.id, slot);
    } else if (slot.querySelector('.add-product-btn')) {
      slot.remove();
    }
  });

  const newProductIds = new Set(productsToRender.map(p => p.id));

  slotMap.forEach((slot, id) => {
    if (!newProductIds.has(id)) {
      slot.classList.add('exiting');
      slot.addEventListener('transitionend', () => slot.remove(), { once: true });
      setTimeout(() => slot.remove(), 300);
    }
  });

  const elementsToRender = productsToRender.map(productData => {
    if (slotMap.has(productData.id)) {
      const existingSlot = slotMap.get(productData.id);
      existingSlot.classList.remove('exiting');
      return existingSlot;
    }
    const slotEl = document.createElement('div');
    slotEl.className = 'product-slot entering';
    renderProductInSlot(slotEl, productData);
    requestAnimationFrame(() => {
      slotEl.classList.remove('entering');
    });
    return slotEl;
  });

  productContent.replaceChildren(...elementsToRender);

  setTimeout(() => {
    addAdminButtonsToGrid(productContent, productsToRender.length);
  }, 350);
}

function updateCategoryPageTitle(category) {
  const titleSpan = qs('.after-title-header-selecao');
  const pageTitleTag = qs('title');

  if (!category) return;

  const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
  let pluralCategory;
  if (category === 'bone') {
    pluralCategory = 'Bonés';
  } else if (category === 'calca') {
    pluralCategory = 'Calças';
  } else if (category.endsWith('a') || category.endsWith('o') || category.endsWith('e') || category.endsWith('r')) {
    pluralCategory = capitalizedCategory + 's';
  } else {
    pluralCategory = capitalizedCategory;
  }

  if (titleSpan) titleSpan.textContent = ` | ${pluralCategory}`;
  if (pageTitleTag) pageTitleTag.textContent = `TopStyle - ${pluralCategory}`;
}

/* ============ Inicialização Geral ============ */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (qs('#header')) initHeaderAndUIInteractions();
    if (qs('#preloader')) handlePreloaderAndIntro();
    await applyProductsFromDBToDOM();

    if (qs('#cart-count')) {
      updateCartCountUI();
      document.addEventListener('cart-updated', updateCartCountUI);
    }
  } catch (err) {
    console.error('Erro na inicialização do main.js', err);
  }
});

/* ===============================================
    ANIMAÇÃO CARDS DE PRODUTOS 
    =============================================== */
const cards = document.querySelectorAll('.card-opt');
const mediaQueryDesktop = window.matchMedia('(min-width: 1024px)');

function handleCardAnimation(mq) {
  if (mq.matches) {
    cards.forEach(card => {
      if (card._faixa && card._txt) {
        card._faixa.style.opacity = '0';
        card._faixa.style.width = '0';
        card._txt.style.opacity = '0';
      }
    });
  } else {
    cards.forEach(card => {
      if (card._faixa && card._txt) {
        card._faixa.style.opacity = '1';
        card._faixa.style.width = '250%';
        card._txt.style.opacity = '1';
      }
      card.classList.remove('inactive', 'active');
    });
  }
}

cards.forEach(card => {
  const faixa = document.createElement('div');
  faixa.classList.add('faixa-diagonal');
  const txt = document.createElement('div');
  txt.classList.add('texto');
  txt.textContent = card.getAttribute('data-category') || '';
  faixa.appendChild(txt);
  card.appendChild(faixa);

  card._faixa = faixa;
  card._txt = txt;

  card.addEventListener('mouseenter', () => {
    if (!mediaQueryDesktop.matches) return;
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
    if (!mediaQueryDesktop.matches) return;
    cards.forEach(c => {
      c.classList.remove('inactive', 'active');
    });
  });

  card.addEventListener('mouseenter', () => {
    if (!mediaQueryDesktop.matches) return;
    faixa.style.opacity = '1';
    faixa.style.width = '250%';
    txt.style.opacity = '1';
  });

  card.addEventListener('mouseleave', () => {
    if (!mediaQueryDesktop.matches) return;
    faixa.style.opacity = '0';
    faixa.style.width = '0';
    txt.style.opacity = '0';
  });

  card.addEventListener('transitionend', () => {
    if (!mediaQueryDesktop.matches) return;
    if (card.classList.contains('active')) {
      faixa.style.opacity = '1';
      faixa.style.width = '250%';
      txt.style.opacity = '1';
    }
  });
});

mediaQueryDesktop.addEventListener('change', handleCardAnimation);
handleCardAnimation(mediaQueryDesktop);

/* banner principal */
const banner = document.getElementById('banner');
const mediaQueries = {
  mobilev1: window.matchMedia('(max-width: 349px)'),
  mobilev2: window.matchMedia('(min-width: 350px) and (max-width: 510px)'),
  mobilev3: window.matchMedia('(min-width: 511px) and (max-width: 767px)'),
  tablet: window.matchMedia('(min-width: 768px) and (max-width: 1023px)'),
  desktopv1: window.matchMedia('(min-width: 1024px) and (max-width: 1600px)'),
  desktopv2: window.matchMedia('(min-width: 1601px)')
};

function atualizarImagem() {
  if (mediaQueries.mobilev1.matches) {
    banner.src = 'https://i.ibb.co/tPpG0vHV/principalimg.png';
  } else if (mediaQueries.mobilev2.matches) {
    banner.src = 'https://i.ibb.co/fVVWFzqp/responsive-700px.jpg';
  } else if (mediaQueries.mobilev3.matches) {
    banner.src = 'https://i.ibb.co/NgLPJN1F/png004.jpg';
  } else if (mediaQueries.tablet.matches) {
    banner.src = 'https://i.ibb.co/LdX51VF6/responsive-1000px.jpg';
  } else if (mediaQueries.desktopv1.matches) {
    banner.src = 'https://i.ibb.co/DggpLyys/responsive-1400px.jpg';
  } else if (mediaQueries.desktopv2.matches) {
    banner.src = 'https://i.ibb.co/tPpG0vHV/principalimg.png';
  }
}
atualizarImagem();
Object.values(mediaQueries).forEach(mq => {
  mq.addEventListener('change', atualizarImagem);
});

// Substitua a função window.openEditModalById existente por esta versão:

window.openEditModalById = async function (productId) {
  console.log("Tentando editar produto ID:", productId);

  // Feedback visual imediato
  if (window.showToast) showToast('Carregando dados do produto...');

  try {
    const supabase = await window.initSupabaseClient();

    // 1. Busca dados do produto
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) throw new Error("Erro ao buscar produto: " + error.message);
    if (!product) throw new Error("Produto não encontrado no banco de dados.");

    console.log("Produto carregado:", product);

    // 2. Prepara o objeto fakeNode para reutilizar a função existente
    // Garante que a estrutura de cores esteja correta
    if (!product.cores) product.cores = [];

    const fakeProductNode = document.createElement('div');
    fakeProductNode.__productMeta = product;

    // 3. Verifica se a função de construção do modal existe
    if (typeof openEditModalForProduct === 'function') {
      openEditModalForProduct(fakeProductNode);
    } else {
      throw new Error("Função interna 'openEditModalForProduct' não encontrada.");
    }

  } catch (err) {
    console.error("Erro crítico ao abrir modal:", err);
    if (window.showToast) showToast('Erro: ' + err.message);
    else alert('Erro: ' + err.message);
  }
};

// Certifique-se também que a função openEditModalForProduct está abrindo o modal corretamente:
// (Não precisa substituir a função inteira, apenas verifique se no final ela tem isso:)
// showAdminModal(modal); 
// E se showAdminModal faz: modal.style.display = 'flex'; ou adiciona classe .flex

/* =========================================================
   INTERCEPTADOR DE LINKS PROTEGIDOS (USANDO MODAL EXISTENTE)
   ========================================================= */

document.addEventListener('click', async (e) => {
  // 1. Verifica se o elemento clicado (ou pai) é um link <a>
  const link = e.target.closest('a');

  // Se não for link ou se o link não tiver href, ignora
  if (!link || !link.getAttribute('href')) return;

  const href = link.getAttribute('href');

  // 2. Lista de páginas que exigem login
  const protectedPages = [
    'perfil-cliente.html',
    'carrinho.html',
    'pagamento.html',
    'checkout.html'
  ];

  // Verifica se o link aponta para uma página protegida
  const isProtected = protectedPages.some(page => href.includes(page));

  if (isProtected) {
    // Pausa o clique imediatamente para verificar a sessão
    e.preventDefault();

    try {
      // Verifica sessão (usa a função global se existir ou tenta direto)
      const supabase = await window.initSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // SE TEM LOGIN: Libera o usuário para ir à página
        window.location.href = href;
      } else {
        // SE NÃO TEM LOGIN: Usa seu modal de confirmação existente
        const irParaLogin = await window.showConfirmationModal(
          "Você precisa estar logado para acessar esta área. Deseja entrar agora?",
          {
            okText: 'Entrar / Criar Conta',
            cancelText: 'Continuar Navegando'
          }
        );

        if (irParaLogin) {
          window.location.href = 'index.html'; // Vai para Login
        }
        // Se cancelar, nada acontece (ele continua na página atual)
      }
    } catch (err) {
      console.error("Erro ao verificar sessão:", err);
      // Em caso de erro técnico, previne acesso por segurança
      window.location.href = 'index.html';
    }
  }
});

/* ============ MONITORAMENTO DE BANIMENTO EM TEMPO REAL (AGRESSIVO) ============ */
async function initRealtimeBanMonitor() {
  try {
    const supabase = await initSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Se não tem usuário logado, não precisa monitorar
    if (!user) return;

    // Função de expulsão imediata
    const executeBan = async (reason) => {
      console.warn("BANIMENTO DETECTADO! ENCERRANDO SESSÃO...");
      await supabase.auth.signOut();
      localStorage.removeItem('userRole');
      // Redireciona imediatamente
      window.location.href = `index.html?banned=true&reason=${encodeURIComponent(reason || "Violação dos termos")}`;
    };

    // 1. Verificação Inicial (Ao carregar a página)
    const { data: banData } = await supabase
      .from('user_bans')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (banData) {
      // Verifica se o banimento temporário ainda é válido
      let isActive = true;
      if (banData.ban_type === 'temporary' && banData.banned_until) {
        if (new Date() > new Date(banData.banned_until)) isActive = false;
      }
      if (isActive) {
        await executeBan(banData.reason);
        return;
      }
    }

    // 2. Listener em Tempo Real (Dispara em < 1 segundo na maioria das conexões)
    const banChannel = supabase.channel('public:user_bans_monitor')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_bans',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Assim que o admin clicar em "Banir", isso dispara
          executeBan(payload.new.reason);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log(" Monitoramento de banimento ativo.");
      });

  } catch (err) {
    console.error("Erro no monitor de banimento:", err);
  }
}

/* ============ GUARD: BLOQUEIO DE AÇÕES PARA BANIDOS ============ */
// Esta função verifica se o usuário está banido antes de realizar ações críticas
async function checkIfBanned(user_id) {
  if (!user_id) return false;
  const supabase = await initSupabaseClient();
  const { data } = await supabase.from('user_bans').select('id').eq('user_id', user_id).maybeSingle();
  if (data) {
    // Se encontrar banimento, força logout na hora
    await supabase.auth.signOut();
    window.location.href = "index.html?banned=true";
    return true; // Está banido
  }
  return false;
}

// Inicializa o monitor quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  initRealtimeBanMonitor();
});

document.addEventListener('DOMContentLoaded', () => {
  // Verifica se existe uma mensagem salva
  const message = sessionStorage.getItem('toastMessage');

  if (message) {
    // Exibe o Toast usando sua função global
    if (typeof showToast === 'function') {
      // Pequeno delay para garantir que a página carregou visualmente
      setTimeout(() => {
        showToast(message, 'success'); // ou 'info'
      }, 500);
    } else {
      alert(message); // Fallback caso showToast não esteja pronto
    }

    // Limpa a mensagem para não aparecer de novo se recarregar a página
    sessionStorage.removeItem('toastMessage');
  }
});

/* ============ MONITORAMENTO DE ESTOQUE EM TEMPO REAL ============ */
document.addEventListener('DOMContentLoaded', async () => {
  // Pequeno delay para garantir que supabaseClient esteja pronto
  setTimeout(async () => {
    try {
      const supabase = await window.initSupabaseClient();

      // Escuta qualquer UPDATE na tabela 'products'
      const stockChannel = supabase.channel('public:products_stock_monitor')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'products' },
          (payload) => {
            const newProduct = payload.new;

            // 1. Se o modal de edição desse produto estiver aberto, atualiza o input
            const modalTitleInput = document.getElementById('modal-title-input');
            const modalStockInput = document.getElementById('modal-stock-input');

            // Checagem simples pelo nome para saber se é o produto do modal
            if (modalTitleInput && modalStockInput && modalTitleInput.value === newProduct.nome) {
              // Só atualiza se o usuário não estiver focado digitando nele
              if (document.activeElement !== modalStockInput) {
                modalStockInput.value = newProduct.stock;
                modalStockInput.style.backgroundColor = '#e6fffa'; // Flash verde sutil
                setTimeout(() => modalStockInput.style.backgroundColor = '', 1000);
              }
            }

            // 2. Se estiver na Dashboard, atualiza a célula da tabela (se existir célula com ID específico)
            // (Você precisaria adicionar IDs nas células da dashboard para isso funcionar 100% lá)
          }
        )
        .subscribe();

    } catch (err) {
      console.error("Erro no monitoramento de estoque:", err);
    }
  }, 1000);
});


