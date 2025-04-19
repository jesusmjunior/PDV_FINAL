/**
 * ORION PDV - Sistema de Gestão de Vendas (Versão 3.0)
 * Banco de dados com suporte a imagens, fuzzy search e importação/exportação massiva
 */

const db = {
    VERSION: '3.0',
    
    // Inicialização do banco de dados
    inicializar: function() {
        if (!localStorage.getItem('orion_initialized')) {
            console.log('Inicializando novo banco de dados...');
            this._criarEstruturaInicial();
            localStorage.setItem('orion_initialized', 'true');
        }
    },

    _criarEstruturaInicial: function() {
        const estruturaPadrao = {
            usuarios: {
                'admin': {
                    username: 'admin',
                    senha_hash: this.hashSenha('admin123'),
                    perfil: 'administrador'
                }
            },
            produtos: {},
            vendas: [],
            config: {
                tema: 'dark',
                moeda: 'R$'
            }
        };
        
        localStorage.setItem('orion_data', JSON.stringify(estruturaPadrao));
    },

    // Métodos de produtos
    salvarProduto: function(produto) {
        const dados = JSON.parse(localStorage.getItem('orion_data'));
        
        if (!produto.id) {
            produto.id = this.generateID('prod_');
            produto.data_cadastro = new Date().toISOString();
        }
        
        produto.data_atualizacao = new Date().toISOString();
        dados.produtos[produto.id] = produto;
        localStorage.setItem('orion_data', JSON.stringify(dados));
        return produto;
    },

    buscarProdutoPorCodigo: function(codigo) {
        const dados = JSON.parse(localStorage.getItem('orion_data'));
        return Object.values(dados.produtos).find(p => 
            p.codigo_barras === codigo || 
            this._calcularSimilaridade(p.codigo_barras, codigo) >= 0.7
        );
    },

    // Sistema de imagens
    vincularImagemProduto: function(produtoId, imageBase64) {
        const dados = JSON.parse(localStorage.getItem('orion_data'));
        const produto = dados.produtos[produtoId];
        
        if (produto) {
            produto.imagens = produto.imagens || [];
            produto.imagens.push(imageBase64);
            localStorage.setItem('orion_data', JSON.stringify(dados));
        }
    },

    // Métodos avançados
    _calcularSimilaridade: function(a, b) {
        // Implementação do algoritmo de similaridade de Jaro-Winkler
        let m = 0;
        const maxOffset = Math.floor(Math.max(a.length, b.length) / 2) - 1;
        
        for (let i = 0; i < a.length; i++) {
            const start = Math.max(0, i - maxOffset);
            const end = Math.min(b.length, i + maxOffset + 1);
            
            if (b.substring(start, end).includes(a[i])) m++;
        }
        
        const jaro = (m / a.length + m / b.length + (m - 1) / 2) / 3;
        return jaro + (0.1 * Math.min(4, this._prefixoComum(a, b))) * (1 - jaro);
    },

    // Backup e restauração
    exportarDadosCompletos: function() {
        const dados = JSON.parse(localStorage.getItem('orion_data'));
        const blob = new Blob([JSON.stringify(dados)], {type: 'application/json'});
        return blob;
    },

    importarDadosMassivos: function(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const novosDados = JSON.parse(reader.result);
                    localStorage.setItem('orion_data', reader.result);
                    resolve({success: true});
                } catch (error) {
                    reject({error: 'Formato inválido'});
                }
            };
            reader.readAsText(blob);
        });
    },

    // Utilitários
    generateID: function(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    hashSenha: function(senha) {
        return CryptoJS.SHA256(senha).toString();
    }
};

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => db.inicializar());
