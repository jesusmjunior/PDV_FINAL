// estoque.js
class Estoque {
  static async carregarTabela() {
    const estoque = await Database.carregar('estoque.json');
    const produtos = await Database.carregar('produtos.json');
    
    const tabela = document.getElementById('tabela-estoque');
    tabela.innerHTML = estoque.map(item => {
      const produto = produtos.find(p => p.codigo === item.codigo);
      return `
        <tr>
          <td>${item.codigo}</td>
          <td>${produto?.nome || 'Produto não cadastrado'}</td>
          <td>${item.quantidade}</td>
          <td>${new Date(item.atualizadoEm).toLocaleDateString()}</td>
          <td>
            <button onclick="Estoque.ajustar('${item.codigo}')" class="btn btn-sm btn-warning">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  static async aplicarAjuste() {
    const codigo = sessionStorage.getItem('codigoScanner');
    const quantidade = parseInt(document.getElementById('quantidade-ajuste').value);
    
    const estoque = await Database.carregar('estoque.json');
    const index = estoque.findIndex(item => item.codigo === codigo);
    
    if (index >= 0) {
      estoque[index].quantidade = quantidade;
      estoque[index].atualizadoEm = new Date().toISOString();
    }
    
    await Database.salvar('estoque.json', estoque);
    this.carregarTabela();
    BarcodeScanner.parar();
  }
}

// Inicialização
window.onload = () => {
  Estoque.carregarTabela();
  Auth.validarSessao();
};
