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
            'admin': {
                username: 'admin',
                nome: 'Administrador',
                cargo: 'Administrador do Sistema',
                email: 'admin@orionpdv.com',
                perfil: 'admin',
                senha_hash: this.hashSenha('admin123')  // Senha padrão
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
        const usuarios = this
