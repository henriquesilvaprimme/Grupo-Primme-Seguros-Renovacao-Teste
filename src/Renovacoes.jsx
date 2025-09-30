import React, { useState, useEffect, useMemo } from 'react';
import Lead from './components/Lead'; // O componente Lead é mantido
import { RefreshCcw, Bell, Search, Calendar, User, ChevronLeft, ChevronRight, Save, Edit } from 'lucide-react';

// ===============================================
// 1. CONFIGURAÇÃO PARA A ABA 'Renovações' (Mantida)
// ===============================================
const SHEET_NAME = 'Renovações';

// URL base do seu Google Apps Script
const GOOGLE_SHEETS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

// URLs com o parâmetro 'sheet' adicionado para apontar para a nova aba
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?sheet=${SHEET_NAME}`;
const ALTERAR_ATRIBUIDO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?v=alterar_atribuido&sheet=${SHEET_NAME}`;
const SALVAR_OBSERVACAO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?action=salvarObservacao&sheet=${SHEET_NAME}`;

// ===============================================
// 2. COMPONENTE RENOMEADO PARA 'Renovacoes' (Com Refatoração de Layout)
// ===============================================

// --- COMPONENTE FILTROS ---
const FiltersSection = ({ dataInput, setDataInput, aplicarFiltroData, nomeInput, setNomeInput, aplicarFiltroNome, hasScheduledToday, aplicarFiltroStatus, filtroStatus }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Filtro por Nome */}
        <div className="flex items-center gap-2 flex-grow min-w-[200px]">
          <input
            type="text"
            placeholder="Filtrar por nome..."
            value={nomeInput}
            onChange={(e) => setNomeInput(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Filtrar renovações pelo nome (contém)"
          />
          <button
            onClick={aplicarFiltroNome}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition duration-200 flex items-center gap-1"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Filtro por Data */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <input
            type="month"
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Filtrar renovações pelo mês e ano de criação"
          />
          <button
            onClick={aplicarFiltroData}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition duration-200 flex items-center gap-1"
          >
            <Calendar size={18} />
          </button>
        </div>
      </div>
      
      {/* Botões de Status */}
      <div className="flex flex-wrap justify-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <StatusButton 
          status="Em Contato" 
          currentFiltro={filtroStatus} 
          onClick={() => aplicarFiltroStatus('Em Contato')} 
          bgColor="bg-yellow-500"
          hoverBgColor="hover:bg-yellow-600"
        />
        <StatusButton 
          status="Sem Contato" 
          currentFiltro={filtroStatus} 
          onClick={() => aplicarFiltroStatus('Sem Contato')} 
          bgColor="bg-gray-500"
          hoverBgColor="hover:bg-gray-600"
        />
        {hasScheduledToday && (
          <StatusButton 
            status="Agendado" 
            currentFiltro={filtroStatus} 
            onClick={() => aplicarFiltroStatus('Agendado')} 
            bgColor="bg-sky-500"
            hoverBgColor="hover:bg-sky-600"
          />
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE BOTÃO DE STATUS ---
const StatusButton = ({ status, currentFiltro, onClick, bgColor, hoverBgColor }) => {
  const isSelected = currentFiltro === status;
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold text-white rounded-full transition duration-150 ease-in-out whitespace-nowrap 
        ${bgColor} ${hoverBgColor} ${isSelected ? 'ring-2 ring-offset-2 ring-opacity-75 ring-current shadow-lg' : 'shadow-md'}`}
    >
      {status}
    </button>
  );
};

