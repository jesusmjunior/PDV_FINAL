/**
 * ORION PDV - Gerador de Recibos
 * 
 * Este módulo implementa:
 * - Geração de recibos de vendas
 * - Substituição de variáveis no template
 * - Preparação para impressão
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se há um ID de venda na URL
    const urlParams = new URLSearchParams(window.location.search);
    const vendaId = urlParams.get('venda');
    
    if (!vendaId) {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2>Erro ao gerar recibo</h2>
                <p>ID da venda não informado.</p>
                <button onclick="window.close();" style="padding: 10px 20px; background-color: #555; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Fechar
                </button>
            </div>
        `;
        return;
    }
    
    // Carregar venda e gerar recibo
    try {
        const venda = db.getVenda(vendaId);
        
        if (!venda) {
            document.body.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2>Erro ao gerar recibo</h2>
                    <p>Venda não encontrada.</p>
                    <button onclick="window.close();" style="padding: 10px 20px; background-color: #555; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Fechar
                    </button>
                </div>
            `;
            return;
        }
        
        // Obter configurações da empresa
        const config = db.getConfig();
        
        // Gerar HTML dos itens
        let itensHTML = '';
        venda.itens.forEach((item, index) => {
            itensHTML += `
                <tr>
                    <td>${index + 1}. ${item.nome}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco.toFixed(2)}</td>
                    <td class="right">R$ ${item.subtotal.toFixed(2)}</td>
                </tr>
            `;
        });
        
        // Formatar data
        const data = new Date(venda.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR');
        
        // Valor recebido e troco (fictícios para o recibo)
        // Numa implementação real, esses valores seriam armazenados na venda
        const valorPago = venda.total;
        const troco = 0;
        
        // Código QR (fictício para o recibo)
        // Numa implementação real, poderia ser um código QR com informações da venda ou link para site da empresa
        const qrCode = '[QR Code]';
        
        // Substituir variáveis no HTML
        document.body.innerHTML = document.body.innerHTML
            .replace(/{{NOME_EMPRESA}}/g, config.nome_empresa || 'ORION PDV')
            .replace(/{{ENDERECO}}/g, config.endereco || '')
            .replace(/{{CIDADE}}/g, config.cidade || '')
            .replace(/{{CNPJ}}/g, config.cnpj || '')
            .replace(/{{TEL}}/g, config.telefone || '')
            .replace(/{{ID_VENDA}}/g, venda.id)
            .replace(/{{DATA_VENDA}}/g, `${dataFormatada} ${horaFormatada}`)
            .replace(/{{CLIENTE}}/g, venda.cliente_nome)
            .replace(/{{OPERADOR}}/g, venda.usuario)
            .replace(/{{ITEMS}}/g, itensHTML)
            .replace(/{{SUBTOTAL}}/g, `R$ ${venda.subtotal.toFixed(2)}`)
            .replace(/{{DESCONTO}}/g, `R$ ${venda.desconto.toFixed(2)}`)
            .replace(/{{TOTAL}}/g, `R$ ${venda.total.toFixed(2)}`)
            .replace(/{{FORMA_PAGAMENTO}}/g, venda.forma_pagamento)
            .replace(/{{VALOR_PAGO}}/g, `R$ ${valorPago.toFixed(2)}`)
            .replace(/{{TROCO}}/g, `R$ ${troco.toFixed(2)}`)
            .replace(/{{DATA_HORA}}/g, `${dataFormatada} ${horaFormatada}`)
            .replace(/{{QR_CODE}}/g, qrCode);
        
    } catch (erro) {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2>Erro ao gerar recibo</h2>
                <p>${erro.message}</p>
                <button onclick="window.close();" style="padding: 10px 20px; background-color: #555; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Fechar
                </button>
            </div>
        `;
    }
});
