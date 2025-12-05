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

  // --- 1. LÓGICA DA ANIMAÇÃO DO PAINEL LOGIN/CADASTRO ---

  const botaoCadastrar = document.getElementById('botaoCadastrar');
  const botaoEntrar = document.getElementById('botaoEntrar');
  const caixa = document.getElementById('caixa');

  if (botaoCadastrar && botaoEntrar && caixa) {
    botaoCadastrar.addEventListener('click', () => {
      caixa.classList.add('painel-direito-ativo');
    });

    botaoEntrar.addEventListener('click', () => {
      caixa.classList.remove('painel-direito-ativo');
    });
  } else {
    console.warn('Elementos da animação de login/cadastro não encontrados.');
  }

  // --- 1.5. LÓGICA DE ANIMAÇÃO (MOBILE) - [ADIÇÃO] ---
  const botaoTrocarParaCadastro = document.getElementById('botaoTrocarParaCadastro');
  const botaoTrocarParaLogin = document.getElementById('botaoTrocarParaLogin');

  if (botaoTrocarParaCadastro && botaoTrocarParaLogin && caixa) {
    botaoTrocarParaCadastro.addEventListener('click', () => {
      caixa.classList.add('painel-direito-ativo');
    });

    botaoTrocarParaLogin.addEventListener('click', () => {
      caixa.classList.remove('painel-direito-ativo');
    });
  } else {
    console.warn('Botões de troca mobile (troca) não encontrados.');
  }
  // --- [FIM DA ADIÇÃO] ---


  // --- NOVA LÓGICA DA ANIMAÇÃO: ESQUECI A SENHA (ATUALIZADO) ---

  const botaoEsqueciSenha = document.getElementById('botaoEsqueciSenha');

  // Seleciona TODOS os botões de "Lembrei a senha"
  const botoesLembreiSenha = document.querySelectorAll(
    '#botaoLembreiSenha, #botaoLembreiSenhaEtapa2, #botaoLembreiSenhaEtapa3'
  );

  if (botaoEsqueciSenha && botoesLembreiSenha.length > 0 && caixa) {

    // Listener para ABRIR o painel
    botaoEsqueciSenha.addEventListener('click', (e) => {
      e.preventDefault(); // Previne o link de navegar
      caixa.classList.add('recuperar-ativo');
    });

    // Listeners para FECHAR o painel (em qualquer etapa)
    botoesLembreiSenha.forEach(botao => {
      botao.addEventListener('click', (e) => {
        e.preventDefault(); // Previne o link de navegar
        caixa.classList.remove('recuperar-ativo');

        // Adicionado: Reseta o formulário de recuperação se o usuário voltar
        // O setTimeout garante que o reset ocorra DEPOIS da animação de saída
        setTimeout(resetRecoveryForm, 500);
      });
    });

  } else {
    console.warn('Elementos da animação de recuperar senha não encontrados.');
  }

  // --- Seleciona os CONTAINERS dos formulários para o loader ---
  const formLoginContainer = document.querySelector('.formulario-login');
  const formCadastroContainer = document.querySelector('.formulario-cadastro');
  const formRecuperarContainer = document.getElementById('form-recuperar');


  // --- 2. INICIALIZAÇÃO DO SUPABASE ---

  let supabase = null;

  if (typeof window.initSupabaseClient === 'function') {
    window.initSupabaseClient().then(client => {
      supabase = client;
      attachAuthListeners();
    }).catch(console.error);
  } else {
    console.error('initSupabaseClient não encontrado. Verifique se main.js está carregado e expõe a função.');
    return;
  }

  // Helper para mostrar pop-ups (definido em main.js)
  const showAppToast = (message, options) => {
    if (typeof window.showToast === 'function') {
      window.showToast(message, options || { duration: 4000 });
    } else {
      alert(message);
    }
  };


  // --- 3. LÓGICA DE CADASTRO (Mantida) ---

  const formCadastro = document.getElementById('form-cadastro');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

      formCadastroContainer.classList.add('loading'); // <-- MOSTRA O LOADER

      const nome = document.getElementById('cadastro-nome').value.trim();
      const username = document.getElementById('cadastro-username').value.trim();
      const email = document.getElementById('cadastro-email').value.trim();
      const senha = document.getElementById('cadastro-senha').value;
      const senhaConfirm = document.getElementById('cadastro-senha-confirm').value;

      // 1. Validação: Senhas coincidem
      if (senha !== senhaConfirm) {
        formCadastroContainer.classList.remove('loading'); // <-- ESCONDE O LOADER
        return showAppToast('Erro: As senhas não coincidem.');
      }

      // 2. Validação: Formato do Username (letras, números, _, ., -)
      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(username)) {
        formCadastroContainer.classList.remove('loading'); // <-- ESCONDE O LOADER
        return showAppToast('Erro: Nome de usuário inválido. Use apenas letras, números e ( _, ., - )');
      }

      // Validação rápida de campos vazios
      if (!nome || !username || !email || !senha) {
        formCadastroContainer.classList.remove('loading'); // <-- ESCONDE O LOADER
        return showAppToast('Erro: Todos os campos são obrigatórios.');
      }

      try {
        // 3. Validação: Checar se username ou email já existem
        const { data: existingProfiles, error: checkError } = await supabase
          .from('profiles')
          .select('username, email')
          .or(`username.eq.${username},email.eq.${email}`);

        if (checkError) throw checkError;

        if (existingProfiles && existingProfiles.length > 0) {
          if (existingProfiles.some(p => p.username === username)) {
            return showAppToast('Erro: Este nome de usuário já está em uso.');
          }
          if (existingProfiles.some(p => p.email === email)) {
            return showAppToast('Erro: Este email já está cadastrado.');
          }
        }

        // 4. Criar o usuário no Supabase Auth
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

        // 5. ATUALIZAR O PERFIL MANUALMENTE
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: nome,
            username: username
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Usuário criado, mas falha ao atualizar perfil:', updateError);
          throw new Error('Falha ao salvar dados do perfil. Tente fazer login.');
        }

        // 6. Sucesso!
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


  // --- 4. LÓGICA DE LOGIN (Mantida) ---

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

        // 2.5 VERIFICAÇÃO DE BANIMENTO (NOVO)
        const { data: banData, error: banError } = await supabase
          .from('user_bans')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(); // maybeSingle evita erro se não achar nada

        if (banData) {
          // Verifica se o banimento ainda é válido
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

        if (signInError) throw signInError;
        if (!loginData.user) throw new Error('Login falhou, tente novamente.');

        // 3. Login bem-sucedido! Buscar o perfil para checar se é admin.
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

        // 4. Redirecionar
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

  // --- 5. LÓGICA DE MOSTRAR/OCULTAR SENHA (Mantida) ---
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

  // --- 6. LÓGICA DE RECUPERAR SENHA (NOVO FLUXO DE 3 ETAPAS) ---

  // Variável para guardar o e-mail entre as etapas
  let recoveryEmail = '';

  // Seletores das Etapas
  const stepEmail = document.getElementById('step-email');
  const stepCode = document.getElementById('step-code');
  const stepPassword = document.getElementById('step-password');

  // Seletores dos Formulários
  const formRecuperarEmail = document.getElementById('recuperar-form-email');
  const formRecuperarCode = document.getElementById('recuperar-form-code');
  const formRecuperarPassword = document.getElementById('recuperar-form-password');

  // Seletores de Inputs e Erros
  const emailInput = document.getElementById('recuperar-email');
  const emailEnviadoEl = document.getElementById('email-enviado');
  const codeInputsContainer = document.getElementById('code-inputs');
  const codeInputs = Array.from(codeInputsContainer.querySelectorAll('.code-input'));
  const novaSenhaInput = document.getElementById('recuperar-nova-senha');
  const confirmSenhaInput = document.getElementById('recuperar-confirm-senha');

  // [REMOVIDO] Seletores de Mensagens de Erro
  // const errorEmailEl = document.getElementById('recuperar-error-email');
  // const errorCodeEl = document.getElementById('recuperar-error-code');
  // const errorPasswordEl = document.getElementById('recuperar-error-password');

  // [REMOVIDO] Função para mostrar erros
  // function showRecoveryError(step, message) { ... }

  // [REMOVIDO] Função para limpar erros
  // function clearAllErrors() { ... }

  // Função para resetar o formulário inteiro
  function resetRecoveryForm() {
    recoveryEmail = '';
    stepEmail.style.display = 'flex';
    stepCode.style.display = 'none';
    stepPassword.style.display = 'none';
    formRecuperarEmail.reset();
    formRecuperarCode.reset();
    formRecuperarPassword.reset();
    // clearAllErrors(); // Removido
  }

  // ETAPA 1: Envio do E-mail
  if (formRecuperarEmail) {
    formRecuperarEmail.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

      formRecuperarContainer.classList.add('loading');
      // clearAllErrors(); // Removido

      const email = emailInput.value.trim();
      if (!email) {
        formRecuperarContainer.classList.remove('loading');
        showAppToast('Por favor, digite seu e-mail.'); // MODIFICADO
        return; // MODIFICADO
      }

      // IMPORTANTE: Para o Supabase enviar um OTP (código) em vez de um link,
      // NÂO devemos passar o 'redirectTo'.
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      formRecuperarContainer.classList.remove('loading');

      if (error) {
        console.error('Erro ao enviar e-mail de recuperação:', error);
        // Não informamos o erro exato por segurança (evitar enumeração de usuários)
        showAppToast('Ocorreu um erro. Tente novamente.'); // MODIFICADO
      } else {
        // Sucesso!
        recoveryEmail = email; // Guarda o e-mail para a próxima etapa
        emailEnviadoEl.textContent = email; // Mostra o e-mail na UI

        // Transição para a Etapa 2
        stepEmail.style.display = 'none';
        stepCode.style.display = 'flex';
        codeInputs[0].focus(); // Foca no primeiro input do código
      }
    });
  }

  // ETAPA 2: Lógica dos Inputs de Código (Auto-avanço, Backspace, Paste)
  if (codeInputsContainer) {
    codeInputs.forEach((input, index) => {
      // 1. Auto-avanço
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
      const pasteData = e.clipboardData.getData('text').trim().slice(0, 6);
      if (/^\d{6}$/.test(pasteData)) {
        pasteData.split('').forEach((char, index) => {
          codeInputs[index].value = char;
        });
        checkAndSubmitCode(); // Tenta submeter após colar
      }
    });
  }

  // Função que junta o código e tenta verificar
  async function checkAndSubmitCode() {
    const code = codeInputs.map(input => input.value).join('');

    // Só submete se tiver 6 dígitos
    if (code.length === 6) {
      formRecuperarContainer.classList.add('loading');
      // clearAllErrors(); // Removido

      const { data, error } = await supabase.auth.verifyOtp({
        email: recoveryEmail,
        token: code,
        type: 'recovery'
      });

      formRecuperarContainer.classList.remove('loading');

      if (error) {
        console.error('Erro ao verificar OTP:', error);
        showAppToast('Código inválido ou expirado. Tente novamente.'); // MODIFICADO
        // Limpa os inputs para o usuário tentar de novo
        codeInputs.forEach(input => input.value = '');
        codeInputs[0].focus();
      } else {
        // Sucesso! O usuário está verificado e pode mudar a senha
        // A sessão é armazenada temporariamente pelo Supabase
        console.log('OTP verificado com sucesso!', data);

        // Transição para a Etapa 3
        stepCode.style.display = 'none';
        stepPassword.style.display = 'flex';
        novaSenhaInput.focus();
      }
    }
  }

  // ETAPA 3: Definir Nova Senha
  if (formRecuperarPassword) {
    formRecuperarPassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

      const newPassword = novaSenhaInput.value;
      const confirmPassword = confirmSenhaInput.value;

      // Validação 1: Campos vazios
      if (!newPassword || !confirmPassword) {
        showAppToast('Por favor, preencha os dois campos.'); // MODIFICADO
        return; // MODIFICADO
      }

      // Validação 2: Senhas coincidem
      if (newPassword !== confirmPassword) {
        showAppToast('As senhas não coincidem.'); // MODIFICADO
        return; // MODIFICADO
      }

      // Validação 3: Senha forte (exemplo mínimo)
      if (newPassword.length < 6) {
        showAppToast('A senha deve ter no mínimo 6 caracteres.'); // MODIFICADO
        return; // MODIFICADO
      }

      formRecuperarContainer.classList.add('loading');
      // clearAllErrors(); // Removido

      // Como o OTP foi verificado na etapa anterior, o Supabase
      // agora permite a atualização da senha do usuário.
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      formRecuperarContainer.classList.remove('loading');

      if (error) {
        console.error('Erro ao atualizar senha:', error);
        showAppToast('Não foi possível atualizar a senha. Tente novamente.'); // MODIFICADO
      } else {
        // SUCESSO TOTAL!
        console.log('Senha atualizada!', data);
        showAppToast('✅ Senha atualizada com sucesso!');

        // Reseta o formulário
        resetRecoveryForm();

        // Fecha o painel "Esqueci a Senha" e volta para o Login
        if (caixa) {
          caixa.classList.remove('recuperar-ativo');
        }
      }
    });
  }


  // Função para anexar os listeners (chamada após Supabase inicializar)
  function attachAuthListeners() {
    // Esta função está aqui caso precisemos dela no futuro,
    // mas os listeners de submit já estão configurados acima.
  }

});

