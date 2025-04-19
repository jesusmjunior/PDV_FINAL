/**
 * ORION PDV - Módulo de Gerenciamento de Estoque
 * Versão 2.0 (2025)
 * 
 * Este módulo implementa:
 * - Controle de estoque baseado em códigos de barras
 * - Registro de movimentações (entradas, saídas e ajustes)
 * - Relatórios de produtos críticos (sem estoque ou abaixo do mínimo)
 * - Histórico completo de movimentações
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    if (!auth.verificarAutenticacao()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Elementos DOM
    const elementos = {
        // Elementos de usuário
        userNameEl: document.getElementById('user-name'),
        userRoleEl: document.getElementById('user-role'),
        currentDateEl: document.getElementById('current-date'),
        
        // Estatísticas
        totalProdutosEl: document.getElementById('total-produtos'),
        totalItensEl: document.getElementById('total-itens'),
        estoqueBaixoEl: document.getElementById('estoque-baixo'),
        semEstoqueEl: document.getElementById('sem-estoque'),
        
        // Movimentação de estoque
        formMovimentacao: document.getElementById('form-movimentacao'),
        codigoBarrasMovimentacaoInput: document.getElementById('codigo-barras-movimentacao'),
        btnBuscarProduto: document.getElementById('btn-buscar-produto'),
        produtoInfo: document.getElementById('produto-info'),
        produtoNomeInfo: document.getElementById('produto-nome-info'),
        produtoEstoqueInfo: document.getElementById('produto-estoque-info'),
        tipoMovimentacaoSelect: document.getElementById('tipo-movimentacao'),
        quantidadeMovimentacaoInput: document.getElementById('quantidade-movimentacao'),
        motivoMovimentacaoSelect: document.getElementById('motivo-movimentacao'),
        outroMotivoGrupo: document.getElementById('grupo-outro-motivo'),
        outroMotivoInput: document.getElementById('outro-motivo'),
        observacaoMovimentacaoInput: document.getElementById('observacao-movimentacao'),
        btnRegistrarMovimentacao: document.getElementById('btn-registrar-movimentacao'),
        
        // Histórico de movimentações
        btnFiltroHistorico: document.getElementById('btn-filtro-historico'),
        filtrosHistorico: document.getElementById('filtros-historico'),
        filtroTipoSelect: document.getElementById('filtro-tipo'),
        filtroDataInicioInput: document.getElementById('filtro-data-inicio'),
        filtroDataFimInput: document.getElementById('filtro-data-fim'),
        btnAplicarFiltro: document.getElementById('btn-aplicar-filtro'),
        btnLimparFiltro: document.getElementById('btn-limpar-filtro'),
        tabelaMovimentacoes: document.getElementById('tabela-movimentacoes'),
        paginacaoHistorico: document.getElementById('paginacao-historico'),
        
        // Produtos críticos
        filtroCriticoSelect: document.getElementById('filtro-critico'),
        tabelaCriticos: document.getElementById('tabela-criticos'),
        paginacaoCriticos: document.getElementById('paginacao-criticos'),
        
        // Modais
        modalDetalhes: document.getElementById('modal-detalhes'),
        detalhesMovimentacao: document.getElementById('detalhes-movimentacao'),
        modalConfirmacao: document.getElementById('modal-confirmacao'),
        confirmacaoMensagem: document.getElementById('confirmacao-mensagem'),
        btnConfirmar: document.getElementById('btn-confirmar')
    };
    
    // Estado da aplicação
    const estado = {
        // Produto atual na movimentação
        produtoAtual: null,
        
        // Paginação de histórico
        paginaHistorico: 1,
        itensPorPaginaHistorico: 10,
        movimentacoes: [],
        movimentacoesFiltradas: [],
        
        // Filtros de histórico
        filtros: {
            tipo: '',
            dataInicio: null,
            dataFim: null
        },
        
        // Paginação de produtos críticos
        paginaCriticos: 1,
        itensPorPaginaCriticos: 10,
        produtosCriticos: [],
        produtosCriticosFiltrados: [],
        
        // Filtro de produtos críticos
        filtroCritico: 'todos',
        
        // Movimentação para confirmar
        movimentacaoParaConfirmar: null,
        
        // Flags de carregamento
        carregandoEstatisticas: false,
        carregandoMovimentacoes: false,
        carregandoCriticos: false
    };
    
    // Inicializar
    iniciar();
    
    /**
     * Inicializa a aplicação
     */
    function iniciar() {
        // Carregar dados do usuário
        carregarDadosUsuario();
        
        // Carregar dados iniciais
        carregarEstatisticas();
        carregarMovimentacoes();
        carregarProdutosCriticos();
        
        // Configurar eventos
        configurarEventos();
    }
    
    /**
     * Carrega dados do usuário
     */
    function carregarDadosUsuario() {
        // Dados do usuário
        const user = auth.getUsuarioAtual();
        if (user) {
            elementos.userNameEl.textContent = user.nome;
            elementos.userRoleEl.textContent = user.perfil === 'admin' ? 'Administrador' : 
                                             user.perfil === 'supervisor' ? 'Supervisor' : 'Vendedor';
        }
        
        // Data atual
        const dataAtual = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elementos.currentDateEl.textContent = dataAtual.toLocaleDateString('pt-BR', options);
    }
    
    /**
     * Configura eventos da aplicação
     */
    function configurarEventos() {
        // Form de movimentação
        elementos.formMovimentacao.addEventListener('submit', registrarMovimentacao);
        elementos.btnBuscarProduto.addEventListener('click', buscarProduto);
        
        // Buscar produto ao pressionar Enter
        elementos.codigoBarrasMovimentacaoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarProduto();
            }
        });
        
        // Tipo de movimentação
        elementos.tipoMovimentacaoSelect.addEventListener('change', function() {
            // Ajustar texto da quantidade conforme tipo
            const tipo = this.value;
            
            if (tipo === 'saida' && estado.produtoAtual) {
                // No caso de saída, limitar ao estoque disponível
                elementos.quantidadeMovimentacaoInput.max = estado.produtoAtual.estoque;
            } else {
                // Para entrada ou ajuste, não limitar
                elementos.quantidadeMovimentacaoInput.removeAttribute('max');
            }
        });
        
        // Motivo outro
        elementos.motivoMovimentacaoSelect.addEventListener('change', function() {
            elementos.outroMotivoGrupo.style.display = 
                this.value === 'outro' ? 'block' : 'none';
        });
        
        // Filtros de histórico
        elementos.btnFiltroHistorico.addEventListener('click', function() {
            elementos.filtrosHistorico.style.display = 
                elementos.filtrosHistorico.style.display === 'none' ? 'block' : 'none';
        });
        
        elementos.btnAplicarFiltro.addEventListener('click', aplicarFiltros);
        elementos.btnLimparFiltro.addEventListener('click', limparFiltros);
        
        // Filtro de produtos críticos
        elementos.filtroCriticoSelect.addEventListener('change', function() {
            estado.filtroCritico = this.value;
            filtrarProdutosCriticos();
            renderizarTabelaCriticos();
        });
        
        // Fechar modais
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    fecharModal(modal);
                }
            });
        });
        
        // Logout
        document.getElementById('btn-logout').addEventListener('click', function() {
            auth.fazerLogout();
            window.location.href = 'index.html';
        });
    }
    
    /**
     * Carrega estatísticas de estoque
     */
    function carregarEstatisticas() {
        // Evitar múltiplas chamadas simultâneas
        if (estado.carregandoEstatisticas) return;
        estado.carregandoEstatisticas = true;
        
        try {
            // Obter estatísticas do relatório de estoque
            const relatorio = db.gerarRelatorioEstoque();
            
            // Exibir estatísticas
            elementos.totalProdutosEl.textContent = relatorio.totais.produtos;
            elementos.totalItensEl.textContent = relatorio.totais.itens_estoque.toLocaleString();
            elementos.estoqueBaixoEl.textContent = relatorio.resumo.estoque_baixo;
            elementos.semEstoqueEl.textContent = relatorio.resumo.sem_estoque;
            
            estado.carregandoEstatisticas = false;
        } catch (erro) {
            console.error('Erro ao carregar estatísticas:', erro);
            exibirMensagem('Erro ao carregar estatísticas de estoque', 'error');
            estado.carregandoEstatisticas = false;
        }
    }
    
    /**
     * Carrega histórico de movimentações
     */
    function carregarMovimentacoes() {
        // Evitar múltiplas chamadas simultâneas
        if (estado.carregandoMovimentacoes) return;
        estado.carregandoMovimentacoes = true;
        
        try {
            // Obter todas as movimentações
            const movimentacoes = db.getMovimentacoesEstoque();
            
            // Ordenar por data (mais recente primeiro)
            estado.movimentacoes = movimentacoes.sort((a, b) => 
                new Date(b.data) - new Date(a.data)
            );
            
            // Aplicar filtros
            aplicarFiltros();
            
            estado.carregandoMovimentacoes = false;
        } catch (erro) {
            console.error('Erro ao carregar movimentações:', erro);
            exibirMensagem('Erro ao carregar histórico de movimentações', 'error');
            estado.carregandoMovimentacoes = false;
            
            // Exibir mensagem de erro na tabela
            elementos.tabelaMovimentacoes.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle"></i> Erro ao carregar movimentações
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Carrega produtos com estoque crítico
     */
    function carregarProdutosCriticos() {
        // Evitar múltiplas chamadas simultâneas
        if (estado.carregandoCriticos) return;
        estado.carregandoCriticos = true;
        
        try {
            // Obter produtos com estoque zero ou abaixo do mínimo
            const produtos = db.getProdutos();
            
            // Filtrar produtos críticos
            estado.produtosCriticos = Object.values(produtos).filter(produto => 
                produto.estoque <= 0 || (produto.estoque_minimo && produto.estoque <= produto.estoque_minimo)
            );
            
            // Ordenar: primeiro os sem estoque, depois os com estoque baixo
            estado.produtosCriticos.sort((a, b) => {
                // Primeiro critério: sem estoque vem antes de estoque baixo
                if ((a.estoque <= 0) !== (b.estoque <= 0)) {
                    return a.estoque <= 0 ? -1 : 1;
                }
                // Segundo critério: ordenar por nome
                return a.nome.localeCompare(b.nome);
            });
            
            // Aplicar filtro inicial
            filtrarProdutosCriticos();
            
            estado.carregandoCriticos = false;
        } catch (erro) {
            console.error('Erro ao carregar produtos críticos:', erro);
            exibirMensagem('Erro ao carregar produtos com estoque crítico', 'error');
            estado.carregandoCriticos = false;
            
            // Exibir mensagem de erro na tabela
            elementos.tabelaCriticos.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle"></i> Erro ao carregar produtos
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Aplica filtros ao histórico de movimentações
     */
    function aplicarFiltros() {
        // Obter valores dos filtros
        estado.filtros.tipo = elementos.filtroTipoSelect.value;
        estado.filtros.dataInicio = elementos.filtroDataInicioInput.value ? 
            new Date(elementos.filtroDataInicioInput.value) : null;
        estado.filtros.dataFim = elementos.filtroDataFimInput.value ? 
            new Date(elementos.filtroDataFimInput.value) : null;
        
        // Se data fim for informada, ajustar para o final do dia
        if (estado.filtros.dataFim) {
            estado.filtros.dataFim.setHours(23, 59, 59, 999);
        }
        
        // Filtrar movimentações
        estado.movimentacoesFiltradas = estado.movimentacoes.filter(mov => {
            // Filtrar por tipo
            if (estado.filtros.tipo && mov.tipo !== estado.filtros.tipo) {
                return false;
            }
            
            // Filtrar por data início
            if (estado.filtros.dataInicio) {
                const dataMovimentacao = new Date(mov.data);
                if (dataMovimentacao < estado.filtros.dataInicio) {
                    return false;
                }
            }
            
            // Filtrar por data fim
            if (estado.filtros.dataFim) {
                const dataMovimentacao = new Date(mov.data);
                if (dataMovimentacao > estado.filtros.dataFim) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Reset da paginação
        estado.paginaHistorico = 1;
        
        // Renderizar tabela com os dados filtrados
        renderizarTabelaMovimentacoes();
    }
    
    /**
     * Limpa os filtros de movimentações
     */
    function limparFiltros() {
        // Limpar campos
        elementos.filtroTipoSelect.value = '';
        elementos.filtroDataInicioInput.value = '';
        elementos.filtroDataFimInput.value = '';
        
        // Limpar estado
        estado.filtros = {
            tipo: '',
            dataInicio: null,
            dataFim: null
        };
        
        // Aplicar filtros limpos
        aplicarFiltros();
    }
    
    /**
     * Filtra produtos críticos conforme seleção
     */
    function filtrarProdutosCriticos() {
        const filtro = estado.filtroCritico;
        
        if (filtro === 'todos') {
            estado.produtosCriticosFiltrados = [...estado.produtosCriticos];
        } else if (filtro === 'sem_estoque') {
            estado.produtosCriticosFiltrados = estado.produtosCriticos.filter(p => p.estoque <= 0);
        } else if (filtro === 'estoque_baixo') {
            estado.produtosCriticosFiltrados = estado.produtosCriticos.filter(p => 
                p.estoque > 0 && p.estoque <= p.estoque_minimo
            );
        }
        
        // Reset da paginação
        estado.paginaCriticos = 1;
    }
    
    /**
     * Renderiza a tabela de movimentações com paginação
     */
    function renderizarTabelaMovimentacoes() {
        // Calcular paginação
        const totalPaginas = Math.ceil(estado.movimentacoesFiltradas.length / estado.itensPorPaginaHistorico);
        const inicio = (estado.paginaHistorico - 1) * estado.itensPorPaginaHistorico;
        const fim = inicio + estado.itensPorPaginaHistorico;
        const movimentacoesPagina = estado.movimentacoesFiltradas.slice(inicio, fim);
        
        // Verificar se há movimentações para exibir
        if (movimentacoesPagina.length === 0) {
            elementos.tabelaMovimentacoes.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-info-circle"></i> Nenhuma movimentação encontrada
                    </td>
                </tr>
            `;
            elementos.paginacaoHistorico.innerHTML = '';
            return;
        }
        
        // Gerar linhas da tabela
        let html = '';
        movimentacoesPagina.forEach(mov => {
            // Formatar data
            const data = new Date(mov.data);
            const dataFormatada = data.toLocaleDateString('pt-BR');
            const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Determinar classe CSS baseada no tipo
            const classesTipo = {
                'entrada': 'text-success',
                'saida': 'text-danger',
                'ajuste': 'text-warning'
            };
            
            // Formatar tipo para exibição
            const tiposFormatados = {
                'entrada': 'Entrada',
                'saida': 'Saída',
                'ajuste': 'Ajuste'
            };
            
            html += `
                <tr data-id="${mov.id}" class="linha-movimentacao">
                    <td>${dataFormatada} ${horaFormatada}</td>
                    <td title="${mov.produto_codigo}">${mov.produto_nome}</td>
                    <td class="${classesTipo[mov.tipo] || ''}">
                        ${tiposFormatados[mov.tipo] || mov.tipo}
                    </td>
                    <td>${mov.quantidade}</td>
                    <td>${mov.estoque_anterior}</td>
                    <td>${mov.estoque_atual}</td>
                    <td>${mov.motivo}</td>
                </tr>
            `;
        });
        
        elementos.tabelaMovimentacoes.innerHTML = html;
        
        // Adicionar evento para exibir detalhes ao clicar
        document.querySelectorAll('.linha-movimentacao').forEach(linha => {
            linha.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                exibirDetalhesMovimentacao(id);
            });
        });
        
        // Renderizar paginação
        renderizarPaginacao(
            totalPaginas, 
            estado.paginaHistorico, 
            elementos.paginacaoHistorico, 
            (pagina) => {
                estado.paginaHistorico = pagina;
                renderizarTabelaMovimentacoes();
            }
        );
    }
    
    /**
     * Renderiza a tabela de produtos críticos com paginação
     */
    function renderizarTabelaCriticos() {
        // Calcular paginação
        const totalPaginas = Math.ceil(estado.produtosCriticosFiltrados.length / estado.itensPorPaginaCriticos);
        const inicio = (estado.paginaCriticos - 1) * estado.itensPorPaginaCriticos;
        const fim = inicio + estado.itensPorPaginaCriticos;
        const produtosPagina = estado.produtosCriticosFiltrados.slice(inicio, fim);
        
        // Verificar se há produtos para exibir
        if (produtosPagina.length === 0) {
            elementos.tabelaCriticos.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-info-circle"></i> Nenhum produto com estoque crítico encontrado
                    </td>
                </tr>
            `;
            elementos.paginacaoCriticos.innerHTML = '';
            return;
        }
        
        // Gerar linhas da tabela
        let html = '';
        produtosPagina.forEach(produto => {
            // Determinar status
            let status = '';
            let statusClasse = '';
            
            if (produto.estoque <= 0) {
                status = 'Sem estoque';
                statusClasse = 'text-danger';
            } else if (produto.estoque <= produto.estoque_minimo) {
                status = 'Estoque baixo';
                statusClasse = 'text-warning';
            }
            
            html += `
                <tr>
                    <td title="${produto.codigo_barras}">${formatarCodigoBarras(produto.codigo_barras)}</td>
                    <td>${produto.nome}</td>
                    <td>${produto.grupo || '-'}</td>
                    <td class="text-center">${produto.estoque}</td>
                    <td class="text-center">${produto.estoque_minimo || 0}</td>
                    <td class="${statusClasse}">${status}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-primary btn-estoque" data-codigo="${produto.codigo_barras}" title="Movimentar estoque">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <a href="produto.html?codigo=${produto.codigo_barras}" class="btn btn-sm btn-info" title="Editar produto">
                            <i class="fas fa-edit"></i>
                        </a>
                    </td>
                </tr>
            `;
        });
        
        elementos.tabelaCriticos.innerHTML = html;
        
        // Adicionar evento para movimentar estoque
        document.querySelectorAll('.btn-estoque').forEach(btn => {
            btn.addEventListener('click', function() {
                const codigo = this.getAttribute('data-codigo');
                elementos.codigoBarrasMovimentacaoInput.value = codigo;
                buscarProduto();
                // Rolar para o formulário
                elementos.formMovimentacao.scrollIntoView({ behavior: 'smooth' });
            });
        });
        
        // Renderizar paginação
        renderizarPaginacao(
            totalPaginas, 
            estado.paginaCriticos, 
            elementos.paginacaoCriticos, 
            (pagina) => {
                estado.paginaCriticos = pagina;
                renderizarTabelaCriticos();
            }
        );
    }
    
    /**
     * Renderiza controles de paginação
     */
    function renderizarPaginacao(totalPaginas, paginaAtual, elementoPaginacao, callback) {
        if (totalPaginas <= 1) {
            elementoPaginacao.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Botão anterior
        html += `
            <li class="page-item ${paginaAtual === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${paginaAtual - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Páginas
        for (let i = 1; i <= totalPaginas; i++) {
            if (totalPaginas > 7) {
                // Versão compacta para muitas páginas
                if (i === 1 || i === totalPaginas || 
                   (i >= paginaAtual - 1 && i <= paginaAtual + 1)) {
                    html += `
                        <li class="page-item ${paginaAtual === i ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                } else if (i === 2 || i === totalPaginas - 1) {
                    html += `
                        <li class="page-item disabled">
                            <span class="page-link">...</span>
                        </li>
                    `;
                }
            } else {
                // Versão completa para poucas páginas
                html += `
                    <li class="page-item ${paginaAtual === i ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }
        }
        
        // Botão próximo
        html += `
            <li class="page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${paginaAtual + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        elementoPaginacao.innerHTML = html;
        
        // Adicionar eventos aos links de paginação
        elementoPaginacao.querySelectorAll('.page-link[data-page]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const pagina = parseInt(this.getAttribute('data-page'));
                if (!isNaN(pagina) && pagina > 0) {
                    callback(pagina);
                }
            });
        });
    }
    
    /**
     * Busca produto por código de barras para movimentação
     */
    function buscarProduto() {
        const codigo = elementos.codigoBarrasMovimentacaoInput.value.trim();
        
        if (!codigo) {
            exibirMensagem('Informe o código de barras do produto', 'warning');
            return;
        }
        
        // Buscar produto
        try {
            const produto = db.getProduto(codigo);
            
            if (!produto) {
                exibirMensagem('Produto não encontrado', 'error');
                esconderInfoProduto();
                return;
            }
            
            // Guardar produto atual
            estado.produtoAtual = produto;
            
            // Exibir informações do produto
            elementos.produtoNomeInfo.textContent = produto.nome;
            elementos.produtoEstoqueInfo.textContent = produto.estoque;
            elementos.produtoInfo.style.display = 'block';
            
            // Habilitar botão de registrar
            elementos.btnRegistrarMovimentacao.disabled = false;
            
            // Ajustar quantidade máxima conforme tipo de movimentação
            if (elementos.tipoMovimentacaoSelect.value === 'saida') {
                elementos.quantidadeMovimentacaoInput.max = produto.estoque;
            } else {
                elementos.quantidadeMovimentacaoInput.removeAttribute('max');
            }
            
            // Focar no campo de quantidade
            elementos.quantidadeMovimentacaoInput.focus();
        } catch (erro) {
            console.error('Erro ao buscar produto:', erro);
            exibirMensagem('Erro ao buscar produto: ' + erro.message, 'error');
            esconderInfoProduto();
        }
    }
    
    /**
     * Esconde informações do produto
     */
    function esconderInfoProduto() {
        elementos.produtoInfo.style.display = 'none';
        estado.produtoAtual = null;
        elementos.btnRegistrarMovimentacao.disabled = true;
    }
    
    /**
     * Registra uma movimentação de estoque
     */
    function registrarMovimentacao(e) {
        e.preventDefault();
        
        try {
            // Verificar se há produto selecionado
            if (!estado.produtoAtual) {
                throw new Error('Nenhum produto selecionado');
            }
            
            // Obter dados do formulário
            const tipo = elementos.tipoMovimentacaoSelect.value;
            const quantidade = parseInt(elementos.quantidadeMovimentacaoInput.value);
            let motivo = elementos.motivoMovimentacaoSelect.value;
            
            // Validar quantidade
            if (isNaN(quantidade) || quantidade <= 0) {
                throw new Error('Quantidade inválida');
            }
            
            // Verificar estoque para saída
            if (tipo === 'saida' && quantidade > estado.produtoAtual.estoque) {
                throw new Error(`Quantidade maior que o estoque disponível (${estado.produtoAtual.estoque})`);
            }
            
            // Tratar motivo "outro"
            if (motivo === 'outro') {
                const outroMotivo = elementos.outroMotivoInput.value.trim();
                if (!outroMotivo) {
                    throw new Error('Informe o motivo da movimentação');
                }
                motivo = outroMotivo;
            }
            
            // Criar dados da movimentação para confirmar
            const movimentacao = {
                produto: estado.produtoAtual,
                tipo: tipo,
                quantidade: quantidade,
                motivo: motivo,
                observacao: elementos.observacaoMovimentacaoInput.value.trim()
            };
            
            // Guardar movimentação para confirmação
            estado.movimentacaoParaConfirmar = movimentacao;
            
            // Exibir confirmação
            confirmarMovimentacao();
        } catch (erro) {
            console.error('Erro ao registrar movimentação:', erro);
            exibirMensagem('Erro: ' + erro.message, 'error');
        }
    }
    
    /**
     * Exibe confirmação da movimentação
     */
    function confirmarMovimentacao() {
        if (!estado.movimentacaoParaConfirmar) return;
        
        const mov = estado.movimentacaoParaConfirmar;
        
        // Formatar tipo para exibição
        const tiposFormatados = {
            'entrada': 'Entrada',
            'saida': 'Saída',
            'ajuste': 'Ajuste'
        };
        
        // Configurar mensagem de confirmação
        let mensagem = `
            <p>Confirma a ${tiposFormatados[mov.tipo]} de <strong>${mov.quantidade}</strong> 
            unidades do produto <strong>${mov.produto.nome}</strong>?</p>
            
            <div class="mb-3">
                <strong>Tipo:</strong> ${tiposFormatados[mov.tipo]}<br>
                <strong>Motivo:</strong> ${mov.motivo}<br>
                <strong>Estoque atual:</strong> ${mov.produto.estoque}<br>
                <strong>Estoque após movimentação:</strong> 
        `;
        
        // Calcular novo estoque
        let novoEstoque;
        if (mov.tipo === 'entrada') {
            novoEstoque = mov.produto.estoque + mov.quantidade;
        } else if (mov.tipo === 'saida') {
            novoEstoque = Math.max(0, mov.produto.estoque - mov.quantidade);
        } else { // ajuste
            novoEstoque = mov.quantidade; // quantidade é o novo valor
        }
        
        mensagem += `${novoEstoque}</div>`;
        
        // Verificar se ficará sem estoque ou abaixo do mínimo
        if (novoEstoque <= 0) {
            mensagem += `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Atenção: O produto ficará <strong>sem estoque</strong> após esta movimentação!
                </div>
            `;
        } else if (mov.produto.estoque_minimo && novoEstoque <= mov.produto.estoque_minimo) {
            mensagem += `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    Atenção: O produto ficará com estoque <strong>abaixo do mínimo</strong> (${mov.produto.estoque_minimo}) após esta movimentação!
                </div>
            `;
        }
        
        elementos.confirmacaoMensagem.innerHTML = mensagem;
        
        // Configurar botão de confirmação
        elementos.btnConfirmar.innerHTML = `<i class="fas fa-check"></i> Confirmar Movimentação`;
        elementos.btnConfirmar.className = 'btn btn-primary';
        elementos.btnConfirmar.onclick = executarMovimentacao;
        
        // Exibir modal
        abrirModal(elementos.modalConfirmacao);
    }
    
    /**
     * Executa uma movimentação de estoque
     */
    function executarMovimentacao() {
        try {
            if (!estado.movimentacaoParaConfirmar) return;
            
            const mov = estado.movimentacaoParaConfirmar;
            
            // Determinar quantidade para atualização
            let quantidadeAtualizacao;
            
            if (mov.tipo === 'entrada') {
                quantidadeAtualizacao = mov.quantidade; // positivo para entrada
            } else if (mov.tipo === 'saida') {
                quantidadeAtualizacao = -mov.quantidade; // negativo para saída
            } else { // ajuste
                // Quantidade é o valor final desejado
                quantidadeAtualizacao = mov.quantidade - mov.produto.estoque;
            }
            
            // Registrar movimentação
            const resultado = db.atualizarEstoqueProduto(
                mov.produto.codigo_barras,
                quantidadeAtualizacao,
                mov.motivo + (mov.observacao ? ' - ' + mov.observacao : '')
            );
            
            // Fechar modal
            fecharModal(elementos.modalConfirmacao);
            
            // Limpar formulário
            limparFormularioMovimentacao();
            
            // Recarregar dados
            carregarEstatisticas();
            carregarMovimentacoes();
            carregarProdutosCriticos();
            
            // Exibir mensagem de sucesso
            exibirMensagem('Movimentação de estoque registrada com sucesso', 'success');
        } catch (erro) {
            console.error('Erro ao executar movimentação:', erro);
            exibirMensagem('Erro ao registrar movimentação: ' + erro.message, 'error');
        } finally {
            estado.movimentacaoParaConfirmar = null;
        }
    }
    
    /**
     * Limpa o formulário de movimentação
     */
    function limparFormularioMovimentacao() {
        elementos.formMovimentacao.reset();
        esconderInfoProduto();
        elementos.outroMotivoGrupo.style.display = 'none';
    }
    
    /**
     * Exibe detalhes de uma movimentação
     */
    function exibirDetalhesMovimentacao(id) {
        // Encontrar movimentação pelo ID
        const movimentacao = estado.movimentacoes.find(m => m.id === id);
        
        if (!movimentacao) {
            exibirMensagem('Movimentação não encontrada', 'error');
            return;
        }
        
        // Formatar data
        const data = new Date(movimentacao.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR');
        
        // Formatar tipo para exibição
        const tiposFormatados = {
            'entrada': 'Entrada de Estoque',
            'saida': 'Saída de Estoque',
            'ajuste': 'Ajuste de Estoque'
        };
        
        // Gerar HTML com detalhes
        let html = `
            <div class="detalhes-cabecalho mb-3">
                <h4>${tiposFormatados[movimentacao.tipo] || movimentacao.tipo}</h4>
                <p class="text-muted">
                    <i class="fas fa-calendar"></i> ${dataFormatada} às ${horaFormatada}
                </p>
            </div>
            
            <div class="detalhes-produto mb-3">
                <h5>Produto</h5>
                <p>
                    <strong>Nome:</strong> ${movimentacao.produto_nome}<br>
                    <strong>Código:</strong> ${formatarCodigoBarras(movimentacao.produto_codigo)}
                </p>
            </div>
            
            <div class="detalhes-movimento mb-3">
                <h5>Dados da Movimentação</h5>
                <p>
                    <strong>Quantidade:</strong> ${movimentacao.quantidade} unidades<br>
                    <strong>Estoque Anterior:</strong> ${movimentacao.estoque_anterior}<br>
                    <strong>Estoque Atual:</strong> ${movimentacao.estoque_atual}<br>
                    <strong>Motivo:</strong> ${movimentacao.motivo || 'Não informado'}<br>
                    <strong>Usuário:</strong> ${movimentacao.usuario || 'Sistema'}<br>
                </p>
            </div>
        `;
        
        // Preencher modal
        elementos.detalhesMovimentacao.innerHTML = html;
        
        // Exibir modal
        abrirModal(elementos.modalDetalhes);
    }
    
    /**
     * Abre um modal
     */
    function abrirModal(modal) {
        if (!modal) return;
        modal.style.display = 'flex';
        
        // Aplicar efeito de fade-in
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
    
    /**
     * Fecha um modal
     */
    function fecharModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        
        // Remover após a animação terminar
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    /**
     * Formata um código de barras para exibição
     */
    function formatarCodigoBarras(codigo) {
        if (!codigo) return '';
        
        // Remover espaços e caracteres não numéricos
        codigo = codigo.replace(/\D/g, '');
        
        // Formatar EAN-13
        if (codigo.length === 13) {
            return codigo.substring(0, 1) + ' ' + 
                   codigo.substring(1, 7) + ' ' + 
                   codigo.substring(7);
        }
        
        return codigo;
    }
    
    /**
     * Exibe uma mensagem toast
     */
    function exibirMensagem(mensagem, tipo = 'info', duracao = 3000) {
        // Criar container se não existir
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Criar toast
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${tipo}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : 
                                    tipo === 'warning' ? 'exclamation-triangle' : 
                                    tipo === 'error' ? 'exclamation-circle' : 
                                    'info-circle'}"></i>
                <span>${mensagem}</span>
            </div>
        `;
        
        // Adicionar ao container
        toastContainer.appendChild(toast);
        
        // Exibir com animação
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remover após a duração
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duracao);
    }
});
