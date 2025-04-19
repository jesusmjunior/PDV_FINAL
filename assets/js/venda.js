/**
 * ORION PDV - Sistema de Vendas
 * 
 * Este módulo implementa:
 * - Interface de PDV para registro de vendas
 * - Manipulação de carrinho de compras
 * - Finalização de venda
 * - Geração de recibo
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
    document.getElementById('user-role').textContent = user.perfil === 'admin' ? 'Administrador' : user.perfil === 'supervisor' ? 'Supervisor' : 'Vendedor';
    
    // Data atual
    const dataAtual = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = dataAtual.toLocaleDateString('pt-BR', options);
    
    // Elementos DOM - Geral
    const tabProdutos = document.getElementById('tab-produtos');
    const tabScanner = document.getElementById('tab-scanner');
    const tabConteudoProdutos = document.getElementById('tab-conteudo-produtos');
    const tabConteudoScanner = document.getElementById('tab-conteudo-scanner');
    
    // Elementos DOM - Produtos
    const filtroGrupoSelect = document.getElementById('filtro-grupo');
    const buscaProdutoInput = document.getElementById('busca-produto');
    const listaProdutos = document.getElementById('lista-produtos');
    
    // Elementos DOM - Scanner
    const codigoBarrasInput = document.getElementById('codigo-barras');
    const btnBuscarCodigo = document.getElementById('btn-buscar-codigo');
    const resultadoScanner = document.getElementById('resultado-scanner');
    const btnScannerCodigo = document.getElementById('btn-scanner-codigo');
    const btnGerarCodigo = document.getElementById('btn-gerar-codigo');
    
    // Elementos DOM - Carrinho
    const carrinhoItens = document.getElementById('carrinho-itens');
    const carrinhoVazio = document.getElementById('carrinho-vazio');
    const subtotalEl = document.getElementById('subtotal');
    const descontoInput = document.getElementById('desconto');
    const totalEl = document.getElementById('total');
    const clienteSelect = document.getElementById('cliente');
    const formaPagamentoSelect = document.getElementById('forma-pagamento');
    const btnFinalizar = document.getElementById('btn-finalizar');
    
    // Elementos DOM - Modal de Recibo
    const modalRecibo = document.getElementById('modal-recibo');
    const reciboConteudo = document.getElementById('recibo-conteudo');
    const btnCloseRecibo = document.querySelectorAll('.btn-close-recibo');
    const btnImprimir = document.getElementById('btn-imprimir');
    const btnNovaVenda = document.getElementById('btn-nova-venda');
    
    // Variáveis de controle
    let carrinho = [];
    let subtotal = 0;
    let desconto = 0;
    let total = 0;
    
    // Carregar dados iniciais
    carregarGrupos();
    carregarClientes();
    carregarFormasPagamento();
    carregarProdutos();
    inicializarCarrinho();
    
    // Event Listeners - Abas
    tabProdutos.addEventListener('click', function() {
        ativarAba('produtos');
    });
    
    tabScanner.addEventListener('click', function() {
        ativarAba('scanner');
    });
    
    // Event Listeners - Produtos
    filtroGrupoSelect.addEventListener('change', carregarProdutos);
    buscaProdutoInput.addEventListener('input', carregarProdutos);
    
    // Event Listeners - Scanner
    btnBuscarCodigo.addEventListener('click', function() {
        const codigo = codigoBarrasInput.value.trim();
        
        if (codigo) {
            buscarProdutoPorCodigo(codigo);
        } else {
            resultadoScanner.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Por favor, digite um código de barras válido.
                </div>
            `;
        }
    });
    
    // Evento para buscar produto ao pressionar Enter
    codigoBarrasInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const codigo = this.value.trim();
            
            if (codigo) {
                buscarProdutoPorCodigo(codigo);
            }
        }
    });
    
    // Event Listeners para Scanner
    btnScannerCodigo.addEventListener('click', function() {
        try {
            // Verificar se temos acesso à função de scanner
            if (typeof window.barcodeSystem !== 'undefined') {
                // Abrir o modal do scanner
                document.getElementById('modal-scanner').style.display = 'flex';
                
                // Iniciar o scanner
                window.barcodeSystem.startScanner('scanner-video', function(code) {
                    // Reproduzir som de sucesso
                    const beepSuccess = document.getElementById('beep-success');
                    beepSuccess.play();
                    
                    // Fechar scanner
                    document.getElementById('modal-scanner').style.display = 'none';
                    window.barcodeSystem.stopScanner();
                    
                    // Preencher campo e buscar produto
                    codigoBarrasInput.value = code;
                    buscarProdutoPorCodigo(code);
                });
            } else {
                // Fallback para scanner nativo se disponível
                if (typeof barcodeScanner !== 'undefined') {
                    document.getElementById('modal-scanner').style.display = 'flex';
                    
                    barcodeScanner.inicializar('scanner-video', function(code) {
                        document.getElementById('modal-scanner').style.display = 'none';
                        barcodeScanner.parar();
                        
                        codigoBarrasInput.value = code;
                        buscarProdutoPorCodigo(code);
                    });
                } else {
                    throw new Error('Scanner de código de barras não disponível');
                }
            }
        } catch (error) {
            console.error('Erro ao inicializar scanner:', error);
            exibirMensagem('Erro ao inicializar scanner: ' + error.message, 'error');
        }
    });
    
    btnGerarCodigo.addEventListener('click', function() {
        // Gerar código de barras aleatório
        let codigo;
        
        if (typeof window.barcodeSystem !== 'undefined' && typeof window.barcodeSystem.generateEAN13 === 'function') {
            codigo = window.barcodeSystem.generateEAN13();
        } else if (typeof gerarCodigoBarras === 'function') {
            codigo = gerarCodigoBarras();
        } else {
            // Implementação fallback
            codigo = '789' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
        }
        
        codigoBarrasInput.value = codigo;
        exibirMensagem('Código de barras gerado', 'success');
    });
    
    // Fechar scanner
    document.querySelectorAll('.btn-close-scanner').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('modal-scanner').style.display = 'none';
            
            // Parar scanner de acordo com a implementação disponível
            if (typeof window.barcodeSystem !== 'undefined') {
                window.barcodeSystem.stopScanner();
            } else if (typeof barcodeScanner !== 'undefined') {
                barcodeScanner.parar();
            }
        });
    });
    
    // Event Listeners - Carrinho
    descontoInput.addEventListener('input', function() {
        atualizarTotais();
    });
    
    btnFinalizar.addEventListener('click', finalizarVenda);
    
    // Event Listeners - Modal de Recibo
    btnCloseRecibo.forEach(btn => {
        btn.addEventListener('click', function() {
            modalRecibo.classList.remove('show');
            setTimeout(() => {
                modalRecibo.style.display = 'none';
            }, 300);
        });
    });
    
    btnImprimir.addEventListener('click', imprimirRecibo);
    
    btnNovaVenda.addEventListener('click', function() {
        // Fechar modal
        modalRecibo.classList.remove('show');
        setTimeout(() => {
            modalRecibo.style.display = 'none';
        }, 300);
        
        // Limpar carrinho
        limparCarrinho();
    });
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', function() {
        auth.fazerLogout();
        window.location.href = 'index.html';
    });
    
    // ========== FUNÇÕES ==========
    
    function ativarAba(aba) {
        // Desativar todas as abas
        tabProdutos.classList.remove('active');
        tabScanner.classList.remove('active');
        
        // Ocultar todos os conteúdos
        tabConteudoProdutos.style.display = 'none';
        tabConteudoScanner.style.display = 'none';
        
        // Ativar aba selecionada
        if (aba === 'produtos') {
            tabProdutos.classList.add('active');
            tabConteudoProdutos.style.display = 'block';
        } else if (aba === 'scanner') {
            tabScanner.classList.add('active');
            tabConteudoScanner.style.display = 'block';
            codigoBarrasInput.focus();
        }
    }
    
    function carregarGrupos() {
        // Obter grupos de produtos
        let grupos = [];
        
        // Verificar se há método específico no db
        if (typeof db.getGruposProdutos === 'function') {
            grupos = db.getGruposProdutos();
        } else {
            // Extrair grupos dos produtos
            const produtos = db.getProdutos();
            const gruposSet = new Set();
            
            Object.values(produtos).forEach(produto => {
                if (produto.grupo) {
                    gruposSet.add(produto.grupo);
                }
            });
            
            grupos = [...gruposSet].sort();
        }
        
        // Preencher select
        filtroGrupoSelect.innerHTML = '<option value="">Todos os Grupos</option>';
        
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo;
            option.textContent = grupo;
            filtroGrupoSelect.appendChild(option);
        });
    }
    
    function carregarClientes() {
        // Obter clientes
        const clientes = db.getClientes();
        
        // Preencher select
        clienteSelect.innerHTML = '';
        
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            clienteSelect.appendChild(option);
        });
    }
    
    function carregarFormasPagamento() {
        // Formas de pagamento disponíveis
        const formasPagamento = [
            { valor: 'dinheiro', nome: 'Dinheiro' },
            { valor: 'cartao_credito', nome: 'Cartão de Crédito' },
            { valor: 'cartao_debito', nome: 'Cartão de Débito' },
            { valor: 'pix', nome: 'PIX' },
            { valor: 'boleto', nome: 'Boleto Bancário' },
            { valor: 'transferencia', nome: 'Transferência Bancária' },
            { valor: 'cheque', nome: 'Cheque' },
            { valor: 'credito_loja', nome: 'Crédito na Loja' }
        ];
        
        // Preencher select
        formaPagamentoSelect.innerHTML = '';
        
        formasPagamento.forEach(forma => {
            const option = document.createElement('option');
            option.value = forma.valor;
            option.textContent = forma.nome;
            formaPagamentoSelect.appendChild(option);
        });
    }
    
    function carregarProdutos() {
        // Obter produtos
        const produtos = db.getProdutos();
        
        // Filtros
        const termoBusca = buscaProdutoInput.value.toLowerCase();
        const grupoFiltro = filtroGrupoSelect.value;
        
        // Limpar lista
        listaProdutos.innerHTML = '';
        
        // Filtrar produtos
        const produtosFiltrados = Object.values(produtos).filter(produto => {
            // Verificar estoque
            if (produto.estoque <= 0) {
                return false;
            }
            
            // Filtro de busca
            const matchBusca = termoBusca === '' || 
                produto.nome.toLowerCase().includes(termoBusca) || 
                (produto.codigo_barras && produto.codigo_barras.toLowerCase().includes(termoBusca));
            
            // Filtro de grupo
            const matchGrupo = grupoFiltro === '' || produto.grupo === grupoFiltro;
            
            return matchBusca && matchGrupo;
        });
        
        // Ordenar por nome
        produtosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adicionar produtos à lista
        produtosFiltrados.forEach(produto => {
            const produtoEl = document.createElement('div');
            produtoEl.className = 'produto-card';
            produtoEl.dataset.id = produto.id;
            
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
                adicionarAoCarrinho(produto);
            });
            
            listaProdutos.appendChild(produtoEl);
        });
        
        // Exibir mensagem se não houver produtos
        if (produtosFiltrados.length === 0) {
            listaProdutos.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0; color: var(--text-muted);">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Nenhum produto encontrado</p>
                </div>
            `;
        }
    }
    
    function buscarProdutoPorCodigo(codigo) {
        // Buscar produto pelo código de barras
        const produtos = db.getProdutos();
        const produto = Object.values(produtos).find(p => p.codigo_barras === codigo);
        
        if (produto) {
            // Verificar estoque
            if (produto.estoque <= 0) {
                resultadoScanner.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i> Produto <strong>${produto.nome}</strong> está sem estoque.
                    </div>
                `;
                return;
            }
            
            // Exibir informações do produto
            resultadoScanner.innerHTML = `
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
                                <p class="text-muted mb-1">Código: ${produto.codigo_barras}</p>
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
                    adicionarAoCarrinho(produto, quantidade);
                    
                    // Limpar resultado
                    resultadoScanner.innerHTML = `
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i> Produto <strong>${produto.nome}</strong> adicionado ao carrinho.
                        </div>
                    `;
                    
                    // Limpar campo de código
                    codigoBarrasInput.value = '';
                    codigoBarrasInput.focus();
                } else {
                    exibirMensagem('Por favor, informe uma quantidade válida', 'error');
                }
            });
        } else {
            // Produto não encontrado
            resultadoScanner.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> Produto não encontrado para o código <strong>${codigo}</strong>.
                </div>
                
                <div class="text-center mt-3">
                    <a href="produto.html?codigo=${codigo}" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Cadastrar Novo Produto
                    </a>
                </div>
            `;
        }
    }
    
    function inicializarCarrinho() {
        // Verificar se existe um carrinho salvo no localStorage
        const carrinhoSalvo = localStorage.getItem('orion_carrinho');
        
        if (carrinhoSalvo) {
            try {
                carrinho = JSON.parse(carrinhoSalvo);
            } catch (erro) {
                console.error('Erro ao carregar carrinho:', erro);
                carrinho = [];
            }
        }
        
        atualizarCarrinho();
    }
    
    function salvarCarrinho() {
        // Salvar carrinho no localStorage
        localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
    }
    
    function adicionarAoCarrinho(produto, quantidade = 1) {
        // Verificar se a quantidade é válida
        if (quantidade <= 0 || quantidade > produto.estoque) {
            exibirMensagem(`Quantidade inválida. Estoque disponível: ${produto.estoque}`, 'error');
            return false;
        }
        
        // Verificar se o produto já está no carrinho
        const itemIndex = carrinho.findIndex(item => item.produto_id === produto.id);
        
        if (itemIndex !== -1) {
            // Atualizar quantidade
            const novaQuantidade = carrinho[itemIndex].quantidade + quantidade;
            
            if (novaQuantidade > produto.estoque) {
                exibirMensagem(`Quantidade excede o estoque disponível: ${produto.estoque}`, 'error');
                return false;
            }
            
            carrinho[itemIndex].quantidade = novaQuantidade;
            carrinho[itemIndex].subtotal = produto.preco * novaQuantidade;
        } else {
            // Adicionar novo item
            carrinho.push({
                produto_id: produto.id,
                codigo_barras: produto.codigo_barras,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: quantidade,
                foto: produto.foto || '',
                subtotal: produto.preco * quantidade
            });
        }
        
        // Salvar e atualizar
        salvarCarrinho();
        atualizarCarrinho();
        
        // Exibir mensagem
        exibirMensagem(`${produto.nome} adicionado ao carrinho`, 'success');
        
        // Reproduzir som de sucesso
        const beepSuccess = document.getElementById('beep-success');
        beepSuccess.play().catch(err => console.log("Erro ao reproduzir som", err));
        
        return true;
    }
    
    function removerDoCarrinho(produtoId) {
        // Encontrar o índice do item no carrinho
        const itemIndex = carrinho.findIndex(item => item.produto_id === produtoId);
        
        if (itemIndex !== -1) {
            // Remover do carrinho
            carrinho.splice(itemIndex, 1);
            
            // Salvar e atualizar
            salvarCarrinho();
            atualizarCarrinho();
            
            return true;
        }
        
        return false;
    }
    
    function atualizarQuantidadeCarrinho(produtoId, quantidade) {
        // Verificar se a quantidade é válida
        if (quantidade <= 0) {
            // Remover do carrinho
            return removerDoCarrinho(produtoId);
        }
        
        // Buscar produto para verificar estoque
        const produtos = db.getProdutos();
        const produto = produtos[produtoId];
        
        if (produto && quantidade > produto.estoque) {
            exibirMensagem(`Quantidade maior que o estoque disponível (${produto.estoque})`, 'error');
            return false;
        }
        
        // Encontrar o item no carrinho
        const itemIndex = carrinho.findIndex(item => item.produto_id === produtoId);
        
        if (itemIndex !== -1) {
            // Atualizar quantidade
            carrinho[itemIndex].quantidade = quantidade;
            carrinho[itemIndex].subtotal = carrinho[itemIndex].preco * quantidade;
            
            // Salvar e atualizar
            salvarCarrinho();
            atualizarCarrinho();
            
            return true;
        }
        
        return false;
    }
    
    function atualizarCarrinho() {
        // Exibir mensagem de carrinho vazio se não houver itens
        if (carrinho.length === 0) {
            carrinhoVazio.style.display = 'block';
            carrinhoItens.innerHTML = '';
            subtotal = 0;
            atualizarTotais();
            btnFinalizar.disabled = true;
            return;
        }
        
        // Ocultar mensagem de carrinho vazio
        carrinhoVazio.style.display = 'none';
        
        // Limpar lista de itens
        carrinhoItens.innerHTML = '';
        
        // Adicionar itens ao carrinho
        carrinho.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'carrinho-item';
            
            itemEl.innerHTML = `
                <div class="carrinho-img">
                    ${item.foto ? `<img src="${item.foto}" alt="${item.nome}">` : `<i class="fas fa-box" style="font-size: 1.5rem; color: var(--primary);"></i>`}
                </div>
                <div class="carrinho-info">
                    <div class="carrinho-nome">${item.nome}</div>
                    <div class="carrinho-detalhes">
                        <div>R$ ${item.preco.toFixed(2)} × 
                            <input type="number" class="qtd-input" data-id="${item.produto_id}" value="${item.quantidade}" min="1" max="99">
                        </div>
                        <div>R$ ${item.subtotal.toFixed(2)}</div>
                    </div>
                </div>
                <button class="btn-remove" data-id="${item.produto_id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            carrinhoItens.appendChild(itemEl);
        });
        
        // Adicionar eventos aos inputs de quantidade
        document.querySelectorAll('.qtd-input').forEach(input => {
            input.addEventListener('change', function() {
                const produtoId = this.getAttribute('data-id');
                const quantidade = parseInt(this.value);
                
                atualizarQuantidadeCarrinho(produtoId, quantidade);
            });
        });
        
        // Adicionar eventos aos botões de remover
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const produtoId = this.getAttribute('data-id');
                removerDoCarrinho(produtoId);
            });
        });
        
        // Calcular subtotal
        subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
        
        // Atualizar totais
        atualizarTotais();
    }
    
    function atualizarTotais() {
        // Obter percentual de desconto
        const percentualDesconto = parseFloat(descontoInput.value) || 0;
        
        // Calcular desconto
        desconto = (subtotal * percentualDesconto) / 100;
        
        // Calcular total
        total = subtotal - desconto;
        
        // Atualizar elementos
        subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
        totalEl.textContent = `R$ ${total.toFixed(2)}`;
        
        // Desabilitar botão de finalizar se não houver itens ou total for zero
        btnFinalizar.disabled = carrinho.length === 0 || total <= 0;
    }
    
    function limparCarrinho() {
        // Limpar carrinho
        carrinho = [];
        
        // Salvar e atualizar
        salvarCarrinho();
        atualizarCarrinho();
        
        // Desabilitar botão de finalizar
        btnFinalizar.disabled = true;
    }
    
    function finalizarVenda() {
        // Verificar se há itens no carrinho
        if (carrinho.length === 0) {
            exibirMensagem('Não há itens no carrinho', 'error');
            return;
        }
        
        // Verificar se o total é maior que zero
        if (total <= 0) {
            exibirMensagem('O valor total da venda deve ser maior que zero', 'error');
            return;
        }
        
        try {
            // Obter cliente selecionado
            const clienteId = clienteSelect.value;
            const clientes = db.getClientes();
            const cliente = clientes.find(c => c.id === clienteId);
            
            if (!cliente) {
                exibirMensagem('Cliente não encontrado', 'error');
                return;
            }
            
            // Obter forma de pagamento
            const formaPagamento = formaPagamentoSelect.value;
            const formaPagamentoTexto = formaPagamentoSelect.options[formaPagamentoSelect.selectedIndex].text;
            
            // Dados da venda
            const venda = {
                id: Date.now().toString(),
                cliente_id: cliente.id,
                cliente_nome: cliente.nome,
                forma_pagamento: formaPagamentoTexto,
                forma_pagamento_id: formaPagamento,
                itens: [...carrinho],
                subtotal: subtotal,
                desconto: desconto,
                total: total,
                usuario: user.nome,
                data: new Date().toISOString()
            };
            
            // Atualizar estoque
            const produtos = db.getProdutos();
            
            // Verificar se todos os produtos ainda têm estoque suficiente
            const estoqueInsuficiente = venda.itens.some(item => {
                const produto = produtos[item.produto_id];
                return produto && produto.estoque < item.quantidade;
            });
            
            if (estoqueInsuficiente) {
                exibirMensagem('Estoque insuficiente para alguns produtos. Verifique as quantidades.', 'error');
                return;
            }
            
            // Atualizar estoque de cada produto
            venda.itens.forEach(item => {
                const produto = produtos[item.produto_id];
                if (produto) {
                    produto.estoque -= item.quantidade;
                    db.salvarProduto(produto);
                }
            });
            
            // Registrar venda
            db.salvarVenda(venda);
            
            // Exibir recibo
            exibirRecibo(venda);
            
            // Mensagem de sucesso
            exibirMensagem('Venda finalizada com suc
                           /**
 * ORION PDV - Sistema de Vendas
 * 
 * Este módulo implementa:
 * - Interface de PDV para registro de vendas
 * - Manipulação de carrinho de compras
 * - Finalização de venda
 * - Geração de recibo
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
    document.getElementById('user-role').textContent = user.perfil === 'admin' ? 'Administrador' : user.perfil === 'supervisor' ? 'Supervisor' : 'Vendedor';
    
    // Data atual
    const dataAtual = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = dataAtual.toLocaleDateString('pt-BR', options);
    
    // Elementos DOM - Geral
    const tabProdutos = document.getElementById('tab-produtos');
    const tabScanner = document.getElementById('tab-scanner');
    const tabConteudoProdutos = document.getElementById('tab-conteudo-produtos');
    const tabConteudoScanner = document.getElementById('tab-conteudo-scanner');
    
    // Elementos DOM - Produtos
    const filtroGrupoSelect = document.getElementById('filtro-grupo');
    const buscaProdutoInput = document.getElementById('busca-produto');
    const listaProdutos = document.getElementById('lista-produtos');
    
    // Elementos DOM - Scanner
    const codigoBarrasInput = document.getElementById('codigo-barras');
    const btnBuscarCodigo = document.getElementById('btn-buscar-codigo');
    const resultadoScanner = document.getElementById('resultado-scanner');
    const btnScannerCodigo = document.getElementById('btn-scanner-codigo');
    const btnGerarCodigo = document.getElementById('btn-gerar-codigo');
    
    // Elementos DOM - Carrinho
    const carrinhoItens = document.getElementById('carrinho-itens');
    const carrinhoVazio = document.getElementById('carrinho-vazio');
    const subtotalEl = document.getElementById('subtotal');
    const descontoInput = document.getElementById('desconto');
    const totalEl = document.getElementById('total');
    const clienteSelect = document.getElementById('cliente');
    const formaPagamentoSelect = document.getElementById('forma-pagamento');
    const btnFinalizar = document.getElementById('btn-finalizar');
    
    // Elementos DOM - Modal de Recibo
    const modalRecibo = document.getElementById('modal-recibo');
    const reciboConteudo = document.getElementById('recibo-conteudo');
    const btnCloseRecibo = document.querySelectorAll('.btn-close-recibo');
    const btnImprimir = document.getElementById('btn-imprimir');
    const btnNovaVenda = document.getElementById('btn-nova-venda');
    
    // Variáveis de controle
    let carrinho = [];
    let subtotal = 0;
    let desconto = 0;
    let total = 0;
    
    // Carregar dados iniciais
    carregarGrupos();
    carregarClientes();
    carregarFormasPagamento();
    carregarProdutos();
    inicializarCarrinho();
    
    // Event Listeners - Abas
    tabProdutos.addEventListener('click', function() {
        ativarAba('produtos');
    });
    
    tabScanner.addEventListener('click', function() {
        ativarAba('scanner');
    });
    
    // Event Listeners - Produtos
    filtroGrupoSelect.addEventListener('change', carregarProdutos);
    buscaProdutoInput.addEventListener('input', carregarProdutos);
    
    // Event Listeners - Scanner
    btnBuscarCodigo.addEventListener('click', function() {
        const codigo = codigoBarrasInput.value.trim();
        
        if (codigo) {
            buscarProdutoPorCodigo(codigo);
        } else {
            resultadoScanner.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Por favor, digite um código de barras válido.
                </div>
            `;
        }
    });
    
    // Evento para buscar produto ao pressionar Enter
    codigoBarrasInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const codigo = this.value.trim();
            
            if (codigo) {
                buscarProdutoPorCodigo(codigo);
            }
        }
    });
    
    // Event Listeners para Scanner
    btnScannerCodigo.addEventListener('click', function() {
        try {
            // Verificar se temos acesso à função de scanner
            if (typeof window.barcodeSystem !== 'undefined') {
                // Abrir o modal do scanner
                document.getElementById('modal-scanner').style.display = 'flex';
                
                // Iniciar o scanner
                window.barcodeSystem.startScanner('scanner-video', function(code) {
                    // Reproduzir som de sucesso
                    const beepSuccess = document.getElementById('beep-success');
                    beepSuccess.play();
                    
                    // Fechar scanner
                    document.getElementById('modal-scanner').style.display = 'none';
                    window.barcodeSystem.stopScanner();
                    
                    // Preencher campo e buscar produto
                    codigoBarrasInput.value = code;
                    buscarProdutoPorCodigo(code);
                });
            } else {
                // Fallback para scanner nativo se disponível
                if (typeof barcodeScanner !== 'undefined') {
                    document.getElementById('modal-scanner').style.display = 'flex';
                    
                    barcodeScanner.inicializar('scanner-video', function(code) {
                        document.getElementById('modal-scanner').style.display = 'none';
                        barcodeScanner.parar();
                        
                        codigoBarrasInput.value = code;
                        buscarProdutoPorCodigo(code);
                    });
                } else {
                    throw new Error('Scanner de código de barras não disponível');
                }
            }
        } catch (error) {
            console.error('Erro ao inicializar scanner:', error);
            exibirMensagem('Erro ao inicializar scanner: ' + error.message, 'error');
        }
    });
    
    btnGerarCodigo.addEventListener('click', function() {
        // Gerar código de barras aleatório
        let codigo;
        
        if (typeof window.barcodeSystem !== 'undefined' && typeof window.barcodeSystem.generateEAN13 === 'function') {
            codigo = window.barcodeSystem.generateEAN13();
        } else if (typeof gerarCodigoBarras === 'function') {
            codigo = gerarCodigoBarras();
        } else {
            // Implementação fallback
            codigo = '789' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
        }
        
        codigoBarrasInput.value = codigo;
        exibirMensagem('Código de barras gerado', 'success');
    });
    
    // Fechar scanner
    document.querySelectorAll('.btn-close-scanner').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('modal-scanner').style.display = 'none';
            
            // Parar scanner de acordo com a implementação disponível
            if (typeof window.barcodeSystem !== 'undefined') {
                window.barcodeSystem.stopScanner();
            } else if (typeof barcodeScanner !== 'undefined') {
                barcodeScanner.parar();
            }
        });
    });
    
    // Event Listeners - Carrinho
    descontoInput.addEventListener('input', function() {
        atualizarTotais();
    });
    
    btnFinalizar.addEventListener('click', finalizarVenda);
    
    // Event Listeners - Modal de Recibo
    btnCloseRecibo.forEach(btn => {
        btn.addEventListener('click', function() {
            modalRecibo.classList.remove('show');
            setTimeout(() => {
                modalRecibo.style.display = 'none';
            }, 300);
        });
    });
    
    btnImprimir.addEventListener('click', imprimirRecibo);
    
    btnNovaVenda.addEventListener('click', function() {
        // Fechar modal
        modalRecibo.classList.remove('show');
        setTimeout(() => {
            modalRecibo.style.display = 'none';
        }, 300);
        
        // Limpar carrinho
        limparCarrinho();
    });
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', function() {
        auth.fazerLogout();
        window.location.href = 'index.html';
    });
    
    // ========== FUNÇÕES ==========
    
    function ativarAba(aba) {
        // Desativar todas as abas
        tabProdutos.classList.remove('active');
        tabScanner.classList.remove('active');
        
        // Ocultar todos os conteúdos
        tabConteudoProdutos.style.display = 'none';
        tabConteudoScanner.style.display = 'none';
        
        // Ativar aba selecionada
        if (aba === 'produtos') {
            tabProdutos.classList.add('active');
            tabConteudoProdutos.style.display = 'block';
        } else if (aba === 'scanner') {
            tabScanner.classList.add('active');
            tabConteudoScanner.style.display = 'block';
            codigoBarrasInput.focus();
        }
    }
    
    function carregarGrupos() {
        // Obter grupos de produtos
        let grupos = [];
        
        // Verificar se há método específico no db
        if (typeof db.getGruposProdutos === 'function') {
            grupos = db.getGruposProdutos();
        } else {
            // Extrair grupos dos produtos
            const produtos = db.getProdutos();
            const gruposSet = new Set();
            
            Object.values(produtos).forEach(produto => {
                if (produto.grupo) {
                    gruposSet.add(produto.grupo);
                }
            });
            
            grupos = [...gruposSet].sort();
        }
        
        // Preencher select
        filtroGrupoSelect.innerHTML = '<option value="">Todos os Grupos</option>';
        
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo;
            option.textContent = grupo;
            filtroGrupoSelect.appendChild(option);
        });
    }
    
    function carregarClientes() {
        // Obter clientes
        const clientes = db.getClientes();
        
        // Preencher select
        clienteSelect.innerHTML = '';
        
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            clienteSelect.appendChild(option);
        });
    }
    
    function carregarFormasPagamento() {
        // Formas de pagamento disponíveis
        const formasPagamento = [
            { valor: 'dinheiro', nome: 'Dinheiro' },
            { valor: 'cartao_credito', nome: 'Cartão de Crédito' },
            { valor: 'cartao_debito', nome: 'Cartão de Débito' },
            { valor: 'pix', nome: 'PIX' },
            { valor: 'boleto', nome: 'Boleto Bancário' },
            { valor: 'transferencia', nome: 'Transferência Bancária' },
            { valor: 'cheque', nome: 'Cheque' },
            { valor: 'credito_loja', nome: 'Crédito na Loja' }
        ];
        
        // Preencher select
        formaPagamentoSelect.innerHTML = '';
        
        formasPagamento.forEach(forma => {
            const option = document.createElement('option');
            option.value = forma.valor;
            option.textContent = forma.nome;
            formaPagamentoSelect.appendChild(option);
        });
    }
    
    function carregarProdutos() {
        // Obter produtos
        const produtos = db.getProdutos();
        
        // Filtros
        const termoBusca = buscaProdutoInput.value.toLowerCase();
        const grupoFiltro = filtroGrupoSelect.value;
        
        // Limpar lista
        listaProdutos.innerHTML = '';
        
        // Filtrar produtos
        const produtosFiltrados = Object.values(produtos).filter(produto => {
            // Verificar estoque
            if (produto.estoque <= 0) {
                return false;
            }
            
            // Filtro de busca
            const matchBusca = termoBusca === '' || 
                produto.nome.toLowerCase().includes(termoBusca) || 
                (produto.codigo_barras && produto.codigo_barras.toLowerCase().includes(termoBusca));
            
            // Filtro de grupo
            const matchGrupo = grupoFiltro === '' || produto.grupo === grupoFiltro;
            
            return matchBusca && matchGrupo;
        });
        
        // Ordenar por nome
        produtosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adicionar produtos à lista
        produtosFiltrados.forEach(produto => {
            const produtoEl = document.createElement('div');
            produtoEl.className = 'produto-card';
            produtoEl.dataset.id = produto.id;
            
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
                adicionarAoCarrinho(produto);
            });
            
            listaProdutos.appendChild(produtoEl);
        });
        
        // Exibir mensagem se não houver produtos
        if (produtosFiltrados.length === 0) {
            listaProdutos.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0; color: var(--text-muted);">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Nenhum produto encontrado</p>
                </div>
            `;
        }
    }
    
    function buscarProdutoPorCodigo(codigo) {
        // Buscar produto pelo código de barras
        const produtos = db.getProdutos();
        const produto = Object.values(produtos).find(p => p.codigo_barras === codigo);
        
        if (produto) {
            // Verificar estoque
            if (produto.estoque <= 0) {
                resultadoScanner.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i> Produto <strong>${produto.nome}</strong> está sem estoque.
                    </div>
                `;
                return;
            }
            
            // Exibir informações do produto
            resultadoScanner.innerHTML = `
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
                                <p class="text-muted mb-1">Código: ${produto.codigo_barras}</p>
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
                    adicionarAoCarrinho(produto, quantidade);
                    
                    // Limpar resultado
                    resultadoScanner.innerHTML = `
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i> Produto <strong>${produto.nome}</strong> adicionado ao carrinho.
                        </div>
                    `;
                    
                    // Limpar campo de código
                    codigoBarrasInput.value = '';
                    codigoBarrasInput.focus();
                } else {
                    exibirMensagem('Por favor, informe uma quantidade válida', 'error');
                }
            });
        } else {
            // Produto não encontrado
            resultadoScanner.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> Produto não encontrado para o código <strong>${codigo}</strong>.
                </div>
                
                <div class="text-center mt-3">
                    <a href="produto.html?codigo=${codigo}" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Cadastrar Novo Produto
                    </a>
                </div>
            `;
        }
    }
    
    function inicializarCarrinho() {
        // Verificar se existe um carrinho salvo no localStorage
        const carrinhoSalvo = localStorage.getItem('orion_carrinho');
        
        if (carrinhoSalvo) {
            try {
                carrinho = JSON.parse(carrinhoSalvo);
            } catch (erro) {
                console.error('Erro ao carregar carrinho:', erro);
                carrinho = [];
            }
        }
        
        atualizarCarrinho();
    }
    
    function salvarCarrinho() {
        // Salvar carrinho no localStorage
        localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
    }
    
    function adicionarAoCarrinho(produto, quantidade = 1) {
        // Verificar se a quantidade é válida
        if (quantidade <= 0 || quantidade > produto.estoque) {
            exibirMensagem(`Quantidade inválida. Estoque disponível: ${produto.estoque}`, 'error');
            return false;
        }
        
        // Verificar se o produto já está no carrinho
        const itemIndex = carrinho.findIndex(item => item.produto_id === produto.id);
        
        if (itemIndex !== -1) {
            // Atualizar quantidade
            const novaQuantidade = carrinho[itemIndex].quantidade + quantidade;
            
            if (novaQuantidade > produto.estoque) {
                exibirMensagem(`Quantidade excede o estoque disponível: ${produto.estoque}`, 'error');
                return false;
            }
            
            carrinho[itemIndex].quantidade = novaQuantidade;
            carrinho[itemIndex].subtotal = produto.preco * novaQuantidade;
        } else {
            // Adicionar novo item
            carrinho.push({
                produto_id: produto.id,
                codigo_barras: produto.codigo_barras,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: quantidade,
                foto: produto.foto || '',
                subtotal: produto.preco * quantidade
            });
        }
        
        // Salvar e atualizar
        salvarCarrinho();
        atualizarCarrinho();
        
        // Exibir mensagem
        exibirMensagem(`${produto.nome} adicionado ao carrinho`, 'success');
        
        // Reproduzir som de sucesso
        const beepSuccess = document.getElementById('beep-success');
        beepSuccess.play().catch(err => console.log("Erro ao reproduzir som", err));
        
        return true;
    }
    
    function removerDoCarrinho(produtoId) {
        // Encontrar o índice do item no carrinho
        const itemIndex = carrinho.findIndex(item => item.produto_id === produtoId);
        
        if (itemIndex !== -1) {
            // Remover do carrinho
            carrinho.splice(itemIndex, 1);
            
            // Salvar e atualizar
            salvarCarrinho();
            atualizarCarrinho();
            
            return true;
        }
        
        return false;
    }
    
    function atualizarQuantidadeCarrinho(produtoId, quantidade) {
        // Verificar se a quantidade é válida
        if (quantidade <= 0) {
            // Remover do carrinho
            return removerDoCarrinho(produtoId);
        }
        
        // Buscar produto para verificar estoque
        const produtos = db.getProdutos();
        const produto = produtos[produtoId];
        
        if (produto && quantidade > produto.estoque) {
            exibirMensagem(`Quantidade maior que o estoque disponível (${produto.estoque})`, 'error');
            return false;
        }
        
        // Encontrar o item no carrinho
        const itemIndex = carrinho.findIndex(item => item.produto_id === produtoId);
        
        if (itemIndex !== -1) {
            // Atualizar quantidade
            carrinho[itemIndex].quantidade = quantidade;
            carrinho[itemIndex].subtotal = carrinho[itemIndex].preco * quantidade;
            
            // Salvar e atualizar
            salvarCarrinho();
            atualizarCarrinho();
            
            return true;
        }
        
        return false;
    }
    
    function atualizarCarrinho() {
        // Exibir mensagem de carrinho vazio se não houver itens
        if (carrinho.length === 0) {
            carrinhoVazio.style.display = 'block';
            carrinhoItens.innerHTML = '';
            subtotal = 0;
            atualizarTotais();
            btnFinalizar.disabled = true;
            return;
        }
        
        // Ocultar mensagem de carrinho vazio
        carrinhoVazio.style.display = 'none';
        
        // Limpar lista de itens
        carrinhoItens.innerHTML = '';
        
        // Adicionar itens ao carrinho
        carrinho.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'carrinho-item';
            
            itemEl.innerHTML = `
                <div class="carrinho-img">
                    ${item.foto ? `<img src="${item.foto}" alt="${item.nome}">` : `<i class="fas fa-box" style="font-size: 1.5rem; color: var(--primary);"></i>`}
                </div>
                <div class="carrinho-info">
                    <div class="carrinho-nome">${item.nome}</div>
                    <div class="carrinho-detalhes">
                        <div>R$ ${item.preco.toFixed(2)} × 
                            <input type="number" class="qtd-input" data-id="${item.produto_id}" value="${item.quantidade}" min="1" max="99">
                        </div>
                        <div>R$ ${item.subtotal.toFixed(2)}</div>
                    </div>
                </div>
                <button class="btn-remove" data-id="${item.produto_id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            carrinhoItens.appendChild(itemEl);
        });
        
        // Adicionar eventos aos inputs de quantidade
        document.querySelectorAll('.qtd-input').forEach(input => {
            input.addEventListener('change', function() {
                const produtoId = this.getAttribute('data-id');
                const quantidade = parseInt(this.value);
                
                atualizarQuantidadeCarrinho(produtoId, quantidade);
            });
        });
        
        // Adicionar eventos aos botões de remover
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const produtoId = this.getAttribute('data-id');
                removerDoCarrinho(produtoId);
            });
        });
        
        // Calcular subtotal
        subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
        
        // Atualizar totais
        atualizarTotais();
    }
    
    function atualizarTotais() {
        // Obter percentual de desconto
        const percentualDesconto = parseFloat(descontoInput.value) || 0;
        
        // Calcular desconto
        desconto = (subtotal * percentualDesconto) / 100;
        
        // Calcular total
        total = subtotal - desconto;
        
        // Atualizar elementos
        subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
        totalEl.textContent = `R$ ${total.toFixed(2)}`;
        
        // Desabilitar botão de finalizar se não houver itens ou total for zero
        btnFinalizar.disabled = carrinho.length === 0 || total <= 0;
    }
    
    function limparCarrinho() {
        // Limpar carrinho
        carrinho = [];
        
        // Salvar e atualizar
        salvarCarrinho();
        atualizarCarrinho();
        
        // Desabilitar botão de finalizar
        btnFinalizar.disabled = true;
    }
    
    function finalizarVenda() {
        // Verificar se há itens no carrinho
        if (carrinho.length === 0) {
            exibirMensagem('Não há itens no carrinho', 'error');
            return;
        }
        
        // Verificar se o total é maior que zero
        if (total <= 0) {
            exibirMensagem('O valor total da venda deve ser maior que zero', 'error');
            return;
        }
        
        try {
            // Obter cliente selecionado
            const clienteId = clienteSelect.value;
            const clientes = db.getClientes();
            const cliente = clientes.find(c => c.id === clienteId);
            
            if (!cliente) {
                exibirMensagem('Cliente não encontrado', 'error');
                return;
            }
            
            // Obter forma de pagamento
            const formaPagamento = formaPagamentoSelect.value;
            const formaPagamentoTexto = formaPagamentoSelect.options[formaPagamentoSelect.selectedIndex].text;
            
            // Dados da venda
            const venda = {
                id: Date.now().toString(),
                cliente_id: cliente.id,
                cliente_nome: cliente.nome,
                forma_pagamento: formaPagamentoTexto,
                forma_pagamento_id: formaPagamento,
                itens: [...carrinho],
                subtotal: subtotal,
                desconto: desconto,
                total: total,
                usuario: user.nome,
                data: new Date().toISOString()
            };
            
            // Atualizar estoque
            const produtos = db.getProdutos();
            
            // Verificar se todos os produtos ainda têm estoque suficiente
            const estoqueInsuficiente = venda.itens.some(item => {
                const produto = produtos[item.produto_id];
                return produto && produto.estoque < item.quantidade;
            });
            
            if (estoqueInsuficiente) {
                exibirMensagem('Estoque insuficiente para alguns produtos. Verifique as quantidades.', 'error');
                return;
            }
            
            // Atualizar estoque de cada produto
            venda.itens.forEach(item => {
                const produto = produtos[item.produto_id];
                if (produto) {
                    produto.estoque -= item.quantidade;
                    db.salvarProduto(produto);
                }
            });
            
            // Registrar venda
            db.salvarVenda(venda);
            
            // Exibir recibo
            exibirRecibo(venda);
            
            // Mensagem de sucesso
            exibirMensagem('Venda finalizada com sucesso!', 'success');
            
            // Limpar carrinho após finalizar venda com sucesso
            limpar// Limpar carrinho após finalizar venda com sucesso
            limparCarrinho();
        } catch (erro) {
            console.error('Erro ao finalizar venda:', erro);
            exibirMensagem('Erro ao finalizar venda: ' + erro, 'error');
        }
    }
    
    function exibirRecibo(venda) {
        // Obter configurações da empresa
        const config = db.getConfig();
        
        // Formatar data
        const data = new Date(venda.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Gerar HTML dos itens
        let itensHTML = '';
        venda.itens.forEach((item, index) => {
            itensHTML += `
                <tr>
                    <td>${index + 1}. ${item.nome}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco.toFixed(2)}</td>
                    <td class="text-right">R$ ${item.subtotal.toFixed(2)}</td>
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
        reciboConteudo.innerHTML = reciboHTML;
        
        // Exibir modal com animação
        modalRecibo.style.display = 'flex';
        setTimeout(() => {
            modalRecibo.classList.add('show');
        }, 10);
    }
    
    function imprimirRecibo() {
        // Abrir nova janela para impressão
        const reciboWindow = window.open('', '_blank', 'width=400,height=600');
        
        // Obter HTML do recibo
        const reciboHTML = reciboConteudo.innerHTML;
        
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
    
    // Função para exibir mensagens de notificação
    function exibirMensagem(mensagem, tipo) {
        const toastContainer = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${tipo}`;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'warning' ? 'exclamation-triangle' : tipo === 'info' ? 'info-circle' : 'exclamation-circle'}"></i>
                <span>${mensagem}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Exibir com animação
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remover após 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 3000);
    }
});
