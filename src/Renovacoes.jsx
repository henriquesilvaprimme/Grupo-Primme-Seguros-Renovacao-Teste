import React, { useState, useEffect } from 'react';
// Não precisamos mais do componente 'Lead', pois os dados são renderizados diretamente no card.
import { RefreshCcw, Bell } from 'lucide-react';

// ===============================================
// 1. CONFIGURAÇÃO E CONSTANTES
// ===============================================
const SHEET_NAME = 'Renovações';

// URL base do seu Google Apps Script
const GOOGLE_SHEETS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGP9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99a/exec';

// URLs com o parâmetro 'sheet' adicionado para apontar para a nova aba
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?sheet=${SHEET_NAME}`;
const ALTERAR_ATRIBUIDO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?v=alterar_atribuido&sheet=${SHEET_NAME}`;
const SALVAR_OBSERVACAO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?action=salvarObservacao&sheet=${SHEET_NAME}`;

// Opções de Status necessárias para o novo layout
const STATUS_OPTIONS = [
    'Aguardando Contato',
    'Em Contato',
    'Agendado',
    'Fechado',
    'Perdido'
];

// ===============================================
// 2. COMPONENTE RENOVACOES
// ===============================================
const Renovacoes = ({ leads, usuarios, onUpdateStatus, transferirLead, usuarioLogado, fetchLeadsFromSheet, scrollContainerRef }) => {
    // 💡 Ajustando a desestruturação de leads para o novo layout (ex: lead.Data, lead.Responsavel)
    // ⚠️ ATENÇÃO: Os nomes das propriedades dos leads (`Responsavel`, `Data`, etc.) foram mantidos
    // de acordo com a sua estrutura de retorno no JSX, mas podem precisar de ajuste
    // se diferirem das props reais (`responsavel`, `createdAt`).
    // Neste código, usarei as novas (Capitalizadas) para o JSX e as antigas (minúsculas)
    // na lógica, assumindo que `fetchLeadsFromSheet` faz o mapeamento,
    // ou que você ajustará os nomes no componente pai.
    
    // 💡 Novo estado para o status selecionado, necessário para o novo layout de dropdown
    const [statusSelecionado, setStatusSelecionado] = useState({});

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
        // Inicialização de filtros e estados
        const today = new Date();
        const ano = today.getFullYear();
        const mes = String(today.getMonth() + 1).padStart(2, '0');
        const mesAnoAtual = `${ano}-${mes}`;
        
        setDataInput(mesAnoAtual);
        setFiltroData(mesAnoAtual);

        const initialObservacoes = {};
        const initialIsEditingObservacao = {};
        const initialStatusSelecionado = {};

        leads.forEach(lead => {
            initialObservacoes[lead.id] = lead.observacao || '';
            // Permite edição se não houver observação ou se estiver vazia
            initialIsEditingObservacao[lead.id] = !lead.observacao || lead.observacao.trim() === ''; 
            initialStatusSelecionado[lead.id] = lead.status || STATUS_OPTIONS[0];
        });

        setObservacoes(initialObservacoes);
        setIsEditingObservacao(initialIsEditingObservacao);
        setStatusSelecionado(initialStatusSelecionado); // Inicializa o estado de seleção
    }, [leads]);

    useEffect(() => {
        // Lógica de Agendamentos de Hoje (Notificação)
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('pt-BR');

        const todayAppointments = leads.filter(lead => {
            if (!lead.status?.startsWith('Agendado')) return false;
            const statusDateStr = lead.status.split(' - ')[1];
            if (!statusDateStr) return false;

            const [dia, mes, ano] = statusDateStr.split('/');
            const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`); 
            const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');

            return statusDateFormatted === todayFormatted;
        });

        setHasScheduledToday(todayAppointments.length > 0);
    }, [leads]);

    // -------------------------------------------------------------------------
    // 3. Funções de Lógica e Dados
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

    const handleConfirmStatus = (leadId) => {
        const novoStatus = statusSelecionado[leadId];
        const lead = leads.find(l => l.id === leadId);

        if (!novoStatus) return;

        // onUpdateStatus já trata a chamada à API e o refresh, passando o phone
        onUpdateStatus(leadId, novoStatus, lead.phone); 
        
        // Lógica para abrir observação se o novo status exigir
        const currentLead = leads.find(l => l.id === leadId);
        const hasNoObservacao = !currentLead.observacao || currentLead.observacao.trim() === '';

        if ((novoStatus === 'Em Contato' || novoStatus === 'Sem Contato' || novoStatus.startsWith('Agendado')) && hasNoObservacao) {
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: true }));
        } else if (novoStatus === 'Em Contato' || novoStatus === 'Sem Contato' || novoStatus.startsWith('Agendado')) {
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
        } else {
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
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
        
        const lead = leads.find((l) => l.id === leadId);
        const responsavelUsuario = usuarios.find(u => u.id === userId)?.nome || '';

        // 1. Atualiza o estado local temporariamente (Opcional)
        transferirLead(leadId, userId);

        // 2. Prepara e envia para o Google Apps Script
        const leadAtualizado = { 
            ...lead, 
            usuarioId: userId, 
            // 💡 Usando o nome do responsável, pois é o que o GAS deve esperar.
            Responsavel: responsavelUsuario 
        };
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

    // -------------------------------------------------------------------------
    // 4. Lógica de Filtros e Paginação
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
    };

    const nomeContemFiltro = (leadNome, filtroNome) => {
        if (!filtroNome) return true;
        if (!leadNome) return false;
        const nomeNormalizado = normalizarTexto(leadNome);
        const filtroNormalizado = normalizarTexto(filtroNome);
        return nomeNormalizado.includes(filtroNormalizado);
    };

    const gerais = leads.filter((lead) => {
        // Ignora Fechado/Perdido, a menos que o filtro de status seja explicitamente um deles.
        if (lead.status === 'Fechado' || lead.status === 'Perdido') {
            if (filtroStatus === 'Fechado' || filtroStatus === 'Perdido') {
                return lead.status === filtroStatus;
            }
            return false;
        }

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

        // 💡 Assumindo que o campo de data de criação no lead é `Data` (minúscula) ou `createdAt`
        // Mantenho a checagem com `createdAt` por coerência com o código anterior, 
        // mas o layout usa `lead.Data`. Vou manter a lógica com o padrão esperado do backend (`createdAt`).
        if (filtroData) {
            const leadMesAno = lead.createdAt ? lead.createdAt.substring(0, 7) : ''; 
            return leadMesAno === filtroData;
        }

        if (filtroNome) {
            return nomeContemFiltro(lead.name, filtroNome);
        }

        return true;
    });

    const leadsPorPagina = 10;
    const totalPaginas = Math.max(1, Math.ceil(gerais.length / leadsPorPagina));
    const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
    const usuariosAtivos = usuarios.filter((u) => u.status === 'Ativo');
    const isAdmin = usuarioLogado?.tipo === 'Admin';

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
        // Tenta interpretar o formato DD/MM/YYYY
        if (dataStr.includes('/')) {
            const partes = dataStr.split('/');
            data = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
        } else if (dataStr.includes('-') && dataStr.length === 10) {
            // Formato YYYY-MM-DD
            const partes = dataStr.split('-');
            data = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        } else {
            // Tenta formato ISO ou outro
            data = new Date(dataStr);
        }

        if (isNaN(data.getTime())) {
            return dataStr; // Retorna string original se a data for inválida
        }
        return data.toLocaleDateString('pt-BR');
    };

    const inicio = (paginaCorrigida - 1) * leadsPorPagina;
    const fim = inicio + leadsPorPagina;
    const leadsPagina = gerais.slice(inicio, fim);

    // -------------------------------------------------------------------------
    // 5. Renderização (Novo Layout Tailwind)
    // -------------------------------------------------------------------------

    return (
        <div className="p-4 relative min-h-screen bg-gray-50">
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
                <div className="flex items-center gap-4">
                    {/* Botão de Notificação */}
                    {hasScheduledToday && (
                        <div
                            className="relative cursor-pointer"
                            onClick={() => setShowNotification(!showNotification)}
                            title="Você tem agendamentos para hoje!"
                        >
                            <Bell size={32} className="text-indigo-600 animate-pulse" />
                            <div className="absolute top-[-5px] right-[-5px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                1
                            </div>
                            {showNotification && (
                                <div className="absolute top-10 right-0 w-60 bg-white border border-red-300 rounded-lg p-3 shadow-lg z-10 text-sm">
                                    <p className="font-semibold text-red-600">🔔 Alerta de Agendamento:</p>
                                    <p className="text-gray-700">Você tem renovações agendadas para hoje!</p>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Botão de Refresh */}
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
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-3 p-4 bg-white rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch w-full md:w-auto">
                    {/* Filtro por Nome */}
                    <input
                        type="text"
                        placeholder="Filtrar por nome do cliente..."
                        value={nomeInput}
                        onChange={(e) => setNomeInput(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg w-full sm:w-64"
                        title="Filtrar renovações pelo nome (contém)"
                    />
                    <button
                        onClick={aplicarFiltroNome}
                        className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-150 w-full sm:w-auto"
                    >
                        Filtrar Nome
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch w-full md:w-auto">
                    {/* Filtro por Data */}
                    <input
                        type="month"
                        value={dataInput}
                        onChange={(e) => setDataInput(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg cursor-pointer w-full sm:w-40"
                        title="Filtrar renovações pelo mês e ano de criação"
                    />
                    <button
                        onClick={aplicarFiltroData}
                        className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-150 w-full sm:w-auto"
                    >
                        Filtrar Mês
                    </button>
                </div>
            </div>

            {/* Filtros Rápidos de Status */}
            <div className="flex justify-start gap-3 mb-6 flex-wrap p-4 bg-white rounded-xl shadow-md">
                <button
                    onClick={() => aplicarFiltroStatus(null)}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors ${!filtroStatus ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    Todos
                </button>
                <button
                    onClick={() => aplicarFiltroStatus('Em Contato')}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors ${filtroStatus === 'Em Contato' ? 'bg-yellow-600 text-white shadow-lg' : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'}`}
                >
                    Em Contato
                </button>
                <button
                    onClick={() => aplicarFiltroStatus('Sem Contato')}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors ${filtroStatus === 'Sem Contato' ? 'bg-gray-600 text-white shadow-lg' : 'bg-gray-400 text-gray-800 hover:bg-gray-500'}`}
                >
                    Sem Contato
                </button>
                <button
                    onClick={() => aplicarFiltroStatus('Agendado')}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors ${filtroStatus === 'Agendado' ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-400 text-white hover:bg-blue-500'}`}
                >
                    Agendados
                </button>
                <button
                    onClick={() => aplicarFiltroStatus('Fechado')}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors ${filtroStatus === 'Fechado' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-400 text-white hover:bg-green-500'}`}
                >
                    Fechados
                </button>
                <button
                    onClick={() => aplicarFiltroStatus('Perdido')}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors ${filtroStatus === 'Perdido' ? 'bg-red-600 text-white shadow-lg' : 'bg-red-400 text-white hover:bg-red-500'}`}
                >
                    Perdidos
                </button>
            </div>


            {/* Conteúdo Principal */}
            {isLoading ? (
                null
            ) : gerais.length === 0 ? (
                <p className="text-center text-lg text-gray-600 p-10 bg-white rounded-xl shadow-lg">Não há renovações para exibir com os filtros aplicados. 😥</p>
            ) : (
                <>
                    {/* Lista de Renovações (Cards) */}
                    <div className="grid gap-6">
                        {leadsPagina.map((lead) => {
                            // 💡 Mapeamento de nomes de campos para o seu layout (usando lead.Responsavel, lead.Data, etc.)
                            const responsavel = usuarios.find((u) => u.nome === lead.Responsavel);
                            const currentStatus = statusSelecionado[lead.id] || lead.status || STATUS_OPTIONS[0];

                            return (
                                <div
                                    key={lead.id}
                                    className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-indigo-500 relative transition-all hover:shadow-xl"
                                >
                                    {/* Data de Criação (Rodapé do Card) */}
                                    <div className="absolute top-3 right-5 text-xs text-gray-400 italic" title={`Criado em: ${formatarData(lead.createdAt)}`}>
                                        Criado em: {formatarData(lead.createdAt)}
                                    </div>

                                    {/* Dados do Card (1) */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4 mb-4">
                                        
                                        {/* Nome / Telefone */}
                                        <div className="md:col-span-1">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Cliente / Contato</p>
                                            <p className="font-bold text-gray-900 text-lg">{lead.name}</p>
                                            <p className="text-sm text-gray-600">📞 {lead.phone}</p>
                                        </div>

                                        {/* Veículo / Seguradora */}
                                        <div className="md:col-span-1 border-l pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Veículo / Seguradora</p>
                                            <p className="text-base text-gray-800">🚗 {lead.vehicleModel} ({lead.vehicleYearModel})</p>
                                            <p className="text-sm text-gray-600">🛡️ {lead.Seguradora}</p>
                                        </div>

                                        {/* Prêmio Líquido / Comissão */}
                                        <div className="md:col-span-1 border-l pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Prêmio Liquido</p>
                                            <p className="font-bold text-lg text-green-600">R$ {lead.PremioLiquido || '0,00'}</p>
                                            <p className="text-sm text-gray-600">Comissão: {lead.Comissao || '0,00'}%</p>
                                        </div>

                                        {/* Vigência Final */}
                                        <div className="md:col-span-1 border-l pl-4 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500">Vigência Final</p>
                                            <p className="font-bold text-lg text-red-500">🗓️ {formatarData(lead.VigenciaFinal)}</p>
                                        </div>
                                    </div>

                                    {/* Seções de Interação: Status, Atribuição e Observações */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">

                                        {/* Bloco de Status (2) - Seleção de status e suas funções */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg border border-gray-100'>
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
                                                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                                    title={!lead.Responsavel ? "Atribua um responsável primeiro" : (currentStatus === lead.status ? "Status já é o atual" : "Confirmar novo status")}
                                                >
                                                    Confirmar
                                                </button>
                                            </div>
                                        </div>

                                        {/* Atribuição de Responsável (3) - Caixa de atribuição e suas funções */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg border border-gray-100'>
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
                                        
                                        {/* Bloco de Observações (4) - Caixa de observações e suas funções */}
                                        <div className='lg:col-span-1 p-3 bg-gray-50 rounded-lg border border-gray-100'>
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
                                                className={`w-full p-2 border rounded-lg resize-y text-sm transition-colors focus:outline-none ${
                                                    isEditingObservacao[lead.id] ? 'bg-white border-indigo-300 focus:ring-indigo-500' : 'bg-gray-200 border-gray-300 cursor-not-allowed'
                                                }`}
                                            ></textarea>
                                            <div className="flex justify-end mt-2">
                                                {isEditingObservacao[lead.id] ? (
                                                    <button
                                                        onClick={() => handleSalvarObservacao(lead.id)}
                                                        disabled={isLoading || !observacoes[lead.id]?.trim()}
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
