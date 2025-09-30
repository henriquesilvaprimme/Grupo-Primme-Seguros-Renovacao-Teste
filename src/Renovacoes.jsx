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
    <div className="p-5 relative min-h-screen-minus-header">
      {isLoading && (
        <div className="absolute inset-0 bg-white flex justify-center items-center z-10 opacity-80">
          <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-4 text-lg text-gray-700">Carregando **RENOVAÇÕES**...</p>
        </div>
      )}

      {/* HEADER: Título, Refresh e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold m-0">Renovações</h1>
          <button
            title='Clique para atualizar os dados'
            onClick={handleRefreshLeads}
            disabled={isLoading}
            className="p-0 border-none cursor-pointer flex items-center justify-center text-blue-600 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <RefreshCcw size={20} />
            )}
          </button>
        </div>

        {/* --- FILTRO POR NOME --- */}
        <div className="flex items-center gap-2">
          <button
            onClick={aplicarFiltroNome}
            className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-md px-4 py-1.5 cursor-pointer whitespace-nowrap text-sm"
          >
            Filtrar Nome
          </button>
          <input
            type="text"
            placeholder="Filtrar por nome"
            value={nomeInput}
            onChange={(e) => setNomeInput(e.target.value)}
            className="p-1.5 rounded-md border border-gray-300 w-56 max-w-full"
            title="Filtrar renovações pelo nome (contém)"
          />
        </div>

        {/* --- NOTIFICAÇÃO DE AGENDAMENTO HOJE (SINO) --- */}
        {hasScheduledToday && (
          <div className="flex-1 flex justify-center items-center">
            <div
              className="relative cursor-pointer"
              onClick={() => {
                setShowNotification(!showNotification);
                aplicarFiltroStatus('Agendado'); // Aplica filtro ao clicar no sino
              }}
              title="Você tem agendamentos para hoje!"
            >
              <Bell size={32} className="text-blue-600" />
              <div
                className="absolute top-[-5px] right-[-5px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white"
              >
                1
              </div>
              {showNotification && (
                <div
                  className="absolute top-10 left-1/2 transform -translate-x-1/2 w-64 bg-white border border-gray-300 rounded-lg p-3 shadow-lg z-20 text-sm whitespace-nowrap"
                >
                  <p className="font-semibold text-red-600">🚨 Atenção:</p>
                  <p>Você tem **agendamentos hoje!**</p>
                  <p className='text-xs text-gray-500 mt-1'>Filtro "Agendados" aplicado.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- FILTRO POR DATA --- */}
        <div className="flex items-center gap-2">
          <button
            onClick={aplicarFiltroData}
            className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-md px-4 py-1.5 cursor-pointer text-sm"
          >
            Filtrar Mês
          </button>
          <input
            type="month"
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            className="p-1.5 rounded-md border border-gray-300 cursor-pointer"
            title="Filtrar renovações pelo mês e ano de criação"
          />
        </div>
      </div>

      {/* BOTÕES DE STATUS (FILTROS RÁPIDOS) */}
      <div className="flex justify-center gap-4 mb-5 flex-wrap">
        <button
          onClick={() => aplicarFiltroStatus('Em Contato')}
          className={`px-4 py-2 rounded-md font-bold transition duration-200 ${
            filtroStatus === 'Em Contato'
              ? 'bg-orange-600 text-white shadow-inner shadow-black/30'
              : 'bg-yellow-600 hover:bg-orange-600 text-white'
          }`}
        >
          Em Contato
        </button>

        <button
          onClick={() => aplicarFiltroStatus('Sem Contato')}
          className={`px-4 py-2 rounded-md font-bold transition duration-200 ${
            filtroStatus === 'Sem Contato'
              ? 'bg-gray-600 text-white shadow-inner shadow-black/30'
              : 'bg-gray-400 hover:bg-gray-600 text-white'
          }`}
        >
          Sem Contato
        </button>

        {hasScheduledToday && (
          <button
            onClick={() => aplicarFiltroStatus('Agendado')}
            className={`px-4 py-2 rounded-md font-bold transition duration-200 ${
              filtroStatus === 'Agendado'
                ? 'bg-blue-800 text-white shadow-inner shadow-black/30'
                : 'bg-blue-500 hover:bg-blue-800 text-white'
            }`}
          >
            Agendados Hoje
          </button>
        )}
      </div>

      {/* LISTA DE LEADS */}
      {isLoading ? (
        null
      ) : gerais.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">Não há renovações pendentes para os filtros aplicados.</p>
      ) : (
        <>
          {leadsPagina.map((lead) => {
            const responsavel = usuarios.find((u) => u.nome === lead.responsavel);

            return (
              <div
                key={lead.id}
                className="border border-gray-300 rounded-lg p-4 mb-4 relative flex flex-wrap gap-x-5 gap-y-3 items-start md:p-6"
              >
                {/* Coluna 1: Informações do Lead (Componente Lead) */}
                <div className="flex-1 min-w-[300px]">
                  <Lead
                    lead={lead}
                    onUpdateStatus={handleConfirmStatus}
                    disabledConfirm={!lead.responsavel}
                  />
                </div>

                {/* Coluna 2: Observações e Ações */}
                {(lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status.startsWith('Agendado')) && (
                  <div className="flex-1 min-w-[280px] pt-3 md:pt-0 md:border-l md:border-dashed md:border-gray-200 md:pl-5">
                    <label htmlFor={`observacao-${lead.id}`} className="block mb-1 font-semibold text-gray-700 text-sm">
                      Observações:
                    </label>
                    <textarea
                      id={`observacao-${lead.id}`}
                      value={observacoes[lead.id] || ''}
                      onChange={(e) => handleObservacaoChange(lead.id, e.target.value)}
                      placeholder="Adicione suas observações aqui..."
                      rows="3"
                      disabled={!isEditingObservacao[lead.id]}
                      className={`w-full p-2 rounded-md border ${isEditingObservacao[lead.id] ? 'border-blue-400 bg-white' : 'border-gray-300 bg-gray-100 cursor-not-allowed'} resize-y box-border text-sm transition-colors`}
                    ></textarea>
                    {isEditingObservacao[lead.id] ? (
                      <button
                        onClick={() => handleSalvarObservacao(lead.id)}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-md cursor-pointer font-bold text-sm"
                      >
                        Salvar Observação
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAlterarObservacao(lead.id)}
                        className="mt-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black border-none rounded-md cursor-pointer font-bold text-sm"
                      >
                        Alterar Observação
                      </button>
                    )}
                  </div>
                )}
                
                {/* Linha de Transferência de Lead */}
                <div className="w-full mt-3">
                  {lead.responsavel && responsavel ? (
                    <div className="flex items-center gap-3">
                      <p className="text-green-600 font-medium">
                        Transferido para <strong>{responsavel.nome}</strong>
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => handleAlterar(lead.id)}
                          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black border-none rounded-md cursor-pointer text-sm"
                        >
                          Alterar
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <select
                        value={selecionados[lead.id] || ''}
                        onChange={(e) => handleSelect(lead.id, e.target.value)}
                        className="p-1.5 rounded-md border border-gray-300 text-sm"
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
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white border-none rounded-md cursor-pointer font-semibold text-sm"
                      >
                        Enviar
                      </button>
                    </div>
                  )}
                </div>

                {/* Data de Criação (Rodapé) */}
                <div
                  className="absolute bottom-3 right-4 text-xs text-gray-500 italic"
                  title={`Criado em: ${formatarData(lead.createdAt)}`}
                >
                  Criado em: {formatarData(lead.createdAt)}
                </div>
              </div>
            );
          })}

          {/* Paginação */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={handlePaginaAnterior}
              disabled={paginaCorrigida <= 1 || isLoading}
              className={`px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold transition-colors ${
                paginaCorrigida <= 1 || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 text-blue-600 cursor-pointer'
              }`}
            >
              Anterior
            </button>
            <span className="self-center font-medium text-gray-700">
              Página {paginaCorrigida} de {totalPaginas}
            </span>
            <button
              onClick={handlePaginaProxima}
              disabled={paginaCorrigida >= totalPaginas || isLoading}
              className={`px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold transition-colors ${
                paginaCorrigida >= totalPaginas || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 text-blue-600 cursor-pointer'
              }`}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Renovacoes;
