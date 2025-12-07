// assets/js/collection-linker.js
// Delegação de clique para .drop-name (abre a página de coleção)
(() => {
  'use strict';

  // Ao clicar em .drop-name (ou no .drop__img), redireciona para colecoes.html?drop=<nome>
  function onClick(e) {
    const target = e.target;
    const col = target.closest('.drop-column');
    if (!col) return;
    // evita interferir em outros cliques se for botão interno
    const nameEl = col.querySelector('.drop-name');
    if (!nameEl) return;
    const name = nameEl.textContent.trim();
    if (!name) return;
    // Navega para a página da coleção (colecoes.html)
    const q = new URLSearchParams({ drop: name });
    // usa replace se quiser evitar histórico duplicado: window.location.replace(...)
    window.location.href = `colecoes.html?${q.toString()}`;
  }

  function bind() {
    const container = document.querySelector('.mega-imgs');
    if (!container) {
      // nada encontrado; inscreve um observer para tentar ligar depois
      const obs = new MutationObserver((mutations, observer) => {
        const c = document.querySelector('.mega-imgs');
        if (c) {
          c.addEventListener('click', onClick);
          observer.disconnect();
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      return;
    }
    container.addEventListener('click', onClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();