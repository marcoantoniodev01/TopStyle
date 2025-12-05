// cupons.js - Lógica Atualizada com UI Customizada

let couponState = {
    primaryColor: '#000000',
    secondaryColor: '#f0f0f0',
    borderStyle: 'dashed',
    type: '', // 'discount' | 'shipping'
    value: 0,
    shippingType: 'free' // 'free' | 'percent'
};

// Elementos DOM
const modal = document.getElementById('modal-coupon');
const listContainer = document.getElementById('coupons-list');
const previewTicket = document.getElementById('preview-ticket');
const previewText = document.getElementById('preview-text');

// Inputs e Custom Controls
const codeInput = document.getElementById('coupon-code');
const typeInputHidden = document.getElementById('coupon-main-type'); // Hidden input
const descInput = document.getElementById('coupon-desc');
const expiresInput = document.getElementById('coupon-expires');
const borderInputHidden = document.getElementById('border-style-value'); // Hidden input

// Seções Dinâmicas
const discountOptions = document.getElementById('discount-options');
const shippingOptions = document.getElementById('shipping-options');
const percentBtns = document.querySelectorAll('#discount-options .percent-btn');
const shippingPercentBtns = document.querySelectorAll('#shipping-percent-grid .percent-btn');
const shippingPercentWrapper = document.getElementById('shipping-percent-wrapper');

document.addEventListener('DOMContentLoaded', async () => {
    // ... (Inicialização do Supabase e verificação de Admin mantém igual) ...
    const supabase = await window.initSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }
    
    // Carregar Cupons
    loadCoupons();

    // Listeners Globais
    document.getElementById('btn-open-create').addEventListener('click', openCreateModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
    document.getElementById('btn-save-coupon').addEventListener('click', saveCoupon);

    // --- Lógica dos Dropdowns Customizados ---
    setupCustomDropdowns();

    // --- Lógica de Botões de Porcentagem (Desconto Produto) ---
    percentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            percentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            couponState.value = btn.dataset.value;
            updatePreview();
        });
    });

    // --- Lógica de Botões de Porcentagem (Frete) ---
    shippingPercentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            shippingPercentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            couponState.value = btn.dataset.value;
            updatePreview();
        });
    });

    // --- Lógica dos Cards de Frete ---
    document.querySelectorAll('.shipping-card-option').forEach(card => {
        card.addEventListener('click', () => {
            // Remove seleção anterior
            document.querySelectorAll('.shipping-card-option').forEach(c => c.classList.remove('selected'));
            // Adiciona seleção atual
            card.classList.add('selected');
            
            // Marca o radio interno (opcional, mas bom pra forms)
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;

            // Atualiza estado
            couponState.shippingType = card.dataset.value;
            
            // Atualiza UI
            updateShippingUI();
            updatePreview();
        });
    });

    setupColorPickers();
});

function setupCustomDropdowns() {
    // Dropdown de TIPO
    const typeWrapper = document.getElementById('select-type-wrapper');
    const typeTrigger = typeWrapper.querySelector('.select-trigger');
    const typeOptions = typeWrapper.querySelectorAll('.select-option');
    const typeText = document.getElementById('select-type-text');

    typeTrigger.addEventListener('click', () => {
        typeWrapper.classList.toggle('open');
        // Fecha o outro se estiver aberto
        document.getElementById('select-border-wrapper').classList.remove('open');
    });

    typeOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const value = opt.dataset.value;
            const text = opt.innerText;
            
            // UI
            typeText.innerText = text;
            typeWrapper.classList.remove('open');
            typeOptions.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Lógica
            couponState.type = value;
            typeInputHidden.value = value;
            updateFormUI();
            updatePreview();
        });
    });

    // Dropdown de BORDA
    const borderWrapper = document.getElementById('select-border-wrapper');
    const borderTrigger = borderWrapper.querySelector('.select-trigger');
    const borderOptions = borderWrapper.querySelectorAll('.select-option');
    const borderText = document.getElementById('select-border-text');

    borderTrigger.addEventListener('click', () => {
        borderWrapper.classList.toggle('open');
        // Fecha o outro
        document.getElementById('select-type-wrapper').classList.remove('open');
    });

    borderOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const value = opt.dataset.value;
            const text = opt.textContent; // Pega só o texto, ignorando o span visual no log se quiser
            
            // UI
            // Clona o conteúdo (span + texto) para o trigger
            borderText.innerHTML = opt.innerHTML;
            borderWrapper.classList.remove('open');
            borderOptions.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Lógica
            couponState.borderStyle = value;
            borderInputHidden.value = value;
            updatePreview();
        });
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!typeWrapper.contains(e.target)) typeWrapper.classList.remove('open');
        if (!borderWrapper.contains(e.target)) borderWrapper.classList.remove('open');
    });
}

