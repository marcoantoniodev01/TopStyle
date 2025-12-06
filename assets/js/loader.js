/* assets/js/loader.js */

const GlobalLoader = {
    el: null,

    init() {
        this.el = document.getElementById('global-loader');
        
        // Se não tiver loader no HTML, não faz nada
        if (!this.el) return;

        // Se tiver a classe 'manual-loading' no BODY, o loader NÃO some sozinho
        const isManual = document.body.classList.contains('manual-loading');

        if (!isManual) {
            // === LÓGICA DE ESPERA SINCRONIZADA ===
            
            // 1. Espera carregar a página (imagens/scripts)
            const windowLoadPromise = new Promise(resolve => {
                if (document.readyState === 'complete') resolve();
                else window.addEventListener('load', resolve);
            });

            // 2. Espera a verificação de Admin/Perfil (admiconedash.js)
            const adminLogicPromise = new Promise(resolve => {
                if (document.body.classList.contains('admin-logic-complete')) {
                    resolve();
                } else {
                    document.addEventListener('admin-logic-complete', resolve, { once: true });
                    // Timeout de 5s para não travar a página se o script falhar
                    setTimeout(resolve, 5000); 
                }
            });

            // Quando AMBOS terminarem, esconde o loader
            Promise.all([windowLoadPromise, adminLogicPromise]).then(() => {
                this.hide();
            });
        }
    },

    show() {
        if (!this.el) return;
        this.el.style.display = 'flex';
        requestAnimationFrame(() => {
            this.el.style.opacity = '1';
            this.el.style.visibility = 'visible';
        });
    },

    hide() {
        if (!this.el) return;
        
        this.el.style.opacity = '0';
        this.el.style.visibility = 'hidden';

        setTimeout(() => {
            this.el.style.display = 'none';
        }, 400); 
    }
};

// Inicializa
GlobalLoader.init();

window.GlobalLoader = GlobalLoader;
