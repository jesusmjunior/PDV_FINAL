/**
 * ORION PDV - Sistema de Vendas
 * Versão 2.0 (2025)
 * 
 * Este módulo implementa:
 * - Interface de PDV para registro de vendas
 * - Manipulação de carrinho de compras com código de barras
 * - Finalização de venda e geração de recibo
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
    
    // Estado
    const estado = {
        scannerAtivo: false,
        scannerIniciando: false,
        scannerStream: null,
        scannerLanternaAtiva: false,
        ultimoProduto: null,
        carregandoProdutos: false
    };
    
    // Sons
    const sons = {
        sucesso: document.getElementById('beep-success'),
        erro: document.getElementById('beep-error')
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
        carregarGrupos();
        carregarClientes();
        carregarProdutos();
        atualizarCarrinho();
        
        // Configurar eventos
        configurarEventos();
    }
    
    /**
     * Carrega dados do usuário
     */
    function carregarDadosUsuario() {
        // Dados do usuário
        const user = auth.getUsuarioAtual();
        elementos.userNameEl.textContent = user.nome;
        elementos.userRoleEl.textContent = user.perfil === 'admin' ? 'Administrador' : 
                                          user.perfil === 'supervisor' ? 'Supervisor' : 'Vendedor';
        
        // Data atual
        const dataAtual = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elementos.currentDateEl.textContent = dataAtual.toLocaleDateString('pt-BR', options);
    }
    
    /**
     * Configura eventos da aplicação
     */
    function configurarEventos() {
        // Eventos de abas
        elementos.tabProdutos.addEventListener('click', () => ativarAba('produtos'));
        elementos.tabScanner.addEventListener('click', () => ativarAba('scanner'));
        
        // Eventos de produtos
        elementos.filtroGrupoSelect.addEventListener('change', carregarProdutos);
        elementos.buscaProdutoInput.addEventListener('input', carregarProdutos);
        
        // Eventos de scanner
        elementos.btnBuscarCodigo.addEventListener('click', buscarProdutoPorCodigo);
        elementos.codigoBarrasInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarProdutoPorCodigo();
        });
        elementos.btnScannerCodigo.addEventListener('click', iniciarScanner);
        elementos.btnGerarCodigo.addEventListener('click', gerarCodigoBarras);
        
        // Fechar scanner
        elementos.btnCloseScanner.forEach(btn => {
            btn.addEventListener('click', pararScanner);
        });
        
        // Controle de lanterna
        if (elementos.btnToggleTorch) {
            elementos.btnToggleTorch.addEventListener('click', toggleTorch);
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
            auth.fazerLogout();
            window.location.href = 'index.html';
        });
    }
    
    /**
     * Ativa uma aba específica
     */
    function ativarAba(aba) {
        // Desativar todas as abas
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
    function carregarGrupos() {
        const grupos = db.getGruposProdutos();
        
        // Limpar select
        elementos.filtroGrupoSelect.innerHTML = '<option value="">Todos os grupos</option>';
        
        // Adicionar grupos
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo;
            option.textContent = grupo;
            elementos.filtroGrupoSelect.appendChild(option);
        });
    }
    
    /**
     * Carrega clientes
     */
    function carregarClientes() {
        const clientes = db.getClientes();
        
        // Limpar select
        elementos.clienteSelect.innerHTML = '';
        
        // Adicionar clientes
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            elementos.clienteSelect.appendChild(option);
        });
    }
    
    /**
     * Carrega produtos para a grid
     */
    function carregarProdutos() {
        // Evitar múltiplas chamadas simultâneas
        if (estado.carregandoProdutos) return;
        estado.carregandoProdutos = true;
        
        // Obter produtos
        const produtos = db.getProdutos();
        
        // Filtros
        const termoBusca = elementos.buscaProdutoInput.value.toLowerCase();
        const grupoFiltro = elementos.filtroGrupoSelect.value;
        
        // Limpar lista
        elementos.listaProdutos.innerHTML = '';
        
        // Filtrar produtos
        let produtosFiltrados = Object.values(produtos);
        
        // Filtrar por estoque
        produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque > 0);
        
        // Filtrar por termo de busca
        if (termoBusca) {
            produtosFiltrados = produtosFiltrados.filter(produto => 
                produto.nome.toLowerCase().includes(termoBusca) || 
                produto.codigo_barras.includes(termoBusca));
        }
        
        // Filtrar por grupo
        if (grupoFiltro) {
            produtosFiltrados = produtosFiltrados.filter(produto => produto.grupo === grupoFiltro);
        }
        
        // Ordenar por nome
        produtosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adicionar produtos à lista
        produtosFiltrados.forEach(produto => {
            const produtoEl = document.createElement('div');
            produtoEl.className = 'produto-card';
            produtoEl.dataset.codigo = produto.codigo_barras;
            
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
            
            // Adicionar evento de clique
            produtoEl.addEventListener('click', function() {
                adicionarProdutoAoCarrinho(produto);
            });
            
            elementos.listaProdutos.appendChild(produtoEl);
        });
        
        // Exibir mensagem se não houver produtos
        if (produtosFiltrados.length === 0) {
            elementos.listaProdutos.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0; color: var(--text-muted);">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Nenhum produto encontrado</p>
                </div>
            `;
        }
        
        estado.carregandoProdutos = false;
    }
    
    /**
     * Busca produto por código de barras inserido manualmente
     */
    function buscarProdutoPorCodigo() {
        const codigo = elementos.codigoBarrasInput.value.trim();
        
        if (!codigo) {
            elementos.resultadoScanner.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> Digite um código de barras válido
                </div>
            `;
            return;
        }
        
        // Buscar produto
        const produto = db.getProduto(codigo);
        
        if (produto) {
            // Verificar estoque
            if (produto.estoque <= 0) {
                elementos.resultadoScanner.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i> Produto <strong>${produto.nome}</strong> está sem estoque
                    </div>
                `;
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
                            <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background-color: var(--surface-light); border-radius: var(--border-radius);">
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
                                <i class="
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
        }
    }
    
    /**
     * Inicia o scanner de código de barras
     */
    function iniciarScanner() {
        // Mostrar modal do scanner
        elementos.modalScanner.style.display = 'flex';
        
        // Mostrar indicador de carregamento
        elementos.scannerLoading.style.display = 'block';
        
        // Atualizar status
        atualizarStatusScanner('Inicializando câmera...', 'info');
        
        estado.scannerIniciando = true;
        
        try {
            // Primeiro acessar a câmera
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
                elementos.scannerVideo.srcObject = stream;
                elementos.scannerVideo.play();
                
                // Inicializar scanner
                barcodeScanner.inicializar('scanner-video', codigoDetectado)
                    .then(() => {
                        estado.scannerAtivo = true;
                        estado.scannerIniciando = false;
                        
                        // Ocultar carregamento
                        elementos.scannerLoading.style.display = 'none';
                        
                        // Atualizar status
                        atualizarStatusScanner('Scanner pronto. Posicione o código de barras na área de leitura', 'info');
                    })
                    .catch(erro => {
                        console.error('Erro ao inicializar scanner:', erro);
                        estado.scannerIniciando = false;
                        
                        // Ocultar carregamento
                        elementos.scannerLoading.style.display = 'none';
                        
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
            }).catch(erro => {
                console.error('Erro ao acessar câmera:', erro);
                estado.scannerIniciando = false;
                
                // Ocultar carregamento
                elementos.scannerLoading.style.display = 'none';
                
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
            elementos.scannerLoading.style.display = 'none';
            
            // Atualizar status
            atualizarStatusScanner('Erro ao acessar câmera: ' + erro.message, 'error');
        }
    }
    
    /**
     * Callback quando um código é detectado
     */
    function codigoDetectado(codigo) {
        // Reproduzir som de sucesso
        if (sons.sucesso) sons.sucesso.play();
        
        // Mostrar código detectado
        atualizarStatusScanner(`Código detectado: ${formatarCodigoBarras(codigo)}`, 'success');
        
        // Buscar produto
        const produto = db.getProduto(codigo);
        
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
    }
    
    /**
     * Para o scanner de código de barras
     */
    function pararScanner() {
        // Parar o scanner
        if (estado.scannerAtivo) {
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
        elementos.modalScanner.style.display = 'none';
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
        elementos.scannerStatus.classList.add('active');
        
        // Desativar depois de um tempo
        if (tipo !== 'info') {
            setTimeout(() => {
                elementos.scannerStatus.classList.remove('active');
            }, 3000);
        }
    }
    
    /**
     * Toggle da lanterna da câmera
     */
    async function toggleTorch() {
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
            codigo = db.gerarCodigoBarras();
        }
        
        // Preencher campo
        elementos.codigoBarrasInput.value = codigo;
        
        // Exibir mensagem
        exibirMensagem('Código de barras gerado', 'success');
        
        // Buscar automaticamente
        buscarProdutoPorCodigo();
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
    function adicionarProdutoAoCarrinho(produto, quantidade = 1) {
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
            
            // Criar item do carrinho
            const item = {
                codigo_barras: produto.codigo_barras,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: quantidade,
                foto: produto.foto || null
            };
            
            // Adicionar ao carrinho
            db.adicionarItemCarrinho(item);
            
            // Atualizar carrinho na interface
            atualizarCarrinho();
            
            // Salvar último produto
            estado.ultimoProduto = produto;
            
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
     * Atualiza o carrinho
     */
    function atualizarCarrinho() {
        const carrinho = db.getCarrinho();
        
        // Verificar se carrinho está vazio
        if (carrinho.length === 0) {
            elementos.carrinhoVazio.style.display = 'block';
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
                
                if (!isNaN(quantidade)) {
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
    function removerItemDoCarrinho(codigo) {
        db.removerItemCarrinho(codigo);
        exibirMensagem('Item removido do carrinho', 'info');
        atualizarCarrinho();
    }
    
    /**
     * Atualiza a quantidade de um item no carrinho
     */
    function atualizarQuantidadeItem(codigo, quantidade) {
        try {
            db.atualizarQuantidadeCarrinho(codigo, quantidade);
            atualizarCarrinho();
        } catch (erro) {
            exibirMensagem(erro.message, 'error');
            atualizarCarrinho(); // Recarregar para valor antigo
        }
    }
    
    /**
     * Limpa o carrinho
     */
    function limparCarrinho() {
        // Pedir confirmação
        if (confirm('Tem certeza que deseja limpar o carrinho?')) {
            db.limparCarrinho();
            atualizarCarrinho();
            exibirMensagem('Carrinho limpo', 'info');
        }
    }
    
    /**
     * Atualiza os totais
     */
    function atualizarTotais() {
        const carrinho = db.getCarrinho();
        
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
    function finalizarVenda() {
        try {
            const carrinho = db.getCarrinho();
            
            // Verificar se há itens no carrinho
            if (carrinho.length === 0) {
                exibirMensagem('Não há itens no carrinho', 'error');
                return;
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
                return;
            }
            
            // Obter cliente
            const clienteId = elementos.clienteSelect.value;
            const cliente = db.getCliente(clienteId);
            
            if (!cliente) {
                exibirMensagem('Cliente não encontrado', 'error');
                return;
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
            const resultado = db.registrarVenda(venda);
            
            // Exibir recibo
            exibirRecibo(resultado);
            
            // Exibir mensagem
            exibirMensagem('Venda finalizada com sucesso!', 'success');
            return true;
        } catch (erro) {
            console.error('Erro ao finalizar venda:', erro);
            exibirMensagem(erro.message, 'error');
            return false;
        }
    }
    
    /**
     * Exibe o recibo da venda
     */
    function exibirRecibo(venda) {
        if (!venda) return;
        
        // Obter configurações
        const config = db.getConfig();
        
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
        
        // Exibir modal com animação
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
    function novaVenda() {
        // Fechar modal
        fecharRecibo();
        
        // Limpar campos
        elementos.descontoInput.value = '0';
        elementos.observacaoInput.value = '';
        
        // Atualizar totais
        atualizarTotais();
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
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'warning' ? 'exclamation-triangle' : tipo
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
