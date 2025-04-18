// assets/js/database-core.js
class OrionDatabase {
    constructor(storageType = 'localStorage') {
        this.VERSION = '1.2.0';
        this.storageType = storageType; // 'localStorage' ou 'indexedDB'
        this.db = null;
        this.initialized = false;
        this.initialize();
        console.log(`ORION Database System Initialized (${this.storageType})`);
    }
    
    // Inicialização
    initialize() {
        if (this.storageType === 'localStorage') {
            this.initializeLocalStorage();
        } else {
            this.initializeIndexedDB();
        }
    }
    
    // Inicialização para LocalStorage
    initializeLocalStorage() {
        if (!localStorage.getItem('orion_initialized')) {
            this.resetDatabase();
            localStorage.setItem('orion_initialized', 'true');
        }
        
        // Verificar versão e atualizar se necessário
        const dbVersion = localStorage.getItem('orion_version');
        if (dbVersion !== this.VERSION) {
            this.updateDatabaseStructure(dbVersion);
            localStorage.setItem('orion_version', this.VERSION);
        }
        
        this.initialized = true;
    }
    
    // Inicialização para IndexedDB
    initializeIndexedDB() {
        if (!window.indexedDB) {
            console.error('Seu navegador não suporta IndexedDB. Alternando para LocalStorage.');
            this.storageType = 'localStorage';
            this.initializeLocalStorage();
            return;
        }
        
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        
        request.onerror = (event) => {
            console.error('Erro ao abrir o banco de dados:', event.target.error);
            console.warn('Alternando para LocalStorage como fallback');
            this.storageType = 'localStorage';
            this.initializeLocalStorage();
        };
        
        request.onsuccess = (event) => {
            this.db = event.target.result;
            this.initialized = true;
            console.log('Banco de dados IndexedDB inicializado com sucesso!');
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Criar stores/tabelas do banco de dados
            this.createIndexedDBStores(db);
            
            // Inicializar dados padrão após criação das tabelas
            this.inicializarDadosPadrao(db);
        };
    }
    
    // Criar stores para IndexedDB
    createIndexedDBStores(db) {
        // Usuários
        if (!db.objectStoreNames.contains('usuarios')) {
            const usuariosStore = db.createObjectStore('usuarios', { keyPath: 'username' });
            usuariosStore.createIndex('nome', 'nome', { unique: false });
            usuariosStore.createIndex('perfil', 'perfil', { unique: false });
        }
        
        // Produtos
        if (!db.objectStoreNames.contains('produtos')) {
            const produtosStore = db.createObjectStore('produtos', { keyPath: 'id' });
            produtosStore.createIndex('codigo_barras', 'codigo_barras', { unique: true });
            produtosStore.createIndex('nome', 'nome', { unique: false });
            produtosStore.createIndex('grupo', 'grupo', { unique: false });
            produtosStore.createIndex('estoque', 'estoque', { unique: false });
        }
        
        // Clientes
        if (!db.objectStoreNames.contains('clientes')) {
            const clientesStore = db.createObjectStore('clientes', { keyPath: 'id' });
            clientesStore.createIndex('nome', 'nome', { unique: false });
            clientesStore.createIndex('documento', 'documento', { unique: false });
        }
        
        // Vendas
        if (!db.objectStoreNames.contains('vendas')) {
            const vendasStore = db.createObjectStore('vendas', { keyPath: 'id' });
            vendasStore.createIndex('data', 'data', { unique: false });
            vendasStore.createIndex('cliente_id', 'cliente_id', { unique: false });
            vendasStore.createIndex('usuario', 'usuario', { unique: false });
        }
        
        // Configurações
        if (!db.objectStoreNames.contains('configuracoes')) {
            db.createObjectStore('configuracoes', { keyPath: 'id' });
        }
        
        // Dados auxiliares (grupos, marcas, formas de pagamento)
        if (!db.objectStoreNames.contains('auxiliares')) {
            db.createObjectStore('auxiliares', { keyPath: 'id' });
        }
        
        // Carrinho temporário
        if (!db.objectStoreNames.contains('carrinho')) {
            const carrinhoStore = db.createObjectStore('carrinho', { keyPath: 'id', autoIncrement: true });
            carrinhoStore.createIndex('produto_id', 'produto_id', { unique: false });
        }
        
        // Movimentações de estoque
        if (!db.objectStoreNames.contains('movimentacoes_estoque')) {
            const movStore = db.createObjectStore('movimentacoes_estoque', { keyPath: 'id', autoIncrement: true });
            movStore.createIndex('produto_id', 'produto_id', { unique: false });
            movStore.createIndex('tipo', 'tipo', { unique: false });
            movStore.createIndex('data', 'data', { unique: false });
        }
    }
    
