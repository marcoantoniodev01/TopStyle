/* ============ LÓGICA GLOBAL DE ADMIN (SELETOR POR CLASSE + FALLBACK) ============ */
document.addEventListener('DOMContentLoaded', () => {
  // Aplica as mudanças visuais no header (tornar ícone engrenagem e link para dashboard)
  async function applyAdminModeIfNeeded() {
    try {
      const supabase = await initSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // não logado

      // Verifica se o perfil é admin (proteção extra)
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileErr) {
        console.warn('Erro ao checar perfil admin:', profileErr);
      }
      if (!profile || !profile.is_admin) return;

      // Seleciona primeiro por classe (recomendado), senão por href
      let links = Array.from(document.querySelectorAll('a.profile-link'));
      if (links.length === 0) {
        // fallback: todos que apontam para perfil-cliente.html
        links = Array.from(document.querySelectorAll('a[href*="perfil-cliente.html"]'));
        // tag esses links com a classe para futuras execuções/estilizações
        links.forEach(a => a.classList.add('profile-link'));
      }

      if (links.length === 0) return; // nada a fazer

      links.forEach(link => {
        // 1) troca o destino
        link.href = 'dashboard.html';
        link.classList.add("admin-mode");
        link.dataset.originalHref = link.dataset.originalHref || 'perfil-cliente.html';
        link.title = 'Painel Administrativo';

        // 2) altera o ícone interno (procura <i> ou svg)
        const icon = link.querySelector('i, svg, .icon');
        if (icon) {
          icon.classList.remove('ri-user-line', 'ri-user-fill', 'bi-person', 'bi-person-fill', 'user-icon');
          icon.classList.add('ri-settings-5-line');
        } else {
          const i = document.createElement('i');
          i.classList.add('ri-settings-5-line');
          link.appendChild(i);
        }
      });

      // marca role local
      localStorage.setItem('userRole', 'admin');

    } catch (err) {
      console.warn('applyAdminModeIfNeeded erro:', err);
    }
  }

  // Executa imediatamente
  applyAdminModeIfNeeded();

  // Também observa mudanças no header
  const header = document.querySelector('#header') || document.body;
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        applyAdminModeIfNeeded();
        break;
      }
    }
  });
  mo.observe(header, { childList: true, subtree: true });
});