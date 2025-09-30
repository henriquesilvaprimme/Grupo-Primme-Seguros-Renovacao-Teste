import React, { useState, useEffect } from 'react';
import { RefreshCcw, Bell } from 'lucide-react'; // Bell adicionado para o filtro de agendamento de hoje

// URLs de Script do Google Apps Script (GAS)
const ALTERAR_ATRIBUIDO_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH3p6PWEZo2eH-WZcs99yNaA/exec?v=alterar_atribuido';
const SHEET_NAME = 'Renovações'; // Adicionado para uso em fetchLeadsFromSheet

// Opções de Status
const STATUS_OPTIONS = [
    ' ',
    'Em Contato',
    'Sem Contato',
    'Fechado',
    'Perdido',
];

const Renovacoes = ({ leads, usuarios, onUpdateStatus, transferirLead, usuarioLogado, fetchLeadsFromSheet, scrollContainerRef, salvarObservacao }) => {
    // --- ESTADOS DE ATRIBUIÇÃO E DADOS ---
    const [selecionados, setSelecionados] = useState({});
    const [observacoes, setObservacoes] = useState({});
    const [isEditingObservacao, setIsEditingObservacao] = useState({});
    const [statusSelecionado, setStatusSelecionado] = useState({});

    // --- ESTADOS DE INTERFACE E CONTROLE ---
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    // --- ESTADOS DE FILTRO (RESTAURADOS) ---
    const [dataInput, setDataInput] = useState('');
    const [filtroData, setFiltroData] = useState('');
    const [nomeInput, setNomeInput] = useState('');
    const [filtroNome, setFiltroNome] = useState('');
    const [filtroStatus, setFiltroStatus] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [hasScheduledToday, setHasScheduledToday] = useState(false);

    // -------------------------------------------------------------------------
    // 1. Efeitos e Inicialização
    // -------------------------------------------------------------------------

    useEffect(() => {
        // Inicializa filtro de data para o mês atual ao carregar
        const today = new Date();
        const ano = today.getFullYear();
        const mes = String(today.getMonth() + 1).padStart(2, '0');
        const mesAnoAtual = `${ano}-${mes}`;
        
        setDataInput(mesAnoAtual);
        setFiltroData(mesAnoAtual);

        const initialObservacoes = {};
        const initialIsEditingObservacao = {};
        const initialStatus = {};
        let scheduledToday = false;

        leads.forEach(lead => {
            initialObservacoes[lead.id] = lead.observacao || '';
            initialIsEditingObservacao[lead.id] = !lead.observacao || lead.observacao.trim() === '';
            initialStatus[lead.id] = lead.status || STATUS_OPTIONS[0];

            // Verifica se tem agendamento para hoje
            if (lead.status && lead.status.startsWith('Agendado')) {
                const statusDateStr = lead.status.split(' - ')[1];
                if (statusDateStr) {
                    const [dia, mes, ano] = statusDateStr.split('/');
                    const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
                    if (statusDate.toLocaleDateString('pt-BR') === today.toLocaleDateString('pt-BR')) {
                        scheduledToday = true;
                    }
                }
            }
        });
        setObservacoes(initialObservacoes);
        setIsEditingObservacao(initialIsEditingObservacao);
        setStatusSelecionado(initialStatus);
        setHasScheduledToday(scheduledToday);

    }, [leads]);

    // -------------------------------------------------------------------------
    // 2. Funções de Atribuição (Caixa de Atribuição de Usuário e suas Funções)
    // -------------------------------------------------------------------------

    const enviarLeadAtualizado = async (lead) => {
        try {
            // O parâmetro 'sheet' é importante se o GAS usa a mesma URL para abas diferentes
            const urlWithSheet = `${ALTERAR_ATRIBUIDO_SCRIPT_URL}&sheet=${SHEET_NAME}`; 
            
            await fetch(urlWithSheet, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(lead),
                headers: { 'Content-Type': 'application/json' },
            });
            fetchLeadsFromSheet();
        } catch (error) {
            console.error('Erro ao enviar lead (atribuição):', error);
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
            alert('Selecione um usuário antes de enviar.');
            return;
        }
        transferirLead(leadId, userId);
        const lead = leads.find((l) => l.id === leadId);
        const usuarioAtribuido = usuarios.find(u => u.id === userId);

        if (lead && usuarioAtribuido) {
            // Garante que o Responsavel seja o nome
            const leadAtualizado = { ...lead, usuarioId: userId, Responsavel: usuarioAtribuido.nome };
            enviarLeadAtualizado(leadAtualizado);
        }
    };

    const handleAlterar = (leadId) => {
        setSelecionados((prev) => ({
            ...prev,
            [leadId]: '',
        }));
        transferirLead(leadId, null);
        
        const lead = leads.find((l) => l.id === leadId);
        if (lead) {
            const leadDesatribuido = { ...lead, usuarioId: null, Responsavel: '' };
            enviarLeadAtualizado(leadDesatribuido);
        }
    };

    // -------------------------------------------------------------------------
    // 3. Funções de Status (Caixa de Seleção de Status e suas Funções)
    // -------------------------------------------------------------------------

    const handleConfirmStatus = (leadId) => {
        const novoStatus = statusSelecionado[leadId];
        const currentLead = leads.find(l => l.id === leadId);
        
        if (!currentLead) return;

        onUpdateStatus(leadId, novoStatus, currentLead.phone);
        
        // Lógica para forçar a observação se o status for relevante
        const status = novoStatus || '';
        const hasNoObservacao = !currentLead?.observacao || currentLead.observacao.trim() === '';
        
        if ((status === 'Em Contato' || status === 'Sem Contato' || status.startsWith('Agendado')) && hasNoObservacao) {
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: true }));
        } else {
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
        }

        fetchLeadsFromSheet();
    };

    // -------------------------------------------------------------------------
    // 4. Funções de Observações (Caixa de Observações e suas Funções)
    // -------------------------------------------------------------------------
    
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
            // A prop 'salvarObservacao' é usada para chamar a função no componente pai
            await salvarObservacao(leadId, observacaoTexto, SHEET_NAME); 
            
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
            fetchLeadsFromSheet(); 
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

    // -------------------------------------------------------------------------
    // 5. Funções de Filtro (RESTAURADO)
    // -------------------------------------------------------------------------

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
        setShowNotification(false); // Esconde a notificação ao aplicar o filtro
    };

    const isSameMonthAndYear = (leadDateStr, filtroMesAno) => {
        if (!filtroMesAno) return true;
        if (!leadDateStr) return false;
        
        // Assume que leadDateStr está no formato YYYY-MM-DD
        const leadMesAno = leadDateStr.substring(0, 7);
        return leadMesAno === filtroMesAno;
    };

    const nomeContemFiltro = (leadNome, filtroNome) => {
        if (!filtroNome) return true;
        if (!leadNome) return false;
        const nomeNormalizado = normalizarTexto(leadNome);
        const filtroNormalizado = normalizarTexto(filtroNome);
        return nomeNormalizado.includes(filtroNormalizado);
    };

    // Aplica todos os filtros aos leads
    const leadsFiltrados = leads.filter((lead) => {
        // Exclui Fechado/Perdido (Regra de Negócio Padrão)
        if (lead.status === 'Fechado' || lead.status === 'Perdido') return false;

        // Filtro por Status
        if (filtroStatus) {
            if (filtroStatus === 'Agendado') {
                const today = new Date();
                const todayFormatted = today.toLocaleDateString('pt-BR');
                const statusDateStr = lead.status.split(' - ')[1];
                if (!statusDateStr) return false;
                const [dia, mes, ano] = statusDateStr.split('/');
                // Cria data no formato YYYY-MM-DD para comparação precisa
                const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`); 
                const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');
                return lead.status.startsWith('Agendado') && statusDateFormatted === todayFormatted;
            }
            return lead.status === filtroStatus;
        }

        // Filtro por Data (Mês/Ano de Criação)
        if (filtroData) {
            return isSameMonthAndYear(lead.Data, filtroData); // Assumindo que lead.Data é a data de criação
        }

        // Filtro por Nome
        if (filtroNome) {
            return nomeContemFiltro(lead.name, filtroNome);
        }

        return true;
    });
    
    // -------------------------------------------------------------------------
    // 6. Funções Auxiliares e Paginação
    // -------------------------------------------------------------------------

    const handleRefreshLeads = async () => {
        setIsLoading(true);
        try {
            await fetchLeadsFromSheet(); 
            // Re-inicializa o estado de edição de observação com os novos leads
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
    const gerais = leadsFiltrados; // Usa os leads filtrados para o cálculo da páginação
    const totalPaginas = Math.max(1, Math.ceil(gerais.length / leadsPorPagina));
    const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
    const usuariosAtivos = usuarios.filter((u) => u.status === 'Ativo');
    const isAdmin = usuarioLogado?.tipo === 'Admin';
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
            // Assumo que o formato DD/MM/YYYY ou DD/MM/YY
            const ano = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
            data = new Date(parseInt(ano), parseInt(partes[1]) - 1, parseInt(partes[0]));
        } else if (dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            // Formato YYYY-MM-DD
            const parts = dataStr.substring(0, 10).split('-');
            data = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
            data = new Date(dataStr);
        }

        if (isNaN(data.getTime())) return '';
        return data.toLocaleDateString('pt-BR'); 
    };

    // -------------------------------------------------------------------------
    // 7. Renderização com Layout Enviado
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

            {/* Cabeçalho, Refresh e FILTROS (RESTAURADO) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 flex-wrap gap-4 bg-gray-50 p-4 rounded-xl shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    Renovações ({gerais.length})
                    <button
                        title='Clique para atualizar os dados de renovações'
                        onClick={handleRefreshLeads}
                        disabled={isLoading}
                        className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition duration-150 shadow-md disabled:opacity-50 flex items-center justify-center w-10 h-10"
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
                </h1>
                
                {/* Controles de Filtro */}
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Filtro por Nome */}
                    <div className="flex gap-2 items-center">
                        <input
                            type="text"
                            placeholder="Filtrar por nome"
                            value={nomeInput}
                            onChange={(e) => setNomeInput(e.target.value)}
                            className="p-2 rounded-lg border border-gray-300 w-40 text-sm"
                            title="Filtrar renovações pelo nome (contém)"
                        />
                        <button
                            onClick={aplicarFiltroNome}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg px-4 py-2 cursor-pointer whitespace-nowrap text-sm font-medium"
                        >
                            Filtrar Nome
                        </button>
                    </div>

                    {/* Filtro por Mês/Ano */}
                    <div className="flex gap-2 items-center">
                        <input
                            type="month"
                            value={dataInput}
                            onChange={(e) => setDataInput(e.target.value)}
                            className="p-2 rounded-lg border border-gray-300 cursor-pointer text-sm"
                            title="Filtrar renovações pelo mês e ano de criação"
                        />
                        <button
                            onClick={aplicarFiltroData}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg px-4 py-2 cursor-pointer text-sm font-medium"
                        >
                            Filtrar Mês
                        </button>
                    </div>

                    {/* Notificação de Agendamento Hoje (Sino) */}
                    {hasScheduledToday && (
                        <div
                            className="relative cursor-pointer p-1"
                            onClick={() => aplicarFiltroStatus('Agendado')}
                            title="Você tem agendamentos para hoje!"
                        >
                            <Bell size={32} className="text-red-600 animate-pulse" />
                            <div className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold ring-2 ring-white">!</div>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTÕES DE STATUS (RESTAURADO) */}
            <div className="flex justify-start gap-3 mb-6 flex-wrap">
                <button
                    onClick={() => aplicarFiltroStatus(null)}
                    className={`px-4 py-2 rounded-lg font-bold transition duration-200 text-sm ${
                        filtroStatus === null
                            ? 'bg-indigo-600 text-white shadow-inner shadow-black/30'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => aplicarFiltroStatus('Em Contato')}
                    className={`px-4 py-2 rounded-lg font-bold transition duration-200 text-sm ${
                        filtroStatus === 'Em Contato'
                            ? 'bg-orange-600 text-white shadow-inner shadow-black/30'
                            : 'bg-orange-400 hover:bg-orange-600 text-white'
                    }`}
                >
                    Em Contato
                </button>
                <button
                    onClick={() => aplicarFiltroStatus('Sem Contato')}
                    className={`px-4 py-2 rounded-lg font-bold transition duration-200 text-sm ${
                        filtroStatus === 'Sem Contato'
                            ? 'bg-gray-700 text-white shadow-inner shadow-black/30'
                            : 'bg-gray-500 hover:bg-gray-700 text-white'
                    }`}
                >
                    Sem Contato
                </button>
                {hasScheduledToday && (
                    <button
                        onClick={() => aplicarFiltroStatus('Agendado')}
                        className={`px-4 py-2 rounded-lg font-bold transition duration-200 text-sm ${
                            filtroStatus === 'Agendado'
                                ? 'bg-red-700 text-white shadow-inner shadow-black/30'
                                : 'bg-red-500 hover:bg-red-700 text-white'
                        }`}
                    >
                        Agendados Hoje
                    </button>
                )}
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
                            const currentStatus = statusSelecionado[lead.id] || lead.status || STATUS_OPTIONS[0];

                            return (
                                <div
                                    key={lead.id}
                                    className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-indigo-500 relative transition-all hover:shadow-xl"
                                >
                                    {/* Data de Criação (Rodapé do Card) - Movi para o topo do seu layout */}
                                    <div className="absolute top-3 right-5 text-xs text-gray-400 italic" title={`Criado em: ${formatarData(lead.Data)}`}>
                                        Criado em: {formatarData(lead.Data)}
                                    </div>
                                    
                                    {/* Dados do Card (1) - Layout de 4 Colunas */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4 mb-4">
                                        
                                        {/* Nome / Telefone */}
                                        <div className="md:col-span-1">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Cliente / Contato</p>
                                            <p className="font-bold text-gray-900 text-lg">{lead.name}</p>
                                            <p className="text-sm text-gray-600">📞 {lead.phone}</p>
                                        </div>

                                        {/* Veículo / Seguradora */}
                                        <div className="md:col-span-1 md:border-l md:pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Veículo / Seguradora</p>
                                            <p className="text-base text-gray-800">🚗 {lead.vehicleModel} ({lead.vehicleYearModel})</p>
                                            <p className="text-sm text-gray-600">🛡️ {lead.Seguradora}</p>
                                        </div>

                                        {/* Prêmio Líquido / Comissão */}
                                        <div className="md:col-span-1 md:border-l md:pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Prêmio Liquido</p>
                                            <p className="font-bold text-lg text-green-600">R$ {lead.PremioLiquido || '0,00'}</p>
                                            <p className="text-sm text-gray-600">Comissão: {lead.Comissao || '0,00'}</p>
                                        </div>

                                        {/* Vigência Final */}
                                        <div className="md:col-span-1 md:border-l md:pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Vigência Final</p>
                                            <p className="font-bold text-lg text-red-500">🗓️ {formatarData(lead.VigenciaFinal)}</p>
                                        </div>
                                    </div>

                                    {/* Seções de Interação: Status, Atribuição e Observações (Layout de 3 Colunas) */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">

                                        {/* Bloco de Status (2) */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg'>
                                            <label htmlFor={`status-${lead.id}`} className="block mb-2 font-bold text-sm text-gray-700">
                                                Alterar Status Atual: 
                                                <span className={`ml-2 text-base font-extrabold ${lead.status === 'Fechado' ? 'text-green-600' : 'text-indigo-600'}`}>
                                                    {lead.status}
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
                                                    disabled={currentStatus === lead.status || isLoading || !lead.Responsavel}
                                                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                                                    title={!lead.Responsavel ? "Atribua um responsável primeiro" : (currentStatus === lead.status ? "Status já é o atual" : "Confirmar novo status")}
                                                >
                                                    Confirmar
                                                </button>
                                            </div>
                                        </div>

                                        {/* Atribuição de Responsável (3) */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg'>
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
                                                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150 disabled:bg-gray-400 text-sm"
                                                    >
                                                        Enviar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Bloco de Observações (4) */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg'>
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
