import React, { useState, useEffect } from 'react';
import Lead from './components/Lead';
import { RefreshCcw, Bell, Search, Calendar, Filter } from 'lucide-react';

// ===============================================
// 1. CONFIGURAÇÃO PARA A ABA 'Renovações'
// (Mantido, mas simplificado para o exemplo)
// ===============================================
const SHEET_NAME = 'Renovações';
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

  // --- EFEITOS E LÓGICA DE FILTRAGEM (MANTIDA) ---

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
    // Usando toISOString para evitar problemas de fuso horário
    const todayFormatted = today.toISOString().split('T')[0].split('-').reverse().join('/'); // DD/MM/YYYY

    const todayAppointments = leads.filter(lead => {
      if (!lead.status.startsWith('Agendado')) return false;
      const statusDateStr = lead.status.split(' - ')[1];
      if (!statusDateStr) return false;

      // statusDateStr no formato DD/MM/YYYY
      const [dia, mes, ano] = statusDateStr.split('/');
      const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
      
      // Formata a data do status para comparação
      const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');

      return statusDateFormatted === todayFormatted;
    });

    setHasScheduledToday(todayAppointments.length > 0);
  }, [leads]);

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
      fetchLeadsFromSheet(SHEET_NAME);
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

  // --- COMPONENTES AUXILIARES DE ESTILIZAÇÃO PARA EVITAR REPETIÇÃO ---
  const StatusButton = ({ status, onClick, selected, colorClass }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition-all duration-200 ease-in-out ${
        selected
          ? `text-white ${colorClass} ring-2 ring-offset-2 ring-opacity-75 ring-indigo-500`
          : `bg-gray-100 text-gray-700 hover:bg-gray-200`
      }`}
    >
      {status}
    </button>
  );

  const NotificationBell = () => (
    <div
      className="relative cursor-pointer ml-4"
      onClick={() => setShowNotification(!showNotification)}
      title="Você tem agendamentos para hoje!"
    >
      <Bell size={32} className="text-blue-600 animate-pulse" />
      <div
        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
      >
        1
      </div>
      {showNotification && (
        <div className="absolute top-10 right-1/2 transform translate-x-1/2 w-64 bg-white border border-gray-200 rounded-lg p-3 shadow-xl z-10 text-center">
          <p className="text-sm font-medium text-gray-800">Você tem **agendamentos hoje**!</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-5 md:p-8 relative min-h-[calc(100vh-100px)]">
      {/* Overlay de Carregamento */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex justify-center items-center z-20">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-600"></div>
          <p className="ml-4 text-xl font-medium text-gray-700">Carregando RENOVAÇÕES...</p>
        </div>
      )}

      {/* Título e Botão de Atualizar */}
      <header className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-800">Renovações</h1>
          <button
            title='Clique para atualizar os dados'
            onClick={handleRefreshLeads}
            disabled={isLoading}
            className={`p-1 rounded-full text-indigo-600 hover:bg-indigo-50 transition-colors ${
              isLoading ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <RefreshCcw size={24} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        {hasScheduledToday && <NotificationBell />}
      </header>

      {/* --- Seção de Filtros (Organização em Grid/Flex mais limpa) --- */}
      <section className="bg-white p-4 rounded-xl shadow-lg mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2"><Filter size={20} /> Filtros Rápidos</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          {/* Filtro por Nome */}
          <div className="flex items-center gap-2 col-span-1">
            <input
              type="text"
              placeholder="Nome do Cliente (contém)"
              value={nomeInput}
              onChange={(e) => setNomeInput(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              title="Filtrar renovações pelo nome (contém)"
            />
            <button
              onClick={aplicarFiltroNome}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
              title="Aplicar filtro por nome"
            >
              <Search size={20} />
            </button>
          </div>

          {/* Filtro por Mês/Ano */}
          <div className="flex items-center gap-2 col-span-1">
            <input
              type="month"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              title="Filtrar renovações pelo mês e ano de criação"
            />
            <button
              onClick={aplicarFiltroData}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
              title="Aplicar filtro por data"
            >
              <Calendar size={20} />
            </button>
          </div>
          
          {/* Botão de Limpar Filtros (Novo) */}
          <button
            onClick={() => {
              setFiltroStatus(null);
              setFiltroNome('');
              setNomeInput('');
              setFiltroData('');
              // Re-aplicar o mês/ano atual
              const today = new Date();
              const ano = today.getFullYear();
              const mes = String(today.getMonth() + 1).padStart(2, '0');
              const mesAnoAtual = `${ano}-${mes}`;
              setDataInput(mesAnoAtual);
              setFiltroData(mesAnoAtual);
              setPaginaAtual(1);
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold col-span-1"
          >
            Limpar Filtros
          </button>
        </div>
      </section>

      {/* --- Filtros de Status (Tags/Badges) --- */}
      <div className="flex flex-wrap justify-start gap-3 mb-6">
        <StatusButton
          status="Em Contato"
          onClick={() => aplicarFiltroStatus('Em Contato')}
          selected={filtroStatus === 'Em Contato'}
          colorClass="bg-orange-500 hover:bg-orange-600"
        />
        <StatusButton
          status="Sem Contato"
          onClick={() => aplicarFiltroStatus('Sem Contato')}
          selected={filtroStatus === 'Sem Contato'}
          colorClass="bg-gray-500 hover:bg-gray-600"
        />
        {hasScheduledToday && (
          <StatusButton
            status="Agendados Hoje"
            onClick={() => aplicarFiltroStatus('Agendado')}
            selected={filtroStatus === 'Agendado'}
            colorClass="bg-blue-600 hover:bg-blue-700"
          />
        )}
      </div>
      {/* ------------------------------------------- */}

      {/* Lista de Leads (Cards) */}
      {isLoading ? (
        null
      ) : gerais.length === 0 ? (
        <p className="text-lg text-center text-gray-500 mt-10">
          Não há renovações pendentes para os filtros aplicados. 😔
        </p>
      ) : (
        <>
          {leadsPagina.map((lead) => {
            const responsavel = usuarios.find((u) => u.nome === lead.responsavel);
            const showObservation = lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status.startsWith('Agendado');

            return (
              <article
                key={lead.id}
                className="bg-white rounded-xl shadow-lg p-4 mb-4 border border-gray-100 hover:shadow-xl transition-shadow duration-300 relative"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
                  
                  {/* Coluna 1: Informações do Lead e Ações de Status */}
                  <div className={`col-span-1 ${showObservation ? 'lg:col-span-1' : 'lg:col-span-2'} min-w-[280px]`}>
                    {/* O componente Lead deve ser responsivo e usar classes Tailwind internamente */}
                    <Lead
                      lead={lead}
                      onUpdateStatus={handleConfirmStatus}
                      disabledConfirm={!lead.responsavel}
                    />
                  </div>

                  {/* Coluna 2: Observações (Condicional) */}
                  {showObservation && (
                    <div className="col-span-1 min-w-[250px] border-t pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0 border-gray-200 border-dashed">
                      <label htmlFor={`observacao-${lead.id}`} className="block mb-2 text-sm font-bold text-gray-700">
                        Observações:
                      </label>
                      <textarea
                        id={`observacao-${lead.id}`}
                        value={observacoes[lead.id] || ''}
                        onChange={(e) => handleObservacaoChange(lead.id, e.target.value)}
                        placeholder="Adicione suas observações aqui..."
                        rows="3"
                        disabled={!isEditingObservacao[lead.id]}
                        className={`w-full p-2 text-sm rounded-lg border resize-y transition-colors ${
                          isEditingObservacao[lead.id] 
                            ? 'border-indigo-400 bg-white focus:ring-indigo-500 focus:border-indigo-500'
                            : 'border-gray-200 bg-gray-50 cursor-default text-gray-600'
                        }`}
                      ></textarea>
                      <div className="mt-3">
                        {isEditingObservacao[lead.id] ? (
                          <button
                            onClick={() => handleSalvarObservacao(lead.id)}
                            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                            disabled={isLoading}
                          >
                            Salvar Observação
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAlterarObservacao(lead.id)}
                            className="px-4 py-2 text-sm font-semibold bg-yellow-400 text-gray-800 rounded-lg shadow-md hover:bg-yellow-500 transition-colors"
                          >
                            Alterar Observação
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Coluna 3: Transferência (sempre visível, mas posicionado de forma dinâmica no layout grid) */}
                  <div className="col-span-1 min-w-[200px] border-t pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0 border-gray-200 border-dashed">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Atribuição:</h3>
                    
                    {lead.responsavel && responsavel ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-700">
                          Transferido para: <strong className="font-bold">{responsavel.nome}</strong>
                        </p>
                        {isAdmin && (
                          <button
                            onClick={() => handleAlterar(lead.id)}
                            className="mt-2 px-3 py-1 text-xs font-medium bg-yellow-400 text-gray-800 rounded-md hover:bg-yellow-500 transition-colors"
                          >
                            Alterar Atribuição
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <select
                          value={selecionados[lead.id] || ''}
                          onChange={(e) => handleSelect(lead.id, e.target.value)}
                          className="p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
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
                          className="p-2 text-sm font-semibold bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-colors disabled:bg-gray-400"
                          disabled={!selecionados[lead.id]}
                        >
                          Atribuir / Enviar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Data de Criação no Canto Inferior Direito (Estilo mais discreto) */}
                <div
                  className="absolute bottom-2 right-4 text-xs text-gray-400 italic"
                  title={`Criado em: ${formatarData(lead.createdAt)}`}
                >
                  Criado em: {formatarData(lead.createdAt)}
                </div>
              </article>
            );
          })}

          {/* --- Paginação --- */}
          <div className="flex justify-center items-center gap-4 mt-6 p-4 bg-gray-50 rounded-lg shadow-inner">
            <button
              onClick={handlePaginaAnterior}
              disabled={paginaCorrigida <= 1 || isLoading}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Anterior
            </button>
            <span className="text-gray-700 font-semibold">
              Página {paginaCorrigida} de {totalPaginas}
            </span>
            <button
              onClick={handlePaginaProxima}
              disabled={paginaCorrigida >= totalPaginas || isLoading}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
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
