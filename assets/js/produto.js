/**
 * ORION PDV - Gerenciamento de Produtos
 * 
 * Este módulo implementa:
 * - Listagem de produtos
 * - Cadastro de novos produtos
 * - Edição de produtos existentes
 * - Filtros e buscas
 * - Gerenciamento de grupos e marcas
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    if (!auth.verificarAutenticacao()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Dados do usuário
    const user = auth.getUsuarioAtual();
    document.getElementById('user-name').textContent = user.nome;
    
    // Data atual
    const dataAtual = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = dataAtual.toLocaleDateString('pt-BR', options);
    
    // Elementos DOM
    const buscaProdutoInput = document.getElementById('busca-produto');
    const filtroGrupoSelect = document.getElementById('filtro-grupo');
    const tabelaProdutos = document.getElementById('tabela-produtos');
    const formProduto = document.getElementById('form-produto');
    const produtoIdInput = document.getElementById('produto-id');
    const codigoBarrasInput = document.getElementById('codigo-barras');
    const nomeInput = document.getElementById('nome');
    const grupoSelect = document.getElementById('grupo');
    const marcaSelect = document.getElementById('marca');
    const precoInput = document.getElementById('preco');
    const estoqueInput = document.getElementById('estoque');
    const estoqueMinimoInput = document.getElementById('estoque-minimo');
    const fotoInput = document.getElementById('foto');
    const btnNovoGrupo = document.getElementById('btn-novo-grupo');
    const btnNovaMarca = document.getElementById('btn-nova-marca');
    const btnNovoProduto = document.getElementById('btn-novo-produto');
    const btnCancelar = document.getElementById('btn-cancelar');
    const formTitulo = document.getElementById('form-titulo');
    
    // Modal
    const modalAdicionar = document.getElementById('modal-adicionar');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalLabel = document.getElementById('modal-label');
    const formModal = document.getElementById('form-modal');
    const novoItemInput = document.getElementById('novo-item');
    const btnCloseModal = document.querySelectorAll('.btn-close-modal');
    
    // Variáveis de controle
    let modoEdicao = false;
    let tipoModal = '';
    
    // Carregar dados iniciais
    carregarProdutos();
    carregarGrupos();
    carregarMarcas();
    
    // Event Listeners
    buscaProdutoInput.addEventListener('input', carregarProdutos);
    filtroGrupoSelect.addEventListener('change', carregarProdutos);
    
    formProduto.addEventListener('submit', salvarProduto);
    btnNovoProduto.addEventListener('click', novoProduto);
    btnCancelar.addEventListener('click', cancelarFormulario);
    
    btnNovoGrupo.addEventListener('click', function() {
        abrirModal('grupo');
    });
    
    btnNovaMarca.addEventListener('click', function() {
        abrirModal('marca');
    });
    
    // Fechar modal
    btnCloseModal.forEach(btn => {
        btn.addEventListener('click', function() {
            modalAdicionar.style.display = 'none';
        });
    });
    
    // Enviar formulário do modal
    formModal.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const novoItem = novoItemInput.value.trim();
        
        if (!novoItem) {
            alert('Por favor, informe um nome');
            return;
        }
        
        if (tipoModal === 'grupo') {
            // Adicionar novo grupo
            adicionarGrupo(novoItem);
        } else if (tipoModal === 'marca') {
            // Adicionar nova marca
            adicionarMarca(novoItem);
        }
        
        // Fechar modal
        modalAdicionar.style.display = 'none';
        
        // Limpar formulário
        formModal.reset();
    });
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', function() {
        auth.fazerLogout();
        window.location.href = 'index.html';
    });
    
    // Verificar se temos um ID na URL (para edição)
    const urlParams = new URLSearchParams(window.location.search);
    const produtoId = urlParams.get('id');
    
    if (produtoId) {
        // Editar produto existente
        editarProduto(produtoId);
    }
    
    // ========== FUNÇÕES ==========
    
    function carregarProdutos() {
        const produtos = db.getProdutos();
        const tbody = tabelaProdutos.querySelector('tbody');
        
        // Limpar tabela
        tbody.innerHTML = '';
        
        // Filtros
        const termoBusca = buscaProdutoInput.value.toLowerCase();
        const grupoFiltro = filtroGrupoSelect.value;
        
        // Ordenar produtos por nome
        const produtosOrdenados = Object.values(produtos).sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Filtrar produtos
        const produtosFiltrados = produtosOrdenados.filter(produto => {
            // Filtro de busca
            const matchBusca = termoBusca === '' || 
                produto.nome.toLowerCase().includes(termoBusca) || 
                produto.codigo_barras.toLowerCase().includes(termoBusca);
            
            // Filtro de grupo
            const matchGrupo = grupoFiltro === '' || produto.grupo === grupoFiltro;
            
            return matchBusca && matchGrupo;
        });
        
        // Adicionar produtos à tabela
        produtosFiltrados.forEach(produto => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${produto.codigo_barras}</td>
                <td>${produto.nome}</td>
                <td>${produto.grupo || '-'}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td>
                    <span class="${produto.estoque <= (produto.estoque_minimo || 0) ? 'text-danger' : ''}">
                        ${produto.estoque}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline-primary btn-sm btn-editar" data-id="${produto.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm btn-excluir" data-id="${produto.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        // Adicionar eventos aos botões
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editarProduto(id);
            });
        });
        
        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                excluirProduto(id);
            });
        });
    }
    
    function carregarGrupos() {
        const grupos = db.getGruposProdutos();
        
        // Limpar selectss
        filtroGrupoSelect.innerHTML = '<option value="">Todos os Grupos</option>';
        grupoSelect.innerHTML = '<option value="">Selecione...</option>';
        
        // Adicionar grupos aos selects
        grupos.forEach(grupo => {
            // Adicionar ao filtro
            const optionFiltro = document.createElement('option');
            optionFiltro.value = grupo;
            optionFiltro.textContent = grupo;
            filtroGrupoSelect.appendChild(optionFiltro);
            
            // Adicionar ao formulário
            const optionForm = document.createElement('option');
            optionForm.value = grupo;
            optionForm.textContent = grupo;
            grupoSelect.appendChild(optionForm);
        });
    }
    
    function carregarMarcas() {
        const marcas = db.getMarcasProdutos();
        
        // Limpar select
        marcaSelect.innerHTML = '<option value="">Selecione...</option>';
        
        // Adicionar marcas ao select
        marcas.forEach(marca => {
            const option = document.createElement('option');
            option.value = marca;
            option.textContent = marca;
            marcaSelect.appendChild(option);
        });
    }
    
    function novoProduto() {
        // Limpar formulário
        formProduto.reset();
        produtoIdInput.value = '';
        
        // Configurar modo
        modoEdicao = false;
        formTitulo.textContent = 'Novo Produto';
    }
    
    function editarProduto(id) {
        const produto = db.getProduto(id);
        
        if (produto) {
            // Preencher formulário
            produtoIdInput.value = produto.id;
            codigoBarrasInput.value = produto.codigo_barras;
            nomeInput.value = produto.nome;
            
            // Selecionar grupo se existir, ou adicionar se não existir
            if (produto.grupo) {
                // Verificar se o grupo já existe no select
                let grupoExiste = false;
                for (let i = 0; i < grupoSelect.options.length; i++) {
                    if (grupoSelect.options[i].value === produto.grupo) {
                        grupoExiste = true;
                        grupoSelect.selectedIndex = i;
                        break;
                    }
                }
                
                // Se não existe, adicionar
                if (!grupoExiste) {
                    const option = document.createElement('option');
                    option.value = produto.grupo;
                    option.textContent = produto.grupo;
                    grupoSelect.appendChild(option);
                    option.selected = true;
                }
            } else {
                grupoSelect.selectedIndex = 0;
            }
            
            // Selecionar marca se existir, ou adicionar se não existir
            if (produto.marca) {
                // Verificar se a marca já existe no select
                let marcaExiste = false;
                for (let i = 0; i < marcaSelect.options.length; i++) {
                    if (marcaSelect.options[i].value === produto.marca) {
                        marcaExiste = true;
                        marcaSelect.selectedIndex = i;
                        break;
                    }
                }
                
                // Se não existe, adicionar
                if (!marcaExiste) {
                    const option = document.createElement('option');
                    option.value = produto.marca;
                    option.textContent = produto.marca;
                    marcaSelect.appendChild(option);
                    option.selected = true;
                }
            } else {
                marcaSelect.selectedIndex = 0;
            }
            
            precoInput.value = produto.preco;
            estoqueInput.value = produto.estoque;
            estoqueMinimoInput.value = produto.estoque_minimo;
            fotoInput.value = produto.foto || '';
            
            // Configurar modo
            modoEdicao = true;
            formTitulo.textContent = 'Editar Produto';
        }
    }
    
    function excluirProduto(id) {
        const produto = db.getProduto(id);
        
        if (produto) {
            const confirmar = confirm(`Deseja realmente excluir o produto "${produto.nome}"?`);
            
            if (confirmar) {
                try {
                    // Excluir produto
                    db.deletarProduto(id);
                    
                    // Recarregar lista
                    carregarProdutos();
                    
                    // Exibir mensagem
                    exibirMensagem('Produto excluído com sucesso', 'success');
                } catch (erro) {
                    exibirMensagem('Erro ao excluir produto: ' + erro, 'error');
                }
            }
        }
    }
    
    function salvarProduto(e) {
        e.preventDefault();
        
        // Validar formulário
        if (!codigoBarrasInput.value.trim()) {
            exibirMensagem('Código de barras é obrigatório', 'error');
            return;
        }
        
        if (!nomeInput.value.trim()) {
            exibirMensagem('Nome do produto é obrigatório', 'error');
            return;
        }
        
        if (!precoInput.value || parseFloat(precoInput.value) <= 0) {
            exibirMensagem('Preço deve ser maior que zero', 'error');
            return;
        }
        
        // Obter dados do formulário
        const produto = {
            id: produtoIdInput.value,
            codigo_barras: codigoBarrasInput.value.trim(),
            nome: nomeInput.value.trim(),
            grupo: grupoSelect.value,
            marca: marcaSelect.value,
            preco: parseFloat(precoInput.value),
            estoque: parseInt(estoqueInput.value) || 0,
            estoque_minimo: parseInt(estoqueMinimoInput.value) || 0,
            foto: fotoInput.value.trim()
        };
        
        try {
            // Salvar produto
            db.salvarProduto(produto);
            
            // Recarregar dados
            carregarProdutos();
            carregarGrupos();
            carregarMarcas();
            
            // Exibir mensagem
            exibirMensagem('Produto salvo com sucesso', 'success');
            
            // Limpar formulário
            formProduto.reset();
            produtoIdInput.value = '';
            
            // Resetar modo
            modoEdicao = false;
            formTitulo.textContent = 'Novo Produto';
        } catch (erro) {
            exibirMensagem('Erro ao salvar produto: ' + erro, 'error');
        }
    }
    
    function cancelarFormulario() {
        // Limpar formulário
        formProduto.reset();
        produtoIdInput.value = '';
        
        // Resetar modo
        modoEdicao = false;
        formTitulo.textContent = 'Novo Produto';
    }
    
    function abrirModal(tipo) {
        // Configurar modal
        tipoModal = tipo;
        
        if (tipo === 'grupo') {
            modalTitulo.textContent = 'Novo Grupo';
            modalLabel.textContent = 'Nome do Grupo';
        } else if (tipo === 'marca') {
            modalTitulo.textContent = 'Nova Marca';
            modalLabel.textContent = 'Nome da Marca';
        }
        
        // Exibir modal
        modalAdicionar.style.display = 'flex';
        
        // Focar no input
        novoItemInput.focus();
    }
    
    function adicionarGrupo(nomeGrupo) {
        // Verificar se já existe
        const grupos = db.getGruposProdutos();
        
        if (grupos.includes(nomeGrupo)) {
            exibirMensagem('Este grupo já existe', 'warning');
            return;
        }
        
        // Adicionar ao select
        const option = document.createElement('option');
        option.value = nomeGrupo;
        option.textContent = nomeGrupo;
        grupoSelect.appendChild(option);
        option.selected = true;
        
        // Adicionar ao filtro
        const optionFiltro = document.createElement('option');
        optionFiltro.value = nomeGrupo;
        optionFiltro.textContent = nomeGrupo;
        filtroGrupoSelect.appendChild(optionFiltro);
        
        // Exibir mensagem
        exibirMensagem('Grupo adicionado com sucesso', 'success');
    }
    
    function adicionarMarca(nomeMarca) {
        // Verificar se já existe
        const marcas = db.getMarcasProdutos();
        
        if (marcas.includes(nomeMarca)) {
            exibirMensagem('Esta marca já existe', 'warning');
            return;
        }
        
        // Adicionar ao select
        const option = document.createElement('option');
        option.value = nomeMarca;
        option.textContent = nomeMarca;
        marcaSelect.appendChild(option);
        option.selected = true;
        
        // Exibir mensagem
        exibirMensagem('Marca adicionada com sucesso', 'success');
    }
    
    function exibirMensagem(mensagem, tipo) {
        // Criar toast
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${tipo}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'warning' ? 'exclamation-circle' : 'times-circle'}"></i>
                <span>${mensagem}</span>
            </div>
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(toast);
        
        // Exibir com animação
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remover após 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
});
