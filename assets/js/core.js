/**
 * ORION PDV - Core JavaScript
 * 
 * Este arquivo contém:
 * - Funções utilitárias comuns a múltiplas páginas
 * - Funcionalidades avançadas compartilhadas
 * - Extensões para funções nativas
 */

document.addEventListener('DOMContentLoaded', function() {
    /**
     * Inicializa tooltips em elementos com o atributo data-tooltip
     */
    function inicializarTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', function() {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = this.getAttribute('data-tooltip');
                document.body.appendChild(tooltip);
                
                // Posicionar tooltip
                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
                
                // Exibir tooltip
                setTimeout(() => {
                    tooltip.style.opacity = '1';
                }, 10);
                
                // Salvar referência para remover
                this._tooltip = tooltip;
            });
            
            el.addEventListener('mouseleave', function() {
                if (this._tooltip) {
                    this._tooltip.style.opacity = '0';
                    setTimeout(() => {
                        document.body.removeChild(this._tooltip);
                        this._tooltip = null;
                    }, 200);
                }
            });
        });
    }
    
    /**
     * Formata um número como moeda brasileira
     * @param {number} valor Valor a ser formatado
     * @returns {string} Valor formatado como R$ X,XX
     */
    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    /**
     * Formata uma data para o padrão brasileiro
     * @param {Date|string} data Data a ser formatada
     * @returns {string} Data formatada como DD/MM/YYYY
     */
    function formatarData(data) {
        if (typeof data === 'string') {
            data = new Date(data);
        }
        
        return data.toLocaleDateString('pt-BR');
    }
    
    /**
     * Formata uma data e hora para o padrão brasileiro
     * @param {Date|string} data Data a ser formatada
     * @returns {string} Data e hora formatadas como DD/MM/YYYY HH:MM
     */
    function formatarDataHora(data) {
        if (typeof data === 'string') {
            data = new Date(data);
        }
        
        return data.toLocaleDateString('pt-BR') + ' ' + 
            data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Gera um código aleatório com o prefixo especificado
     * @param {string} prefixo Prefixo do código
     * @param {number} tamanho Tamanho do código (sem o prefixo)
     * @returns {string} Código gerado
     */
    function gerarCodigo(prefixo, tamanho = 6) {
        let codigo = '';
        const caracteres = '0123456789';
        
        for (let i = 0; i < tamanho; i++) {
            codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        
        return (prefixo || '') + codigo;
    }
    
    /**
     * Cria um toast de notificação
     * @param {string} mensagem Mensagem a ser exibida
     * @param {string} tipo Tipo de mensagem (success, error, warning, info)
     * @param {number} duracao Duração em milissegundos
     */
    function criarToast(mensagem, tipo = 'info', duracao = 3000) {
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
        
        // Remover após a duração especificada
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duracao);
    }
    
    /**
     * Cria um elemento de confirmação modal
     * @param {Object} options Opções de configuração
     * @param {string} options.titulo Título do modal
     * @param {string} options.mensagem Mensagem do modal
     * @param {string} options.btnConfirmarTexto Texto do botão de confirmação
     * @param {string} options.btnCancelarTexto Texto do botão de cancelamento
     * @param {Function} options.onConfirm Callback quando confirmado
     * @param {Function} options.onCancel Callback quando cancelado
     */
    function confirmar({ titulo, mensagem, btnConfirmarTexto = 'Confirmar', btnCancelarTexto = 'Cancelar', onConfirm, onCancel } = {}) {
        // Criar elemento do modal
        const modalEl = document.createElement('div');
        modalEl.className = 'modal';
        modalEl.style.display = 'flex';
        modalEl.style.position = 'fixed';
        modalEl.style.top = '0';
        modalEl.style.left = '0';
        modalEl.style.width = '100%';
        modalEl.style.height = '100%';
        modalEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalEl.style.justifyContent = 'center';
        modalEl.style.alignItems = 'center';
        modalEl.style.zIndex = '1000';
        
        // Conteúdo do modal
        modalEl.innerHTML = `
            <div class="modal-content" style="background-color: var(--dark-surface); width: 400px; border-radius: var(--border-radius); box-shadow: var(--box-shadow);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>${titulo || 'Confirmação'}</h3>
                    <button type="button" class="btn-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
                </div>
                <div class="card-body">
                    <p>${mensagem || 'Tem certeza que deseja prosseguir?'}</p>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
                        <button type="button" class="btn-cancel btn btn-outline-primary">
                            ${btnCancelarTexto}
                        </button>
                        <button type="button" class="btn-confirm btn btn-primary">
                            ${btnConfirmarTexto}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(modalEl);
        
        // Manipuladores de eventos
        const closeBtn = modalEl.querySelector('.btn-close');
        const cancelBtn = modalEl.querySelector('.btn-cancel');
        const confirmBtn = modalEl.querySelector('.btn-confirm');
        
        // Função para fechar o modal
        const fecharModal = () => {
            modalEl.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(modalEl);
            }, 300);
        };
        
        // Eventos
        closeBtn.addEventListener('click', () => {
            fecharModal();
            if (typeof onCancel === 'function') onCancel();
        });
        
        cancelBtn.addEventListener('click', () => {
            fecharModal();
            if (typeof onCancel === 'function') onCancel();
        });
        
        confirmBtn.addEventListener('click', () => {
            fecharModal();
            if (typeof onConfirm === 'function') onConfirm();
        });
        
        // Fechar quando clicar fora do modal
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) {
                fecharModal();
                if (typeof onCancel === 'function') onCancel();
            }
        });
        
        // Animar entrada
        setTimeout(() => {
            modalEl.style.opacity = '1';
        }, 10);
    }
    
    /**
     * Valida um CPF
     * @param {string} cpf CPF a ser validado
     * @returns {boolean} Verdadeiro se o CPF for válido
     */
    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }
        
        let soma = 0;
        let resto;
        
        for (let i = 1; i <= 9; i++) {
            soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
        }
        
        resto = (soma * 10) % 11;
        
        if (resto === 10 || resto === 11) {
            resto = 0;
        }
        
        if (resto !== parseInt(cpf.substring(9, 10))) {
            return false;
        }
        
        soma = 0;
        
        for (let i = 1; i <= 10; i++) {
            soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
        }
        
        resto = (soma * 10) % 11;
        
        if (resto === 10 || resto === 11) {
            resto = 0;
        }
        
        if (resto !== parseInt(cpf.substring(10, 11))) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Valida um CNPJ
     * @param {string} cnpj CNPJ a ser validado
     * @returns {boolean} Verdadeiro se o CNPJ for válido
     */
    function validarCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        
        if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
            return false;
        }
        
        // Validação do primeiro dígito
        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0, tamanho);
        const digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        
        if (resultado != digitos.charAt(0)) {
            return false;
        }
        
        // Validação do segundo dígito
        tamanho = tamanho + 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        
        if (resultado != digitos.charAt(1)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Aplica máscara de formatação a um texto
     * @param {string} texto Texto a ser formatado
     * @param {string} mascara Máscara de formatação (ex: '###.###.###-##' para CPF)
     * @returns {string} Texto formatado
     */
    function aplicarMascara(texto, mascara) {
        let resultado = '';
        let indiceTexto = 0;
        
        for (let i = 0; i < mascara.length; i++) {
            if (indiceTexto >= texto.length) {
                break;
            }
            
            if (mascara[i] === '#') {
                resultado += texto[indiceTexto];
                indiceTexto++;
            } else {
                resultado += mascara[i];
            }
        }
        
        return resultado;
    }
    
    /**
     * Formata um CPF
     * @param {string} cpf CPF a ser formatado
     * @returns {string} CPF formatado (###.###.###-##)
     */
    function formatarCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        return aplicarMascara(cpf, '###.###.###-##');
    }
    
    /**
     * Formata um CNPJ
     * @param {string} cnpj CNPJ a ser formatado
     * @returns {string} CNPJ formatado (##.###.###/####-##)
     */
    function formatarCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        return aplicarMascara(cnpj, '##.###.###/####-##');
    }
    
    /**
     * Formata um CEP
     * @param {string} cep CEP a ser formatado
     * @returns {string} CEP formatado (#####-###)
     */
    function formatarCEP(cep) {
        cep = cep.replace(/[^\d]/g, '');
        return aplicarMascara(cep, '#####-###');
    }
    
    /**
     * Debounce para evitar múltiplas chamadas de função
     * @param {Function} fn Função a ser executada
     * @param {number} delay Tempo de espera em milissegundos
     * @returns {Function} Função com debounce
     */
    function debounce(fn, delay) {
        let timeout;
        
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    
    /**
     * Throttle para limitar a frequência de chamadas de função
     * @param {Function} fn Função a ser executada
     * @param {number} limit Tempo mínimo entre chamadas em milissegundos
     * @returns {Function} Função com throttle
     */
    function throttle(fn, limit) {
        let inThrottle;
        
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Faz uma requisição AJAX
     * @param {Object} options Opções da requisição
     * @returns {Promise} Promise com o resultado da requisição
     */
    function ajax({ url, method = 'GET', data = null, headers = {} }) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open(method, url, true);
            
            // Configurar cabeçalhos
            xhr.setRequestHeader('Content-Type', 'application/json');
            for (const [key, value] of Object.entries(headers)) {
                xhr.setRequestHeader(key, value);
            }
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const responseData = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                        resolve(responseData);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        response: xhr.responseText
                    });
                }
            };
            
            xhr.onerror = function() {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                    response: xhr.responseText
                });
            };
            
            if (data) {
                xhr.send(typeof data === 'object' ? JSON.stringify(data) : data);
            } else {
                xhr.send();
            }
        });
    }
    
    /**
     * Inicializa campos de data com DatePicker
     */
    function inicializarDatePickers() {
        document.querySelectorAll('.datepicker').forEach(el => {
            if (typeof flatpickr === 'function') {
                flatpickr(el, {
                    dateFormat: 'd/m/Y',
                    locale: 'pt',
                    altInput: true,
                    altFormat: 'd/m/Y',
                    allowInput: true
                });
            }
        });
    }
    
    /**
     * Inicializa campos de moeda com formatação automática
     */
    function inicializarCamposMoeda() {
        document.querySelectorAll('.campo-moeda').forEach(el => {
            el.addEventListener('input', function(e) {
                // Obter apenas os dígitos
                let valor = e.target.value.replace(/\D/g, '');
                
                // Converter para número
                valor = (parseFloat(valor) / 100).toFixed(2);
                
                // Formatar como moeda brasileira
                e.target.value = formatarMoeda(parseFloat(valor));
            });
        });
    }
    
    /**
     * Inicializa todos os componentes necessários
     */
    function inicializarComponentes() {
        inicializarTooltips();
        inicializarDatePickers();
        inicializarCamposMoeda();
    }
    
    // Exportar funções para uso global
    window.OrionPDV = {
        formatarMoeda,
        formatarData,
        formatarDataHora,
        gerarCodigo,
        criarToast,
        confirmar,
        validarCPF,
        validarCNPJ,
        formatarCPF,
        formatarCNPJ,
        formatarCEP,
        debounce,
        throttle,
        ajax,
        inicializarComponentes
    };
    
    // Inicializar automaticamente os componentes
    inicializarComponentes();
});
