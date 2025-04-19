/**
 * ORION PDV - Módulo de Carregamento de Dados PDV
 * Versão 1.0.0 - 2025
 * 
 * Este módulo implementa:
 * - Carregamento de produtos e categorias
 * - Carregamento de clientes
 * - Gestão do carrinho de compras
 * - Carregamento de dados para o PDV
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    if (!auth || typeof auth.verificarAutenticacao !== 'function' || !auth.verificarAutenticacao()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Elementos DOM
    const elementos = {
        // Informações do usuário
        userNameEl: document.getElementById('user-name'),
        userRoleEl: document.getElementById('user-role'),
        currentDateEl: document.getElementById('current-date'),
        
        // Elementos de abas
        tabProdutos: document.getElementById('tab-produtos'),
        tabScanner: document.getElementById('tab-scanner'),
        tabConteudoProdutos: document.getElementById('tab-conteudo-produtos'),
        tabConteudoScanner: document.getElementById('tab-conteudo-scanner'),
        
        // Elementos de produtos
        filtroGrupoSelect: document.getElementById('filtro-grupo'),
        buscaProdutoInput: document.getElementById('busca-produto'),
        listaProdutos: document.getElementById('lista-produtos'),
        
        // Elementos de scanner
        codigoBarrasInput: document.getElementById('codigo-barras'),
        btnBuscarCodigo: document.getElementById('btn-buscar-codigo'),
        resultadoScanner: document.getElementById('resultado-scanner'),
        btnScannerCodigo: document.getElementById('btn-scanner-codigo'),
        btnGerarCodigo: document.getElementById('btn-gerar-codigo'),
        
        // Elementos de carrinho
        carrinhoItens: document.getElementById('carrinho-itens'),
        carrinhoVazio: document.getElementById('carrinho-vazio'),
        btnLimparCarrinho: document.getElementById('btn-limpar-carrinho'),
        subtotalEl: document.getElementById('subtotal'),
        descontoInput: document.getElementById('desconto'),
        valorDescontoEl: document.getElementById('valor-desconto'),
        totalEl: document.getElementById('total'),
        clienteSelect: document.getElementById('cliente'),
        formaPagamentoSelect: document.getElementById('forma-pagamento'),
        observacaoInput: document.getElementById('observacao'),
        btnFinalizar: document.getElementById('btn-finalizar'),
        
        // Elementos de scanner modal
        modalScanner: document.getElementById('modal-scanner'),
        btnCloseScanner: document.querySelectorAll('.btn-close-scanner'),
        scannerVideo: document.getElementById('scanner-video'),
        scannerStatus: document.getElementById('scanner-status'),
        scannerError: document.getElementById('scanner-error'),
        scannerLoading: document.getElementById('scanner-loading'),
        btnToggleTorch: document.querySelector('.btn-toggle-torch'),
        
        // Elementos de recibo
        modalRecibo: document.getElementById('modal-recibo'),
        reciboConteudo: document.getElementById('recibo-conteudo'),
        btnCloseRecibo: document.querySelectorAll('.btn-close-recibo'),
        btnImprimir: document.getElementById('btn-imprimir'),
        btnNovaVenda: document.getElementById('btn-nova-venda'),
        
        // Elementos gerais
        btnLogout: document.getElementById('btn-logout')
    };
    
    // Estado da aplicação
    const estado = {
        produtos: {},
        grupos: [],
        clientes: [],
        carrinho: [],
        carregandoProdutos: false,
        filtroAtivo: '',
        busca: '',
        scannerAtivo: false,
        scannerIniciando: false,
        scannerLanternaAtiva: false,
        scannerStream: null
    };
    
    // Sons
    const sons = {
        sucesso: document.getElementById('beep-success'),
        erro: document.getElementById('beep-error')
    };
    
    // Iniciar aplicação
    iniciarPDV();
    
    /**
     * Inicializa o PDV
     */
    function iniciarPDV() {
        console.log('Inicializando PDV...');
        
        // Carregar dados do usuário
        carregarDadosUsuario();
        
        // Configurar eventos
        configurarEventos();
        
        // Carregar dados iniciais
        carregarDadosIniciais();
    }
    
    /**
     * Carrega dados do usuário logado
     */
    function carregarDadosUsuario() {
        try {
            // Obter usuário atual
            const usuario = auth.getUsuarioAtual();
            
            if (!usuario) {
                throw new Error('Usuário não encontrado');
            }
            
            // Atualizar nome e função do usuário
            elementos.userNameEl.textContent = usuario.nome || 'Usuário';
            elementos.userRoleEl.textContent = usuario.perfil === 'admin' ? 'Administrador' : 
                                             usuario.perfil === 'supervisor' ? 'Supervisor' : 'Vendedor';
            
            // Atualizar data atual
            const dataAtual = new Date();
            const opcoesFormato = { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            };
            
            elementos.currentDateEl.textContent = dataAtual.toLocaleDateString('pt-BR', opcoesFormato);
            
            console.log('Dados do usuário carregados com sucesso');
        } catch (erro) {
            console.error('Erro ao carregar dados do usuário:', erro);
            exibirMensagem('Erro ao carregar dados do usuário', 'error');
        }
    }
    
    /**
     * Configura os eventos da aplicação
     */
    function configurarEventos() {
        // Eventos de abas
        elementos.tabProdutos.addEventListener('click', () => ativarAba('produtos'));
        elementos.tabScanner.addEventListener('click', () => ativarAba('scanner'));
        
        // Eventos de pesquisa e filtro
        elementos.filtroGrupoSelect.addEventListener('change', function() {
            estado.filtroAtivo = this.value;
            carregarProdutos();
        });
        
        elementos.buscaProdutoInput.addEventListener('input', function() {
            estado.busca = this.value.toLowerCase().trim();
            carregarProdutos();
        });
        
        // Eventos de scanner
        elementos.btnBuscarCodigo.addEventListener('click', buscarProdutoPorCodigo);
        elementos.codigoBarrasInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarProdutoPorCodigo();
            }
        });
        
        elementos.btnScannerCodigo.addEventListener('click', iniciarScanner);
        elementos.btnGerarCodigo.addEventListener('click', gerarCodigoBarras);
        
        // Fechar scanner
        elementos.btnCloseScanner.forEach(btn => {
            btn.addEventListener('click', pararScanner);
        });
        
        // Controle de lanterna
        if (elementos.btnToggleTorch) {
            elementos.btnToggleTorch.addEventListener('click', toggleLanterna);
        }
        
        // Eventos de carrinho
        elementos.descontoInput.addEventListener('input', atualizarTotais);
        elementos.btnLimparCarrinho.addEventListener('click', limparCarrinho);
        elementos.btnFinalizar.addEventListener('click', finalizarVenda);
        
        // Eventos de recibo
        elementos.btnCloseRecibo.forEach(btn => {
            btn.addEventListener('click', fecharRecibo);
        });
        
        elementos.btnImprimir.addEventListener('click', imprimirRecibo);
        elementos.btnNovaVenda.addEventListener('click', novaVenda);
        
        // Logout
        elementos.btnLogout.addEventListener('click', () => {
            if (auth && typeof auth.fazerLogout === 'function') {
                auth.fazerLogout();
                window.location.href = 'index.html';
            }
        });
        
        console.log('Eventos configurados com sucesso');
    }
    
    /**
     * Carrega dados iniciais
     */
    function carregarDadosIniciais() {
        Promise.all([
            carregarGrupos(),
            carregarClientes(),
            carregarCarrinho()
        ]).then(() => {
            carregarProdutos();
            console.log('Dados iniciais carregados com sucesso');
        }).catch(erro => {
            console.error('Erro ao carregar dados iniciais:', erro);
            exibirMensagem('Erro ao carregar dados iniciais', 'error');
        });
    }
    
    /**
     * Ativa a aba especificada
     */
    function ativarAba(aba) {
        // Remover classe ativa de todas as abas
        elementos.tabProdutos.classList.remove('active');
        elementos.tabScanner.classList.remove('active');
        
        // Ocultar todos os conteúdos
        elementos.tabConteudoProdutos.style.display = 'none';
        elementos.tabConteudoScanner.style.display = 'none';
        
        // Ativar aba selecionada
        if (aba === 'produtos') {
            elementos.tabProdutos.classList.add('active');
            elementos.tabConteudoProdutos.style.display = 'block';
        } else if (aba === 'scanner') {
            elementos.tabScanner.classList.add('active');
            elementos.tabConteudoScanner.style.display = 'block';
            elementos.codigoBarrasInput.focus();
        }
    }
    
    /**
     * Carrega grupos de produtos
     */
    async function carregarGrupos() {
        try {
            // Obter grupos do banco de dados
            const grupos = await db.getGruposProdutos();
            estado.grupos = grupos;
            
            // Limpar select
            elementos.filtroGrupoSelect.innerHTML = '<option value="">Todos os grupos</option>';
            
            // Adicionar grupos ao select
            grupos.forEach(grupo => {
                const option = document.createElement('option');
                option.value = grupo;
                option.textContent = grupo;
                elementos.filtroGrupoSelect.appendChild(option);
            });
            
            console.log(`${grupos.length} grupos carregados`);
        } catch (erro) {
            console.error('Erro ao carregar grupos:', erro);
            throw erro;
        }
    }
    
    /**
     * Carrega lista de clientes
     */
    async function carregarClientes() {
        try {
            // Obter clientes do banco de dados
            const clientes = await db.getClientes();
            estado.clientes = clientes;
            
            // Limpar select
            elementos.clienteSelect.innerHTML = '';
            
            // Adicionar clientes ao select
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nome;
                elementos.clienteSelect.appendChild(option);
            });
            
            console.log(`${clientes.length} clientes carregados`);
        } catch (erro) {
            console.error('Erro ao carregar clientes:', erro);
            throw erro;
        }
    }
    
    /**
     * Carrega o carrinho de compras
     */
    async function carregarCarrinho() {
        try {
            // Obter carrinho do banco de dados
            const carrinho = await db.getCarrinho();
            estado.carrinho = carrinho;
            
            // Atualizar interface
            atualizarCarrinho();
            
            console.log(`Carrinho carregado com ${carrinho.length} itens`);
        } catch (erro) {
            console.error('Erro ao carregar carrinho:', erro);
            throw erro;
        }
    }
    
    /**
     * Carrega e exibe os produtos
     */
    async function carregarProdutos() {
        // Evitar múltiplas chamadas simultâneas
        if (estado.carregandoProdutos) return;
        estado.carregandoProdutos = true;
        
        try {
            // Mostrar indicador de carregamento
            elementos.listaProdutos.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0; color: var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Carregando produtos...</p>
                </div>
            `;
            
            // Obter produtos do banco de dados
            let produtos = await db.getProdutos();
            estado.produtos = produtos;
            
            // Aplicar filtros
            let produtosFiltrados = Object.values(produtos);
            
            // Filtrar por estoque
            produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque > 0);
            
            // Filtrar por grupo
            if (estado.filtroAtivo) {
                produtosFiltrados = produtosFiltrados.filter(produto => produto.grupo === estado.filtroAtivo);
            }
            
            // Filtrar por termo de busca
            if (estado.busca) {
                produtosFiltrados = produtosFiltrados.filter(produto => 
                    produto.nome.toLowerCase().includes(estado.busca) || 
                    produto.codigo_barras.includes(estado.busca)
                );
            }
            
            // Ordenar por nome
            produtosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
            
            // Limpar lista de produtos
            elementos.listaProdutos.innerHTML = '';
            
            // Adicionar produtos à lista
            if (produtosFiltrados.length > 0) {
                produtosFiltrados.forEach(produto => {
                    const produtoEl = document.createElement('div');
                    produtoEl.className = 'produto-card';
                    produtoEl.dataset.codigo = produto.codigo_barras;
                    
                    // Criar template do produto
                    produtoEl.innerHTML = `
                        <div class="produto-img">
                            ${produto.foto ? `<img src="${produto.foto}" alt="${produto.nome}">` : `<i class="fas fa-box" style="font-size: 2.5rem; color: var(--primary);"></i>`}
                        </div>
                        <div class="produto-info">
                            <div class="produto-nome">${produto.nome}</div>
                            <div class="produto-preco">R$ ${produto.preco.toFixed(2)}</div>
                            <div class="produto-estoque">Estoque: ${produto.estoque}</div>
                        </div>
                    `;
                    
                    // Adicionar evento de clique para adicionar ao carrinho
                    produtoEl.addEventListener('click', () => adicionarProdutoAoCarrinho(produto));
                    
                    elementos.listaProdutos.appendChild(produtoEl);
                });
            } else {
                // Mostrar mensagem de nenhum produto encontrado
                elementos.listaProdutos.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0; color: var(--text-muted);">
                        <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p>Nenhum produto encontrado</p>
                    </div>
                `;
            }
            
            console.log(`${produtosFiltrados.length} produtos exibidos`);
        } catch (erro) {
            console.error('Erro ao carregar produtos:', erro);
            elementos.listaProdutos.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0; color: var(--danger);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Erro ao carregar produtos</p>
                    <p>${erro.message}</p>
                </div>
            `;
        } finally {
            estado.carregandoProdutos = false;
        }
    }
    
    /**
     * Busca produto por código de barras
     */
    async function buscarProdutoPorCodigo() {
        const codigo = elementos.codigoBarrasInput.value.trim();
        
        if (!codigo) {
            elementos.resultadoScanner.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> Digite um código de barras válido
                </div>
            `;
            return;
        }
        
        try {
            // Buscar produto
            const produto = await db.getProduto(codigo);
            
            if (produto) {
                // Verificar estoque
                if (produto.estoque <= 0) {
                    elementos.resultadoScanner.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-circle"></i> Produto <strong>${produto.nome}</strong> está sem estoque
                        </div>
                    `;
                    if (sons.erro) sons.erro.play();
                    return;
                }
                
                // Exibir informações do produto
                elementos.resultadoScanner.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title"><i class="fas fa-box"></i> Produto Encontrado</div>
                        </div>
                        <div class="card-body">
                            <div class="d-flex gap-3 mb-3">
                                <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background-color: var(--surface); border-radius: var(--border-radius);">
                                    ${produto.foto ? `<img src="${produto.foto}" alt="${produto.nome}" style="max-width: 100%; max-height: 100%;">` : `<i class="fas fa-box" style="font-size: 2rem; color: var(--primary);"></i>`}
                                </div>
                                <div>
                                    <h4 class="mb-1">${produto.nome}</h4>
                                    <p class="text-muted mb-1">Código: ${formatarCodigoBarras(produto.codigo_barras)}</p>
                                    <p class="text-primary font-weight-bold" style="font-size: 1.25rem;">R$ ${produto.preco.toFixed(2)}</p>
                                </div>
                            </div>
                            
                            <div class="form-group mb-3">
                                <label for="quantidade-scanner">Quantidade</label>
                                <input type="number" id="quantidade-scanner" class="form-control" value="1" min="1" max="${produto.estoque}" step="1">
                            </div>
                            
                            <div class="text-center">
                                <button id="btn-adicionar-scanner" class="btn btn-primary">
                                    <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Adicionar evento ao botão
                document.getElementById('btn-adicionar-scanner').addEventListener('click', function() {
                    const quantidade = parseInt(document.getElementById('quantidade-scanner').value);
                    
                    if (quantidade > 0 && quantidade <= produto.estoque) {
                        adicionarProdutoAoCarrinho(produto, quantidade);
                        
                        // Limpar resultado
                        elementos.resultadoScanner.innerHTML = `
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle"></i> Produto <strong>${produto.nome}</strong> adicionado ao carrinho
                            </div>
                        `;
                        
                        // Limpar campo de código
                        elementos.codigoBarrasInput.value = '';
                        elementos.codigoBarrasInput.focus();
                    } else {
                        exibirMensagem('Quantidade inválida', 'error');
                    }
                });
            } else {
                // Produto não encontrado
                elementos.resultadoScanner.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i> Produto não encontrado para o código <strong>${codigo}</strong>
                    </div>
                    
                    <div class="text-center mt-3">
                        <a href="produto.html?codigo=${codigo}" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Cadastrar Novo Produto
                        </a>
                    </div>
                `;
                if (sons.erro) sons.erro.play();
            }
        } catch (erro) {
            console.error('Erro ao buscar produto:', erro);
            elementos.resultadoScanner.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Erro ao buscar produto: ${erro.message}
                </div>
            `;
            if (sons.erro) sons.erro.play();
        }
    }
    
    /**
     * Inicia scanner de código de barras
     */
    function iniciarScanner() {
        if (!elementos.modalScanner) return;
        
        // Mostrar modal do scanner
        elementos.modalScanner.style.display = 'flex';
        
        // Mostrar indicador de carregamento
        if (elementos.scannerLoading) {
            elementos.scannerLoading.style.display = 'block';
        }
        
        // Atualizar status
        atualizarStatusScanner('Inicializando câmera...', 'info');
        
        estado.scannerIniciando = true;
        
        try {
            // Acessar a câmera
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            }).then(stream => {
                // Guardar stream para poder parar depois
                estado.scannerStream = stream;
                
                // Configurar vídeo
                if (elementos.scannerVideo) {
                    elementos.scannerVideo.srcObject = stream;
                    elementos.scannerVideo.play();
                }
                
                // Inicializar scanner
                if (typeof barcodeScanner !== 'undefined' && typeof barcodeScanner.inicializar === 'function') {
                    barcodeScanner.inicializar('scanner-video', codigoDetectado)
                        .then(() => {
                            estado.scannerAtivo = true;
                            estado.scannerIniciando = false;
                            
                            // Ocultar carregamento
                            if (elementos.scannerLoading) {
                                elementos.scannerLoading.style.display = 'none';
                            }
                            
                            // Atualizar status
                            atualizarStatusScanner('Scanner pronto. Posicione o código de barras na área de leitura', 'info');
                        })
                        .catch(erro => {
                            console.error('Erro ao inicializar scanner:', erro);
                            estado.scannerIniciando = false;
                            
                            // Ocultar carregamento
                            if (elementos.scannerLoading) {
                                elementos.scannerLoading.style.display = 'none';
                            }
                            
                            // Exibir erro
                            atualizarStatusScanner(erro.message, 'error');
                            
                            // Exibir detalhes do erro
                            if (elementos.scannerError) {
                                elementos.scannerError.style.display = 'block';
                                const mensagemErro = elementos.scannerError.querySelector('.error-message');
                                if (mensagemErro) {
                                    mensagemErro.textContent = erro.message;
                                }
                            }
                        });
                } else {
                    throw new Error('Módulo de scanner não encontrado');
                }
            }).catch(erro => {
                console.error('Erro ao acessar câmera:', erro);
                estado.scannerIniciando = false;
                
                // Ocultar carregamento
                if (elementos.scannerLoading) {
                    elementos.scannerLoading.style.display = 'none';
                }
                
                // Determinar mensagem de erro
                let mensagemErro = 'Erro ao acessar câmera';
                
                if (erro.name === 'NotAllowedError') {
                    mensagemErro = 'Acesso à câmera negado. Por favor, permita o acesso à câmera.';
                } else if (erro.name === 'NotFoundError') {
                    mensagemErro = 'Nenhuma câmera encontrada no dispositivo.';
                } else {
                    mensagemErro = `Erro ao acessar câmera: ${erro.message}`;
                }
                
                // Atualizar status
                atualizarStatusScanner(mensagemErro, 'error');
                
                // Exibir detalhes do erro
                if (elementos.scannerError) {
                    elementos.scannerError.style.display = 'block';
                    const mensagemErroEl = elementos.scannerError.querySelector('.error-message');
                    if (mensagemErroEl) {
                        mensagemErroEl.textContent = mensagemErro;
                    }
                }
            });
        } catch (erro) {
            console.error('Erro ao acessar câmera:', erro);
            estado.scannerIniciando = false;
            
            // Ocultar carregamento
            if (elementos.scannerLoading) {
                elementos.scannerLoading.style.display = 'none';
            }
            
            // Atualizar status
            atualizarStatusScanner('Erro ao acessar câmera: ' + erro.message, 'error');
        }
    }
    
    /**
     * Callback quando um código de barras é detectado
     */
    function codigoDetectado(codigo) {
        // Reproduzir som de sucesso
        if (sons.sucesso) sons.sucesso.play();
        
        // Mostrar código detectado
        atualizarStatusScanner(`Código detectado: ${formatarCodigoBarras(codigo)}`, 'success');
        
        // Buscar produto
        db.getProduto(codigo).then(produto => {
            if (produto) {
                // Verificar estoque
                if (produto.estoque <= 0) {
                    atualizarStatusScanner(`Produto ${produto.nome} está sem estoque`, 'error');
                    return;
                }
                
                // Adicionar ao carrinho
                adicionarProdutoAoCarrinho(produto);
                
                // Fechar scanner após um pequeno delay
                setTimeout(() => {
                    pararScanner();
                }, 500);
            } else {
                atualizarStatusScanner(`Produto não encontrado para o código ${codigo}`, 'error');
            }
        }).catch(erro => {
            console.error('Erro ao buscar produto:', erro);
            atualizarStatusScanner(`Erro ao buscar produto: ${erro.message}`, 'error');
        });
    }
    
    /**
     * Para o scanner de código de barras
     */
    function pararScanner() {
        // Parar o scanner
        if (estado.scannerAtivo && typeof barcodeScanner !== 'undefined' && typeof barcodeScanner.parar === 'function') {
            barcodeScanner.parar();
            estado.scannerAtivo = false;
        }
        
        // Parar stream de vídeo
        if (estado.scannerStream) {
            estado.scannerStream.getTracks().forEach(track => track.stop());
            estado.scannerStream = null;
        }
        
        // Limpar vídeo
        if (elementos.scannerVideo) {
            elementos.scannerVideo.srcObject = null;
        }
        
        // Resetar estado da lanterna
        estado.scannerLanternaAtiva = false;
        if (elementos.btnToggleTorch) {
            elementos.btnToggleTorch.classList.remove('active');
        }
        
        // Fechar modal
        if (elementos.modalScanner) {
            elementos.modalScanner.style.display = 'none';
        }
    }
    
    /**
     * Atualiza o status do scanner
     */
    function atualizarStatusScanner(mensagem, tipo = 'info') {
        if (!elementos.scannerStatus) return;
        
        // Atualizar texto
        const textoStatus = elementos.scannerStatus.querySelector('.status-text');
        if (textoStatus) {
            textoStatus.textContent = mensagem;
        } else {
            elementos.scannerStatus.textContent = mensagem;
        }
        
        // Atualizar classe de estilo
        elementos.scannerStatus.className = `scanner-status ${tipo}`;
        
        // Mudar ícone conforme o tipo
        const icone = elementos.scannerStatus.querySelector('i');
        if (icone) {
            icone.className = tipo === 'success' ? 'fas fa-check-circle' : 
                             tipo === 'error' ? 'fas fa-exclamation-circle' :
                             tipo === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
        }
    }
    
    /**
     * Toggle da lanterna da câmera
     */
    async function toggleLanterna() {
        if (!estado.scannerAtivo || !estado.scannerStream) return;
        
        try {
            const videoTrack = estado.scannerStream.getVideoTracks()[0];
            
            if (!videoTrack || typeof videoTrack.getCapabilities !== 'function') return;
            
            const capabilities = videoTrack.getCapabilities();
            
            // Verificar se a lanterna é suportada
            if (capabilities.torch) {
                const novoEstado = !estado.scannerLanternaAtiva;
                await videoTrack.applyConstraints({
                    advanced: [{ torch: novoEstado }]
                });
                
                estado.scannerLanternaAtiva = novoEstado;
                
                // Atualizar botão
                if (elementos.btnToggleTorch) {
                    elementos.btnToggleTorch.classList.toggle('active', novoEstado);
                }
                
                // Atualizar status
                atualizarStatusScanner(
                    novoEstado ? 'Lanterna ativada' : 'Lanterna desativada', 
                    'info'
                );
            } else {
                atualizarStatusScanner('Lanterna não disponível neste dispositivo', 'warning');
            }
        } catch (erro) {
            console.error('Erro ao controlar lanterna:', erro);
            atualizarStatusScanner('Erro ao controlar lanterna', 'error');
        }
    }
    
    /**
     * Gera um código de barras EAN-13 válido
     */
    function gerarCodigoBarras() {
        let codigo;
        
        // Usar o gerador do barcodeScanner se disponível
        if (typeof barcodeScanner !== 'undefined' && 
            typeof barcodeScanner.gerarCodigoBarrasAleatorio === 'function') {
            codigo = barcodeScanner.gerarCodigoBarrasAleatorio();
        } else {
            // Implementação básica se o scanner não estiver disponível
            codigo = db.gerarCodigoBarras ? db.gerarCodigoBarras() : gerarCodigoBarrasDefault();
        }
        
        // Preencher campo
        elementos.codigoBarrasInput.value = codigo;
        
        // Exibir mensagem
        exibirMensagem('Código de barras gerado', 'success');
        
        // Buscar automaticamente
        buscarProdutoPorCodigo();
    }
    
    /**
     * Implementação básica de geração de código EAN-13
     */
    function gerarCodigoBarrasDefault() {
        // Gerar 12 dígitos aleatórios (EAN-13 sem dígito verificador)
        let codigo = '789'; // Prefixo brasileiro
        
        // Gerar 9 dígitos aleatórios
        for (let i = 0; i < 9; i++) {
            codigo += Math.floor(Math.random() * 10);
        }
        
        // Calcular dígito verificador (13º dígito)
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            const digito = parseInt(codigo[i]);
            soma += (i % 2 === 0) ? digito : digito * 3;
        }
        
        const digitoVerificador = (10 - (soma % 10)) % 10;
        
        return codigo + digitoVerificador;
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
     * Adiciona um produto ao carrinho
     */
    async function adicionarProdutoAoCarrinho(produto, quantidade = 1) {
        try {
            // Validar produto
            if (!produto) throw new Error('Produto inválido');
            
            // Validar quantidade
            quantidade = parseInt(quantidade);
            if (isNaN(quantidade) || quantidade <= 0) {
                throw new Error('Quantidade inválida');
            }
            
            // Verificar estoque
            if (produto.estoque <= 0) {
                throw new Error('Produto sem estoque disponível');
            }
            
            if (quantidade > produto.estoque) {
                throw new Error(`Quantidade excede estoque disponível (${produto.estoque})`);
            }
            
            // Verificar se produto já existe no carrinho
            const itemExistente = estado.carrinho.find(item => item.codigo_barras === produto.codigo_barras);
            
            if (itemExistente) {
                // Atualizar quantidade
                const novaQuantidade = itemExistente.quantidade + quantidade;
                
                if (novaQuantidade > produto.estoque) {
                    throw new Error(`Quantidade total excede estoque disponível (${produto.estoque})`);
                }
                
                await db.atualizarQuantidadeCarrinho(produto.codigo_barras, novaQuantidade);
            } else {
                // Criar item do carrinho
                const item = {
                    codigo_barras: produto.codigo_barras,
                    nome: produto.nome,
                    preco: produto.preco,
                    quantidade: quantidade,
                    foto: produto.foto || null
                };
                
                // Adicionar ao carrinho
                await db.adicionarItemCarrinho(item);
            }
            
            // Recarregar carrinho
            await carregarCarrinho();
            
            // Tocar som de sucesso
            if (sons.sucesso) sons.sucesso.play();
            
            // Exibir mensagem
            exibirMensagem(`${produto.nome} adicionado ao carrinho`, 'success');
            
            return true;
        } catch (erro) {
            console.error('Erro ao adicionar produto ao carrinho:', erro);
            exibirMensagem(erro.message, 'error');
            
            // Tocar som de erro
            if (sons.erro) sons.erro.play();
            
            return false;
        }
    }
    
    /**
     * Atualiza a exibição do carrinho
     */
    function atualizarCarrinho() {
        const carrinho = estado.carrinho;
        
        // Verificar se carrinho está vazio
        if (!carrinho || carrinho.length === 0) {
            elementos.carrinhoVazio.style.display = 'flex';
            elementos.carrinhoItens.innerHTML = '';
            
            // Limpar totais
            elementos.subtotalEl.textContent = 'R$ 0,00';
            elementos.valorDescontoEl.textContent = 'R$ 0,00';
            elementos.totalEl.textContent = 'R$ 0,00';
            
            // Desabilitar botão de finalizar
            elementos.btnFinalizar.disabled = true;
            
            return;
        }
        
        // Ocultar mensagem de carrinho vazio
        elementos.carrinhoVazio.style.display = 'none';
        
        // Limpar lista de itens
        elementos.carrinhoItens.innerHTML = '';
        
        // Adicionar itens ao carrinho
        carrinho.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'carrinho-item';
            
            // Calcular subtotal
            const subtotal = item.preco * item.quantidade;
            
            itemEl.innerHTML = `
                <div class="carrinho-img">
                    ${item.foto ? `<img src="${item.foto}" alt="${item.nome}">` : `<i class="fas fa-box" style="font-size: 1.5rem; color: var(--primary);"></i>`}
                </div>
                <div class="carrinho-info">
                    <div class="carrinho-nome">${item.nome}</div>
                    <div class="carrinho-detalhes">
                        <div>R$ ${item.preco.toFixed(2)} × 
                            <input type="number" class="qtd-input" data-codigo="${item.codigo_barras}" value="${item.quantidade}" min="1" max="99">
                        </div>
                        <div>R$ ${subtotal.toFixed(2)}</div>
                    </div>
                </div>
                <button class="btn-remove" data-codigo="${item.codigo_barras}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            elementos.carrinhoItens.appendChild(itemEl);
        });
        
        // Adicionar eventos aos botões de remover
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const codigo = this.getAttribute('data-codigo');
                removerItemDoCarrinho(codigo);
            });
        });
        
        // Adicionar eventos aos inputs de quantidade
        document.querySelectorAll('.qtd-input').forEach(input => {
            input.addEventListener('change', function() {
                const codigo = this.getAttribute('data-codigo');
                const quantidade = parseInt(this.value);
                
                if (!isNaN(quantidade) && quantidade > 0) {
                    atualizarQuantidadeItem(codigo, quantidade);
                }
            });
        });
        
        // Calcular totais
        atualizarTotais();
    }
    
    /**
     * Remove um item do carrinho
     */
    async function removerItemDoCarrinho(codigo) {
        try {
            await db.removerItemCarrinho(codigo);
            await carregarCarrinho();
            exibirMensagem('Item removido do carrinho', 'info');
        } catch (erro) {
            console.error('Erro ao remover item do carrinho:', erro);
            exibirMensagem('Erro ao remover item do carrinho', 'error');
        }
    }
    
    /**
     * Atualiza a quantidade de um item no carrinho
     */
    async function atualizarQuantidadeItem(codigo, quantidade) {
        try {
            // Verificar estoque
            const produto = await db.getProduto(codigo);
            
            if (!produto) {
                throw new Error('Produto não encontrado');
            }
            
            if (quantidade > produto.estoque) {
                throw new Error(`Quantidade excede estoque disponível (${produto.estoque})`);
            }
            
            await db.atualizarQuantidadeCarrinho(codigo, quantidade);
            await carregarCarrinho();
        } catch (erro) {
            console.error('Erro ao atualizar quantidade:', erro);
            exibirMensagem(erro.message, 'error');
            await carregarCarrinho(); // Recarregar para valor antigo
        }
    }
    
    /**
     * Limpa o carrinho
     */
    async function limparCarrinho() {
        // Pedir confirmação
        if (confirm('Tem certeza que deseja limpar o carrinho?')) {
            try {
                await db.limparCarrinho();
                await carregarCarrinho();
                exibirMensagem('Carrinho limpo', 'info');
            } catch (erro) {
                console.error('Erro ao limpar carrinho:', erro);
                exibirMensagem('Erro ao limpar carrinho', 'error');
            }
        }
    }
    
    /**
     * Atualiza os totais do carrinho
     */
    function atualizarTotais() {
        const carrinho = estado.carrinho;
        
        // Calcular subtotal
        const subtotal = carrinho.reduce((total, item) => {
            return total + (item.preco * item.quantidade);
        }, 0);
        
        // Obter percentual de desconto
        const percentualDesconto = parseFloat(elementos.descontoInput.value) || 0;
        
        // Calcular desconto
        const desconto = (subtotal * percentualDesconto) / 100;
        
        // Calcular total
        const total = subtotal - desconto;
        
        // Atualizar elementos
        elementos.subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
        elementos.valorDescontoEl.textContent = `R$ ${desconto.toFixed(2)}`;
        elementos.totalEl.textContent = `R$ ${total.toFixed(2)}`;
        
        // Habilitar/desabilitar botão de finalizar
        elementos.btnFinalizar.disabled = carrinho.length === 0 || total <= 0;
    }
    
    /**
     * Finaliza a venda
     */
    async function finalizarVenda() {
        try {
            const carrinho = estado.carrinho;
            
            // Verificar se há itens no carrinho
            if (carrinho.length === 0) {
                exibirMensagem('Não há itens no carrinho', 'error');
                return false;
            }
            
            // Calcular subtotal
            const subtotal = carrinho.reduce((total, item) => {
                return total + (item.preco * item.quantidade);
            }, 0);
            
            // Obter percentual de desconto
            const percentualDesconto = parseFloat(elementos.descontoInput.value) || 0;
            
            // Calcular desconto
            const desconto = (subtotal * percentualDesconto) / 100;
            
            // Calcular total
            const total = subtotal - desconto;
            
            // Verificar se o total é maior que zero
            if (total <= 0) {
                exibirMensagem('O valor total da venda deve ser maior que zero', 'error');
                return false;
            }
            
            // Obter cliente
            const clienteId = elementos.clienteSelect.value;
            const cliente = estado.clientes.find(c => c.id === clienteId);
            
            if (!cliente) {
                exibirMensagem('Cliente não encontrado', 'error');
                return false;
            }
            
            // Obter forma de pagamento
            const formaPagamento = elementos.formaPagamentoSelect.value;
            const formaPagamentoTexto = elementos.formaPagamentoSelect.options[elementos.formaPagamentoSelect.selectedIndex].text;
            
            // Obter usuário logado
            const usuario = auth.getUsuarioAtual();
            
            // Dados da venda
            const venda = {
                cliente_id: cliente.id,
                cliente_nome: cliente.nome,
                forma_pagamento: formaPagamentoTexto,
                forma_pagamento_id: formaPagamento,
                itens: carrinho,
                subtotal: subtotal,
                desconto: desconto,
                total: total,
                percentual_desconto: percentualDesconto,
                observacao: elementos.observacaoInput.value.trim(),
                usuario: usuario ? usuario.nome : 'Sistema',
                data: new Date().toISOString()
            };
            
            // Registrar venda
            const resultado = await db.registrarVenda(venda);
            
            // Limpar carrinho após finalizar a venda
            await db.limparCarrinho();
            
            // Exibir recibo
            exibirRecibo(resultado);
            
            // Tocar som de sucesso
            if (sons.sucesso) sons.sucesso.play();
            
            // Exibir mensagem
            exibirMensagem('Venda finalizada com sucesso!', 'success');
            
            return true;
        } catch (erro) {
            console.error('Erro ao finalizar venda:', erro);
            exibirMensagem(erro.message, 'error');
            
            // Tocar som de erro
            if (sons.erro) sons.erro.play();
            
            return false;
        }
    }
    
    /**
     * Exibe o recibo da venda
     */
    function exibirRecibo(venda) {
        if (!venda) return;
        
        // Obter configurações
        const config = db.getConfig ? db.getConfig() : { 
            nome_empresa: 'ORION PDV', 
            endereco: '', 
            cidade: '', 
            cnpj: '', 
            telefone: '' 
        };
        
        // Formatar data
        const data = new Date(venda.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Gerar HTML dos itens
        let itensHTML = '';
        venda.itens.forEach((item, index) => {
            const subtotal = item.preco * item.quantidade;
            
            itensHTML += `
                <tr>
                    <td>${index + 1}. ${item.nome}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco.toFixed(2)}</td>
                    <td class="text-right">R$ ${subtotal.toFixed(2)}</td>
                </tr>
            `;
        });
        
        // Recibo HTML
        const reciboHTML = `
            <div style="font-family: monospace; line-height: 1.4; font-size: 12px;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; font-size: 16px;">${config.nome_empresa || 'ORION PDV'}</h3>
                    <p style="margin: 0;">${config.endereco || ''}</p>
                    <p style="margin: 0;">${config.cidade || ''}</p>
                    <p style="margin: 0;">CNPJ: ${config.cnpj || ''}</p>
                    <p style="margin: 0;">${config.telefone || ''}</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <p><strong>CUPOM NÃO FISCAL</strong></p>
                    <p><strong>Venda:</strong> ${venda.id}</p>
                    <p><strong>Data:</strong> ${dataFormatada} ${horaFormatada}</p>
                    <p><strong>Cliente:</strong> ${venda.cliente_nome}</p>
                    <p><strong>Operador:</strong> ${venda.usuario}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr>
                            <th style="text-align: left; border-bottom: 1px dashed #ccc; padding: 3px 0;">Item</th>
                            <th style="text-align: left; border-bottom: 1px dashed #ccc; padding: 3px 0;">Qtd</th>
                            <th style="text-align: left; border-bottom: 1px dashed #ccc; padding: 3px 0;">Valor</th>
                            <th style="text-align: right; border-bottom: 1px dashed #ccc; padding: 3px 0;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensHTML}
                    </tbody>
                </table>
                
                <div style="text-align: right; border-top: 1px dashed #ccc; padding-top: 10px; margin-bottom: 15px;">
                    <p><strong>Subtotal:</strong> R$ ${venda.subtotal.toFixed(2)}</p>
                    <p><strong>Desconto:</strong> R$ ${venda.desconto.toFixed(2)}</p>
                    <p style="font-size: 14px;"><strong>TOTAL: R$ ${venda.total.toFixed(2)}</strong></p>
                </div>
                
                <div style="border-top: 1px dashed #ccc; padding-top: 10px; margin-bottom: 15px;">
                    <p><strong>Forma de pagamento:</strong> ${venda.forma_pagamento}</p>
                </div>
                
                <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 10px; margin-bottom: 15px;">
                    <p>ORION PDV - Sistema de Gestão de Vendas</p>
                    <p>${dataFormatada} ${horaFormatada}</p>
                    <p><strong>OBRIGADO PELA PREFERÊNCIA!</strong></p>
                    <p>Volte Sempre</p>
                </div>
            </div>
        `;
        
        // Preencher modal
        elementos.reciboConteudo.innerHTML = reciboHTML;
        
        // Mostrar modal
        elementos.modalRecibo.style.display = 'flex';
        setTimeout(() => {
            elementos.modalRecibo.classList.add('show');
        }, 10);
    }
    
    /**
     * Fecha o modal de recibo
     */
    function fecharRecibo() {
        elementos.modalRecibo.classList.remove('show');
        setTimeout(() => {
            elementos.modalRecibo.style.display = 'none';
        }, 300);
    }
    
    /**
     * Inicia uma nova venda
     */
    async function novaVenda() {
        // Fechar modal
        fecharRecibo();
        
        // Limpar carrinho
        await db.limparCarrinho();
        
        // Recarregar carrinho
        await carregarCarrinho();
        
        // Limpar campos
        elementos.descontoInput.value = '0';
        elementos.observacaoInput.value = '';
        
        // Atualizar totais
        atualizarTotais();
        
        // Exibir mensagem
        exibirMensagem('Nova venda iniciada', 'success');
    }
    
    /**
     * Imprime o recibo
     */
    function imprimirRecibo() {
        // Abrir nova janela para impressão
        const reciboWindow = window.open('', '_blank', 'width=400,height=600');
        
        // Obter HTML do recibo
        const reciboHTML = elementos.reciboConteudo.innerHTML;
        
        // Escrever na nova janela
        reciboWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Recibo de Venda - ORION PDV</title>
                <style>
                    body {
                        font-family: monospace;
                        line-height: 1.4;
                        font-size: 12px;
                        padding: 20px;
                        max-width: 80mm;
                        margin: 0 auto;
                    }
                    
                    @media print {
                        body {
                            width: 80mm;
                            margin: 0;
                            padding: 0;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${reciboHTML}
                
                <div class="no-print" style="position: fixed; bottom: 20px; left: 0; width: 100%; text-align: center; margin-top: 20px;">
                    <button onclick="window.print();" style="padding: 10px 20px; background-color: #0B3D91; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        <span style="margin-right: 5px;">🖨️</span> Imprimir Recibo
                    </button>
                    &nbsp;
                    <button onclick="window.close();" style="padding: 10px 20px; background-color: #555; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Fechar
                    </button>
                </div>
                
                <script>
                    // Auto-imprimir quando aberto
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
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
