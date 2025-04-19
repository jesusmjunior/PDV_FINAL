/**
 * ORION PDV - Sistema de Gestão de Vendas
 * Módulo de Banco de Dados Local (LocalStorage)
 */

const db = {
    VERSION: '1.0.0',
    
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
        localStorage.setItem('orion_version', this.VERSION);
        
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
        localStorage.setItem('orion_grupos_produtos', '[]');
        
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
            cliente.data_cadastro = new Date().toISOString();
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
     * Obtém um produto pelo código de barras
     */
    getProdutoPorCodigo: function(codigo) {
        const produtos = this.getProdutos();
        return Object.values(produtos).find(produto => produto.codigo_barras === codigo);
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
     * Obtém os grupos de produtos
     */
    getGruposProdutos: function() {
        return JSON.parse(localStorage.getItem('orion_grupos_produtos') || '[]');
    },
    
    /**
     * Salva um grupo de produtos
     */
    salvarGrupoProdutos: function(grupo) {
        const grupos = this.getGruposProdutos();
        if (!grupos.includes(grupo)) {
            grupos.push(grupo);
            grupos.sort();  // Ordenar alfabeticamente
            localStorage.setItem('orion_grupos_produtos', JSON.stringify(grupos));
        }
    },
    
    /**
     * Obtém o carrinho de compras
     */
    getCarrinho: function() {
        return JSON.parse(localStorage.getItem('orion_carrinho') || '[]');
    },
    
    /**
     * Adiciona um item ao carrinho
     */
    adicionarItemCarrinho: function(item) {
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
    },
    
    /**
     * Remove um item do carrinho
     */
    removerItemCarrinho: function(produtoId) {
        const carrinho = this.getCarrinho();
        const index = carrinho.findIndex(item => item.produto_id === produtoId);
        
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
    atualizarQuantidadeCarrinho: function(produtoId, quantidade) {
        const carrinho = this.getCarrinho();
        const index = carrinho.findIndex(item => item.produto_id === produtoId);
        
        if (index !== -1) {
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
     * Registra uma venda
     */
    registrarVenda: function(venda) {
        const vendas = this.getVendas();
        
        if (!venda.id) {
            // Nova venda
            venda.id = Date.now().toString();
        }
        
        // Adicionar à lista de vendas
        vendas.push(venda);
        localStorage.setItem('orion_vendas', JSON.stringify(vendas));
        
        // Atualizar estoque
        this.atualizarEstoqueAposVenda(venda);
        
        // Limpar carrinho
        this.limparCarrinho();
        
        return venda.id;
    },
    
    /**
     * Alias para registrarVenda para manter compatibilidade
     */
    salvarVenda: function(venda) {
        return this.registrarVenda(venda);
    },
    
    /**
     * Atualiza o estoque após uma venda
     */
    atualizarEstoqueAposVenda: function(venda) {
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
            grupos_produtos: JSON.parse(localStorage.getItem('orion_grupos_produtos') || '[]'),
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
            localStorage.setItem('orion_grupos_produtos', JSON.stringify(backup.grupos_produtos || []));
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
    },
    
    /**
     * Gera um ID único
     */
    generateId: function() {
        return Date.now().toString();
    }
};

// Inicializar banco de dados ao carregar
document.addEventListener('DOMContentLoaded', function() {
    db.inicializar();
    db.verificarUsuarioPrincipal(); // Garantir que o usuário principal exista
});
