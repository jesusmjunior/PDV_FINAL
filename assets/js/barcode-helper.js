/**
 * ORION PDV - Utilitários para Códigos de Barras
 * Versão 2.0 (2025)
 * 
 * Funções para integração entre sistema de códigos de barras e banco de dados
 */

const barcodeHelper = {
    /**
     * Busca produto por código de barras
     * @param {string} codigo Código de barras
     * @returns {Object} Produto encontrado ou null
     */
    buscarProduto: function(codigo) {
        // Remover espaços e caracteres não numéricos
        codigo = codigo.replace(/\D/g, '');
        
        if (!codigo) return null;
        
        return db.getProduto(codigo);
    },
    
    /**
     * Adiciona produto ao carrinho pelo código de barras
     * @param {string} codigo Código de barras
     * @param {number} quantidade Quantidade a adicionar
     * @returns {Object} Resultado da operação
     */
    adicionarAoCarrinho: function(codigo, quantidade = 1) {
        // Validar quantidade
        quantidade = parseInt(quantidade);
        if (isNaN(quantidade) || quantidade <= 0) {
            return { 
                sucesso: false, 
                mensagem: 'Quantidade inválida' 
            };
        }
        
        // Buscar produto
        const produto = this.buscarProduto(codigo);
        
        if (!produto) {
            return { 
                sucesso: false, 
                mensagem: 'Produto não encontrado' 
            };
        }
        
        // Verificar estoque
        if (produto.estoque <= 0) {
            return { 
                sucesso: false, 
                mensagem: 'Produto sem estoque disponível' 
            };
        }
        
        if (quantidade > produto.estoque) {
            return { 
                sucesso: false, 
                mensagem: `Quantidade excede estoque disponível (${produto.estoque})` 
            };
        }
        
        // Criar item do carrinho
        const item = {
            codigo_barras: produto.codigo_barras,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: quantidade,
            subtotal: produto.preco * quantidade
        };
        
        // Adicionar ao carrinho
        try {
            db.adicionarItemCarrinho(item);
            
            return { 
                sucesso: true, 
                mensagem: `${produto.nome} adicionado ao carrinho`,
                produto: produto,
                quantidade: quantidade
            };
        } catch (erro) {
            return { 
                sucesso: false, 
                mensagem: erro.message 
            };
        }
    },
    
    /**
     * Formata o código de barras para exibição
     * @param {string} codigo Código de barras
     * @returns {string} Código formatado
     */
    formatarCodigo: function(codigo) {
        if (!codigo) return '';
        
        // Remover espaços e caracteres não numéricos
        codigo = codigo.replace(/\D/g, '');
        
        // Formatar EAN-13
        if (codigo.length === 13) {
            return codigo.substring(0, 1) + ' ' + 
                   codigo.substring(1, 7) + ' ' + 
                   codigo.substring(7);
        }
        
        return codigo;
    },
    
    /**
     * Valida um código de barras EAN-13
     * @param {string} codigo Código de barras
     * @returns {boolean} Verdadeiro se o código for válido
     */
    validarCodigo: function(codigo) {
        // Usar validador do barcodeScanner se disponível
        if (typeof barcodeScanner !== 'undefined' && 
            typeof barcodeScanner.verificarCodigoEAN13 === 'function') {
            return barcodeScanner.verificarCodigoEAN13(codigo);
        }/**
     * Valida um código de barras EAN-13
     * @param {string} codigo Código de barras
     * @returns {boolean} Verdadeiro se o código for válido
     */
    validarCodigo: function(codigo) {
        // Usar validador do barcodeScanner se disponível
        if (typeof barcodeScanner !== 'undefined' && 
            typeof barcodeScanner.verificarCodigoEAN13 === 'function') {
            return barcodeScanner.verificarCodigoEAN13(codigo);
        }
        
        // Implementação própria caso barcodeScanner não esteja disponível
        return db.validarCodigoBarras(codigo);
    },
    
    /**
     * Gera um código de barras EAN-13 válido
     * @returns {string} Código de barras gerado
     */
    gerarCodigo: function() {
        // Usar gerador do barcodeScanner se disponível
        if (typeof barcodeScanner !== 'undefined' && 
            typeof barcodeScanner.gerarCodigoBarrasAleatorio === 'function') {
            return barcodeScanner.gerarCodigoBarrasAleatorio();
        }
        
        // Usar gerador do banco de dados
        return db.gerarCodigoBarras();
    },
    
    /**
     * Abre o scanner de código de barras e executa callback quando código for detectado
     * @param {string} videoElementId ID do elemento de vídeo
     * @param {Function} callback Função a ser executada com o código detectado
     */
    iniciarScanner: function(videoElementId, callback) {
        // Verificar se barcodeScanner está disponível
        if (typeof barcodeScanner === 'undefined' || 
            typeof barcodeScanner.inicializar !== 'function') {
            throw new Error('Scanner de código de barras não disponível');
        }
        
        return barcodeScanner.inicializar(videoElementId, callback);
    },
    
    /**
     * Para o scanner de código de barras
     */
    pararScanner: function() {
        if (typeof barcodeScanner !== 'undefined' && 
            typeof barcodeScanner.parar === 'function') {
            barcodeScanner.parar();
        }
    }
};
