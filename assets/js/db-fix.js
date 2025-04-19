/**
 * ORION PDV - Camada de Compatibilidade de Banco de Dados
 * 
 * Este arquivo resolve conflitos entre implementações de banco de dados
 * e garante compatibilidade com versões anteriores, adicionando métodos
 * que possam estar faltando.
 */

// Verificar se o db já existe no escopo global
if (typeof db === 'undefined') {
    console.error('Erro: Objeto db não encontrado. Certifique-se de carregar database.js primeiro.');
} else {
    console.log('Inicializando camada de compatibilidade de banco de dados...');
    
    // Garantir que métodos essenciais estejam disponíveis
    
    // Método para carregar grupos de produtos
    if (typeof db.getGruposProdutos !== 'function') {
        db.getGruposProdutos = function() {
            return JSON.parse(localStorage.getItem('orion_grupos_produtos') || '[]');
        };
    }
    
    // Método para buscar produto por código de barras
    if (typeof db.getProdutoPorCodigo !== 'function') {
        db.getProdutoPorCodigo = function(codigo) {
            const produtos = this.getProdutos();
            return Object.values(produtos).find(produto => produto.codigo_barras === codigo);
        };
    }
    
    // Método para gerenciar o carrinho
    if (typeof db.getCarrinho !== 'function') {
        db.getCarrinho = function() {
            return JSON.parse(localStorage.getItem('orion_carrinho') || '[]');
        };
    }
    
    if (typeof db.adicionarItemCarrinho !== 'function') {
        db.adicionarItemCarrinho = function(item) {
            const carrinho = this.getCarrinho();
            
            // Verificar se o produto já está no carrinho
            const index = carrinho.findIndex(i => i.produto_id === item.produto_id);
            
            if (index !== -1) {
                // Atualizar quantidade
                carrinho[index].quantidade += item.quantidade;
                carrinho[index].subtotal = carrinho[index].preco * carrinho[index].quantidade;
            } else {
                // Adicionar novo item
                carrinho.push(item);
            }
            
            localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
            return true;
        };
    }
    
    if (typeof db.removerItemCarrinho !== 'function') {
        db.removerItemCarrinho = function(produtoId) {
            const carrinho = this.getCarrinho();
            const index = carrinho.findIndex(item => item.produto_id === produtoId);
            
            if (index !== -1) {
                carrinho.splice(index, 1);
                localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
                return true;
            }
            
            return false;
        };
    }
    
    if (typeof db.atualizarQuantidadeCarrinho !== 'function') {
        db.atualizarQuantidadeCarrinho = function(produtoId, quantidade) {
            const carrinho = this.getCarrinho();
            const index = carrinho.findIndex(item => item.produto_id === produtoId);
            
            if (index !== -1) {
                carrinho[index].quantidade = quantidade;
                carrinho[index].subtotal = carrinho[index].preco * quantidade;
                localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
                return true;
            }
            
            return false;
        };
    }
    
    if (typeof db.limparCarrinho !== 'function') {
        db.limparCarrinho = function() {
            localStorage.setItem('orion_carrinho', '[]');
        };
    }
    
    // Método para registrar vendas
    if (typeof db.registrarVenda !== 'function') {
        db.registrarVenda = function(venda) {
            return db.salvarVenda(venda);
        };
    }
    
    if (typeof db.salvarVenda !== 'function') {
        db.salvarVenda = function(venda) {
            const vendas = this.getVendas();
            
            if (!venda.id) {
                // Nova venda
                venda.id = Date.now().toString();
            }
            
            vendas.push(venda);
            localStorage.setItem('orion_vendas', JSON.stringify(vendas));
            
            // Atualizar estoque
            this.atualizarEstoqueAposVenda(venda);
            
            // Limpar carrinho
            this.limparCarrinho();
            
            return venda.id;
        };
    }
    
    // Método para atualizar estoque após venda
    if (typeof db.atualizarEstoqueAposVenda !== 'function') {
        db.atualizarEstoqueAposVenda = function(venda) {
            const produtos = this.getProdutos();
            
            venda.itens.forEach(item => {
                if (produtos[item.produto_id]) {
                    produtos[item.produto_id].estoque -= item.quantidade;
                    
                    // Garantir que o estoque não fique negativo
                    if (produtos[item.produto_id].estoque < 0) {
                        produtos[item.produto_id].estoque = 0;
                    }
                }
            });
            
            localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        };
    }
    
    // Método para salvar movimentações de estoque
    if (typeof db.salvarMovimentacaoEstoque !== 'function') {
        db.salvarMovimentacaoEstoque = function(movimentacao) {
            const movimentacoes = this.getMovimentacoesEstoque();
            
            if (!movimentacao.id) {
                movimentacao.id = this.generateId();
            }
            
            if (!movimentacao.data) {
                movimentacao.data = new Date().toISOString();
            }
            
            movimentacoes.push(movimentacao);
            localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(movimentacoes));
            
            return movimentacao;
        };
    }
    
    // Método para obter movimentações de estoque se não existir
    if (typeof db.getMovimentacoesEstoque !== 'function') {
        db.getMovimentacoesEstoque = function() {
            return JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]');
        };
    }
    
    // Método para geração de ID único
    if (typeof db.generateId !== 'function') {
        db.generateId = function() {
            return Date.now().toString();
        };
    }
    
    // Método para exportar dados
    if (typeof db.exportarDados !== 'function') {
        db.exportarDados = function() {
            try {
                const dados = {
                    versao: this.VERSION || "1.0.0",
                    data: new Date().toISOString(),
                    dados: {
                        usuarios: this.getUsuarios ? this.getUsuarios() : JSON.parse(localStorage.getItem('orion_usuarios') || '{}'),
                        produtos: this.getProdutos ? this.getProdutos() : JSON.parse(localStorage.getItem('orion_produtos') || '{}'),
                        clientes: this.getClientes ? this.getClientes() : JSON.parse(localStorage.getItem('orion_clientes') || '[]'),
                        vendas: this.getVendas ? this.getVendas() : JSON.parse(localStorage.getItem('orion_vendas') || '[]'),
                        movimentacoes_estoque: this.getMovimentacoesEstoque ? this.getMovimentacoesEstoque() : JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]'),
                        grupos_produtos: this.getGruposProdutos ? this.getGruposProdutos() : JSON.parse(localStorage.getItem('orion_grupos_produtos') || '[]'),
                        config: this.getConfig ? this.getConfig() : JSON.parse(localStorage.getItem('orion_config') || '{}')
                    }
                };
                
                return JSON.stringify(dados, null, 2);
            } catch (erro) {
                console.error('Erro ao exportar dados:', erro);
                return null;
            }
        };
    }
    
    // Método para importar dados
    if (typeof db.importarDados !== 'function') {
        db.importarDados = function(dadosJson) {
            try {
                const dados = JSON.parse(dadosJson);
                
                // Verificar formato
                if (!dados.versao || !dados.dados) {
                    console.error('Formato de dados inválido');
                    return false;
                }
                
                // Importar dados
                if (dados.dados.usuarios) localStorage.setItem('orion_usuarios', JSON.stringify(dados.dados.usuarios));
                if (dados.dados.produtos) localStorage.setItem('orion_produtos', JSON.stringify(dados.dados.produtos));
                if (dados.dados.clientes) localStorage.setItem('orion_clientes', JSON.stringify(dados.dados.clientes));
                if (dados.dados.vendas) localStorage.setItem('orion_vendas', JSON.stringify(dados.dados.vendas));
                if (dados.dados.movimentacoes_estoque) localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(dados.dados.movimentacoes_estoque));
                if (dados.dados.grupos_produtos) localStorage.setItem('orion_grupos_produtos', JSON.stringify(dados.dados.grupos_produtos));
                if (dados.dados.config) localStorage.setItem('orion_config', JSON.stringify(dados.dados.config));
                
                // Atualizar versão
                localStorage.setItem('orion_version', dados.versao || "1.0.0");
                localStorage.setItem('orion_initialized', 'true');
                
                return true;
            } catch (erro) {
                console.error('Erro ao importar dados:', erro);
                return false;
            }
        };
    }
    
    // Método para gerar relatórios de vendas
    if (typeof db.gerarRelatorioVendas !== 'function') {
        db.gerarRelatorioVendas = function(filtros = {}) {
            // Obter todas as vendas
            const vendas = this.getVendas();
            
            // Aplicar filtros
            let vendasFiltradas = vendas;
            
            // Filtrar por data
            if (filtros.dataInicio && filtros.dataFim) {
                const dataInicio = new Date(filtros.dataInicio);
                dataInicio.setHours(0, 0, 0, 0);
                
                const dataFim = new Date(filtros.dataFim);
                dataFim.setHours(23, 59, 59, 999);
                
                vendasFiltradas = vendasFiltradas.filter(venda => {
                    const dataVenda = new Date(venda.data);
                    return dataVenda >= dataInicio && dataVenda <= dataFim;
                });
            }
            
            // Filtrar por cliente
            if (filtros.clienteId) {
                vendasFiltradas = vendasFiltradas.filter(venda => venda.cliente_id === filtros.clienteId);
            }
            
            // Filtrar por forma de pagamento
            if (filtros.formaPagamento) {
                vendasFiltradas = vendasFiltradas.filter(venda => venda.forma_pagamento_id === filtros.formaPagamento);
            }
            
            // Calcular totais
            const totalVendas = vendasFiltradas.length;
            const valorTotal = vendasFiltradas.reduce((acc, venda) => acc + venda.total, 0);
            const valorDesconto = vendasFiltradas.reduce((acc, venda) => acc + venda.desconto, 0);
            const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
            
            // Agrupar por forma de pagamento
            const vendasPorFormaPagamento = {};
            vendasFiltradas.forEach(venda => {
                if (!vendasPorFormaPagamento[venda.forma_pagamento]) {
                    vendasPorFormaPagamento[venda.forma_pagamento] = {
                        quantidade: 0,
                        valor: 0
                    };
                }
                
                vendasPorFormaPagamento[venda.forma_pagamento].quantidade += 1;
                vendasPorFormaPagamento[venda.forma_pagamento].valor += venda.total;
            });
            
            // Agrupar por data
            const vendasPorData = {};
            vendasFiltradas.forEach(venda => {
                // Extrair data (sem hora)
                const dataVenda = venda.data.split('T')[0];
                
                if (!vendasPorData[dataVenda]) {
                    vendasPorData[dataVenda] = 0;
                }
                
                vendasPorData[dataVenda] += venda.total;
            });
            
            // Retornar relatório
            return {
                periodo: {
                    inicio: filtros.dataInicio || null,
                    fim: filtros.dataFim || null
                },
                totais: {
                    vendas: totalVendas,
                    valor: valorTotal,
                    desconto: valorDesconto,
                    ticketMedio: ticketMedio
                },
                formasPagamento: vendasPorFormaPagamento,
                vendasPorData: vendasPorData,
                vendas: vendasFiltradas
            };
        };
    }
    
    console.log("Camada de compatibilidade do banco de dados inicializada com sucesso!");
}
