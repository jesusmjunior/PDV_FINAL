/**
 * ORION PDV - Módulo de Integração PDV
 * Versão 2.0 (2025)
 * 
 * Este módulo facilita a integração entre a interface de PDV,
 * o sistema de banco de dados e o leitor de código de barras
 */

const PDV = {
    // Elemento HTML do scanner
    scannerElement: null,
    
    // Status do PDV
    status: {
        vendaEmAndamento: false,
        scannerAtivo: false,
        ultimoProduto: null,
        clienteAtual: '1' // Padrão: Consumidor Final
    },
    
    /**
     * Inicializa o PDV
     * @param {Object} opcoesScanner Opções para inicializar scanner
     */
    iniciar: function(opcoesScanner = {}) {
        // Verificar autenticação
        if (!db.verificarAutenticacao()) {
            window.location.href = 'index.html';
            return false;
        }
        
        // Carregar cliente padrão
        this.selecionarCliente(this.status.clienteAtual);
        
        // Carregar carrinho
        this.atualizarCarrinho();
        
        // Configurar scanner se necessário
        if (opcoesScanner.ativarScanner) {
            this.scannerElement = opcoesScanner.videoElementId || 'scanner-video';
            
            if (opcoesScanner.iniciarAutomaticamente) {
                setTimeout(() => {
                    this.iniciarScanner();
                }, opcoesScanner.delay || 500);
            }
        }
        
        // Aplicar eventos a elementos da interface
        this.aplicarEventos();
        
        return true;
    },
    
    /**
     * Aplica eventos a elementos da interface
     */
    aplicarEventos: function() {
        // Controle de quantidade no carrinho
        document.querySelectorAll('.qtd-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const codigoBarras = e.target.dataset.codigo;
                const quantidade = parseInt(e.target.value);
                
                if (codigoBarras && !isNaN(quantidade)) {
                    this.atualizarQuantidadeItem(codigoBarras, quantidade);
                }
            });
        });
        
        // Botões de remoção de itens
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const codigoBarras = e.target.closest('.btn-remove').dataset.codigo;
                if (codigoBarras) {
                    this.removerItem(codigoBarras);
                }
            });
        });
        
        // Campo de desconto
        const descontoInput = document.getElementById('desconto');
        if (descontoInput) {
            descontoInput.addEventListener('input', (e) => {
                this.aplicarDesconto(parseFloat(e.target.value) || 0);
            });
        }
        
        // Botão finalizar venda
        const btnFinalizar = document.getElementById('btn-finalizar');
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', (e) => {
                this.finalizarVenda();
            });
        }
        
        // Campo de código de barras manual
        const codigoBarrasInput = document.getElementById('codigo-barras');
        if (codigoBarrasInput) {
            codigoBarrasInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const codigo = codigoBarrasInput.value.trim();
                    if (codigo) {
                        this.adicionarProdutoPorCodigo(codigo);
                        codigoBarrasInput.value = '';
                    }
                }
            });
        }
        
        // Botão de busca por código
        const btnBuscarCodigo = document.getElementById('btn-buscar-codigo');
        if (btnBuscarCodigo) {
            btnBuscarCodigo.addEventListener('click', () => {
                const codigoBarrasInput = document.getElementById('codigo-barras');
                if (codigoBarrasInput) {
                    const codigo = codigoBarrasInput.value.trim();
                    if (codigo) {
                        this.adicionarProdutoPorCodigo(codigo);
                        codigoBarrasInput.value = '';
                    }
                }
            });
        }
    },
    
    /**
     * Inicia o scanner de código de barras
     */
    iniciarScanner: function() {
        if (!this.scannerElement) {
            throw new Error('Elemento de scanner não configurado');
        }
        
        // Abrir modal de scanner
        const modalScanner = document.getElementById('modal-scanner');
        if (modalScanner) {
            modalScanner.style.display = 'flex';
        }
        
        try {
            // Iniciar scanner
            barcodeHelper.iniciarScanner(this.scannerElement, (codigo) => {
                // Reproduzir som de sucesso
                const beepSuccess = document.getElementById('beep-success');
                if (beepSuccess) beepSuccess.play();
                
                // Adicionar produto
                this.adicionarProdutoPorCodigo(codigo);
                
                // Fechar scanner após um breve delay (para feedback visual)
                setTimeout(() => {
                    this.pararScanner();
                }, 500);
            });
            
            this.status.scannerAtivo = true;
        } catch (erro) {
            console.error('Erro ao iniciar scanner:', erro);
            this.exibirMensagem('Erro ao iniciar scanner: ' + erro.message, 'error');
            this.pararScanner();
        }
    },
    
    /**
     * Para o scanner de código de barras
     */
    pararScanner: function() {
        try {
            barcodeHelper.pararScanner();
            
            // Fechar modal de scanner
            const modalScanner = document.getElementById('modal-scanner');
            if (modalScanner) {
                modalScanner.style.display = 'none';
            }
            
            this.status.scannerAtivo = false;
        } catch (erro) {
            console.error('Erro ao parar scanner:', erro);
        }
    },
    
    /**
     * Adiciona produto ao carrinho pelo código de barras
     * @param {string} codigo Código de barras
     * @param {number} quantidade Quantidade a adicionar
     */
    adicionarProdutoPorCodigo: function(codigo, quantidade = 1) {
        const resultado = barcodeHelper.adicionarAoCarrinho(codigo, quantidade);
        
        if (resultado.sucesso) {
            this.status.ultimoProduto = resultado.produto;
            this.exibirMensagem(resultado.mensagem, 'success');
            this.atualizarCarrinho();
        } else {
            this.exibirMensagem(resultado.mensagem, 'error');
        }
        
        return resultado;
    },
    
    /**
     * Atualiza a quantidade de um item no carrinho
     * @param {string} codigoBarras Código de barras do produto
     * @param {number} quantidade Nova quantidade
     */
    atualizarQuantidadeItem: function(codigoBarras, quantidade) {
        try {
            db.atualizarQuantidadeCarrinho(codigoBarras, quantidade);
            this.atualizarCarrinho();
        } catch (erro) {
            this.exibirMensagem(erro.message, 'error');
        }
    },
    
    /**
     * Remove um item do carrinho
     * @param {string} codigoBarras Código de barras do produto
     */
    removerItem: function(codigoBarras) {
        const resultado = db.removerItemCarrinho(codigoBarras);
        
        if (resultado) {
            this.exibirMensagem('Item removido do carrinho', 'info');
            this.atualizarCarrinho();
        }
    },
    
    /**
     * Limpa o carrinho
     */
    limparCarrinho: function() {
        db.limparCarrinho();
        this.atualizarCarrinho();
        this.exibirMensagem('Carrinho limpo', 'info');
    },
    
    /**
     * Atualiza a interface do carrinho
     */
    atualizarCarrinho: function() {
        const carrinho = db.getCarrinho();
        const carrinhoVazio = document.getElementById('carrinho-vazio');
        const carrinhoItens = document.getElementById('carrinho-itens');
        
        // Verificar se carrinho está vazio
        if (carrinho.length === 0) {
            if (carrinhoVazio) carrinhoVazio.style.display = 'block';
            if (carrinhoItens) carrinhoItens.innerHTML = '';
            
            // Desabilitar botão de finalizar
            const btnFinalizar = document.getElementById('btn-finalizar');
            if (btnFinalizar) btnFinalizar.disabled = true;
            
            // Limpar totais
            this.atualizarTotais(0, 0, 0);
            return;
        }
        
        // Ocultar mensagem de carrinho vazio
        if (carrinhoVazio) carrinhoVazio.style.display = 'none';
        
        // Atualizar lista de itens
        if (carrinhoItens) {
            carrinhoItens.innerHTML = '';
            
            carrinho.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'carrinho-item';
                
                itemEl.innerHTML = `
                    <div class="carrinho-img">
                        ${item.foto ? `<img src="${item.foto}" alt="${item.nome}">` : `<i class="fas fa-box" style="font-size: 1.5rem; color: var(--primary);"></i>`}
                    </div>
                    <div class="carrinho-info">
                        <div class="carrinho-nome">${item.nome}</div>
                        <div class="carrinho-detalhes">
                            <div>R$ ${item.preco.toFixed(2)} × 
                                <input type="number" class="qtd-input" data-codigo="${item.codigo_barras}" value="${item.quantidade}" min="1" max="99">
                            </div>
                            <div>R$ ${item.subtotal.toFixed(2)}</div>
                        </div>
                    </div>
                    <button class="btn-remove" data-codigo="${item.codigo_barras}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                carrinhoItens.appendChild(itemEl);
            });
            
            // Reconfigurar eventos após atualizar HTML
            this.aplicarEventos();
        }
        
        // Calcular totais
        const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
        const descontoInput = document.getElementById('desconto');
        const desconto = descontoInput ? (parseFloat(descontoInput.value) / 100) * subtotal : 0;
        const total = subtotal - desconto;
        
        // Atualizar totais
        this.atualizarTotais(subtotal, desconto, total);
        
        // Habilitar botão de finalizar
        const btnFinalizar = document.getElementById('btn-finalizar');
        if (btnFinalizar) btnFinalizar.disabled = total <= 0;
    },
    
    /**
     * Atualiza os valores de totais na interface
     * @param {number} subtotal Subtotal
     * @param {number} desconto Desconto
     * @param {number} total Total
     */
    atualizarTotais: function(subtotal, desconto, total) {
        const subtotalEl = document.getElementById('subtotal');
        const descontoEl = document.getElementById('valor-desconto');
        const totalEl = document.getElementById('total');
        
        if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
        if (descontoEl) descontoEl.textContent = `R$ ${desconto.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
    },
    
    /**
     * Aplica desconto ao carrinho
     * @param {number} percentual Percentual de desconto (0-100)
     */
    aplicarDesconto: function(percentual) {
        if (isNaN(percentual) || percentual < 0 || percentual > 100) {
            this.exibirMensagem('Desconto inválido', 'error');
            return;
        }
        
        const carrinho = db.getCarrinho();
        const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
        const desconto = (percentual / 100) * subtotal;
        const total = subtotal - desconto;
        
        this.atualizarTotais(subtotal, desconto, total);
        
        // Habilitar/desabilitar botão de finalizar
        const btnFinalizar = document.getElementById('btn-finalizar');
        if (btnFinalizar) btnFinalizar.disabled = total <= 0;
    },
    
    /**
     * Seleciona um cliente
     * @param {string} clienteId ID do cliente
     */
    selecionarCliente: function(clienteId) {
        const cliente = db.getCliente(clienteId);
        
        if (!cliente) {
            this.exibirMensagem('Cliente não encontrado', 'error');
            return false;
        }
        
        this.status.clienteAtual = clienteId;
        
        // Atualizar elemento de seleção de cliente
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect) clienteSelect.value = clienteId;
        
        return true;
    },
    
    /**
     * Finaliza a venda atual
     */
    finalizarVenda: function() {
        try {
            const carrinho = db.getCarrinho();
            
            if (carrinho.length === 0) {
                this.exibirMensagem('Não há itens no carrinho', 'error');
                return;
            }
            
            // Obter dados do formulário
            const clienteId = document.getElementById('cliente').value || this.status.clienteAtual;
            const formaPagamento = document.getElementById('forma-pagamento').value;
            const descontoInput = document.getElementById('desconto');
            const percentualDesconto = descontoInput ? parseFloat(descontoInput.value) || 0 : 0;
            const observacao = document.getElementById('observacao') ? document.getElementById('observacao').value : '';
            
            // Calcular totais
            const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
            const desconto = (percentualDesconto / 100) * subtotal;
            const total = subtotal - desconto;
            
            if (total <= 0) {
                this.exibirMensagem('O valor total da venda deve ser maior que zero', 'error');
                return;
            }
            
            // Obter texto descritivo da forma de pagamento
            const formaPagamentoSelect = document.getElementById('forma-pagamento');
            const formaPagamentoTexto = formaPagamentoSelect.options[formaPagamentoSelect.selectedIndex].text;
            
            // Dados da venda
            const venda = {
                cliente_id: clienteId,
                forma_pagamento: formaPagamentoTexto,
                forma_pagamento_id: formaPagamento,
                itens: carrinho,
                subtotal: subtotal,
                desconto: desconto,
                total: total,
                percentual_desconto: percentualDesconto,
                observacao: observacao,
                usuario: db.getUsuarioAtual()?.nome || 'Sistema'
            };
            
            // Registrar venda
            const resultado = db.registrarVenda(venda);
            
            // Exibir recibo
            this.exibirRecibo(resultado);
            
            this.exibirMensagem('Venda finalizada com sucesso!', 'success');
            return resultado;
        } catch (erro) {
            console.error('Erro ao finalizar venda:', erro);
            this.exibirMensagem('Erro ao finalizar venda: ' + erro.message, 'error');
            return null;
        }
    },
    
    /**
     * Exibe recibo de venda
     * @param {Object} venda Dados da venda
     */
    exibirRecibo: function(venda) {
        if (!venda) return;
        
        const modalRecibo = document.getElementById('modal-recibo');
        const reciboConteudo = document.getElementById('recibo-conteudo');
        
        if (!modalRecibo || !reciboConteudo) return;
        
        // Obter configurações da empresa
        const config = db.getConfig();
        
        // Formatar data
        const data = new Date(venda.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Gerar HTML dos itens
        let itensHTML = '';
        venda.itens.forEach((item, index) => {
            itensHTML += `
                <tr>
                    <td>${index + 1}. ${item.nome}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco.toFixed(2)}</td>
                    <td class="text-right">R$ ${item.subtotal.toFixed(2)}</td>
                </tr>
            `;
        });
        
        // Recibo HTML
        const reciboHTML = `
            <div style="font-family: monospace; line-height: 1.4; font-size: 12px;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; font-size: 16px;">${config.nome_empresa || 'ORION PDV'}</h3>
                    <p style="margin: 0;">${config.endereco || ''}</p>
                    <p style="margin: 0;">${config.cidade || ''}</p>
                    <p style="margin: 0;">CNPJ: ${config.cnpj || ''}</p>
                    <p style="margin: 0;">${config.telefone || ''}</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <p><strong>CUPOM NÃO FISCAL</strong></p>
                    <p><strong>Venda:</strong> ${venda.id}</p>
                    <p><strong>Data:</strong> ${dataFormatada} ${horaFormatada}</p>
                    <p><strong>Cliente:</strong> ${venda.cliente_nome || db.getCliente(venda.cliente_id)?.nome}</p>
                    <p><strong>Operador:</strong> ${venda.usuario}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr>
                            <th style="text-align: left; border-bottom: 1px dashed #ccc; padding: 3px 0;">Item</th>
                            <th style="text-align: left; border-bottom: 1px dashed #ccc; padding: 3px 0;">Qtd</th>
                            <th style="text-align: left; border-bottom: 1px dashed #ccc; padding: 3px 0;">Valor</th>
                            <th style="text-align: right; border-bottom: 1px dashed #ccc; padding: 3px 0;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensHTML}
                    </tbody>
                </table>
                
                <div style="text-align: right; border-top: 1px dashed #ccc; padding-top: 10px; margin-bottom: 15px;">
                    <p><strong>Subtotal:</strong> R$ ${venda.subtotal.toFixed(2)}</p>
                    <p><strong>Desconto:</strong> R$ ${venda.desconto.toFixed(2)}</p>
                    <p style="font-size: 14px;"><strong>TOTAL: R$ ${venda.total.toFixed(2)}</strong></p>
                </div>
                
                <div style="border-top: 1px dashed #ccc; padding-top: 10px; margin-bottom: 15px;">
                    <p><strong>Forma de pagamento:</strong> ${venda.forma_pagamento}</p>
                </div>
                
                <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 10px; margin-bottom: 15px;">
                    <p>ORION PDV - Sistema de Gestão de Vendas</p>
                    <p>${dataFormatada} ${horaFormatada}</p>
                    <p><strong>OBRIGADO PELA PREFERÊNCIA!</strong></p>
                    <p>Volte Sempre</p>
                </div>
            </div>
        `;
        
        // Preencher conteúdo
        reciboConteudo.innerHTML = reciboHTML;
        
        // Exibir modal
        modalRecibo.style.display = 'flex';
        setTimeout(() => {
            modalRecibo.classList.add('show');
        }, 10);
    },
    
    /**
     * Exibe mensagem de notificação
     * @param {string} mensagem Texto da mensagem
     * @param {string} tipo Tipo de mensagem (success, error, warning, info)
     * @param {number} duracao Duração em milissegundos
     */
    exibirMensagem: function(mensagem, tipo = 'info', duracao = 3000) {
        // Criar container se não existir
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.top = '1rem';
            container.style.right = '1rem';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        // Criar toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.style.backgroundColor = tipo === 'success' ? '#43A047' : 
                                     tipo === 'error' ? '#E53935' : 
                                     tipo === 'warning' ? '#FFB300' : '#2196F3';
        toast.style.color = 'white';
        toast.style.padding = '0.75rem 1rem';
        toast.style.borderRadius = '0.25rem';
        toast.style.marginBottom = '0.5rem';
        toast.style.boxShadow = '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s ease';
        
        // Ícone baseado no tipo
        let icone = 'info-circle';
        if (tipo === 'success') icone = 'check-circle';
        if (tipo === 'error') icone = 'exclamation-circle';
        if (tipo === 'warning') icone = 'exclamation-triangle';
        
        toast.innerHTML = `
            <i class="fas fa-${icone}" style="margin-right: 0.5rem;"></i>
            <span>${mensagem}</span>
        `;
        
        container.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);
        
        // Remover após duração
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, duracao);
    }
};
