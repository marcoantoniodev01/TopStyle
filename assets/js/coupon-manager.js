// assets/js/coupon-manager.js
// Gerenciador global de cupons

const COUPON_KEY = 'topstyle_coupon_v1';

// Cache para cupons válidos (para evitar múltiplas requisições)
let validCouponsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Inicializa o Supabase cliente (já temos isso globalmente)
async function initSupabaseClient() {
    return window.initSupabaseClient ? await window.initSupabaseClient() : null;
}

/**
 * Busca todos os cupons ativos do banco de dados
 */
async function fetchValidCoupons() {
    const now = Date.now();
    
    // Retorna do cache se ainda estiver válido
    if (validCouponsCache && (now - lastFetchTime) < CACHE_DURATION) {
        return validCouponsCache;
    }
    
    try {
        const supabase = await initSupabaseClient();
        if (!supabase) {
            console.error('Supabase não inicializado');
            return {};
        }
        
        // Busca cupons ativos que não expiraram
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('status', 'active')
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
        
        if (error) {
            console.error('Erro ao buscar cupons:', error);
            return {};
        }
        
        // Transforma em um objeto mais fácil de usar
        const couponsMap = {};
        data.forEach(coupon => {
            let discountValue = 0;
            let type = 'unknown';
            
            // Determina o tipo e valor do desconto baseado no tipo do cupom
            if (coupon.type === 'discount_percent') {
                type = 'discount';
                discountValue = coupon.value || 0;
            } else if (coupon.type === 'shipping_free') {
                type = 'shipping_free';
                discountValue = 100; // 100% de desconto no frete
            } else if (coupon.type === 'shipping_percent') {
                type = 'shipping_discount';
                discountValue = coupon.value || 0;
            }
            
            couponsMap[coupon.code] = {
                id: coupon.id,
                code: coupon.code,
                type: type,
                value: discountValue,
                description: coupon.description,
                expires_at: coupon.expires_at,
                style: coupon.style || {},
                dbType: coupon.type // Mantém o tipo original do banco
            };
        });
        
        // Atualiza cache
        validCouponsCache = couponsMap;
        lastFetchTime = now;
        
        return couponsMap;
    } catch (error) {
        console.error('Erro ao buscar cupons válidos:', error);
        return {};
    }
}

/**
 * Valida um cupom específico
 */
async function validateCoupon(code) {
    const coupons = await fetchValidCoupons();
    const upperCode = code.toUpperCase();
    
    if (coupons[upperCode]) {
        return coupons[upperCode];
    }
    
    return null;
}

/**
 * Aplica um cupom (salva no localStorage)
 */
async function applyCoupon(code) {
    const coupon = await validateCoupon(code);
    
    if (coupon) {
        // Salva no localStorage
        localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
        
        // Atualiza cache local
        const event = new CustomEvent('coupon-applied', { detail: coupon });
        document.dispatchEvent(event);
        
        return coupon;
    }
    
    return null;
}

/**
 * Remove o cupom aplicado
 */
function removeCoupon() {
    localStorage.removeItem(COUPON_KEY);
    
    // Dispara evento
    document.dispatchEvent(new Event('coupon-removed'));
}

/**
 * Obtém o cupom atualmente aplicado
 */
function getAppliedCoupon() {
    try {
        const stored = localStorage.getItem(COUPON_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

/**
 * Calcula o desconto baseado no cupom aplicado
 */
function calculateDiscount(coupon, subtotal, shipping = 0) {
    if (!coupon) {
        return { 
            discount: 0, 
            shipping: shipping, 
            total: subtotal + shipping,
            shippingDiscount: 0,
            productDiscount: 0
        };
    }
    
    let discount = 0;
    let finalShipping = shipping;
    let shippingDiscount = 0;
    let productDiscount = 0;
    
    if (coupon.dbType === 'discount_percent') {
        // Desconto percentual no subtotal
        productDiscount = subtotal * (coupon.value / 100);
        discount = productDiscount;
    } else if (coupon.dbType === 'shipping_free') {
        // Frete grátis
        shippingDiscount = shipping;
        finalShipping = 0;
        discount = shippingDiscount;
    } else if (coupon.dbType === 'shipping_percent') {
        // Desconto percentual no frete
        shippingDiscount = shipping * (coupon.value / 100);
        finalShipping = shipping - shippingDiscount;
        discount = shippingDiscount;
    }
    
    const total = subtotal + finalShipping;
    
    return {
        discount: discount,
        shipping: finalShipping,
        total: total,
        shippingDiscount: shippingDiscount,
        productDiscount: productDiscount,
        couponType: coupon.type
    };
}

/**
 * Obtém o texto de exibição do cupom
 */
function getCouponDisplayText(coupon) {
    if (!coupon) return '';
    
    if (coupon.dbType === 'discount_percent') {
        return `${coupon.value}% OFF`;
    } else if (coupon.dbType === 'shipping_free') {
        return 'FRETE GRÁTIS';
    } else if (coupon.dbType === 'shipping_percent') {
        return `-${coupon.value}% FRETE`;
    }
    
    return coupon.code;
}

// Helper para mostrar toasts
function showToast(message, { duration = 2000 } = {}) {
    if (window.showToast) {
        window.showToast(message, { duration });
    } else {
        alert(message);
    }
}

// Exporta funções globais
window.CouponManager = {
    validateCoupon,
    applyCoupon,
    removeCoupon,
    getAppliedCoupon,
    calculateDiscount,
    getCouponDisplayText,
    fetchValidCoupons
};

// Inicializa quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    // Pré-carrega os cupons
    fetchValidCoupons();
});