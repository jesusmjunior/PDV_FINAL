/**
 * ORION PDV - Scanner de Código de Barras
 * 
 * Este módulo implementa:
 * - Escaneamento de códigos de barras usando a câmera
 * - Validação e geração de códigos EAN-13
 * - Manipulação do fluxo de vídeo e detecção de códigos
 */

const barcodeScanner = {
    quaggaConfig: {
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: null,
            constraints: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: "environment",
                aspectRatio: { min: 1, max: 2 }
            },
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10,
        decoder: {
            readers: ["ean_reader"]
        },
        locate: true
    },
    
    callbacks: {
        onDetected: null
    },
    
    estado: {
        ativo: false,
        iniciando: false,
        erro: null
    },
    
    /**
     * Inicializa o scanner de código de barras
     * @param {string} videoElementId ID do elemento de vídeo
     * @param {Function} callback Função de callback para o código detectado
     * @returns {Promise} Promise que resolve quando o scanner estiver inicializado
     */
    inicializar: function(videoElementId, callback) {
        return new Promise((resolve, reject) => {
            try {
                this.estado.iniciando = true;
                this.estado.erro = null;
                
                // Configurar elemento de vídeo
                this.quaggaConfig.inputStream.target = document.getElementById(videoElementId);
                if (!this.quaggaConfig.inputStream.target) {
                    throw new Error("Elemento de vídeo não encontrado");
                }
                
                // Configurar callback
                this.callbacks.onDetected = callback;
                
                // Inicializar Quagga
                Quagga.init(this.quaggaConfig, (err) => {
                    if (err) {
                        this.estado.iniciando = false;
                        this.estado.erro = err;
                        reject(err);
                        return;
                    }
                    
                    // Registrar callbacks
                    Quagga.onDetected((data) => {
                        const code = data.codeResult.code;
                        
                        // Reproduzir som de sucesso
                        try {
                            const beepSuccess = document.getElementById('beep-success');
                            if (beepSuccess) beepSuccess.play();
                        } catch (e) {
                            console.log("Erro ao reproduzir som", e);
                        }
                        
                        // Executar callback
                        if (typeof this.callbacks.onDetected === 'function') {
                            this.callbacks.onDetected(code);
                        }
                    });
                    
                    // Iniciar scanner
                    Quagga.start();
                    
                    this.estado.ativo = true;
                    this.estado.iniciando = false;
                    resolve();
                });
            } catch (erro) {
                this.estado.iniciando = false;
                this.estado.erro = erro;
                this.estado.ativo = false;
                reject(erro);
            }
        });
    },
    
    /**
     * Para o scanner de código de barras
     */
    parar: function() {
        if (this.estado.ativo) {
            try {
                Quagga.stop();
            } catch (erro) {
                console.error("Erro ao parar scanner:", erro);
            }
            
            this.estado.ativo = false;
        }
    },
    
    /**
     * Verifica se um código EAN-13 é válido
     * @param {string} codigo Código a ser verificado
     * @returns {boolean} Verdadeiro se o código for válido
     */
    verificarCodigoEAN13: function(codigo) {
        if (!codigo || typeof codigo !== 'string') {
            return false;
        }
        
        // Remover espaços e outros caracteres não numéricos
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
     * Gera um código de barras EAN-13 aleatório válido
     * @returns {string} Código EAN-13 gerado
     */
    gerarCodigoBarrasAleatorio: function() {
        // Prefixo para produtos internos (789 para Brasil)
        let codigo = '789';
        
        // Gerar 9 dígitos aleatórios
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
     * Ativa/desativa a lanterna da câmera (se disponível)
     * @returns {Promise} Promise que resolve quando a operação estiver concluída
     */
    toggleTorch: async function() {
        try {
            const videoTrack = Quagga.CameraAccess.getActiveTrack();
            
            if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
                const capabilities = videoTrack.getCapabilities();
                
                // Verificar se a lanterna é suportada
                if (capabilities.torch) {
                    const torchState = !videoTrack.getConstraints().torch;
                    await videoTrack.applyConstraints({ advanced: [{ torch: torchState }] });
                    return torchState;
                }
            }
            
            return false;
        } catch (erro) {
            console.error("Erro ao controlar lanterna:", erro);
            return false;
        }
    }
};
