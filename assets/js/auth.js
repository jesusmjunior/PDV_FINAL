/**
 * ORION PDV - Sistema de Gestão de Vendas
 * Módulo de Autenticação
 */

const auth = {
    /**
     * Faz o login do usuário
     */
    login: function(username, senha) {
        // Verificar se o usuário existe
        const usuarios = db.getUsuarios();
        const usuario = usuarios[username];
        
        if (!usuario) {
            return { sucesso: false, mensagem: 'Usuário não encontrado' };
        }
        
        // Verificar a senha
        const senhaHash = db.hashSenha(senha);
        
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
            
            // Verificar se o usuário ainda existe
            const usuarios = db.getUsuarios();
            if (!usuarios[sessao.username]) {
                this.fazerLogout();
                return false;
            }
            
            // Opcionalmente, verificar tempo de sessão
            // Por exemplo, expirar após 8 horas
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
    },
    
    /**
     * Verifica se o usuário tem permissão para acessar um recurso
     */
    verificarPermissao: function(permissaoNecessaria) {
        const usuario = this.getUsuarioAtual();
        
        if (!usuario) {
            return false;
        }
        
        // Administrador tem acesso a tudo
        if (usuario.perfil === 'admin') {
            return true;
        }
        
        // Implementar lógica de permissões mais complexa se necessário
        switch (permissaoNecessaria) {
            case 'venda':
                // Vendedores e supervisores podem registrar vendas
                return ['vendedor', 'supervisor'].includes(usuario.perfil);
            
            case 'estoque':
                // Apenas admin e supervisor podem gerenciar estoque
                return usuario.perfil === 'supervisor';
            
            case 'relatorio':
                // Apenas admin e supervisor podem ver relatórios
                return usuario.perfil === 'supervisor';
            
            default:
                return false;
        }
    },
    
    /**
     * Gera um hash para senha (implementado no database.js)
     */
    hashSenha: function(senha) {
        return db.hashSenha(senha);
    }
};
