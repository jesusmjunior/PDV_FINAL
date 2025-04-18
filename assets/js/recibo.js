// assets/js/recibo.js
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se temos parâmetros na URL
  const urlParams = new URLSearchParams(window.location.search);
  const vendaId = urlParams.get('venda');
  
  // Se não tiver parâmetro de venda, redirecionar para a página inicial
  if (!vendaId) {
    window.location.href = 'index.html';
    return;
  }
  
  // Carregar dados da venda
  carregarVenda(vendaId);
  
  // Evento de impressão automática
  if (window.opener) {
    setTimeout(() => {
      window.print();
    }, 500);
  }
  
  // Botão de impressão
  const btnImprimir = document.querySelector('button[onclick="window.print();"]');
  if (btnImprimir) {
    btnImprimir.addEventListener('click', function() {
      window.print();
    });
  }
  
  // Botão de fechar
  const btnFechar = document.querySelector('button[onclick="window.close();"]');
  if (btnFechar) {
    btnFechar.addEventListener('click', function() {
      if (window.opener) {
        window.close();
      } else {
        window.history.back();
      }
    });
  }
  
  // Função para carregar dados da venda
  function carregarVenda(id) {
    try {
      // Inicializar banco de dados (caso não esteja inicializado)
      if (typeof db === 'undefined') {
        window.db = new OrionDatabase();
      }
      
      // Obter dados da venda
      const venda = db.getVenda(id);
      
      if (!venda) {
        console.error('Venda não encontrada: ' + id);
        document.body.innerHTML = `
          <div style="text-align: center; padding: 50px 20px;">
            <h1>Erro</h1>
            <p>Venda não encontrada.</p>
            <button onclick="window.close();">Fechar</button>
          </div>
        `;
        return;
      }
      
      // Obter dados da empresa
      const config = db.getConfig ? db.getConfig() : {
        nome_empresa: 'ORION PDV',
        endereco: '',
        cidade: '',
        cnpj: '',
        telefone: ''
      };
      
      // Formatar data
      const data = new Date(venda.data);
      const dataFormatada = data.toLocaleDateString('pt-BR');
      const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Criar linhas dos itens
      let linhasItens = '';
      venda.itens.forEach((item, index) => {
        linhasItens += `
          <tr>
            <td>${index + 1}. ${item.produto_nome}</td>
            <td>${item.quantidade}x</td>
            <td>R$ ${item.preco_unitario.toFixed(2)}</td>
            <td class="right">R$ ${item.subtotal.toFixed(2)}</td>
          </tr>
        `;
      });
      
      // Processar QR Code para PIX se aplicável
      let qrCodeHtml = '';
      if (venda.forma_pagamento === 'PIX' || venda.forma_pagamento === 'Pix') {
        // Gerar QR Code
        const config = db.getConfig ? db.getConfig() : { chave_pix: 'orionpdv@exemplo.com.br' };
        const chavePix = config.chave_pix || 'orionpdv@exemplo.com.br';
        
        qrCodeHtml = `
          <div style="text-align: center; margin: 10px 0;">
            <p>Escaneie o QR Code abaixo para pagar:</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('00020126580014BR.GOV.BCB.PIX0111' + chavePix + '52040000530398654040.005802BR5925ORION PDV6009SAO PAULO62070503***6304134E')}" alt="QR Code PIX" style="max-width: 150px; height: auto;">
            <p style="font-size: 10px; margin-top: 5px;">Chave PIX: ${chavePix}</p>
          </div>
        `;
      }
      
      // Substituir placeholders no HTML
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
        .replace(/{{ITEMS}}/g, linhasItens)
        .replace(/{{SUBTOTAL}}/g, `R$ ${venda.subtotal.toFixed(2)}`)
        .replace(/{{DESCONTO}}/g, `R$ ${venda.desconto.toFixed(2)}`)
        .replace(/{{TOTAL}}/g, `R$ ${venda.total.toFixed(2)}`)
        .replace(/{{FORMA_PAGAMENTO}}/g, venda.forma_pagamento)
        .replace(/{{VALOR_PAGO}}/g, `R$ ${venda.total.toFixed(2)}`)
        .replace(/{{TROCO}}/g, `R$ 0,00`)
        .replace(/{{DATA_HORA}}/g, `${dataFormatada} ${horaFormatada}`)
        .replace(/{{QR_CODE}}/g, qrCodeHtml);
      
    } catch (erro) {
      console.error('Erro ao carregar venda:', erro);
      document.body.innerHTML = `
        <div style="text-align: center; padding: 50px 20px;">
          <h1>Erro</h1>
          <p>Erro ao carregar dados da venda: ${erro}</p>
          <button onclick="window.close();">Fechar</button>
        </div>
      `;
    }
  }
});
