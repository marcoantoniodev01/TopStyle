// assets/js/profile-tabs.js
// Simples: mostra apenas o painel que corresponde ao href="#id" do link clicado
(function () {
  'use strict';

  // coleta links e painéis
  const links = Array.from(document.querySelectorAll('.link-page-perfil'));
  const panels = Array.from(document.querySelectorAll('.window-perfil-cliente'));

  if (!links.length || !panels.length) return;

  function normalizeHash(h) {
    if (!h) return '';
    return h.replace(/^#/, '');
  }

  function showPanelById(idOrHash) {
    const id = normalizeHash(idOrHash);
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
      if (normalizeHash(href) === id) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'true');
      } else {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    });

    return found;
  }

  // handler de clique: só intercepta links com hash interno
  links.forEach(a => {
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#')) return; // link externo (ex: sair) continua normal
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      const id = href.replace(/^#/, '');
      if (!id) return;
      const ok = showPanelById(id);
      if (ok) {
        // atualiza hash sem forçar o salto de tela
        history.replaceState(null, '', '#' + id);
        // em mobile: rolar para o conteúdo
        const content = document.querySelector('.perfil-cliente-content');
        if (content && window.innerWidth < 880) {
          content.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // responde mudanças no hash (back/forward ou link direto)
  window.addEventListener('hashchange', () => {
    const h = location.hash || '';
    if (h) showPanelById(h);
  });

  // inicial: tenta abrir o painel correspondente ao hash atual, senão abre o primeiro painel
  (function init() {
    const initial = location.hash ? normalizeHash(location.hash) : '';
    const showed = initial ? showPanelById(initial) : false;
    if (!showed) {
      // se não tiver hash válido, abre o primeiro painel (por exemplo "dados-pessoais")
      const preferred = 'dados-pessoais';
      if (!showPanelById(preferred)) {
        // fallback: primeiro painel do DOM
        const first = panels[0];
        if (first) showPanelById(first.id);
      } else {
        history.replaceState(null, '', '#' + preferred);
      }
    }
  })();

})();