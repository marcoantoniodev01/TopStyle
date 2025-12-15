// assets/js/cupons.js



// ==========================================
// 1. ESTADO GLOBAL
// ==========================================
let couponState = {
    primaryColor: '#000000',
    secondaryColor: '#f0f0f0',
    borderStyle: 'dashed',
    type: 'discount', // 'discount' ou 'shipping'
    value: 0,
    shippingType: 'free' // 'free' ou 'percent'
};

let currentEditId = null; 

// ==========================================
// 2. CONEXÃO SEGURA
// ==========================================
async function getSupabase() {
    // 1. Tenta capturar as instâncias criadas na dashboard.js que estão no escopo global
    try { if (typeof supabaseAdmin !== 'undefined' && supabaseAdmin.from) return supabaseAdmin; } catch(e){}
    try { if (typeof client !== 'undefined' && client.from) return client; } catch(e){}

    // 2. Se as variáveis não estiverem acessíveis por escopo, criamos uma instância local
    const URL = "https://xhzdyatnfaxnvvrllhvs.supabase.co";
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo";
    
    return window.supabase.createClient(URL, KEY);
}

// ==========================================
// 3. INICIALIZAÇÃO E EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    initVisualControls(); // Inicia os listeners de clique
    await loadCoupons();  // Carrega a lista

    // Inputs que atualizam o preview em tempo real
    ['coupon-code', 'coupon-desc', 'coupon-expires'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', updatePreview);
    });

    // Botão Salvar
    const btnSave = document.getElementById('btn-save-coupon');
    if (btnSave) btnSave.addEventListener('click', window.saveCoupon);

    // Botão Cancelar Modal
    const btnCancel = document.getElementById('btn-cancel-modal');
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
});

// ==========================================
// 4. CONTROLES VISUAIS (Clicks e Seleções)
// ==========================================
function initVisualControls() {
    
    // --- 4.1 SELETOR DE TIPO (Dropdown Customizado) ---
    // Logica para abrir/fechar dropdowns customizados
    document.querySelectorAll('.admin-custom-select').forEach(dd => {
        const trigger = dd.querySelector('.select-trigger');
        const options = dd.querySelectorAll('.select-option');
        
        if(trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Fecha outros abertos
                document.querySelectorAll('.admin-custom-select').forEach(other => { if(other !== dd) other.classList.remove('open'); });
                dd.classList.toggle('open');
            });
        }

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                const val = opt.dataset.value;
                const text = opt.innerText;
                const icon = opt.querySelector('i') ? opt.querySelector('i').outerHTML : '';

                // Atualiza texto do trigger
                const span = dd.querySelector('.select-trigger span');
                if(span) span.innerHTML = `${icon} ${text}`;

                // Roteamento de Lógica
                if (dd.id === 'select-type-wrapper') setCouponTypeUI(val);
                if (dd.id === 'select-border-wrapper') {
                    couponState.borderStyle = val;
                    updatePreview();
                }
                dd.classList.remove('open');
            });
        });
    });

    // Fecha dropdown ao clicar fora
    document.addEventListener('click', () => {
        document.querySelectorAll('.admin-custom-select').forEach(dd => dd.classList.remove('open'));
    });


    // --- 4.2 BOTÕES DE PORCENTAGEM (Desconto Produto) ---
    document.querySelectorAll('#discount-options .percent-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active de todos e adiciona no clicado
            document.querySelectorAll('#discount-options .percent-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Atualiza estado
            couponState.value = parseInt(this.dataset.value);
            updatePreview();
        });
    });

    // --- 4.3 BOTÕES DE PORCENTAGEM (Desconto Frete) ---
    document.querySelectorAll('#shipping-percent-grid .percent-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#shipping-percent-grid .percent-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            couponState.value = parseInt(this.dataset.value);
            updatePreview();
        });
    });


    // --- 4.4 CARDS DE TIPO DE FRETE (Grátis vs % OFF) ---
    document.querySelectorAll('.shipping-card-option').forEach(card => {
        card.addEventListener('click', function() {
            // UI Toggle
            document.querySelectorAll('.shipping-card-option').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');

            // Logic
            const val = this.dataset.value; // 'free' ou 'percent'
            couponState.shippingType = val;

            const percentWrapper = document.getElementById('shipping-percent-wrapper');
            if (val === 'free') {
                percentWrapper.classList.add('hidden');
                couponState.value = 100; // Frete grátis tecnicamente é 100% off no frete
            } else {
                percentWrapper.classList.remove('hidden');
                couponState.value = 0; // Reseta para obrigar escolha
                // Reseta botões visuais
                document.querySelectorAll('#shipping-percent-grid .percent-btn').forEach(b => b.classList.remove('active'));
            }
            updatePreview();
        });
    });


    // --- 4.5 SELETORES DE COR (Bolinhas) ---
    const setupColorPickers = (containerId, stateKey) => {
        const container = document.getElementById(containerId);
        if(!container) return;

        // Bolinhas predefinidas
        container.querySelectorAll('.color-dot:not(.custom-wrapper)').forEach(dot => {
            dot.addEventListener('click', function() {
                container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                this.classList.add('active');
                couponState[stateKey] = this.dataset.color;
                updatePreview();
            });
        });

        // Input Customizado
        const customInput = container.querySelector('input[type="color"]');
        if(customInput) {
            customInput.addEventListener('input', function() {
                container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                this.parentElement.classList.add('active'); // Ativa o wrapper do input
                couponState[stateKey] = this.value;
                updatePreview();
            });
        }
    };

    setupColorPickers('primary-colors', 'primaryColor');
    setupColorPickers('secondary-colors', 'secondaryColor');
}

