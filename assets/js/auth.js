/*
  assets/js/auth.js
  Contém a lógica para:
  1. Animação do painel de login/cadastro.
  2. Validação e envio do formulário de cadastro para o Supabase.
  3. Validação e envio do formulário de login (com email ou username) para o Supabase.
  4. Animação do painel de "Esqueci a Senha".
  5. Lógica de "Esqueci a Senha" (NOVO FLUXO DE 3 ETAPAS COM OTP).
  6. Indicadores de carregamento (Spinner) adicionados.
*/

// Espera o DOM carregar antes de executar
document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // 1. DECLARAÇÃO DE VARIÁVEIS GLOBAIS E SELETORES CRÍTICOS
  // (Movido para o topo para evitar erros de referência)
  // ============================================================

  // Variável para guardar o e-mail entre as etapas (Escopo Global dentro do DOMContentLoaded)
  let recoveryEmail = '';

  // Seletores das Etapas de Recuperação
  const stepEmail = document.getElementById('step-email');
  const stepCode = document.getElementById('step-code');
  const stepPassword = document.getElementById('step-password');

  // Seletores dos Formulários de Recuperação
  const formRecuperarEmail = document.getElementById('recuperar-form-email');
  const formRecuperarCode = document.getElementById('recuperar-form-code');
  const formRecuperarPassword = document.getElementById('recuperar-form-password');

  // Seletores de Inputs Específicos
  const emailInput = document.getElementById('recuperar-email');
  const emailEnviadoEl = document.getElementById('email-enviado');
  const novaSenhaInput = document.getElementById('recuperar-nova-senha');
  const confirmSenhaInput = document.getElementById('recuperar-confirm-senha');

  // Seletores de Inputs do Código (OTP)
  const codeInputsContainer = document.getElementById('code-inputs');
  // Converte NodeList para Array para facilitar manipulação
  const codeInputs = codeInputsContainer ? Array.from(codeInputsContainer.querySelectorAll('.code-input')) : [];

  // Seletores Gerais
  const caixa = document.getElementById('caixa');
  const formRecuperarContainer = document.getElementById('form-recuperar');
  const formLoginContainer = document.querySelector('.formulario-login');
  const formCadastroContainer = document.querySelector('.formulario-cadastro');

  // Helper para mostrar pop-ups (definido em main.js)
  const showAppToast = (message, options) => {
    if (typeof window.showToast === 'function') {
      window.showToast(message, options || { duration: 4000 });
    } else {
      alert(message);
    }
  };

  // --- 2. INICIALIZAÇÃO DO SUPABASE ---

  let supabase = null;

  if (typeof window.initSupabaseClient === 'function') {
    window.initSupabaseClient().then(client => {
      supabase = client;
      // attachAuthListeners(); // (Opcional, listeners já estão no fluxo abaixo)
    }).catch(console.error);
  } else {
    console.error('initSupabaseClient não encontrado. Verifique se main.js está carregado e expõe a função.');
    // Não retornamos aqui para permitir que a UI carregue mesmo se a conexão falhar inicialmente
  }


