/**
 * ORION PDV - Integração Avançada do Scanner de Código de Barras
 * 
 * Módulo responsável pela integração do scanner com cadastro de produtos:
 * - Controle de estado do scanner
 * - Gerenciamento de ciclo de vida
 * - Tratamento de erros robusto
 * - Validação de códigos
 * - Feedback visual completo
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página correta
    const scannerUI = {
        btnScanner: document.getElementById('btn-scanner-codigo'),
        btnGerarCodigo: document.getElementById('btn-gerar-codigo'),
        codigoInput: document.getElementById('codigo-barras'),
        modal: document.getElementById('modal-scanner'),
        videoElement: document.getElementById('scanner-video'),
        statusElement: document.getElementById('scanner-status'),
        loadingElement: document.getElementById('scanner-loading'),
        errorElement: document.getElementById('scanner-error'),
        closeButtons: document.querySelectorAll('.btn-close-scanner')
    };

    if (!scannerUI.btnScanner) return;

    // Estados do scanner
    let scannerState = {
        isActive: false,
        isInitializing: false,
        lastError: null
    };

    // Event Listeners
    scannerUI.btnScanner.addEventListener('click', toggleScanner);
    scannerUI.btnGerarCodigo.addEventListener('click', generateRandomBarcode);
    scannerUI.closeButtons.forEach(btn => btn.addEventListener('click', closeScanner));
    window.addEventListener('beforeunload', cleanupScanner);

    // Funções principais
    async function toggleScanner() {
        if (scannerState.isActive) {
            closeScanner();
        } else {
            await initializeScanner();
        }
    }

    async function initializeScanner() {
        try {
            scannerState.isInitializing = true;
            updateUI();
            
            await barcodeScanner.inicializar('scanner-video', handleBarcodeDetection);
            
            scannerState.isActive = true;
            scannerState.lastError = null;
        } catch (error) {
            handleScannerError(error);
        } finally {
            scannerState.isInitializing = false;
            updateUI();
        }
    }

    function handleBarcodeDetection(codigo) {
        if (barcodeScanner.verificarCodigoEAN13(codigo)) {
            scannerUI.codigoInput.value = codigo;
            showFeedback('Código válido detectado!', 'success');
            closeScanner();
        } else {
            handleScannerError(new Error('Código EAN-13 inválido'));
        }
    }

    function closeScanner() {
        if (scannerState.isActive) {
            barcodeScanner.parar();
            scannerState.isActive = false;
            scannerUI.modal.style.display = 'none';
            updateUI();
        }
    }

    // Funções auxiliares
    function generateRandomBarcode() {
        const codigo = barcodeScanner.gerarCodigoBarrasAleatorio();
        scannerUI.codigoInput.value = codigo;
        showFeedback('Código gerado com sucesso!', 'success');
    }

    function handleScannerError(error) {
        console.error('Erro no scanner:', error);
        scannerState.lastError = error;
        showFeedback(`Erro: ${error.message}`, 'error');
        closeScanner();
    }

    function updateUI() {
        // Estado do modal
        scannerUI.modal.style.display = scannerState.isActive ? 'flex' : 'none';
        
        // Estado do botão principal
        scannerUI.btnScanner.textContent = scannerState.isActive 
            ? 'Parar Scanner' 
            : 'Iniciar Scanner';
        
        // Feedback de status
        scannerUI.statusElement.textContent = scannerState.isInitializing
            ? 'Inicializando scanner...'
            : scannerState.isActive
                ? 'Apontando para o código de barras...'
                : 'Pronto para escanear';
        
        // Indicador de carregamento
        scannerUI.loadingElement.style.display = scannerState.isInitializing 
            ? 'block' 
            : 'none';
        
        // Tratamento de erros
        scannerUI.errorElement.textContent = scannerState.lastError?.message || '';
        scannerUI.errorElement.style.display = scannerState.lastError ? 'block' : 'none';
    }

    function showFeedback(message, type = 'info') {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3'
        };
        
        scannerUI.statusElement.style.color = colors[type];
        scannerUI.statusElement.textContent = message;
        
        // Resetar após 2 segundos
        if (type !== 'info') {
            setTimeout(() => {
                scannerUI.statusElement.style.color = '';
                updateUI();
            }, 2000);
        }
    }

    function cleanupScanner() {
        if (scannerState.isActive) {
            barcodeScanner.parar();
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
