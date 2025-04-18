/**
 * ORION PDV - Integração do Scanner de Código de Barras com o Cadastro de Produtos
 * 
 * Este módulo integra o scanner de código de barras com a página de cadastro de produtos,
 * permitindo escanear ou gerar códigos de barras para novos produtos.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página de produtos
    const isProdutoPage = document.getElementById('btn-scanner-codigo') !== null;
    
    if (!isProdutoPage) return;
    
    // Elementos do DOM
    const btnScannerCodigo = document.getElementById('btn-scanner-codigo');
    const btnGerarCodigo = document.getElementById('btn-gerar-codigo');
    const codigoBarrasInput = document.getElementById('codigo-barras');
    const modalScanner = document.getElementById('modal-scanner');
    const btnCloseScanner = document.querySelectorAll('.btn-close-scanner');
    
    // Botão para abrir modal de scanner
    if (btnScannerCodigo) {
        btnScannerCodigo.addEventListener('click', function() {
            // Exibir modal
            modalScanner.style.display = 'flex';
            
            // Inicializar scanner
            barcodeScanner.inicializar('scanner-video', function(codigo) {
                // Preencher input com código lido
                codigoBarrasInput.value = codigo;
                
                // Fechar modal
                modalScanner.style.display = 'none';
                
                // Parar scanner
                barcodeScanner.parar();
            });
        });
    }
    
    // Botões para fechar modal
    if (btnCloseScanner && btnCloseScanner.length > 0) {
        btnCloseScanner.forEach(btn => {
            btn.addEventListener('click', function() {
                // Fechar modal
                modalScanner.style.display = 'none';
                
                // Parar scanner
                barcodeScanner.parar();
            });
        });
    }
    
    // Botão para gerar código de barras aleatório
    if (btnGerarCodigo) {
        btnGerarCodigo.addEventListener('click', function() {
            // Gerar código EAN-13 aleatório
            const codigo = barcodeScanner.gerarCodigoBarrasAleatorio();
            
            // Preencher input
            codigoBarrasInput.value = codigo;
        });
    }
    
    // Verificar se temos um código de barras na URL (para novos produtos)
    const urlParams = new URLSearchParams(window.location.search);
    const codigoParam = urlParams.get('codigo');
    
    if (codigoParam && codigoBarrasInput) {
        codigoBarrasInput.value = codigoParam;
    }
});
