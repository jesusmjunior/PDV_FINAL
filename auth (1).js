/**
 * ORION PDV - Sistema de Autenticação
 * 
 * Este módulo fornece funções para:
 * - Login/logout de usuários
 * - Verificação de autenticação
 * - Gerenciamento de sessão
 * - Funções de hash para senhas
 */

const auth = (function() {
    
    /**
     * Gera um hash seguro para senhas usando CryptoJS
     * @param {string} senha Senha em texto puro
     * @returns {string} Hash da senha
     */
    function hashSenha(senha) {
        // Usar CryptoJS para gerar hash SHA-256
        return CryptoJS.SHA256(senha).toString();
    }
    
    /**
     * Inicializa o sistema de autenticação
     * Cria usuário administrador padrão se não existir
     */
    function inicializarAuth() {
        // Verificar se já existem usuários
        const usuariosJson = localStorage.getItem('orion_usuarios');
        
        if (!usuariosJson || JSON.parse(usuariosJson).length === 0) {
            // Criar usuário administrador padrão
            const usuarioPadrao = {
                username: 'admin',
                nome: 'Administrador',
                cargo: 'Administrador',
                email: 'admin@orionpdv.com',
                perfil: 'admin',
                senha_hash: hashSenha('admin')
            };
            
            // Salvar no localStorage
            localStorage.setItem('orion_usuarios', JSON.stringify({ 
                'admin': usuarioPadrao 
            }));
        }
    }
    
    /**
     * Obtém todos os usuários
     * @returns {Object} Objeto com todos os usuários indexados por username
     */
    function getUsuarios() {
        try {
            return JSON.parse(localStorage.getItem('orion_usuarios') || '{}');
        } catch (error) {
            console.error('Erro ao obter usuários:', error);
            return {};
        }
    }
    
    /**
     * Obtém um usuário pelo username
     * @param {string} username Nome de usuário
     * @returns {Object|null} Usuário encontrado ou null
     */
    function getUsuario(username) {
        const usuarios = getUsuarios();
        return usuarios[username] || null;
    }
    
    /**
     * Realiza login de usuário
     * @param {string} username Nome de usuário
     * @param {string} senha Senha em texto puro
     * @returns {Object} Resultado do login
     */
    function login(username, senha) {
        try {
            // Obter usuário
            const usuario = getUsuario(username);
            
            // Verificar se usuário existe
            if (!usuario) {
                return {
                    sucesso: false,
                    mensagem: 'Usuário não encontrado'
                };
            }
            
            // Verificar senha
            const senhaHash = hashSenha(senha);
            
            if (senhaHash !== usuario.senha_hash) {
                return {
                    sucesso: false,
                    mensagem: 'Senha incorreta'
                };
            }
            
            // Criar sessão
            const sessao = {
                username: usuario.username,
                nome: usuario.nome,
                perfil: usuario.perfil,
                cargo: usuario.cargo,
                timestamp: new Date().toISOString()
            };
            
            // Salvar sessão
            sessionStorage.setItem('orion_sessao', JSON.stringify(sessao));
            sessionStorage.setItem('orion_user_nome', usuario.nome);
            
            return {
                sucesso: true,
                mensagem: 'Login realizado com sucesso',
                usuario: {
                    username: usuario.username,
                    nome: usuario.nome,
                    perfil: usuario.perfil,
                    cargo: usuario.cargo
                }
            };
        } catch (error) {
            console.error('Erro ao realizar login:', error);
            return {
                sucesso: false,
                mensagem: 'Erro ao realizar login: ' + error.message
            };
        }
    }
    
    /**
     * Verifica se há um usuário autenticado
     * @returns {boolean} Verdadeiro se houver um usuário autenticado
     */
    function verificarAutenticacao() {
        try {
            const sessao = sessionStorage.getItem('orion_sessao');
            
            if (!sessao) {
                return false;
            }
            
            // Verificar validade da sessão (opcional)
            // Por simplicidade, não implementamos expiração de sessão
            
            return true;
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            return false;
        }
    }
    
    /**
     * Obtém dados do usuário atual
     * @returns {Object|null} Dados do usuário autenticado ou null
     */
    function getUsuarioAtual() {
        try {
            if (!verificarAutenticacao()) {
                return null;
            }
            
            const sessao = JSON.parse(sessionStorage.getItem('orion_sessao'));
            return sessao;
        } catch (error) {
            console.error('Erro ao obter usuário atual:', error);
            return null;
        }
    }
    
    /**
     * Verifica se o usuário atual tem uma determinada permissão
     * @param {string} permissao Permissão a verificar ('admin', 'vendedor', etc)
     * @returns {boolean} Verdadeiro se o usuário tem a permissão
     */
    function verificarPermissao(permissao) {
        try {
            const usuario = getUsuarioAtual();
            
            if (!usuario) {
                return false;
            }
            
            // Admin tem todas as permissões
            if (usuario.perfil === 'admin') {
                return true;
            }
            
            // Supervisor tem permissões de vendedor
            if (usuario.perfil === 'supervisor' && permissao === 'vendedor') {
                return true;
            }
            
            // Verificar permissão específica
            return usuario.perfil === permissao;
        } catch (error) {
            console.error('Erro ao verificar permissão:', error);
            return false;
        }
    }
    
    /**
     * Realiza logout do usuário atual
     * @returns {boolean} Sucesso da operação
     */
    function fazerLogout() {
        try {
            sessionStorage.removeItem('orion_sessao');
            sessionStorage.removeItem('orion_user_nome');
            return true;
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            return false;
        }
    }
    
    // Inicializar autenticação
    inicializarAuth();
    
    // Exportar funções públicas
    return {
        login,
        fazerLogout,
        verificarAutenticacao,
        getUsuarioAtual,
        verificarPermissao,
        getUsuarios,
        getUsuario,
        hashSenha
    };
    
})();