    // Dados iniciais para o sistema
    resetDatabase() {
        // Usuários
        const usuarios = {
            "admjesus": {
                "nome": "ADM Jesus",
                "cargo": "Administrador",
                "email": "admin@orionpdv.com",
                "senha_hash": this.hashPassword("senha123"),
                "ultimo_acesso": null,
                "perfil": "admin"
            }
        };
        
        // Produtos de exemplo
        const produtos = {
            '7891000315507': {
                id: '7891000315507',
                nome: 'Leite Integral',
                codigo_barras: '7891000315507',
                grupo: 'Laticínios',
                marca: 'Ninho',
                preco: 5.99,
                estoque: 50,
                estoque_minimo: 10,
                data_cadastro: new Date().toISOString(),
                foto: "https://www.nestleprofessional.com.br/sites/default/files/styles/np_product_detail/public/2022-09/leite-em-po-ninho-integral-lata-400g.png"
            },
            '7891910000197': {
                id: '7891910000197',
                nome: 'Arroz',
                codigo_barras: '7891910000197',
                grupo: 'Grãos',
                marca: 'Tio João',
                preco: 22.90,
                estoque: 35,
                estoque_minimo: 5,
                data_cadastro: new Date().toISOString(),
                foto: "https://m.media-amazon.com/images/I/61l6ojQQtDL._AC_UF894,1000_QL80_.jpg"
            },
            '7891149410116': {
                id: '7891149410116',
                nome: 'Café',
                codigo_barras: '7891149410116',
                grupo: 'Bebidas',
                marca: 'Pilão',
                preco: 15.75,
                estoque: 28,
                estoque_minimo: 8,
                data_cadastro: new Date().toISOString(),
                foto: "https://m.media-amazon.com/images/I/51xq5MnKz4L._AC_UF894,1000_QL80_.jpg"
            }
        };
        
        // Grupos de produtos
        const grupos = ["Alimentos", "Bebidas", "Limpeza", "Higiene", "Laticínios", "Grãos", "Diversos"];
        
        // Marcas
        const marcas = ["Nestlé", "Unilever", "P&G", "Ambev", "Tio João", "Pilão", "Outras"];
        
        // Formas de pagamento
        const formasPagamento = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Pix", "Transferência"];
        
        // Cliente padrão e outros iniciais
        const clientes = [
            {
                id: "1",
                nome: "Consumidor Final",
                documento: "",
                telefone: "",
                email: "",
                endereco: "",
                cidade: "",
                data_cadastro: new Date().toISOString()
            },
            {
                id: "2",
                nome: "Maria Silva",
                documento: "123.456.789-00",
                telefone: "(11) 98765-4321",
                email: "maria@example.com",
                endereco: "Rua das Flores, 123",
                cidade: "São Paulo",
                data_cadastro: new Date().toISOString()
            }
        ];

        // Venda de exemplo
        const vendas = [{
            id: "ABC123",
            data: new Date().toISOString(),
            cliente_id: "1",
            cliente_nome: "Consumidor Final",
            forma_pagamento: "Dinheiro",
            itens: [{
                produto_id: "7891000315507",
                produto_nome: "Leite Integral",
                quantidade: 1,
                preco_unitario: 5.99,
                subtotal: 5.99
            }],
            subtotal: 5.99,
            desconto: 0,
            total: 5.99,
            usuario: "admjesus"
        }];

        // Registrar movimentações de estoque
        const movimentacoesEstoque = [{
            id: this.generateId(),
            data: new Date().toISOString(),
            produto_id: "7891000315507",
            produto_nome: "Leite Integral",
            tipo: "saida",
            quantidade: 1,
            motivo: "venda",
            observacao: "Venda inicial",
            usuario: "admjesus"
        }];

        // Salvar no localStorage (mesmo que esteja usando IndexedDB, mantém compatibilidade)
        localStorage.setItem('orion_usuarios', JSON.stringify(usuarios));
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        localStorage.setItem('orion_grupos', JSON.stringify(grupos));
        localStorage.setItem('orion_marcas', JSON.stringify(marcas));
        localStorage.setItem('orion_formas_pagamento', JSON.stringify(formasPagamento));
        localStorage.setItem('orion_clientes', JSON.stringify(clientes));
        localStorage.setItem('orion_vendas', JSON.stringify(vendas));
        localStorage.setItem('orion_carrinho', JSON.stringify([]));
        localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(movimentacoesEstoque));
        
