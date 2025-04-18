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
