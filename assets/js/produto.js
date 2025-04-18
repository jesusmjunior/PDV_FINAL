// produto.js (Atualizado)
class Produto {
  static async salvar(e) {
    e.preventDefault();
    
    const produto = {
      id: document.getElementById('produto-id').value || Date.now(),
      codigo: document.getElementById('codigo-barras').value,
      nome: document.getElementById('nome').value,
      preco: parseFloat(document.getElementById('preco').value),
      grupo: document.getElementById('grupo').value,
      estoque: parseInt(document.getElementById('estoque').value)
    };

    // Salva em produtos.json
    const produtos = await Database.carregar('produtos.json');
    const index = produtos.findIndex(p => p.id === produto.id);
    
    if(index >= 0) {
      produtos[index] = produto;
    } else {
      produtos.push(produto);
    }

    await Database.salvar('produtos.json', produtos);
    
    // Atualiza estoque.json
    const estoque = await Database.carregar('estoque.json');
    const itemEstoque = estoque.find(item => item.codigo === produto.codigo);
    
    if(!itemEstoque) {
      estoque.push({
        codigo: produto.codigo,
        quantidade: produto.estoque,
        atualizadoEm: new Date().toISOString()
      });
      await Database.salvar('estoque.json', estoque);
    }

    this.carregarTabela();
    this.limparFormulario();
  }

  static async carregarTabela() {
    const produtos = await Database.carregar('produtos.json');
    const tabela = document.getElementById('tabela-produtos');
    
    tabela.innerHTML = produtos.map(produto => `
      <tr>
        <td>${produto.codigo}</td>
        <td>${produto.nome}</td>
        <td>${produto.grupo}</td>
        <td>R$ ${produto.preco.toFixed(2)}</td>
        <td>${produto.estoque}</td>
        <td>
          <button onclick="Produto.editar('${produto.id}')" class="btn btn-sm btn-warning">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="Produto.excluir('${produto.id}')" class="btn btn-sm btn-danger">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }
}

// Inicialização
window.onload = () => {
  Produto.carregarTabela();
  Produto.carregarGrupos(); // Carrega grupos de produtos.json
};
