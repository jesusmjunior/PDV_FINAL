/**
 * ORION PDV - Integração do Scanner de Código de Barras para Produtos
 * Versão 2.1 - Controle Avançado de Estado e Tratamento de Erros
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elementos da interface do scanner
    const scannerUI = {
        btnScanner: document.getElementById('btn-scanner-codigo'),
        btnGerar: document.getElementById('btn-gerar-codigo'),
        codigoInput: document.getElementById('codigo-barras'),
        modal: document.getElementById('modal-scanner'),
        videoElement: document.getElementById('scanner-video'),
        statusElement: document.getElementById('scanner-status'),
        errorElement: document.getElementById('scanner-error'),
        loadingElement: document.getElementById('scanner-loading'),
        closeButtons: document.querySelectorAll('.btn-close-scanner'),
        torchButton: document.querySelector('.btn-toggle-torch')
    };

    // Sair se não estamos em uma página com scanner
    if (!scannerUI.btnScanner) return;

    // Estado do scanner
    let scannerState = {
        isActive: false,
        isInitializing: false,
        torchEnabled: false,
        currentStream: null,
        lastError: null
    };

    // Event Listeners
    scannerUI.btnScanner.addEventListener('click', toggleScanner);
    scannerUI.btnGerar.addEventListener('click', generateBarcode);
    scannerUI.closeButtons.forEach(btn => btn.addEventListener('click', closeScanner));
    if (scannerUI.torchButton) {
        scannerUI.torchButton.addEventListener('click', toggleTorch);
    }
    window.addEventListener('beforeunload', cleanup);

    // Funções principais
    async function toggleScanner() {
        if (scannerState.isActive) {
            await closeScanner();
        } else {
            await initializeScanner();
        }
    }

    async function initializeScanner() {
        try {
            scannerState.isInitializing = true;
            updateUI();
            
            // Primeiro ativar a câmera
            await setupCamera();
            
            // Depois inicializar o scanner
            await barcodeScanner.inicializar('scanner-video', handleDetection);
            
            scannerState.isActive = true;
            scannerState.lastError = null;
            showStatus('Scanner pronto. Aponte para um código de barras.', 'info');
        } catch (error) {
            handleError(error);
        } finally {
            scannerState.isInitializing = false;
            updateUI();
        }
    }

    async function setupCamera() {
        try {
            scannerState.currentStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            // Conectar stream ao elemento de vídeo
            if (scannerUI.videoElement) {
                scannerUI.videoElement.srcObject = scannerState.currentStream;
            }
        } catch (error) {
            // Erros comuns de câmera
            if (error.name === 'NotAllowedError') {
                throw new Error('Acesso à câmera negado. Por favor, permita o acesso.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('Nenhuma câmera encontrada no dispositivo.');
            } else {
                throw new Error('Erro ao acessar câmera: ' + error.message);
            }
        }
    }

    function handleDetection(code) {
        try {
            if (validateBarcode(code)) {
                scannerUI.codigoInput.value = code;
                showStatus('Código válido detectado!', 'success');
                
                // Reproduzir som de sucesso
                try {
                    const beepSuccess = document.getElementById('beep-success');
                    if (beepSuccess) beepSuccess.play();
                } catch (e) {
                    console.log("Erro ao reproduzir som", e);
                }
                
                // Fechar o scanner após um breve delay
                setTimeout(closeScanner, 500);
            }
        } catch (error) {
            handleError(error);
        }
    }

    function validateBarcode(code) {
        if (!barcodeScanner.verificarCodigoEAN13(code)) {
            throw new Error('Código EAN-13 inválido ou não reconhecido');
        }
        return true;
    }

    async function closeScanner() {
        if (scannerState.isActive) {
            scannerState.isActive = false;
            
            // Parar scanner
            try {
                barcodeScanner.parar();
            } catch (error) {
                console.error("Erro ao parar scanner:", error);
            }
            
            // Parar fluxo da câmera
            stopCamera();
            
            // Atualizar UI
            scannerUI.modal.style.display = 'none';
            updateUI();
        }
    }

    function stopCamera() {
        if (scannerState.currentStream) {
            scannerState.currentStream.getTracks().forEach(track => track.stop());
            scannerState.currentStream = null;
            
            // Limpar elemento de vídeo
            if (scannerUI.videoElement) {
                scannerUI.videoElement.srcObject = null;
            }
        }
    }

    function generateBarcode() {
        const code = barcodeScanner.gerarCodigoBarrasAleatorio();
        scannerUI.codigoInput.value = code;
        showStatus('Código de barras EAN-13 gerado com sucesso!', 'success');
    }

    async function toggleTorch() {
        try {
            if (!scannerState.currentStream) return;
            
            const track = scannerState.currentStream.getVideoTracks()[0];
            if (!track || typeof track.getCapabilities !== 'function') return;
            
            const capabilities = track.getCapabilities();
            
            // Verificar se a lanterna é suportada
            if (capabilities.torch) {
                const newTorchState = !scannerState.torchEnabled;
                await track.applyConstraints({
                    advanced: [{ torch: newTorchState }]
                });
                
                scannerState.torchEnabled = newTorchState;
                
                if (scannerUI.torchButton) {
                    scannerUI.torchButton.classList.toggle('active', newTorchState);
                    showStatus(newTorchState ? 'Lanterna ativada' : 'Lanterna desativada', 'info');
                }
            } else {
                showStatus('Lanterna não disponível neste dispositivo', 'warning');
            }
        } catch (error) {
            console.error('Erro ao controlar lanterna:', error);
            showStatus('Erro ao controlar lanterna', 'error');
        }
    }

    function handleError(error) {
        console.error('Erro no Scanner:', error);
        scannerState.lastError = error;
        showStatus(error.message, 'error');
        
        // Reproduzir som de erro
        try {
            const beepError = document.getElementById('beep-error');
            if (beepError) beepError.play();
        } catch (e) {
            console.log("Erro ao reproduzir som", e);
        }
        
        closeScanner();
    }

    function showStatus(message, type = 'info') {
        if (!scannerUI.statusElement) return;
        
        // Atualizar texto do status
        if (scannerUI.statusElement.querySelector) {
            const textElement = scannerUI.statusElement.querySelector('.status-text');
            if (textElement) {
                textElement.textContent = message;
            } else {
                scannerUI.statusElement.textContent = message;
            }
        } else {
            scannerUI.statusElement.textContent = message;
        }
        
        // Atualizar classe de estilo
        scannerUI.statusElement.className = `scanner-status ${type}`;
        scannerUI.statusElement.classList.add('active');
        
        // Para erros, atualizar também o elemento de erro
        if (type === 'error' && scannerUI.errorElement) {
            const errorMessageElement = scannerUI.errorElement.querySelector('.error-message');
            if (errorMessageElement) {
                errorMessageElement.textContent = message;
            }
            scannerUI.errorElement.style.display = 'block';
        }
        
        // Ocultar mensagem após um tempo para tipos que não são info
        if (type !== 'info') {
            setTimeout(() => {
                scannerUI.statusElement.classList.remove('active');
                if (type === 'error' && scannerUI.errorElement) {
                    scannerUI.errorElement.style.display = 'none';
                }
            }, 3000);
        }
    }

    function updateUI() {
        // Atualizar modal
        if (scannerUI.modal) {
            scannerUI.modal.style.display = scannerState.isActive ? 'flex' : 'none';
        }
        
        // Atualizar botão do scanner
        if (scannerUI.btnScanner) {
            scannerUI.btnScanner.innerHTML = scannerState.isActive 
                ? '<i class="fas fa-stop"></i> Parar Scanner' 
                : '<i class="fas fa-camera"></i> Escanear';
        }
        
        // Atualizar indicador de carregamento
        if (scannerUI.loadingElement) {
            scannerUI.loadingElement.style.display = scannerState.isInitializing ? 'block' : 'none';
        }
        
        // Atualizar mensagem de erro
        if (scannerUI.errorElement) {
            scannerUI.errorElement.style.display = scannerState.lastError ? 'block' : 'none';
            
            const errorMessageElement = scannerUI.errorElement.querySelector('.error-message');
            if (errorMessageElement && scannerState.lastError) {
                errorMessageElement.textContent = scannerState.lastError.message;
            }
        }
    }

    function cleanup() {
        stopCamera();
        if (scannerState.isActive) {
            try {
                barcodeScanner.parar();
            } catch (error) {
                console.error("Erro ao parar scanner durante cleanup:", error);
            }
        }
    }

    // Carregar código da URL se existir
    const urlParams = new URLSearchParams(window.location.search);
    const codigoParam = urlParams.get('codigo');
    if (codigoParam && scannerUI.codigoInput) {
        scannerUI.codigoInput.value = codigoParam;
    }

    // Inicialização inicial
    updateUI();
});
