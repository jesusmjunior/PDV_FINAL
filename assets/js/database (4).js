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
