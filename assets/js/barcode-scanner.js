const SCANNER_CONFIG = {
  inputStream: {
    name: "Live",
    type: "LiveStream",
    constraints: {
      width: 640,
      height: 480,
      facingMode: "environment"
    },
  },
  locator: {
    patchSize: "medium",
    halfSample: true
  },
  numOfWorkers: navigator.hardwareConcurrency || 4,
  decoder: {
    readers: [
      "ean_reader",
      "ean_8_reader",
      "code_39_reader",
      "code_128_reader",
      "upc_reader",
      "upc_e_reader"
    ]
  },
  locate: true
};

const barcodeScanner = (function() {
    
    // Estado do scanner
    let ativo = false;
    let callback = null;
    
    /**
     * Inicializa o scanner de código de barras
     * @param {string} elementId ID do elemento de vídeo
     * @param {Function} callbackFn Função de callback para retornar o código lido
     */
    function inicializar(elementId, callbackFn) {
        // Salvar callback
        callback = callbackFn;
        
        // Verificar se o navegador suporta getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('O navegador não suporta acesso à câmera.');
            return false;
        }
        
        // Iniciar Quagga
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.getElementById(elementId),
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment" // Usar câmera traseira se disponível
                },
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "code_128_reader",
                    "upc_reader",
                    "upc_e_reader"
                ]
            },
            locate: true
        }, function(err) {
            if (err) {
                console.error('Erro ao inicializar scanner:', err);
                return false;
            }
            
            // Scanner inicializado com sucesso
            console.log('Scanner inicializado com sucesso');
            ativo = true;
            
            // Iniciar detecção
            Quagga.start();
            
            // Registrar evento de detecção de código
            Quagga.onDetected(function(result) {
                // Verificar resultado
                if (result && result.codeResult && result.codeResult.code) {
                    const codigo = result.codeResult.code;
                    
                    // Tocar som de sucesso
                    const audio = new Audio('assets/audio/beep.mp3');
                    audio.play();
                    
                    // Parar scanner
                    parar();
                    
                    // Chamar callback
                    if (callback && typeof callback === 'function') {
                        callback(codigo);
                    }
                }
            });
            
            return true;
        });
    }
    
    /**
     * Para o scanner de código de barras
     */
    function parar() {
        if (ativo) {
            Quagga.stop();
            ativo = false;
        }
    }
    
    /**
     * Verifica se o scanner está ativo
     * @returns {boolean} Verdadeiro se o scanner estiver ativo
     */
    function estaAtivo() {
        return ativo;
    }
    
    /**
     * Gera um código de barras EAN-13 aleatório válido
     * @returns {string} Código de barras EAN-13
     */
    function gerarCodigoBarrasAleatorio() {
        // Gerar 12 dígitos aleatórios
        let codigo = '';
        for (let i = 0; i < 12; i++) {
            codigo += Math.floor(Math.random() * 10);
        }
        
        // Calcular dígito verificador
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const verificador = (10 - (soma % 10)) % 10;
        
        // Adicionar dígito verificador
        codigo += verificador;
        
        return codigo;
    }
    
    /**
     * Verifica se um código EAN-13 é válido
     * @param {string} codigo Código a verificar
     * @returns {boolean} Verdadeiro se o código for válido
     */
    function verificarCodigoEAN13(codigo) {
        // Verificar tamanho
        if (!codigo || codigo.length !== 13 || !/^\d+$/.test(codigo)) {
            return false;
        }
        
        // Verificar dígito verificador
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const verificador = (10 - (soma % 10)) % 10;
        
        return parseInt(codigo[12]) === verificador;
    }
    
    // Exportar funções públicas
    return {
        inicializar,
        parar,
        estaAtivo,
        gerarCodigoBarrasAleatorio,
        verificarCodigoEAN13
    };
    
})();