// --- Helper para trocar a UI de Tipo (Desconto vs Frete) ---
function setCouponTypeUI(type) {
    couponState.type = type;
    
    const discountOpt = document.getElementById('discount-options');
    const shippingOpt = document.getElementById('shipping-options');

    // Reseta visibilidade
    discountOpt.classList.add('hidden');
    shippingOpt.classList.add('hidden');

    if (type === 'discount') {
        discountOpt.classList.remove('hidden');
        discountOpt.classList.add('fade-in');
    } else if (type === 'shipping') {
        shippingOpt.classList.remove('hidden');
        shippingOpt.classList.add('fade-in');
    }
    updatePreview();
}


// ==========================================
// 5. UPDATE PREVIEW (A Visualização Real-time)
// ==========================================
function updatePreview() {
    const code = document.getElementById('coupon-code').value || 'SEUCODIGO';
    const previewTicket = document.getElementById('preview-ticket');
    const previewText = document.getElementById('preview-text');

    if (!previewTicket || !previewText) return;

    // Lógica do Texto Principal
    let mainHtml = '';
    
    if (couponState.type === 'shipping') {
        if (couponState.shippingType === 'free' || couponState.value >= 100) {
            mainHtml = `<div style="line-height:1; font-size:1.40rem;">FRETE GRÁTIS</div>`;
        } else {
            const val = couponState.value || 0;
            mainHtml = `<div style="font-size:1.5em;">-${val}%</div><div style="font-size:0.6em; opacity:0.8;">DE FRETE</div>`;
        }
    } else {
        // Desconto Produto
        const val = couponState.value || 0;
        mainHtml = `<div style="font-size:1.6rem;">${val}% OFF</div>`;
    }

    // Renderiza
    previewText.innerHTML = mainHtml;

    // Aplica Estilos
    previewTicket.style.backgroundColor = couponState.secondaryColor;
    previewTicket.style.color = couponState.primaryColor;
    previewTicket.style.borderColor = couponState.primaryColor;
    previewTicket.style.borderStyle = couponState.borderStyle;
    previewTicket.style.borderWidth = '2px';
}


