// assets/js/orion-integration.js
/**
 * ORION PDV - Arquivo de integração de sistema
 * Este arquivo resolve os conflitos entre os diferentes componentes do sistema,
 * unificando a interface de banco de dados e integrando os scanners de código de barras.
 * 
 * Data: 18/04/2025
 * Versão: 1.0.0
 */

(function() {
  // =========================================================================
  // INICIALIZAÇÃO E INTEGRAÇÃO DO BANCO DE DADOS
  // =========================================================================
  
  // Verifica se o banco de dados já está inicializado
  if (typeof window.db === 'undefined') {
    console.log('Inicializando sistema de banco de dados ORION...');
    
    // Determinar qual implementação de banco de dados usar
    // Por padrão, usamos localStorage para maior compatibilidade
    const useIndexedDB = false; 
    
    // Inicializa o banco de dados
    window.db = new OrionDatabase(useIndexedDB ? 'indexedDB' : 'localStorage');
    
    // Adiciona versão do sistema
    window.db.VERSION = '1.2.1';
    
    console.log(`Sistema de banco de dados ORION inicializado (${window.db.VERSION})`);
  }
  
  // =========================================================================
  // INTEGRAÇÃO DO SCANNER DE CÓDIGOS DE BARRAS
  // =========================================================================
  
  // Objeto global para integração de scanner
  window.barcodeSystem = {
    // Estado do scanner
    active: false,
    
    // Configurações
    config: {
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
      locate: true,
      numOfWorkers: navigator.hardwareConcurrency || 4
    },
    
    // Método para verificar disponibilidade do scanner
    checkAvailability: function() {
      // Verificar se Quagga está disponível
      if (typeof Quagga === 'undefined') {
        console.error('Biblioteca Quagga não encontrada. Scanner de código de barras não estará disponível.');
        return false;
      }
      
      return true;
    },
    
    // Método para verificar permissões de câmera
    checkCameraPermission: function() {
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
    },
    
    // Método para iniciar o scanner
    startScanner: function(targetElement, callback) {
      // Verificar disponibilidade
      if (!this.checkAvailability()) {
        return Promise.reject(new Error('Scanner não disponível'));
      }
      
      // Guardar elemento alvo
      this.config.inputStream.target = targetElement;
      
      // Criar promise para inicialização
      return new Promise((resolve, reject) => {
        // Verificar permissão da câmera primeiro
        this.checkCameraPermission()
          .then(hasPermission => {
            if (!hasPermission) {
              reject(new Error('Permissão de câmera negada'));
              return;
            }
            
            // Inicializar Quagga
            Quagga.init(
              this.config,
              (err) => {
                if (err) {
                  console.error('Erro ao inicializar scanner:', err);
                  reject(err);
                  return;
                }
                
                // Registrar callback para detecção
                Quagga.onDetected((result) => {
                  // Verificar confiabilidade do código lido
                  if (result.codeResult.startInfo.error > 0.1) {
                    // Código com baixa confiabilidade, ignorar
                    console.log("Código com baixa confiabilidade detectado, ignorando...");
                    return;
                  }
                  
                  // Obter código lido
                  const code = result.codeResult.code;
                  console.log("Código de barras detectado:", code);
                  
                  // Reproduzir som de beep (opcional)
                  try {
                    const beep = new Audio('assets/sounds/beep.mp3');
                    beep.play().catch(err => console.log("Erro ao reproduzir som", err));
                  } catch (e) {
                    // Ignora erro de reprodução de som
                  }
                  
                  // Executar callback
                  if (typeof callback === 'function') {
                    callback(code);
                  }
                });
                
                // Configurar visualização do processo de escaneamento
                Quagga.onProcessed((result) => {
                  const drawingCtx = Quagga.canvas.ctx.overlay;
                  const drawingCanvas = Quagga.canvas.dom.overlay;

                  if (result && drawingCtx && drawingCanvas) {
                    // Limpar canvas
                    drawingCtx.clearRect(
                      0,
                      0,
                      Number(drawingCanvas.getAttribute("width")),
                      Number(drawingCanvas.getAttribute("height"))
                    );

                    // Desenhar guias se um código de barras for detectado
                    if (result.boxes) {
                      drawingCtx.strokeStyle = "rgba(0, 255, 0, 0.5)";
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
                    if (result.box) {
                      drawingCtx.strokeStyle = "rgba(255, 0, 0, 0.8)";
                      drawingCtx.lineWidth = 4;
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
                
                // Iniciar scanner
                Quagga.start();
                this.active = true;
                
                console.log("Scanner iniciado com sucesso");
                resolve(true);
              }
            );
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    
    // Método para parar o scanner
    stopScanner: function() {
      if (this.active) {
        Quagga.stop();
        this.active = false;
        console.log('Scanner parado');
        return true;
      }
      return false;
    },
    
    // Função utilitária para gerar código de barras EAN-13 válido
    generateEAN13: function() {
      // Prefixo para GS1 Brasil (789 ou 790)
      let codigo = '789';
      
      // Gerar 9 dígitos aleatórios
      for (let i = 0; i < 9; i++) {
        codigo += Math.floor(Math.random() * 10);
      }
      
      // Calcular dígito verificador
      let soma = 0;
      for (let i = 0; i < 12; i++) {
        soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
      }
      
      const digitoVerificador = (10 - (soma % 10)) % 10;
      
      // Adicionar dígito verificador
      codigo += digitoVerificador;
      
      return codigo;
    },
    
    // Função para validar código de barras
    validateBarcode: function(codigo) {
      if (!codigo || codigo.length === 0) return true; // Permitir vazio
      
      // Verificar se contém apenas dígitos
      if (!/^\d+$/.test(codigo)) {
        return false;
      }
      
      // Verificar comprimento (EAN-8, EAN-13, UPC-A, etc.)
      const validLengths = [8, 12, 13, 14];
      if (!validLengths.includes(codigo.length)) {
        return false;
      }
      
      // Para EAN-13, validar dígito verificador
      if (codigo.length === 13) {
        let soma = 0;
        for (let i = 0; i < 12; i++) {
          soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
        }
        
        const digitoVerificador = (10 - (soma % 10)) % 10;
        
        if (parseInt(codigo[12]) !== digitoVerificador) {
          return false;
        }
      }
      
      // Para EAN-8, validar dígito verificador
      if (codigo.length === 8) {
        let soma = 0;
        for (let i = 0; i < 7; i++) {
          soma += parseInt(codigo[i]) * (i % 2 !== 0 ? 1 : 3);
        }
        
        const digitoVerificador = (10 - (soma % 10)) % 10;
        
        if (parseInt(codigo[7]) !== digitoVerificador) {
          return false;
        }
      }
      
      return true;
    }
  };
  
  // Exportar funções para compatibilidade com código existente
  window.validarCodigoBarras = window.barcodeSystem.validateBarcode;
  window.gerarCodigoBarras = window.barcodeSystem.generateEAN13;
  
  // Funções de scanner para compatibilidade com código existente
  window.iniciarScanner = function() {
    const cameraContainer = document.getElementById('camera-container');
    const scannerVideo = document.getElementById('scanner-video');
    
    if (cameraContainer) {
      cameraContainer.style.display = 'block';
    }
    
    window.barcodeSystem.startScanner(scannerVideo, function(code) {
      // Parar scanner
      window.pararScanner();
      
      // Preencher campo de código
      const codigoBarrasInput = document.getElementById('codigo-barras');
      if (codigoBarrasInput) {
        codigoBarrasInput.value = code;
      }
      
      // Buscar produto
      if (typeof window.buscarPorCodigoBarras === 'function') {
        window.buscarPorCodigoBarras();
      }
    });
  };
  
  window.pararScanner = function() {
    window.barcodeSystem.stopScanner();
    
    const cameraContainer = document.getElementById('camera-container');
    if (cameraContainer) {
      cameraContainer.style.display = 'none';
    }
  };
  
  // =========================================================================
  // CORREÇÕES DE FUNÇÕES AUSENTES/INCONSISTENTES NO BANCO DE DADOS
  // =========================================================================
  
  // Verificar e implementar métodos essenciais caso não existam
  
  // 1. Exportação de dados para CSV
  if (typeof window.db.exportarCSV !== 'function') {
    window.db.exportarCSV = function(dados, nomeArquivo) {
      // Verificar se dados é um array
      if (!Array.isArray(dados) || dados.length === 0) {
        console.error('Dados inválidos para exportação CSV');
        return false;
      }
      
      try {
        // Obter cabeçalhos a partir das chaves do primeiro objeto
        const headers = Object.keys(dados[0]);
        
        // Iniciar conteúdo CSV com cabeçalhos
        let csvContent = headers.join(',') + '\n';
        
        // Adicionar linhas de dados
        for (const row of dados) {
          const values = headers.map(header => {
            // Obter valor e garantir que é uma string
            const cell = row[header] === undefined || row[header] === null ? '' : row[header];
            const cellStr = String(cell);
            
            // Escapar aspas duplas e campos que contêm vírgulas ou quebras de linha
            if (cellStr.includes('"') || cellStr.includes(',') || cellStr.includes('\n')) {
              return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
          });
          
          csvContent += values.join(',') + '\n';
        }
        
        // Criar blob e link para download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', nomeArquivo || 'exportacao.csv');
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
      } catch (erro) {
        console.error('Erro ao exportar para CSV:', erro);
        return false;
      }
    };
  }
  
  // 2. Movimentações de estoque
  if (typeof window.db.salvarMovimentacaoEstoque !== 'function') {
    window.db.salvarMovimentacaoEstoque = function(movimentacao) {
      const movimentacoes = this.getMovimentacoesEstoque();
      
      if (!movimentacao.id) {
        movimentacao.id = this.generateId ? this.generateId() : Math.random().toString(36).substring(2, 9);
      }
      
      if (!movimentacao.data) {
        movimentacao.data = new Date().toISOString();
      }
      
      movimentacoes.push(movimentacao);
      localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(movimentacoes));
      
      return movimentacao;
    };
  }
  
  if (typeof window.db.getMovimentacoesEstoque !== 'function') {
    window.db.getMovimentacoesEstoque = function() {
      return JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]');
    };
  }
  
  // 3. Exportação e importação de dados
  if (typeof window.db.exportarDados !== 'function') {
    window.db.exportarDados = function() {
      try {
        const dados = {
          versao: this.VERSION,
          data: new Date().toISOString(),
          dados: {
            usuarios: this.getUsuarios ? this.getUsuarios() : JSON.parse(localStorage.getItem('orion_usuarios') || '{}'),
            produtos: this.getProdutos ? this.getProdutos() : JSON.parse(localStorage.getItem('orion_produtos') || '{}'),
            clientes: this.getClientes ? this.getClientes() : JSON.parse(localStorage.getItem('orion_clientes') || '[]'),
            vendas: this.getVendas ? this.getVendas() : JSON.parse(localStorage.getItem('orion_vendas') || '[]'),
            movimentacoes_estoque: this.getMovimentacoesEstoque ? this.getMovimentacoesEstoque() : JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]'),
            grupos: this.getGrupos ? this.getGrupos() : JSON.parse(localStorage.getItem('orion_grupos') || '[]'),
            marcas: this.getMarcas ? this.getMarcas() : JSON.parse(localStorage.getItem('orion_marcas') || '[]'),
            formas_pagamento: this.getFormasPagamento ? this.getFormasPagamento() : JSON.parse(localStorage.getItem('orion_formas_pagamento') || '[]'),
            config: this.getConfig ? this.getConfig() : JSON.parse(localStorage.getItem('orion_config') || '{}')
          }
        };
        
        return JSON.stringify(dados, null, 2);
      } catch (erro) {
        console.error('Erro ao exportar dados:', erro);
        return null;
      }
    };
  }
  
  if (typeof window.db.importarDados !== 'function') {
    window.db.importarDados = function(dadosJson) {
      try {
        const dados = JSON.parse(dadosJson);
        
        // Verificar formato
        if (!dados.versao || !dados.dados) {
          console.error('Formato de dados inválido');
          return false;
        }
        
        // Importar dados
        if (dados.dados.usuarios) localStorage.setItem('orion_usuarios', JSON.stringify(dados.dados.usuarios));
        if (dados.dados.produtos) localStorage.setItem('orion_produtos', JSON.stringify(dados.dados.produtos));
        if (dados.dados.clientes) localStorage.setItem('orion_clientes', JSON.stringify(dados.dados.clientes));
        if (dados.dados.vendas) localStorage.setItem('orion_vendas', JSON.stringify(dados.dados.vendas));
        if (dados.dados.movimentacoes_estoque) localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(dados.dados.movimentacoes_estoque));
        if (dados.dados.grupos) localStorage.setItem('orion_grupos', JSON.stringify(dados.dados.grupos));
        if (dados.dados.marcas) localStorage.setItem('orion_marcas', JSON.stringify(dados.dados.marcas));
        if (dados.dados.formas_pagamento) localStorage.setItem('orion_formas_pagamento', JSON.stringify(dados.dados.formas_pagamento));
        if (dados.dados.config) localStorage.setItem('orion_config', JSON.stringify(dados.dados.config));
        
        // Atualizar versão
        localStorage.setItem('orion_version', this.VERSION);
        
        return true;
      } catch (erro) {
        console.error('Erro ao importar dados:', erro);
        return false;
      }
    };
  }
  
  // 4. Configurações
  if (typeof window.db.getConfig !== 'function') {
    window.db.getConfig = function() {
      return JSON.parse(localStorage.getItem('orion_config') || '{}');
    };
  }
  
  if (typeof window.db.salvarConfig !== 'function') {
    window.db.salvarConfig = function(config) {
      localStorage.setItem('orion_config', JSON.stringify(config));
      return config;
    };
  }
  
  // 5. Função para gerar relatórios de vendas
  if (typeof window.db.gerarRelatorioVendas !== 'function') {
    window.db.gerarRelatorioVendas = function(filtros = {}) {
      // Obter todas as vendas
      const vendas = this.getVendas ? this.getVendas() : JSON.parse(localStorage.getItem('orion_vendas') || '[]');
      
      // Aplicar filtros
      let vendasFiltradas = vendas;
      
      // Filtrar por data
      if (filtros.dataInicio && filtros.dataFim) {
        const dataInicio = new Date(filtros.dataInicio);
        dataInicio.setHours(0, 0, 0, 0);
        
        const dataFim = new Date(filtros.dataFim);
        dataFim.setHours(23, 59, 59, 999);
        
        vendasFiltradas = vendasFiltradas.filter(venda => {
          const dataVenda = new Date(venda.data);
          return dataVenda >= dataInicio && dataVenda <= dataFim;
        });
      }
      
      // Filtrar por cliente
      if (filtros.clienteId) {
        vendasFiltradas = vendasFiltradas.filter(venda => venda.cliente_id === filtros.clienteId);
      }
      
      // Filtrar por forma de pagamento
      if (filtros.formaPagamento) {
        vendasFiltradas = vendasFiltradas.filter(venda => venda.forma_pagamento === filtros.formaPagamento);
      }
      
      // Calcular totais
      const totalVendas = vendasFiltradas.length;
      const valorTotal = vendasFiltradas.reduce((acc, venda) => acc + venda.total, 0);
      const valorDesconto = vendasFiltradas.reduce((acc, venda) => acc + venda.desconto, 0);
      const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
      
      // Agrupar por forma de pagamento
      const vendasPorFormaPagamento = {};
      vendasFiltradas.forEach(venda => {
        if (!vendasPorFormaPagamento[venda.forma_pagamento]) {
          vendasPorFormaPagamento[venda.forma_pagamento] = {
            quantidade: 0,
            valor: 0
          };
        }
        
        vendasPorFormaPagamento[venda.forma_pagamento].quantidade += 1;
        vendasPorFormaPagamento[venda.forma_pagamento].valor += venda.total;
      });
      
      // Agrupar por data
      const vendasPorData = {};
      vendasFiltradas.forEach(venda => {
        // Extrair data (sem hora)
        const dataVenda = venda.data.split('T')[0];
        
        if (!vendasPorData[dataVenda]) {
          vendasPorData[dataVenda] = 0;
        }
        
        vendasPorData[dataVenda] += venda.total;
      });
      
      // Retornar relatório
      return {
        periodo: {
          inicio: filtros.dataInicio || null,
          fim: filtros.dataFim || null
        },
        totais: {
          vendas: totalVendas,
          valor: valorTotal,
          desconto: valorDesconto,
          ticketMedio: ticketMedio
        },
        formasPagamento: vendasPorFormaPagamento,
        vendasPorData: vendasPorData,
        vendas: vendasFiltradas
      };
    };
  }
  
  // 6. Função para buscar produto por código de barras
  if (typeof window.db.getProdutoPorCodigoBarras !== 'function') {
    window.db.getProdutoPorCodigoBarras = function(codigo) {
      const produtos = this.getProdutos ? this.getProdutos() : JSON.parse(localStorage.getItem('orion_produtos') || '{}');
      return Object.values(produtos).find(p => p.codigo_barras === codigo);
    };
  }
  
  // =========================================================================
  // COMPATIBILIZAÇÃO DE FORMULÁRIOS
  // =========================================================================
  
  // Função para exibir mensagens de notificação (comum em vários arquivos)
  if (typeof window.exibirMensagem !== 'function') {
    window.exibirMensagem = function(mensagem, tipo) {
      // Criar toast
      const toast = document.createElement('div');
      toast.className = `toast-notification toast-${tipo}`;
      toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'warning' ? 'exclamation-circle' : tipo === 'info' ? 'info-circle' : 'times-circle'}"></i>
          <span>${mensagem}</span>
        </div>
      `;
      
      // Adicionar ao DOM
      document.body.appendChild(toast);
      
      // Exibir com animação
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);
      
      // Remover após 3 segundos
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    };
  }
  
  // Função para compatibilizar formatação
  if (typeof window.formatarTelefone !== 'function') {
    window.formatarTelefone = function(input) {
      let telefone = input.value.replace(/\D/g, '');
      
      if (telefone.length > 11) {
        telefone = telefone.substring(0, 11);
      }
      
      // Aplicar formatação
      if (telefone.length > 10) {
        // Celular com 9 dígitos (XX) XXXXX-XXXX
        telefone = telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (telefone.length > 6) {
        // Telefone fixo (XX) XXXX-XXXX
        telefone = telefone.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
      } else if (telefone.length > 2) {
        // DDD
        telefone = telefone.replace(/(\d{2})(\d{0,5})/, '($1) $2');
      }
      
      input.value = telefone;
    };
  }

  // Função para compatibilizar formatação de CNPJ
  if (typeof window.formatarCNPJ !== 'function') {
    window.formatarCNPJ = function(input) {
      let cnpj = input.value.replace(/\D/g, '');
      
      if (cnpj.length > 14) {
        cnpj = cnpj.substring(0, 14);
      }
      
      // Aplicar formatação
      if (cnpj.length > 12) {
        cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      } else if (cnpj.length > 8) {
        cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
      } else if (cnpj.length > 5) {
        cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else if (cnpj.length > 2) {
        cnpj = cnpj.replace(/(\d{2})(\d{0,3})/, '$1.$2');
      }
      
      input.value = cnpj;
    };
  }
  
  console.log('ORION PDV - Sistema de integração carregado com sucesso!');
})();
