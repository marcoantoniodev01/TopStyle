/* assets/js/header-control.js */

document.addEventListener('DOMContentLoaded', () => {
    initHeaderLinksControl();
});

async function initHeaderLinksControl() {
    const supabase = await window.initSupabaseClient();
    
    // 1. Busca todos os links configurados no banco
    const { data: dbLinks, error } = await supabase
        .from('nav_links')
        .select('*');

    if (error) {
        console.error('Erro ao carregar links:', error);
        return;
    }

    // Cria mapa: { 'vestuario-camisetas': 'url...' }
    const linkMap = {};
    if (dbLinks) {
        dbLinks.forEach(item => {
            linkMap[item.link_id] = item.href;
        });
    }

    // --- MODIFICAÇÃO COMEÇA AQUI ---

    // 2. Seleciona TODOS os links que possuem o data-link-id (tanto no header real quanto no painel admin)
    // A query 'a[data-link-id]' selecionará os links no <header> e os links no #controle-header
    const allLinks = document.querySelectorAll('a[data-link-id]');

    allLinks.forEach(a => {
        const id = a.dataset.linkId;
        
        // Se já existe no banco, atualiza o href de TODOS os links encontrados
        if (linkMap[id]) {
            a.href = linkMap[id];
        } else {
            // Se não está no banco, garante que o href é '#' ou o que você desejar
            if (a.href === '') { // Evita erro se o href estiver vazio no HTML
                a.href = '#';
            }
        }

        // 3. Gerencia apenas a APARÊNCIA e EVENTO de CLIQUE para o painel de ADMIN
        // Verifica se o link TEM a classe 'admin-link-item' antes de adicionar a lógica de controle
        if (a.classList.contains('admin-link-item')) {
            // Se já existe no banco, mostra visualmente e atualiza o tooltip (APENAS links ADMIN)
            if (linkMap[id]) {
                a.classList.add('link-configured'); // Fica verde (definido no CSS)
                a.title = `Destino atual: ${linkMap[id]}`;
            } else {
                a.title = "Clique para configurar";
            }

            // Adiciona evento de clique para abrir o Modal (APENAS links ADMIN)
            a.addEventListener('click', (e) => {
                e.preventDefault();
                // Pega o href atual do banco ou usa '#' como padrão
                const currentHref = linkMap[id] || '';
                openEditLinkModal(id, currentHref);
            });
        }
    });
}

// --- MODAL DE EDIÇÃO ---
// ... O restante da função openEditLinkModal permanece inalterado.
// A linha 'initHeaderLinksControl(); // Recarrega para pintar de verde' no final
// da função salvar garantirá que os links do menu principal sejam atualizados após o salvamento.
// ...
// [Função openEditLinkModal completa]
function openEditLinkModal(linkId, currentHref) {
    let modal = document.getElementById('link-edit-modal');
    
    // Cria o modal se não existir
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'link-edit-modal';
        modal.className = 'modal'; 
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <h3 style="margin-bottom:15px;">Editar Link: <span id="lem-display-name" style="color:#000; font-weight:bold;"></span></h3>
                <p style="font-size:12px; color:#666; margin-bottom:10px;">ID Interno: <span id="lem-id"></span></p>
                
                <label>Link de Destino:</label>
                <input type="text" id="lem-href" placeholder="Ex: categoria.html?categoria=vestuario&tipo=camiseta" style="width:100%; margin-bottom:10px; padding:10px; border:1px solid #ddd; border-radius:4px;">
                
                <div style="background:#f9f9f9; padding:10px; border-radius:4px; font-size:12px; margin-bottom:15px;">
                    <strong>Dicas de URL:</strong><br>
                    • Ver Todos: <code>categoria.html?categoria=vestuario</code><br>
                    • Sub-item: <code>categoria.html?categoria=vestuario&tipo=camiseta</code>
                </div>

                <div style="text-align:right; gap:10px; display:flex; justify-content:end;">
                    <button id="lem-cancel" style="padding:8px 15px; cursor:pointer;">Cancelar</button>
                    <button id="lem-save" style="background:#000; color:#fff; padding:8px 15px; border:none; cursor:pointer;">Salvar Alterações</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('#lem-cancel').onclick = () => modal.style.display = 'none';
        
        modal.querySelector('#lem-save').onclick = async () => {
            const id = modal.dataset.activeId;
            const newHref = document.querySelector('#lem-href').value;
            
            if(!newHref) return alert("Por favor, digite um link.");

            const btn = modal.querySelector('#lem-save');
            btn.innerText = "Salvando...";

            const supabase = await window.initSupabaseClient();
            
            // Verifica se já existe para fazer Update ou Insert
            const { data: existing } = await supabase.from('nav_links').select('id').eq('link_id', id).maybeSingle();

            let result;
            if (existing) {
                result = await supabase.from('nav_links').update({ href: newHref }).eq('link_id', id);
            } else {
                result = await supabase.from('nav_links').insert({ link_id: id, href: newHref });
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
            } else {
                alert('Link atualizado com sucesso!');
                modal.style.display = 'none';
                initHeaderLinksControl(); // Recarrega para pintar de verde E ATUALIZAR TODOS OS LINKS
            }
            btn.innerText = "Salvar Alterações";
        };
    }

    // Preenche os dados no modal
    modal.dataset.activeId = linkId;
    document.getElementById('lem-id').innerText = linkId;
    
    // Formata o nome para ficar bonito no título (ex: vestuario-camisetas -> Vestuario Camisetas)
    const displayName = linkId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    document.getElementById('lem-display-name').innerText = displayName;

    document.getElementById('lem-href').value = currentHref;
    
    // Mostra o modal (precisa ter CSS de modal global ou inline style de display flex)
    modal.style.display = 'flex';
}