// ==========================================
// 6. FUNÇÃO DE EDITAR (Preenchendo tudo)
// ==========================================
window.editCoupon = async function(id) {
    const supabase = await getSupabase();
    
    // 1. Busca Dados
    const { data, error } = await supabase.from('coupons').select('*').eq('id', id).single();
    if (error || !data) return alert('Erro ao carregar cupom.');

    // 2. Preenche Campos de Texto... (código existente)
    document.getElementById('coupon-id').value = data.id;
    document.getElementById('coupon-code').value = data.code;
    document.getElementById('coupon-desc').value = data.description || '';
    if (data.expires_at) {
        document.getElementById('coupon-expires').value = data.expires_at.split('T')[0];
    } else {
        document.getElementById('coupon-expires').value = '';
    }

    // 3. Recupera Estilos Visuais... (código existente)
    let props = data.visual_props || data.style;
    if (typeof props === 'string') props = JSON.parse(props);
    if (!props) props = { primaryColor:'#000', secondaryColor:'#fff', borderStyle:'dashed', shippingType:'free' };

    // --- CORREÇÃO: MAPEAMENTO REVERSO DO TIPO PARA A UI ---
    let uiType = 'discount'; // Padrão da UI
    if (data.type.includes('shipping')) {
        uiType = 'shipping';
    }
    // Se for discount_percent ou fixed, a UI trata como 'discount' por enquanto
    // --------------------------------------------------------

    // Atualiza Estado Global
    couponState = {
        primaryColor: props.primaryColor,
        secondaryColor: props.secondaryColor,
        borderStyle: props.borderStyle,
        type: uiType, // Usa o tipo da UI, não o do banco
        value: data.value,
        shippingType: props.shippingType || (data.type === 'shipping_free' ? 'free' : 'percent')
    };
    
    // 4. RESTAURA A UI...
    // A) Dropdown de Tipo
    const typeText = uiType === 'shipping' ? 'Frete / Entrega' : 'Desconto no Produto';
    const typeIcon = uiType === 'shipping' ? '<i class="ri-truck-line"></i>' : '<i class="ri-price-tag-3-line"></i>';
    document.querySelector('#select-type-wrapper .select-trigger span').innerHTML = `${typeIcon} ${typeText}`;
    setCouponTypeUI(uiType);

    // B) Seleção de Valor (Porcentagem) e Subtipo de Frete
    if (data.type === 'discount') {
        // Remove active de todos e acha o correto
        document.querySelectorAll('#discount-options .percent-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.value) == data.value) btn.classList.add('active');
        });
    } else {
        // É Frete
        const sType = props.shippingType || (data.value >= 100 ? 'free' : 'percent');
        
        // Seleciona o Card (Free ou Percent)
        document.querySelectorAll('.shipping-card-option').forEach(c => {
            c.classList.remove('selected');
            if(c.dataset.value === sType) c.classList.add('selected');
        });

        // Mostra/Esconde opções de porcentagem do frete
        const percentWrapper = document.getElementById('shipping-percent-wrapper');
        if(sType === 'free') {
            percentWrapper.classList.add('hidden');
        } else {
            percentWrapper.classList.remove('hidden');
            // Ativa o botão correto da % do frete
            document.querySelectorAll('#shipping-percent-grid .percent-btn').forEach(btn => {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.value) == data.value) btn.classList.add('active');
            });
        }
    }

    // C) Restaura Dropdown de Borda
    const borderMap = { 'dashed': 'Tracejada', 'solid': 'Sólida', 'dotted': 'Pontilhada', 'double': 'Dupla' };
    document.querySelector('#select-border-wrapper .select-trigger span').innerText = borderMap[props.borderStyle] || 'Tracejada';

    // D) Restaura Cores (Ativa a bolinha certa)
    const restoreColorUI = (containerId, colorValue) => {
        const container = document.getElementById(containerId);
        let found = false;
        // Tenta achar bolinha exata
        container.querySelectorAll('.color-dot:not(.custom-wrapper)').forEach(dot => {
            dot.classList.remove('active');
            if(dot.dataset.color.toLowerCase() === colorValue.toLowerCase()) {
                dot.classList.add('active');
                found = true;
            }
        });
        // Se não achou, ativa o custom picker
        if(!found) {
            const wrapper = container.querySelector('.custom-wrapper');
            const input = wrapper.querySelector('input');
            wrapper.classList.add('active');
            input.value = colorValue;
        }
    };
    restoreColorUI('primary-colors', props.primaryColor);
    restoreColorUI('secondary-colors', props.secondaryColor);


    // 5. Configurações Finais do Modal
    currentEditId = id;
    document.getElementById('modal-title').innerText = "Editar Cupom";
    document.getElementById('btn-save-coupon').innerText = "Atualizar Cupom";
    
    updatePreview(); // Atualiza visualização final
    
    // Abre modal
    document.getElementById('modal-coupon').style.display = 'flex';
};


