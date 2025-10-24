/*
  assets/js/auth.js
  
  *** ARQUIVO CORRIGIDO (Ambos os problemas resolvidos) ***
  
  1. (Problema 1) A lógica de login agora checa
     especificamente por 'Email not confirmed'.
     
  2. (Problema 2) A lógica de cadastro foi limpa.
     O bloco 'supabase.from('profiles').update(...)' foi REMOVIDO
     pois o Trigger SQL (handle_new_user) agora cuida
     de preencher o perfil.
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

  // --- NOVA LÓGICA DA ANIMAÇÃO: ESQUECI A SENHA ---

  const botaoEsqueciSenha = document.getElementById('botaoEsqueciSenha');
  const botaoLembreiSenha = document.getElementById('botaoLembreiSenha');

  if (botaoEsqueciSenha && botaoLembreiSenha && caixa) {
    botaoEsqueciSenha.addEventListener('click', (e) => {
      e.preventDefault(); // Previne o link de navegar
      caixa.classList.add('recuperar-ativo');
    });

    botaoLembreiSenha.addEventListener('click', (e) => {
      e.preventDefault(); // Previne o link de navegar
      caixa.classList.remove('recuperar-ativo');
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
      // console.log('Supabase inicializado em auth.js');
      attachAuthListeners();
    }).catch(console.error);
  } else {
    console.error('initSupabaseClient não encontrado. Verifique se main.js está carregado e expõe a função.');
    return;
  }

  // Helper para mostrar pop-ups (definido em main.js)
  const showAppToast = (message) => {
    if (typeof window.showToast === 'function') {
      window.showToast(message, {
        duration: 4000
      });
    } else {
      // Fallback caso a função de main.js não esteja disponível
      alert(message);
    }
  };


  // --- 3. LÓGICA DE CADASTRO ---

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
        //    (Sua RLS de SELECT 'public profiles' permite isso)
        const {
          data: existingProfiles,
          error: checkError
        } = await supabase
          .from('profiles')
          .select('username, email')
          .or(`username.eq.${username},email.eq.${email}`);

        if (checkError) throw checkError;

        if (existingProfiles && existingProfiles.length > 0) {
          if (existingProfiles.some(p => p.username === username)) {
            return showAppToast('Erro: Este nome de usuário já está em uso.');
          }
          if (existingProfiles.some(p => p.email === email)) {
            // Este erro pode aparecer se o usuário foi criado no Auth mas falhou no Profile
            return showAppToast('Erro: Este email já está cadastrado.');
          }
        }

        // 4. Criar o usuário no Supabase Auth
        //    O 'options.data' é VITAL. O trigger SQL vai ler isso.
        const {
          data: authData,
          error: signUpError
        } = await supabase.auth.signUp({
          email: email,
          password: senha,
          options: {
            // Estes dados serão lidos pelo trigger 'handle_new_user'
            data: {
              full_name: nome,
              username: username
            }
          }
        });

        if (signUpError) {
          // Trata o erro "User already registered" que você mencionou
          if (signUpError.message.includes("User already registered")) {
            return showAppToast('Erro: Este email já está cadastrado.');
          }
          throw signUpError;
        }

        if (!authData.user) throw new Error('Falha ao criar usuário, tente novamente.');

        // -----------------------------------------------------------------
        // *** CORREÇÃO DO PROBLEMA 2 ***
        //
        // O bloco 'supabase.from('profiles').update(...)'
        // foi REMOVIDO daqui.
        //
        // Ele não é mais necessário, pois o Trigger SQL
        // (handle_new_user) já fez o trabalho de
        // criar a linha em 'public.profiles'.
        // -----------------------------------------------------------------

        // 6. Sucesso!
        // A mensagem de verificação está correta.
        showAppToast('Cadastro concluído com sucesso! Verifique seu e-mail para a verificação.');

        // Limpa o formulário
        formCadastro.reset();

        // Volta para a tela de login
        if (caixa) {
          caixa.classList.remove('painel-direito-ativo');
        }

      } catch (error) {
        console.error('Erro no cadastro:', error);
        showAppToast(error.message || 'Ocorreu um erro. Tente novamente.');
      } finally {
        formCadastroContainer.classList.remove('loading'); // <-- ESCONDE O LOADER (no sucesso ou erro)
      }
    });
  }


  // --- 4. LÓGICA DE LOGIN ---

  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

      formLoginContainer.classList.add('loading'); // <-- MOSTRA O LOADER

      const loginInput = document.getElementById('email-login').value.trim();
      const senha = document.getElementById('senha-login').value;

      if (!loginInput || !senha) {
        formLoginContainer.classList.remove('loading'); // <-- ESCONDE O LOADER
        return showAppToast('Usuário e senha são obrigatórios.');
      }

      try {
        let userEmail = loginInput;

        // 1. Checar se o input é um username (não contém '@')
        //    Agora isso vai funcionar, pois o 'username' foi salvo pelo trigger.
        if (!loginInput.includes('@')) {
          try {
            const {
              data: profile,
              error
            } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', loginInput)
              .single(); // Espera um resultado único

            if (error) {
              if (error.code === 'PGRST116') { // 'PGRST116' = Não encontrado
                throw new Error('Usuário ou senha inválidos.');
              }
              throw error; // Lança outros erros
            }

            if (profile && profile.email) {
              userEmail = profile.email;
            } else {
              throw new Error('Usuário ou senha inválidos.');
            }
          } catch (error) {
            console.error('Erro ao buscar email por username:', error);
            throw new Error('Usuário ou senha inválidos.'); // Joga para o catch principal
          }
        }

        // 2. Tentar fazer o login com o email (original ou obtido)
        const {
          data: loginData,
          error: signInError
        } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: senha,
        });

        if (signInError) throw signInError; // Joga o erro para o catch
        if (!loginData.user) throw new Error('Login falhou, tente novamente.');

        // 3. Login bem-sucedido! Buscar o perfil para checar se é admin.
        const {
          data: profileData,
          error: profileError
        } = await supabase
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

        // 4. Redirecionar para a página inicial
        window.location.href = 'inicial.html';

      } catch (error) {
        console.error('Erro no login:', error);

        // ==========================================================
        // ### CORREÇÃO DO PROBLEMA 1 ###
        // Checamos a mensagem de erro específica do Supabase
        if (error.message === 'Email not confirmed') {
          showAppToast('Sua conta precisa ser verificada. Por favor, cheque seu e-mail.');
        } else {
          // Mensagem genérica para todos os outros erros
          showAppToast('Usuário ou senha inválidos.');
        }
        // ### FIM DA CORREÇÃO ###
        // ==========================================================

        formLoginContainer.classList.remove('loading'); // <-- ESCONDE O LOADER (no erro)
      }
    });
  }

  // --- 5. LÓGICA DE MOSTRAR/OCULTAR SENHA (Bônus) ---
  const toggleSenha = document.getElementById('toggleSenha');
  if (toggleSenha) {
    toggleSenha.addEventListener('click', () => {
      const senhaInput = document.getElementById('senha-login');
      if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        toggleSenha.src = 'https://i.ibb.co/fdNsZVCs/olho.png'; // Caminho para ícone 'olho aberto'
      } else {
        senhaInput.type = 'password';
        toggleSenha.src = 'https://i.ibb.co/Nnt75FQh/olho-1.png'; // Caminho para ícone 'olho fechado'
      }
    });
  }

  // --- 6. LÓGICA DE RECUPERAR SENHA (NOVO) ---
  if (formRecuperarContainer) {
    const formRecuperar = formRecuperarContainer.querySelector('form');
    
    if (formRecuperar) {
      formRecuperar.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!supabase) return showAppToast('Erro de conexão. Tente novamente.');

        formRecuperarContainer.classList.add('loading'); // <-- MOSTRA O LOADER

        const loginInput = document.getElementById('recuperar-email').value.trim();
        if (!loginInput) {
          formRecuperarContainer.classList.remove('loading'); // <-- ESCONDE O LOADER
          return showAppToast('Por favor, digite seu e-mail ou nome de usuário.');
        }

        let userEmail = loginInput;

        try {
          // 1. Se não for um e-mail, busca o e-mail pelo username
          // (Isso também funcionará agora)
          if (!loginInput.includes('@')) {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', loginInput)
              .single();
            
            if (error && error.code !== 'PGRST116') {
               console.error('Erro ao buscar email por username (recuperação):', error);
            }
            
            if (profile && profile.email) {
              userEmail = profile.email;
            } else {
              console.warn(`Username ${loginInput} não encontrado para recuperação.`);
            }
          }

          // 2. Tenta enviar o e-mail de redefinição
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail);

          if (resetError) {
             console.error('Erro ao solicitar redefinição de senha:', resetError.message);
          }

        } catch (error) {
          console.error('Erro inesperado na recuperação de senha:', error);
        
        } finally {
          // 3. SEMPRE mostra uma mensagem genérica por segurança
          formRecuperarContainer.classList.remove('loading'); // <-- ESCONDE O LOADER

          showAppToast('Se uma conta existir para este usuário, um e-mail de recuperação foi enviado.');
          
          formRecuperar.reset();
          if (caixa) {
            caixa.classList.remove('recuperar-ativo');
          }
        }
      });
    }
  }


  // Função para anexar os listeners (chamada após Supabase inicializar)
  function attachAuthListeners() {
    // Função de placeholder
  }
});
