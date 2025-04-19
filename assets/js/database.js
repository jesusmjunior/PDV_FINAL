/**
 * ORION PDV - Sistema de Gerenciamento de Banco de Dados Local
 * Utiliza localStorage para armazenar dados de produtos, clientes, vendas e configurações
 * 
 * Este módulo fornece funções para:
 * - Inicialização do banco de dados
 * - CRUD de produtos
 * - CRUD de clientes
 * - CRUD de vendas
 * - Gerenciamento de configurações
 * - Backup e restauração
 */

// Namespace do banco de dados
const db = (function() {
    
    // Chaves para o localStorage
    const KEYS = {
        INITIALIZED: 'orion_initialized',
        VERSION: 'orion_version',
        PRODUCTS: 'orion_produtos',
        CLIENTS: 'orion_clientes',
        SALES: 'orion_vendas',
        CONFIG: 'orion_config',
        CART: 'orion_carrinho',
        BACKUP: 'orion_ultimo_backup',
        STOCK_MOVEMENTS: 'orion_movimentacoes_estoque'
    };
    
    // Versão atual do banco de dados
    const CURRENT_VERSION = '1.0.0';
    
    /**
     * Inicializa o banco de dados com dados padrão se necessário
     */
    function inicializarDB() {
        // Verificar se já está inicializado
        if (localStorage.getItem(KEYS.INITIALIZED) === 'true') {
            return true;
        }
        
        try {
            // Criar estruturas básicas
            
            // Produtos
            if (!localStorage.getItem(KEYS.PRODUCTS)) {
                localStorage.setItem(KEYS.PRODUCTS, JSON.stringify({}));
            }
            
            // Clientes
            if (!localStorage.getItem(KEYS.CLIENTS)) {
                // Criar cliente padrão "Consumidor Final"
                const clientesPadrao = [{
                    id: "1",
                    nome: "Consumidor Final",
                    documento: "",
                    telefone: "",
                    email: "",
                    endereco: "",
                    cidade: "",
                    data_cadastro: new Date().toISOString()
                }];
                
                localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clientesPadrao));
            }
            
            // Vendas
            if (!localStorage.getItem(KEYS.SALES)) {
                localStorage.setItem(KEYS.SALES, JSON.stringify([]));
            }
            
            // Configurações
            if (!localStorage.getItem(KEYS.CONFIG)) {
                const configPadrao = {
                    nome_empresa: "ORION PDV",
                    slogan: "Gestão Inteligente de Vendas",
                    cnpj: "",
                    telefone: "",
                    email: "",
                    endereco: "",
                    cidade: "",
                    logo_url: "assets/img/logo.png",
                    tema: "dark",
                    cor_primaria: "#0B3D91",
                    cor_secundaria: "#1E88E5"
                };
                
                localStorage.setItem(KEYS.CONFIG, JSON.stringify(configPadrao));
            }
            
            // Carrinho
            if (!localStorage.getItem(KEYS.CART)) {
                localStorage.setItem(KEYS.CART, JSON.stringify([]));
            }
            
            // Movimentações de estoque
            if (!localStorage.getItem(KEYS.STOCK_MOVEMENTS)) {
                localStorage.setItem(KEYS.STOCK_MOVEMENTS, JSON.stringify([]));
            }
            
            // Definir versão e status de inicialização
            localStorage.setItem(KEYS.VERSION, CURRENT_VERSION);
            localStorage.setItem(KEYS.INITIALIZED, 'true');
            
            return true;
        } catch (error) {
            console.error('Erro ao inicializar banco de dados:', error);
            return false;
        }
    }
    
    /**
     * Gera um ID único baseado em timestamp e valor aleatório
     * @returns {string} ID único
     */
    function gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    // ========== FUNÇÕES PARA PRODUTOS ==========
    
    /**
     * Obtém todos os produtos
     * @returns {Object} Objeto com todos os produtos indexados por ID
     */
    function getProdutos() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '{}');
        } catch (error) {
            console.error('Erro ao obter produtos:', error);
            return {};
        }
    }
    
    /**
     * Obtém um produto pelo ID
     * @param {string} id ID do produto
     * @returns {Object|null} Produto encontrado ou null
     */
    function getProduto(id) {
        const produtos = getProdutos();
        return produtos[id] || null;
    }
    
    /**
     * Obtém um produto pelo código de barras
     * @param {string} codigo Código de barras do produto
     * @returns {Object|null} Produto encontrado ou null
     */
    function getProdutoPorCodigo(codigo) {
        const produtos = getProdutos();
        
        for (const id in produtos) {
            if (produtos[id].codigo_barras === codigo) {
                return produtos[id];
            }
        }
        
        return null;
    }
    
    /**
     * Salva um produto (novo ou atualização)
     * @param {Object} produto Dados do produto
     * @returns {string} ID do produto
     */
    function salvarProduto(produto) {
        try {
            const produtos = getProdutos();
            
            // Se não tem ID, é um novo produto
            if (!produto.id) {
                produto.id = gerarId();
                produto.data_cadastro = new Date().toISOString();
            }
            
            // Adicionar ao objeto de produtos
            produtos[produto.id] = produto;
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(produtos));
            
            return produto.id;
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            throw error;
        }
    }
    
    /**
     * Deleta um produto pelo ID
     * @param {string} id ID do produto
     * @returns {boolean} Sucesso da operação
     */
    function deletarProduto(id) {
        try {
            const produtos = getProdutos();
            
            // Verificar se existe
            if (!produtos[id]) {
                return false;
            }
            
            // Remover produto
            delete produtos[id];
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(produtos));
            
            return true;
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            return false;
        }
    }
    
    /**
     * Atualiza o estoque de um produto
     * @param {string} id ID do produto
     * @param {number} quantidade Quantidade a adicionar (positivo) ou remover (negativo)
     * @param {string} motivo Motivo da movimentação
     * @returns {boolean} Sucesso da operação
     */
    function atualizarEstoqueProduto(id, quantidade, motivo = 'ajuste') {
        try {
            const produtos = getProdutos();
            
            // Verificar se existe
            if (!produtos[id]) {
                return false;
            }
            
            // Atualizar estoque
            produtos[id].estoque = Math.max(0, (produtos[id].estoque || 0) + quantidade);
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(produtos));
            
            // Registrar movimentação de estoque
            registrarMovimentacaoEstoque({
                produto_id: id,
                produto_nome: produtos[id].nome,
                tipo: quantidade > 0 ? 'entrada' : 'saida',
                quantidade: Math.abs(quantidade),
                motivo: motivo,
                data: new Date().toISOString(),
                usuario: sessionStorage.getItem('orion_user_nome') || 'Sistema'
            });
            
            return true;
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            return false;
        }
    }
    
    /**
     * Registra uma movimentação de estoque
     * @param {Object} movimentacao Dados da movimentação
     */
    function registrarMovimentacaoEstoque(movimentacao) {
        try {
            const movimentacoes = JSON.parse(localStorage.getItem(KEYS.STOCK_MOVEMENTS) || '[]');
            movimentacoes.push(movimentacao);
            localStorage.setItem(KEYS.STOCK_MOVEMENTS, JSON.stringify(movimentacoes));
        } catch (error) {
            console.error('Erro ao registrar movimentação de estoque:', error);
        }
    }
    
    /**
     * Obtém todas as movimentações de estoque
     * @returns {Array} Lista de movimentações
     */
    function getMovimentacoesEstoque() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.STOCK_MOVEMENTS) || '[]');
        } catch (error) {
            console.error('Erro ao obter movimentações de estoque:', error);
            return [];
        }
    }
    
    /**
     * Obtém grupos únicos de produtos
     * @returns {Array} Lista de grupos únicos
     */
    function getGruposProdutos() {
        try {
            const produtos = getProdutos();
            const grupos = new Set();
            
            // Extrair grupos únicos
            Object.values(produtos).forEach(produto => {
                if (produto.grupo) {
                    grupos.add(produto.grupo);
                }
            });
            
            return [...grupos].sort();
        } catch (error) {
            console.error('Erro ao obter grupos de produtos:', error);
            return [];
        }
    }
    
    /**
     * Obtém marcas únicas de produtos
     * @returns {Array} Lista de marcas únicas
     */
    function getMarcasProdutos() {
        try {
            const produtos = getProdutos();
            const marcas = new Set();
            
            // Extrair marcas únicas
            Object.values(produtos).forEach(produto => {
                if (produto.marca) {
                    marcas.add(produto.marca);
                }
            });
            
            return [...marcas].sort();
        } catch (error) {
            console.error('Erro ao obter marcas de produtos:', error);
            return [];
        }
    }
    
    // ========== FUNÇÕES PARA CLIENTES ==========
    
    /**
     * Obtém todos os clientes
     * @returns {Array} Lista de clientes
     */
    function getClientes() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.CLIENTS) || '[]');
        } catch (error) {
            console.error('Erro ao obter clientes:', error);
            return [];
        }
    }
    
    /**
     * Obtém um cliente pelo ID
     * @param {string} id ID do cliente
     * @returns {Object|null} Cliente encontrado ou null
     */
    function getCliente(id) {
        const clientes = getClientes();
        return clientes.find(cliente => cliente.id === id) || null;
    }
    
    /**
     * Salva um cliente (novo ou atualização)
     * @param {Object} cliente Dados do cliente
     * @returns {string} ID do cliente
     */
    function salvarCliente(cliente) {
        try {
            let clientes = getClientes();
            
            // Se não tem ID, é um novo cliente
            if (!cliente.id) {
                cliente.id = gerarId();
                cliente.data_cadastro = new Date().toISOString();
                clientes.push(cliente);
            } else {
                // Substituir cliente existente
                const index = clientes.findIndex(c => c.id === cliente.id);
                
                if (index !== -1) {
                    clientes[index] = { ...clientes[index], ...cliente };
                } else {
                    clientes.push(cliente);
                }
            }
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clientes));
            
            return cliente.id;
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            throw error;
        }
    }
    
    /**
     * Deleta um cliente pelo ID
     * @param {string} id ID do cliente
     * @returns {boolean} Sucesso da operação
     */
    function deletarCliente(id) {
        try {
            const clientes = getClientes();
            
            // Verificar se existem vendas para este cliente
            const vendas = getVendas();
            const temVendas = vendas.some(venda => venda.cliente_id === id);
            
            if (temVendas) {
                throw new Error("Cliente possui vendas registradas e não pode ser excluído");
            }
            
            // Não permitir excluir o cliente padrão
            if (id === "1") {
                throw new Error("Não é possível excluir o cliente padrão");
            }
            
            // Filtrar clientes, removendo o cliente com o ID fornecido
            const clientesFiltrados = clientes.filter(cliente => cliente.id !== id);
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clientesFiltrados));
            
            return true;
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            throw error;
        }
    }
    
    // ========== FUNÇÕES PARA VENDAS ==========
    
    /**
     * Obtém todas as vendas
     * @returns {Array} Lista de vendas
     */
    function getVendas() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
        } catch (error) {
            console.error('Erro ao obter vendas:', error);
            return [];
        }
    }
    
    /**
     * Obtém uma venda pelo ID
     * @
/**
 * ORION PDV - Sistema de Gerenciamento de Banco de Dados Local
 * Utiliza localStorage para armazenar dados de produtos, clientes, vendas e configurações
 * 
 * Este módulo fornece funções para:
 * - Inicialização do banco de dados
 * - CRUD de produtos
 * - CRUD de clientes
 * - CRUD de vendas
 * - Gerenciamento de configurações
 * - Backup e restauração
 */

