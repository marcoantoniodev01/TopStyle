// assets/js/photo-upload.js  (type="module")
import { supabase } from './supabaseClient.js';

const profilePhoto = document.getElementById('profilePhoto');
const profileUpload = document.getElementById('profileUpload');

if (!profilePhoto || !profileUpload) {
  console.error('Não foi possível encontrar #profilePhoto ou #profileUpload no HTML.');
} else {

  /* ---------- toast helper (usa window.showToast se disponível) ---------- */
  function _injectLocalToast() {
    if (document.getElementById('pu-toast-styles')) return;
    const css = `
      .pu-toast-container{position:fixed;top:1rem;right:1rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none}
      .pu-toast{pointer-events:auto;padding:10px 14px;color:#fff;min-width:220px;opacity:0;transform:translateY(-8px);transition:opacity .22s,transform .22s;border-radius:6px}
      .pu-toast.show{opacity:1;transform:translateY(0)}
      .pu-toast.success{background:linear-gradient(180deg,#1fa67a,#0b8a5b)}
      .pu-toast.error{background:linear-gradient(180deg,#d9534f,#b02a2a)}
      .pu-toast.info{background:linear-gradient(180deg,#2b6cff,#1740c6)}
      @media(max-width:520px){.pu-toast-container{right:0.5rem;left:0.5rem}}
    `;
    const st = document.createElement('style');
    st.id = 'pu-toast-styles';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }
  function _ensureToastContainer() {
    let c = document.querySelector('.pu-toast-container');
    if (!c) { c = document.createElement('div'); c.className = 'pu-toast-container'; document.body.appendChild(c); }
    return c;
  }
  function localShowToast(msg, type = 'info', duration = 2600) {
    // se existir window.showToast preferimos ela (consistência com seu projeto)
    if (typeof window.showToast === 'function') {
      try { window.showToast(msg, type, duration); return; } catch (e) { /* fallback para local */ }
    }
    _injectLocalToast();
    const c = _ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'pu-toast ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
    t.textContent = msg;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); t.addEventListener('transitionend', () => t.remove()); }, duration);
  }

  function notify(msg, type = 'info', duration = 2600) {
    localShowToast(msg, type, duration);
  }

  /* ---------- util: extrair storage path a partir da public url ---------- */
  function extractStoragePathFromPublicUrl(url) {
    if (!url || typeof url !== 'string') return null;
    // procura '/avatars/' na url e retorna a parte depois disso
    const idx = url.indexOf('/avatars/');
    if (idx === -1) {
      // tenta outra variação comum: '/object/public/avatars/'
      const idx2 = url.indexOf('/object/public/avatars/');
      if (idx2 === -1) return null;
      return url.substring(idx2 + '/object/public/avatars/'.length);
    }
    return url.substring(idx + '/avatars/'.length);
  }

  /* ---------- carregar dados iniciais ---------- */
  async function loadProfileData() {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) { console.error('auth.getUser error', userErr); return; }
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Não foi possível buscar profile row:', error);
        return;
      }
      if (profile && profile.avatar_url) profilePhoto.src = profile.avatar_url;
    } catch (err) {
      console.error('loadProfileData erro', err);
    }
  }

  loadProfileData();

  profilePhoto.addEventListener('click', () => profileUpload.click());

  profileUpload.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // infos do usuário
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) { console.error('auth.getUser error', userErr); notify('Erro de autenticação.', 'error'); return; }
    if (!user) { notify('Você precisa estar logado.', 'error'); return; }

    // 1) lê row atual (para saber se temos avatar antigo para deletar depois)
    let currentProfile = null;
    try {
      const { data: profileRow, error: selErr } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (selErr) {
        console.warn('Erro ao buscar profileRow antes do upload:', selErr);
        // prossegue mesmo que não encontre, mas notificamos
      } else {
        currentProfile = profileRow || null;
      }
    } catch (e) {
      console.warn('Erro fetching profileRow pre-upload', e);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    notify('Enviando imagem...', 'info', 3000);

    try {
      // 2) upload (se o arquivo já existir com mesmo path, option upsert true substituiria, mas usamos timestamp para nome único)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('uploadError', uploadError);
        throw uploadError;
      }
      console.log('Upload OK:', filePath);

      // 3) pega publicUrl
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl || urlData?.public_url || null;
      if (!publicUrl) {
        console.warn('getPublicUrl retornou sem url válida', urlData);
        notify('Upload realizado, mas não foi possível obter a URL pública.', 'error');
        return;
      }

      // 4) tenta atualizar somente com UPDATE (não INSERT)
      const { data: updateData, error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select();

      if (updateErr) {
        console.error('Erro ao atualizar profile.avatar_url:', updateErr);
        // se for erro de RLS dar mensagem específica
        if (String(updateErr.message || '').toLowerCase().includes('row-level')) {
          notify('Permissão negada: ajuste as policies (RLS) para permitir atualizar seu perfil.', 'error', 6000);
        } else {
          notify('Falha ao atualizar perfil com a nova imagem.', 'error', 6000);
        }
        // opcional: remover o arquivo recém-subido para evitar lixo no bucket?
        // Não removemos automaticamente aqui para não perder dados sem ação do admin.
        throw updateErr;
      }

      // 5) se houver avatar anterior, tenta remover do bucket
      try {
        const oldUrl = currentProfile?.avatar_url || null;
        const oldPath = extractStoragePathFromPublicUrl(oldUrl);
        if (oldPath) {
          const { error: delErr } = await supabase.storage.from('avatars').remove([oldPath]);
          if (delErr) {
            console.warn('Falha ao remover arquivo antigo do bucket (não crítico):', delErr);
            // não tratamos como erro fatal
          } else {
            console.log('Arquivo antigo removido do bucket:', oldPath);
          }
        }
      } catch (e) {
        console.warn('Erro ao tentar remover arquivo antigo (non-fatal):', e);
      }

      // 6) sucesso visual e mensagem
      profilePhoto.src = publicUrl;
      notify('Foto atualizada com sucesso!', 'success', 2600);
      console.log('Profile atualizado:', updateData);

    } catch (err) {
      console.error('Erro ao atualizar foto de perfil:', err);
      // mensagens amigáveis
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes('row-level')) {
        notify('Permissão negada (RLS). Ajuste policies no Supabase para permitir update do perfil.', 'error', 6000);
      } else {
        notify('Falha ao atualizar a foto. Veja console para detalhes.', 'error', 5000);
      }
      // recarrega a foto anterior para garantir UI consistente
      await loadProfileData();
    } finally {
      // limpa input para permitir re-upload do mesmo arquivo
      profileUpload.value = '';
    }
  });
}