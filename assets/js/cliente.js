/**
 * ORION PDV - Gerenciamento de Clientes
 * 
 * Este módulo implementa:
 * - Listagem de clientes
 * - Cadastro de novos clientes
 * - Edição de clientes existentes
 * - Busca e filtros
 * - Visualização de detalhes do cliente
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    if (!auth.verificarAutenticacao()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Elementos DOM
    const buscaClienteInput = document.getElementById('busca-cliente');
    const tabelaClientes = document.getElementById('tabela-clientes');
    const formCliente = document.getElementById('form-cliente');
    const cardFormulario = document.getElementById('card-formulario');
    const formTitulo = document.getElementById('form-titulo');
    const clienteIdInput = document.getElementById('cliente-id');
    const nomeInput = document.getElementById('nome');
    const documentoInput = document.getElementById('documento');
    const telefoneInput = document.getElementById('telefone');
    const emailInput = document.getElementById('email');
    const enderecoInput = document.getElementById('endereco');
    const cidadeInput = document.getElementById('cidade');
    const observacoesInput = document.getElementById('observacoes');
    const btnNovoCliente = document.getElementById('btn-novo-cliente');
    const btnCancelar = document.getElementById('btn-cancelar');
    
    // Modal
    const modalDetalhes = document.getElementById('modal-detalhes');
    const btnFecharModal = document.querySelectorAll('.btn-close-modal');
    const btnEditarDetalhe = document.getElementById('btn-editar-detalhe');
    
    // Dados do usuário
    const user = auth.getUsuarioAtual();
    document.getElementById('user-name').textContent = user.nome;
    
    // Data atual
    const dataAtual = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = dataAtual.toLocaleDateString('pt-BR', options);
    
    // Variáveis de controle
    let modoEdicao = false;
    let clienteAtual = null;
    
    // Carregar dados iniciais
    carregarClientes();
    
    // Event Listeners
    buscaClienteInput.addEventListener('input', carregarClientes);
    formCliente.addEventListener('submit', salvarCliente);
    btnNovoCliente.addEventListener('click', novoCliente);
    btnCancelar.addEventListener('click', cancelarFormulario);
    
    btnFecharModal.forEach(btn => {
        btn.addEventListener('click', function() {
            modalDetalhes.style.display = 'none';
        });
    });
    
    btnEditarDetalhe.addEventListener('click', function() {
        modalDetalhes.style.display = 'none';
        editarCliente(clienteAtual.id);
    });
    
    // Formatar CPF/CNPJ ao digitar
    documentoInput.addEventListener('input', function() {
        let valor = this.value.replace(/\D/g, '');
        
        if (valor.length <= 11) {
            // CPF
            valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
            valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
            valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // CNPJ
            valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
            valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
            valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
        }
        
        this.value = valor;
    });
    
    // Formatar telefone ao digitar
    telefoneInput.addEventListener('input', function() {
        let valor = this.value.replace(/\D/g, '');
        
        if (valor.length <= 10) {
            // Telefone fixo
            valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
            valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            // Celular
            valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
            valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
        }
        
        this.value = valor;
    });
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', function() {
        auth.fazerLogout();
        window.location.href = 'index.html';
    });
    
    // ========== FUNÇÕES ==========
    
    function carregarClientes() {
        const clientes = db.getClientes();
        const termoBusca = buscaClienteInput.value.toLowerCase();
        
        // Limpar tabela
        const tbody = tabelaClientes.querySelector('tbody');
        tbody.innerHTML = '';
        
        // Filtrar clientes
        let clientesFiltrados = [...clientes];
        
        if (termoBusca) {
            clientesFiltrados = clientesFiltrados.filter(cliente => 
                cliente.nome.toLowerCase().includes(termoBusca) || 
                (cliente.documento && cliente.documento.toLowerCase().includes(termoBusca)) ||
                (cliente.telefone && cliente.telefone.toLowerCase().includes(termoBusca))
            );
        }
        
        // Ordenar por nome
        clientesFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adicionar à tabela
        clientesFiltrados.forEach(cliente => {
            // Não exibir cliente "Consumidor Final" na lista
            if (cliente.id === "1" && cliente.nome === "Consumidor Final") {
                return;
            }
            
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cliente.documento || '-'}</td>
                <td>${cliente.telefone || '-'}</td>
                <td>${cliente.cidade || '-'}</td>
                <td>
                    <button class="btn btn-outline-info btn-sm btn-detalhes" data-id="${cliente.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-primary btn-sm btn-editar" data-id="${cliente.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm btn-excluir" data-id="${cliente.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        // Adicionar eventos aos botões
        document.querySelectorAll('.btn-detalhes').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                abrirDetalhesCliente(id);
            });
        });
        
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editarCliente(id);
            });
        });
        
        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                excluirCliente(id);
            });
        });
    }
    
    function novoCliente() {
        // Limpar formulário
        formCliente.reset();
        clienteIdInput.value = '';
        
        // Configurar modo
        modoEdicao = false;
        formTitulo.textContent = 'Novo Cliente';
    }
    
    function editarCliente(id) {
        const cliente = db.getCliente(id);
        
        if (cliente) {
            // Preencher formulário
            clienteIdInput.value = cliente.id;
            nomeInput.value = cliente.nome;
            documentoInput.value = cliente.documento || '';
            telefoneInput.value = cliente.telefone || '';
            emailInput.value = cliente.email || '';
            enderecoInput.value = cliente.endereco || '';
            cidadeInput.value = cliente.cidade || '';
            observacoesInput.value = cliente.observacoes || '';
            
            // Configurar modo
            modoEdicao = true;
            formTitulo.textContent = 'Editar Cliente';
            
            // Scroll até o formulário em dispositivos móveis
            if (window.innerWidth < 768) {
                cardFormulario.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
    
    function excluirCliente(id) {
        const cliente = db.getCliente(id);
        
        // Não permitir excluir o cliente "Consumidor Final"
        if (cliente.id === "1" && cliente.nome === "Consumidor Final") {
            exibirMensagem('Não é possível excluir o cliente padrão', 'warning');
            return;
        }
        
        // Verificar se o cliente possui vendas
        const vendas = db.getVendas();
        const clienteTemVendas = vendas.some(venda => venda.cliente_id === id);
        
        if (clienteTemVendas) {
            exibirMensagem('Não é possível excluir cliente com vendas registradas', 'error');
            return;
        }
        
        if (cliente) {
            const confirmar = confirm(`Deseja realmente excluir o cliente "${cliente.nome}"?`);
            
            if (confirmar) {
                try {
                    db.deletarCliente(id);
                    carregarClientes();
                    exibirMensagem('Cliente excluído com sucesso', 'success');
                } catch (erro) {
                    exibirMensagem('Erro ao excluir cliente: ' + erro, 'error');
                }
            }
        }
    }
    
    function salvarCliente(e) {
        e.preventDefault();
        
        // Verificar nome
        if (!nomeInput.value.trim()) {
            exibirMensagem('O nome do cliente é obrigatório', 'error');
            return;
        }
        
        // Obter dados do formulário
        const cliente = {
            id: clienteIdInput.value,
            nome: nomeInput.value.trim(),
            documento: documentoInput.value.trim() || '',
            telefone: telefoneInput.value.trim() || '',
            email: emailInput.value.trim() || '',
            endereco: enderecoInput.value.trim() || '',
            cidade: cidadeInput.value.trim() || '',
            observacoes: observacoesInput.value.trim() || ''
        };
        
        // Adicionar data de cadastro se for novo cliente
        if (!cliente.id) {
            cliente.data_cadastro = new Date().toISOString();
        }
        
        try {
            // Salvar cliente
            db.salvarCliente(cliente);
            
            // Atualizar tabela
            carregarClientes();
            
            // Limpar formulário
            formCliente.reset();
            clienteIdInput.value = '';
            
            // Resetar modo
            modoEdicao = false;
            formTitulo.textContent = 'Novo Cliente';
            
            // Mensagem de sucesso
            exibirMensagem('Cliente salvo com sucesso', 'success');
        } catch (erro) {
            exibirMensagem('Erro ao salvar cliente: ' + erro, 'error');
        }
    }
    
    function cancelarFormulario() {
        // Limpar formulário
        formCliente.reset();
        clienteIdInput.value = '';
        
        // Resetar modo
        modoEdicao = false;
        formTitulo.textContent = 'Novo Cliente';
    }
    
    function abrirDetalhesCliente(id) {
        const cliente = db.getCliente(id);
        
        if (cliente) {
            clienteAtual = cliente;
            
            // Preencher dados do cliente
            document.getElementById('detalhe-nome').textContent = cliente.nome;
            document.getElementById('detalhe-documento').textContent = cliente.documento || '-';
            document.getElementById('detalhe-telefone').textContent = cliente.telefone || '-';
            document.getElementById('detalhe-email').textContent = cliente.email || '-';
            document.getElementById('detalhe-endereco').textContent = cliente.endereco || '-';
            document.getElementById('detalhe-cidade').textContent = cliente.cidade || '-';
            document.getElementById('detalhe-observacoes').textContent = cliente.observacoes || '-';
            
            // Formatar data
            const data = cliente.data_cadastro ? new Date(cliente.data_cadastro) : null;
            document.getElementById('detalhe-data').textContent = data ? data.toLocaleDateString('pt-BR') : '-';
            
            // Buscar últimas compras
            const vendas = db.getVendas();
            const comprasCliente = vendas.filter(venda => venda.cliente_id === cliente.id);
            
            // Ordenar por data (mais recentes primeiro)
            comprasCliente.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            // Limitar a 5 últimas compras
            const ultimasCompras = comprasCliente.slice(0, 5);
            
            const divCompras = document.getElementById('ultimas-compras');
            
            if (ultimasCompras.length > 0) {
                // Criar tabela de compras
                let html = `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>ID</th>
                                <th>Pagamento</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                ultimasCompras.forEach(venda => {
                    const data = new Date(venda.data);
                    const dataFormatada = data.toLocaleDateString('pt-BR');
                    
                    html += `
                        <tr>
                            <td>${dataFormatada}</td>
                            <td>${venda.id}</td>
                            <td>${venda.forma_pagamento}</td>
                            <td>R$ ${venda.total.toFixed(2)}</td>
                        </tr>
                    `;
                });
                
                html += `
                        </tbody>
                    </table>
                `;
                
                divCompras.innerHTML = html;
            } else {
                divCompras.innerHTML = '<p class="text-center text-muted">Nenhuma compra encontrada</p>';
            }
            
            // Exibir modal
            modalDetalhes.style.display = 'flex';
        }
    }
    
    function exibirMensagem(mensagem, tipo) {
        // Criar toast
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${tipo}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'warning' ? 'exclamation-circle' : 'times-circle'}"></i>
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
});