// Namespace do banco de dados
const db = (function() {
    
    // Chaves para o localStorage
    const KEYS = {
        INITIALIZED: 'orion_initialized',
        VERSION: 'orion_version',
        PRODUCTS: 'orion_produtos',
        CLIENTS: 'orion_clientes',
        SALES: 'orion_vendas',
        CONFIG: 'orion_config',
        CART: 'orion_carrinho',
        BACKUP: 'orion_ultimo_backup',
        STOCK_MOVEMENTS: 'orion_movimentacoes_estoque'
    };
    
    // Versão atual do banco de dados
    const CURRENT_VERSION = '1.0.0';
    
    /**
     * Inicializa o banco de dados com dados padrão se necessário
     */
    function inicializarDB() {
        // Verificar se já está inicializado
        if (localStorage.getItem(KEYS.INITIALIZED) === 'true') {
            return true;
        }
        
        try {
            // Criar estruturas básicas
            
            // Produtos
            if (!localStorage.getItem(KEYS.PRODUCTS)) {
                localStorage.setItem(KEYS.PRODUCTS, JSON.stringify({}));
            }
            
            // Clientes
            if (!localStorage.getItem(KEYS.CLIENTS)) {
                // Criar cliente padrão "Consumidor Final"
                const clientesPadrao = [{
                    id: "1",
                    nome: "Consumidor Final",
                    documento: "",
                    telefone: "",
                    email: "",
                    endereco: "",
                    cidade: "",
                    data_cadastro: new Date().toISOString()
                }];
                
                localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clientesPadrao));
            }
            
            // Vendas
            if (!localStorage.getItem(KEYS.SALES)) {
                localStorage.setItem(KEYS.SALES, JSON.stringify([]));
            }
            
            // Configurações
            if (!localStorage.getItem(KEYS.CONFIG)) {
                const configPadrao = {
                    nome_empresa: "ORION PDV",
                    slogan: "Gestão Inteligente de Vendas",
                    cnpj: "",
                    telefone: "",
                    email: "",
                    endereco: "",
                    cidade: "",
                    logo_url: "assets/img/logo.png",
                    tema: "dark",
                    cor_primaria: "#0B3D91",
                    cor_secundaria: "#1E88E5"
                };
                
                localStorage.setItem(KEYS.CONFIG, JSON.stringify(configPadrao));
            }
            
            // Carrinho
            if (!localStorage.getItem(KEYS.CART)) {
                localStorage.setItem(KEYS.CART, JSON.stringify([]));
            }
            
            // Movimentações de estoque
            if (!localStorage.getItem(KEYS.STOCK_MOVEMENTS)) {
                localStorage.setItem(KEYS.STOCK_MOVEMENTS, JSON.stringify([]));
            }
            
            // Definir versão e status de inicialização
            localStorage.setItem(KEYS.VERSION, CURRENT_VERSION);
            localStorage.setItem(KEYS.INITIALIZED, 'true');
            
            return true;
        } catch (error) {
            console.error('Erro ao inicializar banco de dados:', error);
            return false;
        }
    }
    
    /**
     * Gera um ID único baseado em timestamp e valor aleatório
     * @returns {string} ID único
     */
    function gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    // ========== FUNÇÕES PARA PRODUTOS ==========
    
    /**
     * Obtém todos os produtos
     * @returns {Object} Objeto com todos os produtos indexados por ID
     */
    function getProdutos() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '{}');
        } catch (error) {
            console.error('Erro ao obter produtos:', error);
            return {};
        }
    }
    
    /**
     * Obtém um produto pelo ID
     * @param {string} id ID do produto
     * @returns {Object|null} Produto encontrado ou null
     */
    function getProduto(id) {
        const produtos = getProdutos();
        return produtos[id] || null;
    }
    
    /**
     * Obtém um produto pelo código de barras
     * @param {string} codigo Código de barras do produto
     * @returns {Object|null} Produto encontrado ou null
     */
    function getProdutoPorCodigo(codigo) {
        const produtos = getProdutos();
        
        for (const id in produtos) {
            if (produtos[id].codigo_barras === codigo) {
                return produtos[id];
            }
        }
        
        return null;
    }
    
    /**
     * Salva um produto (novo ou atualização)
     * @param {Object} produto Dados do produto
     * @returns {string} ID do produto
     */
    function salvarProduto(produto) {
        try {
            const produtos = getProdutos();
            
            // Se não tem ID, é um novo produto
            if (!produto.id) {
                produto.id = gerarId();
                produto.data_cadastro = new Date().toISOString();
            }
            
            // Adicionar ao objeto de produtos
            produtos[produto.id] = produto;
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(produtos));
            
            return produto.id;
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            throw error;
        }
    }
    
    /**
     * Deleta um produto pelo ID
     * @param {string} id ID do produto
     * @returns {boolean} Sucesso da operação
     */
    function deletarProduto(id) {
        try {
            const produtos = getProdutos();
            
            // Verificar se existe
            if (!produtos[id]) {
                return false;
            }
            
            // Remover produto
            delete produtos[id];
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(produtos));
            
            return true;
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            return false;
        }
    }
    
    /**
     * Atualiza o estoque de um produto
     * @param {string} id ID do produto
     * @param {number} quantidade Quantidade a adicionar (positivo) ou remover (negativo)
     * @param {string} motivo Motivo da movimentação
     * @returns {boolean} Sucesso da operação
     */
    function atualizarEstoqueProduto(id, quantidade, motivo = 'ajuste') {
        try {
            const produtos = getProdutos();
            
            // Verificar se existe
            if (!produtos[id]) {
                return false;
            }
            
            // Atualizar estoque
            produtos[id].estoque = Math.max(0, (produtos[id].estoque || 0) + quantidade);
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(produtos));
            
            // Registrar movimentação de estoque
            registrarMovimentacaoEstoque({
                produto_id: id,
                produto_nome: produtos[id].nome,
                tipo: quantidade > 0 ? 'entrada' : 'saida',
                quantidade: Math.abs(quantidade),
                motivo: motivo,
                data: new Date().toISOString(),
                usuario: sessionStorage.getItem('orion_user_nome') || 'Sistema'
            });
            
            return true;
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            return false;
        }
    }
    
    /**
     * Registra uma movimentação de estoque
     * @param {Object} movimentacao Dados da movimentação
     */
    function registrarMovimentacaoEstoque(movimentacao) {
        try {
            const movimentacoes = JSON.parse(localStorage.getItem(KEYS.STOCK_MOVEMENTS) || '[]');
            movimentacoes.push(movimentacao);
            localStorage.setItem(KEYS.STOCK_MOVEMENTS, JSON.stringify(movimentacoes));
        } catch (error) {
            console.error('Erro ao registrar movimentação de estoque:', error);
        }
    }
    
    /**
     * Obtém todas as movimentações de estoque
     * @returns {Array} Lista de movimentações
     */
    function getMovimentacoesEstoque() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.STOCK_MOVEMENTS) || '[]');
        } catch (error) {
            console.error('Erro ao obter movimentações de estoque:', error);
            return [];
        }
    }
    
    /**
     * Obtém grupos únicos de produtos
     * @returns {Array} Lista de grupos únicos
     */
    function getGruposProdutos() {
        try {
            const produtos = getProdutos();
            const grupos = new Set();
            
            // Extrair grupos únicos
            Object.values(produtos).forEach(produto => {
                if (produto.grupo) {
                    grupos.add(produto.grupo);
                }
            });
            
            return [...grupos].sort();
        } catch (error) {
            console.error('Erro ao obter grupos de produtos:', error);
            return [];
        }
    }
    
    /**
     * Obtém marcas únicas de produtos
     * @returns {Array} Lista de marcas únicas
     */
    function getMarcasProdutos() {
        try {
            const produtos = getProdutos();
            const marcas = new Set();
            
            // Extrair marcas únicas
            Object.values(produtos).forEach(produto => {
                if (produto.marca) {
                    marcas.add(produto.marca);
                }
            });
            
            return [...marcas].sort();
        } catch (error) {
            console.error('Erro ao obter marcas de produtos:', error);
            return [];
        }
    }
    
    // ========== FUNÇÕES PARA CLIENTES ==========
    
    /**
     * Obtém todos os clientes
     * @returns {Array} Lista de clientes
     */
    function getClientes() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.CLIENTS) || '[]');
        } catch (error) {
            console.error('Erro ao obter clientes:', error);
            return [];
        }
    }
    
    /**
     * Obtém um cliente pelo ID
     * @param {string} id ID do cliente
     * @returns {Object|null} Cliente encontrado ou null
     */
    function getCliente(id) {
        const clientes = getClientes();
        return clientes.find(cliente => cliente.id === id) || null;
    }
    
    /**
     * Salva um cliente (novo ou atualização)
     * @param {Object} cliente Dados do cliente
     * @returns {string} ID do cliente
     */
    function salvarCliente(cliente) {
        try {
            let clientes = getClientes();
            
            // Se não tem ID, é um novo cliente
            if (!cliente.id) {
                cliente.id = gerarId();
                cliente.data_cadastro = new Date().toISOString();
                clientes.push(cliente);
            } else {
                // Substituir cliente existente
                const index = clientes.findIndex(c => c.id === cliente.id);
                
                if (index !== -1) {
                    clientes[index] = { ...clientes[index], ...cliente };
                } else {
                    clientes.push(cliente);
                }
            }
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clientes));
            
            return cliente.id;
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            throw error;
        }
    }
    
    /**
     * Deleta um cliente pelo ID
     * @param {string} id ID do cliente
     * @returns {boolean} Sucesso da operação
     */
    function deletarCliente(id) {
        try {
            const clientes = getClientes();
            
            // Verificar se existem vendas para este cliente
            const vendas = getVendas();
            const temVendas = vendas.some(venda => venda.cliente_id === id);
            
            if (temVendas) {
                throw new Error("Cliente possui vendas registradas e não pode ser excluído");
            }
            
            // Não permitir excluir o cliente padrão
            if (id === "1") {
                throw new Error("Não é possível excluir o cliente padrão");
            }
            
            // Filtrar clientes, removendo o cliente com o ID fornecido
            const clientesFiltrados = clientes.filter(cliente => cliente.id !== id);
            
            // Salvar no localStorage
            localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clientesFiltrados));
            
            return true;
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            throw error;
        }
    }
    
    // ========== FUNÇÕES PARA VENDAS ==========
    
    /**
     * Obtém todas as vendas
     * @returns {Array} Lista de vendas
     */
    function getVendas() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
        } catch (error) {
            console.error('Erro ao obter vendas:', error);
            return [];
        }
    }
    
    /**
     * Obtém uma venda pelo ID
     * @
/**
 * ORION PDV - Sistema de Gestão de Vendas
 * Módulo de Banco de Dados Local (LocalStorage)
 */

