/**
 * Núcleo do sistema com integração de scanner e gestão de eventos
 */

class OrionCore {
    static init() {
        this.configurarScannerGlobal();
        this.iniciarMonitoramento();
    }

    static configurarScannerGlobal() {
        document.querySelectorAll('[data-scanner]').forEach(btn => {
            btn.addEventListener('click', () => this.ativarScanner(btn.dataset.contexto));
        });
    }

    static ativarScanner(contexto) {
        const scannerUI = this.criarInterfaceScanner();
        
        BarcodeScanner.iniciar({
            elementoVideo: scannerUI.video,
            onSucesso: (codigo) => this.processarCodigo(codigo, contexto),
            onErro: (erro) => this.mostrarErro(erro)
        });
    }

    static processarCodigo(codigo, contexto) {
        this.executarFeedbackSonoro();
        
        const produto = db.buscarProdutoPorCodigo(codigo);
        
        switch(contexto) {
            case 'venda':
                this.atualizarEstoque(produto, -1);
                Carrinho.adicionarItem(produto);
                break;
                
            case 'cadastro':
                this.preencherFormulario(produto);
                break;
        }
    }

    static atualizarEstoque(produto, quantidade) {
        produto.estoque += quantidade;
        db.salvarProduto(produto);
        AtualizadorUI.atualizarCardEstoque(produto);
    }
}

// Inicialização do sistema
document.addEventListener('DOMContentLoaded', () => OrionCore.init());
