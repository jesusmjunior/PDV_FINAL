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
    let carrinho = db.getCarrinho();
    let subtotal = 0;
    let desconto = 0;
    let total = 0;
    
    // Carregar dados iniciais
    carregarGrupos();
    carregarClientes();
    carregarFormasPagamento();
    carregarProdutos();
    atualizarCarrinho();
    
    // Event Listeners - Abas
    tabProdutos.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Ativar aba
        tabProdutos.classList.add('active');
        tabProdutos.style.color = 'var(--text-light)';
        tabProdutos.style.borderBottom = '2px solid var(--primary)';
        
        tabScanner.classList.remove('active');
        tabScanner.style.color = 'var(--text-muted)';
        tabScanner.style.borderBottom = '2px solid transparent';
        
        // Mostrar conteúdo
        tabConteudoProdutos.style.display = 'block';
        tabConteudoScanner.style.display = 'none';
    });
    
    tabScanner.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Ativar aba
        tabScanner.classList.add('active');
        tabScanner.style.color = 'var(--text-light)';
        tabScanner.style.borderBottom = '2px solid var(--primary)';
        
        tabProdutos.classList.remove('active');
        tabProdutos.style.color = 'var(--text-muted)';
        tabProdutos.style.borderBottom = '2px solid transparent';
        
        // Mostrar conteúdo
        tabConteudoScanner.style.display = 'block';
        tabConteudoProdutos.style.display = 'none';
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
            // Exibir mensagem de erro
            resultadoScanner.innerHTML = `
                <div class="alert" style="background-color: rgba(229, 57, 53, 0.1); border: 1px solid rgba(229, 57, 53, 0.3); color: var(--danger); border-radius: var(--border-radius); padding: 1rem;">
                    <i class="fas fa-exclamation-circle"></i> Por favor, digite um código de barras válido.
                </div>
            `;
        }
    });
    
    // Event Listeners - Carrinho
    descontoInput.addEventListener('input', function() {
        atualizarTotais();
    });
    
    btnFinalizar.addEventListener('click', finalizarVenda);
    
    // Event Listeners - Modal de Recibo
    btnCloseRecibo.forEach(btn => {
        btn.addEventListener('click', function() {
            modalRecibo.style.display = 'none';
        });
    });
    
    btnImprimir.addEventListener('click', function() {
        imprimirRecibo();
    });
    
    btnNovaVenda.addEventListener('click', function() {
        // Fechar modal
        modalRecibo.style.display = 'none';
        
        // Limpar carrinho
        limparCarrinho();
    });
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', function() {
        auth.fazerLogout();
        window.location.href = 'index.html';
    });
    
    // ========== FUNÇÕES ==========
    
    function carregarProdutos() {
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
                produto.codigo_barras.toLowerCase().includes(termoBusca);
            
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
                    <div style="font-weight: 500; margin-bottom: 0.5rem;">${produto.nome}</div>
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
    
    function carregarClientes() {
        const clientes = db.getClientes();
        
        // Limpar select
        clienteSelect.innerHTML = '';
        
        // Adicionar clientes ao select
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
        
        // Limpar select
        formaPagamentoSelect.innerHTML = '';
        
        // Adicionar formas de pagamento ao select
        formasPagamento.forEach(forma => {
            const option = document.createElement('option');
            option.value = forma.valor;
            option.textContent = forma.nome;
            formaPagamentoSelect.appendChild(option);
        });
    }
    
    function buscarProdutoPorCodigo(codigo) {
        // Buscar produto no banco de dados
        const produto = db.getProdutoPorCodigo(codigo);
        
        if (produto) {
            // Verificar estoque
            if (produto.estoque <= 0) {
                resultadoScanner.innerHTML = `
                    <div class="alert" style="background-color: rgba(229, 57, 53, 0.1); border: 1px solid rgba(229, 57, 53, 0.3); color: var(--danger); border-radius: var(--border-radius); padding: 1rem;">
                        <i class="fas fa-exclamation-circle"></i> Produto <strong>${produto.nome}</strong> está sem estoque.
                    </div>
                `;
                return;
            }
            
            // Exibir informações do produto
            resultadoScanner.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-box"></i> Produto Encontrado
                    </div>
                    <div class="card-body">
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                            <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background-color: rgba(255, 255, 255, 0.05); border-radius: var(--border-radius);">
                                ${produto.foto ? `<img src="${produto.foto}" alt="${produto.nome}" style="max-width: 100%; max-height: 100%;">` : `<i class="fas fa-box" style="font-size: 2rem; color: var(--primary);"></i>`}
                            </div>
                            <div style="flex: 1;">
                                <h4>${produto.nome}</h4>
                                <p style="margin: 0; color: var(--text-muted);">Código: ${produto.codigo_barras}</p>
                                <p style="margin: 0; color: var(--primary); font-weight: 600; font-size: 1.25rem;">R$ ${produto.preco.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="quantidade-scanner" class="form-label">Quantidade</label>
                            <input type="number" id="quantidade-scanner" class="form-control" value="1" min="1" max="${produto.estoque}" step="1">
                        </div>
                        
                        <div style="text-align: center; margin-top: 1.5rem;">
                            <button id="btn-adicionar-scanner" class="btn btn-primary" data-id="${produto.id}">
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
                        <div class="alert" style="background-color: rgba(67, 160, 71, 0.1); border: 1px solid rgba(67, 160, 71, 0.3); color: var(--success); border-radius: var(--border-radius); padding: 1rem;">
                            <i class="fas fa-check-circle"></i> Produto <strong>${produto.nome}</strong> adicionado ao carrinho.
                        </div>
                    `;
                    // Limpar input
                    codigoBarrasInput.value = '';
                } else {
                    alert('Por favor, informe uma quantidade válida');
                }
            });
        } else {
            // Produto não encontrado
            resultadoScanner.innerHTML = `
                <div class="alert" style="background-color: rgba(255, 179, 0, 0.1); border: 1px solid rgba(255, 179, 0, 0.3); color: var(--warning); border-radius: var(--border-radius); padding: 1rem;">
                    <i class="fas fa-exclamation-triangle"></i> Produto não encontrado para o código <strong>${codigo}</strong>.
                </div>
                
                <div style="text-align: center; margin-top: 1.5rem;">
                    <a href="produto.html?codigo=${codigo}" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Cadastrar Novo Produto
                    </a>
                </div>
            `;
        }
    }
    
    function adicionarAoCarrinho(produto, quantidade = 1) {
        // Verificar se a quantidade é válida
        if (quantidade <= 0 || quantidade > produto.estoque) {
            alert(`Quantidade inválida. Estoque disponível: ${produto.estoque}`);
            return false;
        }
        
        // Preparar item para o carrinho
        const item = {
            produto_id: produto.id,
            codigo_barras: produto.codigo_barras,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: quantidade,
            foto: produto.foto || '',
            subtotal: produto.preco * quantidade
        };
        
        // Adicionar ao carrinho
        const adicionado = db.adicionarItemCarrinho(item);
        
        if (adicionado) {
            // Atualizar carrinho
            carrinho = db.getCarrinho();
            atualizarCarrinho();
            
            // Habilitar botão de finalizar se houver itens no carrinho
            btnFinalizar.disabled = carrinho.length === 0;
            
            return true;
        }
        
        return false;
    }
    
    function removerDoCarrinho(produtoId) {
        // Remover do carrinho
        const removido = db.removerItemCarrinho(produtoId);
        
        if (removido) {
            // Atualizar carrinho
            carrinho = db.getCarrinho();
            atualizarCarrinho();
            
            // Desabilitar botão de finalizar se não houver itens no carrinho
            btnFinalizar.disabled = carrinho.length === 0;
            
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
        const produto = db.getProduto(produtoId);
        
        if (produto && quantidade > produto.estoque) {
            alert(`Quantidade maior que o estoque disponível (${produto.estoque})`);
            return false;
        }
        
        // Atualizar quantidade
        const atualizado = db.atualizarQuantidadeCarrinho(produtoId, quantidade);
        
        if (atualizado) {
            // Atualizar carrinho
            carrinho = db.getCarrinho();
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
                            <input type="number" class="qtd-input" data-id="${item.produto_id}" value="${item.quantidade}" min="1" max="99" style="width: 40px; padding: 0.25rem; text-align: center;">
                        </div>
                        <div>R$ ${item.subtotal.toFixed(2)}</div>
                    </div>
                </div>
                <button class="btn-remove" data-id="${item.produto_id}" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 0.5rem;">
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
        // Limpar carrinho no banco de dados
        db.limparCarrinho();
        
        // Atualizar carrinho
        carrinho = [];
        atualizarCarrinho();
        
        // Desabilitar botão de finalizar
        btnFinalizar.disabled = true;
    }
    
    function finalizarVenda() {
        // Verificar se há itens no carrinho
        if (carrinho.length === 0) {
            alert('Não há itens no carrinho');
            return;
        }
        
        // Verificar se o total é maior que zero
        if (total <= 0) {
            alert('O valor total da venda deve ser maior que zero');
            return;
        }
        
        try {
            // Obter cliente selecionado
            const clienteId = clienteSelect.value;
            const cliente = db.getCliente(clienteId);
            
            if (!cliente) {
                alert('Cliente não encontrado');
                return;
            }
            
            // Obter forma de pagamento
            const formaPagamento = formaPagamentoSelect.value;
            
            // Dados da venda
            const venda = {
                cliente_id: cliente.id,
                cliente_nome: cliente.nome,
                forma_pagamento: formaPagamentoSelect.options[formaPagamentoSelect.selectedIndex].text,
                forma_pagamento_id: formaPagamento,
                itens: carrinho,
                subtotal: subtotal,
                desconto: desconto,
                total: total,
                usuario: user.nome,
                data: new Date().toISOString()
            };
            
            // Registrar venda
            const vendaId = db.registrarVenda(venda);
            
            if (!vendaId) {
                throw new Error('Erro ao registrar venda');
            }
            
            // Carregar dados da venda para o recibo
            const vendaFinalizada = db.getVenda(vendaId);
            
            // Exibir recibo
            exibirRecibo(vendaFinalizada);
        } catch (erro) {
            alert('Erro ao finalizar venda: ' + erro);
        }
    }
    
    function exibirRecibo(venda) {
        // Obter configurações da empresa
        const config = db.getConfig();
        
        // Formatar data
        const data = new Date(venda.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR');
        
        // Gerar HTML do recibo
        let itensHTML = '';
        venda.itens.forEach((item, index) => {
            itensHTML += `
                <tr>
                    <td>${index + 1}. ${item.nome}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco.toFixed(2)}</td>
                    <td>R$ ${item.subtotal.toFixed(2)}</td>
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
        
        // Exibir modal
        modalRecibo.style.display = 'flex';
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
});
