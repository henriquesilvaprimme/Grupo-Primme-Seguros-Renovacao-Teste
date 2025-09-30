import React, { useState, useEffect } from 'react';
import Lead from './components/Lead';
import { RefreshCcw, Bell } from 'lucide-react';

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
// 2. COMPONENTE RENOMEADO PARA 'Renovacoes'
// ===============================================
const Renovacoes = ({ leads, usuarios, onUpdateStatus, transferirLead, usuarioLogado, fetchLeadsFromSheet, scrollContainerRef }) => {
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

  useEffect(() => {
    // Calcula o mês/ano atual no formato YYYY-MM
    const today = new Date();
    const ano = today.getFullYear();
    const mes = String(today.getMonth() + 1).padStart(2, '0');
    const mesAnoAtual = `${ano}-${mes}`;
    
    // Define o filtro de data e o valor do input para o mês/ano atual
    setDataInput(mesAnoAtual);
    setFiltroData(mesAnoAtual);

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

  const handleRefreshLeads = async () => {
    setIsLoading(true);
    try {
      // Usando fetchLeadsFromSheet, que deve ser ajustada no componente pai
      await fetchLeadsFromSheet(SHEET_NAME); 
      const refreshedIsEditingObservacao = {};
      leads.forEach(lead => {
        refreshedIsEditingObservacao[lead.id] = !lead.observacao || lead.observacao.trim() === '';
      });
      setIsEditingObservacao(refreshedIsEditingObservacao);
    } catch (error) {
      console.error('Erro ao buscar leads atualizados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const leadsPorPagina = 10;

  const normalizarTexto = (texto = '') => {
    return texto
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()@\+\?><\[\]\+]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

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

  const isSameMonthAndYear = (leadDateStr, filtroMesAno) => {
    if (!filtroMesAno) return true;
    if (!leadDateStr) return false;
    const leadData = new Date(leadDateStr);
    const leadAno = leadData.getFullYear();
    const leadMes = String(leadData.getMonth() + 1).padStart(2, '0');
    return filtroMesAno === `${leadAno}-${leadMes}`;
  };

  const nomeContemFiltro = (leadNome, filtroNome) => {
    if (!filtroNome) return true;
    if (!leadNome) return false;
    const nomeNormalizado = normalizarTexto(leadNome);
    const filtroNormalizado = normalizarTexto(filtroNome);
    return nomeNormalizado.includes(filtroNormalizado);
  };

  const gerais = leads.filter((lead) => {
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

  const totalPaginas = Math.max(1, Math.ceil(gerais.length / leadsPorPagina));
  const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
  const usuariosAtivos = usuarios.filter((u) => u.status === 'Ativo');
  const isAdmin = usuarioLogado?.tipo === 'Admin';

  const handleSelect = (leadId, userId) => {
    setSelecionados((prev) => ({
      ...prev,
      [leadId]: Number(userId),
    }));
  };

  const handleEnviar = (leadId) => {
    const userId = selecionados[leadId];
    if (!userId) {
      alert('Selecione um usuário antes de enviar.');
      return;
    }
    transferirLead(leadId, userId);
    const lead = leads.find((l) => l.id === leadId);
    const leadAtualizado = { ...lead, usuarioId: userId };
    enviarLeadAtualizado(leadAtualizado);
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
      fetchLeadsFromSheet(SHEET_NAME); // Passando SHEET_NAME
    } catch (error) {
      console.error('Erro ao enviar lead:', error);
    }
  };

  const handleAlterar = (leadId) => {
    setSelecionados((prev) => ({
      ...prev,
      [leadId]: '',
    }));
    transferirLead(leadId, null);
  };

  const inicio = (paginaCorrigida - 1) * leadsPorPagina;
  const fim = inicio + leadsPorPagina;
  const leadsPagina = gerais.slice(inicio, fim);

  // Função para rolar o contêiner principal para o topo
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
      fetchLeadsFromSheet(SHEET_NAME); // Passando SHEET_NAME
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
    const hasNoObservacao = !currentLead.observacao || currentLead.observacao.trim() === '';

    if ((novoStatus === 'Em Contato' || novoStatus === 'Sem Contato' || novoStatus.startsWith('Agendado')) && hasNoObservacao) {
        setIsEditingObservacao(prev => ({ ...prev, [leadId]: true }));
    } else if (novoStatus === 'Em Contato' || novoStatus === 'Sem Contato' || novoStatus.startsWith('Agendado')) {
        setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
    } else {
        setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
    }
    fetchLeadsFromSheet(SHEET_NAME); // Passando SHEET_NAME
  };

  return (
    <div style={{ 
        padding: '20px', 
        position: 'relative', 
        minHeight: 'calc(100vh - 100px)', 
        backgroundColor: '#f8f9fa', // Cor de fundo suave
    }}>
      {isLoading && (
        <div className="absolute inset-0 bg-white flex justify-center items-center z-10" style={{ opacity: 0.9, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500" style={{ borderWidth: '4px', borderColor: '#3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p className="ml-4 text-lg text-gray-700" style={{ marginLeft: '16px', fontSize: '1.125rem', color: '#4b5563' }}>Carregando RENOVAÇÕES...</p>
        </div>
      )}

      {/* Estilo para a animação de loading, pois o className 'animate-spin' não funciona nativamente com style inline */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>

      {/* HEADER COM TÍTULO E BOTÕES DE AÇÃO */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          gap: '15px',
          flexWrap: 'wrap',
          paddingBottom: '10px',
          borderBottom: '1px solid #e5e7eb', // Linha divisória suave
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1f2937', fontWeight: '600' }}>Gerenciamento de Renovações</h1> 
          <button
            title='Clique para atualizar os dados'
            onClick={handleRefreshLeads}
            disabled={isLoading}
            style={{
                background: 'none',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6', // Cor primária
                transform: isLoading ? 'rotate(360deg)' : 'rotate(0deg)',
                transition: 'transform 0.5s',
            }}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-blue-600" style={{ height: '20px', width: '20px', color: '#2563eb' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }}></path>
              </svg>
            ) : (
              <RefreshCcw size={22} />
            )}
          </button>
        </div>
        
        {/* FILTROS DE TEXTO E DATA AGRUPADOS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {/* FILTRO POR NOME */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                <input
                    type="text"
                    placeholder="Nome do cliente"
                    value={nomeInput}
                    onChange={(e) => setNomeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && aplicarFiltroNome()}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        width: '200px',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.3s, box-shadow 0.3s',
                    }}
                    title="Filtrar renovações pelo nome (contém)"
                />
                <button
                    onClick={aplicarFiltroNome}
                    style={{
                        backgroundColor: '#10b981', // Verde Vibrante (Success)
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontWeight: '600',
                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                        transition: 'background-color 0.3s',
                    }}
                >
                    Buscar
                </button>
            </div>
            
            {/* FILTRO POR DATA (MÊS/ANO) */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                <input
                    type="month"
                    value={dataInput}
                    onChange={(e) => setDataInput(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        width: '150px',
                        transition: 'border-color 0.3s',
                    }}
                    title="Filtrar renovações pelo mês e ano de criação"
                />
                <button
                    onClick={aplicarFiltroData}
                    style={{
                        backgroundColor: '#3b82f6', // Azul Primário
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                        transition: 'background-color 0.3s',
                    }}
                >
                    Filtrar
                </button>
            </div>
        </div>
      </div>

      {/* FILTROS DE STATUS ESTILIZADOS COMO CHIPS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          gap: '12px',
          marginBottom: '30px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => aplicarFiltroStatus('Em Contato')}
          style={{
            padding: '8px 16px',
            backgroundColor: filtroStatus === 'Em Contato' ? '#f59e0b' : '#fcd34d', // Amarelo (Atenção)
            color: filtroStatus === 'Em Contato' ? 'white' : '#78350f',
            border: 'none',
            borderRadius: '20px', // Estilo Chip
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s',
            boxShadow: filtroStatus === 'Em Contato' ? '0 4px 6px rgba(245, 158, 11, 0.4)' : 'none',
          }}
        >
          Em Contato ({leads.filter(l => l.status === 'Em Contato').length})
        </button>

        <button
          onClick={() => aplicarFiltroStatus('Sem Contato')}
          style={{
            padding: '8px 16px',
            backgroundColor: filtroStatus === 'Sem Contato' ? '#4b5563' : '#9ca3af', // Cinza (Neutro)
            color: 'white',
            border: 'none',
            borderRadius: '20px', // Estilo Chip
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s',
            boxShadow: filtroStatus === 'Sem Contato' ? '0 4px 6px rgba(75, 85, 99, 0.4)' : 'none',
          }}
        >
          Sem Contato ({leads.filter(l => l.status === 'Sem Contato').length})
        </button>

        {hasScheduledToday && (
          <button
            onClick={() => aplicarFiltroStatus('Agendado')}
            style={{
              padding: '8px 16px',
              backgroundColor: filtroStatus === 'Agendado' ? '#ef4444' : '#f87171', // Vermelho (Urgente/Agendado)
              color: 'white',
              border: 'none',
              borderRadius: '20px', // Estilo Chip
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
              boxShadow: filtroStatus === 'Agendado' ? '0 4px 6px rgba(239, 68, 68, 0.4)' : 'none',
            }}
          >
            Agendados Hoje ({leads.filter(l => l.status.startsWith('Agendado')).filter(l => {
                const todayFormatted = new Date().toLocaleDateString('pt-BR');
                const statusDateStr = l.status.split(' - ')[1];
                if (!statusDateStr) return false;
                const [dia, mes, ano] = statusDateStr.split('/');
                const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
                return statusDate.toLocaleDateString('pt-BR') === todayFormatted;
            }).length})
          </button>
        )}
        
        {/* SINO DE NOTIFICAÇÃO (ISOLADO E NOVO ESTILO) */}
        {hasScheduledToday && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'relative',
                cursor: 'pointer',
                marginLeft: '20px'
              }}
              onClick={() => setShowNotification(!showNotification)}
            >
              <Bell size={28} color="#ef4444" />
              {/* Efeito de pulso para a bolha de notificação */}
              <div
                style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 0 0 rgba(239, 68, 68, 1)',
                  animation: 'pulse 2s infinite',
                }}
              >
                🔔
              </div>
              <style>
                {`
                  @keyframes pulse {
                    0% {
                      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
                    }
                    70% {
                        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                    }
                  }
                `}
              </style>
              {showNotification && (
                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '250px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '15px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 10,
                  }}
                >
                  <p style={{ margin: 0, color: '#374151' }}>Você tem agendamentos **pendentes** para hoje!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* LISTA DE LEADS */}
      {isLoading ? (
        null
      ) : gerais.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '50px', fontSize: '1.1rem' }}>Não há renovações pendentes para os filtros aplicados. 😔</p>
      ) : (
        <>
          {leadsPagina.map((lead) => {
            const responsavel = usuarios.find((u) => u.nome === lead.responsavel);

            return (
              <div
                key={lead.id}
                style={{
                  backgroundColor: '#ffffff', // Fundo branco para o card
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  position: 'relative',
                  display: 'flex',
                  gap: '30px',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)', // Sombra suave
                  border: '1px solid #e5e7eb',
                }}
              >
                {/* COLUNA 1: LEAD E STATUS */}
                <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                  <Lead
                    lead={lead}
                    onUpdateStatus={handleConfirmStatus}
                    disabledConfirm={!lead.responsavel}
                  />
                </div>

                {/* COLUNA 2: OBSERVAÇÕES E TRANSFERÊNCIA */}
                <div style={{ flex: '1 1 45%', minWidth: '300px', borderLeft: '1px dashed #e5e7eb', paddingLeft: '30px' }}>
                  
                  {/* Observações */}
                  {(lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status.startsWith('Agendado')) && (
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor={`observacao-${lead.id}`} style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1f2937', fontSize: '0.95rem' }}>
                        Observações ({isEditingObservacao[lead.id] ? 'Editando' : 'Visualizando'}):
                      </label>
                      <textarea
                        id={`observacao-${lead.id}`}
                        value={observacoes[lead.id] || ''}
                        onChange={(e) => handleObservacaoChange(lead.id, e.target.value)}
                        placeholder="Adicione suas observações aqui..."
                        rows="4"
                        disabled={!isEditingObservacao[lead.id]}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          backgroundColor: isEditingObservacao[lead.id] ? '#f9fafb' : '#f3f4f6', // Diferença de cor
                          cursor: isEditingObservacao[lead.id] ? 'text' : 'default',
                          fontSize: '0.9rem'
                        }}
                      ></textarea>
                      {isEditingObservacao[lead.id] ? (
                        <button
                          onClick={() => handleSalvarObservacao(lead.id)}
                          style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6', // Azul Primário
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'background-color 0.3s',
                          }}
                        >
                          Salvar Observação
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAlterarObservacao(lead.id)}
                          style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#fcd34d', // Amarelo Claro
                            color: '#78350f',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'background-color 0.3s',
                          }}
                        >
                          Alterar Observação
                        </button>
                      )}
                    </div>
                )}
                  
                  {/* Transferência de Lead */}
                  <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #f3f4f6' }}>
                      {lead.responsavel && responsavel ? (
                          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                            <p style={{ color: '#059669', fontWeight: '600', margin: 0 }}>
                              Atribuído a: <strong>{responsavel.nome}</strong>
                            </p>
                            {isAdmin && (
                              <button
                                onClick={() => handleAlterar(lead.id)}
                                style={{
                                  padding: '6px 14px',
                                  backgroundColor: '#fca5a5',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  transition: 'background-color 0.3s',
                                }}
                              >
                                Desatribuir
                              </button>
                            )}
                          </div>
                      ) : (
                          <div
                            style={{
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <select
                              value={selecionados[lead.id] || ''}
                              onChange={(e) => handleSelect(lead.id, e.target.value)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#fff',
                                flexGrow: 1,
                                minWidth: '150px',
                              }}
                            >
                              <option value="">Selecione usuário ativo</option>
                              {usuariosAtivos.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleEnviar(lead.id)}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#10b981', // Verde Vibrante
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'background-color 0.3s',
                              }}
                            >
                              Atribuir
                            </button>
                          </div>
                      )}
                  </div>
                </div>
                
                {/* Data de Criação (Rodapé do Card) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '20px',
                    fontSize: '12px',
                    color: '#9ca3af',
                    fontStyle: 'italic',
                  }}
                  title={`Criado em: ${formatarData(lead.createdAt)}`}
                >
                  Criado em: {formatarData(lead.createdAt)}
                </div>
              </div>
            );
          })}

          {/* PAGINAÇÃO MODERNIZADA */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              marginTop: '30px',
              padding: '10px 0',
            }}
          >
            <button
              onClick={handlePaginaAnterior}
              disabled={paginaCorrigida <= 1 || isLoading}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                cursor: (paginaCorrigida <= 1 || isLoading) ? 'not-allowed' : 'pointer',
                backgroundColor: (paginaCorrigida <= 1 || isLoading) ? '#e5e7eb' : '#fff',
                color: (paginaCorrigida <= 1 || isLoading) ? '#9ca3af' : '#1f2937',
                fontWeight: '500',
                transition: 'all 0.3s'
              }}
            >
              {'<'} Anterior
            </button>
            <span style={{ alignSelf: 'center', color: '#4b5563', fontWeight: '500' }}>
              Página <strong style={{ color: '#1f2937' }}>{paginaCorrigida}</strong> de <strong style={{ color: '#1f2937' }}>{totalPaginas}</strong>
            </span>
            <button
              onClick={handlePaginaProxima}
              disabled={paginaCorrigida >= totalPaginas || isLoading}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                cursor: (paginaCorrigida >= totalPaginas || isLoading) ? 'not-allowed' : 'pointer',
                backgroundColor: (paginaCorrigida >= totalPaginas || isLoading) ? '#e5e7eb' : '#fff',
                color: (paginaCorrigida >= totalPaginas || isLoading) ? '#9ca3af' : '#1f2937',
                fontWeight: '500',
                transition: 'all 0.3s'
              }}
            >
              Próxima {'>'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Renovacoes;
