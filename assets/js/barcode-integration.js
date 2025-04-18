// assets/js/barcode-integration.js
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se os elementos do scanner existem
  const cameraContainer = document.getElementById('camera-container');
  const scannerVideo = document.getElementById('scanner-video');
  const btnEscanear = document.getElementById('btn-escanear');
  const btnCancelarScan = document.getElementById('btn-cancelar-scan');
  
  // Verificar se a biblioteca Quagga está disponível
  if (typeof Quagga === 'undefined') {
    console.error('Biblioteca Quagga não encontrada');
    
    // Desabilitar botão de scanner
    if (btnEscanear) {
      btnEscanear.disabled = true;
      btnEscanear.title = 'Scanner não disponível: biblioteca não carregada';
    }
    
    return;
  }
  
  // Verificar se as funções da página estoque estão disponíveis
  if (typeof window.iniciarScanner !== 'function' || 
      typeof window.pararScanner !== 'function' || 
      typeof window.buscarPorCodigoBarras !== 'function') {
    console.error('Funções de integração com estoque.js não encontradas');
    return;
  }
  
  // Substitui a implementação padrão das funções de scanner
  window.iniciarScanner = function() {
    // Mostrar container da câmera
    if (cameraContainer) {
      cameraContainer.style.display = 'block';
    }
    
    // Inicializar scanner Quagga
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerVideo,
        constraints: {
          width: 480,
          height: 320,
          facingMode: "environment" // Usar câmera traseira em dispositivos móveis
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency || 4,
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_39_vin_reader",
          "codabar_reader",
          "upc_reader",
          "upc_e_reader",
          "i2of5_reader"
        ],
        debug: {
          showCanvas: false,
          showPatches: false,
          showFoundPatches: false,
          showSkeleton: false,
          showLabels: false,
          showPatchLabels: false,
          showRemainingPatchLabels: false
        }
      },
      frequency: 10,
      locate: true
    }, function(err) {
      if (err) {
        console.error("Erro ao inicializar o scanner: ", err);
        alert("Erro ao inicializar o scanner: " + err);
        return;
      }
      
      console.log("Scanner Quagga inicializado com sucesso!");
      
      // Iniciar scanner
      Quagga.start();
      
      // Definir variável de estado no objeto window
      window.scanner = true;
      
      // Adicionar evento para detecção de códigos
      Quagga.onDetected(function(result) {
        // Verificar confiabilidade do código lido
        if (result.codeResult.startInfo.error > 0.1) {
          // Código com baixa confiabilidade, ignorar
          console.log("Código com baixa confiabilidade detectado, ignorando...");
          return;
        }
        
        console.log("Código de barras detectado:", result.codeResult.code);
        
        // Obter código lido
        const code = result.codeResult.code;
        
        // Reproduzir som de beep (opcional)
        const beep = new Audio('assets/sounds/beep.mp3');
        beep.play().catch(err => console.log("Erro ao reproduzir som", err));
        
        // Parar scanner
        window.pararScanner();
        
        // Preencher campo de código
        const codigoBarrasInput = document.getElementById('codigo-barras');
        if (codigoBarrasInput) {
          codigoBarrasInput.value = code;
        }
        
        // Buscar produto
        window.buscarPorCodigoBarras();
      });
      
      // Adicionar manipulador de erro para falhas durante a digitalização
      Quagga.onProcessed(function(result) {
        const drawingCtx = Quagga.canvas.ctx.overlay;
        const drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
          // Limpar canvas
          if (drawingCtx) {
            drawingCtx.clearRect(
              0,
              0,
              Number(drawingCanvas.getAttribute("width")),
              Number(drawingCanvas.getAttribute("height"))
            );
          }

          // Desenhar guia se um código de barras for detectado
          if (result.boxes) {
            drawingCtx.strokeStyle = "green";
            drawingCtx.lineWidth = 2;
            
            for (let i = 0; i < result.boxes.length; i++) {
              const box = result.boxes[i];
              if (box !== result.box) {
                drawingCtx.beginPath();
                drawingCtx.moveTo(box[0][0], box[0][1]);
                drawingCtx.lineTo(box[1][0], box[1][1]);
                drawingCtx.lineTo(box[2][0], box[2][1]);
                drawingCtx.lineTo(box[3][0], box[3][1]);
                drawingCtx.lineTo(box[0][0], box[0][1]);
                drawingCtx.stroke();
              }
            }
          }

          // Destacar código de barras válido
          if (result.codeResult && result.codeResult.code) {
            drawingCtx.strokeStyle = "red";
            drawingCtx.lineWidth = 3;
            drawingCtx.beginPath();
            drawingCtx.moveTo(result.box[0][0], result.box[0][1]);
            drawingCtx.lineTo(result.box[1][0], result.box[1][1]);
            drawingCtx.lineTo(result.box[2][0], result.box[2][1]);
            drawingCtx.lineTo(result.box[3][0], result.box[3][1]);
            drawingCtx.lineTo(result.box[0][0], result.box[0][1]);
            drawingCtx.stroke();
          }
        }
      });
    });
  };
  
  window.pararScanner = function() {
    if (window.scanner) {
      Quagga.stop();
      
      if (cameraContainer) {
        cameraContainer.style.display = 'none';
      }
      
      window.scanner = false;
    }
  };
  
  // Verificar permissões da câmera
  function verificarPermissaoCamera() {
    return navigator.mediaDevices.getUserMedia({ video: true })
      .then(function(stream) {
        // Parar o stream imediatamente após verificar a permissão
        stream.getTracks().forEach(track => track.stop());
        return true;
      })
      .catch(function(error) {
        console.error("Erro ao acessar a câmera:", error);
        return false;
      });
  }
  
  // Se o botão de scanner existir, adicionar verificação de permissões
  if (btnEscanear) {
    btnEscanear.addEventListener('click', function(e) {
      e.preventDefault();
      
      verificarPermissaoCamera().then(function(temPermissao) {
        if (temPermissao) {
          window.iniciarScanner();
        } else {
          alert("Permissão de câmera negada. Verifique as configurações do seu navegador.");
        }
      });
    });
  }
  
  // Melhorias para dispositivos móveis
  function verificarDispositivo() {
    // Verificar se é um dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Ajustar configurações para mobile
      if (cameraContainer) {
        cameraContainer.style.width = '100%';
      }
      
      if (scannerVideo) {
        scannerVideo.style.width = '100%';
        scannerVideo.style.height = 'auto';
      }
    }
  }
  
  // Aplicar configurações específicas para o dispositivo
  verificarDispositivo();
});
