// core.js - Versão 2.0
class OrionCore {
    static init() {
        this.configurarScanner();
        this.iniciarMonitoramentoEstoque();
    }

    static configurarScanner() {
        document.querySelectorAll('[data-scanner]').forEach(element => {
            element.addEventListener('click', () => this.ativarScanner(element.dataset.scanner));
        });
    }

    static ativarScanner(contexto) {
        const scannerUI = {
            video: document.getElementById('scanner-video'),
            status: document.getElementById('scanner-status'),
            resultado: document.getElementById('scanner-resultado')
        };

        BarcodeScanner.iniciar(scannerUI, {
            onSucesso: (codigo) => this.processarCodigo(codigo, contexto),
            onErro: (erro) => this.mostrarErroScanner(erro)
        });
    }

    static async processarCodigo(codigo, contexto) {
        // Feedback sonoro
        this.executarSom('scan');
        
        // Busca inteligente
        const produto = db.buscarProdutoPorCodigo(codigo) || 
                       db.buscarProdutoFuzzy(codigo)[0];

        if (produto) {
            switch(contexto) {
                case 'venda':
                    this.adicionarAoCarrinho(produto);
                    break;
                case 'cadastro':
                    this.preencherFormularioProduto(produto);
                    break;
                case 'estoque':
                    this.exibirDetalhesEstoque(produto);
                    break;
            }
        }
    }

    static executarSom(tipo) {
        const sons = {
            scan: 'assets/sounds/scan.mp3',
            erro: 'assets/sounds/error.mp3'
        };
        new Audio(sons[tipo]).play();
    }

    static iniciarMonitoramentoEstoque() {
        setInterval(() => {
            const produtos = db.getProdutos();
            const alertas = Object.values(produtos).filter(p => p.estoque < p.estoque_minimo);
            this.notificarAlertasEstoque(alertas);
        }, 300000); // Verificar a cada 5 minutos
    }
}