function updateFormUI() {
    discountOptions.classList.add('hidden');
    shippingOptions.classList.add('hidden');

    if (couponState.type === 'discount') {
        discountOptions.classList.remove('hidden');
        if(!couponState.value) {
            // Seleciona 10% padrão
            percentBtns[1].click(); 
        }
    } 
    else if (couponState.type === 'shipping') {
        shippingOptions.classList.remove('hidden');
        updateShippingUI();
    }
}

function updateShippingUI() {
    if (couponState.shippingType === 'percent') {
        shippingPercentWrapper.classList.remove('hidden');
        if(!couponState.value) {
            // Seleciona o primeiro botão se não tiver valor
            shippingPercentBtns[0].click();
        }
    } else {
        shippingPercentWrapper.classList.add('hidden');
        couponState.value = null; // Frete grátis não tem %
    }
}

function updatePreview() {
    // 1. Texto
    let text = "CUPOM";
    if (couponState.type === 'discount') {
        text = `${couponState.value}% OFF`;
    } else if (couponState.type === 'shipping') {
        if (couponState.shippingType === 'free') {
            text = "FRETE GRÁTIS";
        } else {
            text = `-${couponState.value}% FRETE`;
        }
    }
    previewText.textContent = text;

    // 2. Estilos
    previewTicket.style.border = `2px ${couponState.borderStyle} ${couponState.primaryColor}`;
    previewTicket.style.color = couponState.primaryColor;
    previewTicket.style.backgroundColor = couponState.secondaryColor;
}

// ... (setupColorPickers, loadCoupons, renderList mantêm iguais ao anterior) ...
function setupColorPickers() {
     // Copie a função setupColorPickers do arquivo anterior, ela não mudou a lógica, só CSS
    const setPrimary = (color) => {
        couponState.primaryColor = color;
        document.querySelectorAll('#primary-colors .color-dot').forEach(d => {
            d.classList.toggle('active', d.dataset.color === color || (d.classList.contains('custom-wrapper') && !d.dataset.color));
        });
        updatePreview();
    };
    document.querySelectorAll('#primary-colors .color-dot[data-color]').forEach(dot => {
        dot.addEventListener('click', () => setPrimary(dot.dataset.color));
    });
    document.getElementById('custom-primary').addEventListener('input', (e) => setPrimary(e.target.value));

    const setSecondary = (color) => {
        couponState.secondaryColor = color;
        document.querySelectorAll('#secondary-colors .color-dot').forEach(d => {
            d.classList.toggle('active', d.dataset.color === color || (d.classList.contains('custom-wrapper') && !d.dataset.color));
        });
        updatePreview();
    };
    document.querySelectorAll('#secondary-colors .color-dot[data-color]').forEach(dot => {
        dot.addEventListener('click', () => setSecondary(dot.dataset.color));
    });
    document.getElementById('custom-secondary').addEventListener('input', (e) => setSecondary(e.target.value));
}

// ... (loadCoupons, renderList - sem alterações) ...
async function loadCoupons() {
    // (Código de carregar cupons do banco igual ao anterior)
    const supabase = await window.initSupabaseClient();
    listContainer.innerHTML = '<div class="loading-spinner">Carregando...</div>';
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) { listContainer.innerHTML = `<p style="color:red">Erro: ${error.message}</p>`; return; }
    renderList(data);
}

