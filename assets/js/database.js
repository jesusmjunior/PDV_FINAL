/**
 * ORION PDV - Sistema de Banco de Dados
 * Versão 2.0 (2025)
 * 
 * Sistema de armazenamento que utiliza código de barras como chave primária
 * para rápido acesso e melhores práticas de gerenciamento de estoque
 */

const db = {
    VERSION: '2.0.0',
    
    /**
     * Inicializa o banco de dados com estrutura e valores padrão
     */
    inicializar: function() {
        // Verificar se já foi inicializado
        if (localStorage.getItem('orion_initialized') === 'true') {
            console.log('Banco de dados já inicializado');
            
            // Verificar se precisa atualizar a versão
            const versaoAtual = localStorage.getItem('orion_version');
            if (versaoAtual !== this.VERSION) {
                console.log(`Atualizando banco de dados da versão ${versaoAtual} para ${this.VERSION}`);
                this.migrarDados(versaoAtual);
            }
            
            return;
        }
        
        console.log('Inicializando banco de dados...');
        
        // Versão
        localStorage.setItem('orion_version', this.VERSION);
        
        // Usuários
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
        
        // Estruturas principais - chave: código de barras
        localStorage.setItem('orion_produtos', JSON.stringify({}));
        
        // Índices para busca rápida
        localStorage.setItem('orion_indices', JSON.stringify({
            codigo_para_id: {}, // código de barras -> id interno
            id_para_codigo: {}, // id interno -> código de barras
            produtos_por_grupo: {} // grupo -> [códigos de barras]
        }));
        
        // Outras estruturas
        localStorage.setItem('orion_grupos_produtos', JSON.stringify([]));
        localStorage.setItem('orion_vendas', JSON.stringify([]));
        localStorage.setItem('orion_vendas_itens', JSON.stringify({})); // id_venda -> itens[]
        localStorage.setItem('orion_carrinho', JSON.stringify([]));
        localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify([]));
        Continuando com a implementação do `database.js`:

```javascript
        // Configurações padrão
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
            prefixo_codigo_barras: "789" // Prefixo para Brasil
        };
        localStorage.setItem('orion_config', JSON.stringify(configPadrao));
        
        // Cache de relatórios
        localStorage.setItem('orion_cache_relatorios', JSON.stringify({
            produtos_sem_estoque: [],
            produtos_mais_vendidos: [],
            ultima_atualizacao: null
        }));
        
        // Marcar como inicializado
        localStorage.setItem('orion_initialized', 'true');
        console.log('Banco de dados inicializado com sucesso!');
    },
    
    /**
     * Migra dados de versões anteriores para a nova estrutura
     */
    migrarDados: function(versaoAntiga) {
        // Se estiver migrando para versão baseada em código de barras
        if (versaoAntiga < '2.0.0' && this.VERSION >= '2.0.0') {
            console.log('Migrando produtos para usar código de barras como chave primária...');
            this.migrarProdutosParaCodigoBarras();
        }
        
        // Atualizar versão
        localStorage.setItem('orion_version', this.VERSION);
    },
    
    /**
     * Migra produtos para usar código de barras como chave primária
     */
    migrarProdutosParaCodigoBarras: function() {
        try {
            // Obter produtos antigos (id -> produto)
            const produtosAntigos = JSON.parse(localStorage.getItem('orion_produtos') || '{}');
            
            // Criar novas estruturas
            const produtosNovos = {}; // código de barras -> produto
            const indices = {
                codigo_para_id: {}, // código -> id
                id_para_codigo: {}, // id -> código
                produtos_por_grupo: {} // grupo -> [códigos]
            };
            
            // Migrar cada produto
            for (const id in produtosAntigos) {
                const produto = produtosAntigos[id];
                
                // Garantir código de barras
                if (!produto.codigo_barras) {
                    // Usar código legado se existir
                    if (produto.codigo) {
                        produto.codigo_barras = produto.codigo;
                    } else {
                        produto.codigo_barras = this.gerarCodigoBarras();
                    }
                }
                
                // Salvar produto usando código como chave
                produtosNovos[produto.codigo_barras] = produto;
                
                // Atualizar índices
                indices.codigo_para_id[produto.codigo_barras] = id;
                indices.id_para_codigo[id] = produto.codigo_barras;
                
                // Atualizar índice de grupo
                if (produto.grupo) {
                    if (!indices.produtos_por_grupo[produto.grupo]) {
                        indices.produtos_por_grupo[produto.grupo] = [];
                    }
                    indices.produtos_por_grupo[produto.grupo].push(produto.codigo_barras);
                }
            }
            
            // Salvar novas estruturas
            localStorage.setItem('orion_produtos', JSON.stringify(produtosNovos));
            localStorage.setItem('orion_indices', JSON.stringify(indices));
            
            console.log('Migração de produtos concluída com sucesso!');
        } catch (erro) {
            console.error('Erro na migração de produtos:', erro);
        }
    },
    
    /**
     * Gera um hash para senha
     */
    hashSenha: function(senha) {
        if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
            return CryptoJS.SHA256(senha).toString();
        }
        
        // Fallback simples (não seguro para produção)
        let hash = 0;
        for (let i = 0; i < senha.length; i++) {
            const char = senha.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    },
    
    // ===== MÉTODOS DE ACESSO A USUÁRIOS =====
    
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
     * Salva um usuário
     */
    salvarUsuario: function(usuario) {
        if (!usuario.username) {
            throw new Error('Username é obrigatório');
        }
        
        const usuarios = this.getUsuarios();
        
        // Verificar se é um novo usuário
        const novo = !usuarios[usuario.username];
        if (novo) {
            usuario.data_cadastro = new Date().toISOString();
        }
        
        // Hash de senha se for fornecida
        if (usuario.senha) {
            usuario.senha_hash = this.hashSenha(usuario.senha);
            delete usuario.senha; // Remover senha em texto claro
        }
        
        // Salvar usuário
        usuarios[usuario.username] = usuario;
        localStorage.setItem('orion_usuarios', JSON.stringify(usuarios));
        
        return usuario;
    },
    
    /**
     * Remove um usuário
     */
    removerUsuario: function(username) {
        // Impedir a remoção do usuário principal
        if (username === 'jesus') {
            return { sucesso: false, mensagem: 'Não é possível remover o usuário principal' };
        }
        
        const usuarios = this.getUsuarios();
        
        if (usuarios[username]) {
            delete usuarios[username];
            localStorage.setItem('orion_usuarios', JSON.stringify(usuarios));
            return { sucesso: true };
        }
        
        return { sucesso: false, mensagem: 'Usuário não encontrado' };
    },
    
    /**
     * Faz login do usuário
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
     * Verifica se o usuário tem permissão para acessar um recurso
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
    
    // ===== MÉTODOS DE ACESSO A PRODUTOS =====
    
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
     * Obtém produto por ID interno (compatibilidade com código legado)
     */
    getProdutoPorId: function(id) {
        const indices = JSON.parse(localStorage.getItem('orion_indices') || '{}');
        const codigoBarras = indices.id_para_codigo && indices.id_para_codigo[id];
        
        if (codigoBarras) {
            return this.getProduto(codigoBarras);
        }
        
        return null;
    },
    
    /**
     * Gera um código de barras EAN-13 válido
     */
    gerarCodigoBarras: function() {
        // Obter prefixo das configurações
        const config = this.getConfig();
        const prefixo = config.prefixo_codigo_barras || '789';
        
        // Gerar parte aleatória
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
        
        // Adicionar dígito verificador
        codigo += digitoVerificador;
        
        return codigo;
    },
    
    /**
     * Valida um código de barras EAN-13
     */
    validarCodigoBarras: function(codigo) {
        // Integração com barcodeScanner para validação de código
        if (typeof barcodeScanner !== 'undefined' && 
            typeof barcodeScanner.verificarCodigoEAN13 === 'function') {
            return barcodeScanner.verificarCodigoEAN13(codigo);
        }
        
        // Implementação local caso o scanner não esteja disponível
        if (!codigo || typeof codigo !== 'string') {
            return false;
        }
        
        // Remover caracteres não numéricos
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
    
    /**
     * Salva um produto usando código de barras como chave primária
     */
    salvarProduto: function(produto) {
        // Validar campos obrigatórios
        if (!produto.nome || produto.nome.trim() === '') {
            throw new Error('Nome do produto é obrigatório');
        }
        
        if (isNaN(produto.preco) || produto.preco < 0) {
            throw new Error('Preço do produto deve ser um número válido');
        }
        
        // Garantir código de barras
        if (!produto.codigo_barras) {
            produto.codigo_barras = this.gerarCodigoBarras();
        }
        
        // Validar código de barras
        if (!this.validarCodigoBarras(produto.codigo_barras)) {
            throw new Error('Código de barras inválido');
        }
        
        // Garantir que estoque é um número
        produto.estoque = parseInt(produto.estoque || 0);
        if (isNaN(produto.estoque)) produto.estoque = 0;
        
        // Garantir que estoque mínimo é um número
        produto.estoque_minimo = parseInt(produto.estoque_minimo || 0);
        if (isNaN(produto.estoque_minimo)) produto.estoque_minimo = 0;
        
        // Gerar ID interno se não existir (manter compatibilidade)
        if (!produto.id) {
            produto.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }
        
        // Manter código legado para compatibilidade
        produto.codigo = produto.codigo_barras;
        
        // Adicionar data de cadastro se for novo
        if (!produto.data_cadastro) {
            produto.data_cadastro = new Date().toISOString();
        }
        
        // Obter produtos e índices existentes
        const produtos = this.getProdutos();
        const indices = JSON.parse(localStorage.getItem('orion_indices') || '{}');
        
        // Inicializar índices se necessário
        if (!indices.codigo_para_id) indices.codigo_para_id = {};
        if (!indices.id_para_codigo) indices.id_para_codigo = {};
        if (!indices.produtos_por_grupo) indices.produtos_por_grupo = {};
        
        // Verificar se o produto existia com outro código (caso esteja editando)
        const codigoAnterior = indices.id_para_codigo[produto.id];
        
        // Remover de índices antigos se o código mudou
        if (codigoAnterior && codigoAnterior !== produto.codigo_barras) {
            const grupoAnterior = produtos[codigoAnterior] && produtos[codigoAnterior].grupo;
            
            // Remover do índice de grupo anterior
            if (grupoAnterior && indices.produtos_por_grupo[grupoAnterior]) {
                indices.produtos_por_grupo[grupoAnterior] = indices.produtos_por_grupo[grupoAnterior]
                    .filter(codigo => codigo !== codigoAnterior);
            }
            
            // Remover código antigo
            delete produtos[codigoAnterior];
        }
        
        // Atualizar índices
        indices.codigo_para_id[produto.codigo_barras] = produto.id;
        indices.id_para_codigo[produto.id] = produto.codigo_barras;
        
        // Atualizar índice de grupo
        if (produto.grupo) {
            // Garantir que o grupo existe no índice
            if (!indices.produtos_por_grupo[produto.grupo]) {
                indices.produtos_por_grupo[produto.grupo] = [];
            }
            
            // Adicionar ao grupo se ainda não estiver
            if (!indices.produtos_por_grupo[produto.grupo].includes(produto.codigo_barras)) {
                indices.produtos_por_grupo[produto.grupo].push(produto.codigo_barras);
            }
            
            // Adicionar à lista de grupos
            this.salvarGrupoProdutos(produto.grupo);
        }
        
        // Salvar produto com código de barras como chave
        produtos[produto.codigo_barras] = produto;
        
        // Salvar alterações
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        localStorage.setItem('orion_indices', JSON.stringify(indices));
        
        return produto;
    },
    
    /**
     * Remove um produto
     */
    removerProduto: function(codigoBarras) {
        // Obter dados
        const produtos = this.getProdutos();
        const indices = JSON.parse(localStorage.getItem('orion_indices') || '{}');
        
        // Verificar se produto existe
        if (!produtos[codigoBarras]) {
            return false;
        }
        
        const produto = produtos[codigoBarras];
        
        // Verificar se o produto está em alguma venda
        const vendas = this.getVendas();
        const vendaComProduto = vendas.some(venda => {
            return venda.itens && venda.itens.some(item => item.codigo_barras === codigoBarras);
        });
        
        if (vendaComProduto) {
            throw new Error('Este produto não pode ser excluído pois está associado a vendas');
        }
        
        // Remover dos índices
        if (produto.id) {
            delete indices.id_para_codigo[produto.id];
        }
        delete indices.codigo_para_id[codigoBarras];
        
        // Remover do índice de grupo
        if (produto.grupo && indices.produtos_por_grupo[produto.grupo]) {
            indices.produtos_por_grupo[produto.grupo] = indices.produtos_por_grupo[produto.grupo]
                .filter(codigo => codigo !== codigoBarras);
        }
        
        // Remover produto
        delete produtos[codigoBarras];
        
        // Salvar alterações
        localStorage.setItem('orion_produtos', JSON.stringify(produtos));
        localStorage.setItem('orion_indices', JSON.stringify(indices));
        
        return true;
    },
    
    /**
     * Atualiza o estoque de um produto
     */
    atualizarEstoqueProduto: function(codigoBarras, quantidade, motivo = '') {
        const produtos = this.getProdutos();
        const produto = produtos[codigoBarras];
        
        if (!produto) {
            throw new Error('Produto não encontrado');
        }
        
        // Registrar dados de estoque anterior
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
        this.atualizarCacheProdutosSemEstoque();
        
        return { produto, movimentacao };
    },
    
    /**
     * Atualiza o cache de produtos sem estoque
     */
    atualizarCacheProdutosSemEstoque: function() {
        const produtos = this.getProdutos();
        const semEstoque = [];
        
        // Encontrar produtos sem estoque ou abaixo do mínimo
        for (const codigo in produtos) {
            const produto = produtos[codigo];
            
            if (produto.estoque <= 0 || produto.estoque <= produto.estoque_minimo) {
                semEstoque.push({
                    codigo_barras: codigo,
                    nome: produto.nome,
                    estoque: produto.estoque,
                    estoque_minimo: produto.estoque_minimo,
                    status: produto.estoque <= 0 ? 'esgotado' : 'baixo'
                });
            }
        }
        
        // Ordenar por status (esgotado primeiro) e depois por nome
        semEstoque.sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'esgotado' ? -1 : 1;
            }
            return a.nome.localeCompare(b.nome);
        });
        
        // Salvar cache
        const cache = JSON.parse(localStorage.getItem('orion_cache_relatorios') || '{}');
        cache.produtos_sem_estoque = semEstoque;
        cache.ultima_atualizacao = new Date().toISOString();
        localStorage.setItem('orion_cache_relatorios', JSON.stringify(cache));
    },
    
    /**
     * Filtra produtos por grupo
     */
    filtrarProdutosPorGrupo: function(grupo) {
        if (!grupo) {
            return Object.values(this.getProdutos());
        }
        
        const indices = JSON.parse(localStorage.getItem('orion_indices') || '{}');
        const codigosBarras = indices.produtos_por_grupo[grupo] || [];
        
        const produtos = this.getProdutos();
        return codigosBarras.map(codigo => produtos[codigo]).filter(p => p); // Remove undefined
    },
    
    /**
     * Busca produtos por texto no nome
     */
    buscarProdutos: function(termo) {
        if (!termo) return Object.values(this.getProdutos());
        
        termo = termo.toLowerCase();
        const produtos = this.getProdutos();
        
        return Object.values(produtos).filter(produto => 
            produto.nome.toLowerCase().includes(termo) || 
            produto.codigo_barras.includes(termo)
        );
    },
    
    // ===== MÉTODOS DE ACESSO A GRUPOS DE PRODUTOS =====
    
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
        const grupoNormalizado = grupo.trim();
        
        if (!grupos.includes(grupoNormalizado)) {
            grupos.push(grupoNormalizado);
            grupos.sort(); // Ordenar alfabeticamente
            localStorage.setItem('orion_grupos_produtos', JSON.stringify(grupos));
            return true;
        }
        
        return false;
    },
    
    /**
     * Remove um grupo de produtos
     */
    removerGrupoProdutos: function(grupo) {
        const grupos = this.getGruposProdutos();
        const index = grupos.indexOf(grupo);
        
        if (index === -1) {
            return { sucesso: false, mensagem: 'Grupo não encontrado' };
        }
        
        // Verificar se há produtos nesse grupo
        const indices = JSON.parse(localStorage.getItem('orion_indices') || '{}');
        const produtosNoGrupo = indices.produtos_por_grupo[grupo] || [];
        
        if (produtosNoGrupo.length > 0) {
            return { 
                sucesso: false, 
                mensagem: `Não é possível excluir o grupo "${grupo}" pois existem ${produtosNoGrupo.length} produtos associados` 
            };
        }
        
        // Remover grupo
        grupos.splice(index, 1);
        localStorage.setItem('orion_grupos_produtos', JSON.stringify(grupos));
        
        // Remover do índice de grupos
        if (indices.produtos_por_grupo[grupo]) {
            delete indices.produtos_por_grupo[grupo];
            localStorage.setItem('orion_indices', JSON.stringify(indices));
        }
        
        return { sucesso: true };
    },
    
    // ===== MÉTODOS DE ACESSO A CLIENTES =====
    
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
        
        // Validar dados básicos
        if (!cliente.nome || cliente.nome.trim() === '') {
            throw new Error('Nome do cliente é obrigatório');
        }
        
        // Gerar ID se for novo cliente
        if (!cliente.id) {
            cliente.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
            cliente.data_cadastro = new Date().toISOString();
            clientes.push(cliente);
        } else {
            // Atualizar cliente existente
            const index = clientes.findIndex(c => c.id === cliente.id);
            
            if (index !== -1) {
                // Preservar data de cadastro original
                if (clientes[index].data_cadastro) {
                    cliente.data_cadastro = clientes[index].data_cadastro;
                }
                
                clientes[index] = cliente;
            } else {
                // Novo cliente com ID fornecido
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
        // Impedir a remoção do cliente padrão (Consumidor Final)
        if (id === '1') {
            return { sucesso: false, mensagem: 'Não é possível remover o cliente padrão' };
        }
        
        const clientes = this.getClientes();
        
        // Verificar se o cliente existe
        const index = clientes.findIndex(c => c.id === id);
        if (index === -1) {
            return { sucesso: false, mensagem: 'Cliente não encontrado' };
        }
        
        // Verificar se o cliente tem vendas
        const vendas = this.getVendas();
        const clienteTemVendas = vendas.some(v => v.cliente_id === id);
        
        if (clienteTemVendas) {
            return { 
                sucesso: false, 
                mensagem: 'Este cliente não pode ser excluído pois possui vendas registradas' 
            };
        }
        
        // Remover cliente
        clientes.splice(index, 1);
        localStorage.setItem('orion_clientes', JSON.stringify(clientes));
        
        return { sucesso: true };
    },
    
    // ===== MÉTODOS DE ACESSO A VENDAS =====
    
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
        // Verificar dados/**
     * Adiciona um item ao carrinho
     */
    adicionarItemCarrinho: function(item) {
        // Verificar dados mínimos do item
        if (!item.codigo_barras || !item.nome || 
            isNaN(item.preco) || isNaN(item.quantidade)) {
            throw new Error('Dados do item incompletos');
        }
        
        const carrinho = this.getCarrinho();
        
        // Verificar se o item já está no carrinho
        const index = carrinho.findIndex(i => i.codigo_barras === item.codigo_barras);
        
        if (index !== -1) {
            // Atualizar quantidade
            carrinho[index].quantidade += item.quantidade;
            carrinho[index].subtotal = carrinho[index].preco * carrinho[index].quantidade;
        } else {
            // Adicionar novo item com subtotal calculado
            item.subtotal = item.preco * item.quantidade;
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
     * Atualiza quantidade de um item no carrinho
     */
    atualizarQuantidadeCarrinho: function(codigoBarras, quantidade) {
        // Remover item se quantidade for 0 ou menos
        if (quantidade <= 0) {
            return this.removerItemCarrinho(codigoBarras);
        }
        
        const carrinho = this.getCarrinho();
        const index = carrinho.findIndex(item => item.codigo_barras === codigoBarras);
        
        if (index !== -1) {
            // Verificar estoque disponível
            const produto = this.getProduto(codigoBarras);
            if (produto && quantidade > produto.estoque) {
                throw new Error(`Quantidade excede estoque disponível (${produto.estoque})`);
            }
            
            // Atualizar quantidade e subtotal
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
        const venda = vendas.find(venda => venda.id === id);
        
        if (venda) {
            // Carregar itens se não estiverem incluídos
            if (!venda.itens) {
                const vendasItens = JSON.parse(localStorage.getItem('orion_vendas_itens') || '{}');
                venda.itens = vendasItens[venda.id] || [];
            }
        }
        
        return venda;
    },
    
    /**
     * Registra uma venda
     */
    registrarVenda: function(venda) {
        // Validar dados mínimos da venda
        if (!venda.cliente_id || !venda.itens || venda.itens.length === 0) {
            throw new Error('Dados da venda incompletos');
        }
        
        // Obter vendas existentes
        const vendas = this.getVendas();
        const vendasItens = JSON.parse(localStorage.getItem('orion_vendas_itens') || '{}');
        
        // Gerar ID se não existir
        if (!venda.id) {
            venda.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }
        
        // Adicionar data atual se não tiver
        if (!venda.data) {
            venda.data = new Date().toISOString();
        }
        
        // Verificar estoque disponível
        for (const item of venda.itens) {
            const produto = this.getProduto(item.codigo_barras);
            
            if (!produto) {
                throw new Error(`Produto com código ${item.codigo_barras} não encontrado`);
            }
            
            if (item.quantidade > produto.estoque) {
                throw new Error(`Estoque insuficiente para o produto ${produto.nome} (disponível: ${produto.estoque})`);
            }
        }
        
        // Separar itens para armazenamento separado
        const itens = [...venda.itens];
        const vendaSemItens = { ...venda };
        delete vendaSemItens.itens;
        
        // Atualizar estoque dos produtos
        for (const item of itens) {
            try {
                this.atualizarEstoqueProduto(
                    item.codigo_barras, 
                    -item.quantidade, 
                    `Venda #${venda.id}`
                );
            } catch (erro) {
                console.error(`Erro ao atualizar estoque do produto ${item.codigo_barras}:`, erro);
            }
        }
        
        // Adicionar à lista de vendas
        vendas.push(vendaSemItens);
        vendasItens[venda.id] = itens;
        
        // Atualizar cliente
        this.atualizarClienteAposVenda(venda);
        
        // Salvar tudo
        localStorage.setItem('orion_vendas', JSON.stringify(vendas));
        localStorage.setItem('orion_vendas_itens', JSON.stringify(vendasItens));
        
        // Limpar carrinho
        this.limparCarrinho();
        
        // Atualizar estatísticas
        this.atualizarEstatisticasVendas();
        
        return { ...vendaSemItens, itens };
    },
    
    /**
     * Atualiza dados do cliente após a venda
     */
    atualizarClienteAposVenda: function(venda) {
        const clientes = this.getClientes();
        const index = clientes.findIndex(c => c.id === venda.cliente_id);
        
        if (index !== -1) {
            // Atualizar última compra
            clientes[index].ultima_compra = venda.data;
            
            // Incrementar total de compras se existir
            if (typeof clientes[index].total_compras === 'number') {
                clientes[index].total_compras++;
            } else {
                clientes[index].total_compras = 1;
            }
            
            localStorage.setItem('orion_clientes', JSON.stringify(clientes));
        }
    },
    
    /**
     * Atualiza estatísticas de vendas
     */
    atualizarEstatisticasVendas: function() {
        try {
            // Obter todas as vendas
            const vendas = this.getVendas();
            const vendasItens = JSON.parse(localStorage.getItem('orion_vendas_itens') || '{}');
            
            // Calcular produtos mais vendidos
            const produtosVendidos = {};
            
            // Apenas vendas não canceladas
            const vendasValidas = vendas.filter(v => !v.cancelada);
            
            // Processar todas as vendas válidas
            vendasValidas.forEach(venda => {
                const itens = vendasItens[venda.id] || [];
                
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
            
            // Transformar em array e ordenar por quantidade
            const produtosMaisVendidos = Object.values(produtosVendidos)
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 10); // Top 10
            
            // Atualizar cache
            const cache = JSON.parse(localStorage.getItem('orion_cache_relatorios') || '{}');
            cache.produtos_mais_vendidos = produtosMaisVendidos;
            cache.ultima_atualizacao = new Date().toISOString();
            localStorage.setItem('orion_cache_relatorios', JSON.stringify(cache));
        } catch (erro) {
            console.error('Erro ao atualizar estatísticas de vendas:', erro);
        }
    },
    
    /**
     * Cancela uma venda
     */
    cancelarVenda: function(id, motivo) {
        const venda = this.getVenda(id);
        
        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        
        if (venda.cancelada) {
            throw new Error('Esta venda já foi cancelada');
        }
        
        // Restituir estoque
        if (venda.itens && venda.itens.length > 0) {
            venda.itens.forEach(item => {
                try {
                    this.atualizarEstoqueProduto(
                        item.codigo_barras,
                        item.quantidade,
                        `Cancelamento de venda #${id}`
                    );
                } catch (erro) {
                    console.error(`Erro ao restituir estoque do produto ${item.codigo_barras}:`, erro);
                }
            });
        }
        
        // Marcar venda como cancelada
        const vendas = this.getVendas();
        const index = vendas.findIndex(v => v.id === id);
        
        if (index !== -1) {
            vendas[index].cancelada = true;
            vendas[index].data_cancelamento = new Date().toISOString();
            vendas[index].motivo_cancelamento = motivo || 'Não informado';
            
            const usuario = this.getUsuarioAtual();
            vendas[index].usuario_cancelamento = usuario ? usuario.nome : 'Sistema';
            
            localStorage.setItem('orion_vendas', JSON.stringify(vendas));
            
            // Atualizar estatísticas
            this.atualizarEstatisticasVendas();
            
            return { sucesso: true, venda: this.getVenda(id) };
        }
        
        return { sucesso: false, mensagem: 'Venda não encontrada' };
    },
    
    // ===== MÉTODOS DE ACESSO A MOVIMENTAÇÕES DE ESTOQUE =====
    
    /**
     * Obtém todas movimentações de estoque
     */
    getMovimentacoesEstoque: function() {
        return JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]');
    },
    
    /**
     * Salva uma movimentação de estoque
     */
    salvarMovimentacaoEstoque: function(movimentacao) {
        // Validar dados mínimos
        if (!movimentacao.produto_codigo || 
            !movimentacao.tipo || 
            isNaN(movimentacao.quantidade)) {
            throw new Error('Dados da movimentação incompletos');
        }
        
        // Obter movimentações existentes
        const movimentacoes = this.getMovimentacoesEstoque();
        
        // Gerar ID se não existir
        if (!movimentacao.id) {
            movimentacao.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }
        
        // Adicionar data atual se não tiver
        if (!movimentacao.data) {
            movimentacao.data = new Date().toISOString();
        }
        
        // Adicionar usuário se não tiver
        if (!movimentacao.usuario) {
            const usuario = this.getUsuarioAtual();
            movimentacao.usuario = usuario ? usuario.nome : 'Sistema';
        }
        
        // Adicionar à lista
        movimentacoes.push(movimentacao);
        
        // Salvar
        localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(movimentacoes));
        
        return movimentacao;
    },
    
    /**
     * Filtra movimentações de estoque
     */
    filtrarMovimentacoesEstoque: function(filtros = {}) {
        const movimentacoes = this.getMovimentacoesEstoque();
        
        // Clonar array para não modificar o original
        let resultado = [...movimentacoes];
        
        // Filtrar por produto
        if (filtros.produto_codigo) {
            resultado = resultado.filter(m => m.produto_codigo === filtros.produto_codigo);
        }
        
        // Filtrar por tipo
        if (filtros.tipo) {
            resultado = resultado.filter(m => m.tipo === filtros.tipo);
        }
        
        // Filtrar por data
        if (filtros.data_inicio || filtros.data_fim) {
            const dataInicio = filtros.data_inicio ? new Date(filtros.data_inicio) : new Date(0);
            const dataFim = filtros.data_fim ? new Date(filtros.data_fim) : new Date();
            
            resultado = resultado.filter(m => {
                const data = new Date(m.data);
                return data >= dataInicio && data <= dataFim;
            });
        }
        
        // Ordenar por data (mais recente primeiro)
        resultado.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        return resultado;
    },
    
    // ===== MÉTODOS DE ACESSO A CONFIGURAÇÕES =====
    
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
    
    // ===== MÉTODOS DE RELATÓRIOS =====
    
    /**
     * Gera relatório de vendas
     */
    gerarRelatorioVendas: function(filtros = {}) {
        // Obter todas as vendas
        const vendas = this.getVendas();
        const vendasItens = JSON.parse(localStorage.getItem('orion_vendas_itens') || '{}');
        
        // Adicionar itens às vendas se não estiverem já incluídos
        const vendasCompletas = vendas.map(venda => {
            if (!venda.itens) {
                return {
                    ...venda,
                    itens: vendasItens[venda.id] || []
                };
            }
            return venda;
        });
        
        // Aplicar filtros
        let vendasFiltradas = vendasCompletas;
        
        // Filtrar vendas canceladas
        if (filtros.incluirCanceladas === false) {
            vendasFiltradas = vendasFiltradas.filter(venda => !venda.cancelada);
        }
        
        // Filtrar por data
        if (filtros.dataInicio || filtros.dataFim) {
            const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : new Date(0);
            const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : new Date();
            
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
     * Gera relatório de estoque
     */
    gerarRelatorioEstoque: function(filtros = {}) {
        const produtos = this.getProdutos();
        
        // Clone para não modificar o original
        let produtosArray = Object.values(produtos);
        
        // Aplicar filtros
        if (filtros.grupo) {
            produtosArray = produtosArray.filter(p => p.grupo === filtros.grupo);
        }
        
        if (filtros.status === 'sem_estoque') {
            produtosArray = produtosArray.filter(p => p.estoque <= 0);
        } else if (filtros.status === 'estoque_baixo') {
            produtosArray = produtosArray.filter(p => p.estoque > 0 && p.estoque <= p.estoque_minimo);
        } else if (filtros.status === 'estoque_normal') {
            produtosArray = produtosArray.filter(p => p.estoque > p.estoque_minimo);
        }
        
        // Cálculos totais
        const totalProdutos = produtosArray.length;
        const totalItensEstoque = produtosArray.reduce((total, p) => total + p.estoque, 0);
        const valorTotalEstoque = produtosArray.reduce((total, p) => total + (p.estoque * p.preco), 0);
        
        // Produtos sem estoque
        const semEstoque = produtosArray.filter(p => p.estoque <= 0);
        
        // Produtos com estoque baixo
        const estoqueBaixo = produtosArray.filter(p => p.estoque > 0 && p.estoque <= p.estoque_minimo);
        
        // Agrupar por grupo
        const estoqueGrupos = {};
        
        produtosArray.forEach(produto => {
            const grupo = produto.grupo || 'Sem grupo';
            
            if (!estoqueGrupos[grupo]) {
                estoqueGrupos[grupo] = {
                    quantidade_produtos: 0,
                    itens_estoque: 0,
                    valor_estoque: 0
                };
            }
            
            estoqueGrupos[grupo].quantidade_produtos++;
            estoqueGrupos[grupo].itens_estoque += produto.estoque;
            estoqueGrupos[grupo].valor_estoque += produto.estoque * produto.preco;
        });
        
        return {
            data: new Date().toISOString(),
            totais: {
                produtos: totalProdutos,
                itens_estoque: totalItensEstoque,
                valor_estoque: valorTotalEstoque
            },
            resumo: {
                sem_estoque: semEstoque.length,
                estoque_baixo: estoqueBaixo.length,
                estoque_normal: totalProdutos - semEstoque.length - estoqueBaixo.length
            },
            grupos: estoqueGrupos,
            produtos: produtosArray.sort((a, b) => a.nome.localeCompare(b.nome)),
            filtros: filtros
        };
    },
    
    // ===== MÉTODOS DE BACKUP E EXPORTAÇÃO =====
    
    /**
     * Gera backup completo do banco de dados
     */
    gerarBackup: function() {
        try {
            const backup = {
                versao: this.VERSION,
                data: new Date().toISOString(),
                dados: {
                    // Estruturas principais
                    produtos: JSON.parse(localStorage.getItem('orion_produtos') || '{}'),
                    indices: JSON.parse(localStorage.getItem('orion_indices') || '{}'),
                    clientes: JSON.parse(localStorage.getItem('orion_clientes') || '[]'),
                    usuarios: JSON.parse(localStorage.getItem('orion_usuarios') || '{}'),
                    grupos_produtos: JSON.parse(localStorage.getItem('orion_grupos_produtos') || '[]'),
                    
                    // Vendas e histórico
                    vendas: JSON.parse(localStorage.getItem('orion_vendas') || '[]'),
                    vendas_itens: JSON.parse(localStorage.getItem('orion_vendas_itens') || '{}'),
                    movimentacoes_estoque: JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]'),
                    
                    // Configurações
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
            
            return { sucesso: true, mensagem: 'Backup gerado com sucesso' };
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
            
            // Validar backup
            if (!backup.versao || !backup.dados || !backup.dados.produtos) {
                throw new Error('Arquivo de backup inválido ou corrompido');
            }
            
            // Verificar usuário administrador
            const usuario = this.getUsuarioAtual();
            if (!usuario || (usuario.perfil !== 'admin' && usuario.username !== 'jesus')) {
                throw new Error('Apenas administradores podem restaurar backups');
            }
            
            // Restaurar dados
            localStorage.setItem('orion_produtos', JSON.stringify(backup.dados.produtos));
            localStorage.setItem('orion_indices', JSON.stringify(backup.dados.indices || {}));
            localStorage.setItem('orion_clientes', JSON.stringify(backup.dados.clientes));
            localStorage.setItem('orion_usuarios', JSON.stringify(backup.dados.usuarios));
            localStorage.setItem('orion_grupos_produtos', JSON.stringify(backup.dados.grupos_produtos));
            localStorage.setItem('orion_vendas', JSON.stringify(backup.dados.vendas));
            localStorage.setItem('orion_vendas_itens', JSON.stringify(backup.dados.vendas_itens || {}));
            localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(backup.dados.movimentacoes_estoque));
            localStorage.setItem('orion_config', JSON.stringify(backup.dados.config));
            
            // Atualizar versão
            localStorage.setItem('orion_version', backup.versao);
            localStorage.setItem('orion_initialized', 'true');
            
            // Invalidar cache de relatórios
            localStorage.setItem('orion_cache_relatorios', JSON.stringify({
                produtos_sem_estoque: [],
                produtos_mais_vendidos: [],
                ultima_atualizacao: null
            }));
            
            // Migrar dados se necessário
            if (backup.versao !== this.VERSION) {
                this.migrarDados(backup.versao);
            }
            
            // Garantir usuário principal
            const usuarios = backup.dados.usuarios;
            if (!usuarios['jesus']) {
                this.salvarUsuario({
                    username: 'jesus',
                    nome: 'Jesus Martins',
                    cargo: 'Administrador',
                    email: 'jesus@orionpdv.com',
                    perfil: 'admin',
                    senha: '123'
                });
            }
            
            return { sucesso: true, mensagem: 'Backup restaurado com sucesso' };
        } catch (erro) {
            console.error('Erro ao restaurar backup:', erro);
            return { sucesso: false, mensagem: 'Erro ao restaurar backup: ' + erro.message };
        }
    },
    
    /**
     * Exporta dados para CSV
     */
    exportarDadosCSV: function(dados, nomeArquivo) {
        try {
            if (!Array.isArray(dados) || dados.length === 0) {
                throw new Error('Dados inválidos para exportação');
            }
            
            // Obter cabeçalhos
            const cabecalhos = Object.keys(dados[0]);
            
            // Criar conteúdo CSV
            let csvContent = cabecalhos.join(',') + '\r\n';
            
            // Adicionar linhas
            dados.forEach(item => {
                const valores = cabecalhos.map(cabecalho => {
                    let valor = item[cabecalho];
                    
                    // Converter para string e escapar aspas e vírgulas
                    if (valor === null || valor === undefined) {
                        valor = '';
                    } else if (typeof valor === 'object') {
                        valor = JSON.stringify(valor);
                    } else {
                        valor = String(valor);
                    }
                    
                    // Escapar aspas duplicando-as e adicionar aspas se contiver vírgulas
                    if (valor.includes('"') || valor.includes(',') || valor.includes('\n')) {
                        valor = `"${valor.replace(/"/g, '""')}"`;
                    }
                    
                    return valor;
                });
                
                csvContent += valores.join(',') + '\r\n';
            });
            
            // Criar blob e baixar
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nomeArquivo || 'dados.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            return { sucesso: true, mensagem: 'Dados exportados com sucesso' };
        } catch (erro) {
            console.error('Erro ao exportar dados:', erro);
            return { sucesso: false, mensagem: 'Erro ao exportar dados: ' + erro.message };
        }
    }
};
// Inicializar banco de dados quando o documento estiver
document.addEventListener('DOMContentLoaded', function() {
    db.inicializar();
    console.log('Sistema de Banco de Dados ORION PDV inicializado');
});
