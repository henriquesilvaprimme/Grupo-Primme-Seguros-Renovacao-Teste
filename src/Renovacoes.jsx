import React, { useState, useEffect, useMemo } from 'react';
import Lead from './components/Lead'; // O componente Lead é mantido
import { RefreshCcw, Bell, Filter, Save, Edit, User, Send, X, Calendar, Search } from 'lucide-react';

// ===============================================
// 1. CONFIGURAÇÃO PARA A ABA 'Renovações' (Mantida)
// ===============================================
const SHEET_NAME = 'Renovações';

// URL base do seu Google Apps Script
const GOOGLE_SHEETS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGP9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

// URLs com o parâmetro 'sheet' adicionado para apontar para a nova aba
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?sheet=${SHEET_NAME}`;
const ALTERAR_ATRIBUIDO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?v=alterar_atribuido&sheet=${SHEET_NAME}`;
const SALVAR_OBSERVACAO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?action=salvarObservacao&sheet=${SHEET_NAME}`;

// ===============================================
// 2. COMPONENTE RENOMEADO PARA 'Renovacoes' (Com Refatoração de Layout - Opção 2)
// ===============================================

// --- COMPONENTE AUXILIAR: Botão de Status Compacto ---
const StatusBadge = ({ status, onClick, filtroStatus, isScheduledToday }) => {
    let bgColor = 'bg-gray-100 text-gray-600 border border-gray-300';
    let ringColor = '';

    if (status === 'Em Contato') {
        bgColor = 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
        ringColor = 'ring-yellow-500';
    } else if (status === 'Sem Contato') {
        bgColor = 'bg-red-100 text-red-700 hover:bg-red-200';
        ringColor = 'ring-red-500';
    } else if (status === 'Agendado' && isScheduledToday) {
        bgColor = 'bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold';
        ringColor = 'ring-blue-500';
    }

    const isSelected = filtroStatus === status;

    return (
        <button
            onClick={() => onClick(status)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition duration-150 ease-in-out whitespace-nowrap shadow-sm 
                ${bgColor} ${isSelected ? `ring-2 ${ringColor} ring-offset-2` : ''}`}
        >
            {isScheduledToday && status === 'Agendado' ? `Agendados Hoje` : status}
        </button>
    );
};