function renderList(coupons) {
    // (Mesmo código de renderList do anterior)
     listContainer.innerHTML = '';
    if (!coupons || coupons.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding:2rem; color:#888;">Nenhum cupom criado.</p>';
        return;
    }
    coupons.forEach(c => {
        const style = c.style || {};
        const isSuspended = c.status === 'suspended';
        const thumbHtml = `
            <div class="coupon-thumb" style="border: 2px ${style.borderStyle || 'dashed'} ${style.primaryColor || '#000'}; background-color: ${style.secondaryColor || '#eee'}; color: ${style.primaryColor || '#000'};">
                ${getDisplayText(c)}
            </div>
        `;
        const div = document.createElement('div');
        div.className = `coupon-card-row ${isSuspended ? 'suspended' : ''}`;
        div.innerHTML = `
            <div class="coupon-info-group">
                ${thumbHtml}
                <div class="coupon-meta">
                    <span class="coupon-code-title">${c.code}</span>
                    <span class="coupon-desc">${c.description || ''}</span>
                    <span class="coupon-creator"><i class="ri-user-line"></i> ${c.created_by || 'Admin'} &bull; ${new Date(c.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="coupon-actions">
                <button class="action-btn btn-suspend" onclick="toggleSuspend(${c.id}, '${c.status}')">${isSuspended ? 'Ativar' : 'Suspender'}</button>
                <button class="action-btn btn-edit" onclick='editCoupon(${JSON.stringify(c)})'>Editar</button>
                <button class="action-btn btn-delete" onclick="deleteCoupon(${c.id})"><i class="ri-delete-bin-line"></i></button>
            </div>
        `;
        listContainer.appendChild(div);
    });
}
function getDisplayText(c) {
    if(c.type === 'discount_percent') return `${c.value}% OFF`;
    if(c.type === 'shipping_free') return `FRETE GRÁTIS`;
    if(c.type === 'shipping_percent') return `-${c.value}% FRETE`;
    return 'CUPOM';
}