// ==========================================
// 7. FUNÇÃO DE ABRIR MODAL (NOVO)
// ==========================================
window.openModal = function() {
    currentEditId = null;
    document.getElementById('modal-title').innerText = "Novo Cupom";
    document.getElementById('btn-save-coupon').innerText = "Salvar Cupom";
    
    // Reset Form
    document.getElementById('coupon-code').value = '';
    document.getElementById('coupon-desc').value = '';
    document.getElementById('coupon-expires').value = '';
    
    // Reset UI Defaults
    setCouponTypeUI('discount');
    document.querySelector('#select-type-wrapper .select-trigger span').innerHTML = '<i class="ri-price-tag-3-line"></i> Desconto no Produto';
    
    // Remove active buttons
    document.querySelectorAll('.percent-btn, .shipping-card-option').forEach(el => el.classList.remove('active', 'selected'));
    
    // Reset Colors
    couponState = { primaryColor:'#000000', secondaryColor:'#f0f0f0', borderStyle:'dashed', type:'discount', value:0, shippingType:'free' };
    
    // Simula clique na primeira cor para reset visual
    const pDots = document.querySelectorAll('#primary-colors .color-dot');
    if(pDots[0]) pDots[0].click();
    
    updatePreview();
    document.getElementById('modal-coupon').style.display = 'flex';
};

window.closeModal = function() {
    document.getElementById('modal-coupon').style.display = 'none';
};


// ==========================================
// 8. SALVAR (CREATE / UPDATE)
// ==========================================
window.saveCoupon = async function() {
    const supabase = await getSupabase();
    
    const code = document.getElementById('coupon-code').value.toUpperCase().trim();
    const desc = document.getElementById('coupon-desc').value.trim();
    const expires = document.getElementById('coupon-expires').value;

    if (!code) return alert("O código é obrigatório!");
    if (couponState.type === 'discount' && !couponState.value) return alert("Selecione a porcentagem!");

    // --- CORREÇÃO: DEFINIR TIPO ESPECÍFICO ---
    let finalType = 'fixed'; // Fallback

    if (couponState.type === 'discount') {
        // Assume percentual pois seu modal só tem botões de %
        finalType = 'discount_percent'; 
    } else if (couponState.type === 'shipping') {
        if (couponState.shippingType === 'free') {
            finalType = 'shipping_free';
        } else {
            finalType = 'shipping_percent';
        }
    }
    // ------------------------------------------

    const payload = {
        code: code,
        description: desc,
        type: finalType, // Usamos a variável corrigida aqui
        value: parseFloat(couponState.value),
        status: 'active',
        expires_at: expires ? new Date(expires).toISOString() : null,
        style: {
            primaryColor: couponState.primaryColor,
            secondaryColor: couponState.secondaryColor,
            borderStyle: couponState.borderStyle,
            shippingType: couponState.shippingType
        }
    };

    // ... (o restante da função saveCoupon permanece igual: try/catch, update/insert) ...
    try {
        let result;
        if (currentEditId) {
            result = await supabase.from('coupons').update(payload).eq('id', currentEditId);
        } else {
            result = await supabase.from('coupons').insert([payload]);
        }

        if (result.error) throw result.error;

        alert(currentEditId ? "Cupom atualizado!" : "Cupom criado!");
        closeModal();
        loadCoupons(); 

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro no banco: " + error.message);
    }
};

