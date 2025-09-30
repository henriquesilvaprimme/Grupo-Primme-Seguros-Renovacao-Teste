import React, { useState, useEffect } from 'react';
// import Lead from './components/Lead'; // Removido, pois o layout agora é integrado
import { RefreshCcw, Bell } from 'lucide-react';

// ===============================================
// 1. CONFIGURAÇÃO E CONSTANTES
// ===============================================
const SHEET_NAME = 'Renovações';

// URLs (Assumindo que estão corretas para o seu Google Apps Script)
const GOOGLE_SHEETS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?sheet=${SHEET_NAME}`;
const ALTERAR_ATRIBUIDO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?v=alterar_atribuido&sheet=${SHEET_NAME}`;
const SALVAR_OBSERVACAO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?action=salvarObservacao&sheet=${SHEET_NAME}`;

const STATUS_OPTIONS = [
    'Aguardando',
    'Em Contato',
    'Sem Contato',
    'Agendado - dd/mm/aaaa',
    'Fechado',
    'Perdido',
];

// ===============================================
// 2. COMPONENTE PRINCIPAL
// ===============================================
const Renovacoes = ({ leads, usuarios, onUpdateStatus, transferirLead, usuarioLogado, fetchLeadsFromSheet, scrollContainerRef }) => {
    // -------------------------------------------------------------------------
    // 2.1. Estados
    // -------------------------------------------------------------------------
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
    const [statusSelecionado, setStatusSelecionado] = useState({});

    // -------------------------------------------------------------------------
    // 2.2. Efeitos (Hooks)
    // -------------------------------------------------------------------------
    useEffect(() => {
        // Inicializa filtro de data para o mês/ano atual
        const today = new Date();
        const ano = today.getFullYear();
        const mes = String(today.getMonth() + 1).padStart(2, '0');
        const mesAnoAtual = `${ano}-${mes}`;
        
        setDataInput(mesAnoAtual);
        setFiltroData(mesAnoAtual);

        // Inicializa observações e estado de edição
        const initialObservacoes = {};
        const initialIsEditingObservacao = {};
        const initialStatusSelecionado = {};
        leads.forEach(lead => {
            initialObservacoes[lead.id] = lead.Observacao || '';
            initialIsEditingObservacao[lead.id] = !lead.Observacao || lead.Observacao.trim() === '';
            initialStatusSelecionado[lead.id] = lead.Status;
        });
        setObservacoes(initialObservacoes);
        setIsEditingObservacao(initialIsEditingObservacao);
        setStatusSelecionado(initialStatusSelecionado);
    }, [leads]);

    useEffect(() => {
        // Verifica agendamentos para notificação (Sino)
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('pt-BR');

        const todayAppointments = leads.filter(lead => {
            if (!lead.Status.startsWith('Agendado')) return false;
            const statusDateStr = lead.Status.split(' - ')[1];
            if (!statusDateStr) return false;

            const [dia, mes, ano] = statusDateStr.split('/');
            const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
            const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');

            return lead.Status.startsWith('Agendado') && statusDateFormatted === todayFormatted;
        });

        setHasScheduledToday(todayAppointments.length > 0);
    }, [leads]);

    // -------------------------------------------------------------------------
    // 2.3. Funções de Manipulação
    // -------------------------------------------------------------------------

    const handleRefreshLeads = async () => {
        setIsLoading(true);
        try {
            await fetchLeadsFromSheet(SHEET_NAME);
        } catch (error) {
            console.error('Erro ao buscar leads atualizados:', error);
        } finally {
            setIsLoading(false);
        }
    };

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

    const aplicarFiltroNome = () => {
        const filtroLimpo = nomeInput.trim();
        setFiltroNome(filtroLimpo);
        setFiltroData('');
        setDataInput('');
        setFiltroStatus(null);
        setPaginaAtual(1);
    };

    const aplicarFiltroData = () => {
        setFiltroData(dataInput);
        setFiltroNome('');
        setNomeInput('');
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

    const leadsFiltrados = leads.filter((lead) => {
        if (lead.Status === 'Fechado' || lead.Status === 'Perdido') return false;

        if (filtroStatus) {
            if (filtroStatus === 'Agendado') {
                const today = new Date();
                const todayFormatted = today.toLocaleDateString('pt-BR');
                const statusDateStr = lead.Status.split(' - ')[1];
                if (!statusDateStr) return false;
                const [dia, mes, ano] = statusDateStr.split('/');
                const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
                const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');
                return lead.Status.startsWith('Agendado') && statusDateFormatted === todayFormatted;
            }
            return lead.Status === filtroStatus;
        }

        if (filtroData) {
            // Assume que 'Data' é a coluna de criação ou de referência no formato YYYY-MM-DD
            const leadMesAno = lead.Data ? lead.Data.substring(0, 7) : ''; 
            return leadMesAno === filtroData;
        }

        if (filtroNome) {
            return nomeContemFiltro(lead.Name, filtroNome);
        }

        return true;
    });

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
        const leadAtualizado = { ...lead, UsuarioId: userId };
        enviarLeadAtualizado(leadAtualizado);
    };

    const handleAlterar = (leadId) => {
        setSelecionados((prev) => ({
            ...prev,
            [leadId]: '',
        }));
        transferirLead(leadId, null); // Marca como não atribuído
        
        // Envia atualização para o Apps Script
        const lead = leads.find((l) => l.id === leadId);
        const leadAtualizado = { ...lead, Responsavel: '', UsuarioId: '' }; // Limpa responsavel
        enviarLeadAtualizado(leadAtualizado);
    };

    const formatarData = (dataStr) => {
        if (!dataStr) return '';
        // Converte o formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ para DD/MM/AAAA
        try {
            const dataObj = new Date(dataStr);
            if (isNaN(dataObj)) return dataStr; // Retorna original se falhar
            
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
            const ano = dataObj.getFullYear();
            return `${dia}/${mes}/${ano}`;
        } catch (e) {
            return dataStr;
        }
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

    const handleConfirmStatus = (leadId) => {
        const novoStatus = statusSelecionado[leadId];
        const currentLead = leads.find(l => l.id === leadId);
        
        if (!novoStatus) {
            alert('Selecione um status.');
            return;
        }
        
        // A função onUpdateStatus deve estar sendo passada como prop e deve atualizar o lead no Google Sheets
        // E automaticamente atualizar o estado principal (leads)
        onUpdateStatus(leadId, novoStatus, currentLead.phone);
        
        // Lógica para forçar a observação
        const hasNoObservacao = !currentLead.Observacao || currentLead.Observacao.trim() === '';
        
        if ((novoStatus === 'Em Contato' || novoStatus === 'Sem Contato' || novoStatus.startsWith('Agendado')) && hasNoObservacao) {
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: true }));
        } else {
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
        }
    };

    // -------------------------------------------------------------------------
    // 2.4. Paginação
    // -------------------------------------------------------------------------
    const leadsPorPagina = 10;
    const gerais = leadsFiltrados; // Leads já filtrados
    const totalPaginas = Math.max(1, Math.ceil(gerais.length / leadsPorPagina));
    const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
    const inicio = (paginaCorrigida - 1) * leadsPorPagina;
    const fim = inicio + leadsPorPagina;
    const leadsPagina = gerais.slice(inicio, fim);
    const usuariosAtivos = usuarios.filter((u) => u.Status === 'Ativo');
    const isAdmin = usuarioLogado?.tipo === 'Admin';
    
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
    
    // -------------------------------------------------------------------------
    // 2.5. Renderização
    // -------------------------------------------------------------------------

    return (
        <div className="p-4 relative min-h-screen">
            {/* Loader de Carregamento */}
            {isLoading && (
                <div className="fixed inset-0 bg-white flex justify-center items-center z-50 rounded-lg" style={{ opacity: 0.9 }}>
                    <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-600"></div>
                    <p className="ml-4 text-xl text-gray-700 font-semibold">Carregando Renovações...</p>
                </div>
            )}

            {/* Cabeçalho e Botão de Refresh */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Renovações ({gerais.length})</h1>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Sino de Notificação para Agendamentos de Hoje */}
                    {hasScheduledToday && (
                        <div
                            className="relative cursor-pointer"
                            onClick={() => setShowNotification(prev => !prev)}
                        >
                            <Bell size={24} className="text-red-500" />
                            <div className="absolute top-[-5px] right-[-5px] bg-red-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
                                1
                            </div>
                            {showNotification && (
                                <div className="absolute top-8 right-0 w-48 bg-white border border-red-300 rounded-lg p-3 shadow-xl z-10 text-center">
                                    <p className="text-sm text-red-700 font-semibold">Você tem agendamentos hoje!</p>
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        title='Clique para atualizar os dados de renovações'
                        onClick={handleRefreshLeads}
                        disabled={isLoading}
                        className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition duration-150 shadow-md disabled:opacity-50 flex items-center justify-center"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <RefreshCcw size={20} />
                        )}
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-100 rounded-lg shadow-inner">
                {/* Filtro por Nome */}
                <div className="flex gap-2 items-center flex-1 min-w-[200px]">
                    <button
                        onClick={aplicarFiltroNome}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 text-sm font-semibold"
                    >
                        Nome
                    </button>
                    <input
                        type="text"
                        placeholder="Nome do cliente"
                        value={nomeInput}
                        onChange={(e) => setNomeInput(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm w-full"
                    />
                </div>

                {/* Filtro por Data */}
                <div className="flex gap-2 items-center flex-1 min-w-[180px]">
                    <button
                        onClick={aplicarFiltroData}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 text-sm font-semibold"
                    >
                        Mês/Ano
                    </button>
                    <input
                        type="month"
                        value={dataInput}
                        onChange={(e) => setDataInput(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm w-full"
                        title="Filtrar pelo mês e ano de criação"
                    />
                </div>

                {/* Botões de Filtro por Status */}
                <div className="flex flex-wrap gap-2 flex-grow justify-end">
                    <button
                        onClick={() => aplicarFiltroStatus('Em Contato')}
                        className={`px-3 py-2 rounded-lg text-white font-semibold transition duration-150 text-sm ${filtroStatus === 'Em Contato' ? 'bg-yellow-700 shadow-inner' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                    >
                        Em Contato
                    </button>
                    <button
                        onClick={() => aplicarFiltroStatus('Sem Contato')}
                        className={`px-3 py-2 rounded-lg text-white font-semibold transition duration-150 text-sm ${filtroStatus === 'Sem Contato' ? 'bg-gray-700 shadow-inner' : 'bg-gray-500 hover:bg-gray-600'}`}
                    >
                        Sem Contato
                    </button>
                    <button
                        onClick={() => aplicarFiltroStatus('Agendado')}
                        className={`px-3 py-2 rounded-lg text-white font-semibold transition duration-150 text-sm ${filtroStatus === 'Agendado' ? 'bg-blue-700 shadow-inner' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        Agendados
                    </button>
                    <button
                        onClick={() => aplicarFiltroStatus(null)}
                        className={`px-3 py-2 rounded-lg font-semibold transition duration-150 text-sm ${filtroStatus === null ? 'bg-red-700 text-white shadow-inner' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
                    >
                        Limpar
                    </button>
                </div>
            </div>
            
            {/* Conteúdo Principal */}
            {isLoading ? (
                null
            ) : gerais.length === 0 ? (
                <p className="text-center text-lg text-gray-600 p-10 bg-white rounded-xl shadow-lg">Não há renovações para exibir com os filtros aplicados.</p>
            ) : (
                <>
                    {/* Lista de Renovações (Cards) */}
                    <div className="grid gap-6">
                        {leadsPagina.map((lead) => {
                            const responsavel = usuarios.find((u) => u.nome === lead.Responsavel);
                            const currentStatus = statusSelecionado[lead.id] || lead.Status || STATUS_OPTIONS[0];

                            return (
                                <div
                                    key={lead.id}
                                    className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-indigo-500 relative transition-all hover:shadow-xl"
                                >
                                    {/* Dados do Card (1) - Informações principais */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 border-b pb-4 mb-4">
                                        
                                        {/* Nome / Telefone */}
                                        <div className="col-span-1">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Cliente / Contato</p>
                                            <p className="font-bold text-gray-900 text-lg break-words">{lead.Name}</p>
                                            <p className="text-sm text-gray-600">📞 {lead.Phone}</p>
                                        </div>

                                        {/* Veículo / Seguradora */}
                                        <div className="col-span-1 border-l pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Veículo / Seguradora</p>
                                            <p className="text-base text-gray-800">🚗 {lead.VehicleModel} ({lead.VehicleYearModel})</p>
                                            <p className="text-sm text-gray-600">🛡️ {lead.Seguradora}</p>
                                        </div>

                                        {/* Prêmio Líquido / Comissão */}
                                        <div className="col-span-1 border-l pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Prêmio Liquido</p>
                                            <p className="font-bold text-lg text-green-600">R$ {lead.PremioLiquido || '0,00'}</p>
                                            <p className="text-sm text-gray-600">Comissão: {lead.Comissao || '0,00'}</p>
                                        </div>

                                        {/* Vigência Final */}
                                        <div className="col-span-1 border-l pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Vigência Final</p>
                                            <p className="font-bold text-lg text-red-500">🗓️ {formatarData(lead.VigenciaFinal)}</p>
                                        </div>
                                    </div>

                                    {/* Seções de Interação: Status, Atribuição e Observações */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">

                                        {/* Bloco de Status (2) */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg shadow-sm'>
                                            <label htmlFor={`status-${lead.id}`} className="block mb-2 font-bold text-sm text-gray-700">
                                                Status Atual: 
                                                <span className={`ml-2 text-base font-extrabold ${lead.Status === 'Fechado' ? 'text-green-600' : 'text-indigo-600'}`}>
                                                    {lead.Status}
                                                </span>
                                            </label>
                                            <div className="flex gap-2">
                                                <select
                                                    id={`status-${lead.id}`}
                                                    value={currentStatus}
                                                    onChange={(e) => setStatusSelecionado(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    {STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleConfirmStatus(lead.id)}
                                                    disabled={currentStatus === lead.Status || isLoading || !lead.Responsavel}
                                                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                                    title={!lead.Responsavel ? "Atribua um responsável primeiro" : (currentStatus === lead.Status ? "Status já é o atual" : "Confirmar novo status")}
                                                >
                                                    Confirmar
                                                </button>
                                            </div>
                                        </div>

                                        {/* Atribuição de Responsável (3) */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg shadow-sm'>
                                            <label className="block mb-2 font-bold text-sm text-gray-700">Atribuição de Usuário</label>
                                            {lead.Responsavel && responsavel ? (
                                                <div className="flex items-center justify-between bg-green-100 p-2 rounded-lg border border-green-200">
                                                    <p className="text-green-700 font-semibold text-sm">
                                                        Atribuído a: <strong>{responsavel.nome}</strong>
                                                    </p>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleAlterar(lead.id)}
                                                            className="px-3 py-1 bg-yellow-500 text-black text-xs rounded-lg hover:bg-yellow-600 transition duration-150 font-medium"
                                                        >
                                                            Alterar
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 items-center">
                                                    <select
                                                        value={selecionados[lead.id] || ''}
                                                        onChange={(e) => handleSelect(lead.id, e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-green-500 focus:border-green-500"
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
                                                        disabled={!selecionados[lead.id] || isLoading}
                                                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150 disabled:bg-gray-400 text-sm whitespace-nowrap"
                                                    >
                                                        Enviar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Bloco de Observações (4) */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg shadow-sm'>
                                            <label htmlFor={`observacao-${lead.id}`} className="block mb-2 font-bold text-sm text-gray-700">
                                                Observações:
                                            </label>
                                            <textarea
                                                id={`observacao-${lead.id}`}
                                                value={observacoes[lead.id] || ''}
                                                onChange={(e) => handleObservacaoChange(lead.id, e.target.value)}
                                                placeholder="Adicione suas observações aqui..."
                                                rows="3"
                                                disabled={!isEditingObservacao[lead.id] || isLoading}
                                                className={`w-full p-2 border rounded-lg resize-y text-sm transition-colors ${
                                                    isEditingObservacao[lead.id] ? 'bg-white border-indigo-300 focus:ring-indigo-500' : 'bg-gray-200 border-gray-300 cursor-not-allowed'
                                                }`}
                                            ></textarea>
                                            <div className="flex justify-end mt-2">
                                                {isEditingObservacao[lead.id] ? (
                                                    <button
                                                        onClick={() => handleSalvarObservacao(lead.id)}
                                                        disabled={isLoading}
                                                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-gray-400 text-sm"
                                                    >
                                                        Salvar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAlterarObservacao(lead.id)}
                                                        className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition duration-150 text-sm"
                                                    >
                                                        Editar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data de Criação (Rodapé do Card) */}
                                    <div className="absolute top-3 right-5 text-xs text-gray-400 italic" title={`Criado em: ${formatarData(lead.Data)}`}>
                                        Criado em: {formatarData(lead.Data)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Paginação */}
                    <div className="flex justify-center items-center gap-4 mt-8 pb-10">
                        <button
                            onClick={handlePaginaAnterior}
                            disabled={paginaCorrigida <= 1 || isLoading}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition duration-150 bg-white shadow-sm"
                        >
                            Anterior
                        </button>
                        <span className="text-gray-700 font-medium">
                            Página {paginaCorrigida} de {totalPaginas}
                        </span>
                        <button
                            onClick={handlePaginaProxima}
                            disabled={paginaCorrigida >= totalPaginas || isLoading}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition duration-150 bg-white shadow-sm"
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
