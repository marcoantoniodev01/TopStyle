// assets/js/mobile-mega.js
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const MOBILE_BREAKPOINT = 769;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  // fecha todos os menus/colunas abertos e remove classes 'open' dos headers
  function closeAllMegaMenus() {
    document.querySelectorAll('.mega-menu.mobile-open').forEach(m => m.classList.remove('mobile-open'));
    document.querySelectorAll('.mega-content .column.open').forEach(c => c.classList.remove('open'));
    document.querySelectorAll('.nav__link[aria-expanded]').forEach(a => a.setAttribute('aria-expanded', 'false'));
    // remove classe open de todos header__link carets
    document.querySelectorAll('.header__link.open').forEach(h => h.classList.remove('open'));
  }

  // fecha menus se clique fora (apenas no mobile)
  function onDocumentClick(ev) {
    if (!isMobile()) return;
    if (ev.target.closest('.nav__item.dropdown')) return;
    closeAllMegaMenus();
  }

  // fecha com Escape
  function onDocumentKeydown(ev) {
    if (ev.key === 'Escape') closeAllMegaMenus();
  }

  // remove listeners globais previamente anexados (se houver)
  function detachGlobalListeners() {
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDocumentKeydown);
  }

  // init mobile behavior on all dropdown items
  function initMobileMega() {
    // cleanup first: remove header handlers previously attached
    document.querySelectorAll('.nav__item.dropdown .header__link').forEach(header => {
      if (header.__mobileMegaClickHandler) {
        header.removeEventListener('click', header.__mobileMegaClickHandler, { passive: false });
        header.__mobileMegaClickHandler = null;
      }
    });

    // attach handlers
    document.querySelectorAll('.nav__item.dropdown').forEach(item => {
      const header = item.querySelector('.header__link');
      const anchor = header ? header.querySelector('.nav__link') : null;
      const mega = item.querySelector('.mega-menu');
      if (!header || !mega) return;

      // handler to toggle the mega-menu (only on mobile)
      const handler = function (ev) {
        if (!isMobile()) return;
        // prevent default only if the click target is the header itself (avoid breaking external links)
        ev.preventDefault();

        // close other menus (and remove their header open state)
        document.querySelectorAll('.nav__item.dropdown').forEach(otherItem => {
          const otherMega = otherItem.querySelector('.mega-menu');
          const otherHeader = otherItem.querySelector('.header__link');
          if (otherMega && otherMega !== mega) {
            otherMega.classList.remove('mobile-open');
            if (otherHeader) otherHeader.classList.remove('open');
            const otherAnchor = otherHeader?.querySelector('.nav__link');
            if (otherAnchor) otherAnchor.setAttribute('aria-expanded', 'false');
            // also collapse inner columns immediately so they don't remain open
            otherMega.querySelectorAll('.column.open').forEach(c => {
              c.classList.remove('open');
              const ch3 = c.querySelector('h3');
              if (ch3) ch3.setAttribute('aria-expanded', 'false');
            });
          }
        });

        // toggle this menu
        const willOpen = !mega.classList.contains('mobile-open');
        if (willOpen) {
          mega.classList.add('mobile-open');
          if (anchor) anchor.setAttribute('aria-expanded', 'true');
          // add open state to header so its caret can rotate via CSS
          header.classList.add('open');
        } else {
          // start collapse
          mega.classList.remove('mobile-open');
          if (anchor) anchor.setAttribute('aria-expanded', 'false');
          // remove header open class (caret animation)
          header.classList.remove('open');

          // delay removing inner column 'open' state until the collapse transition ends
          // so the inner links don't disappear instantly and break the animation
          const onTransitionEnd = (te) => {
            if (te.propertyName && te.propertyName !== 'max-height') return;
            mega.querySelectorAll('.column.open').forEach(c => {
              c.classList.remove('open');
              const ch3 = c.querySelector('h3');
              if (ch3) ch3.setAttribute('aria-expanded', 'false');
            });
            mega.removeEventListener('transitionend', onTransitionEnd);
          };
          mega.addEventListener('transitionend', onTransitionEnd);
          // fallback cleanup in case transitionend doesn't fire
          setTimeout(() => {
            if (!mega.classList.contains('mobile-open')) {
              mega.querySelectorAll('.column.open').forEach(c => {
                c.classList.remove('open');
                const ch3 = c.querySelector('h3');
                if (ch3) ch3.setAttribute('aria-expanded', 'false');
              });
              mega.removeEventListener('transitionend', onTransitionEnd);
            }
          }, 650);
        }

        // stop propagation so the document click handler doesn't immediately close it
        ev.stopPropagation();
      };

      // store reference for cleanup and add listener
      header.__mobileMegaClickHandler = handler;
      header.addEventListener('click', handler, { passive: false });

      // setup accordion behavior for columns inside this mega-menu
      const cols = mega.querySelectorAll('.column');
      cols.forEach(col => {
        const h3 = col.querySelector('h3');
        if (!h3) return;

        // add caret span if not present
        if (!h3.querySelector('.mobile-caret')) {
          const caret = document.createElement('span');
          caret.className = 'mobile-caret';
          // se bootstrap icons estiverem disponíveis, usa; senão, fallback para ▾
          const hasBootstrapIcons = !!document.querySelector('.bi, link[href*="bootstrap-icons"], script[src*="bootstrap-icons"]');
          caret.innerHTML = hasBootstrapIcons ? '<i class="bi bi-caret-down-fill" aria-hidden="true"></i>' : '▾';
          h3.appendChild(caret);
        }

        // accessibility
        h3.setAttribute('tabindex', '0');
        h3.setAttribute('role', 'button');
        h3.setAttribute('aria-expanded', 'false');

        // prevent double-binding
        if (h3.__mobileColHandler) {
          h3.removeEventListener('click', h3.__mobileColHandler);
          h3.removeEventListener('keydown', h3.__mobileKeyHandler);
        }

        // toggle function (accordion: close siblings when opening)
        const toggleCol = (ev) => {
          if (!isMobile()) return;
          ev.stopPropagation();
          const isOpen = col.classList.toggle('open');
          h3.setAttribute('aria-expanded', String(!!isOpen));

          if (isOpen) {
            // close sibling columns within the same mega-menu (accordion behavior)
            const parent = col.parentElement; // typically .mega-content
            if (parent) {
              parent.querySelectorAll('.column.open').forEach(sib => {
                if (sib !== col) {
                  sib.classList.remove('open');
                  const sibH3 = sib.querySelector('h3');
                  if (sibH3) sibH3.setAttribute('aria-expanded', 'false');
                }
              });
            }
          }
          // optional: if closing this column, no further action needed (aria already updated)
        };

        h3.__mobileColHandler = toggleCol;
        h3.addEventListener('click', toggleCol);

        // keyboard support (Enter / Space)
        const keyHandler = (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            toggleCol(ev);
          }
        };
        h3.__mobileKeyHandler = keyHandler;
        h3.addEventListener('keydown', keyHandler);
      });
    });

    // attach global document listeners to close when clicking outside or pressing Escape
    detachGlobalListeners();
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);
  }

  // debounce helper
  function debounce(fn, wait = 150) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // initial init
  initMobileMega();

  // re-init on resize (debounced) so event handlers are consistent
  const onResize = debounce(() => {
    // when crossing the breakpoint, close menus
    closeAllMegaMenus();
    // re-init handlers (removes duplicates)
    initMobileMega();
  }, 200);

  window.addEventListener('resize', onResize);

  // cleanup on unload
  window.addEventListener('unload', () => {
    detachGlobalListeners();
    window.removeEventListener('resize', onResize);
  });
});