// --- COMPONENTE PAGINAÇÃO ---
const Pagination = ({ paginaCorrigida, totalPaginas, handlePaginaAnterior, handlePaginaProxima, isLoading }) => {
  return (
    <div className="flex justify-center items-center gap-4 mt-6">
      <button
        onClick={handlePaginaAnterior}
        disabled={paginaCorrigida <= 1 || isLoading}
        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 flex items-center"
      >
        <ChevronLeft size={20} className="mr-1" /> Anterior
      </button>
      <span className="text-gray-600 font-medium">
        Página {paginaCorrigida} de {totalPaginas}
      </span>
      <button
        onClick={handlePaginaProxima}
        disabled={paginaCorrigida >= totalPaginas || isLoading}
        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 flex items-center"
      >
        Próxima <ChevronRight size={20} className="ml-1" />
      </button>
    </div>
  );
};


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

  // --- Efeitos e Lógica de Inicialização (Mantidos) ---
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

      // Lógica de data para agendamento
      const [dia, mes, ano] = statusDateStr.split('/');
      const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
      const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');

      return statusDateFormatted === todayFormatted;
    });

    setHasScheduledToday(todayAppointments.length > 0);
  }, [leads]);


  // --- Funções de Lógica (Mantidas) ---
  const handleRefreshLeads = async () => {
    setIsLoading(true);
    try {
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

  const nomeContemFiltro = (leadNome, filtroNome) => {
    if (!filtroNome) return true;
    if (!leadNome) return false;
    const nomeNormalizado = normalizarTexto(leadNome);
    const filtroNormalizado = normalizarTexto(filtroNome);
    return nomeNormalizado.includes(filtroNormalizado);
  };

  // --- Lógica de Filtro (Otimizada com useMemo) ---
  const gerais = useMemo(() => {
    return leads.filter((lead) => {
      // Exclui Fechado/Perdido sempre
      if (lead.status === 'Fechado' || lead.status === 'Perdido') return false;

      // Filtro por Status
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

      // Filtro por Data (Se não houver filtro de Status)
      if (filtroData) {
        const leadMesAno = lead.createdAt ? lead.createdAt.substring(0, 7) : '';
        return leadMesAno === filtroData;
      }

      // Filtro por Nome (Se não houver filtro de Status ou Data)
      if (filtroNome) {
        return nomeContemFiltro(lead.name, filtroNome);
      }

      return true;
    });
  }, [leads, filtroStatus, filtroData, filtroNome]);


  // --- Lógica de Paginação (Otimizada) ---
  const totalPaginas = Math.max(1, Math.ceil(gerais.length / leadsPorPagina));
  const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
  const usuariosAtivos = usuarios.filter((u) => u.status === 'Ativo');
  const isAdmin = usuarioLogado?.tipo === 'Admin';

  const inicio = (paginaCorrigida - 1) * leadsPorPagina;
  const fim = inicio + leadsPorPagina;
  const leadsPagina = gerais.slice(inicio, fim);

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


  // --- Lógica de Transferência/Observação (Mantida) ---
  const handleSelect = (leadId, userId) => {
    setSelecionados((prev) => ({
      ...prev,
      [leadId]: Number(userId),
    }));
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

  const handleAlterar = (leadId) => {
    setSelecionados((prev) => ({
      ...prev,
      [leadId]: '',
    }));
    transferirLead(leadId, null);
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
    const hasNoObservacao = !currentLead.observacao || currentLead.observacao.trim() === '';

    if ((novoStatus === 'Em Contato' || novoStatus === 'Sem Contato' || novoStatus.startsWith('Agendado')) && hasNoObservacao) {
        setIsEditingObservacao(prev => ({ ...prev, [leadId]: true }));
    } else if (novoStatus === 'Em Contato' || novoStatus === 'Sem Contato' || novoStatus.startsWith('Agendado')) {
        setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
    } else {
        setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
    }
    fetchLeadsFromSheet(SHEET_NAME);
  };


  // --- Renderização do Layout Moderno (Tailwind CSS) ---
  return (
    <div className="p-4 md:p-6 lg:p-8 relative min-h-screen bg-gray-50">
      
      {/* Overlay de Loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex justify-center items-center z-50">
          <div className="flex items-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="ml-4 text-xl font-semibold text-gray-700">Carregando Renovações...</p>
          </div>
        </div>
      )}

      {/* Cabeçalho e Ações Principais */}
      <div className="flex flex-wrap items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold text-gray-800">Painel de Renovações</h1>
          <button
            title="Atualizar dados"
            onClick={handleRefreshLeads}
            disabled={isLoading}
            className={`p-2 rounded-full transition duration-300 ${isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
          >
            <RefreshCcw size={24} className={isLoading ? '' : 'hover:rotate-180'} />
          </button>
        </div>

        {/* Notificação de Agendamento */}
        {hasScheduledToday && (
          <div className="relative">
            <button
              className="p-2 rounded-full text-blue-600 hover:bg-blue-100 relative transition duration-200"
              onClick={() => setShowNotification(!showNotification)}
              title="Agendamentos para hoje"
            >
              <Bell size={32} />
              <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500"></span>
            </button>
            {showNotification && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-10">
                <p className="text-sm font-semibold text-red-600 flex items-center">
                  <Bell size={16} className="mr-2" /> 🔔 Você tem agendamentos HOJE!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Seção de Filtros (Componente Separado) */}
      <FiltersSection 
        dataInput={dataInput} 
        setDataInput={setDataInput} 
        aplicarFiltroData={aplicarFiltroData}
        nomeInput={nomeInput}
        setNomeInput={setNomeInput}
        aplicarFiltroNome={aplicarFiltroNome}
        hasScheduledToday={hasScheduledToday}
        aplicarFiltroStatus={aplicarFiltroStatus}
        filtroStatus={filtroStatus}
      />
      
      {/* Mensagem de Ausência de Leads */}
      {gerais.length === 0 && !isLoading && (
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <p className="text-xl text-gray-600">Não há renovações pendentes para os filtros aplicados. 😔</p>
        </div>
      )}

      {/* Lista de Leads (Otimizada com Cards) */}
      <div className="space-y-4">
        {leadsPagina.map((lead) => {
          const responsavel = usuarios.find((u) => u.nome === lead.responsavel);
          const shouldShowObs = lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status.startsWith('Agendado');

          return (
            <div 
              key={lead.id}
              className="bg-white p-5 rounded-xl shadow-lg border border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-6 relative"
            >
              
              {/* Coluna Principal: Dados do Lead e Ações de Status */}
              <div className="lg:col-span-1">
                <Lead 
                  lead={lead} 
                  onUpdateStatus={handleConfirmStatus} 
                  disabledConfirm={!lead.responsavel} 
                />
              </div>

              {/* Coluna Secundária: Observações */}
              {shouldShowObs && (
                <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-dashed border-gray-200 lg:pl-6 pt-4 lg:pt-0">
                  <label htmlFor={`observacao-${lead.id}`} className="block mb-2 text-sm font-bold text-gray-700">
                    Observações:
                  </label>
                  <textarea
                    id={`observacao-${lead.id}`}
                    value={observacoes[lead.id] || ''}
                    onChange={(e) => handleObservacaoChange(lead.id, e.target.value)}
                    placeholder="Adicione suas observações aqui..."
                    rows="4"
                    disabled={!isEditingObservacao[lead.id]}
                    className={`w-full p-3 text-sm rounded-lg border focus:outline-none focus:ring-2 transition duration-150 ${
                      isEditingObservacao[lead.id] 
                        ? 'border-blue-300 bg-white focus:ring-blue-500' 
                        : 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed'
                    }`}
                  />
                  <div className="mt-2">
                    {isEditingObservacao[lead.id] ? (
                      <button
                        onClick={() => handleSalvarObservacao(lead.id)}
                        className="flex items-center px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition duration-150 shadow-md"
                        disabled={isLoading}
                      >
                        <Save size={16} className="mr-1" /> Salvar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAlterarObservacao(lead.id)}
                        className="flex items-center px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition duration-150 shadow-md"
                      >
                        <Edit size={16} className="mr-1" /> Alterar
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Coluna de Transferência de Leads */}
              <div className={`lg:col-span-1 border-t lg:border-t-0 ${shouldShowObs ? 'lg:border-l' : ''} border-dashed border-gray-200 ${shouldShowObs ? 'lg:pl-6' : ''} pt-4 lg:pt-0`}>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <User size={16} className="mr-1 text-blue-500" /> Atribuição
                </h3>
                {lead.responsavel && responsavel ? (
                  <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
                    <p className="text-sm font-medium text-green-700">
                      Transferido para <strong>{responsavel.nome}</strong>
                    </p>
                    {isAdmin && (
                      <button
                        onClick={() => handleAlterar(lead.id)}
                        className="mt-2 px-3 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition duration-150"
                      >
                        Remover Atribuição
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <select
                      value={selecionados[lead.id] || ''}
                      onChange={(e) => handleSelect(lead.id, e.target.value)}
                      className="flex-grow p-2 text-sm rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
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
                      disabled={!selecionados[lead.id]}
                      className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition duration-150 disabled:bg-gray-400"
                    >
                      Enviar
                    </button>
                  </div>
                )}
              </div>
              
              {/* Data de Criação (Rodapé do Card) */}
              <div 
                className="absolute bottom-3 right-4 text-xs text-gray-500 italic"
                title={`Criado em: ${formatarData(lead.createdAt)}`}
              >
                Criado: {formatarData(lead.createdAt)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção de Paginação (Componente Separado) */}
      <Pagination
        paginaCorrigida={paginaCorrigida}
        totalPaginas={totalPaginas}
        handlePaginaAnterior={handlePaginaAnterior}
        handlePaginaProxima={handlePaginaProxima}
        isLoading={isLoading}
      />
    </div>
  );
};

export default Renovacoes;
