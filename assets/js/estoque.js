/**
 * ORION PDV - Gerenciamento de Estoque
 * 
 * Este módulo implementa:
 * - Listagem de produtos em estoque
 * - Filtros e buscas
 * - Movimentações de estoque
 * - Ajustes de inventário
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
    
    // Elementos DOM - Abas
    const tabListagem = document.getElementById('tab-listagem');
    const tabMovimentacoes = document.getElementById('tab-movimentacoes');
    const tabScanner = document.getElementById('tab-scanner');
    
    const contentListagem = document.getElementById('content-listagem');
    const contentMovimentacoes = document.getElementById('content-movimentacoes');
    const contentScanner = document.getElementById('content-scanner');
    
    // Elementos DOM - Listagem
    const filtroGrupoSelect = document.getElementById('filtro-grupo');
    const buscaProdutoInput = document.getElementById('busca-produto');
    const tabelaProdutos = document.getElementById('tabela-produtos');
    const btnExportar = document.getElementById('btn-exportar');
    
    // Elementos DOM - Movimentações
    const tabelaMovimentacoes = document.getElementById('tabela-movimentacoes');
    const btnNovaMovimentacao = document.getElementById('btn-nova-movimentacao');
    
    // Elementos DOM - Modal de Estoque
    const modalEstoque = document.getElementById('modal-estoque');
    const btnCloseModal = document.querySelectorAll('.btn-close-modal');
    const formEstoque = document.getElementById('form-estoque');
    const produtoIdSelect = document.getElementById('produto-id');
    const tipoMovimentacaoSelect = document.getElementById('tipo-movimentacao');
    const quantidadeInput = document.getElementById('quantidade');
    const motivoSelect = document.getElementById('motivo');
    const outroMotivoContainer = document.getElementById('outro-motivo-container');
    const outroMotivoInput = document.getElementById('outro-motivo');
    const observacaoInput = document.getElementById('observacao');
    
    // Carregar dados iniciais
    carregarGrupos();
    carregarProdutos();
    carregarMovimentacoes();
    
    // Event Listeners - Abas
    tabListagem.addEventListener('click', function(e) {
        e.preventDefault();
        ativarAba('listagem');
    });
    
    tabMovimentacoes.addEventListener('click', function(e) {
        e.preventDefault();
        ativarAba('movimentacoes');
    });
    
    tabScanner.addEventListener('click', function(e) {
        e.preventDefault();
        ativarAba('scanner');
    });
    
    // Event Listeners - Listagem
    filtroGrupoSelect.addEventListener('change', carregarProdutos);
    buscaProdutoInput.addEventListener('input', carregarProdutos);
    
    btnExportar.addEventListener('click', function() {
        exportarProdutos();
    });
    
    // Event Listeners - Movimentações
    btnNovaMovimentacao.addEventListener('click', function() {
        abrirModalEstoque();
    });
    
    // Event Listeners - Modal de Estoque
    btnCloseModal.forEach(btn => {
        btn.addEventListener('click', function() {
            modalEstoque.style.display = 'none';
        });
    });
    
    motivoSelect.addEventListener('change', function() {
        outroMotivoContainer.style.display = this.value === 'outro' ? 'block' : 'none';
    });
    
    formEstoque.addEventListener('submit', function(e) {
        e.preventDefault();
        salvarMovimentacaoEstoque();
    });
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', function() {
        auth.fazerLogout();
        window.location.href = 'index.html';
    });
    
    // ========== FUNÇÕES ==========
    
    function ativarAba(aba) {
        // Desativar todas as abas
        tabListagem.classList.remove('active');
        tabListagem.style.color = 'var(--text-muted)';
        tabListagem.style.borderBottom = '2px solid transparent';
        
        tabMovimentacoes.classList.remove('active');
        tabMovimentacoes.style.color = 'var(--text-muted)';
        tabMovimentacoes.style.borderBottom = '2px solid transparent';
        
        tabScanner.classList.remove('active');
        tabScanner.style.color = 'var(--text-muted)';
        tabScanner.style.borderBottom = '2px solid transparent';
        
        // Ocultar todos os conteúdos
        contentListagem.style.display = 'none';
        contentMovimentacoes.style.display = 'none';
        contentScanner.style.display = 'none';
        
        // Ativar aba selecionada
        if (aba === 'listagem') {
            tabListagem.classList.add('active');
            tabListagem.style.color = 'var(--text-light)';
            tabListagem.style.borderBottom = '2px solid var(--primary)';
            contentListagem.style.display = 'block';
        } else if (aba === 'movimentacoes') {
            tabMovimentacoes.classList.add('active');
            tabMovimentacoes.style.color = 'var(--text-light)';
            tabMovimentacoes.style.borderBottom = '2px solid var(--primary)';
            contentMovimentacoes.style.display = 'block';
        } else if (aba === 'scanner') {
            tabScanner.classList.add('active');
            tabScanner.style.color = 'var(--text-light)';
            tabScanner.style.borderBottom = '2px solid var(--primary)';
            contentScanner.style.display = 'block';
        }
    }
    
    function carregarGrupos() {
        const grupos = db.getGruposProdutos();
        
        // Limpar select
        filtroGrupoSelect.innerHTML = '<option value="">Todos os Grupos</option>';
        
        // Adicionar grupos ao select
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo;
            option.textContent = grupo;
            filtroGrupoSelect.appendChild(option);
        });
    }
    
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
            
            // Determinar status de estoque
            let status = 'Adequado';
            let statusClass = '';
            
            if (produto.estoque <= 0) {
                status = 'Esgotado';
                statusClass = 'text-danger';
            } else if (produto.estoque <= produto.estoque_minimo) {
                status = 'Baixo';
                statusClass = 'text-warning';
            }
            
            tr.innerHTML = `
                <td>${produto.codigo_barras}</td>
                <td>${produto.nome}</td>
                <td>${produto.grupo || '-'}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td>
                    <span class="${produto.estoque <= 0 ? 'text-danger' : produto.estoque <= produto.estoque_minimo ? 'text-warning' : ''}">
                        ${produto.estoque}
                    </span>
                </td>
                <td>${produto.estoque_minimo}</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>
                    <button class="btn btn-outline-primary btn-sm btn-add-estoque" data-id="${produto.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-outline-info btn-sm btn-view-produto" data-id="${produto.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        // Adicionar eventos aos botões
        document.querySelectorAll('.btn-add-estoque').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                abrirModalEstoque(id);
            });
        });
        
        document.querySelectorAll('.btn-view-produto').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                window.location.href = `produto.html?id=${id}`;
            });
        });
    }
    
    function carregarMovimentacoes() {
        const movimentacoes = db.getMovimentacoesEstoque();
        const tbody = tabelaMovimentacoes.querySelector('tbody');
        
        // Limpar tabela
        tbody.innerHTML = '';
        
        // Ordenar movimentações por data (mais recentes primeiro)
        const movimentacoesOrdenadas = [...movimentacoes].sort((a, b) => {
            return new Date(b.data) - new Date(a.data);
        });
        
        // Adicionar movimentações à tabela
        movimentacoesOrdenadas.forEach(mov => {
            const tr = document.createElement('tr');
            
            // Formatar data
            const data = new Date(mov.data);
            const dataFormatada = data.toLocaleDateString('pt-BR') + ' ' + 
                                  data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Classe do tipo
            let tipoClass = '';
            if (mov.tipo === 'entrada') {
                tipoClass = 'text-success';
            } else if (mov.tipo === 'saida') {
                tipoClass = 'text-danger';
            }
            
            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${mov.produto_nome}</td>
                <td><span class="${tipoClass}">${mov.tipo === 'entrada' ? 'Entrada' : mov.tipo === 'saida' ? 'Saída' : 'Ajuste'}</span></td>
                <td>${mov.quantidade}</td>
                <td>${mov.motivo}</td>
                <td>${mov.usuario}</td>
            `;
            
            tbody.appendChild(tr);
        });
    }
    
    function exportarProdutos() {
        try {
            // Obter produtos
            const produtos = db.getProdutos();
            
            // Transformar para formato de tabela
            const dados = Object.values(produtos).map(produto => ({
                ID: produto.id,
                'Código de Barras': produto.codigo_barras,
                Nome: produto.nome,
                Grupo: produto.grupo || '',
                Marca: produto.marca || '',
                'Preço': produto.preco.toFixed(2),
                Estoque: produto.estoque,
                'Estoque Mínimo': produto.estoque_minimo,
                'Data de Cadastro': new Date(produto.data_cadastro).toLocaleDateString('pt-BR'),
                'URL da Foto': produto.foto || ''
            }));
            
            // Exportar para CSV
            const nomeArquivo = `produtos_${new Date().toISOString().split('T')[0]}.csv`;
            db.exportarCSV(dados, nomeArquivo);
            
            // Mensagem de sucesso
            exibirMensagem('Produtos exportados com sucesso', 'success');
        } catch (erro) {
            exibirMensagem('Erro ao exportar produtos: ' + erro, 'error');
        }
    }
    
    function abrirModalEstoque(produtoId) {
        // Carregar produtos para o select
        carregarProdutosSelect();
        
        // Se temos um ID de produto, selecionar no select
        if (produtoId) {
            produtoIdSelect.value = produtoId;
        }
        
        // Resetar formulário
        tipoMovimentacaoSelect.selectedIndex = 0;
        quantidadeInput.value = '1';
        motivoSelect.selectedIndex = 0;
        outroMotivoInput.value = '';
        observacaoInput.value = '';
        outroMotivoContainer.style.display = 'none';
        
        // Exibir modal
        modalEstoque.style.display = 'flex';
    }
    
    function carregarProdutosSelect() {
        const produtos = db.getProdutos();
        
        // Limpar select
        produtoIdSelect.innerHTML = '<option value="">Selecione um produto...</option>';
        
        // Ordenar produtos por nome
        const produtosOrdenados = Object.values(produtos).sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adicionar produtos ao select
        produtosOrdenados.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} (${produto.codigo_barras}) - Estoque: ${produto.estoque}`;
            produtoIdSelect.appendChild(option);
        });
    }
    
    function salvarMovimentacaoEstoque() {
        // Validar formulário
        const produtoId = produtoIdSelect.value;
        
        if (!produtoId) {
            exibirMensagem('Selecione um produto', 'error');
            return;
        }
        
        const quantidade = parseInt(quantidadeInput.value);
        
        if (isNaN(quantidade) || quantidade <= 0) {
            exibirMensagem('Quantidade inválida', 'error');
            return;
        }
        
        // Obter produto
        const produto = db.getProduto(produtoId);
        
        // Verificar tipo de movimentação
        const tipo = tipoMovimentacaoSelect.value;
        
        // Para saídas, verificar se há estoque suficiente
        if (tipo === 'saida' && quantidade > produto.estoque) {
            exibirMensagem(`Estoque insuficiente. Disponível: ${produto.estoque}`, 'error');
            return;
        }
        
        // Obter motivo
        let motivo = motivoSelect.value;
        
        // Se for "outro", usar o texto informado
        if (motivo === 'outro') {
            motivo = outroMotivoInput.value.trim();
            
            if (!motivo) {
                exibirMensagem('Informe o motivo', 'error');
                return;
            }
        }
        
        try {
            // Atualizar estoque
            let qtdAjuste = quantidade;
            
            if (tipo === 'saida') {
                qtdAjuste = -quantidade;
            } else if (tipo === 'ajuste') {
                // No ajuste, calculamos a diferença entre o valor atual e o desejado
                qtdAjuste = quantidade - produto.estoque;
            }
            
            // Registrar movimentação
            db.atualizarEstoqueProduto(produtoId, qtdAjuste, motivo);
            
            // Fechar modal
            modalEstoque.style.display = 'none';
            
            // Recarregar dados
            carregarProdutos();
            carregarMovimentacoes();
            
            // Mensagem de sucesso
            exibirMensagem('Movimentação registrada com sucesso', 'success');
        } catch (erro) {
            exibirMensagem('Erro ao registrar movimentação: ' + erro, 'error');
        }
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
