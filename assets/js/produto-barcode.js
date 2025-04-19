/**
 * Módulo de Integração do Scanner de Código de Barras com QuaggaJS
 * Versão 3.0 - Implementação Completa
 */

document.addEventListener('DOMContentLoaded', () => {
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

    if (!scannerUI.btnScanner) return;

    let scannerState = {
        isActive: false,
        isInitializing: false,
        torchEnabled: false
    };

    // Event Listeners
    scannerUI.btnScanner.addEventListener('click', toggleScanner);
    scannerUI.btnGerar.addEventListener('click', generateBarcode);
    scannerUI.closeButtons.forEach(btn => btn.addEventListener('click', closeScanner));
    scannerUI.torchButton?.addEventListener('click', toggleTorch);
    window.addEventListener('beforeunload', cleanup);

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
            
            await barcodeScanner.inicializar('scanner-video', handleDetection);
            
            scannerState.isActive = true;
            showStatus('Scanner pronto - Aponte para o código', 'info');
            playBeep('success');
        } catch (error) {
            handleError(error);
        } finally {
            scannerState.isInitializing = false;
            updateUI();
        }
    }

    function handleDetection(code) {
        if (validateBarcode(code)) {
            scannerUI.codigoInput.value = code;
            showStatus('Código válido detectado!', 'success');
            playBeep('success');
            setTimeout(closeScanner, 500);
        }
    }

    function validateBarcode(code) {
        if (!barcodeScanner.verificarCodigoEAN13(code)) {
            playBeep('error');
            throw new Error('Código EAN-13 inválido');
        }
        return true;
    }

    async function closeScanner() {
        if (scannerState.isActive) {
            scannerState.isActive = false;
            barcodeScanner.parar();
            updateUI();
            showStatus('Scanner desativado', 'info');
        }
    }

    function generateBarcode() {
        const code = barcodeScanner.gerarCodigoBarrasAleatorio();
        scannerUI.codigoInput.value = code;
        showStatus('Código gerado com sucesso!', 'success');
        playBeep('success');
    }

    async function toggleTorch() {
        try {
            await barcodeScanner.controleLanterna(!scannerState.torchEnabled);
            scannerState.torchEnabled = !scannerState.torchEnabled;
            scannerUI.torchButton.classList.toggle('active');
        } catch (error) {
            console.error('Erro na lanterna:', error);
        }
    }

    function handleError(error) {
        console.error('Erro no Scanner:', error);
        showStatus(error.message, 'error');
        playBeep('error');
        closeScanner();
    }

    function showStatus(message, type = 'info') {
        scannerUI.statusElement.className = `scanner-status ${type} active`;
        scannerUI.statusElement.querySelector('.status-text').textContent = message;
        
        if (type === 'error') {
            scannerUI.errorElement.querySelector('.error-message').textContent = message;
            scannerUI.errorElement.classList.add('active');
        }
        
        setTimeout(() => {
            scannerUI.statusElement.classList.remove('active');
            scannerUI.errorElement.classList.remove('active');
        }, 3000);
    }

    function updateUI() {
        scannerUI.modal.style.display = scannerState.isActive ? 'block' : 'none';
        scannerUI.btnScanner.innerHTML = scannerState.isActive 
            ? '<i class="fas fa-stop"></i> Parar' 
            : '<i class="fas fa-camera"></i> Escanear';
            
        scannerUI.loadingElement.style.display = scannerState.isInitializing 
            ? 'block' 
            : 'none';
    }

    function cleanup() {
        if (scannerState.isActive) barcodeScanner.parar();
    }

    // Função de feedback sonoro
    function playBeep(type = 'success') {
        const audio = document.getElementById(`beep-${type}`);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    }

    // Carregar código da URL
    const urlParams = new URLSearchParams(window.location.search);
    const codigoParam = urlParams.get('codigo');
    if (codigoParam) {
        scannerUI.codigoInput.value = codigoParam;
    }
});
/**
 * Módulo de Integração do Scanner de Código de Barras com QuaggaJS
 * Versão 4.0 - Implementação com Sistema de Áudio Integrado
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o sistema de áudio está disponível
    if (!window.audioSystem) {
        console.error('Sistema de áudio não encontrado. Certifique-se de incluir audio-system.js');
    }
    
    // Elementos de UI
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

    // Verificar se os elementos existem
    if (!scannerUI.btnScanner) return;

    let scannerState = {
        isActive: false,
        isInitializing: false,
        torchEnabled: false
    };

    // Event Listeners
    scannerUI.btnScanner.addEventListener('click', toggleScanner);
    scannerUI.btnGerar.addEventListener('click', generateBarcode);
    scannerUI.closeButtons.forEach(btn => btn.addEventListener('click', closeScanner));
    if (scannerUI.torchButton) {
        scannerUI.torchButton.addEventListener('click', toggleTorch);
    }
    window.addEventListener('beforeunload', cleanup);

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
            
            // Mostrar status de inicialização
            showStatus('Inicializando câmera...', 'info');
            
            await barcodeScanner.inicializar('scanner-video', handleDetection);
            
            scannerState.isActive = true;
            showStatus('Scanner pronto - Aponte para o código', 'info');
            playSound('success');
        } catch (error) {
            handleError(error);
        } finally {
            scannerState.isInitializing = false;
            updateUI();
        }
    }

    function handleDetection(code) {
        try {
            if (validateBarcode(code)) {
                scannerUI.codigoInput.value = code;
                showStatus('Código válido detectado!', 'success');
                playSound('scan');
                setTimeout(closeScanner, 500);
            }
        } catch (error) {
            showStatus(error.message, 'error');
            playSound('error');
        }
    }

    function validateBarcode(code) {
        if (!barcodeScanner.verificarCodigoEAN13(code)) {
            throw new Error('Código EAN-13 inválido');
        }
        return true;
    }

    async function closeScanner() {
        if (scannerState.isActive) {
            scannerState.isActive = false;
            barcodeScanner.parar();
            updateUI();
            showStatus('Scanner desativado', 'info');
        }
    }

    function generateBarcode() {
        const code = barcodeScanner.gerarCodigoBarrasAleatorio();
        scannerUI.codigoInput.value = code;
        showStatus('Código gerado com sucesso!', 'success');
        playSound('success');
    }

    async function toggleTorch() {
        try {
            await barcodeScanner.controleLanterna(!scannerState.torchEnabled);
            scannerState.torchEnabled = !scannerState.torchEnabled;
            if (scannerUI.torchButton) {
                scannerUI.torchButton.classList.toggle('active');
            }
            
            // Som ao ativar/desativar lanterna
            playSound('alert');
        } catch (error) {
            console.error('Erro na lanterna:', error);
            showStatus('Erro ao ativar lanterna', 'error');
        }
    }

    function handleError(error) {
        console.error('Erro no Scanner:', error);
        showStatus(error.message || 'Erro no scanner de código de barras', 'error');
        playSound('error');
        closeScanner();
    }

    function showStatus(message, type = 'info') {
        if (!scannerUI.statusElement) return;
        
        // Definir ícone baseado no tipo
        const iconMap = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'info': 'info-circle',
            'warning': 'exclamation-triangle'
        };
        
        const icon = iconMap[type] || 'info-circle';
        
        // Atualizar conteúdo e classes
        scannerUI.statusElement.className = `scanner-status ${type} active`;
        scannerUI.statusElement.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span class="status-text">${message}</span>
        `;
        
        // Mostrar mensagem de erro específica se for erro
        if (type === 'error' && scannerUI.errorElement) {
            scannerUI.errorElement.querySelector('.error-message').textContent = message;
            scannerUI.errorElement.style.display = 'block';
        }
        
        // Esconder após 3 segundos
        setTimeout(() => {
            if (scannerUI.statusElement) {
                scannerUI.statusElement.classList.remove('active');
            }
            if (type === 'error' && scannerUI.errorElement) {
                scannerUI.errorElement.style.display = 'none';
            }
        }, 3000);
    }

    function updateUI() {
        // Atualizar visibilidade do modal
        if (scannerUI.modal) {
            scannerUI.modal.style.display = scannerState.isActive ? 'flex' : 'none';
        }
        
        // Atualizar botão do scanner
        if (scannerUI.btnScanner) {
            scannerUI.btnScanner.innerHTML = scannerState.isActive 
                ? '<i class="fas fa-stop"></i>' 
                : '<i class="fas fa-camera"></i>';
            
            scannerUI.btnScanner.title = scannerState.isActive 
                ? 'Parar scanner' 
                : 'Escanear código';
        }
        
        // Mostrar/esconder loader
        if (scannerUI.loadingElement) {
            scannerUI.loadingElement.style.display = scannerState.isInitializing 
                ? 'block' 
                : 'none';
        }
    }

    function cleanup() {
        if (scannerState.isActive) barcodeScanner.parar();
    }

    // Função de feedback sonoro usando o novo sistema de áudio
    function playSound(type = 'success') {
        // Verificar se o sistema de áudio está disponível
        if (window.audioSystem) {
            // Tocar o som usando o sistema de áudio
            window.audioSystem.play(type);
        } else {
            // Fallback: tentar tocar áudio via elementos HTML (método antigo)
            const audioElement = document.getElementById(`beep-${type}`);
            if (audioElement) {
                try {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                    audioElement.play().catch(err => {
                        console.warn(`Erro ao reproduzir áudio (método antigo): ${err.message}`);
                    });
                } catch (error) {
                    console.error('Erro ao reproduzir áudio:', error);
                }
            } else {
                console.warn(`Elemento de áudio '${type}' não encontrado e sistema de áudio não disponível`);
            }
        }
    }

    // Carregar código da URL
    const urlParams = new URLSearchParams(window.location.search);
    const codigoParam = urlParams.get('codigo');
    if (codigoParam) {
        scannerUI.codigoInput.value = codigoParam;
    }
});
