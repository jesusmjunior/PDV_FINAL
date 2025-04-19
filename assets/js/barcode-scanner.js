/**
 * Módulo de Integração do Scanner de Código de Barras com QuaggaJS
 * Versão 4.0 - Implementação com Sistema de Áudio Integrado
 */

document.addEventListener('DOMContentLoaded', () => {
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
                
                // Adicionar classe de destaque para feedback visual
                scannerUI.videoElement.parentElement.classList.add('scan-success');
                
                // Remover a classe após um tempo
                setTimeout(() => {
                    scannerUI.videoElement.parentElement.classList.remove('scan-success');
                }, 500);
                
                setTimeout(closeScanner, 1000);
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
        
        // Adicionar indicador de atividade quando o scanner estiver ativo
        if (scannerState.isActive && !document.querySelector('.scanner-pulse')) {
            const pulse = document.createElement('div');
            pulse.className = 'scanner-pulse';
            scannerUI.videoElement.parentElement.appendChild(pulse);
        } else if (!scannerState.isActive) {
            const pulse = document.querySelector('.scanner-pulse');
            if (pulse) pulse.remove();
        }
    }

    function cleanup() {
        if (scannerState.isActive) barcodeScanner.parar();
    }

    // Função de feedback sonoro
    function playSound(type = 'success') {
        // Verificar se o sistema de áudio está disponível
        if (window.audioSystem) {
            // Usar o sistema de áudio
            window.audioSystem.play(type);
        } else {
            // Fallback: tentar reproduzir via elementos de áudio
            const audioElement = document.getElementById(`beep-${type}`);
            if (audioElement) {
                try {
                    // Resetar o áudio antes de tocar
                    audioElement.pause();
                    audioElement.currentTime = 0;
                    
                    // Tentar tocar o áudio
                    const playPromise = audioElement.play();
                    
                    // Tratar possíveis erros de reprodução (geralmente por interação do usuário)
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.warn('Erro ao reproduzir áudio (controle de autoplay do navegador):', error);
                            
                            // Algumas políticas de navegador exigem interação do usuário
                            // Então armazenamos esta info para tentar novamente mais tarde
                            scannerState.pendingSound = true;
                        });
                    }
                } catch (error) {
                    console.error('Erro ao reproduzir áudio:', error);
                }
            } else {
                console.warn(`Elemento de áudio 'beep-${type}' não encontrado`);
            }
        }
    }

    // Criar os elementos de áudio dinamicamente se não existirem
    function setupAudioElements() {
        // Tipos de sons necessários
        const soundTypes = ['success', 'error', 'scan', 'alert'];
        
        // Verificar se os elementos existem e criar se necessário
        soundTypes.forEach(type => {
            const elementId = `beep-${type}`;
            if (!document.getElementById(elementId)) {
                // Criar o elemento de áudio
                const audioElement = document.createElement('audio');
                audioElement.id = elementId;
                audioElement.className = 'audio-feedback';
                
                // Adicionar fonte
                const source = document.createElement('source');
                source.src = `assets/sounds/beep-${type}.wav`; // Ou .mp3 conforme disponível
                source.type = 'audio/wav'; // Ou 'audio/mpeg' para MP3
                
                // Adicionar ao DOM
                audioElement.appendChild(source);
                document.body.appendChild(audioElement);
            }
        });
    }

    // Configurar elementos de áudio
    setupAudioElements();

    // Testar o áudio para verificar se está funcionando
    setTimeout(() => {
        playSound('success');
    }, 1000);

    // Carregar código da URL
    const urlParams = new URLSearchParams(window.location.search);
    const codigoParam = urlParams.get('codigo');
    if (codigoParam) {
        scannerUI.codigoInput.value = codigoParam;
    }
});
