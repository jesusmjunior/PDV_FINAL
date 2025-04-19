/**
 * ORION PDV - Scanner de Código de Barras com QuaggaJS
 */

const barcodeScanner = {
    scannerInstance: null,
    torchEnabled: false,
    
    inicializar: function(videoElementId, callback) {
        return new Promise((resolve, reject) => {
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.getElementById(videoElementId),
                    constraints: {
                        facingMode: "environment",
                        width: { min: 640 },
                        height: { min: 480 }
                    }
                },
                decoder: {
                    readers: ["ean_reader"]
                },
                locate: true
            }, err => {
                if (err) return reject(err);
                
                Quagga.start();
                this.scannerInstance = Quagga;
                
                Quagga.onDetected(data => {
                    if (data.codeResult) {
                        callback(data.codeResult.code);
                    }
                });
                
                resolve();
            });
        });
    },

    parar: function() {
        if (this.scannerInstance) {
            this.scannerInstance.stop();
            this.scannerInstance = null;
        }
    },

    controleLanterna: function(estado) {
        return new Promise((resolve) => {
            if (this.scannerInstance) {
                const track = this.scannerInstance.inputStream.getVideoTrack();
                track.applyConstraints({ advanced: [{ torch: estado }] });
                resolve();
            }
        });
    },

    verificarCodigoEAN13: function(codigo) {
        if (!codigo || codigo.length !== 13 || !/^\d+$/.test(codigo)) return false;
        
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const digitoVerificador = (10 - (soma % 10)) % 10;
        return parseInt(codigo[12]) === digitoVerificador;
    },

    gerarCodigoBarrasAleatorio: function() {
        let codigo = '789'; // Prefixo brasileiro
        for (let i = 0; i < 9; i++) {
            codigo += Math.floor(Math.random() * 10);
        }
        
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
        }
        codigo += (10 - (soma % 10)) % 10;
        return codigo;
    }
};