const urlParams = new URLSearchParams(window.location.search);
  
  // === LÓGICA DE EXIBIÇÃO DE BANIMENTO (NOVO) ===
  // === LÓGICA DE EXIBIÇÃO DE BANIMENTO (NOVO) ===
  if (urlParams.get('banned') === 'true') {
    const motivo = urlParams.get('reason') || 'Violação dos termos de uso.';
    
    // Usa o showConfirmationModal do main.js
    setTimeout(() => {
        if (window.showConfirmationModal) {
            window.showConfirmationModal(
                `ACESSO SUSPENSO. Sua conta foi desconectada imediatamente.\n\nMotivo: ${motivo}`, 
                { 
                    okText: 'Entendi', 
                    cancelText: 'Falar com Suporte' // Este é o botão da esquerda
                }
            ).then((usuarioClicouEmEntendi) => {
                // Se usuarioClicouEmEntendi for false, significa que ele clicou em "Falar com Suporte"
                if (!usuarioClicouEmEntendi) { 
                   // Redireciona para a página de suporte
                   window.location.href = 'suporte.html';
                } else {
                   // Se clicou em "Entendi", apenas limpa a URL para o modal não aparecer de novo
                   window.history.replaceState({}, document.title, "index.html");
                }
            });
        } else {
            // Fallback caso o modal não carregue
            alert(`ACESSO SUSPENSO\nMotivo: ${motivo}`);
            window.location.href = 'suporte.html'; // Redireciona após o OK do alert simples
        }
    }, 500);
  }

  // ============================================================
  // 3. LÓGICA DE REDIRECIONAMENTO DA DASHBOARD (CORRIGIDO)
  // ============================================================
  /* Esta lógica agora está posicionada APÓS a declaração das variáveis (stepEmail, stepCode, etc).
     Isso garante que o script não quebre ao tentar acessar elementos undefined.
  */

  const action = urlParams.get('action');
  const emailParam = urlParams.get('email');

  if (action === 'reset_step2' && emailParam) {

    // 1. Ativa o painel de recuperação
    if (caixa) caixa.classList.add('recuperar-ativo');

    // 2. Preenche a variável global com o email da URL
    recoveryEmail = decodeURIComponent(emailParam);

    // 3. Atualiza a UI visual
    if (emailEnviadoEl) emailEnviadoEl.textContent = recoveryEmail;

    // 4. Manipula as etapas (Esconde etapa 1, Mostra etapa 2)
    if (stepEmail) stepEmail.style.display = 'none';
    if (stepCode) stepCode.style.display = 'flex';
    if (stepPassword) stepPassword.style.display = 'none'; // Garante que a 3 esteja oculta

    // 5. Feedback visual
    showAppToast('Código enviado! Verifique seu e-mail.');

    // 6. CORREÇÃO DO FOCO: Espera a animação/renderização e foca no input
    setTimeout(() => {
      if (codeInputs.length > 0) {
        codeInputs[0].focus();
      }
    }, 500);

    // 7. Limpa a URL para não ficar em loop se der F5
    window.history.replaceState({}, document.title, "index.html");
  }


  // ============================================================
  // 4. ANIMAÇÕES DO PAINEL (LOGIN / CADASTRO / RECUPERAR)
  // ============================================================

  const botaoCadastrar = document.getElementById('botaoCadastrar');
  const botaoEntrar = document.getElementById('botaoEntrar');
  const botaoTrocarParaCadastro = document.getElementById('botaoTrocarParaCadastro');
  const botaoTrocarParaLogin = document.getElementById('botaoTrocarParaLogin');
  const botaoEsqueciSenha = document.getElementById('botaoEsqueciSenha');

  // Seleciona TODOS os botões de "Lembrei a senha"
  const botoesLembreiSenha = document.querySelectorAll(
    '#botaoLembreiSenha, #botaoLembreiSenhaEtapa2, #botaoLembreiSenhaEtapa3'
  );

  // Animação Desktop
  if (botaoCadastrar && botaoEntrar && caixa) {
    botaoCadastrar.addEventListener('click', () => {
      caixa.classList.add('painel-direito-ativo');
    });
    botaoEntrar.addEventListener('click', () => {
      caixa.classList.remove('painel-direito-ativo');
    });
  }

  // Animação Mobile
  if (botaoTrocarParaCadastro && botaoTrocarParaLogin && caixa) {
    botaoTrocarParaCadastro.addEventListener('click', () => {
      caixa.classList.add('painel-direito-ativo');
    });
    botaoTrocarParaLogin.addEventListener('click', () => {
      caixa.classList.remove('painel-direito-ativo');
    });
  }

  // Função para resetar o formulário inteiro de recuperação
  function resetRecoveryForm() {
    recoveryEmail = '';
    if (stepEmail) stepEmail.style.display = 'flex';
    if (stepCode) stepCode.style.display = 'none';
    if (stepPassword) stepPassword.style.display = 'none';

    if (formRecuperarEmail) formRecuperarEmail.reset();
    if (formRecuperarCode) formRecuperarCode.reset();
    if (formRecuperarPassword) formRecuperarPassword.reset();
  }

  // Animação "Esqueci a Senha"
  if (botaoEsqueciSenha && botoesLembreiSenha.length > 0 && caixa) {
    // Listener para ABRIR o painel
    botaoEsqueciSenha.addEventListener('click', (e) => {
      e.preventDefault();
      caixa.classList.add('recuperar-ativo');
    });

    // Listeners para FECHAR o painel (em qualquer etapa)
    botoesLembreiSenha.forEach(botao => {
      botao.addEventListener('click', (e) => {
        e.preventDefault();
        caixa.classList.remove('recuperar-ativo');
        // Reseta o formulário após a animação de saída
        setTimeout(resetRecoveryForm, 500);
      });
    });
  }


  // ============================================================
  // 5. LÓGICA DE CADASTRO
  // ============================================================

  const formCadastro = document.getElementById('form-cadastro');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

      formCadastroContainer.classList.add('loading'); // Mostra loader

      const nome = document.getElementById('cadastro-nome').value.trim();
      const username = document.getElementById('cadastro-username').value.trim();
      const email = document.getElementById('cadastro-email').value.trim();
      const senha = document.getElementById('cadastro-senha').value;
      const senhaConfirm = document.getElementById('cadastro-senha-confirm').value;

      // Validação: Senhas coincidem
      if (senha !== senhaConfirm) {
        formCadastroContainer.classList.remove('loading');
        return showAppToast('Erro: As senhas não coincidem.');
      }

      // Validação: Formato do Username
      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(username)) {
        formCadastroContainer.classList.remove('loading');
        return showAppToast('Erro: Nome de usuário inválido. Use apenas letras, números e ( _, ., - )');
      }

      // Validação rápida de campos vazios
      if (!nome || !username || !email || !senha) {
        formCadastroContainer.classList.remove('loading');
        return showAppToast('Erro: Todos os campos são obrigatórios.');
      }

      try {
        // Validação: Checar se username ou email já existem na tabela profiles
        const { data: existingProfiles, error: checkError } = await supabase
          .from('profiles')
          .select('username, email')
          .or(`username.eq.${username},email.eq.${email}`);

        if (checkError) throw checkError;

        if (existingProfiles && existingProfiles.length > 0) {
          if (existingProfiles.some(p => p.username === username)) {
            formCadastroContainer.classList.remove('loading');
            return showAppToast('Erro: Este nome de usuário já está em uso.');
          }
          if (existingProfiles.some(p => p.email === email)) {
            formCadastroContainer.classList.remove('loading');
            return showAppToast('Erro: Este email já está cadastrado.');
          }
        }

        // Criar o usuário no Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: senha
        });

        if (signUpError) {
          if (signUpError.message.includes("User already registered")) {
            return showAppToast('Erro: Este email já está cadastrado.');
          }
          throw signUpError;
        }

        if (!authData.user) throw new Error('Falha ao criar usuário, tente novamente.');

        // ATUALIZAR O PERFIL MANUALMENTE (Nome e Username)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: nome,
            username: username
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Usuário criado, mas falha ao atualizar perfil:', updateError);
          // Não impedimos o fluxo, pois o Auth foi criado
        }

        showAppToast('Cadastro concluído com sucesso! Verifique seu e-mail para a verificação.');
        formCadastro.reset();
        if (caixa) {
          caixa.classList.remove('painel-direito-ativo');
        }

      } catch (error) {
        console.error('Erro no cadastro:', error);
        showAppToast(error.message || 'Ocorreu um erro. Tente novamente.');
      } finally {
        formCadastroContainer.classList.remove('loading');
      }
    });
  }


  // ============================================================
  // 6. LÓGICA DE LOGIN
  // ============================================================

  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

      formLoginContainer.classList.add('loading');

      const loginInput = document.getElementById('email-login').value.trim();
      const senha = document.getElementById('senha-login').value;

      if (!loginInput || !senha) {
        formLoginContainer.classList.remove('loading');
        return showAppToast('Usuário e senha são obrigatórios.');
      }

      try {
        let userEmail = loginInput;

        // 1. Checar se o input é um username (não contém '@')
        if (!loginInput.includes('@')) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', loginInput)
              .single();

            if (error) {
              // PGRST116 = JSON object requested, multiple (or no) rows returned
              if (error.code === 'PGRST116') {
                throw new Error('Usuário ou senha inválidos.');
              }
              throw error;
            }

            if (profile && profile.email) {
              userEmail = profile.email;
            } else {
              throw new Error('Usuário ou senha inválidos.');
            }
          } catch (error) {
            console.error('Erro ao buscar email por username:', error);
            throw new Error('Usuário ou senha inválidos.');
          }
        }

        // 2. Tentar fazer o login com o email
        const { data: loginData, error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: senha,
        });

        if (signInError) throw signInError;
        const user = loginData.user;

        // 3. VERIFICAÇÃO DE BANIMENTO
        const { data: banData, error: banError } = await supabase
          .from('user_bans')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (banData) {
          let isBanned = false;

          if (banData.ban_type === 'permanent') {
            isBanned = true;
          } else if (banData.ban_type === 'temporary' && banData.banned_until) {
            const now = new Date();
            const until = new Date(banData.banned_until);
            if (now < until) {
              isBanned = true;
            }
          }

          if (isBanned) {
            await supabase.auth.signOut(); // Desloga imediatamente
            showAppToast(`ACESSO NEGADO: Você está banido. Motivo: ${banData.reason}`);
            formLoginContainer.classList.remove('loading');
            return; // Para a execução
          }
        }

        if (!loginData.user) throw new Error('Login falhou, tente novamente.');

        // 4. Buscar o perfil para checar se é admin e salvar no LocalStorage
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', loginData.user.id)
          .single();

        if (profileError) {
          console.warn("Login efetuado, mas falha ao buscar perfil de admin:", profileError.message);
          localStorage.setItem('userRole', 'cliente');
        } else {
          const userRole = (profileData && profileData.is_admin === true) ? 'admin' : 'cliente';
          localStorage.setItem('userRole', userRole);
        }

        // 5. Redirecionar
        window.location.href = 'inicial.html';

      } catch (error) {
        console.error('Erro no login:', error);

        if (error.message === 'Email not confirmed') {
          showAppToast('Sua conta precisa ser verificada. Por favor, cheque seu e-mail.');
        } else {
          showAppToast('Usuário ou senha inválidos.');
        }

        formLoginContainer.classList.remove('loading');
      }
    });
  }

  // --- LÓGICA DE MOSTRAR/OCULTAR SENHA ---
  const toggleSenha = document.getElementById('toggleSenha');
  if (toggleSenha) {
    toggleSenha.addEventListener('click', () => {
      const senhaInput = document.getElementById('senha-login');
      if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        toggleSenha.src = 'https://i.ibb.co/fdNsZVCs/olho.png';
      } else {
        senhaInput.type = 'password';
        toggleSenha.src = 'https://i.ibb.co/Nnt75FQh/olho-1.png';
      }
    });
  }


  // ============================================================
  // 7. LÓGICA DE INPUTS DO CÓDIGO (AUTO-AVANÇO E SUBMIT)
  // ============================================================

  // Função centralizada para verificar o código
  async function checkAndSubmitCode() {
    // Pega os valores atuais dos inputs
    const code = codeInputs.map(input => input.value).join('');

    // Só submete se tiver 6 dígitos
    if (code.length === 6) {
      if (!recoveryEmail) {
        showAppToast('Erro: E-mail não identificado. Por favor, reinicie o processo.');
        return;
      }

      formRecuperarContainer.classList.add('loading');

      const { data, error } = await supabase.auth.verifyOtp({
        email: recoveryEmail,
        token: code,
        type: 'recovery'
      });

      formRecuperarContainer.classList.remove('loading');

      if (error) {
        console.error('Erro ao verificar OTP:', error);
        showAppToast('Código inválido ou expirado. Tente novamente.');
        // Limpa os inputs para o usuário tentar de novo
        codeInputs.forEach(input => input.value = '');
        codeInputs[0].focus();
      } else {
        // Sucesso!
        console.log('OTP verificado com sucesso!', data);

        // Transição para a Etapa 3
        if (stepCode) stepCode.style.display = 'none';
        if (stepPassword) stepPassword.style.display = 'flex';

        // Foca na nova senha
        if (novaSenhaInput) {
          setTimeout(() => novaSenhaInput.focus(), 100);
        }
      }
    }
  }

  // ETAPA 2: Listeners dos Inputs de Código
  if (codeInputsContainer && codeInputs.length > 0) {
    codeInputs.forEach((input, index) => {
      // 1. Auto-avanço e verificação ao digitar
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value && index < codeInputs.length - 1) {
          codeInputs[index + 1].focus();
        }

        // Se for o último input, verifica se todos estão preenchidos
        if (index === codeInputs.length - 1 && value) {
          checkAndSubmitCode();
        }
      });

      // 2. Backspace
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          codeInputs[index - 1].focus();
        }
      });
    });

    // 3. Colar (Paste)
    codeInputsContainer.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim().slice(0, 6);

      // Verifica se são apenas números
      if (/^\d+$/.test(pasteData)) {
        pasteData.split('').forEach((char, index) => {
          if (codeInputs[index]) {
            codeInputs[index].value = char;
          }
        });

        // Se colou 6 dígitos, tenta submeter
        if (pasteData.length === 6) {
          checkAndSubmitCode();
        } else if (codeInputs[pasteData.length]) {
          // Se colou menos, foca no próximo vazio
          codeInputs[pasteData.length].focus();
        }
      }
    });
  }


  // ============================================================
  // 8. FORMULÁRIOS DE RECUPERAÇÃO (ETAPA 1 E ETAPA 3)
  // ============================================================

  // ETAPA 1: Envio do E-mail
  if (formRecuperarEmail) {
    formRecuperarEmail.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

      formRecuperarContainer.classList.add('loading');

      const email = emailInput.value.trim();
      if (!email) {
        formRecuperarContainer.classList.remove('loading');
        showAppToast('Por favor, digite seu e-mail.');
        return;
      }

      // Envia OTP (sem redirectTo)
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      formRecuperarContainer.classList.remove('loading');

      if (error) {
        console.error('Erro ao enviar e-mail de recuperação:', error);
        showAppToast('Ocorreu um erro. Tente novamente.');
      } else {
        // Sucesso!
        recoveryEmail = email; // Guarda o e-mail
        if (emailEnviadoEl) emailEnviadoEl.textContent = email;

        // Transição para a Etapa 2
        if (stepEmail) stepEmail.style.display = 'none';
        if (stepCode) stepCode.style.display = 'flex';

        // Foca no primeiro input
        if (codeInputs.length > 0) codeInputs[0].focus();
      }
    });
  }

  // ETAPA 3: Definir Nova Senha
  if (formRecuperarPassword) {
    formRecuperarPassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

      const newPassword = novaSenhaInput.value;
      const confirmPassword = confirmSenhaInput.value;

      // Validações
      if (!newPassword || !confirmPassword) {
        showAppToast('Por favor, preencha os dois campos.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showAppToast('As senhas não coincidem.');
        return;
      }
      if (newPassword.length < 6) {
        showAppToast('A senha deve ter no mínimo 6 caracteres.');
        return;
      }

      formRecuperarContainer.classList.add('loading');

      // Atualiza a senha do usuário autenticado (OTP validou a sessão)
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      formRecuperarContainer.classList.remove('loading');

      if (error) {
        console.error('Erro ao atualizar senha:', error);
        showAppToast('Não foi possível atualizar a senha. Tente novamente.');
      } else {
        console.log('Senha atualizada!', data);
        showAppToast('✅ Senha atualizada com sucesso!');

        // Reseta o formulário e fecha o modal
        resetRecoveryForm();
        if (caixa) {
          caixa.classList.remove('recuperar-ativo');
        }
      }
    });
  }


  /* ============================================================
   LÓGICA DE ENTRAR SEM CONTA (GUEST)
   ============================================================ */
  const btnGuestLogin = document.getElementById('btn-guest-login');

  if (btnGuestLogin) {
    btnGuestLogin.addEventListener('click', async (e) => {
      e.preventDefault(); // Impede o link de navegar imediatamente

      // Se o client do Supabase não estiver pronto, tenta pegar global ou falha seguro
      const client = supabase || (window.supabase && window.supabase.createClient ? window.initSupabaseClient() : null);

      // Adiciona classe de loading visualmente
      const formContainer = document.querySelector('.formulario-login');
      if (formContainer) formContainer.classList.add('loading');

      try {
        if (client) {
          // 1. Força o Logout no Supabase
          await client.auth.signOut();
        }

        // 2. Limpa dados locais de sessão antiga
        localStorage.removeItem('userRole');
        localStorage.removeItem('sb-xhzdyatnfaxnvvrllhvs-auth-token'); // Limpa token padrão do Supabase se houver

        // 3. Redireciona para a home
        window.location.href = 'inicial.html';

      } catch (err) {
        console.error("Erro ao sair:", err);
        // Mesmo com erro, força o redirecionamento
        window.location.href = 'inicial.html';
      }
    });
  }
});
