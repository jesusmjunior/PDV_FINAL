// assets/js/db-fix.js
/**
 * Este arquivo resolve os conflitos entre database.js e db-manager.js
 * Ele atua como uma camada de compatibilidade para garantir que ambas 
 * as implementações (localStorage e IndexedDB) funcionem corretamente.
 */

// Verificar se o banco de dados já foi inicializado
if (typeof db === 'undefined') {
  // Determinar qual implementação de banco de dados usar
  const useIndexedDB = false; // Altere para true para usar IndexedDB em vez de localStorage
  
  // Criar instância do banco de dados
  window.db = new OrionDatabase(useIndexedDB ? 'indexedDB' : 'localStorage');

  // Adicionar funcionalidades auxiliares para exportação de dados em CSV
  window.db.exportarCSV = function(dados, nomeArquivo) {
    // Verificar se dados é um array
    if (!Array.isArray(dados) || dados.length === 0) {
      console.error('Dados inválidos para exportação CSV');
      return false;
    }
    
    try {
      // Obter cabeçalhos a partir das chaves do primeiro objeto
      const headers = Object.keys(dados[0]);
      
      // Iniciar conteúdo CSV com cabeçalhos
      let csvContent = headers.join(',') + '\n';
      
      // Adicionar linhas de dados
      for (const row of dados) {
        const values = headers.map(header => {
          // Obter valor e garantir que é uma string
          const cell = row[header] === undefined || row[header] === null ? '' : row[header];
          const cellStr = String(cell);
          
          // Escapar aspas duplas e campos que contêm vírgulas ou quebras de linha
          if (cellStr.includes('"') || cellStr.includes(',') || cellStr.includes('\n')) {
            return '"' + cellStr.replace(/"/g, '""') + '"';
          }
          return cellStr;
        });
        
        csvContent += values.join(',') + '\n';
      }
      
      // Criar blob e link para download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', nomeArquivo || 'exportacao.csv');
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (erro) {
      console.error('Erro ao exportar para CSV:', erro);
      return false;
    }
  };
  
  // Adicionar método para salvar movimentações de estoque se não existir
  if (typeof window.db.salvarMovimentacaoEstoque !== 'function') {
    window.db.salvarMovimentacaoEstoque = function(movimentacao) {
      const movimentacoes = this.getMovimentacoesEstoque();
      
      if (!movimentacao.id) {
        movimentacao.id = this.generateId();
      }
      
      if (!movimentacao.data) {
        movimentacao.data = new Date().toISOString();
      }
      
      movimentacoes.push(movimentacao);
      localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(movimentacoes));
      
      return movimentacao;
    };
  }
  
  // Adicionar método para obter movimentações de estoque se não existir
  if (typeof window.db.getMovimentacoesEstoque !== 'function') {
    window.db.getMovimentacoesEstoque = function() {
      return JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]');
    };
  }
  
  // Adicionar método exportarDados se não existir
  if (typeof window.db.exportarDados !== 'function') {
    window.db.exportarDados = function() {
      try {
        const dados = {
          versao: this.VERSION,
          data: new Date().toISOString(),
          dados: {
            usuarios: this.getUsuarios ? this.getUsuarios() : JSON.parse(localStorage.getItem('orion_usuarios') || '{}'),
            produtos: this.getProdutos ? this.getProdutos() : JSON.parse(localStorage.getItem('orion_produtos') || '{}'),
            clientes: this.getClientes ? this.getClientes() : JSON.parse(localStorage.getItem('orion_clientes') || '[]'),
            vendas: this.getVendas ? this.getVendas() : JSON.parse(localStorage.getItem('orion_vendas') || '[]'),
            movimentacoes_estoque: this.getMovimentacoesEstoque ? this.getMovimentacoesEstoque() : JSON.parse(localStorage.getItem('orion_movimentacoes_estoque') || '[]'),
            grupos: this.getGrupos ? this.getGrupos() : JSON.parse(localStorage.getItem('orion_grupos') || '[]'),
            marcas: this.getMarcas ? this.getMarcas() : JSON.parse(localStorage.getItem('orion_marcas') || '[]'),
            formas_pagamento: this.getFormasPagamento ? this.getFormasPagamento() : JSON.parse(localStorage.getItem('orion_formas_pagamento') || '[]'),
            config: this.getConfig ? this.getConfig() : JSON.parse(localStorage.getItem('orion_config') || '{}')
          }
        };
        
        return JSON.stringify(dados, null, 2);
      } catch (erro) {
        console.error('Erro ao exportar dados:', erro);
        return null;
      }
    };
  }
  
  // Adicionar método importarDados se não existir
  if (typeof window.db.importarDados !== 'function') {
    window.db.importarDados = function(dadosJson) {
      try {
        const dados = JSON.parse(dadosJson);
        
        // Verificar formato
        if (!dados.versao || !dados.dados) {
          console.error('Formato de dados inválido');
          return false;
        }
        
        // Importar dados
        if (dados.dados.usuarios) localStorage.setItem('orion_usuarios', JSON.stringify(dados.dados.usuarios));
        if (dados.dados.produtos) localStorage.setItem('orion_produtos', JSON.stringify(dados.dados.produtos));
        if (dados.dados.clientes) localStorage.setItem('orion_clientes', JSON.stringify(dados.dados.clientes));
        if (dados.dados.vendas) localStorage.setItem('orion_vendas', JSON.stringify(dados.dados.vendas));
        if (dados.dados.movimentacoes_estoque) localStorage.setItem('orion_movimentacoes_estoque', JSON.stringify(dados.dados.movimentacoes_estoque));
        if (dados.dados.grupos) localStorage.setItem('orion_grupos', JSON.stringify(dados.dados.grupos));
        if (dados.dados.marcas) localStorage.setItem('orion_marcas', JSON.stringify(dados.dados.marcas));
        if (dados.dados.formas_pagamento) localStorage.setItem('orion_formas_pagamento', JSON.stringify(dados.dados.formas_pagamento));
        if (dados.dados.config) localStorage.setItem('orion_config', JSON.stringify(dados.dados.config));
        
        // Atualizar versão
        localStorage.setItem('orion_version', this.VERSION);
        
        return true;
      } catch (erro) {
        console.error('Erro ao importar dados:', erro);
        return false;
      }
    };
  }
  
  // Verificar se o método getConfig existe e implementar se necessário
  if (typeof window.db.getConfig !== 'function') {
    window.db.getConfig = function() {
      return JSON.parse(localStorage.getItem('orion_config') || '{}');
    };
  }
  
  // Verificar se o método salvarConfig existe e implementar se necessário
  if (typeof window.db.salvarConfig !== 'function') {
    window.db.salvarConfig = function(config) {
      localStorage.setItem('orion_config', JSON.stringify(config));
      return config;
    };
  }
  
  // Adicionar método para gerar relatórios de vendas se não existir
  if (typeof window.db.gerarRelatorioVendas !== 'function') {
    window.db.gerarRelatorioVendas = function(filtros = {}) {
      // Obter todas as vendas
      const vendas = this.getVendas();
      
      // Aplicar filtros
      let vendasFiltradas = vendas;
      
      // Filtrar por data
      if (filtros.dataInicio && filtros.dataFim) {
        const dataInicio = new Date(filtros.dataInicio);
        dataInicio.setHours(0, 0, 0, 0);
        
        const dataFim = new Date(filtros.dataFim);
        dataFim.setHours(23, 59, 59, 999);
        
        vendasFiltradas = vendasFiltradas.filter(venda => {
          const dataVenda = new Date(venda.data);
          return dataVenda >= dataInicio && dataVenda <= dataFim;
        });
      }
      
      // Filtrar por cliente
      if (filtros.clienteId) {
        vendasFiltradas = vendasFiltradas.filter(venda => venda.cliente_id === filtros.clienteId);
      }
      
      // Filtrar por forma de pagamento
      if (filtros.formaPagamento) {
        vendasFiltradas = vendasFiltradas.filter(venda => venda.forma_pagamento === filtros.formaPagamento);
      }
      
      // Calcular totais
      const totalVendas = vendasFiltradas.length;
      const valorTotal = vendasFiltradas.reduce((acc, venda) => acc + venda.total, 0);
      const valorDesconto = vendasFiltradas.reduce((acc, venda) => acc + venda.desconto, 0);
      const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
      
      // Agrupar por forma de pagamento
      const vendasPorFormaPagamento = {};
      vendasFiltradas.forEach(venda => {
        if (!vendasPorFormaPagamento[venda.forma_pagamento]) {
          vendasPorFormaPagamento[venda.forma_pagamento] = {
            quantidade: 0,
            valor: 0
          };
        }
        
        vendasPorFormaPagamento[venda.forma_pagamento].quantidade += 1;
        vendasPorFormaPagamento[venda.forma_pagamento].valor += venda.total;
      });
      
      // Agrupar por data
      const vendasPorData = {};
      vendasFiltradas.forEach(venda => {
        // Extrair data (sem hora)
        const dataVenda = venda.data.split('T')[0];
        
        if (!vendasPorData[dataVenda]) {
          vendasPorData[dataVenda] = 0;
        }
        
        vendasPorData[dataVenda] += venda.total;
      });
      
      // Retornar relatório
      return {
        periodo: {
          inicio: filtros.dataInicio || null,
          fim: filtros.dataFim || null
        },
        totais: {
          vendas: totalVendas,
          valor: valorTotal,
          desconto: valorDesconto,
          ticketMedio: ticketMedio
        },
        formasPagamento: vendasPorFormaPagamento,
        vendasPorData: vendasPorData,
        vendas: vendasFiltradas
      };
    };
  }
  
  console.log("Camada de compatibilidade do banco de dados inicializada com sucesso!");
}
