/**
 * ORION PDV - Gerenciador de Banco de Dados (localStorage)
 * Versão 2.0 - Baseado em código de barras como chave primária
 */

const db = {
    VERSION: '2.0.0',
    
    /**
     * Inicializa o banco de dados
     */
    inicializar: function() {
        // Verificar se já foi inicializado
        if (localStorage.getItem('orion_initialized') === 'true') {
            // Verificar se existe versão antiga para migrar
            const versaoAtual = localStorage.getItem('orion_version');
            if (versaoAtual !== this.VERSION) {
                this.migrarDados(versaoAtual);
            }
            return;
        }
        
        console.log('Inicializando banco de dados...');
        
        // Metadados
        localStorage.setItem('orion_version', this.VERSION);
        localStorage.setItem('orion_last_backup', '');
        
        // Estruturas principais por código de barras
        localStorage.setItem('orion_produtos', JSON.stringify({})); // Código de barras → objeto produto
        
        // Índices secundários
        localStorage.setItem('orion_indices_produtos', JSON.stringify({
            por_id: {},        // ID → código de barras  
            por_nome: {},      // Nome (lowercase) → [códigos de barras]
            por_grupo: {}      // Grupo → [códigos de barras]
        }));
        
        // Autenticação
        const usuarioPadrao = {
            'jesus': {
                username: 'jesus',
                nome: 'Jesus Martins',
                cargo: 'Administrador',
                email: 'jesus@orionpdv.com',
                perfil: 'admin',
                senha_hash: this.hashSenha('123'),
                data_cadastro: new Date().toISOString()
            }
        };
        localStorage.setItem('orion_usuarios', JSON.stringify(usuarioPadrao));
        
        // Cliente padrão
        const clientePadrao = [
            {
                id: "1",
                nome: "Consumidor Final",
                documento: "",
                telefone: "",
                email: "",
                endereco: "",
                cidade: "",
                data_cadastro: new Date().toISOString()
            }
        ];
        localStorage.setItem('orion_clientes', JSON.stringify(clientePadrao));
        
        // Outras entidades
        localStorage.setItem('orion_grupos_produtos', JSON.stringify([]));
        localStorage.setItem('orion_vendas', JSON.stringify([]));
        localStorage.setItem('orion_vendas_items', JSON.stringify({})); // ID da venda → [itens]
        localStorage.setItem('orion_carrinho', JSON.stringify([]));
        localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify([]));
        
        // Configurações
        const configPadrao = {
            nome_empresa: "ORION PDV",
            slogan: "Sistema de Gestão de Vendas",
            cnpj: "",
            endereco: "",
            cidade: "",
            telefone: "",
            tema: "dark",
            cor_primaria: "#0B3D91",
            cor_secundaria: "#1E88E5",
            prefixo_codigo: "789", // Prefixo EAN-13 padrão para Brasil
            validar_digito: true    // Validar dígito verificador EAN-13
        };
        localStorage.setItem('orion_config', JSON.stringify(configPadrao));
        
        // Cache e estatísticas
        localStorage.setItem('orion_cache_stats', JSON.stringify({
            produtos_mais_vendidos: [],
            produtos_sem_estoque: [],
            ultima_atualizacao: null
        }));
        
        // Marcar como inicializado
        localStorage.setItem('orion_initialized', 'true');
        console.log('Banco de dados inicializado com sucesso!');
    },
    
    /**
     * Migra dados de versões anteriores
     */
    migrarDados: function(versaoAntiga) {
        console.log(`Migrando banco de dados da versão ${versaoAntiga} para ${this.VERSION}...`);
        
        try {
            // Se estiver migrando da versão 1.x para 2.x (produtos baseados em código de barras)
            if (versaoAntiga.startsWith('1.') && this.VERSION.startsWith('2.')) {
                this.migrarProdutosParaCodigoBarras();
            }
            
            // Atualizar versão
            localStorage.setItem('orion_version', this.VERSION);
            console.log('Migração concluída com sucesso!');
        } catch (erro) {
            console.error('Erro na migração:', erro);
            // Reverter para versão antiga
            localStorage.setItem('orion_version', versaoAntiga);
        }
    },
    
    /**
     * Migra produtos para usar código de barras como chave primária
     */
    migrarProdutosParaCodigoBarras: function() {
        // Obter produtos antigos
        const produtosAntigos = JSON.parse(localStorage.getItem('orion_produtos') || '{}');
        
        // Criar novas estruturas
        const novosProdutos = {};
        const indices = {
            por_id: {},
            por_nome: {},
            por_grupo: {}
        };
        
        // Processar produtos
        for (const idAntigo in produtosAntigos) {
            const produto = produtosAntigos[idAntigo];
            
            // Verificar/criar código de barras
            if (!produto.codigo_barras) {
                produto.codigo_barras = this.gerarCodigoBarras();
            }
            
            // Adicionar produto usando código como chave
            novosProdutos[produto.codigo_barras] = produto;
            
            // Adicionar aos índices
            indices.por_id[produto.id] = produto.codigo_barras;
            
            // Índice por nome (para busca)
            const nomeLower = produto.nome.toLowerCase();
            if (!indices.por_nome[nomeLower]) {
                indices.por_nome[nomeLower] = [];
            }
            indices.por_nome[nomeLower].push(produto.codigo_barras);
            
            // Índice por grupo
            if (produto.grupo) {
                if (!indices.por_grupo[produto.grupo]) {
                    indices.por_grupo[produto.grupo] = [];
                }
                indices.por_grupo[produto.grupo].push(produto.codigo_barras);
            }
        }
        
        // Salvar novas estruturas
        localStorage.setItem('orion_produtos', JSON.stringify(novosProdutos));
        localStorage.setItem('orion_indices_produtos', JSON.stringify(indices));
    },
    
    /**
     * Gera um hash SHA-256 para a senha
     */
    hashSenha: function(senha) {
        if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
            return CryptoJS.SHA256(senha).toString();
        }
        
        // Fallback básico
        let hash = 0;
        for (let i = 0; i < senha.length; i++) {
            const char = senha.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    },
    
    /**
     * Gera um código de barras EAN-13 válido
     */
    gerarCodigoBarras: function() {
        // Obter prefixo das configurações
        const config = this.getConfig();
        const prefixo = config.prefixo_codigo || '789'; // Padrão Brasil
        
        // Gerar parte aleatória (9 dígitos)
        let codigo = prefixo;
        for (let i = 0; i < 9; i++) {
            codigo += Math.floor(Math.random() * 10);
        }
        
        // Calcular dígito verificador
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(codigo.charAt(i)) * (i % 2 === 0 ? 1 : 3);
        }
        
        const digitoVerificador = (10 - (soma % 10)) % 10;
        
        // Retornar código completo
        return codigo + digitoVerificador;
    },
    
    /**
     * Verifica se o código EAN-13 é válido
     */
    verificarCodigoBarras: function(codigo) {
        // Verificar se validação está habilitada
        const config = this.getConfig();
        if (!config.validar_digito) {
            return true;
        }
        
        if (!codigo || typeof codigo !== 'string') {
            return false;
        }
        
        // Remover espaços e outros caracteres não numéricos
        codigo = codigo.replace(/\D/g, '');
        
        // Verificar se tem 13 dígitos
        if (codigo.length !== 13) {
            return false;
        }
        
        // Algoritmo de verificação EAN-13
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(codigo.charAt(i)) * (i % 2 === 0 ? 1 : 3);
        }
        
        const digitoVerificador = (10 - (soma % 10)) % 10;
        
        return digitoVerificador === parseInt(codigo.charAt(12));
    },
    
    // ===== MÉTODOS DE ACESSO - PRODUTOS =====
    
    /**
     * Obtém todos os produtos
     */
    getProdutos: function() {
        return JSON.parse(localStorage.getItem('orion_produtos') || '{}');
    },
    
    /**
     * Obtém um produto pelo código de barras
     */
    getProduto: function(codigoBarras) {
        const produtos = this.getProdutos();
        return produtos[codigoBarras];
    },
    
    /**
     * Obtém um produto pelo ID antigo
     */
    getProdutoPorId: function(id) {
        const indices = JSON.parse(localStorage.getItem('orion_indices_produtos') || '{}');
        const codigoBarras = indices.por_id && indices.por_id[id];
        
        if (codigoBarras) {
            return this.getProduto(codigoBarras);
        }
        
        return null;
    },
    
    /**
     * Busca produtos por nome (parcial)
     */
    buscarProdutosPorNome: function(termoBusca) {
        if (!termoBusca) {
            return [];
        }
        
        const produtos = this.getProdutos();
        const resultado = [];
        
        // Busca simples por substring no nome
        termoBusca = termoBusca.toLowerCase();
        
        for (const codigo in produtos) {
            const produto = produtos[codigo];
            if (produto.nome.toLowerCase().includes(termoBusca)) {
                resultado.push(produto);
            }
        }
        
        return resultado;
    },
    
    /**
     * Filtra produtos por grupo
     */
    filtrarProdutosPorGrupo: function(grupo) {
        if (!grupo) {
            return Object.values(this.getProdutos());
        }
        
        const indices = JSON.parse(localStorage.getItem('orion_indices_produtos') || '{}');
        const codigosNoGrupo = indices.por_grupo && indices.por_grupo[grupo] || [];
        
        const produtos = this.getProdutos();
        return codigosNoGrupo.map(codigo => produtos[codigo]);
    },
    
    /**
     * Salva um produto usando código de barras como chave
     */
    salvarProduto: function(produto) {
        if (!produto.codigo_barras) {
            produto.codigo_barras = this.gerarCodigoBarras();
        } else if (!this.verificarCodigoBarras(produto.codigo_barras)) {
            throw new Error('Código de barras inválido');
        }
        
        // Validar campos obrigatórios
        if (!produto.nome || produto.nome.trim() === '') {
            throw new Error('Nome do produto é obrigatório');
        }
        
        // Gerar ID interno se não existir (para compatibilidade)
        if (!produto.id) {
            produto.id = 'p_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }
        
        // Garantir que estoque seja um número
        produto.estoque = parseInt(produto.estoque || 0);
        
        // Garantir que preço seja um número
        produto.preco = parseFloat(produto.preco || 0);
        if (isNaN(produto.preco)) produto.preco = 0;
        
        // Adicionar data de cadastro se for um novo produto
        if (!produto.data_cadastro) {
            produto.data_cadastro = new Date().toISOString();
        }
        
        // Obter produtos e índices existentes
        const produtos = this.getProdutos();
        const indices = JSON.parse(localStorage.getItem('orion_indices_produtos') || '{}');
        
        // Inicializar índices se necessário
        if (!indices.por_id) indices.por_id = {};
        if (!indices.por_nome) indices.por_nome = {};
        if (!indices.por_grupo) indices.por_grupo = {};
        
        // Verificar se produto existia anteriormente com outro código
        let codigoAnterior = null;
        if (produto.id && indices.por_id[produto.id] && indices.por_id[produto.id] !== produto.codigo_barras) {
            codigoAnterior = indices.por_id[produto.id];
        }
        
        // Remover das estruturas antigas se necessário
        if (codigoAnterior) {
            // Remover do índice de nome
            const produtoAntigo = produtos[codigoAnterior];
            if (produtoAntigo) {
                const nomeLower = produtoAntigo.nome.toLowerCase();
                if (indices.por_nome[nomeLower]) {
                    indices.por_nome[nomeLower] = indices.por_nome[nomeLower].filter(c => c !== codigoAnterior);
                    if (indices.por_nome[nomeLower].length === 0) {
                        delete indices.por_nome[nomeLower];
                    }
                }
                
                // Remover do índice de grupo
                if (produtoAntigo.grupo && indices.por_grupo[produtoAntigo.grupo]) {
                    indices.por_grupo[produtoAntigo.grupo] = indices.por_grupo[produtoAntigo.grupo].filter(c => c !== codigoAnterior);
                    if (indices.por_grupo[produtoAntigo.grupo].length === 0) {
                        delete indices.por_grupo[produtoAntigo.grupo];
                    }
                }
            }
            
            // Remover produto antigo
            delete produtos[codigoAnterior];
        }
        
        // Salvar produto usando código de barras como chave
        produtos[produto.codigo_barras] = produto;
        
        // Atualizar índices
        indices.por_id[produto.id] = produto.codigo_barras;
        
        // Índice de nome
        const nomeLower = produto.nome.toLowerCase();
        if (!indices.por_nome[nomeLower]) {
            indices.por_nome[nomeLower] = [];
        }
        if (!indices.por_nome[nomeLower].includes(produto.codigo_barras)) {
            indices.por_nome[nomeLower].push(produto.codigo_barras);
        }
        
        // Índice de grupo
        if (produto.grupo) {
            if (!indices.por_grupo[produto.grupo]) {
                indices.por_grupo[produto.grupo] = [];
            }
            if (!indices.por_grupo[produto.grupo].includes(produto.codigo_barras)) {
                indices.por_grupo[produto.grupo].push(produto.codigo_barras);
            }
            
            // Atualizar lista de grupos se for um novo grupo
            this.salvarGrupoProdutos(produto.grupo);
        }
        
        // Salvar alterações
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        localStorage.setItem('orion_indices_produtos', JSON.stringify(indices));
        
        // Invalidar cache
        this.invalidarCache();
        
        return produto;
    },
    
    /**
     * Remove um produto
     */
    removerProduto: function(codigoBarras) {
        // Obter produtos e índices
        const produtos = this.getProdutos();
        const indices = JSON.parse(localStorage.getItem('orion_indices_produtos') || '{}');
        
        // Verificar se produto existe
        if (!produtos[codigoBarras]) {
            return false;
        }
        
        const produto = produtos[codigoBarras];
        
        // Remover dos índices
        if (produto.id && indices.por_id) {
            delete indices.por_id[produto.id];
        }
        
        // Remover do índice de nome
        if (indices.por_nome) {
            const nomeLower = produto.nome.toLowerCase();
            if (indices.por_nome[nomeLower]) {
                indices.por_nome[nomeLower] = indices.por_nome[nomeLower].filter(c => c !== codigoBarras);
                if (indices.por_nome[nomeLower].length === 0) {
                    delete indices.por_nome[nomeLower];
                }
            }
        }
        
        // Remover do índice de grupo
        if (produto.grupo && indices.por_grupo && indices.por_grupo[produto.grupo]) {
            indices.por_grupo[produto.grupo] = indices.por_grupo[produto.grupo].filter(c => c !== codigoBarras);
            if (indices.por_grupo[produto.grupo].length === 0) {
                delete indices.por_grupo[produto.grupo];
            }
        }
        
        // Remover produto
        delete produtos[codigoBarras];
        
        // Salvar alterações
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        localStorage.setItem('orion_indices_produtos', JSON.stringify(indices));
        
        // Invalidar cache
        this.invalidarCache();
        
        return true;
    },
    
    /**
     * Atualiza o estoque de um produto
     */
    atualizarEstoqueProduto: function(codigoBarras, quantidade, motivo = '') {
        // Obter produto
        const produtos = this.getProdutos();
        const produto = produtos[codigoBarras];
        
        if (!produto) {
            throw new Error('Produto não encontrado');
        }
        
        // Registrar estoque anterior
        const estoqueAnterior = produto.estoque || 0;
        
        // Atualizar estoque (nunca negativo)
        produto.estoque = Math.max(0, estoqueAnterior + quantidade);
        
        // Determinar tipo de movimentação
        const tipoMovimentacao = quantidade > 0 ? 'entrada' : 
                                quantidade < 0 ? 'saida' : 'ajuste';
        
        // Registrar movimentação
        const movimentacao = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
            produto_codigo: codigoBarras,
            produto_nome: produto.nome,
            tipo: tipoMovimentacao,
            quantidade: Math.abs(quantidade),
            estoque_anterior: estoqueAnterior,
            estoque_atual: produto.estoque,
            motivo: motivo || (quantidade > 0 ? 'Entrada manual' : 'Saída manual'),
            data: new Date().toISOString(),
            usuario: this.getUsuarioAtual()?.nome || 'Sistema'
        };
        
        this.salvarMovimentacaoEstoque(movimentacao);
        
        // Salvar produto atualizado
        produtos[codigoBarras] = produto;
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        
        // Atualizar cache de produtos sem estoque se necessário
        if (produto.estoque === 0 || estoqueAnterior === 0) {
            this.atualizarCacheProdutosSemEstoque();
        }
        
        return { produto, movimentacao };
    },
    
    // ===== MÉTODOS DE ACESSO - GRUPOS =====
    
    /**
     * Obtém grupos de produtos
     */
    getGruposProdutos: function() {
        return JSON.parse(localStorage.getItem('orion_grupos_produtos') || '[]');
    },
    
    /**
     * Salva um grupo de produtos
     */
    salvarGrupoProdutos: function(grupo) {
        if (!grupo || grupo.trim() === '') {
            return false;
        }
        
        const grupos = this.getGruposProdutos();
        const grupoTrim = grupo.trim();
        
        if (!grupos.includes(grupoTrim)) {
            grupos.push(grupoTrim);
            grupos.sort(); // Ordenar alfabeticamente
            localStorage.setItem('orion_grupos_produtos', JSON.stringify(grupos));
            return true;
        }
        
        return false;
    },
    
    /**
     * Remove um grupo e atualiza produtos relacionados
     */
    removerGrupoProdutos: function(grupo) {
        if (!grupo) {
            return false;
        }
        
        // Remover da lista de grupos
        const grupos = this.getGruposProdutos();
        const index = grupos.indexOf(grupo);
        
        if (index === -1) {
            return false;
        }
        
        grupos.splice(index, 1);
        localStorage.setItem('orion_grupos_produtos', JSON.stringify(grupos));
        
        // Atualizar produtos que usam este grupo
        const produtos = this.getProdutos();
        const indices = JSON.parse(localStorage.getItem('orion_indices_produtos') || '{}');
        
        // Obter códigos dos produtos neste grupo
        const codigosNoGrupo = indices.por_grupo && indices.por_grupo[grupo] || [];
        
        // Remover grupo dos produtos
        codigosNoGrupo.forEach(codigo => {
            if (produtos[codigo]) {
                produtos[codigo].grupo = '';
            }
        });
        
        // Remover do índice de grupo
        if (indices.por_grupo) {
            delete indices.por_grupo[grupo];
        }
        
        // Salvar alterações
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        localStorage.setItem('orion_indices_produtos', JSON.stringify(indices));
        
        return true;
    },
    
    // ===== MÉTODOS DE ACESSO - CLIENTES =====
    
    /**
     * Obtém todos os clientes
     */
    getClientes: function() {
        return JSON.parse(localStorage.getItem('orion_clientes') || '[]');
    },
    
    /**
     * Obtém um cliente específico
     */
    getCliente: function(id) {
        const clientes = this.getClientes();
        return clientes.find(cliente => cliente.id === id);
    },
    
    /**
     * Salva um cliente
     */
    salvarCliente: function(cliente) {
        const clientes = this.getClientes();
        
        if (!cliente.id) {
            // Novo cliente
            cliente.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
            cliente.data_cadastro = new Date().toISOString();
            clientes.push(cliente);
        } else {
            // Atualizar cliente existente
            const index = clientes.findIndex(c => c.id === cliente.id);
            
            if (index !== -1) {
                // Manter algumas propriedades internas
                if (clientes[index].data_cadastro) {
                    cliente.data_cadastro = clientes[index].data_cadastro;
                }
                
                clientes[index] = cliente;
            } else {
                cliente.data_cadastro = new Date().toISOString();
                clientes.push(cliente);
            }
        }
        
        localStorage.setItem('orion_clientes', JSON.stringify(clientes));
        return cliente;
    },
    
    /**
     * Remove um cliente
     */
    removerCliente: function(id) {
        // Não permitir remover o cliente padrão (Consumidor Final)
        if (id === '1') {
            return false;
        }
        
        const clientes = this.getClientes();
        const index = clientes.findIndex(c => c.id === id);
        
        if (index !== -1) {
            clientes.splice(index, 1);
            localStorage.setItem('orion_clientes', JSON.stringify(clientes));
            return true;
        }
        
        return false;
    },
    
    // ===== MÉTODOS DE ACESSO - VENDAS E CARRINHO =====
    
    /**
     * Obtém o carrinho atual
     */
    getCarrinho: function() {
        return JSON.parse(localStorage.getItem('orion_carrinho') || '[]');
    },
    
    /**
     * Adiciona um item ao carrinho
     */
    adicionarItemCarrinho: function(item) {
        if (!item.codigo_barras || !item.nome || isNaN(item.preco) || isNaN(item.quantidade)) {
            throw new Error('Dados do item incompletos');
        }
        
        const carrinho = this.getCarrinho();
        
        // Verificar se o produto já está no carrinho
        const index = carrinho.findIndex(i => i.codigo_barras === item.codigo_barras);
        
        if (index !== -1) {
            // Atualizar quantidade
            carrinho[index].quantidade += item.quantidade;
            carrinho[index].subtotal = carrinho[index].preco * carrinho[index].quantidade;
        } else {
            // Garantir subtotal
            item.subtotal = item.preco * item.quantidade;
            
            // Adicionar novo item
            carrinho.push(item);
        }
        
        localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
        return true;
    },
    
    /**
     * Remove um item do carrinho
     */
    removerItemCarrinho: function(codigoBarras) {
        const carrinho = this.getCarrinho();
        const index = carrinho.findIndex(item => item.codigo_barras === codigoBarras);
        
        if (index !== -1) {
            carrinho.splice(index, 1);
            localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
            return true;
        }
        
        return false;
    },
    
    /**
     * Atualiza a quantidade de um item no carrinho
     */
    atualizarQuantidadeCarrinho: function(codigoBarras, quantidade) {
        if (quantidade <= 0) {
            return this.removerItemCarrinho(codigoBarras);
        }
        
        const carrinho = this.getCarrinho();
        const index = carrinho.findIndex(item => item.codigo_barras === codigoBarras);
        
        if (index !== -1) {
            // Verificar estoque disponível
            const produto = this.getProduto(codigoBarras);
            if (produto && quantidade > produto.estoque) {
                throw new Error(`Quantidade maior que o estoque disponível (${produto.estoque})`);
            }
            
            carrinho[index].quantidade = quantidade;
            carrinho[index].subtotal = carrinho[index].preco * quantidade;
            localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
            return true;
        }
        
        return false;
    },
    
    /**
     * Limpa o carrinho
     */
    limparCarrinho: function() {
        localStorage.setItem('orion_carrinho', '[]');
        return true;
    },
    
    /**
     * Obtém todas as vendas
     */
    getVendas: function() {
        return JSON.parse(localStorage.getItem('orion_vendas') || '[]');
    },
    
    /**
     * Obtém uma venda específica
     */
    getVenda: function(id) {
        const vendas = this.getVendas();
        const venda = vendas.find(v => v.id === id);
        
        if (venda) {
            // Carregar itens
            const vendasItems = JSON.parse(localStorage.getItem('orion_vendas_items') || '{}');
            venda.itens = vendasItems[id] || [];
        }
        
        return venda;
    },
    
    /**
     * Registra uma venda
     */
    registrarVenda: function(venda) {
        if (!venda.cliente_id || !venda.itens || venda.itens.length === 0) {
            throw new Error('Dados de venda incompletos');
        }
        
        // Gerar ID se não existir
        if (!venda.id) {
            venda.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }
        
        // Garantir data
        if (!venda.data) {
            venda.data = new Date().toISOString();
        }
        
        // Separar itens para armazenamento
        const itens = venda.itens;
        delete venda.itens;
        
        // Obter vendas existentes
        const vendas = this.getVendas();
        const vendasItems = JSON.parse(localStorage.getItem('orion_vendas_items') || '{}');
        
        // Atualizar estoque dos produtos
        itens.forEach(item => {
            try {
                this.atualizarEstoqueProduto(
                    item.codigo_barras, 
                    -item.quantidade, 
                    'Venda #' + venda.id
                );
            } catch (erro) {
                console.error(`Erro ao atualizar estoque do produto ${item.codigo_barras}:`, erro);
            }
        });
        
        // Salvar venda
        vendas./**
     * Registra uma venda
     */
    registrarVenda: function(venda) {
        if (!venda.cliente_id || !venda.itens || venda.itens.length === 0) {
            throw new Error('Dados de venda incompletos');
        }
        
        // Gerar ID se não existir
        if (!venda.id) {
            venda.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }
        
        // Garantir data
        if (!venda.data) {
            venda.data = new Date().toISOString();
        }
        
        // Separar itens para armazenamento
        const itens = venda.itens;
        delete venda.itens;
        
        // Obter vendas existentes
        const vendas = this.getVendas();
        const vendasItems = JSON.parse(localStorage.getItem('orion_vendas_items') || '{}');
        
        // Atualizar estoque dos produtos
        itens.forEach(item => {
            try {
                this.atualizarEstoqueProduto(
                    item.codigo_barras, 
                    -item.quantidade, 
                    'Venda #' + venda.id
                );
            } catch (erro) {
                console.error(`Erro ao atualizar estoque do produto ${item.codigo_barras}:`, erro);
            }
        });
        
        // Salvar venda
        vendas.push(venda);
        vendasItems[venda.id] = itens;
        
        // Atualizar cliente
        this.atualizarClienteAposVenda(venda);
        
        // Salvar dados
        localStorage.setItem('orion_vendas', JSON.stringify(vendas));
        localStorage.setItem('orion_vendas_items', JSON.stringify(vendasItems));
        
        // Limpar carrinho
        this.limparCarrinho();
        
        // Atualizar estatísticas
        this.atualizarEstatisticasVendas();
        
        return { id: venda.id, ...venda, itens };
    },
    
    /**
     * Atualiza dados do cliente após uma venda
     */
    atualizarClienteAposVenda: function(venda) {
        const clientes = this.getClientes();
        const clienteIndex = clientes.findIndex(c => c.id === venda.cliente_id);
        
        if (clienteIndex !== -1) {
            // Atualizar última compra e total de compras
            clientes[clienteIndex].ultima_compra = venda.data;
            clientes[clienteIndex].total_compras = (clientes[clienteIndex].total_compras || 0) + 1;
            
            // Salvar clientes atualizados
            localStorage.setItem('orion_clientes', JSON.stringify(clientes));
        }
    },
    
    /**
     * Cancela uma venda e restitui o estoque
     */
    cancelarVenda: function(id, motivo) {
        const venda = this.getVenda(id);
        
        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        
        // Verificar se a venda já foi cancelada
        if (venda.cancelada) {
            throw new Error('Esta venda já foi cancelada');
        }
        
        // Restituir estoque
        venda.itens.forEach(item => {
            try {
                this.atualizarEstoqueProduto(
                    item.codigo_barras, 
                    item.quantidade, 
                    'Cancelamento de venda #' + id
                );
            } catch (erro) {
                console.error(`Erro ao restituir estoque do produto ${item.codigo_barras}:`, erro);
            }
        });
        
        // Marcar venda como cancelada
        const vendas = this.getVendas();
        const vendaIndex = vendas.findIndex(v => v.id === id);
        
        if (vendaIndex !== -1) {
            vendas[vendaIndex].cancelada = true;
            vendas[vendaIndex].data_cancelamento = new Date().toISOString();
            vendas[vendaIndex].motivo_cancelamento = motivo || 'Não informado';
            vendas[vendaIndex].usuario_cancelamento = this.getUsuarioAtual()?.nome || 'Sistema';
            
            // Salvar alterações
            localStorage.setItem('orion_vendas', JSON.stringify(vendas));
            
            // Atualizar estatísticas
            this.atualizarEstatisticasVendas();
            
            return { sucesso: true, venda: vendas[vendaIndex] };
        }
        
        return { sucesso: false, mensagem: 'Venda não encontrada' };
    },
    
    // ===== MÉTODOS DE ACESSO - MOVIMENTAÇÕES DE ESTOQUE =====
    
    /**
     * Obtém todas as movimentações de estoque
     */
    getMovimentacoesEstoque: function() {
        return JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]');
    },
    
    /**
     * Salva uma movimentação de estoque
     */
    salvarMovimentacaoEstoque: function(movimentacao) {
        if (!movimentacao.produto_codigo || !movimentacao.tipo) {
            throw new Error('Dados da movimentação incompletos');
        }
        
        // Garantir ID
        if (!movimentacao.id) {
            movimentacao.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }
        
        // Garantir data
        if (!movimentacao.data) {
            movimentacao.data = new Date().toISOString();
        }
        
        // Obter movimentações
        const movimentacoes = this.getMovimentacoesEstoque();
        
        // Adicionar movimentação
        movimentacoes.push(movimentacao);
        
        // Salvar
        localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(movimentacoes));
        
        return movimentacao;
    },
    
    /**
     * Obtém movimentações de um produto específico
     */
    getMovimentacoesProduto: function(codigoBarras) {
        const movimentacoes = this.getMovimentacoesEstoque();
        return movimentacoes.filter(m => m.produto_codigo === codigoBarras);
    },
    
    // ===== MÉTODOS DE ACESSO - USUÁRIOS E AUTENTICAÇÃO =====
    
    /**
     * Obtém todos os usuários
     */
    getUsuarios: function() {
        return JSON.parse(localStorage.getItem('orion_usuarios') || '{}');
    },
    
    /**
     * Obtém um usuário específico
     */
    getUsuario: function(username) {
        const usuarios = this.getUsuarios();
        return usuarios[username];
    },
    
    /**
     * Faz login de um usuário
     */
    login: function(username, senha) {
        // Verificar login direto para "jesus" (admin padrão)
        if (username === "jesus" && senha === "123") {
            const dadosSessao = {
                username: "jesus",
                nome: "Jesus Martins",
                perfil: "admin",
                timestamp: new Date().toISOString()
            };
            
            // Salvar na sessão
            sessionStorage.setItem('orion_auth', JSON.stringify(dadosSessao));
            
            return { sucesso: true, mensagem: 'Login realizado com sucesso' };
        }
        
        // Verificar se o usuário existe
        const usuarios = this.getUsuarios();
        const usuario = usuarios[username];
        
        if (!usuario) {
            return { sucesso: false, mensagem: 'Usuário não encontrado' };
        }
        
        // Verificar a senha
        const senhaHash = this.hashSenha(senha);
        
        if (usuario.senha_hash !== senhaHash) {
            return { sucesso: false, mensagem: 'Senha incorreta' };
        }
        
        // Autenticar usuário
        const dadosSessao = {
            username: usuario.username,
            nome: usuario.nome,
            perfil: usuario.perfil,
            timestamp: new Date().toISOString()
        };
        
        // Salvar na sessão
        sessionStorage.setItem('orion_auth', JSON.stringify(dadosSessao));
        
        // Atualizar último login
        usuarios[username].ultimo_login = new Date().toISOString();
        localStorage.setItem('orion_usuarios', JSON.stringify(usuarios));
        
        return { sucesso: true, mensagem: 'Login realizado com sucesso' };
    },
    
    /**
     * Verifica se o usuário está autenticado
     */
    verificarAutenticacao: function() {
        const dadosSessao = sessionStorage.getItem('orion_auth');
        
        if (!dadosSessao) {
            return false;
        }
        
        try {
            const sessao = JSON.parse(dadosSessao);
            
            // Verificar se a sessão é válida
            if (!sessao.username || !sessao.timestamp) {
                return false;
            }
            
            // Verificação especial para o usuário "jesus"
            if (sessao.username === "jesus") {
                return true;
            }
            
            // Verificar se o usuário ainda existe
            const usuarios = this.getUsuarios();
            if (!usuarios[sessao.username]) {
                this.fazerLogout();
                return false;
            }
            
            // Verificar tempo de sessão (expirar após 8 horas)
            const agora = new Date();
            const inicioSessao = new Date(sessao.timestamp);
            const horasDecorridas = (agora - inicioSessao) / (1000 * 60 * 60);
            
            if (horasDecorridas > 8) {
                this.fazerLogout();
                return false;
            }
            
            return true;
        } catch (erro) {
            console.error('Erro ao verificar autenticação:', erro);
            return false;
        }
    },
    
    /**
     * Retorna os dados do usuário atual
     */
    getUsuarioAtual: function() {
        if (!this.verificarAutenticacao()) {
            return null;
        }
        
        try {
            return JSON.parse(sessionStorage.getItem('orion_auth'));
        } catch (erro) {
            console.error('Erro ao obter usuário atual:', erro);
            return null;
        }
    },
    
    /**
     * Faz logout do usuário
     */
    fazerLogout: function() {
        sessionStorage.removeItem('orion_auth');
        return true;
    },
    
    /**
     * Verifica se o usuário tem permissão
     */
    verificarPermissao: function(permissaoNecessaria) {
        const usuario = this.getUsuarioAtual();
        
        if (!usuario) {
            return false;
        }
        
        // Usuário jesus e admin têm acesso a tudo
        if (usuario.username === "jesus" || usuario.perfil === 'admin') {
            return true;
        }
        
        // Verificar permissões específicas
        switch (permissaoNecessaria) {
            case 'venda':
                // Vendedores e supervisores podem registrar vendas
                return ['vendedor', 'supervisor'].includes(usuario.perfil);
            
            case 'estoque':
            case 'relatorio':
                // Apenas admin e supervisor podem gerenciar estoque e relatórios
                return usuario.perfil === 'supervisor';
            
            default:
                return false;
        }
    },
    
    // ===== MÉTODOS DE ACESSO - CONFIGURAÇÕES =====
    
    /**
     * Obtém as configurações do sistema
     */
    getConfig: function() {
        return JSON.parse(localStorage.getItem('orion_config') || '{}');
    },
    
    /**
     * Salva as configurações do sistema
     */
    salvarConfig: function(config) {
        localStorage.setItem('orion_config', JSON.stringify(config));
        return config;
    },
    
    // ===== MÉTODOS DE SUPORTE E UTILITÁRIOS =====
    
    /**
     * Invalida o cache de estatísticas
     */
    invalidarCache: function() {
        const cache = JSON.parse(localStorage.getItem('orion_cache_stats') || '{}');
        cache.ultima_atualizacao = null;
        localStorage.setItem('orion_cache_stats', JSON.stringify(cache));
    },
    
    /**
     * Atualiza estatísticas de produtos mais vendidos
     */
    atualizarEstatisticasVendas: function() {
        // Obter vendas
        const vendas = this.getVendas();
        const vendasItems = JSON.parse(localStorage.getItem('orion_vendas_items') || '{}');
        
        // Apenas vendas não canceladas
        const vendasValidas = vendas.filter(v => !v.cancelada);
        
        // Mapear produtos vendidos
        const produtosVendidos = {};
        
        vendasValidas.forEach(venda => {
            const itens = vendasItems[venda.id] || [];
            
            itens.forEach(item => {
                if (!produtosVendidos[item.codigo_barras]) {
                    produtosVendidos[item.codigo_barras] = {
                        codigo_barras: item.codigo_barras,
                        nome: item.nome,
                        quantidade: 0,
                        valor_total: 0
                    };
                }
                
                produtosVendidos[item.codigo_barras].quantidade += item.quantidade;
                produtosVendidos[item.codigo_barras].valor_total += item.subtotal;
            });
        });
        
        // Converter para array e ordenar por quantidade
        const produtosMaisVendidos = Object.values(produtosVendidos).sort((a, b) => b.quantidade - a.quantidade);
        
        // Salvar cache
        const cache = JSON.parse(localStorage.getItem('orion_cache_stats') || '{}');
        cache.produtos_mais_vendidos = produtosMaisVendidos.slice(0, 10); // Top 10
        cache.ultima_atualizacao = new Date().toISOString();
        localStorage.setItem('orion_cache_stats', JSON.stringify(cache));
    },
    
    /**
     * Atualiza cache de produtos sem estoque
     */
    atualizarCacheProdutosSemEstoque: function() {
        const produtos = this.getProdutos();
        const semEstoque = [];
        
        for (const codigo in produtos) {
            if (produtos[codigo].estoque <= 0) {
                semEstoque.push({
                    codigo_barras: codigo,
                    nome: produtos[codigo].nome,
                    preco: produtos[codigo].preco
                });
            }
        }
        
        // Ordenar por nome
        semEstoque.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Salvar cache
        const cache = JSON.parse(localStorage.getItem('orion_cache_stats') || '{}');
        cache.produtos_sem_estoque = semEstoque;
        localStorage.setItem('orion_cache_stats', JSON.stringify(cache));
    },
    
    /**
     * Gera um relatório de vendas
     */
    gerarRelatorioVendas: function(filtros = {}) {
        // Obter todas as vendas
        const vendas = this.getVendas();
        const vendasItems = JSON.parse(localStorage.getItem('orion_vendas_items') || '{}');
        
        // Aplicar filtros
        let vendasFiltradas = vendas;
        
        // Filtrar vendas canceladas
        if (filtros.incluirCanceladas === false) {
            vendasFiltradas = vendasFiltradas.filter(venda => !venda.cancelada);
        }
        
        // Filtrar por data
        if (filtros.dataInicio || filtros.dataFim) {
            const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : new Date(0); // 1970
            const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : new Date(); // Agora
            
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
            vendasFiltradas = vendasFiltradas.filter(venda => 
                venda.forma_pagamento === filtros.formaPagamento ||
                venda.forma_pagamento_id === filtros.formaPagamento);
        }
        
        // Adicionar itens às vendas
        vendasFiltradas = vendasFiltradas.map(venda => ({
            ...venda,
            itens: vendasItems[venda.id] || []
        }));
        
        // Calcular totais
        const totalVendas = vendasFiltradas.length;
        const valorTotal = vendasFiltradas.reduce((acc, venda) => acc + venda.total, 0);
        const valorDesconto = vendasFiltradas.reduce((acc, venda) => acc + (venda.desconto || 0), 0);
        const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
        
        // Agrupar por forma de pagamento
        const vendasPorFormaPagamento = {};
        vendasFiltradas.forEach(venda => {
            const formaPagamento = venda.forma_pagamento || 'Não especificada';
            
            if (!vendasPorFormaPagamento[formaPagamento]) {
                vendasPorFormaPagamento[formaPagamento] = {
                    quantidade: 0,
                    valor: 0
                };
            }
            
            vendasPorFormaPagamento[formaPagamento].quantidade += 1;
            vendasPorFormaPagamento[formaPagamento].valor += venda.total;
        });
        
        // Agrupar por data
        const vendasPorData = {};
        vendasFiltradas.forEach(venda => {
            // Extrair data (sem hora)
            const dataVenda = venda.data.split('T')[0];
            
            if (!vendasPorData[dataVenda]) {
                vendasPorData[dataVenda] = {
                    quantidade: 0,
                    valor: 0
                };
            }
            
            vendasPorData[dataVenda].quantidade += 1;
            vendasPorData[dataVenda].valor += venda.total;
        });
        
        // Produtos mais vendidos no período
        const produtosVendidos = {};
        
        vendasFiltradas.forEach(venda => {
            const itens = venda.itens || [];
            
            itens.forEach(item => {
                if (!produtosVendidos[item.codigo_barras]) {
                    produtosVendidos[item.codigo_barras] = {
                        codigo_barras: item.codigo_barras,
                        nome: item.nome,
                        quantidade: 0,
                        valor_total: 0
                    };
                }
                
                produtosVendidos[item.codigo_barras].quantidade += item.quantidade;
                produtosVendidos[item.codigo_barras].valor_total += item.subtotal;
            });
        });
        
        const produtosMaisVendidos = Object.values(produtosVendidos)
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 10); // Top 10
        
        // Retornar relatório completo
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
            produtosMaisVendidos: produtosMaisVendidos,
            vendas: vendasFiltradas,
            filtros: filtros
        };
    },
    
    /**
     * Gera um backup de todos os dados
     */
    gerarBackup: function() {
        try {
            const backup = {
                versao: this.VERSION,
                timestamp: new Date().toISOString(),
                dados: {
                    produtos: JSON.parse(localStorage.getItem('orion_produtos') || '{}'),
                    indices_produtos: JSON.parse(localStorage.getItem('orion_indices_produtos') || '{}'),
                    grupos_produtos: JSON.parse(localStorage.getItem('orion_grupos_produtos') || '[]'),
                    clientes: JSON.parse(localStorage.getItem('orion_clientes') || '[]'),
                    usuarios: JSON.parse(localStorage.getItem('orion_usuarios') || '{}'),
                    vendas: JSON.parse(localStorage.getItem('orion_vendas') || '[]'),
                    vendas_items: JSON.parse(localStorage.getItem('orion_vendas_items') || '{}'),
                    movimentacoes_estoque: JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]'),
                    config: JSON.parse(localStorage.getItem('orion_config') || '{}')
                }
            };
            
            const backupStr = JSON.stringify(backup);
            
            // Criar blob e baixar arquivo
            const blob = new Blob([backupStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orion_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Registrar data do backup
            localStorage.setItem('orion_last_backup', new Date().toISOString());
            
            return { sucesso: true, mensagem: 'Backup criado com sucesso!' };
        } catch (erro) {
            console.error('Erro ao gerar backup:', erro);
            return { sucesso: false, mensagem: 'Erro ao gerar backup: ' + erro.message };
        }
    },
    
    /**
     * Restaura um backup
     */
    restaurarBackup: function(backupStr) {
        try {
            const backup = JSON.parse(backupStr);
            
            // Verificar se é um backup válido
            if (!backup.versao || !backup.dados || !backup.dados.produtos) {
                throw new Error('Arquivo de backup inválido ou corrompido');
            }
            
            // Salvar todos os dados
            localStorage.setItem('orion_produtos', JSON.stringify(backup.dados.produtos));
            localStorage.setItem('orion_indices_produtos', JSON.stringify(backup.dados.indices_produtos || {}));
            localStorage.setItem('orion_grupos_produtos', JSON.stringify(backup.dados.grupos_produtos || []));
            localStorage.setItem('orion_clientes', JSON.stringify(backup.dados.clientes || []));
            localStorage.setItem('orion_usuarios', JSON.stringify(backup.dados.usuarios || {}));
            localStorage.setItem('orion_vendas', JSON.stringify(backup.dados.vendas || []));
            localStorage.setItem('orion_vendas_items', JSON.stringify(backup.dados.vendas_items || {}));
            localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(backup.dados.movimentacoes_estoque || []));
            localStorage.setItem('orion_config', JSON.stringify(backup.dados.config || {}));
            
            // Atualizar versão e metadados
            localStorage.setItem('orion_version', backup.versao);
            localStorage.setItem('orion_initialized', 'true');
            localStorage.setItem('orion_last_backup', new Date().toISOString());
            
            // Verificar se precisa migrar para versão atual
            if (backup.versao !== this.VERSION) {
                this.migrarDados(backup.versao);
            }
            
            // Resetar cache
            localStorage.setItem('orion_cache_stats', JSON.stringify({
                produtos_mais_vendidos: [],
                produtos_sem_estoque: [],
                ultima_atualizacao: null
            }));
            
            // Invalidar sessão atual
            sessionStorage.removeItem('orion_auth');
            
            return { sucesso: true, mensagem: 'Backup restaurado com sucesso!' };
        } catch (erro) {
            console.error('Erro ao restaurar backup:', erro);
            return { sucesso: false, mensagem: 'Erro ao restaurar backup: ' + erro.message };
        }
    },
    
    /**
     * Exporta dados para CSV
     */
    exportarCSV: function(dados, nomeArquivo = 'exportacao.csv') {
        if (!Array.isArray(dados) || dados.length === 0) {
            return { sucesso: false, mensagem: 'Nenhum dado para exportar' };
        }
        
        try {
            // Obter cabeçalhos
            const headers = Object.keys(dados[0]);
            let csvContent = headers.join(',') + '\n';
            
            // Adicionar linhas
            for (const item of dados) {
                const values = headers.map(header => {
                    const valor = item[header] === null || item[header] === undefined ? '' : item[header];
                    // Formatar para CSV (escapar aspas e adicionar aspas se contiver vírgulas)
                    if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"') || valor.includes('\n'))) {
                        return `"${valor.replace(/"/g, '""')}"`;
                    }
                    return valor;
                });
                
                csvContent += values.join(',') + '\n';
            }
            
            // Criar blob e baixar
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nomeArquivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            return { sucesso: true, mensagem: 'Exportação concluída com sucesso' };
        } catch (erro) {
            console.error('Erro ao exportar CSV:', erro);
            return { sucesso: false, mensagem: 'Erro ao exportar: ' + erro.message };
        }
    },
    
    /**
     * Limpa completamente o banco de dados (para testes ou reset)
     * CUIDADO: Isso apaga todos os dados!
     */
    limparBancoDados: function() {
        // Verificar se o usuário tem permissão de admin
        const usuario = this.getUsuarioAtual();
        if (!usuario || (usuario.username !== 'jesus' && usuario.perfil !== 'admin')) {
            return { sucesso: false, mensagem: 'Permissão negada' };
        }
        
        try {
            // Remover todas as chaves do sistema
            const chaves = Object.keys(localStorage).filter(k => k.startsWith('orion_'));
            chaves.forEach(chave => localStorage.removeItem(chave));
            
            // Remover sessão
            sessionStorage.removeItem('orion_auth');
            
            // Reinicializar banco de dados
            this.inicializar();
            
            return { sucesso: true, mensagem: 'Banco de dados limpo e reinicializado' };
        } catch (erro) {
            console.error('Erro ao limpar banco de dados:', erro);
            return { sucesso: false, mensagem: 'Erro ao limpar banco de dados: ' + erro.message };
        }
    }
};

