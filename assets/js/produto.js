/**
 * ORION PDV - Gerenciamento de Produtos
 * Versão 2.0 (2025)
 * 
 * Este módulo implementa:
 * - Cadastro e edição de produtos
 * - Scanner de código de barras para celulares
 * - Gerenciamento de grupos de produtos
 * - Validação de dados
 * - Integração com banco de dados
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    if (!auth.verificarAutenticacao()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Elementos DOM
    const elementos = {
        // Informações de usuário
        userNameEl: document.getElementById('user-name'),
        userRoleEl: document.getElementById('user-role'),
        currentDateEl: document.getElementById('current-date'),
        
        // Formulário de produto
        formProduto: document.getElementById('form-produto'),
        formTitle: document.getElementById('form-title'),
        produtoId: document.getElementById('produto-id'),
        codigoBarras: document.getElementById('codigo-barras'),
        nome: document.getElementById('nome'),
        preco: document.getElementById('preco'),
        grupo: document.getElementById('grupo'),
        estoque: document.getElementById('estoque'),
        estoqueMinimo: document.getElementById('estoque-minimo'),
        descricao: document.getElementById('descricao'),
        foto: document.getElementById('foto'),
        fotoPreview: document.getElementById('foto-preview'),
        fotoPreviewImg: document.getElementById('foto-preview-img'),
        
        // Botões
        btnScannerCodigo: document.getElementById('btn-scanner-codigo'),
        btnGerarCodigo: document.getElementById('btn-gerar-codigo'),
        btnNovoGrupo: document.getElementById('btn-novo-grupo'),
        btnLimpar: document.getElementById('btn-limpar'),
        btnSalvar: document.getElementById('btn-salvar'),
        
        // Tabela de produtos
        tabelaProdutos: document.getElementById('tabela-produtos'),
        buscaProdutos: document.getElementById('busca-produtos'),
        paginacao: document.getElementById('paginacao'),
        
        // Modal de scanner
        modalScanner: document.getElementById('modal-scanner'),
        btnCloseScanner: document.querySelectorAll('.btn-close-scanner'),
        scannerVideo: document.getElementById('scanner-video'),
        scannerStatus: document.getElementById('scanner-status'),
        scannerError: document.getElementById('scanner-error'),
        scannerLoading: document.getElementById('scanner-loading'),
        btnToggleTorch: document.querySelector('.btn-toggle-torch'),
        
        // Modal de novo grupo
        modalGrupo: document.getElementById('modal-grupo'),
        formGrupo: document.getElementById('form-grupo'),
        nomeGrupo: document.getElementById('nome-grupo'),
        btnSalvarGrupo: document.getElementById('btn-salvar-grupo'),
        btnsCloseModal: document.querySelectorAll('[data-dismiss="modal"]'),
        
        // Modal de confirmação
        modalConfirmacao: document.getElementById('modal-confirmacao'),
        confirmacaoMensagem: document.getElementById('confirmacao-mensagem'),
        btnConfirmar: document.getElementById('btn-confirmar'),
        
        // Elementos gerais
        btnLogout: document.getElementById('btn-logout')
    };
    
    // Estado da aplicação
    const estado = {
        produtos: [],
        grupos: [],
        paginaAtual: 1,
        itensPorPagina: 10,
        produtoEmEdicao: null,
        totalPaginas: 1,
        modoEdicao: false,
        termo: '',
        scannerAtivo: false,
        scannerIniciando: false,
        scannerStream: null,
        scannerLanternaAtiva: false,
        callback: null,
        fotoAlterada: false,
        fotoProduto: null,
        isMobile: checkIsMobile()
    };
    
    // Verificar se é dispositivo móvel
    function checkIsMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // Inicialização
    inicializar();
    
    /**
     * Inicializa o módulo de produtos
     */
    function inicializar() {
        // Configurar eventos
        configurarEventos();
        
        // Carregar dados do usuário
        carregarDadosUsuario();
        
        // Carregar dados
        carregarGrupos().then(() => {
            carregarProdutos();
            verificarParametrosURL();
        }).catch(erro => {
            console.error('Erro ao carregar dados iniciais:', erro);
            exibirMensagem('Erro ao carregar dados iniciais: ' + erro.message, 'error');
        });
        
        console.log('Módulo de produtos inicializado');
    }
    
    /**
     * Carrega dados do usuário logado
     */
    function carregarDadosUsuario() {
        try {
            const usuario = auth.getUsuarioAtual();
            
            if (!usuario) {
                throw new Error('Usuário não encontrado');
            }
            
            // Atualizar nome e função na interface
            elementos.userNameEl.textContent = usuario.nome || 'Usuário';
            elementos.userRoleEl.textContent = usuario.perfil === 'admin' ? 'Administrador' : 
                                              usuario.perfil === 'supervisor' ? 'Supervisor' : 'Vendedor';
            
            // Atualizar data
            const dataAtual = new Date();
            const opcoesFormato = { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            };
            
            elementos.currentDateEl.textContent = dataAtual.toLocaleDateString('pt-BR', opcoesFormato);
        } catch (erro) {
            console.error('Erro ao carregar dados do usuário:', erro);
        }
    }
    
    /**
     * Verifica parâmetros da URL para edição de produto
     */
    function verificarParametrosURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const produtoId = urlParams.get('id');
        const codigo = urlParams.get('codigo');
        
        if (produtoId) {
            carregarProdutoPorId(produtoId);
        } else if (codigo) {
            preencherCodigoBarras(codigo);
        }
    }
    
    /**
     * Configura eventos da interface
     */
    function configurarEventos() {
        // Formulário de produto
        elementos.formProduto.addEventListener('submit', salvarProduto);
        
        // Botões principais
        elementos.btnLimpar.addEventListener('click', limparFormulario);
        elementos.btnScannerCodigo.addEventListener('click', iniciarScanner);
        elementos.btnGerarCodigo.addEventListener('click', gerarCodigoBarras);
        elementos.btnNovoGrupo.addEventListener('click', abrirModalNovoGrupo);
        
        // Upload de foto
        elementos.foto.addEventListener('change', previewFoto);
        
        // Pesquisa de produtos
        elementos.buscaProdutos.addEventListener('input', function() {
            estado.termo = this.value;
            estado.paginaAtual = 1;
            carregarProdutos();
        });
        
        // Scanner
        elementos.btnCloseScanner.forEach(btn => {
            btn.addEventListener('click', pararScanner);
        });
        
        // Lanterna
        if (elementos.btnToggleTorch) {
            elementos.btnToggleTorch.addEventListener('click', toggleLanterna);
        }
        
        // Modal de grupo
        elementos.formGrupo.addEventListener('submit', function(e) {
            e.preventDefault();
            salvarGrupoProdutos();
        });
        
        elementos.btnSalvarGrupo.addEventListener('click', salvarGrupoProdutos);
        
        // Fechar modais
        elementos.btnsCloseModal.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) fecharModal(modal);
            });
        });
        
        // Logout
        elementos.btnLogout.addEventListener('click', function() {
            auth.fazerLogout();
            window.location.href = 'index.html';
        });
        
        // Adaptações para mobile
        if (estado.isMobile) {
            configurarEventosMobile();
        }
    }
    
    /**
     * Configura eventos específicos para dispositivos móveis
     */
    function configurarEventosMobile() {
        // Configurar scanner para tela cheia ao abrir
        elementos.btnScannerCodigo.addEventListener('click', function() {
            // Solicitar tela cheia se disponível
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            }
            
            // Solicitar orientação landscape se disponível
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(function(error) {
                    console.log('Erro ao bloquear orientação:', error);
                });
            }
        });
        
        // Restaurar orientação ao fechar scanner
        elementos.btnCloseScanner.forEach(btn => {
            btn.addEventListener('click', function() {
                // Sair da tela cheia
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                
                // Liberar orientação
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
            });
        });
        
        // Evitar scroll durante o scanner
        document.addEventListener('touchmove', function(e) {
            if (elementos.modalScanner.style.display === 'flex') {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    /**
     * Carrega a lista de grupos de produtos
     */
    async function carregarGrupos() {
        try {
            // Obter grupos do banco de dados
            const grupos = await db.getGruposProdutos();
            estado.grupos = grupos;
            
            // Limpar select
            elementos.grupo.innerHTML = '<option value="">Selecione um grupo</option>';
            
            // Ordenar alfabeticamente
            grupos.sort();
            
            // Adicionar grupos ao select
            grupos.forEach(grupo => {
                const option = document.createElement('option');
                option.value = grupo;
                option.textContent = grupo;
                elementos.grupo.appendChild(option);
            });
            
            return grupos;
        } catch (erro) {
            console.error('Erro ao carregar grupos:', erro);
            throw erro;
        }
    }
    
    /**
     * Carrega produtos e atualiza a tabela
     */
    async function carregarProdutos() {
        try {
            // Mostrar indicador de carregamento
            elementos.tabelaProdutos.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="loading-indicator">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Carregando produtos...</span>
                        </div>
                    </td>
                </tr>
            `;
            
            // Obter produtos do banco de dados
            const produtos = Object.values(db.getProdutos());
            
            // Aplicar filtro de busca
            let produtosFiltrados = produtos;
            if (estado.termo) {
                const termoBusca = estado.termo.toLowerCase();
                produtosFiltrados = produtos.filter(produto => 
                    produto.nome.toLowerCase().includes(termoBusca) ||
                    produto.codigo_barras.includes(termoBusca) ||
                    (produto.grupo && produto.grupo.toLowerCase().includes(termoBusca))
                );
            }
            
            // Ordenar por nome
            produtosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
            
            // Atualizar estado
            estado.produtos = produtosFiltrados;
            estado.totalPaginas = Math.ceil(produtosFiltrados.length / estado.itensPorPagina);
            
            // Verificar página atual
            if (estado.paginaAtual > estado.totalPaginas) {
                estado.paginaAtual = Math.max(1, estado.totalPaginas);
            }
            
            // Paginação
            const inicio = (estado.paginaAtual - 1) * estado.itensPorPagina;
            const fim = inicio + estado.itensPorPagina;
            const produtosPagina = produtosFiltrados.slice(inicio, fim);
            
            // Limpar tabela
            elementos.tabelaProdutos.innerHTML = '';
            
            if (produtosPagina.length === 0) {
                elementos.tabelaProdutos.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            <p>Nenhum produto encontrado</p>
                        </td>
                    </tr>
                `;
            } else {
                // Adicionar produtos à tabela
                produtosPagina.forEach(produto => {
                    const tr = document.createElement('tr');
                    
                    // Status de estoque
                    let estoqueStatus = '';
                    if (produto.estoque <= 0) {
                        estoqueStatus = 'estoque-baixo';
                    } else if (produto.estoque_minimo && produto.estoque <= produto.estoque_minimo) {
                        estoqueStatus = 'estoque-medio';
                    } else {
                        estoqueStatus = 'estoque-alto';
                    }
                    
                    tr.innerHTML = `
                        <td>${produto.codigo_barras}</td>
                        <td>${produto.nome}</td>
                        <td>R$ ${produto.preco.toFixed(2)}</td>
                        <td class="${estoqueStatus}">${produto.estoque}</td>
                        <td>
                            <button class="btn-action btn-edit" data-codigo="${produto.codigo_barras}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" data-codigo="${produto.codigo_barras}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    
                    elementos.tabelaProdutos.appendChild(tr);
                });
                
                // Adicionar eventos aos botões
                document.querySelectorAll('.btn-edit').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const codigo = this.getAttribute('data-codigo');
                        editarProduto(codigo);
                    });
                });
                
                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const codigo = this.getAttribute('data-codigo');
                        confirmarExclusao(codigo);
                    });
                });
            }
            
            // Atualizar paginação
            atualizarPaginacao();
        } catch (erro) {
            console.error('Erro ao carregar produtos:', erro);
            elementos.tabelaProdutos.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <p>Erro ao carregar produtos: ${erro.message}</p>
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Atualiza controles de paginação
     */
    function atualizarPaginacao() {
        const paginacao = elementos.paginacao;
        paginacao.innerHTML = '';
        
        if (estado.totalPaginas <= 1) {
            return;
        }
        
        // Botão anterior
        const liAnterior = document.createElement('li');
        liAnterior.className = `page-item ${estado.paginaAtual === 1 ? 'disabled' : ''}`;
        liAnterior.innerHTML = `
            <a class="page-link" href="#" aria-label="Anterior">
                <i class="fas fa-chevron-left"></i>
            </a>
        `;
        
        if (estado.paginaAtual > 1) {
            liAnterior.querySelector('a').addEventListener('click', function(e) {
                e.preventDefault();
                mudarPagina(estado.paginaAtual - 1);
            });
        }
        
        paginacao.appendChild(liAnterior);
        
        // Páginas numéricas
        let paginaInicial = Math.max(1, estado.paginaAtual - 2);
        let paginaFinal = Math.min(estado.totalPaginas, paginaInicial + 4);
        
        if (paginaFinal - paginaInicial < 4) {
            paginaInicial = Math.max(1, paginaFinal - 4);
        }
        
        for (let i = paginaInicial; i <= paginaFinal; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === estado.paginaAtual ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            
            li.querySelector('a').addEventListener('click', function(e) {
                e.preventDefault();
                mudarPagina(i);
            });
            
            paginacao.appendChild(li);
        }
        
        // Botão próximo
        const liProximo = document.createElement('li');
        liProximo.className = `page-item ${estado.paginaAtual === estado.totalPaginas ? 'disabled' : ''}`;
        liProximo.innerHTML = `
            <a class="page-link" href="#" aria-label="Próximo">
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        
        if (estado.paginaAtual < estado.totalPaginas) {
            liProximo.querySelector('a').addEventListener('click', function(e) {
                e.preventDefault();
                mudarPagina(estado.paginaAtual + 1);
            });
        }
        
        paginacao.appendChild(liProximo);
    }
    
    /**
     * Muda para uma página específica
     */
    function mudarPagina(pagina) {
        if (pagina < 1 || pagina > estado.totalPaginas) {
            return;
        }
        
        estado.paginaAtual = pagina;
        carregarProdutos();
        window.scrollTo(0, 0);
    }
    
    /**
     * Salva um produto
     */
    function salvarProduto(e) {
        if (e) e.preventDefault();
        
        try {
            // Obter dados do formulário
            const produto = {
                id: elementos.produtoId.value || null,
                codigo_barras: elementos.codigoBarras.value.trim(),
                nome: elementos.nome.value.trim(),
                preco: parseFloat(elementos.preco.value),
                grupo: elementos.grupo.value,
                estoque: parseInt(elementos.estoque.value) || 0,
                estoque_minimo: parseInt(elementos.estoqueMinimo.value) || 0,
                descricao: elementos.descricao.value.trim()
            };
            
            // Validar campos obrigatórios
            if (!produto.codigo_barras) {
                throw new Error('Código de barras é obrigatório');
            }
            
            if (!produto.nome) {
                throw new Error('Nome do produto é obrigatório');
            }
            
            if (isNaN(produto.preco) || produto.preco <= 0) {
                throw new Error('Preço deve ser um número positivo');
            }
            
            // Processar foto
            if (estado.fotoAlterada && estado.fotoProduto) {
                produto.foto = estado.fotoProduto;
            } else if (estado.produtoEmEdicao && estado.produtoEmEdicao.foto) {
                produto.foto = estado.produtoEmEdicao.foto;
            }
            
            // Incluir ID se estiver editando
            if (estado.modoEdicao && estado.produtoEmEdicao) {
                produto.id = estado.produtoEmEdicao.id;
            }
            
            // Salvar produto
            const resultado = db.salvarProduto(produto);
            
            // Feedback ao usuário
            exibirMensagem(`Produto ${estado.modoEdicao ? 'atualizado' : 'cadastrado'} com sucesso!`, 'success');
            
            // Atualizar lista e limpar formulário
            carregarProdutos();
            limparFormulario();
            
            return resultado;
        } catch (erro) {
            console.error('Erro ao salvar produto:', erro);
            exibirMensagem('Erro ao salvar produto: ' + erro.message, 'error');
            return null;
        }
    }
    
    /**
     * Preenche o campo de código de barras
     */
    function preencherCodigoBarras(codigo) {
        if (!codigo) return;
        
        elementos.codigoBarras.value = codigo;
        
        // Verificar se código já existe
        const produto = db.getProduto(codigo);
        
        if (produto) {
            // Produto existe, preencher formulário para edição
            editarProduto(codigo);
        } else {
            // Novo produto com código informado
            limparFormulario();
            elementos.codigoBarras.value = codigo;
            elementos.nome.focus();
        }
    }
    
    /**
     * Abre o formulário para edição de um produto
     */
    function editarProduto(codigoBarras) {
        try {
            const produto = db.getProduto(codigoBarras);
            
            if (!produto) {
                throw new Error('Produto não encontrado');
            }
            
            // Ativar modo de edição
            estado.modoEdicao = true;
            estado.produtoEmEdicao = produto;
            
            // Atualizar título do formulário
            elementos.formTitle.textContent = 'Editar Produto';
            
            // Preencher campos
            elementos.produtoId.value = produto.id || '';
            elementos.codigoBarras.value = produto.codigo_barras;
            elementos.nome.value = produto.nome;
            elementos.preco.value = produto.preco;
            elementos.grupo.value = produto.grupo || '';
            elementos.estoque.value = produto.estoque;
            elementos.estoqueMinimo.value = produto.estoque_minimo || 0;
            elementos.descricao.value = produto.descricao || '';
            
            // Preencher preview de foto
            if (produto.foto) {
                elementos.fotoPreviewImg.src = produto.foto;
                elementos.fotoPreview.style.display = 'block';
            } else {
                elementos.fotoPreview.style.display = 'none';
            }
            
            // Resetar estado de foto
            estado.fotoAlterada = false;
            estado.fotoProduto = null;
            
            // Scroll para o formulário
            elementos.formProduto.scrollIntoView({ behavior: 'smooth' });
            
            // Foco no nome
            elementos.nome.focus();
        } catch (erro) {
            console.error('Erro ao editar produto:', erro);
            exibirMensagem('Erro ao editar produto: ' + erro.message, 'error');
        }
    }
    
    /**
     * Carrega um produto pelo ID interno
     */
    function carregarProdutoPorId(id) {
        try {
            const produto = db.getProdutoPorId(id);
            
            if (produto) {
                editarProduto(produto.codigo_barras);
            } else {
                exibirMensagem('Produto não encontrado', 'error');
            }
        } catch (erro) {
            console.error('Erro ao carregar produto por ID:', erro);
            exibirMensagem('Erro ao carregar produto: ' + erro.message, 'error');
        }
    }
    
    /**
     * Confirma exclusão de um produto
     */
    function confirmarExclusao(codigoBarras) {
        try {
            const produto = db.getProduto(codigoBarras);
            
            if (!produto) {
                throw new Error('Produto não encontrado');
            }
            
            // Configurar modal de confirmação
            elementos.confirmacaoMensagem.textContent = `Tem certeza que deseja excluir o produto "${produto.nome}"?`;
            
            // Mostrar modal
            elementos.modalConfirmacao.style.display = 'flex';
            
            // Configurar botão de confirmação
            elementos.btnConfirmar.onclick = function() {
                excluirProduto(codigoBarras);
                fecharModal(elementos.modalConfirmacao);
            };
        } catch (erro) {
            console.error('Erro ao confirmar exclusão:', erro);
            exibirMensagem('Erro ao confirmar exclusão: ' + erro.message, 'error');
        }
    }
    
    /**
     * Exclui um produto
     */
    function excluirProduto(codigoBarras) {
        try {
            const resultado = db.removerProduto(codigoBarras);
            
            if (resultado) {
                exibirMensagem('Produto excluído com sucesso', 'success');
                carregarProdutos();
                
                // Se o produto excluído está em edição, limpar formulário
                if (estado.produtoEmEdicao && estado.produtoEmEdicao.codigo_barras === codigoBarras) {
                    limparFormulario();
                }
            } else {
                exibirMensagem('Não foi possível excluir o produto', 'error');
            }
        } catch (erro) {
            console.error('Erro ao excluir produto:', erro);
            exibirMensagem('Erro ao excluir produto: ' + erro.message, 'error');
        }
    }
    
    /**
     * Limpa o formulário de produto
     */
    function limparFormulario() {
        elementos.formProduto.reset();
        elementos.produtoId.value = '';
        elementos.fotoPreview.style.display = 'none';
        
        // Resetar estado
        estado.modoEdicao = false;
        estado.produtoEmEdicao = null;
        estado.fotoAlterada = false;
        estado.fotoProduto = null;
        
        // Atualizar título
        elementos.formTitle.textContent = 'Cadastrar Novo Produto';
        
        // Focar no código de barras
        elementos.codigoBarras.focus();
    }
    
    /**
     * Inicia o scanner de código de barras
     */
    function iniciarScanner() {
        // Definir callback para receber o código
        estado.callback = function(codigo) {
            preencherCodigoBarras(codigo);
            
            // Reproduzir som de sucesso
            const beepSuccess = document.getElementById('beep-success');
            if (beepSuccess) beepSuccess.play();
        };
        
        // Exibir modal
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
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            navigator.mediaDevices.getUserMedia(constraints)
                .then(stream => {
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
