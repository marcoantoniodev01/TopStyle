/*
  assets/js/auth.js
  Contém a lógica para:
  1. Animação do painel de login/cadastro.
  2. Validação e envio do formulário de cadastro para o Supabase.
  3. Validação e envio do formulário de login (com email ou username) para o Supabase.
  4. Animação do painel de "Esqueci a Senha".
  5. Lógica de "Esqueci a Senha".
  6. Indicadores de carregamento (Spinner) adicionados.
  
  *** ARQUIVO CORRIGIDO (Lógica de INSERT trocada por UPDATE) ***
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

  // As funções initSupabaseClient e showToast são carregadas de 'main.js'
  // Garantimos que main.js seja carregado ANTES de auth.js no seu HTML.
  // Se 'main.js' ainda não foi carregado, window.initSupabaseClient pode ser nulo.
  // Vamos esperar que 'main.js' o defina.

  let supabase = null;

  // Tenta inicializar o Supabase. main.js deve ter exposto a função.
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
        //    (Você mencionou que desativou a confirmação, se reativar, tudo bem)
        // 4. Criar o usuário no Supabase Auth
const {
  data: authData,
  error: signUpError
} = await supabase.auth.signUp({
  email: email,
  password: senha,
  options: {
    // Este campo 'data' será armazenado em auth.users.raw_user_meta_data
    // e estará acessível pelo nosso trigger.
    data: {
      full_name: nome,
      username: username,
      // O email também é útil aqui para o trigger
      email: email 
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
        // *** AQUI ESTÁ A CORREÇÃO ***
        //
        // O trigger padrão do Supabase já criou a linha em 'profiles'.
        // Em vez de 'insert', usamos 'update' para preencher os dados.
        // -----------------------------------------------------------------

        // 5. ATUALIZAR os dados no 'profiles'
        const {
          error: profileError
        } = await supabase
          .from('profiles')
          .update({
            full_name: nome,
            username: username,
            email: email, // Armazenar o email aqui é bom para a sua função de login
            phone: '', // (SQL 5)
            // is_admin: false // (Já é 'false' por padrão no seu SQL)
          })
          .eq('id', authData.user.id); // Atualiza a linha ONDE o 'id' bate

        if (profileError) {
          // Se o UPDATE falhar, pode ser um problema de RLS
          // Sua RLS de UPDATE "Users can update their own profile." está correta
          // e deve permitir isso, já que o usuário logado (auth.uid()) é o dono do perfil.
          console.error("Erro ao ATUALIZAR perfil:", profileError);
          // Mensagem de erro que você criou
          throw new Error('Erro ao finalizar cadastro do perfil: ' + profileError.message);
        }

        // 6. Sucesso!
        // (Se você reativar a confirmação de e-mail, mude esta mensagem)
        showAppToast('Cadastro concluído com sucesso! Você já pode fazer login.');

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
        if (!loginInput.includes('@')) {
          try {
            // Busca o email correspondente ao username na tabela 'profiles'
            // Sua RLS "Public profiles are viewable by everyone." permite isso.
            const {
              data: profile,
              error
            } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', loginInput)
              .single(); // Espera um resultado único

            if (error) {
              // Se o 'error' for 'PGRST116', significa que não encontrou (0 rows)
              if (error.code === 'PGRST116') {
                throw new Error('Usuário ou senha inválidos.'); // Joga para o catch
              }
              throw error; // Lança outros erros
            }

            if (profile && profile.email) {
              userEmail = profile.email;
            } else {
              throw new Error('Usuário ou senha inválidos.'); // Joga para o catch
            }
          } catch (error) {
            // Pega o erro de 'Usuário ou senha inválidos' ou o erro do Supabase
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

        if (signInError) throw signInError;
        if (!loginData.user) throw new Error('Login falhou, tente novamente.');

        // 3. Login bem-sucedido! Buscar o perfil para checar se é admin.
        // Sua RLS de SELECT também permite isso para usuários autenticados.
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
          // Permite o login, mas assume 'cliente'
          localStorage.setItem('userRole', 'cliente');
        } else {
          // Define o 'userRole' para o main.js usar na próxima página
          const userRole = (profileData && profileData.is_admin === true) ? 'admin' : 'cliente';
          localStorage.setItem('userRole', userRole);
        }

        // 4. Redirecionar para a página inicial
        // A lógica do preloader/intro em 'inicial.html' cuidará do resto.
        window.location.href = 'inicial.html';
        // Não precisamos esconder o loader aqui, pois a página vai recarregar

      } catch (error) {
        console.error('Erro no login:', error);
        // Mensagem genérica para segurança (não dizer se foi o usuário ou a senha)
        showAppToast('Usuário ou senha inválidos.');
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
    const formRecuperar = formRecuperarContainer.querySelector('form'); // Seleciona o <form> dentro da div
    
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
        // let processingToast = null; // <-- REMOVIDO

        try {
          // Mostra um toast de carregamento
          // if (typeof window.showToast === 'function') { // <-- REMOVIDO
          //    processingToast = window.showToast('Processando sua solicitação...', { duration: 10000 }); // Duração longa // <-- REMOVIDO
          // } // <-- REMOVIDO


          // 1. Se não for um e-mail, busca o e-mail pelo username
          if (!loginInput.includes('@')) {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', loginInput)
              .single();
            
            // Se der erro (exceto 'não encontrado') ou não achar perfil,
            // pulamos para o 'finally' onde a msg genérica será mostrada.
            if (error && error.code !== 'PGRST116') {
               console.error('Erro ao buscar email por username (recuperação):', error);
            }
            
            if (profile && profile.email) {
              userEmail = profile.email;
            } else {
              // Se não achou, 'userEmail' continua sendo o username (o que vai falhar no Supabase Auth,
              // mas não tem problema, pois cairemos no 'finally' com a msg genérica).
              console.warn(`Username ${loginInput} não encontrado para recuperação.`);
            }
          }

          // 2. Tenta enviar o e-mail de redefinição
          // Omitimos o redirectTo para usar o template padrão do Supabase
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail);

          if (resetError) {
             console.error('Erro ao solicitar redefinição de senha:', resetError.message);
          }

        } catch (error) {
          console.error('Erro inesperado na recuperação de senha:', error);
        
        } finally {
          // 3. SEMPRE mostra uma mensagem genérica por segurança (evitar enumeração de usuários)
          
          // Esconde o toast de 'processando' se ele existir
          // if (processingToast && processingToast.remove) { // <-- REMOVIDO
          //   processingToast.remove(); // <-- REMOVIDO
          // } // <-- REMOVIDO

          formRecuperarContainer.classList.remove('loading'); // <-- ESCONDE O LOADER

          showAppToast('Se uma conta existir para este usuário, um e-mail de recuperação foi enviado.');
          
          // Limpa o formulário e volta para o login
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
    // Esta função está aqui caso precisemos dela no futuro,
    // mas os listeners de submit já estão configurados acima.
  }
});


