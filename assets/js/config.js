// assets/js/config.js
document.addEventListener('DOMContentLoaded', function() {
  // Verificar autenticação
  if (!auth.verificarAutenticacao()) {
    window.location.href = 'index.html';
    return;
  }
  
  // Elementos DOM
  const formConfig = document.getElementById('form-config');
  const nomeEmpresaInput = document.getElementById('nome-empresa');
  const sloganInput = document.getElementById('slogan');
  const cnpjInput = document.getElementById('cnpj');
  const telefoneInput = document.getElementById('telefone');
  const emailInput = document.getElementById('email');
  const enderecoInput = document.getElementById('endereco');
  const cidadeInput = document.getElementById('cidade');
  const logoUrlInput = document.getElementById('logo-url');
  const chavePixInput = document.getElementById('chave-pix');
  const temaSelect = document.getElementById('tema');
  const corPrimariaInput = document.getElementById('cor-primaria');
  const corSecundariaInput = document.getElementById('cor-secundaria');
  const previewCorPrimaria = document.getElementById('preview-cor-primaria');
  const previewCorSecundaria = document.getElementById('preview-cor-secundaria');
  const btnSalvar = document.getElementById('btn-salvar');
  const btnResetarConfig = document.getElementById('btn-resetar-config');
  const previewLogo = document.getElementById('preview-logo');
  
  // Tabs de configuração
  const tabGeral = document.getElementById('tab-geral');
  const tabAparencia = document.getElementById('tab-aparencia');
  const tabBackup = document.getElementById('tab-backup');
  const tabSobre = document.getElementById('tab-sobre');
  
  const contentGeral = document.getElementById('content-geral');
  const contentAparencia = document.getElementById('content-aparencia');
  const contentBackup = document.getElementById('content-backup');
  const contentSobre = document.getElementById('content-sobre');
  
  // Elementos de backup
  const btnExportarDados = document.getElementById('btn-exportar-dados');
  const btnImportarDados = document.getElementById('btn-importar-dados');
  const inputImportarDados = document.getElementById('input-importar-dados');
  
  // Dados do usuário
  const user = auth.getUsuarioAtual();
  document.getElementById('user-name').textContent = user.nome;
  
  // Data atual
  const dataAtual = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-date').textContent = dataAtual.toLocaleDateString('pt-BR', options);
  
  // Carregar configurações
  carregarConfiguracoes();
  
  // Verificar versão do sistema
  verificarVersao();
  
  // Event Listeners
  
  // Tabs
  tabGeral.addEventListener('click', function(e) {
    e.preventDefault();
    ativarAba('geral');
  });
  
  tabAparencia.addEventListener('click', function(e) {
    e.preventDefault();
    ativarAba('aparencia');
  });
  
  tabBackup.addEventListener('click', function(e) {
    e.preventDefault();
    ativarAba('backup');
  });
  
  tabSobre.addEventListener('click', function(e) {
    e.preventDefault();
    ativarAba('sobre');
  });
  
  // Formulário de configurações
  formConfig.addEventListener('submit', function(e) {
    e.preventDefault();
    salvarConfiguracoes();
  });
  
  // Preview de cores
  if (corPrimariaInput && previewCorPrimaria) {
    corPrimariaInput.addEventListener('input', function() {
      previewCorPrimaria.style.backgroundColor = this.value;
    });
  }
  
  if (corSecundariaInput && previewCorSecundaria) {
    corSecundariaInput.addEventListener('input', function() {
      previewCorSecundaria.style.backgroundColor = this.value;
    });
  }
  
  // Preview de logo
  if (logoUrlInput && previewLogo) {
    logoUrlInput.addEventListener('input', function() {
      previewLogo.src = this.value || 'assets/img/logo.png';
    });
    
    // Erro de carregamento da imagem
    previewLogo.addEventListener('error', function() {
      this.src = 'assets/img/logo.png';
    });
  }
  
  // Formatação de CNPJ
  if (cnpjInput) {
    cnpjInput.addEventListener('input', function() {
      formatarCNPJ(this);
    });
  }
  
  // Formatação de telefone
  if (telefoneInput) {
    telefoneInput.addEventListener('input', function() {
      formatarTelefone(this);
    });
  }
  
  // Botão de resetar configurações
  if (btnResetarConfig) {
    btnResetarConfig.addEventListener('click', function() {
      if (confirm('Tem certeza que deseja resetar todas as configurações? Esta ação não pode ser desfeita.')) {
        resetarConfiguracoes();
      }
    });
  }
  
  // Backup e restauração
  if (btnExportarDados) {
    btnExportarDados.addEventListener('click', exportarDados);
  }
  
  if (btnImportarDados && inputImportarDados) {
    btnImportarDados.addEventListener('click', function() {
      inputImportarDados.click();
    });
    
    inputImportarDados.addEventListener('change', importarDados);
  }
  
  // Logout
  document.getElementById('btn-logout').addEventListener('click', function() {
    auth.fazerLogout();
    window.location.href = 'index.html';
  });
  
  // Funções
  
  function ativarAba(aba) {
    // Desativar todas as abas
    tabGeral.classList.remove('active');
    tabGeral.style.color = 'var(--text-muted)';
    tabGeral.style.borderBottom = '2px solid transparent';
    
    tabAparencia.classList.remove('active');
    tabAparencia.style.color = 'var(--text-muted)';
    tabAparencia.style.borderBottom = '2px solid transparent';
    
    tabBackup.classList.remove('active');
    tabBackup.style.color = 'var(--text-muted)';
    tabBackup.style.borderBottom = '2px solid transparent';
    
    tabSobre.classList.remove('active');
    tabSobre.style.color = 'var(--text-muted)';
    tabSobre.style.borderBottom = '2px solid transparent';
    
    // Ocultar todos os conteúdos
    contentGeral.style.display = 'none';
    contentAparencia.style.display = 'none';
    contentBackup.style.display = 'none';
    contentSobre.style.display = 'none';
    
    // Ativar aba selecionada
    if (aba === 'geral') {
      tabGeral.classList.add('active');
      tabGeral.style.color = 'var(--text-light)';
      tabGeral.style.borderBottom = '2px solid var(--primary)';
      contentGeral.style.display = 'block';
    } else if (aba === 'aparencia') {
      tabAparencia.classList.add('active');
      tabAparencia.style.color = 'var(--text-light)';
      tabAparencia.style.borderBottom = '2px solid var(--primary)';
      contentAparencia.style.display = 'block';
    } else if (aba === 'backup') {
      tabBackup.classList.add('active');
      tabBackup.style.color = 'var(--text-light)';
      tabBackup.style.borderBottom = '2px solid var(--primary)';
      contentBackup.style.display = 'block';
    } else if (aba === 'sobre') {
      tabSobre.classList.add('active');
      tabSobre.style.color = 'var(--text-light)';
      tabSobre.style.borderBottom = '2px solid var(--primary)';
      contentSobre.style.display = 'block';
    }
  }
  
  function carregarConfiguracoes() {
    // Obter configurações
    const config = db.getConfig ? db.getConfig() : {};
    
    // Preencher formulário
    if (nomeEmpresaInput) nomeEmpresaInput.value = config.nome_empresa || 'ORION PDV';
    if (sloganInput) sloganInput.value = config.slogan || 'Gestão Inteligente de Vendas';
    if (cnpjInput) cnpjInput.value = config.cnpj || '';
    if (telefoneInput) telefoneInput.value = config.telefone || '';
    if (emailInput) emailInput.value = config.email || '';
    if (enderecoInput) enderecoInput.value = config.endereco || '';
    if (cidadeInput) cidadeInput.value = config.cidade || '';
    if (logoUrlInput) logoUrlInput.value = config.logo_url || 'assets/img/logo.png';
    if (chavePixInput) chavePixInput.value = config.chave_pix || '';
    if (temaSelect) temaSelect.value = config.tema || 'dark';
    if (corPrimariaInput) corPrimariaInput.value = config.cor_primaria || '#0B3D91';
    if (corSecundariaInput) corSecundariaInput.value = config.cor_secundaria || '#1E88E5';
    
    // Atualizar previews
    if (previewCorPrimaria) previewCorPrimaria.style.backgroundColor = config.cor_primaria || '#0B3D91';
    if (previewCorSecundaria) previewCorSecundaria.style.backgroundColor = config.cor_secundaria || '#1E88E5';
    if (previewLogo) previewLogo.src = config.logo_url || 'assets/img/logo.png';
    
    // Aplicar tema
    if (config.tema) {
      document.body.className = '';
      document.body.classList.add('theme-' + config.tema);
    }
  }
  
  function salvarConfiguracoes() {
    // Criar objeto de configuração
    const config = {
      nome_empresa: nomeEmpresaInput ? nomeEmpresaInput.value : 'ORION PDV',
      slogan: sloganInput ? sloganInput.value : 'Gestão Inteligente de Vendas',
      cnpj: cnpjInput ? cnpjInput.value : '',
      telefone: telefoneInput ? telefoneInput.value : '',
      email: emailInput ? emailInput.value : '',
      endereco: enderecoInput ? enderecoInput.value : '',
      cidade: cidadeInput ? cidadeInput.value : '',
      logo_url: logoUrlInput ? logoUrlInput.value : 'assets/img/logo.png',
      chave_pix: chavePixInput ? chavePixInput.value : '',
      tema: temaSelect ? temaSelect.value : 'dark',
      cor_primaria: corPrimariaInput ? corPrimariaInput.value : '#0B3D91',
      cor_secundaria: corSecundariaInput ? corSecundariaInput.value : '#1E88E5'
    };
    
    // Salvar no banco de dados
    try {
      db.salvarConfig(config);
      
      // Aplicar tema
      document.body.className = '';
      document.body.classList.add('theme-' + config.tema);
      
      // Exibir mensagem de sucesso
      exibirMensagem('Configurações salvas com sucesso!', 'success');
    } catch (erro) {
      console.error('Erro ao salvar configurações:', erro);
      exibirMensagem('Erro ao salvar configurações', 'error');
    }
  }
  
  function resetarConfiguracoes() {
    try {
      // Configurações padrão
      const configPadrao = {
        nome_empresa: 'ORION PDV',
        slogan: 'Gestão Inteligente de Vendas',
        cnpj: '',
        telefone: '',
        email: '',
        endereco: '',
        cidade: '',
        logo_url: 'assets/img/logo.png',
        chave_pix: '',
        tema: 'dark',
        cor_primaria: '#0B3D91',
        cor_secundaria: '#1E88E5'
      };
      
      // Salvar no banco de dados
      db.salvarConfig(configPadrao);
      
      // Recarregar formulário
      carregarConfiguracoes();
      
      // Exibir mensagem de sucesso
      exibirMensagem('Configurações resetadas com sucesso!', 'success');
    } catch (erro) {
      console.error('Erro ao resetar configurações:', erro);
      exibirMensagem('Erro ao resetar configurações', 'error');
    }
  }
  
  function verificarVersao() {
    const versaoAtual = db.VERSION || '1.0.0';
    const versaoElement = document.getElementById('versao-sistema');
    
    if (versaoElement) {
      versaoElement.textContent = versaoAtual;
    }
  }
  
  function exportarDados() {
    try {
      // Exportar dados
      const dados = db.exportarDados ? db.exportarDados() : '{}';
      
      // Criar blob
      const blob = new Blob([dados], { type: 'application/json' });
      
      // Criar URL
      const url = URL.createObjectURL(blob);
      
      // Criar link de download
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_orion_pdv_${new Date().toISOString().split('T')[0]}.json`;
      a.style.display = 'none';
      
      // Adicionar ao DOM
      document.body.appendChild(a);
      
      // Simular clique
      a.click();
      
      // Limpar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Exibir mensagem de sucesso
      exibirMensagem('Backup exportado com sucesso!', 'success');
    } catch (erro) {
      console.error('Erro ao exportar dados:', erro);
      exibirMensagem('Erro ao exportar dados', 'error');
    }
  }
  
  function importarDados(e) {
    const file = e.target.files[0];
    
    if (!file) {
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
      try {
        const dados = event.target.result;
        
        // Confirmar importação
        if (confirm('Tem certeza que deseja importar estes dados? Todos os dados atuais serão substituídos.')) {
          // Importar dados
          const resultado = db.importarDados ? db.importarDados(dados) : false;
          
          if (resultado) {
            // Exibir mensagem de sucesso
            exibirMensagem('Dados importados com sucesso! O sistema será reiniciado.', 'success');
            
            // Recarregar página após 2 segundos
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            exibirMensagem('Erro ao importar dados: formato inválido', 'error');
          }
        }
      } catch (erro) {
        console.error('Erro ao importar dados:', erro);
        exibirMensagem('Erro ao importar dados: ' + erro.message, 'error');
      }
    };
    
    reader.onerror = function() {
      exibirMensagem('Erro ao ler o arquivo.', 'error');
    };
    
    reader.readAsText(file);
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  }
  
  function formatarCNPJ(input) {
    let cnpj = input.value.replace(/\D/g, '');
    
    if (cnpj.length > 14) {
      cnpj = cnpj.substring(0, 14);
    }
    
    // Aplicar formatação
    if (cnpj.length > 12) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else if (cnpj.length > 8) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    } else if (cnpj.length > 5) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (cnpj.length > 2) {
      cnpj = cnpj.replace(/(\d{2})(\d{0,3})/, '$1.$2');
    }
    
    input.value = cnpj;
  }
  
  function formatarTelefone(input) {
    let telefone = input.value.replace(/\D/g, '');
    
    if (telefone.length > 11) {
      telefone = telefone.substring(0, 11);
    }
    
    // Aplicar formatação
    if (telefone.length > 10) {
      // Celular com 9 dígitos (XX) XXXXX-XXXX
      telefone = telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (telefone.length > 6) {
      // Telefone fixo (XX) XXXX-XXXX
      telefone = telefone.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
    } else if (telefone.length > 2) {
      // DDD
      telefone = telefone.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    
    input.value = telefone;
  }
  
  function exibirMensagem(mensagem, tipo) {
    // Criar toast
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${tipo}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'warning' ? 'exclamation-circle' : tipo === 'info' ? 'info-circle' : 'times-circle'}"></i>
        <span>${mensagem}</span>
      </div>
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(toast);
    
    // Exibir com animação
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
  
  // Inicializar primeira aba
  ativarAba('geral');
});
