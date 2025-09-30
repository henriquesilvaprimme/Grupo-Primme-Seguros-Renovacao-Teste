import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Lead from './components/Lead'; // Certifique-se de que este componente existe
import { RefreshCcw, Bell, Send, Edit, Save, User, Calendar, Tag, Trash2, ArrowUpCircle } from 'lucide-react';

// ===============================================
// 1. CONFIGURAÇÃO PARA A ABA 'Renovações'
// ===============================================
const SHEET_NAME = 'Renovações';

// URL base do seu Google Apps Script
const GOOGLE_SHEETS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

// URLs com o parâmetro 'sheet' adicionado para apontar para a nova aba
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?sheet=${SHEET_NAME}`;
const ALTERAR_ATRIBUIDO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?v=alterar_atribuido&sheet=${SHEET_NAME}`;
const SALVAR_OBSERVACAO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?action=salvarObservacao&sheet=${SHEET_NAME}`;

// ===============================================
// 2. COMPONENTE RENOMEADO PARA 'Renovacoes' (COMPACTO E MODERNO)
// ===============================================
const Renovacoes = ({ leads, usuarios, onUpdateStatus, transferirLead, usuarioLogado, fetchLeadsFromSheet, scrollContainerRef }) => {
  // Estados do componente
  const [selecionados, setSelecionados] = useState({});
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [observacoes, setObservacoes] = useState({});
  const [isEditingObservacao, setIsEditingObservacao] = useState({});
  const [dataInput, setDataInput] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [nomeInput, setNomeInput] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [hasScheduledToday, setHasScheduledToday] = useState(false);
  
  // Constantes de layout
  const leadsPorPagina = 10;
  const isAdmin = usuarioLogado?.tipo === 'Admin';
  const usuariosAtivos = useMemo(() => usuarios.filter((u) => u.status === 'Ativo'), [usuarios]);

  // Funções Auxiliares
  const normalizarTexto = useCallback((texto = '') => {
    return texto
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()@\+\?><\[\]\+]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const formatarData = (dataStr) => {
    if (!dataStr) return '';
    let data;
    if (dataStr.includes('/')) {
        const partes = dataStr.split('/');
        data = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    } else if (dataStr.includes('-') && dataStr.length === 10) {
        const partes = dataStr.split('-');
        data = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    } else {
        data = new Date(dataStr);
    }

    if (isNaN(data.getTime())) {
        return '';
    }
    return data.toLocaleDateString('pt-BR');
  };
  
  // Efeitos e Inicialização
  useEffect(() => {
    // Inicializa o filtro de data para o mês/ano atual
    const today = new Date();
    const ano = today.getFullYear();
    const mes = String(today.getMonth() + 1).padStart(2, '0');
    const mesAnoAtual = `${ano}-${mes}`;
    setDataInput(mesAnoAtual);
    setFiltroData(mesAnoAtual);

    // Inicializa observações e estado de edição
    const initialObservacoes = {};
    const initialIsEditingObservacao = {};
    leads.forEach(lead => {
      initialObservacoes[lead.id] = lead.observacao || '';
      initialIsEditingObservacao[lead.id] = !lead.observacao || lead.observacao.trim() === '';
    });
    setObservacoes(initialObservacoes);
    setIsEditingObservacao(initialIsEditingObservacao);
  }, [leads]);

  useEffect(() => {
    // Verifica agendamentos para o sino de notificação
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('pt-BR');

    const todayAppointments = leads.filter(lead => {
      if (!lead.status.startsWith('Agendado')) return false;
      const statusDateStr = lead.status.split(' - ')[1];
      if (!statusDateStr) return false;

      const [dia, mes, ano] = statusDateStr.split('/');
      const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
      const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');

      return statusDateFormatted === todayFormatted;
    });

    setHasScheduledToday(todayAppointments.length > 0);
  }, [leads]);
  
  // Handlers de Filtro
  const aplicarFiltroData = () => {
    setFiltroData(dataInput);
    setFiltroNome('');
    setNomeInput('');
    setFiltroStatus(null);
    setPaginaAtual(1);
  };

  const aplicarFiltroNome = () => {
    const filtroLimpo = nomeInput.trim();
    setFiltroNome(filtroLimpo);
    setFiltroData('');
    setDataInput('');
    setFiltroStatus(null);
    setPaginaAtual(1);
  };
  
  const aplicarFiltroStatus = (status) => {
    setFiltroStatus(status);
    setFiltroNome('');
    setNomeInput('');
    setFiltroData('');
    setDataInput('');
    setPaginaAtual(1);
  };
  
  const limparFiltros = () => {
    setFiltroStatus(null);
    setFiltroNome('');
    setNomeInput('');
    setFiltroData('');
    setDataInput('');
    setPaginaAtual(1);
  };

  // Lógica de Filtro dos Leads
  const leadsFiltrados = useMemo(() => {
    const nomeContemFiltro = (leadNome, filtro) => {
      if (!filtro) return true;
      if (!leadNome) return false;
      const nomeNormalizado = normalizarTexto(leadNome);
      const filtroNormalizado = normalizarTexto(filtro);
      return nomeNormalizado.includes(filtroNormalizado);
    };

    return leads.filter((lead) => {
      if (lead.status === 'Fechado' || lead.status === 'Perdido') return false;

      if (filtroStatus) {
        if (filtroStatus === 'Agendado') {
          const today = new Date();
          const todayFormatted = today.toLocaleDateString('pt-BR');
          const statusDateStr = lead.status.split(' - ')[1];
          if (!statusDateStr) return false;
          const [dia, mes, ano] = statusDateStr.split('/');
          const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
          const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');
          return lead.status.startsWith('Agendado') && statusDateFormatted === todayFormatted;
        }
        return lead.status === filtroStatus;
      }

      if (filtroData) {
        const leadMesAno = lead.createdAt ? lead.createdAt.substring(0, 7) : '';
        return leadMesAno === filtroData;
      }

      if (filtroNome) {
        return nomeContemFiltro(lead.name, filtroNome);
      }

      return true;
    });
  }, [leads, filtroStatus, filtroData, filtroNome, normalizarTexto]);
  
  // Lógica de Paginação
  const totalPaginas = Math.max(1, Math.ceil(leadsFiltrados.length / leadsPorPagina));
  const paginaCorrigida = Math.min(paginaAtual, totalPaginas);

  const inicio = (paginaCorrigida - 1) * leadsPorPagina;
  const fim = inicio + leadsPorPagina;
  const leadsPagina = leadsFiltrados.slice(inicio, fim);

  // Funções de Ação
  const scrollToTop = () => {
    if (scrollContainerRef && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handlePaginaAnterior = () => {
    setPaginaAtual((prev) => Math.max(prev - 1, 1));
    scrollToTop();
  };

  const handlePaginaProxima = () => {
    setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas));
    scrollToTop();
  };

  const enviarLeadAtualizado = async (lead) => {
    try {
      await fetch(ALTERAR_ATRIBUIDO_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(lead),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      fetchLeadsFromSheet(SHEET_NAME);
    } catch (error) {
      console.error('Erro ao enviar lead:', error);
    }
  };

  const handleRefreshLeads = async () => {
    setIsLoading(true);
    try {
      await fetchLeadsFromSheet(SHEET_NAME);
      // Re-inicializa os estados de observação após a atualização
      const refreshedObservacoes = {};
      const refreshedIsEditingObservacao = {};
      leads.forEach(lead => {
        refreshedObservacoes[lead.id] = lead.observacao || '';
        refreshedIsEditingObservacao[lead.id] = !lead.observacao || lead.observacao.trim() === '';
      });
      setObservacoes(refreshedObservacoes);
      setIsEditingObservacao(refreshedIsEditingObservacao);

    } catch (error) {
      console.error('Erro ao buscar leads atualizados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelect = (leadId, userId) => {
    setSelecionados((prev) => ({
      ...prev,
      [leadId]: Number(userId),
    }));
  };

  const handleEnviar = (leadId) => {
    const userId = selecionados[leadId];
    if (!userId) {
      alert('Selecione um usuário antes de transferir.');
      return;
    }
    transferirLead(leadId, userId);
    const lead = leads.find((l) => l.id === leadId);
    const leadAtualizado = { ...lead, usuarioId: userId };
    enviarLeadAtualizado(leadAtualizado);
  };

  const handleAlterar = (leadId) => {
    setSelecionados((prev) => ({
      ...prev,
      [leadId]: '',
    }));
    transferirLead(leadId, null);
  };

  const handleObservacaoChange = (leadId, text) => {
    setObservacoes((prev) => ({
      ...prev,
      [leadId]: text,
    }));
  };

  const handleSalvarObservacao = async (leadId) => {
    const observacaoTexto = observacoes[leadId] || '';
    if (!observacaoTexto.trim()) {
      alert('Por favor, digite uma observação antes de salvar.');
      return;
    }

    setIsLoading(true);
    try {
      await fetch(SALVAR_OBSERVACAO_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          leadId: leadId,
          observacao: observacaoTexto,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
      fetchLeadsFromSheet(SHEET_NAME);
    } catch (error) {
      console.error('Erro ao salvar observação:', error);
      alert('Erro ao salvar observação. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlterarObservacao = (leadId) => {
    setIsEditingObservacao(prev => ({ ...prev, [leadId]: true }));
  };

  const handleConfirmStatus = (leadId, novoStatus, phone) => {
    onUpdateStatus(leadId, novoStatus, phone);
    const currentLead = leads.find(l => l.id === leadId);
    const hasNoObservacao = !currentLead?.observacao || currentLead.observacao.trim() === '';

    // Condição para forçar a edição se o status exigir observação e não houver
    if ((novoStatus === 'Em Contato' || novoStatus === 'Sem Contato' || novoStatus.startsWith('Agendado')) && hasNoObservacao) {
        setIsEditingObservacao(prev => ({ ...prev, [leadId]: true }));
    } else {
        setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
    }
    // Não chame fetchLeadsFromSheet aqui se onUpdateStatus já faz isso
  };

  // --- Estilos Modernos (Variáveis para o CSS inline) ---
  const style = {
    container: {
      padding: '25px',
      position: 'relative',
      minHeight: 'calc(100vh - 100px)',
      backgroundColor: '#f8f9fa',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '15px',
    },
    titleGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    refreshButton: {
      background: 'none',
      border: 'none',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      padding: '0',
      color: '#007bff',
      display: 'flex',
      alignItems: 'center',
      transition: 'color 0.2s',
    },
    filterGroup: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    inputFilter: {
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #ced4da',
      width: '200px',
      transition: 'border-color 0.2s',
    },
    filterButton: {
      padding: '8px 15px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'background-color 0.2s',
    },
    statusFilterBar: {
      display: 'flex',
      justifyContent: 'flex-start',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      padding: '10px 0',
      borderBottom: '1px solid #e9ecef',
    },
    statusButton: {
      padding: '8px 16px',
      borderRadius: '20px', // Mais arredondado
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'transform 0.1s, box-shadow 0.1s',
      whiteSpace: 'nowrap',
      fontSize: '14px',
    },
    cardContainer: {
      border: '1px solid #e9ecef',
      borderRadius: '10px',
      backgroundColor: 'white',
      padding: '15px',
      marginBottom: '15px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      display: 'grid',
      // Layout moderno e compacto
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
      gap: '20px',
      position: 'relative',
    },
    cardSection: {
        minWidth: '250px',
    },
    cardInfo: {
        marginBottom: '5px',
        fontSize: '14px',
        color: '#495057',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    observacaoBlock: {
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#f1f8ff',
        border: '1px solid #cfe2ff',
    },
    transferBlock: {
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px dashed #e9ecef',
    }
  };


  return (
    <div style={style.container}>
      {/* Overlay de Loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-white flex justify-center items-center z-10" style={{ opacity: 0.8, position: 'absolute' }}>
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-500"></div>
          <p className="ml-4 text-lg text-gray-700">Carregando RENOVAÇÕES...</p>
        </div>
      )}

      {/* --- CABEÇALHO E FILTROS --- */}
      <header style={style.header}>
        <div style={style.titleGroup}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#343a40' }}>Renovações</h1>
          <button
            title='Clique para atualizar os dados'
            onClick={handleRefreshLeads}
            disabled={isLoading}
            style={{ ...style.refreshButton, transform: isLoading ? 'rotate(360deg)' : 'none' }}
          >
            <RefreshCcw size={22} />
          </button>
          
          {/* Sino de Notificação (Melhorado) */}
          {hasScheduledToday && (
            <div
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => setShowNotification(!showNotification)}
            >
              <Bell size={28} color="#dc3545" />
              <div
                style={{
                  position: 'absolute', top: '-5px', right: '-5px',
                  backgroundColor: '#dc3545', color: 'white',
                  borderRadius: '50%', width: '18px', height: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 'bold',
                }}
              >
                !
              </div>
              {showNotification && (
                <div
                  style={{
                    position: 'absolute', top: '40px', right: '0',
                    width: '250px', backgroundColor: 'white',
                    border: '1px solid #f8d7da', borderRadius: '8px',
                    padding: '15px', boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 10, color: '#721c24', background: '#f8d7da',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 'bold' }}>🔔 Atenção!</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Você tem **agendamentos** marcados para hoje!</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Filtros de Nome e Data/Mês */}
        <div style={style.filterGroup}>
          <input
            type="text"
            placeholder="Filtrar por nome..."
            value={nomeInput}
            onChange={(e) => setNomeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') aplicarFiltroNome(); }}
            style={{ ...style.inputFilter, width: '150px' }}
            title="Filtrar renovações pelo nome (contém)"
          />
          <button onClick={aplicarFiltroNome} style={style.filterButton}>
            Buscar Nome
          </button>

          <input
            type="month"
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            style={{ ...style.inputFilter, width: '140px' }}
            title="Filtrar pelo mês e ano de criação"
          />
          <button onClick={aplicarFiltroData} style={style.filterButton}>
            Filtrar Mês
          </button>
        </div>
      </header>
      
      {/* --- BARRA DE FILTROS DE STATUS --- */}
      <div style={style.statusFilterBar}>
        <button 
            onClick={limparFiltros}
            style={{ 
                ...style.statusButton, 
                backgroundColor: filtroStatus === null && filtroNome === '' && filtroData === '' ? '#6c757d' : '#adb5bd', 
                color: 'white',
                boxShadow: filtroStatus === null && filtroNome === '' && filtroData === '' ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none',
            }}
            title="Exibir todos os leads (exceto Fechado/Perdido)"
        >
            Todos ({leads.filter(l => l.status !== 'Fechado' && l.status !== 'Perdido').length})
        </button>

        <button
          onClick={() => aplicarFiltroStatus('Em Contato')}
          style={{
            ...style.statusButton,
            backgroundColor: filtroStatus === 'Em Contato' ? '#e67e22' : '#f39c12',
            color: 'white',
            boxShadow: filtroStatus === 'Em Contato' ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Em Contato ({leads.filter(l => l.status === 'Em Contato').length})
        </button>

        <button
          onClick={() => aplicarFiltroStatus('Sem Contato')}
          style={{
            ...style.statusButton,
            backgroundColor: filtroStatus === 'Sem Contato' ? '#7f8c8d' : '#95a5a6',
            color: 'white',
            boxShadow: filtroStatus === 'Sem Contato' ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Sem Contato ({leads.filter(l => l.status === 'Sem Contato').length})
        </button>

        {hasScheduledToday && (
          <button
            onClick={() => aplicarFiltroStatus('Agendado')}
            style={{
              ...style.statusButton,
              backgroundColor: filtroStatus === 'Agendado' ? '#2980b9' : '#3498db',
              color: 'white',
              boxShadow: filtroStatus === 'Agendado' ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            Agendados Hoje 🔔
          </button>
        )}
      </div>
      
      {/* --- LISTAGEM DE LEADS --- */}
      {isLoading ? (
        null
      ) : leadsFiltrados.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: '50px', color: '#6c757d' }}>
          Não há renovações pendentes para os filtros aplicados.
        </p>
      ) : (
        <>
          {leadsPagina.map((lead) => {
            const responsavel = usuarios.find((u) => u.nome === lead.responsavel);
            const isContactStatus = lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status.startsWith('Agendado');

            return (
              <div key={lead.id} style={style.cardContainer}>
                
                {/* 1. SEÇÃO PRINCIPAL (LEAD E STATUS) */}
                <div style={style.cardSection}>
                  <Lead
                    lead={lead}
                    onUpdateStatus={handleConfirmStatus}
                    disabledConfirm={!lead.responsavel}
                  />
                </div>

                {/* 2. SEÇÃO DE OBSERVAÇÕES */}
                <div style={style.cardSection}>
                    <div style={style.observacaoBlock}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label htmlFor={`observacao-${lead.id}`} style={{ fontWeight: 'bold', color: '#007bff' }}>
                            <Tag size={16} style={{ marginRight: '5px' }}/> Observações:
                            </label>
                            {!isEditingObservacao[lead.id] && (
                                <button
                                    onClick={() => handleAlterarObservacao(lead.id)}
                                    style={{
                                        background: 'none', border: 'none', color: '#ffc107', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px',
                                    }}
                                >
                                    <Edit size={16} style={{ marginRight: '4px' }}/> Alterar
                                </button>
                            )}
                        </div>
                        
                        <textarea
                            id={`observacao-${lead.id}`}
                            value={observacoes[lead.id] || ''}
                            onChange={(e) => handleObservacaoChange(lead.id, e.target.value)}
                            placeholder="Adicione suas observações aqui..."
                            rows="4"
                            disabled={!isEditingObservacao[lead.id]}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc',
                                resize: 'vertical', boxSizing: 'border-box', fontSize: '14px',
                                backgroundColor: isEditingObservacao[lead.id] ? 'white' : '#f8f9fa',
                            }}
                        />

                        {isEditingObservacao[lead.id] && (
                            <button
                                onClick={() => handleSalvarObservacao(lead.id)}
                                style={{
                                    marginTop: '10px', padding: '6px 14px', backgroundColor: '#28a745',
                                    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
                                }}
                            >
                                <Save size={16} style={{ marginRight: '5px' }}/> Salvar
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. SEÇÃO DE RESPONSÁVEL E TRANSFERÊNCIA (INFERIOR/DIREITA) */}
                <div style={{ ...style.cardSection, gridColumn: '1 / -1', ...style.transferBlock }}>
                    {lead.responsavel && responsavel ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ color: '#28a745', margin: 0, fontWeight: 'bold' }}>
                                <User size={16} style={{ marginRight: '5px' }}/> Atribuído: <strong>{responsavel.nome}</strong>
                            </p>
                            {isAdmin && (
                                <button
                                    onClick={() => handleAlterar(lead.id)}
                                    style={{
                                        padding: '5px 12px', backgroundColor: '#ffc107',
                                        color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600',
                                    }}
                                >
                                    <Trash2 size={16} style={{ marginRight: '5px' }}/> Remover Atribuição
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <User size={18} color="#007bff" />
                            <select
                                value={selecionados[lead.id] || ''}
                                onChange={(e) => handleSelect(lead.id, e.target.value)}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="">Selecione um usuário ativo para atribuir</option>
                                {usuariosAtivos.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.nome}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => handleEnviar(lead.id)}
                                disabled={!selecionados[lead.id]}
                                style={{
                                    padding: '8px 15px', backgroundColor: '#007bff',
                                    color: 'white', border: 'none', borderRadius: '4px', cursor: selecionados[lead.id] ? 'pointer' : 'not-allowed', fontWeight: 'bold',
                                    opacity: selecionados[lead.id] ? 1 : 0.6,
                                }}
                            >
                                <Send size={16} style={{ marginRight: '5px' }}/> Enviar
                            </button>
                        </div>
                    )}
                </div>

                {/* Data de Criação (Rodapé Compacto) */}
                <div 
                    style={{ position: 'absolute', bottom: '8px', right: '15px', fontSize: '11px', color: '#999', fontStyle: 'italic' }}
                    title={`Criado em: ${formatarData(lead.createdAt)}`}
                >
                    <Calendar size={12} style={{ marginRight: '3px' }}/> {formatarData(lead.createdAt)}
                </div>
              </div>
            );
          })}

          {/* --- PAGINAÇÃO --- */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '15px',
              marginTop: '25px',
            }}
          >
            <button
              onClick={handlePaginaAnterior}
              disabled={paginaCorrigida <= 1 || isLoading}
              style={{
                padding: '8px 18px', borderRadius: '20px', border: '1px solid #007bff',
                cursor: (paginaCorrigida <= 1 || isLoading) ? 'not-allowed' : 'pointer',
                backgroundColor: (paginaCorrigida <= 1 || isLoading) ? '#e9ecef' : '#007bff',
                color: (paginaCorrigida <= 1 || isLoading) ? '#6c757d' : 'white',
                fontWeight: 'bold',
                transition: 'background-color 0.2s, color 0.2s',
              }}
            >
              Anterior
            </button>
            <span style={{ fontWeight: '600', color: '#343a40' }}>
              Página {paginaCorrigida} de {totalPaginas}
            </span>
            <button
              onClick={handlePaginaProxima}
              disabled={paginaCorrigida >= totalPaginas || isLoading}
              style={{
                padding: '8px 18px', borderRadius: '20px', border: '1px solid #007bff',
                cursor: (paginaCorrigida >= totalPaginas || isLoading) ? 'not-allowed' : 'pointer',
                backgroundColor: (paginaCorrigida >= totalPaginas || isLoading) ? '#e9ecef' : '#007bff',
                color: (paginaCorrigida >= totalPaginas || isLoading) ? '#6c757d' : 'white',
                fontWeight: 'bold',
                transition: 'background-color 0.2s, color 0.2s',
              }}
            >
              Próxima
            </button>
          </div>
          
          {/* Botão para rolar ao topo */}
          <button
            onClick={scrollToTop}
            title="Voltar ao Topo"
            style={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                backgroundColor: '#343a40',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '45px',
                height: '45px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                zIndex: 20,
            }}
          >
            <ArrowUpCircle size={24}/>
          </button>
        </>
      )}
    </div>
  );
};

export default Renovacoes;
