// assets/js/profile-tabs.js
(function () {
  'use strict';

  // 1. Força scroll manual e topo IMEDIATAMENTE
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  // 2. Captura o hash real e LIMPA da URL para o navegador não pular
  // Isso "engana" o navegador achando que não tem para onde ir
  const initialHash = location.hash.replace(/^#/, '');
  
  if (initialHash) {
      // Remove o hash da URL sem recarregar a página
      history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  document.addEventListener('DOMContentLoaded', () => {
      // Garante topo novamente após carregar o DOM
      window.scrollTo(0, 0);
      
      const links = Array.from(document.querySelectorAll('.link-page-perfil'));
      const panels = Array.from(document.querySelectorAll('.window-perfil-cliente'));

      if (!links.length || !panels.length) return;

      function showPanelById(id) {
          if (!id) return false;

          let found = false;
          panels.forEach(p => {
              if (p.id === id) {
                  p.classList.add('active');
                  found = true;
              } else {
                  p.classList.remove('active');
              }
          });

          links.forEach(a => {
              const href = a.getAttribute('href') || '';
              const linkId = href.replace(/^#/, '');
              if (linkId === id) {
                  a.classList.add('active');
                  // Acessibilidade opcional
                  a.setAttribute('aria-current', 'true');
              } else {
                  a.classList.remove('active');
                  a.removeAttribute('aria-current');
              }
          });
          return found;
      }

      // Inicialização: Usa o hash capturado no início OU o padrão
      const targetId = initialHash || 'dados-pessoais';
      showPanelById(targetId);

      // Listener de Cliques
      links.forEach(a => {
          a.addEventListener('click', function (ev) {
              ev.preventDefault(); // Impede o pulo nativo
              const href = a.getAttribute('href') || '';
              const id = href.replace(/^#/, '');
              
              if (showPanelById(id)) {
                  // Adiciona o hash na URL apenas visualmente (sem pular)
                  history.pushState(null, '', '#' + id);
                  
                  // Scroll suave APENAS no mobile
                  if (window.innerWidth < 880) {
                      const content = document.querySelector('.perfil-cliente-content');
                      if (content) {
                          content.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                  } else {
                      // No desktop, garante que fique no topo ou faça um scroll suave pro topo
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
              }
          });
      });

      // Reforço final para garantir o topo
      requestAnimationFrame(() => window.scrollTo(0, 0));
  });

})();