// --- COMPONENTE PRINCIPAL: Renovacoes ---
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
    const [showFiltersDrawer, setShowFiltersDrawer] = useState(false); // NOVO ESTADO: Drawer
    const [hasScheduledToday, setHasScheduledToday] = useState(false);
    
    // --- LÓGICAS (MANTIDAS) ---
    useEffect(() => {
        // Inicializa com o mês e ano atual
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
        // Verifica agendamentos para hoje (para o sino e o filtro)
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
        return texto.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()@\+\?><\[\]\+]/g, '').replace(/\s+/g, ' ').trim();
    };

    const aplicarFiltroData = () => {
        setFiltroData(dataInput);
        setFiltroNome(''); setNomeInput(''); setFiltroStatus(null); setPaginaAtual(1);
        setShowFiltersDrawer(false); // Fecha o drawer após aplicar
    };

    const aplicarFiltroNome = () => {
        const filtroLimpo = nomeInput.trim();
        setFiltroNome(filtroLimpo);
        setFiltroData(''); setDataInput(''); setFiltroStatus(null); setPaginaAtual(1);
        setShowFiltersDrawer(false); // Fecha o drawer após aplicar
    };
    
    const aplicarFiltroStatus = (status) => {
        setFiltroStatus(status);
        setFiltroNome(''); setNomeInput(''); setFiltroData(''); setDataInput(''); setPaginaAtual(1);
        setShowFiltersDrawer(false); // Fecha o drawer após aplicar
    };
    
    const removerTodosFiltros = () => {
        setFiltroNome(''); setNomeInput('');
        setFiltroData(''); setDataInput('');
        setFiltroStatus(null);
        setPaginaAtual(1);
        setShowFiltersDrawer(false);
    };

    const nomeContemFiltro = (leadNome, filtroNome) => {
        if (!filtroNome) return true;
        if (!leadNome) return false;
        const nomeNormalizado = normalizarTexto(leadNome);
        const filtroNormalizado = normalizarTexto(filtroNome);
        return nomeNormalizado.includes(filtroNormalizado);
    };

    // --- Lógica de Filtro (useMemo) ---
    const gerais = useMemo(() => {
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
    }, [leads, filtroStatus, filtroData, filtroNome]);


    // --- Lógica de Paginação, Transferência e Observação (MANTIDAS) ---
    const totalPaginas = Math.max(1, Math.ceil(gerais.length / leadsPorPagina));
    const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
    const usuariosAtivos = usuarios.filter((u) => u.status === 'Ativo');
    const isAdmin = usuarioLogado?.tipo === 'Admin';

    const inicio = (paginaCorrigida - 1) * leadsPorPagina;
    const fim = inicio + leadsPorPagina;
    const leadsPagina = gerais.slice(inicio, fim);

    const scrollToTop = () => {
        if (scrollContainerRef && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
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

    const handleSelect = (leadId, userId) => {
        setSelecionados((prev) => ({ ...prev, [leadId]: Number(userId) }));
    };

    const enviarLeadAtualizado = async (lead) => {
        try {
            await fetch(ALTERAR_ATRIBUIDO_SCRIPT_URL, {
                method: 'POST', mode: 'no-cors', body: JSON.stringify(lead), headers: { 'Content-Type': 'application/json' },
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
        setSelecionados((prev) => ({ ...prev, [leadId]: '' }));
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
        return isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR');
    };

    const handleObservacaoChange = (leadId, text) => {
        setObservacoes((prev) => ({ ...prev, [leadId]: text }));
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
                method: 'POST', mode: 'no-cors', body: JSON.stringify({ leadId: leadId, observacao: observacaoTexto }), headers: { 'Content-Type': 'application/json' },
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

    // --- Renderização do Layout (Opção 2) ---
    return (
        <div className="p-4 md:p-6 lg:p-8 relative min-h-screen bg-gray-50">
            
            {/* Overlay de Loading */}
            {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex justify-center items-center z-50">
                    <div className="flex items-center">
                        <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="ml-4 text-xl font-semibold text-gray-700">Carregando Renovações...</p>
                    </div>
                </div>
            )}

            {/* Cabeçalho e Ações Principais */}
            <div className="flex flex-wrap items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-extrabold text-gray-800">Renovações Pendentes</h1>
                    
                    <button
                        title="Atualizar dados"
                        onClick={handleRefreshLeads}
                        disabled={isLoading}
                        className={`p-2 rounded-full transition duration-300 ${isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-100'}`}
                    >
                        <RefreshCcw size={24} className={isLoading ? '' : 'hover:rotate-180'} />
                    </button>
                    
                    <button
                        title="Abrir Filtros"
                        onClick={() => setShowFiltersDrawer(true)}
                        className={`p-2 rounded-full transition duration-300 bg-white shadow-md border ${showFiltersDrawer ? 'text-white bg-indigo-600' : 'text-indigo-600 hover:bg-indigo-100'}`}
                    >
                        <Filter size={24} />
                    </button>

                </div>

                {/* Notificação de Agendamento */}
                {hasScheduledToday && (
                    <div className="relative p-2 rounded-full bg-red-50 ring-2 ring-red-200">
                        <Bell size={24} className="text-red-600" title="Agendamentos para hoje" />
                        <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500 animate-pulse"></span>
                    </div>
                )}
            </div>
            
            {/* Barra Lateral de Filtros (Drawer) */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-40 p-6 transform transition-transform duration-300 ${showFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center pb-4 border-b mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center"><Filter size={20} className="mr-2" /> Opções de Filtro</h2>
                    <button onClick={() => setShowFiltersDrawer(false)} className="p-1 rounded-full text-gray-500 hover:bg-gray-100"><X size={24} /></button>
                </div>

                {/* Filtro por Nome */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Nome:</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nome do cliente"
                            value={nomeInput}
                            onChange={(e) => setNomeInput(e.target.value)}
                            className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                        <button onClick={aplicarFiltroNome} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition duration-200"><Search size={18} /></button>
                    </div>
                </div>

                {/* Filtro por Data */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mês/Ano de Criação:</label>
                    <div className="flex gap-2">
                        <input
                            type="month"
                            value={dataInput}
                            onChange={(e) => setDataInput(e.target.value)}
                            className="flex-grow p-2 border border-gray-300 rounded-lg cursor-pointer text-sm"
                        />
                        <button onClick={aplicarFiltroData} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition duration-200"><Calendar size={18} /></button>
                    </div>
                </div>

                {/* Filtro por Status */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Status:</label>
                    <div className="flex flex-wrap gap-2">
                        <StatusBadge status="Em Contato" filtroStatus={filtroStatus} onClick={aplicarFiltroStatus} />
                        <StatusBadge status="Sem Contato" filtroStatus={filtroStatus} onClick={aplicarFiltroStatus} />
                        {hasScheduledToday && <StatusBadge status="Agendado" filtroStatus={filtroStatus} onClick={aplicarFiltroStatus} isScheduledToday={true} />}
                    </div>
                </div>
                
                {/* Ação: Remover Filtros */}
                <button 
                    onClick={removerTodosFiltros}
                    className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-150 font-medium"
                >
                    Remover Filtros
                </button>
            </div>
            
            {/* Conteúdo Principal (Lista) */}
            <div className="relative">
                {/* Tabela/Lista Compacta (Listagem de Alta Densidade) */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 divide-y divide-gray-100">
                    
                    {/* Cabeçalho da Tabela (Desktop) */}
                    <div className="hidden lg:grid grid-cols-6 gap-4 p-4 text-sm font-semibold text-gray-500 border-b">
                        <div className="col-span-2">Cliente / Detalhes</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-2">Atribuição / Observações</div>
                        <div className="col-span-1 text-right">Ações</div>
                    </div>
                    
                    {/* Mensagem de Ausência de Leads */}
                    {gerais.length === 0 && !isLoading ? (
                        <div className="text-center p-8 text-gray-600">
                            Não há renovações para exibir com os filtros atuais.
                        </div>
                    ) : (
                        leadsPagina.map((lead) => {
                            const responsavel = usuarios.find((u) => u.nome === lead.responsavel);
                            const shouldShowObs = lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status.startsWith('Agendado');

                            return (
                                <div 
                                    key={lead.id}
                                    className="grid grid-cols-1 lg:grid-cols-6 gap-4 p-4 hover:bg-indigo-50 transition duration-100 relative"
                                >
                                    {/* COLUNA 1 & 2: Cliente / Detalhes */}
                                    <div className="col-span-2 space-y-1">
                                        <div className="lg:hidden text-xs font-semibold text-gray-500">Cliente</div>
                                        <Lead lead={lead} onUpdateStatus={handleConfirmStatus} disabledConfirm={!lead.responsavel} compact={true} />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Criado: {formatarData(lead.createdAt)}
                                        </p>
                                    </div>

                                    {/* COLUNA 3: Status */}
                                    <div className="col-span-1 flex flex-col justify-center">
                                        <div className="lg:hidden text-xs font-semibold text-gray-500">Status Atual</div>
                                        <StatusBadge status={lead.status} filtroStatus={null} onClick={() => {}} />
                                    </div>

                                    {/* COLUNA 4 & 5: Atribuição / Observações (Ações em painel único) */}
                                    <div className="col-span-2 space-y-2">
                                        <div className="lg:hidden text-xs font-semibold text-gray-500">Atribuição & Obs</div>
                                        {/* Painel de Atribuição */}
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            {lead.responsavel && responsavel ? (
                                                <div className="flex justify-between items-center text-sm font-medium text-green-700">
                                                    <span className="flex items-center"><User size={14} className="mr-1 text-green-500" /> Atribuído a <strong>{responsavel.nome}</strong></span>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleAlterar(lead.id)}
                                                            className="px-2 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition duration-150"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 items-center">
                                                    <select
                                                        value={selecionados[lead.id] || ''}
                                                        onChange={(e) => handleSelect(lead.id, e.target.value)}
                                                        className="flex-grow p-1 text-xs rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                    >
                                                        <option value="">Transferir para...</option>
                                                        {usuariosAtivos.map((u) => (
                                                            <option key={u.id} value={u.id}> {u.nome} </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleEnviar(lead.id)}
                                                        disabled={!selecionados[lead.id]}
                                                        className="p-1 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-600 disabled:bg-gray-400"
                                                    >
                                                        <Send size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Painel de Observações */}
                                        {shouldShowObs && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                                <label className="text-xs font-medium text-gray-700">Observação:</label>
                                                <textarea
                                                    value={observacoes[lead.id] || ''}
                                                    onChange={(e) => handleObservacaoChange(lead.id, e.target.value)}
                                                    rows="2"
                                                    disabled={!isEditingObservacao[lead.id]}
                                                    className={`w-full p-2 text-xs rounded-lg border resize-none ${isEditingObservacao[lead.id] ? 'border-indigo-300 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                                                />
                                                <div className="flex justify-end gap-2 mt-1">
                                                    {isEditingObservacao[lead.id] ? (
                                                        <button
                                                            onClick={() => handleSalvarObservacao(lead.id)}
                                                            className="flex items-center px-2 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600"
                                                            disabled={isLoading}
                                                        >
                                                            <Save size={12} className="mr-1" /> Salvar
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAlterarObservacao(lead.id)}
                                                            className="flex items-center px-2 py-1 bg-gray-400 text-white text-xs rounded-lg hover:bg-gray-500"
                                                        >
                                                            <Edit size={12} className="mr-1" /> Editar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* COLUNA 6: Ações de Status */}
                                    <div className="col-span-1 flex flex-col justify-center items-end">
                                        <div className="lg:hidden text-xs font-semibold text-gray-500">Ações</div>
                                        {/* Aqui ficariam os botões de Fechado/Perdido se o Lead estivesse refatorado para ser menor */}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Paginação */}
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                        onClick={handlePaginaAnterior}
                        disabled={paginaCorrigida <= 1 || isLoading}
                        className="px-4 py-2 bg-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 flex items-center"
                    >
                        <ChevronLeft size={20} className="mr-1" /> Anterior
                    </button>
                    <span className="text-gray-600 font-medium">
                        Página {paginaCorrigida} de {totalPaginas}
                    </span>
                    <button
                        onClick={handlePaginaProxima}
                        disabled={paginaCorrigida >= totalPaginas || isLoading}
                        className="px-4 py-2 bg-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 flex items-center"
                    >
                        Próxima <ChevronRight size={20} className="ml-1" />
                    </button>
                </div>
            </div>
            
            {/* Overlay para fechar o Drawer ao clicar fora */}
            {showFiltersDrawer && (
                <div onClick={() => setShowFiltersDrawer(false)} className="fixed inset-0 bg-black opacity-30 z-30"></div>
            )}
        </div>
    );
};

export default Renovacoes;
