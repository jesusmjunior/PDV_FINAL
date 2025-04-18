/**
 * ORION PDV - Integração do Scanner de Código de Barras
 * 
 * Este módulo integra o scanner de código de barras com as páginas de estoque
 * e permite escanear produtos para adicionar ao estoque ou procurar na base.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página de estoque
    const isEstoquePage = document.getElementById('tab-scanner') !== null;
    
    if (!isEstoquePage) return;
    
    // Elementos do DOM
    const btnEscanear = document.getElementById('btn-escanear');
    const btnCancelarScan = document.getElementById('btn-cancelar-scan');
    const cameraContainer = document.getElementById('camera-container');
    const codigoBarrasInput = document.getElementById('codigo-barras');
    const btnBuscarCodigo = document.getElementById('btn-buscar-codigo');
    const resultadoScanner = document.getElementById('resultado-scanner');
    
    // Botão para iniciar scanner
    if (btnEscanear) {
        btnEscanear.addEventListener('click', function() {
            // Exibir container da câmera
            cameraContainer.style.display = 'block';
            
            // Inicializar scanner
            barcodeScanner.inicializar('scanner-video', function(codigo) {
                // Preencher input com código lido
                codigoBarrasInput.value = codigo;
                
                // Ocultar container da câmera
                cameraContainer.style.display = 'none';
                
                // Buscar produto automaticamente
                buscarProdutoPorCodigo(codigo);
            });
        });
    }
    
    // Botão para cancelar scanner
    if (btnCancelarScan) {
        btnCancelarScan.addEventListener('click', function() {
            // Parar scanner
            barcodeScanner.parar();
            
            // Ocultar container da câmera
            cameraContainer.style.display = 'none';
        });
    }
    
    // Botão para buscar código manualmente
    if (btnBuscarCodigo) {
        btnBuscarCodigo.addEventListener('click', function() {
            const codigo = codigoBarrasInput.value.trim();
            
            if (codigo) {
                buscarProdutoPorCodigo(codigo);
            } else {
                // Exibir mensagem de erro ou placeholder
                resultadoScanner.innerHTML = `
                    <div class="alert" style="background-color: rgba(229, 57, 53, 0.1); border: 1px solid rgba(229, 57, 53, 0.3); color: var(--danger); border-radius: var(--border-radius); padding: 1rem;">
                        <i class="fas fa-exclamation-circle"></i> Por favor, digite um código de barras válido.