function openCreateModal() {
    document.getElementById('coupon-id').value = '';
    document.getElementById('modal-title').textContent = "Adicionar Cupom";
    codeInput.value = '';
    descInput.value = '';
    expiresInput.value = '';
    
    // Reset Custom Select Texts
    document.getElementById('select-type-text').innerText = "Selecione o tipo...";
    document.getElementById('select-border-text').innerText = "Tracejada";
    
    // Reset State
    couponState = {
        primaryColor: '#000000',
        secondaryColor: '#f0f0f0',
        borderStyle: 'dashed',
        type: '',
        value: 0,
        shippingType: 'free'
    };
    
    // Reset UI Classes
    document.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
    document.querySelectorAll('.shipping-card-option').forEach(c => c.classList.remove('selected'));
    document.querySelector('.shipping-card-option[data-value="free"]').classList.add('selected'); // Default
    
    percentBtns.forEach(b => b.classList.remove('active'));
    shippingPercentBtns.forEach(b => b.classList.remove('active'));

    updateFormUI();
    updatePreview();
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

window.editCoupon = (c) => {
    document.getElementById('coupon-id').value = c.id;
    document.getElementById('modal-title').textContent = "Editar Cupom";
    
    codeInput.value = c.code;
    descInput.value = c.description || '';
    if(c.expires_at) expiresInput.value = new Date(c.expires_at).toISOString().split('T')[0];

    // Carregar Estado Base
    couponState.primaryColor = c.style?.primaryColor || '#000';
    couponState.secondaryColor = c.style?.secondaryColor || '#eee';
    couponState.borderStyle = c.style?.borderStyle || 'dashed';

    // Set Border UI
    const borderOpt = document.querySelector(`.select-option[data-value="${couponState.borderStyle}"]`);
    if(borderOpt) {
        document.getElementById('select-border-text').innerHTML = borderOpt.innerHTML;
        borderOpt.classList.add('selected');
    }

    // Lógica do Tipo e Valores
    if (c.type === 'discount_percent') {
        couponState.type = 'discount';
        couponState.value = c.value;
        
        // Trigger Click logic manually for Type
        const typeOpt = document.querySelector('.select-option[data-value="discount"]');
        if(typeOpt) {
            document.getElementById('select-type-text').innerText = typeOpt.innerText;
            typeOpt.classList.add('selected');
        }
        
        // Set Active Percent Button
        setTimeout(() => {
            percentBtns.forEach(b => b.classList.toggle('active', b.dataset.value == c.value));
        }, 50);
    } 
    else if (c.type === 'shipping_free') {
        couponState.type = 'shipping';
        couponState.shippingType = 'free';
        
        const typeOpt = document.querySelector('.select-option[data-value="shipping"]');
        if(typeOpt) {
            document.getElementById('select-type-text').innerText = typeOpt.innerText;
            typeOpt.classList.add('selected');
        }
        
        document.querySelectorAll('.shipping-card-option').forEach(c => c.classList.remove('selected'));
        document.querySelector('.shipping-card-option[data-value="free"]').classList.add('selected');
    } 
    else if (c.type === 'shipping_percent') {
        couponState.type = 'shipping';
        couponState.shippingType = 'percent';
        couponState.value = c.value;

        const typeOpt = document.querySelector('.select-option[data-value="shipping"]');
        if(typeOpt) {
            document.getElementById('select-type-text').innerText = typeOpt.innerText;
            typeOpt.classList.add('selected');
        }

        document.querySelectorAll('.shipping-card-option').forEach(c => c.classList.remove('selected'));
        document.querySelector('.shipping-card-option[data-value="percent"]').classList.add('selected');

        setTimeout(() => {
            shippingPercentBtns.forEach(b => b.classList.toggle('active', b.dataset.value == c.value));
        }, 50);
    }

    updateFormUI();
    updatePreview();
    modal.style.display = 'flex';
};

async function saveCoupon() {
    // (Mesma lógica de salvamento do arquivo anterior)
    const supabase = await window.initSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const id = document.getElementById('coupon-id').value;
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code || !couponState.type) {
        if(window.showToast) window.showToast("Preencha o código e o tipo.");
        else alert("Preencha os campos obrigatórios");
        return;
    }

    let dbType = '';
    let dbValue = null;

    if (couponState.type === 'discount') {
        dbType = 'discount_percent';
        dbValue = couponState.value;
    } else {
        if (couponState.shippingType === 'free') {
            dbType = 'shipping_free';
            dbValue = null;
        } else {
            dbType = 'shipping_percent';
            dbValue = couponState.value;
        }
    }

    const payload = {
        code: code,
        description: descInput.value,
        type: dbType,
        value: dbValue,
        expires_at: expiresInput.value ? new Date(expiresInput.value) : null,
        style: {
            primaryColor: couponState.primaryColor,
            secondaryColor: couponState.secondaryColor,
            borderStyle: couponState.borderStyle
        },
        created_by: user.user_metadata.full_name || user.email
    };

    let error;
    if (id) {
        const res = await supabase.from('coupons').update(payload).eq('id', id);
        error = res.error;
    } else {
        const res = await supabase.from('coupons').insert([payload]);
        error = res.error;
    }

    if (error) {
        const msg = error.code === '42501' ? 'Sem permissão.' : error.message;
        if(window.showToast) window.showToast('Erro: ' + msg);
        else alert('Erro: ' + msg);
    } else {
        if(window.showToast) window.showToast('Cupom salvo!');
        closeModal();
        loadCoupons();
    }
}

// Global functions
window.deleteCoupon = async (id) => { /* Igual ao anterior */
    if (window.showConfirmationModal) {
        const confirm = await window.showConfirmationModal("Excluir este cupom?");
        if(!confirm) return;
    } else { if(!confirm("Tem certeza?")) return; }
    const supabase = await window.initSupabaseClient();
    await supabase.from('coupons').delete().eq('id', id);
    loadCoupons();
};
window.toggleSuspend = async (id, currentStatus) => { /* Igual ao anterior */
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const supabase = await window.initSupabaseClient();
    await supabase.from('coupons').update({ status: newStatus }).eq('id', id);
    loadCoupons();
};