// Inicializar banco de dados quando o script carregar
document.addEventListener('DOMContentLoaded', function() {
    db.inicializar();
});
/**
     * Busca produto por código de barras e adiciona ao carrinho
     */
    adicionarProdutoPorCodigo: function(codigo, quantidade = 1) {
        try {
            if (!codigo) {
                throw new Error('Código de barras não informado');
            }
            
            // Buscar produto
            const produto = db.getProduto(codigo);
            
            if (!produto) {
                throw new Error('Produto não encontrado');
            }
            
            // Verificar estoque
            if (produto.estoque <= 0) {
                throw new Error('Produto sem estoque disponível');
            }
            
            if (quantidade > produto.estoque) {
                throw new Error(`Quantidade informada maior que estoque disponível (${produto.estoque})`);
            }
            
            // Adicionar ao carrinho
            const itemCarrinho = {
                codigo_barras: produto.codigo_barras,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: quantidade,
                subtotal: produto.preco * quantidade,
                foto: produto.foto || null
            };
            
            const resultado = db.adicionarItemCarrinho(itemCarrinho);
            
            return {
                sucesso: resultado,
                produto: produto,
                carrinho: db.getCarrinho()
            };
        } catch (erro) {
            console.error('Erro ao adicionar produto:', erro);
            return {
                sucesso: false,
                mensagem: erro.message,
                carrinho: db.getCarrinho()
            };
        }
    },
    
    /**
     * Finaliza uma venda com os dados do formulário
     */
    finalizarVenda: function(formData) {
        try {
            // Verificar se há itens no carrinho
            const carrinho = db.getCarrinho();
            
            if (carrinho.length === 0) {
                throw new Error('Não há itens no carrinho');
            }
            
            // Calcular totais
            const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
            const desconto = parseFloat(formData.desconto) || 0;
            const total = subtotal - desconto;
            
            if (total <= 0) {
                throw new Error('O valor total da venda deve ser maior que zero');
            }
            
            // Verificar cliente
            const clienteId = formData.cliente_id || '1'; // Padrão: Consumidor Final
            const cliente = db.getCliente(clienteId);
            
            if (!cliente) {
                throw new Error('Cliente não encontrado');
            }
            
            // Obter forma de pagamento
            const formaPagamento = formData.forma_pagamento || 'dinheiro';
            let formaPagamentoTexto = formaPagamento;
            
            // Buscar texto descritivo da forma de pagamento se estiver em um select
            const select = document.getElementById('forma-pagamento');
            if (select) {
                const option = select.querySelector(`option[value="${formaPagamento}"]`);
                if (option) {
                    formaPagamentoTexto = option.textContent;
                }
            }
            
            // Obter usuário logado
            const usuario = db.getUsuarioAtual();
            
            // Criar objeto da venda
            const venda = {
                cliente_id: cliente.id,
                cliente_nome: cliente.nome,
                forma_pagamento: formaPagamentoTexto,
                forma_pagamento_id: formaPagamento,
                itens: carrinho,
                subtotal: subtotal,
                desconto: desconto,
                total: total,
                usuario: usuario ? usuario.nome : 'Sistema',
                usuario_id: usuario ? usuario.username : null,
                data: new Date().toISOString(),
                observacao: formData.observacao || ''
            };
            
            // Registrar venda
            const resultado = db.registrarVenda(venda);
            
            // Limpar carrinho já é feito dentro de registrarVenda
            
            return {
                sucesso: true,
                venda: resultado,
                carrinho: []
            };
        } catch (erro) {
            console.error('Erro ao finalizar venda:', erro);
            return {
                sucesso: false,
                mensagem: erro.message,
                carrinho: db.getCarrinho()
            };
        }
    },
    
    /**
     * Valida um código de barras
     */
    validarCodigoBarras: function(codigo) {
        if (!codigo) return false;
        
        // Remover caracteres não numéricos
        codigo = codigo.replace(/\D/g, '');
        
        // Validar tamanho
        if (codigo.length !== 13) return false;
        
        // Algoritmo de validação EAN-13
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(codigo.charAt(i)) * (i % 2 === 0 ? 1 : 3);
        }
        
        const digitoVerificador = (10 - (soma % 10)) % 10;
        
        return digitoVerificador === parseInt(codigo.charAt(12));
    },
    
    /**
     * Formata um código de barras conforme padrão
     */
    formatarCodigoBarras: function(codigo) {
        if (!codigo) return '';
        
        // Remover caracteres não numéricos
        codigo = codigo.replace(/\D/g, '');
        
        // Formatar EAN-13
        if (codigo.length === 13) {
            return codigo.substr(0, 1) + ' ' + 
                   codigo.substr(1, 6) + ' ' + 
                   codigo.substr(7, 6);
        }
        
        return codigo;
    },
    
    /**
     * Formata um CPF
     */
    formatarCPF: function(cpf) {
        if (!cpf) return '';
        
        // Remover caracteres não numéricos
        cpf = cpf.replace(/\D/g, '');
        
        if (cpf.length !== 11) return cpf;
        
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },
    
    /**
     * Valida um CPF
     */
    validarCPF: function(cpf) {
        if (!cpf) return false;
        
        // Remover caracteres não numéricos
        cpf = cpf.replace(/\D/g, '');
        
        if (cpf.length !== 11) return false;
        
        // Verificar CPFs inválidos conhecidos
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        
        // Validação do primeiro dígito
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpf.charAt(i)) * (10 - i);
        }
        
        let resto = 11 - (soma % 11);
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(9))) return false;
        
        // Validação do segundo dígito
        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpf.charAt(i)) * (11 - i);
        }
        
        resto = 11 - (soma % 11);
        if (resto === 10 || resto === 11) resto = 0;
        
        return resto === parseInt(cpf.charAt(10));
    },
    
    /**
     * Gera uma notificação toast
     */
    notificar: function(mensagem, tipo = 'info', duracao = 3000) {
        // Criar container se não existir
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.top = '1rem';
            container.style.right = '1rem';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '0.5rem';
            document.body.appendChild(container);
        }
        
        // Criar toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.style.padding = '0.75rem 1rem';
        toast.style.borderRadius = '0.25rem';
        toast.style.minWidth = '250px';
        toast.style.maxWidth = '350px';
        toast.style.boxShadow = '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '0.5rem';
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s ease';
        
        // Estilo baseado no tipo
        if (tipo === 'success') {
            toast.style.backgroundColor = '#43A047';
            toast.style.color = 'white';
        } else if (tipo === 'error' || tipo === 'danger') {
            toast.style.backgroundColor = '#E53935';
            toast.style.color = 'white';
        } else if (tipo === 'warning') {
            toast.style.backgroundColor = '#FFB300';
            toast.style.color = 'black';
        } else {
            toast.style.backgroundColor = '#2196F3';
            toast.style.color = 'white';
        }
        
        // Ícone baseado no tipo
        let icone = 'info-circle';
        if (tipo === 'success') icone = 'check-circle';
        if (tipo === 'error' || tipo === 'danger') icone = 'exclamation-circle';
        if (tipo === 'warning') icone = 'exclamation-triangle';
        
        // Adicionar conteúdo
        toast.innerHTML = `
            <i class="fas fa-${icone}"></i>
            <span>${mensagem}</span>
        `;
        
        // Adicionar ao container
        container.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);
        
        // Remover após duração
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, duracao);
    },
    
    /**
     * Mostra confirmação personalizada
     */
    confirmar: function(opcoes = {}) {
        return new Promise((resolve, reject) => {
            // Configurar opções padrão
            const config = {
                titulo: opcoes.titulo || 'Confirmação',
                mensagem: opcoes.mensagem || 'Tem certeza que deseja continuar?',
                textoBtnSim: opcoes.textoBtnSim || 'Sim',
                textoBtnNao: opcoes.textoBtnNao || 'Não',
                tipo: opcoes.tipo || 'info'
            };
            
            // Criar modal de confirmação
            const modal = document.createElement('div');
            modal.className = 'modal-confirm';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            
            // Cor baseada no tipo
            let corTipo = '#2196F3';
            let iconeTipo = 'info-circle';
            
            if (config.tipo === 'success') {
                corTipo = '#43A047';
                iconeTipo = 'check-circle';
            } else if (config.tipo === 'warning') {
                corTipo = '#FFB300';
                iconeTipo = 'exclamation-triangle';
            } else if (config.tipo === 'danger' || config.tipo === 'error') {
                corTipo = '#E53935';
                iconeTipo = 'exclamation-circle';
            }
            
            // Conteúdo do modal
            modal.innerHTML = `
                <div class="modal-confirm-content" style="background-color: #fff; border-radius: 0.25rem; box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15); width: 100%; max-width: 400px; overflow: hidden;">
                    <div class="modal-confirm-header" style="padding: 1rem; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; gap: 0.75rem;">
                        <i class="fas fa-${iconeTipo}" style="color: ${corTipo}; font-size: 1.25rem;"></i>
                        <h5 style="margin: 0; font-size: 1.25rem;">${config.titulo}</h5>
                    </div>
                    <div class="modal-confirm-body" style="padding: 1rem;">
                        <p style="margin-top: 0;">${config.mensagem}</p>
                    </div>
                    <div class="modal-confirm-footer" style="padding: 1rem; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 0.5rem;">
                        <button class="btn-cancelar" style="padding: 0.375rem 0.75rem; border: 1px solid #dee2e6; background-color: #fff; border-radius: 0.25rem; cursor: pointer;">${config.textoBtnNao}</button>
                        <button class="btn-confirmar" style="padding: 0.375rem 0.75rem; background-color: ${corTipo}; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">${config.textoBtnSim}</button>
                    </div>
                </div>
            `;
            
            // Adicionar ao DOM
            document.body.appendChild(modal);
            
            // Animar entrada
            setTimeout(() => {
                modal.style.opacity = '1';
            }, 10);
            
            // Adicionar eventos
            const btnConfirmar = modal.querySelector('.btn-confirmar');
            const btnCancelar = modal.querySelector('.btn-cancelar');
            
            btnConfirmar.addEventListener('click', () => {
                // Animar saída
                modal.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(modal);
                    resolve(true);
                }, 300);
            });
            
            btnCancelar.addEventListener('click', () => {
                // Animar saída
                modal.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(modal);
                    resolve(false);
                }, 300);
            });
            
            // Fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    // Animar saída
                    modal.style.opacity = '0';
                    setTimeout(() => {
                        document.body.removeChild(modal);
                        resolve(false);
                    }, 300);
                }
            });
        });
    }
};
