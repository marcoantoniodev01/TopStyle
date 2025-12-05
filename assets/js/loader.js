/* assets/js/loader.js */

const GlobalLoader = {
    el: null,

    init() {
        this.el = document.getElementById('global-loader');
        
        // Se não tiver loader no HTML, não faz nada
        if (!this.el) return;

        // Verifica se a página pede controle manual (ex: Carrinho/Pagamento)
        // Se tiver a classe 'manual-loading' no BODY, o loader NÃO some sozinho.
        const isManual = document.body.classList.contains('manual-loading');

        if (!isManual) {
            // Páginas normais: some quando carregar tudo (imagens, scripts, css)
            window.addEventListener('load', () => {
                this.hide();
            });
        }
    },

    show() {
        if (!this.el) return;
        this.el.style.display = 'flex';
        // Pequeno delay para permitir que o display:flex seja aplicado antes da opacidade
        requestAnimationFrame(() => {
            this.el.style.opacity = '1';
            this.el.style.visibility = 'visible';
        });
    },

    hide() {
        if (!this.el) return;
        
        // Fade out
        this.el.style.opacity = '0';
        this.el.style.visibility = 'hidden';

        // Espera a transição CSS (0.4s) para dar display:none
        setTimeout(() => {
            this.el.style.display = 'none';
        }, 400); 
    }
};

// Inicializa assim que o script for lido
GlobalLoader.init();

// Exporta para usar em outros arquivos (carrinho.js, checkout.js)
window.GlobalLoader = GlobalLoader;