// ==========================================
// 9. RENDERIZAÇÃO DA LISTA
// ==========================================
window.loadCoupons = async () => {
    const supabase = await getSupabase();
    const list = document.getElementById('coupons-list');
    list.innerHTML = '<div style="padding:20px;">Carregando...</div>';

    const { data: coupons } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });

    list.innerHTML = '';
    if(!coupons || !coupons.length) {
        list.innerHTML = '<div style="padding:20px; text-align:center;">Nenhum cupom criado.</div>';
        return;
    }

    coupons.forEach(c => list.appendChild(createCouponCard(c)));
};

function createCouponCard(coupon) {
    const div = document.createElement('div');
    // Mantém a lógica de classe suspended
    div.className = `coupon-card-row ${coupon.status === 'suspended' ? 'suspended' : ''}`;
    
    // Recupera estilos visuais
    let props = coupon.visual_props || coupon.style;
    if (typeof props === 'string') props = JSON.parse(props);
    if (!props) props = { primaryColor:'#000', secondaryColor:'#fff', borderStyle:'dashed' };

    // --- LÓGICA CORRIGIDA DO BADGE ---
    let displayText = "";
    
    if (coupon.type === 'shipping_free') {
        displayText = 'FRETE GRÁTIS';
    } else if (coupon.type === 'discount_percent') {
        displayText = `${coupon.value}% OFF`;
    } else if (coupon.type === 'shipping_percent') {
        displayText = `-${coupon.value}% NO FRETE`;
    } else {
        // Fallback para tipos antigos ou genéricos
        if (coupon.type === 'discount') {
             displayText = `${coupon.value}% OFF`;
        } else if (coupon.type === 'shipping') {
             // Se for shipping genérico, tenta adivinhar pelo valor
             displayText = (coupon.value >= 100) ? 'FRETE GRÁTIS' : `-${coupon.value}% NO FRETE`;
        } else {
             displayText = `R$ ${coupon.value}`;
        }
    }
    // ---------------------------------

    div.innerHTML = `
        <div class="coupon-card-left">
            <div class="coupon-visual-box" style="
                background-color: ${props.secondaryColor}; 
                color: ${props.primaryColor};
                border: 2px ${props.borderStyle} ${props.primaryColor};
            ">
                ${displayText}
            </div>
            <div class="coupon-info">
                <h4>${coupon.code}</h4>
                <p>${coupon.description || ''}</p>
                <small>Expira: ${coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Nunca'}</small>
            </div>
        </div>
        <div class="coupon-card-actions">
            <button class="btn-card-action btn-card-suspend" onclick="toggleStatus('${coupon.id}', '${coupon.status}')">
                ${coupon.status==='active' ? 'Suspender' : 'Ativar'}
            </button>
            <button class="btn-card-action btn-card-edit" onclick="editCoupon('${coupon.id}')">Editar</button>
            <button class="btn-card-action btn-card-delete" onclick="deleteCoupon('${coupon.id}')"><i class="ri-delete-bin-line"></i></button>
        </div>
    `;
    return div;
}

// Ações Rápidas
window.toggleStatus = async (id, status) => {
    const novo = status === 'active' ? 'suspended' : 'active';
    const supabase = await getSupabase();
    await supabase.from('coupons').update({ status: novo }).eq('id', id);
    loadCoupons();
};

window.deleteCoupon = async (id) => {
    if(confirm("Excluir cupom?")) {
        const supabase = await getSupabase();
        await supabase.from('coupons').delete().eq('id', id);
        loadCoupons();
    }
};