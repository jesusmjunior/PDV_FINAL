class Estoque {
    static scannerState = {
        currentCode: null,
        isAdjusting: false
    };

    static async init() {
        await this.carregarTabela();
        this.initScannerHandlers();
    }

    static initScannerHandlers() {
        document.getElementById('btn-scanner-estoque').addEventListener('click', () => this.abrirScanner());
        document.querySelectorAll('.btn-close-scanner').forEach(btn => {
            btn.addEventListener('click', () => this.fecharScanner());
        });
    }

    static async abrirScanner() {
        try {
            this.showScannerUI(true);
            await barcodeScanner.inicializar('scanner-video', codigo => {
                this.handleCodigoScaneado(codigo);
            });
        } catch (error) {
            this.handleScannerError(error);
        }
    }

    static handleCodigoScaneado(codigo) {
        if (!barcodeScanner.verificarCodigoEAN13(codigo)) {
            throw new Error('Código inválido para ajuste de estoque');
        }
        
        this.scannerState.currentCode = codigo;
        this.showAdjustmentInterface();
        this.showStatus(`Produto ${codigo} detectado`, 'success');
    }

    static showAdjustmentInterface() {
        document.getElementById('adjustment-interface').style.display = 'block';
        document.getElementById('quantidade-ajuste').focus();
    }

    static async confirmarAjuste() {
        const quantidade = parseInt(document.getElementById('quantidade-ajuste').value);
        
        if (isNaN(quantidade) || quantidade < 0) {
            this.showStatus('Quantidade inválida', 'error');
            return;
        }

        try {
            await this.atualizarEstoque(this.scannerState.currentCode, quantidade);
            this.showStatus('Estoque atualizado com sucesso!', 'success');
            setTimeout(() => this.fecharScanner(), 1500);
        } catch (error) {
            this.handleDatabaseError(error);
        }
    }

    static async atualizarEstoque(codigo, quantidade) {
        const estoque = await Database.carregar('estoque.json');
        const index = estoque.findIndex(item => item.codigo === codigo);
        
        if (index === -1) {
            throw new Error('Produto não encontrado no estoque');
        }

        estoque[index] = {
            ...estoque[index],
            quantidade: quantidade,
            atualizadoEm: new Date().toISOString(),
            responsavel: Auth.getUsuarioAtual().id
        };

        await Database.salvar('estoque.json', estoque);
        await this.carregarTabela();
    }

    static fecharScanner() {
        barcodeScanner.parar();
        this.showScannerUI(false);
        this.resetScannerState();
    }

    static resetScannerState() {
        this.scannerState.currentCode = null;
        document.getElementById('quantidade-ajuste').value = '';
        document.getElementById('adjustment-interface').style.display = 'none';
    }

    static handleScannerError(error) {
        console.error('Erro no Scanner:', error);
        this.showStatus(error.message, 'error');
        setTimeout(() => this.fecharScanner(), 3000);
    }

    static showScannerUI(visible) {
        document.getElementById('modal-scanner').style.display = visible ? 'block' : 'none';
        document.getElementById('scanner-status').style.display = visible ? 'flex' : 'none';
    }

    static showStatus(message, type = 'info') {
        const statusElement = document.getElementById('scanner-status');
        statusElement.className = `scanner-status ${type}`;
        statusElement.querySelector('.status-text').textContent = message;
    }

    // ... (outros métodos mantidos com melhorias)
}

// Inicialização
window.onload = () => {
    Estoque.init();
    Auth.validarSessao();
};
