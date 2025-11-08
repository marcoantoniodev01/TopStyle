// assets/js/profile.js
// Incluir no HTML: <script type="module" src="assets/js/profile.js"></script>
/*--------------------- PERFIL ---------------------*/
(() => {
  'use strict';

  const SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';
  const PLACEHOLDER_AVATAR = 'https://via.placeholder.com/400x400.png?text=Foto';
  const AVATAR_BUCKET = 'avatars';

  /* ---------- toasts simples ---------- */
  function injectToastStyles() {
    if (document.getElementById('profile-toast-styles')) return;
    const css = `
      .profile-toast-container{position:fixed;top:1rem;right:1rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none}
      .profile-toast{pointer-events:auto;padding:10px 14px;border-radius:10px;color:#fff;min-width:180px;opacity:0;transform:translateY(-8px);transition:opacity .22s,transform .22s}
      .profile-toast.show{opacity:1;transform:translateY(0)}
      .profile-toast.success{background:linear-gradient(180deg,#128a4a,#0b5d34)}
      .profile-toast.error{background:linear-gradient(180deg,#b21f2f,#8f0f1a)}
      .profile-toast.info{background:linear-gradient(180deg,#2b6cff,#1a48b8)}
      @media(max-width:520px){.profile-toast-container{right:0.5rem;left:0.5rem}}
    `;
    const st = document.createElement('style');
    st.id = 'profile-toast-styles';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }
  function ensureToastContainer() {
    let c = document.querySelector('.profile-toast-container');
    if (!c) { c = document.createElement('div'); c.className = 'profile-toast-container'; document.body.appendChild(c); }
    return c;
  }
  function showToast(msg, type = 'success', duration = 2600) {
    injectToastStyles();
    const c = ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'profile-toast ' + (type === 'error' ? 'error' : type === 'info' ? 'info' : 'success');
    t.textContent = msg;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); t.addEventListener('transitionend', () => t.remove()); }, duration);
  }

  /* ---------- utilitários ---------- */
  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function formatDateForDisplay(v) {
    if (!v) return '';
    const str = String(v);
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return str;
  }
  function normalizeDateInput(v) {
    if (!v) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return v;
  }

  /* ---------- main ---------- */
  (async function init() {
    let createClient;
    try {
      ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'));
    } catch (err) {
      console.error('Erro ao importar supabase-js', err);
      showToast('Erro interno (biblioteca).', 'error');
      return;
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // elementos do DOM (várias variantes de id para garantir compatibilidade)
    const pUsername = document.getElementById('username');
    const pEmail = document.getElementById('email');
    const pPhone = document.getElementById('phone');
    const pCpf = document.getElementById('cpf');
    const pBorn = document.getElementById('born_Date') || document.getElementById('bornDate') || document.getElementById('born_date');

    const inputUsername = document.getElementById('username-input');
    const inputEmail = document.getElementById('email-input');
    const inputPhone = document.getElementById('phone-input');
    const inputCpf = document.getElementById('cpf-input');
    const inputBorn = document.getElementById('born_Date-input') || document.getElementById('bornDate-input') || document.getElementById('born_date-input');

    const form = document.getElementById('profile-form');
    const editBtn = document.getElementById('edit-profile-btn');

    // garante elementos
    if (!form || !editBtn) {
      console.warn('form ou botão editar não encontrados. Verifique IDs no HTML.');
    }

    // pega auth user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.warn('getUser erro:', userErr);
    const authUser = userData?.user ?? null;
    if (!authUser) {
      showToast('Você precisa estar logado.', 'info');
      setTimeout(() => window.location.href = '/index.html', 700);
      return;
    }
    const authUid = authUser.id;

    // carrega profile row (select * para evitar erro PGRST204 ao pedir colunas inexistentes)
    async function loadProfileRow() {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', authUid).maybeSingle();
        if (error) {
          console.warn('Erro select profiles by id', error);
          // se houver erro, ainda retornamos null
          return null;
        }
        return data || null;
      } catch (err) {
        console.error('loadProfileRow', err);
        return null;
      }
    }

    // atualiza a UI a partir de auth + profileRow
    async function refreshUI() {
      const profileRow = await loadProfileRow();
      const username = profileRow?.username || (authUser.user_metadata?.full_name || authUser.user_metadata?.name) || '—';
      const phone = profileRow?.phone || authUser.user_metadata?.phone || '—';
      const cpf = profileRow?.cpf || '—';
      // **PREFERÊNCIA: born_date** (agora usamos born_date como campo preferencial)
      const bornRaw = profileRow?.born_date || profileRow?.borndate || profileRow?.bornDate || profileRow?.born || '';
      const born = bornRaw ? formatDateForDisplay(bornRaw) : '—';
      const email = authUser?.email || '—';

      if (pUsername) pUsername.textContent = username;
      if (pPhone) pPhone.textContent = phone;
      if (pCpf) pCpf.textContent = cpf;
      if (pBorn) pBorn.textContent = born;
      if (pEmail) pEmail.textContent = email;

      if (inputUsername) inputUsername.value = username === '—' ? '' : username;
      if (inputPhone) inputPhone.value = phone === '—' ? '' : phone;
      if (inputCpf) inputCpf.value = cpf === '—' ? '' : cpf;
      if (inputBorn) inputBorn.value = bornRaw ? normalizeDateInput(bornRaw) : '';
      if (inputEmail) inputEmail.value = email === '—' ? '' : email;
    }

    // função segura de upsert: tenta remover colunas ausentes conforme PGRST204 e re-tentar
    async function safeUpsertProfile(basePayload) {
      // clonamos payload
      let payload = Object.assign({}, basePayload);
      const tried = new Set();
      while (true) {
        try {
          const res = await supabase.from('profiles').upsert(payload, { returning: 'representation', onConflict: 'id' });
          if (res.error) throw res.error;
          return res;
        } catch (err) {
          // RLS (permission) -> abortar com mensagem
          if (err && (err.code === '42501' || (err.message && err.message.toLowerCase().includes('row-level')))) {
            throw new Error('Permissão negada: verifique as Row Level Security (RLS) da tabela profiles no Supabase.');
          }
          // se PostgREST reclama de coluna faltando -> PGRST204 e mensagem inclui nome da coluna
          const msg = String(err?.message || err);
          const colMatch = msg.match(/Could not find the '([^']+)' column/);
          if (colMatch && colMatch[1]) {
            const col = colMatch[1];
            if (payload.hasOwnProperty(col)) {
              delete payload[col];
              if (tried.has(col)) throw err; // loop abuse guard
              tried.add(col);
              console.warn(`Coluna ${col} inexistente na tabela profiles — removendo do payload e tentando novamente.`);
              continue; // tenta de novo sem essa coluna
            }
          }
          // caso não seja PGRST204 ou não seja identificável, propaga
          throw err;
        }
      }
    }

    // comportamento do botão editar/salvar
    let editing = false;
    editBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!editing) {
        // entra em edição (CSS .editing controla visibilidade dos inputs)
        form.classList.add('editing');
        editBtn.textContent = 'Salvar';
        editing = true;
        if (inputUsername) inputUsername.focus();
        return;
      }
      // salvar fluxo
      editBtn.disabled = true;
      editBtn.textContent = 'Salvando...';

      try {
        // coleta valores dos inputs (se input não existir, pega do <p>)
        const newUsername = (inputUsername ? inputUsername.value.trim() : (pUsername ? pUsername.textContent.trim() : '')) || null;
        const newPhone = (inputPhone ? inputPhone.value.trim() : (pPhone ? pPhone.textContent.trim() : '')) || null;
        const newCpf = (inputCpf ? inputCpf.value.trim() : (pCpf ? pCpf.textContent.trim() : '')) || null;
        const newBornRaw = (inputBorn ? inputBorn.value : (pBorn ? pBorn.textContent.trim() : '')) || null;
        const newBorn = newBornRaw ? normalizeDateInput(newBornRaw) : null;
        const newEmail = (inputEmail ? inputEmail.value.trim().toLowerCase() : (pEmail ? pEmail.textContent.trim() : '')) || null;

        // 1) atualiza email na Auth (se mudou)
        const { data: authDataNow } = await supabase.auth.getUser();
        const currentEmail = authDataNow?.user?.email || null;
        if (newEmail && newEmail !== currentEmail) {
          const { data: upAuthData, error: upAuthErr } = await supabase.auth.updateUser({ email: newEmail });
          if (upAuthErr) {
            console.error('auth.updateUser erro', upAuthErr);
            throw new Error('Falha ao atualizar e-mail: ' + (upAuthErr.message || upAuthErr));
          } else {
            showToast('E-mail atualizado (pode requerer verificação).', 'info', 3000);
          }
        }

        // 2) upsert em profiles — usamos 'id' = authUid
        // payload com chaves possíveis
        const payload = { id: authUid };
        if (newUsername !== null) payload.username = newUsername;
        if (newPhone !== null) payload.phone = newPhone;
        if (newCpf !== null) payload.cpf = newCpf;
        // **GRAVAR EM born_date** (campo preferencial)
        if (newBorn) payload.born_date = newBorn;

        try {
          await safeUpsertProfile(payload);
        } catch (upErr) {
          console.error('Erro ao upsert profiles', upErr);
          throw upErr;
        }

        showToast('Perfil salvo com sucesso.', 'success', 1800);
        // atualiza UI
        await refreshUI();

      } catch (err) {
        const msg = String(err?.message || err);
        console.error('Erro ao salvar perfil:', err);
        // mensagens amigáveis para RLS
        if (msg.toLowerCase().includes('row-level security') || msg.includes('42501')) {
          showToast('Erro: operação negada por permissões (RLS). Configure policies no Supabase.', 'error', 5000);
        } else {
          showToast(msg, 'error', 5000);
        }
      } finally {
        editBtn.disabled = false;
        editBtn.textContent = 'Editar';
        form.classList.remove('editing');
        editing = false;
      }
    });

    // carga inicial
    await refreshUI();
    /* ---------- loadCards (renderiza #cartoes) ---------- */

    /*--------------------- CARDS ---------------------*/

    // assets/js/cards.js
    // Incluir no HTML: <script type="module" src="assets/js/cards.js"></script>

    (() => {
      'use strict';

      const SUPABASE_URL = 'https://xhzdyatnfaxnvvrllhvs.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo';

      // tiny toast (reuse if you already have a showToast in the page)
      function ensureToastStyles() {
        if (document.getElementById('cards-toast-styles')) return;
        const st = document.createElement('style');
        st.id = 'cards-toast-styles';
        st.textContent = `
      .cards-toast { position: fixed; top: 1rem; right: 1rem; background: rgba(0,0,0,0.8); color: #fff; padding: 8px 12px; border-radius: 8px; z-index:99999; font-family: sans-serif; }
    `;
        document.head.appendChild(st);
      }
      function showToast(msg, time = 2600) {
        if (typeof window.showToast === 'function') { try { window.showToast(msg, 'success', time); return; } catch (e) { } }
        ensureToastStyles();
        const d = document.createElement('div');
        d.className = 'cards-toast';
        d.textContent = msg;
        document.body.appendChild(d);
        setTimeout(() => d.remove(), time);
      }

      // create supabase client
      async function createSupabaseClient() {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
        return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }

      // tenta selecionar na tabela usando várias colunas que possam referenciar o usuário
      async function trySelectByColumns(supabase, table, selectStr, value, order) {
        const cols = ['user_id', 'profile_id', 'owner_id', 'uid'];
        for (const col of cols) {
          try {
            let q = supabase.from(table).select(selectStr);
            if (order && order.col) q = q.order(order.col, { ascending: !!order.asc });
            q = q.eq(col, value);
            const res = await q;
            if (!res.error) return { data: res.data, usedCol: col };
            if (res.error && res.error.code === 'PGRST204') {
              // coluna não existe, continuar tentando
              continue;
            } else {
              // erro diferente — reportar
              return { error: res.error, usedCol: col };
            }
          } catch (err) {
            // continue tentando outras colunas
            console.warn('trySelectByColumns: tentativa falhou para', col, err);
          }
        }
        // nenhuma coluna funcionou -> tenta busca por "id = value" (caso cards.id guarde referencia)
        try {
          const res = await supabase.from(table).select(selectStr).eq('id', value);
          if (!res.error) return { data: res.data, usedCol: 'id' };
        } catch (err) { }
        return { data: null, usedCol: null };
      }

      // tentativa de insert usando a coluna de FK disponível
      async function insertCardWithPossibleFk(supabase, authUid, payloadWithoutFk) {
        // tentativas: user_id, profile_id, owner_id, uid
        const fkCols = ['user_id', 'profile_id', 'owner_id', 'uid'];
        for (const col of fkCols) {
          try {
            const payload = Object.assign({}, payloadWithoutFk);
            payload[col] = authUid;
            const res = await supabase.from('cards').insert(payload);
            if (!res.error) return { data: res.data, usedCol: col };
            // se coluna não existe, PostgREST retorna PGRST204
            if (res.error && res.error.code === 'PGRST204') {
              continue;
            } else {
              return { error: res.error, usedCol: col };
            }
          } catch (err) {
            console.warn('insertCardWithPossibleFk attempt failed for', col, err);
          }
        }
        // tentativa sem FK (se a tabela gerar referência de outra maneira)
        try {
          const res = await supabase.from('cards').insert(payloadWithoutFk);
          if (!res.error) return { data: res.data, usedCol: null };
          return { error: res.error };
        } catch (err) {
          return { error: err };
        }
      }

      // monta DOM do card conforme CSS do seu projeto
      function makeCardElement(cardObj) {
        const wrapper = document.createElement('div');
        wrapper.className = 'card';

        const left = document.createElement('div');
        left.className = 'left';
        const brand = document.createElement('div');
        brand.innerHTML = `<strong>${escapeHtml(cardObj.brand || 'Cartão')}</strong>`;
        const meta = document.createElement('div');
        meta.className = 'muted';
        const last4 = cardObj.last4 ? `•••• ${escapeHtml(cardObj.last4)}` : '';
        const exp = (cardObj.exp_month || cardObj.exp_year) ? ` • ${escapeHtml(String(cardObj.exp_month || ''))}/${escapeHtml(String(cardObj.exp_year || ''))}` : '';
        meta.textContent = (last4 + exp).trim();
        left.appendChild(brand);
        left.appendChild(meta);

        const right = document.createElement('div');
        right.className = 'right';
        if (cardObj.is_default) {
          const b = document.createElement('div');
          b.className = 'badge-default';
          b.textContent = 'Padrão';
          right.appendChild(b);
        }
        // opcional: botão editar pequeno (pode ser implementado depois)
        const edit = document.createElement('button');
        edit.className = 'edit-btn';
        edit.textContent = 'Editar';
        edit.style.cursor = 'pointer';
        edit.addEventListener('click', (e) => {
          e.preventDefault();
          // função simples: prompt para marcar/desmarcar padrão ou editar nome (você pode expandir)
          const newBrand = prompt('Editar bandeira:', cardObj.brand || '') || cardObj.brand || '';
          const newLast4 = prompt('Editar últimos 4:', cardObj.last4 || '') || cardObj.last4 || '';
          const newExpMonth = prompt('Editar mês (MM):', cardObj.exp_month || '') || cardObj.exp_month || '';
          const newExpYear = prompt('Editar ano (YYYY):', cardObj.exp_year || '') || cardObj.exp_year || '';
          const makeDefault = confirm('Marcar como padrão?');
          // disparar evento custom para o caller tratar a atualização (evita acoplamento com supabase aqui)
          wrapper.dispatchEvent(new CustomEvent('card-edit', { detail: { id: cardObj.id, brand: newBrand, last4: newLast4, exp_month: newExpMonth, exp_year: newExpYear, is_default: makeDefault }, bubbles: true }));
        });
        right.appendChild(edit);

        wrapper.appendChild(left);
        wrapper.appendChild(right);
        return wrapper;
      }

      // small escape
      function escapeHtml(s) {
        if (s === undefined || s === null) return '';
        return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
      }

      // carga e renderização dos cartões
      async function loadAndRenderCards(supabase, authUid, container) {
        try {
          container.innerHTML = ''; // limpa
          const r = await trySelectByColumns(supabase, 'cards', 'id, brand, last4, exp_month, exp_year, is_default', authUid, { col: 'is_default', asc: false });
          if (r.error) throw r.error;
          const data = r.data;
          if (!data || data.length === 0) {
            container.innerHTML = '<p>Nenhum cartão registrado.</p>';
            return;
          }
          data.forEach(card => {
            const el = makeCardElement(card);
            // escuta evento 'card-edit' para aplicar update
            el.addEventListener('card-edit', async (ev) => {
              ev.stopPropagation();
              const payload = {
                brand: ev.detail.brand,
                last4: ev.detail.last4,
                exp_month: ev.detail.exp_month,
                exp_year: ev.detail.exp_year,
                is_default: !!ev.detail.is_default
              };
              try {
                // se marcar padrão, desmarca outros
                if (payload.is_default) {
                  // tenta várias colunas para desmarcar (melhora compatibilidade)
                  const cols = ['user_id', 'profile_id', 'owner_id', 'uid'];
                  let unsetErr = null;
                  for (const col of cols) {
                    try {
                      const q = supabase.from('cards').update({ is_default: false }).eq(col, authUid);
                      const res = await q;
                      if (!res.error) { unsetErr = null; break; }
                      if (res.error && res.error.code === 'PGRST204') { unsetErr = res.error; continue; }
                      unsetErr = res.error;
                      break;
                    } catch (e) { unsetErr = e; }
                  }
                  if (unsetErr && unsetErr.code && unsetErr.code !== 'PGRST204') {
                    console.warn('Erro ao desmarcar outros cartões (possivelmente RLS):', unsetErr);
                  }
                }

                const { error: updErr } = await supabase.from('cards').update(payload).eq('id', card.id);
                if (updErr) throw updErr;
                showToast('Cartão atualizado', 2000);
                await loadAndRenderCards(supabase, authUid, container);
              } catch (err) {
                console.error('update card', err);
                if (err.code === '42501' || (err.message && err.message.toLowerCase().includes('row-level'))) {
                  showToast('Permissão negada ao atualizar cartões (RLS).', 4000);
                } else {
                  showToast('Erro ao atualizar cartão.', 3000);
                }
              }
            });

            container.appendChild(el);
          });
        } catch (err) {
          console.error('loadAndRenderCards error', err);
          showToast('Erro ao carregar cartões.', 3500);
        }
      }

      // bind add-card button
      async function bindAddCardButton(supabase, authUid, container) {
        const btn = document.getElementById('add-card-btn');
        if (!btn) return;
        btn.addEventListener('click', async () => {
          try {
            const brand = prompt('Bandeira (ex: Visa)') || '';
            const last4 = prompt('Últimos 4 dígitos (somente números)') || '';
            const exp_month = prompt('Mês (MM)') || '';
            const exp_year = prompt('Ano (YYYY)') || '';
            const is_default = confirm('Marcar como padrão?');

            if (!brand || !last4) { showToast('Bandeira e últimos 4 são obrigatórios.'); return; }

            const payload = { brand, last4, exp_month, exp_year, is_default: !!is_default };

            const ins = await insertCardWithPossibleFk(supabase, authUid, payload);
            if (ins.error) {
              console.error('insert card error', ins.error);
              if (ins.error.code === '42501' || (ins.error.message && ins.error.message.toLowerCase().includes('row-level'))) {
                showToast('Permissão negada ao adicionar cartão (RLS).', 4000);
              } else {
                showToast('Erro ao adicionar cartão.', 3000);
              }
              return;
            }
            showToast('Cartão adicionado', 1800);
            await loadAndRenderCards(supabase, authUid, container);
          } catch (err) {
            console.error('add card flow', err);
            showToast('Erro ao adicionar cartão.', 3000);
          }
        });
      }

      // init
      (async function init() {
        let supabase;
        try {
          supabase = await createSupabaseClient();
        } catch (err) {
          console.error('Erro ao criar supabase client', err);
          showToast('Erro interno (lib).');
          return;
        }

        // pega auth user
        try {
          const { data: ud, error: ue } = await supabase.auth.getUser();
          if (ue) console.warn('auth.getUser erro', ue);
          const user = ud?.user ?? null;
          if (!user) {
            showToast('Usuário não autenticado.');
            return;
          }
          const authUid = user.id;

          const container = document.getElementById('cards-list');
          if (!container) {
            console.warn('Elemento #cards-list não encontrado no DOM.');
            return;
          }

          // initial load
          await loadAndRenderCards(supabase, authUid, container);

          // bind add button
          await bindAddCardButton(supabase, authUid, container);

          // expose for debug
          window._cardsDebug = { supabase, authUid };

        } catch (err) {
          console.error('cards init error', err);
          showToast('Erro inicializando cartões.');
        }
      })();

    })();


  })();

})();