const db = {
    /**
     * Inicializa o banco de dados com valores padrão se for a primeira vez
     */
    inicializar: function() {
        // Verificar se já foi inicializado
        if (localStorage.getItem('orion_initialized') === 'true') {
            return;
        }
        
        console.log('Inicializando banco de dados...');
        
        // Versão
        localStorage.setItem('orion_version', '1.0.0');
        
        // Usuários
        const usuarioPadrao = {
            'jesus': {
                username: 'jesus',
                nome: 'Jesus Martins',
                cargo: 'Administrador',
                email: 'jesus@orionpdv.com',
                perfil: 'admin',
                senha_hash: this.hashSenha('123')  // Senha padrão
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
        
        // Dados vazios para outros tipos
        localStorage.setItem('orion_produtos', '{}');
        localStorage.setItem('orion_vendas', '[]');
        localStorage.setItem('orion_carrinho', '[]');
        
        // Configurações padrão
        const configPadrao = {
            nome_empresa: "ORION PDV",
            slogan: "Sistema de Gestão de Vendas",
            tema: "dark",
            cor_primaria: "#0B3D91",
            cor_secundaria: "#1E88E5"
        };
        
        localStorage.setItem('orion_config', JSON.stringify(configPadrao));
        
        // Marcar como inicializado
        localStorage.setItem('orion_initialized', 'true');
        console.log('Banco de dados inicializado com sucesso!');
    },
    
    /**
     * Verifica se há o usuário principal e cria se não existir
     */
    verificarUsuarioPrincipal: function() {
        const usuarios = this.getUsuarios();
        
        // Verificar se usuário "jesus" existe
        if (!usuarios['jesus']) {
            // Criar usuário padrão
            usuarios['jesus'] = {
                username: 'jesus',
                nome: 'Jesus Martins',
                cargo: 'Administrador',
                email: 'jesus@orionpdv.com',
                perfil: 'admin',
                senha_hash: this.hashSenha('123')
            };
            
            // Salvar usuários
            localStorage.setItem('orion_usuarios', JSON.stringify(usuarios));
            console.log('Usuário principal "jesus" criado com sucesso');
        }
    },
    
    /**
     * Gera um hash SHA-256 para a senha
     */
    hashSenha: function(senha) {
        return CryptoJS.SHA256(senha).toString();
    },
    
    /**
     * Obtém os usuários cadastrados
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
     * Obtém a lista de clientes
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
            cliente.id = Date.now().toString();
            clientes.push(cliente);
        } else {
            // Atualizar cliente existente
            const index = clientes.findIndex(c => c.id === cliente.id);
            if (index !== -1) {
                clientes[index] = cliente;
            } else {
                clientes.push(cliente);
            }
        }
        
        localStorage.setItem('orion_clientes', JSON.stringify(clientes));
        return cliente;
    },
    
    /**
     * Remove um cliente
     */
    deletarCliente: function(id) {
        const clientes = this.getClientes();
        const novosClientes = clientes.filter(cliente => cliente.id !== id);
        localStorage.setItem('orion_clientes', JSON.stringify(novosClientes));
    },
    
    /**
     * Obtém a lista de produtos
     */
    getProdutos: function() {
        return JSON.parse(localStorage.getItem('orion_produtos') || '{}');
    },
    
    /**
     * Obtém um produto específico
     */
    getProduto: function(id) {
        const produtos = this.getProdutos();
        return produtos[id];
    },
    
    /**
     * Salva um produto
     */
    salvarProduto: function(produto) {
        const produtos = this.getProdutos();
        
        if (!produto.id) {
            // Novo produto
            produto.id = Date.now().toString();
            produto.data_cadastro = new Date().toISOString();
        }
        
        produtos[produto.id] = produto;
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        
        return produto;
    },
    
    /**
     * Remove um produto
     */
    deletarProduto: function(id) {
        const produtos = this.getProdutos();
        delete produtos[id];
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
    },
    
    /**
     * Obtém as vendas
     */
    getVendas: function() {
        return JSON.parse(localStorage.getItem('orion_vendas') || '[]');
    },
    
    /**
     * Obtém uma venda específica
     */
    getVenda: function(id) {
        const vendas = this.getVendas();
        return vendas.find(venda => venda.id === id);
    },
    
    /**
     * Salva uma venda
     */
    salvarVenda: function(venda) {
        const vendas = this.getVendas();
        
        if (!venda.id) {
            // Nova venda
            venda.id = Date.now().toString();
        }
        
        // Verificar se é nova ou atualização
        const index = vendas.findIndex(v => v.id === venda.id);
        
        if (index !== -1) {
            // Atualizar venda existente
            vendas[index] = venda;
        } else {
            // Adicionar nova venda
            vendas.push(venda);
        }
        
        localStorage.setItem('orion_vendas', JSON.stringify(vendas));
        
        return venda;
    },
    
    /**
     * Atualiza o estoque de um produto
     */
    atualizarEstoqueProduto: function(id, quantidade) {
        const produtos = this.getProdutos();
        if (produtos[id]) {
            produtos[id].estoque += quantidade;
            localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        }
    },
    
    /**
     * Obtém configurações
     */
    getConfig: function() {
        return JSON.parse(localStorage.getItem('orion_config') || '{}');
    },
    
    /**
     * Salva configurações
     */
    salvarConfig: function(config) {
        localStorage.setItem('orion_config', JSON.stringify(config));
    },
    
    /**
     * Gera um backup
     */
    gerarBackup: function() {
        const backup = {
            version: localStorage.getItem('orion_version'),
            usuarios: JSON.parse(localStorage.getItem('orion_usuarios') || '{}'),
            clientes: JSON.parse(localStorage.getItem('orion_clientes') || '[]'),
            produtos: JSON.parse(localStorage.getItem('orion_produtos') || '{}'),
            vendas: JSON.parse(localStorage.getItem('orion_vendas') || '[]'),
            config: JSON.parse(localStorage.getItem('orion_config') || '{}'),
            timestamp: new Date().toISOString()
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
        localStorage.setItem('orion_ultimo_backup', new Date().toISOString());
        
        return true;
    },
    
    /**
     * Restaura um backup
     */
    restaurarBackup: function(backupStr) {
        try {
            const backup = JSON.parse(backupStr);
            
            // Verificar se é um backup válido
            if (!backup.version || !backup.usuarios || !backup.clientes) {
                return { sucesso: false, mensagem: 'Arquivo de backup inválido' };
            }
            
            // Salvar dados
            localStorage.setItem('orion_version', backup.version);
            localStorage.setItem('orion_usuarios', JSON.stringify(backup.usuarios));
            localStorage.setItem('orion_clientes', JSON.stringify(backup.clientes));
            localStorage.setItem('orion_produtos', JSON.stringify(backup.produtos));
            localStorage.setItem('orion_vendas', JSON.stringify(backup.vendas));
            localStorage.setItem('orion_config', JSON.stringify(backup.config));
            localStorage.setItem('orion_initialized', 'true');
            
            // Garantir que o usuário principal exista
            this.verificarUsuarioPrincipal();
            
            return { sucesso: true, mensagem: 'Backup restaurado com sucesso!' };
        } catch (erro) {
            return { sucesso: false, mensagem: 'Erro ao restaurar backup: ' + erro.message };
        }
    },
    
    /**
     * Exporta dados para CSV
     */
    exportarCSV: function(dados, filename) {
        if (!dados || !dados.length) {
            alert('Nenhum dado para exportar');
            return;
        }
        
        // Cabeçalhos
        const headers = Object.keys(dados[0]);
        let csvContent = headers.join(',') + '\n';
        
        // Dados
        dados.forEach(item => {
            const row = headers.map(header => {
                let cell = item[header] === null || item[header] === undefined ? '' : item[header];
                
                // Formatar célula para CSV
                cell = String(cell).replace(/"/g, '""');
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    cell = `"${cell}"`;
                }
                
                return cell;
            });
            
            csvContent += row.join(',') + '\n';
        });
        
        // Criar blob e baixar arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

// Inicializar banco de dados ao carregar
document.addEventListener('DOMContentLoaded', function() {
    db.inicializar();
    db.verificarUsuarioPrincipal(); // Garantir que o usuário principal exista
});