        // Configurações da loja
        const config = {
            nome_empresa: "ORION PDV",
            slogan: "Gestão Inteligente de Vendas",
            cnpj: "00.000.000/0001-00",
            telefone: "(11) 1234-5678",
            email: "contato@orionpdv.com",
            endereco: "Av. Paulista, 1000",
            cidade: "São Paulo - SP",
            logo_url: "assets/img/logo.png",
            tema: "dark", // dark ou light
            cor_primaria: "#0B3D91",
            cor_secundaria: "#1E88E5",
            chave_pix: "orionpdv@example.com"
        };
        
        localStorage.setItem('orion_config', JSON.stringify(config));
        
        // Se estiver usando IndexedDB, adiciona os mesmos dados
        if (this.storageType === 'indexedDB' && this.db) {
            this.carregarDadosIniciais();
        }
    }
    
    // Inicializar dados padrão para IndexedDB
    async inicializarDadosPadrao(db) {
        try {
            // Verificar se já existem dados
            const usuarios = await this.getAll('usuarios');
            
            if (usuarios.length === 0) {
                console.log('Inicializando dados padrão para IndexedDB...');
                this.carregarDadosIniciais();
            }
        } catch (error) {
            console.error('Erro ao inicializar dados padrão:', error);
        }
    }
    
    // Carregar dados iniciais de localStorage para IndexedDB
    async carregarDadosIniciais() {
        try {
            // Usuário admin
            const usuarioAdmin = {
                username: "admjesus",
                nome: "ADM Jesus",
                cargo: "Administrador",
                email: "admin@orionpdv.com",
                senha_hash: this.hashPassword("senha123"),
                ultimo_acesso: null,
                perfil: "admin"
            };
            await this.add('usuarios', usuarioAdmin);
            
            // Produtos de exemplo
            const produtos = JSON.parse(localStorage.getItem('orion_produtos') || '{}');
            for (const id in produtos) {
                await this.add('produtos', produtos[id]);
            }
            
            // Cliente padrão
            const clientes = JSON.parse(localStorage.getItem('orion_clientes') || '[]');
            for (const cliente of clientes) {
                await this.add('clientes', cliente);
            }
            
            // Dados auxiliares
            const grupos = JSON.parse(localStorage.getItem('orion_grupos') || '[]');
            const marcas = JSON.parse(localStorage.getItem('orion_marcas') || '[]');
            const formasPagamento = JSON.parse(localStorage.getItem('orion_formas_pagamento') || '[]');
            
            await this.add('auxiliares', { id: 'grupos', dados: grupos });
            await this.add('auxiliares', { id: 'marcas', dados: marcas });
            await this.add('auxiliares', { id: 'formas_pagamento', dados: formasPagamento });
            
            // Configurações
            const config = JSON.parse(localStorage.getItem('orion_config') || '{}');
            config.id = 'config';
            await this.add('configuracoes', config);
            
            console.log('Dados padrão inicializados com sucesso!');
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }
    
    // Atualização estrutural do banco para novas versões
    updateDatabaseStructure(oldVersion) {
        console.log(`Atualizando banco de dados da versão ${oldVersion} para ${this.VERSION}`);
        
        // Implementar migrações quando necessário
        if (oldVersion === '1.0.0') {
            // Criar tabela de movimentações de estoque se não existir
            if (!localStorage.getItem('orion_movimentacoes_estoque')) {
                localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify([]));
            }
            
            // Atualizar configurações para incluir chave PIX
            const config = this.getConfig();
            if (!config.chave_pix) {
                config.chave_pix = "orionpdv@example.com";
                this.salvarConfig(config);
            }
        }
        
        if (oldVersion === '1.1.0') {
            // Adicionar novos campos ou funcionalidades da versão 1.2.0
            // Exemplo: adicionar suporte a descontos em itens individuais
            const vendas = this.getVendas();
            vendas.forEach(venda => {
                venda.itens.forEach(item => {
                    if (!item.desconto) {
                        item.desconto = 0;
                    }
                });
            });
            localStorage.setItem('orion_vendas', JSON.stringify(vendas));
        }
    }

    // Utilidades
    hashPassword(password) {
        // Usando CryptoJS para SHA-256 (em produção usar bcrypt ou similar)
        if (typeof CryptoJS !== 'undefined') {
            return CryptoJS.SHA256(password).toString();
        }
        
        // Fallback simples para hash (NÃO usar em produção real)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    generateId() {
        return Math.random().toString(36).substring(2, 9);
    }
    
    // Métodos para IndexedDB
    async add(store, data) {
        if (this.storageType !== 'indexedDB' || !this.db) {
            return this.addLocalStorage(store, data);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.add(data);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async put(store, data) {
        if (this.storageType !== 'indexedDB' || !this.db) {
            return this.putLocalStorage(store, data);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.put(data);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async getAll(store) {
        if (this.storageType !== 'indexedDB' || !this.db) {
            return this.getAllLocalStorage(store);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async get(store, key) {
        if (this.storageType !== 'indexedDB' || !this.db) {
            return this.getLocalStorage(store, key);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.get(key);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async delete(store, key) {
        if (this.storageType !== 'indexedDB' || !this.db) {
            return this.deleteLocalStorage(store, key);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.delete(key);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    async clear(store) {
        if (this.storageType !== 'indexedDB' || !this.db) {
            return this.clearLocalStorage(store);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.clear();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    // Métodos para LocalStorage
    addLocalStorage(store, data) {
        // Implementação depende do tipo de store
        switch (store) {
            case 'usuarios':
                const usuarios = this.getUsuarios();
                usuarios[data.username] = data;
                localStorage.setItem('orion_usuarios', JSON.stringify(usuarios));
                return data;
                
            case 'produtos':
                return this.salvarProduto(data);
                
            case 'clientes':
                return this.salvarCliente(data);
                
            case 'vendas':
                return this.salvarVenda(data);
                
            case 'auxiliares':
                return this.salvarDadosAuxiliares(data.id, data.dados);
                
            case 'configuracoes':
                return this.salvarConfig(data);
                
            default:
                console.error(`Store não implementada: ${store}`);
                return null;
        }
    }
    
    putLocalStorage(store, data) {
        // Mesmo que add para LocalStorage
        return this.addLocalStorage(store, data);
    }
    
    getAllLocalStorage(store) {
        // Implementação depende do tipo de store
        switch (store) {
            case 'usuarios':
                return Object.values(this.getUsuarios());
                
            case 'produtos':
                return Object.values(this.getProdutos());
                
            case 'clientes':
                return this.getClientes();
                
            case 'vendas':
                return this.getVendas();
                
            default:
                console.error(`Store não implementada: ${store}`);
                return [];
        }
    }
    
    getLocalStorage(store, key) {
        // Implementação depende do tipo de store
        switch (store) {
            case 'usuarios':
                return this.getUsuario(key);
                
            case 'produtos':
                return this.getProduto(key);
                
            case 'clientes':
                return this.getCliente(key);
                
            case 'vendas':
                return this.getVenda(key);
                
            case 'configuracoes':
                return this.getConfig();
                
            default:
                console.error(`Store não implementada: ${store}`);
                return null;
        }
    }
    
    deleteLocalStorage(store, key) {
        // Implementação depende do tipo de store
        switch (store) {
            case 'usuarios':
                const usuarios = this.getUsuarios();
                if (usuarios[key]) {
                    delete usuarios[key];
                    localStorage.setItem('orion_usuarios', JSON.stringify(usuarios));
                    return true;
                }
                return false;
                
            case 'produtos':
                return this.deletarProduto(key);
                
            case 'clientes':
                return this.deletarCliente(key);
                
            default:
                console.error(`Store não implementada: ${store}`);
                return false;
        }
    }
    
    clearLocalStorage(store) {
        // Implementação depende do tipo de store
        switch (store) {
            case 'carrinho':
                return this.limparCarrinho();
                
            default:
                console.error(`Clear não implementado para ${store}`);
                return false;
        }
    }
    
    // MÉTODOS DE ACESSO AOS DADOS
    
    // Usuários
    getUsuarios() {
        return JSON.parse(localStorage.getItem('orion_usuarios') || '{}');
    }

    getUsuario(username) {
        const usuarios = this.getUsuarios();
        return usuarios[username];
    }

    adicionarUsuario(usuario) {
        const usuarios = this.getUsuarios();
        usuarios[usuario.username] = usuario;
        localStorage.setItem('orion_usuarios', JSON.stringify(usuarios));
    }

    // Produtos
    getProdutos() {
        return JSON.parse(localStorage.getItem('orion_produtos') || '{}');
    }

    getProduto(id) {
        const produtos = this.getProdutos();
        return produtos[id];
    }

    getProdutoPorCodigoBarras(codigo) {
        const produtos = this.getProdutos();
        return Object.values(produtos).find(p => p.codigo_barras === codigo);
    }

    salvarProduto(produto) {
        const produtos = this.getProdutos();
        
        // Gerar ID se for novo produto
        if (!produto.id) {
            produto.id = produto.codigo_barras || this.generateId();
            produto.data_cadastro = new Date().toISOString();
        }
        
        produtos[produto.id] = produto;
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        return produto;
    }

    atualizarEstoqueProduto(id, quantidade) {
        const produtos = this.getProdutos();
        if (produtos[id]) {
            const estoqueAnterior = produtos[id].estoque;
            produtos[id].estoque += parseInt(quantidade);
            localStorage.setItem('orion_produtos', JSON.stringify(produtos));
            
            // Registrar movimentação
            const tipo = quantidade > 0 ? 'entrada' : 'saida';
            const motivo = quantidade > 0 ? 'ajuste' : 'ajuste';
            
            this.salvarMovimentacaoEstoque({
                produto_id: id,
                produto_nome: produtos[id].nome,
                tipo: tipo,
                quantidade: Math.abs(quantidade),
                motivo: motivo,
                observacao: `Ajuste de estoque de ${estoqueAnterior} para ${produtos[id].estoque}`,
                usuario: auth && auth.getUsuarioAtual ? auth.getUsuarioAtual()?.username : 'sistema'
            });
            
            return true;
        }
        return false;
    }

    deletarProduto(id) {
        const produtos = this.getProdutos();
        if (produtos[id]) {
            delete produtos[id];
            localStorage.setItem('orion_produtos', JSON.stringify(produtos));
            return true;
        }
        return false;
    }

    // Clientes
    getClientes() {
        return JSON.parse(localStorage.getItem('orion_clientes') || '[]');
    }

    getCliente(id) {
        return this.getClientes().find(c => c.id === id);
    }

    salvarCliente(cliente) {
        const clientes = this.getClientes();
        
        if (!cliente.id) {
            cliente.id = this.generateId();
            cliente.data_cadastro = new Date().toISOString();
        } else {
            // Remover cliente existente para atualização
            const index = clientes.findIndex(c => c.id === cliente.id);
            if (index !== -1) {
                clientes.splice(index, 1);
            }
        }
        
        clientes.push(cliente);
        localStorage.setItem('orion_clientes', JSON.stringify(clientes));
        return cliente;
    }

    deletarCliente(id) {
        const clientes = this.getClientes();
        const index = clientes.findIndex(c => c.id === id);
        
        if (index !== -1) {
            clientes.splice(index, 1);
            localStorage.setItem('orion_clientes', JSON.stringify(clientes));
            return true;
        }
        
        return false;
    }

    // Vendas
    getVendas() {
        return JSON.parse(localStorage.getItem('orion_vendas') || '[]');
    }

    getVenda(id) {
        return this.getVendas().find(v => v.id === id);
    }

    salvarVenda(venda) {
        const vendas = this.getVendas();
        
        if (!venda.id) {
            venda.id = this.generateId();
        }
        
        if (!venda.data) {
            venda.data = new Date().toISOString();
        }
        
        vendas.push(venda);
        localStorage.setItem('orion_vendas', JSON.stringify(vendas));
        
        // Registrar movimentações de estoque
        venda.itens.forEach(item => {
            this.salvarMovimentacaoEstoque({
                produto_id: item.produto_id,
                produto_nome: item.produto_nome,
                tipo: 'saida',
                quantidade: item.quantidade,
                motivo: 'venda',
                observacao: `Venda #${venda.id}`,
                usuario: venda.usuario
            });
        });
        
        // Limpar carrinho após finalizar venda
        this.limparCarrinho();
        
        return venda;
    }

    // Movimentações de Estoque
    getMovimentacoesEstoque() {
        return JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]');
    }

    salvarMovimentacaoEstoque(movimentacao) {
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
    }

    // Carrinho
    getCarrinho() {
        return JSON.parse(localStorage.getItem('orion_carrinho') || '[]');
    }

    adicionarItemCarrinho(item) {
        const carrinho = this.getCarrinho();
        
        // Verificar se o produto já está no carrinho
        const indexExistente = carrinho.findIndex(i => i.produto_id === item.produto_id);
        
        if (indexExistente !== -1) {
            // Atualizar quantidade e subtotal
            carrinho[indexExistente].quantidade += item.quantidade;
            carrinho[indexExistente].subtotal = carrinho[indexExistente].quantidade * carrinho[indexExistente].preco_unitario;
        } else {adicionarItemCarrinho(item) {
    const carrinho = this.getCarrinho();
    
    // Verificar se o produto já está no carrinho
    const indexExistente = carrinho.findIndex(i => i.produto_id === item.produto_id);
    
    if (indexExistente !== -1) {
        // Atualizar quantidade e subtotal
        carrinho[indexExistente].quantidade += item.quantidade;
        carrinho[indexExistente].subtotal = carrinho[indexExistente].quantidade * carrinho[indexExistente].preco_unitario;
    } else {
        // Adicionar novo item
        if (!item.id) {
            item.id = this.generateId();
        }
        
        // Calcular subtotal
        item.subtotal = item.quantidade * item.preco_unitario;
        
        carrinho.push(item);
    }
    
    localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
    return carrinho;
}

removerItemCarrinho(itemId) {
    const carrinho = this.getCarrinho();
    const index = carrinho.findIndex(i => i.id === itemId);
    
    if (index !== -1) {
        carrinho.splice(index, 1);
        localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
        return true;
    }
    
    return false;
}

atualizarItemCarrinho(itemId, quantidade) {
    const carrinho = this.getCarrinho();
    const index = carrinho.findIndex(i => i.id === itemId);
    
    if (index !== -1) {
        carrinho[index].quantidade = quantidade;
        carrinho[index].subtotal = carrinho[index].quantidade * carrinho[index].preco_unitario;
        localStorage.setItem('orion_carrinho', JSON.stringify(carrinho));
        return carrinho[index];
    }
    
    return null;
}

limparCarrinho() {
    localStorage.setItem('orion_carrinho', JSON.stringify([]));
    return true;
}

// Dados auxiliares
getGrupos() {
    return JSON.parse(localStorage.getItem('orion_grupos') || '[]');
}

getMarcas() {
    return JSON.parse(localStorage.getItem('orion_marcas') || '[]');
}

getFormasPagamento() {
    return JSON.parse(localStorage.getItem('orion_formas_pagamento') || '[]');
}

salvarDadosAuxiliares(tipo, dados) {
    localStorage.setItem(`orion_${tipo}`, JSON.stringify(dados));
    return dados;
}

// Configurações
getConfig() {
    return JSON.parse(localStorage.getItem('orion_config') || '{}');
}

salvarConfig(config) {
    localStorage.setItem('orion_config', JSON.stringify(config));
    return config;
}

// Relatórios
getRelatorioVendas(dataInicio, dataFim) {
    const vendas = this.getVendas();
    
    // Filtrar por período
    const vendasPeriodo = vendas.filter(venda => {
        const dataVenda = new Date(venda.data);
        return dataVenda >= dataInicio && dataVenda <= dataFim;
    });
    
    // Calcular totais
    const totalVendas = vendasPeriodo.length;
    const valorTotal = vendasPeriodo.reduce((total, venda) => total + venda.total, 0);
    const descontoTotal = vendasPeriodo.reduce((total, venda) => total + venda.desconto, 0);
    
    // Agrupar por forma de pagamento
    const vendasPorFormaPagamento = {};
    vendasPeriodo.forEach(venda => {
        if (!vendasPorFormaPagamento[venda.forma_pagamento]) {
            vendasPorFormaPagamento[venda.forma_pagamento] = {
                quantidade: 0,
                valor: 0
            };
        }
        
        vendasPorFormaPagamento[venda.forma_pagamento].quantidade++;
        vendasPorFormaPagamento[venda.forma_pagamento].valor += venda.total;
    });
    
    // Produtos mais vendidos
    const produtosVendidos = {};
    vendasPeriodo.forEach(venda => {
        venda.itens.forEach(item => {
            if (!produtosVendidos[item.produto_id]) {
                produtosVendidos[item.produto_id] = {
                    nome: item.produto_nome,
                    quantidade: 0,
                    valor: 0
                };
            }
            
            produtosVendidos[item.produto_id].quantidade += item.quantidade;
            produtosVendidos[item.produto_id].valor += item.subtotal;
        });
    });
    
    // Converter para array e ordenar por quantidade
    const produtosMaisVendidos = Object.values(produtosVendidos).sort((a, b) => b.quantidade - a.quantidade);
    
    return {
        periodo: {
            inicio: dataInicio,
            fim: dataFim
        },
        totais: {
            vendas: totalVendas,
            valor: valorTotal,
            desconto: descontoTotal
        },
        formasPagamento: vendasPorFormaPagamento,
        produtosMaisVendidos: produtosMaisVendidos
    };
}

getRelatorioProdutos() {
    const produtos = this.getProdutos();
    const produtosArray = Object.values(produtos);
    
    // Produtos com estoque baixo
    const estoqueBaixo = produtosArray.filter(p => p.estoque <= p.estoque_minimo)
        .sort((a, b) => a.estoque - b.estoque);
    
    // Valor total em estoque
    const valorEstoque = produtosArray.reduce((total, produto) => {
        return total + (produto.preco * produto.estoque);
    }, 0);
    
    return {
        total: produtosArray.length,
        valorEstoque: valorEstoque,
        estoqueBaixo: estoqueBaixo,
        semEstoque: produtosArray.filter(p => p.estoque === 0)
    };
}

// Backup e Restauração
exportarDados() {
    const dados = {
        versao: this.VERSION,
        data: new Date().toISOString(),
        dados: {
            usuarios: this.getUsuarios(),
            produtos: this.getProdutos(),
            clientes: this.getClientes(),
            vendas: this.getVendas(),
            movimentacoes_estoque: this.getMovimentacoesEstoque(),
            grupos: this.getGrupos(),
            marcas: this.getMarcas(),
            formas_pagamento: this.getFormasPagamento(),
            config: this.getConfig()
        }
    };
    
    return JSON.stringify(dados);
}

importarDados(dadosJson) {
    try {
        const dados = JSON.parse(dadosJson);
        
        // Verificar versão
        if (!dados.versao || !dados.dados) {
            throw new Error('Formato de dados inválido');
        }
        
        // Importar dados
        if (dados.dados.usuarios) localStorage.setItem('orion_usuarios', JSON.stringify(dados.dados.usuarios));
        if (dados.dados.produtos) localStorage.setItem('orion_produtos', JSON.stringify(dados.dados.produtos));
        if (dados.dados.clientes) localStorage.setItem('orion_clientes', JSON.stringify(dados.dados.clientes));
        if (dados.dados.vendas) localStorage.setItem('orion_vendas', JSON.stringify(dados.dados.vendas));
        if (dados.dados.movimentacoes_estoque) localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(dados.dados.movimentacoes_estoque));
        if (dados.dados.grupos) localStorage.setItem('orion_grupos', JSON.stringify(dados.dados.grupos));
        if (dados.dados.marcas) localStorage.setItem('orion_marcas', JSON.stringify(dados.dados.marcas));
        if (dados.dados.formas_pagamento) localStorage.setItem('orion_formas_pagamento', JSON.stringify(dados.dados.formas_pagamento));
        if (dados.dados.config) localStorage.setItem('orion_config', JSON.stringify(dados.dados.config));
        
        // Atualizar versão
        localStorage.setItem('orion_version', this.VERSION);
        
        return true;
    } catch (error) {
        console.error('Erro ao importar dados:', error);
        return false;
    }
}

// Método para limpar todos os dados (reset completo)
limparTodosDados() {
    localStorage.removeItem('orion_usuarios');
    localStorage.removeItem('orion_produtos');
    localStorage.removeItem('orion_clientes');
    localStorage.removeItem('orion_vendas');
    localStorage.removeItem('orion_movimentacoes_estoque');
    localStorage.removeItem('orion_grupos');
    localStorage.removeItem('orion_marcas');
    localStorage.removeItem('orion_formas_pagamento');
    localStorage.removeItem('orion_config');
    localStorage.removeItem('orion_carrinho');
    localStorage.removeItem('orion_initialized');
    localStorage.removeItem('orion_version');
    
    // Reinicializar
    this.initialize();
    
    return true;
}
}

// Exportar classe para uso global
window.OrionDatabase = OrionDatabase;
