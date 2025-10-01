import React, { useState, useEffect, useMemo } from 'react';
import Lead from './components/Lead';
import { RefreshCcw, Bell, Search, Send, Edit, Save, User, ChevronLeft, ChevronRight } from 'lucide-react';

// ===============================================
// 1. CONFIGURAÇÃO (MANTIDA)
// ===============================================
const SHEET_NAME = 'Renovações';

// URLs com o parâmetro 'sheet' adicionado para apontar para a nova aba
const GOOGLE_SHEETS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGP9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';
const ALTERAR_ATRIBUIDO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?v=alterar_atribuido&sheet=${SHEET_NAME}`;
const SALVAR_OBSERVACAO_SCRIPT_URL = `${GOOGLE_SHEETS_SCRIPT_BASE_URL}?action=salvarObservacao&sheet=${SHEET_NAME}`;

// Função auxiliar para criar um delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===============================================
// FUNÇÃO AUXILIAR PARA O FILTRO DE DATA
// ===============================================

/**
 * Normaliza uma string de data (assumindo dd/mm/aaaa, aaaa-mm-dd ou objeto Date) para o formato 'aaaa-mm'.
 * @param {string | Date} dateValue - O valor da data do lead.
 * @returns {string} A data formatada como 'aaaa-mm' ou uma string vazia.
 */
const getYearMonthFromDate = (dateValue) => {
    if (!dateValue) return '';

    let date;
    
    // Tenta tratar como dd/mm/aaaa (formato Sheets/BR se não for ISO)
    if (typeof dateValue === 'string' && dateValue.includes('/')) {
        const parts = dateValue.split('/');
        // Cria uma data com Ano-Mês-Dia (evita problemas de fuso horário com new Date(string))
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } 
    // Tenta tratar como aaaa-mm-dd (formato input[type=month] ou ISO)
    else if (typeof dateValue === 'string' && dateValue.includes('-') && dateValue.length >= 7) {
        const parts = dateValue.split('-');
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1); // Apenas mês e ano
    }
    // Tenta criar como objeto Date
    else {
        date = new Date(dateValue);
    }
    
    if (isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${year}-${month}`;
};


// ===============================================
// 2. COMPONENTE RENOVACIONES (AJUSTADO)
// ===============================================

// --- COMPONENTE AUXILIAR: StatusButton com Contagem (MANTIDO) ---
const StatusFilterButton = ({ status, count, currentFilter, onClick, isScheduledToday }) => {
    const isSelected = currentFilter === status;
    let baseClasses = `px-5 py-2 text-sm font-semibold rounded-full shadow-md transition duration-300 flex items-center justify-center whitespace-nowrap`;
    let activeClasses = `ring-2 ring-offset-2`;
    let nonActiveClasses = `hover:opacity-80`;

    // Classes de cores
    let statusColors = '';
    if (status === 'Todos') {
        statusColors = isSelected ? 'bg-indigo-700 text-white ring-indigo-300' : 'bg-indigo-500 text-white hover:bg-indigo-600';
    } else if (status === 'Em Contato') {
        statusColors = isSelected ? 'bg-yellow-600 text-white ring-yellow-300' : 'bg-yellow-500 text-white hover:bg-yellow-600';
    } else if (status === 'Sem Contato') {
        statusColors = isSelected ? 'bg-red-600 text-white ring-red-300' : 'bg-red-500 text-white hover:bg-red-600';
    } else if (status === 'Agendado' && isScheduledToday) {
        statusColors = isSelected ? 'bg-cyan-600 text-white ring-cyan-300' : 'bg-cyan-500 text-white hover:bg-cyan-600';
    } else {
        statusColors = 'bg-gray-200 text-gray-700 hover:bg-gray-300';
    }
    
    const label = isScheduledToday ? `Agendados` : status;
    
    return (
        <button
            onClick={() => onClick(status)}
            className={`${baseClasses} ${statusColors} ${isSelected ? activeClasses : nonActiveClasses}`}
            disabled={status !== 'Todos' && status !== 'Agendado' && count === 0}
        >
            {label} 
            {status !== 'Todos' && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-white bg-opacity-30 rounded-full">{count}</span>
            )}
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
    const [hasScheduledToday, setHasScheduledToday] = useState(false);
    const [showNotification, setShowNotification] = useState(false); 

    // --- LÓGICAS (MANTIDAS) ---
    useEffect(() => {
        const today = new Date();
        const ano = today.getFullYear();
        const mes = String(today.getMonth() + 1).padStart(2, '0');
        const mesAnoAtual = `${ano}-${mes}`;
        
        setDataInput(mesAnoAtual);
        setFiltroData(mesAnoAtual);
        setFiltroStatus('Todos'); 

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
            return lead.status.startsWith('Agendado') && statusDateFormatted === todayFormatted;
        });
        setHasScheduledToday(todayAppointments.length > 0);
    }, [leads]);

    const handleRefreshLeads = async () => {
        setIsLoading(true);
        try {
            await fetchLeadsFromSheet(SHEET_NAME);
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

    const leadsPorPagina = 10;
    const normalizarTexto = (texto = '') => {
        return texto.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()@\+\?><\[\]\+]/g, '').replace(/\s+/g, ' ').trim();
    };

    const aplicarFiltroData = () => {
        setFiltroData(dataInput);
        setFiltroNome(''); setNomeInput(''); setFiltroStatus(null); setPaginaAtual(1);
    };

    const aplicarFiltroNome = () => {
        const filtroLimpo = nomeInput.trim();
        setFiltroNome(filtroLimpo);
        setFiltroData(''); setDataInput(''); setFiltroStatus(null); setPaginaAtual(1);
    };
    
    const aplicarFiltroStatus = (status) => {
        setFiltroStatus(status);
        setFiltroNome(''); setNomeInput(''); setFiltroData(''); setDataInput(''); setPaginaAtual(1);
    };
    
    const nomeContemFiltro = (leadNome, filtroNome) => {
        if (!filtroNome) return true;
        if (!leadNome) return false;
        const nomeNormalizado = normalizarTexto(leadNome);
        const filtroNormalizado = normalizarTexto(filtroNome);
        return nomeNormalizado.includes(filtroNormalizado);
    };

    const gerais = useMemo(() => {
        return leads.filter((lead) => {
            if (lead.status === 'Fechado' || lead.status === 'Perdido') return false;

            if (filtroStatus && filtroStatus !== 'Todos') {
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
                const leadVigenciaMesAno = getYearMonthFromDate(lead.VigenciaFinal);
                return leadVigenciaMesAno === filtroData;
            }

            if (filtroNome) {
                return nomeContemFiltro(lead.name, filtroNome);
            }

            return true; 
        });
    }, [leads, filtroStatus, filtroData, filtroNome]);

    const statusCounts = useMemo(() => {
        const counts = { 'Em Contato': 0, 'Sem Contato': 0, 'Agendado': 0 };
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('pt-BR');

        leads.forEach(lead => {
            if (lead.status === 'Fechado' || lead.status === 'Perdido') return;

            if (lead.status === 'Em Contato') {
                counts['Em Contato']++;
            } else if (lead.status === 'Sem Contato') {
                counts['Sem Contato']++;
            } else if (lead.status.startsWith('Agendado')) {
                 const statusDateStr = lead.status.split(' - ')[1];
                 if (!statusDateStr) return;
                 const [dia, mes, ano] = statusDateStr.split('/');
                 const statusDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
                 const statusDateFormatted = statusDate.toLocaleDateString('pt-BR');
                 
                 if (statusDateFormatted === todayFormatted) {
                    counts['Agendado']++;
                 }
            }
        });
        return counts;
    }, [leads]);
    
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
        // userId armazenado como string
        setSelecionados((prev) => ({ ...prev, [leadId]: userId }));
    };

    const enviarLeadAtualizado = async (lead) => {
        try {
            await fetch(ALTERAR_ATRIBUIDO_SCRIPT_URL, {
                method: 'POST', 
                mode: 'no-cors', // MANTIDO
                body: JSON.stringify(lead), 
                headers: { 'Content-Type': 'application/json' },
            });
            
            // DELAY DE 2 SEGUNDOS: Necessário quando usamos 'no-cors' para dar tempo ao Sheets Script de salvar.
            await delay(2000); 
            
            fetchLeadsFromSheet(SHEET_NAME); 
        } catch (error) {
            console.error('Erro ao enviar lead para o Sheets Script (pode ser erro de rede):', error);
            alert('Erro ao transferir lead. O salvamento no Sheets pode ter falhado. Tente novamente.');
        }
    };
    
    const handleEnviar = (leadId) => {
        const userId = selecionados[leadId]; 
        
        if (!userId) {
            alert('Selecione um usuário antes de enviar.');
            return;
        }

        const lead = leads.find((l) => l.id === leadId);
        
        // Usa '==' para comparação não estrita (string == number)
        const usuarioSelecionado = usuariosAtivos.find(u => u.id == userId); 

        if (!usuarioSelecionado) {
             alert('Erro: Usuário selecionado não encontrado. Verifique se o ID está mapeado corretamente ou se o usuário está Ativo.');
             console.error('Falha na busca pelo usuário. userId:', userId, 'Tipo de userId:', typeof userId);
             return;
        }

        const leadAtualizado = { 
            ...lead, 
            usuarioId: userId, 
            responsavel: usuarioSelecionado.nome 
        };

        transferirLead(leadId, userId);
        
        enviarLeadAtualizado(leadAtualizado);
    };

    const handleAlterar = (leadId) => {
        setSelecionados((prev) => ({ ...prev, [leadId]: '' }));
        transferirLead(leadId, null);
    };

    /**
     * CORRIGIDO: parres mudado para partes.
     */
    const formatarData = (dataStr) => {
        if (!dataStr) return '';
        let data;
        if (dataStr.includes('/')) {
            const partes = dataStr.split('/');
            data = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
        } else if (dataStr.includes('-') && dataStr.length === 10) {
            const partes = dataStr.split('-');
            data = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2])); // Corrigido aqui
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
                method: 'POST',
                mode: 'no-cors', // MANTIDO
                body: JSON.stringify({ leadId: leadId, observacao: observacaoTexto }), 
                headers: { 'Content-Type': 'application/json' },
            });
            
            // DELAY DE 2 SEGUNDOS
            await delay(2000); 

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

    const getFullStatus = (status) => {
        return status || 'Novo';
    }


    // --- Renderização do Layout ---
    return (
        <div className="p-4 md:p-6 lg:p-8 relative min-h-screen bg-gray-100 font-sans">
            
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

            {/* Cabeçalho Principal (Moderno) */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 mb-4">
                    <h1 className="text-4xl font-extrabold text-gray-900 flex items-center">
                        <Bell size={32} className="text-indigo-500 mr-3" />
                        Renovações
                    </h1>
                    
                    {/* Sino de Notificação (Mantido) */}
                    {hasScheduledToday && (
                        <div
                            className="relative cursor-pointer"
                            onClick={() => setShowNotification(!showNotification)}
                            title="Você tem agendamentos hoje!"
                        >
                            <Bell size={32} className="text-red-500 animate-pulse" />
                            <div className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ring-2 ring-white">
                                1
                            </div>
                            {showNotification && (
                                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-10 text-sm">
                                    Você tem agendamentos marcados para hoje!
                                </div>
                            )}
                        </div>
                    )}
                    
                    <button
                        title="Atualizar dados"
                        onClick={handleRefreshLeads}
                        disabled={isLoading}
                        className={`p-3 rounded-full transition duration-300 ${isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-100 shadow-sm'}`}
                    >
                        <RefreshCcw size={24} className={isLoading ? '' : 'hover:rotate-180'} />
                    </button>
                </div>
                
                {/* Controles de Filtro (Inline) */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
                    {/* Filtro de Nome */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={nomeInput}
                            onChange={(e) => setNomeInput(e.target.value)}
                            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                        <button 
                            onClick={aplicarFiltroNome}
                            className="p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition duration-200 shadow-md"
                        >
                            <Search size={20} />
                        </button>
                    </div>

                    {/* Filtro de Data (Vigência Final) */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px] justify-end">
                        <input
                            type="month"
                            value={dataInput}
                            onChange={(e) => setDataInput(e.target.value)}
                            className="p-3 border border-gray-300 rounded-lg cursor-pointer text-sm"
                            title="Filtrar por Mês/Ano da Vigência Final"
                        />
                        <button 
                            onClick={aplicarFiltroData}
                            className="p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition duration-200 shadow-md whitespace-nowrap"
                        >
                            Filtrar Data
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Barra de Filtro de Status (Abas Estilizadas com Contagem) */}
            <div className="flex flex-wrap gap-3 justify-center mb-8">
                <StatusFilterButton status="Todos" count={gerais.length} currentFilter={filtroStatus} onClick={aplicarFiltroStatus} color="purple" />
                <StatusFilterButton status="Em Contato" count={statusCounts['Em Contato']} currentFilter={filtroStatus} onClick={aplicarFiltroStatus} color="yellow" />
                <StatusFilterButton status="Sem Contato" count={statusCounts['Sem Contato']} currentFilter={filtroStatus} onClick={aplicarFiltroStatus} color="red" />
                {hasScheduledToday && <StatusFilterButton status="Agendado" count={statusCounts['Agendado']} currentFilter={filtroStatus} onClick={aplicarFiltroStatus} isScheduledToday={true} color="cyan" />}
            </div>

            {/* Lista de Cards de Leads */}
            <div className="space-y-5">
                {gerais.length === 0 && !isLoading ? (
                    <div className="text-center p-12 bg-white rounded-xl shadow-md text-gray-600 text-lg">
                        <p> Você não tem nenhuma renovação para o filtro selecionado no momento. </p>
                    </div>
                ) : (
                    leadsPagina.map((lead) => {
                        const responsavel = usuarios.find((u) => u.nome === lead.responsavel);
                        const shouldShowObs = lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status.startsWith('Agendado');

                        return (
                            <div 
                                key={lead.id}
                                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 p-5 grid grid-cols-1 lg:grid-cols-3 gap-6 relative border-t-4 border-indigo-500"
                            >
                                {/* COLUNA 1: Informações do Lead */}
                                <div className="col-span-1 border-r lg:pr-6">
                                    {/* PÍLULA DE STATUS RESTAURADA (com a data) */}
                                    <div className="mb-3">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${lead.status.startsWith('Agendado') ? 'bg-cyan-100 text-cyan-800' : lead.status === 'Em Contato' ? 'bg-yellow-100 text-yellow-800' : lead.status === 'Sem Contato' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {getFullStatus(lead.status)} {/* Pílula completa, mantida como a exibição primária */}
                                        </span>
                                    </div>
                                    <Lead 
                                        lead={lead} 
                                        onUpdateStatus={handleConfirmStatus} 
                                        disabledConfirm={!lead.responsavel} 
                                        compact={false}
                                    />
                                    {/* Exibição da Vigência Final com destaque */}
                                    <p className="mt-3 text-sm font-semibold text-gray-700">
                                        Vigência Final: <strong className="text-indigo-600">{formatarData(lead.VigenciaFinal)}</strong>
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        Criado em: {formatarData(lead.createdAt)}
                                    </p>
                                </div>

                                {/* COLUNA 2: Observações (à esquerda) */}
                                <div className="col-span-1 border-r lg:px-6">
                                    {shouldShowObs && (
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                                            {/* Título "Observações" removido */}
                                            <textarea
                                                value={observacoes[lead.id] || ''}
                                                onChange={(e) => handleObservacaoChange(lead.id, e.target.value)} 
                                                rows="4"
                                                placeholder="Adicione suas observações aqui..."
                                                disabled={!isEditingObservacao[lead.id]}
                                                className={`w-full p-2 text-sm rounded-lg border resize-none transition duration-150 ${isEditingObservacao[lead.id] ? 'border-indigo-300 bg-white focus:ring-indigo-500 focus:border-indigo-500' : 'border-gray-200 bg-gray-100 cursor-text'}`}
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                {isEditingObservacao[lead.id] ? (
                                                    <button
                                                        onClick={() => handleSalvarObservacao(lead.id)}
                                                        className="flex items-center px-3 py-1 bg-green-500 text-white text-sm rounded-full hover:bg-green-600 disabled:opacity-50 transition duration-150"
                                                        disabled={isLoading}
                                                    >
                                                        <Save size={14} className="mr-1" /> Salvar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAlterarObservacao(lead.id)}
                                                        className="flex items-center px-3 py-1 bg-gray-400 text-white text-sm rounded-full hover:bg-gray-500 transition duration-150"
                                                    >
                                                        <Edit size={14} className="mr-1" /> Editar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* COLUNA 3: Atribuição (à direita) */}
                                <div className="col-span-1 lg:pl-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                                        <User size={18} className="mr-2 text-indigo-500" />
                                        Atribuição
                                    </h3>
                                    {lead.responsavel && responsavel ? (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                                            <p className="text-sm font-medium text-green-700">
                                                Atribuído a: <strong>{responsavel.nome}</strong>
                                            </p>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleAlterar(lead.id)}
                                                    className="mt-2 px-3 py-1 bg-amber-500 text-white text-xs rounded-full hover:bg-amber-600 transition duration-150 shadow-sm"
                                                >
                                                    Mudar Atribuição
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                                            <select
                                                value={selecionados[lead.id] || ''}
                                                onChange={(e) => handleSelect(lead.id, e.target.value)}
                                                className="p-2 text-sm rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="">Transferir para...</option>
                                                {usuariosAtivos.map((u) => (
                                                    <option key={u.id} value={u.id}> {u.nome} </option> 
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleEnviar(lead.id)}
                                                disabled={!selecionados[lead.id]}
                                                className="flex items-center justify-center px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed transition duration-150 shadow-md"
                                            >
                                                <Send size={16} className="mr-1" /> Enviar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Paginação */}
            <div className="flex justify-center items-center gap-6 mt-8 p-4 bg-white rounded-xl shadow-md">
                <button
                    onClick={handlePaginaAnterior}
                    disabled={paginaCorrigida <= 1 || isLoading}
                    className="px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed transition duration-150 flex items-center shadow-md"
                >
                    <ChevronLeft size={20} className="mr-1" /> Anterior
                </button>
                <span className="text-gray-700 font-medium text-lg">
                    Página <strong className="text-indigo-600">{paginaCorrigida}</strong> de {totalPaginas}
                </span>
                <button
                    onClick={handlePaginaProxima}
                    disabled={paginaCorrigida >= totalPaginas || isLoading}
                    className="px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed transition duration-150 flex items-center shadow-md"
                >
                    Próxima <ChevronRight size={20} className="ml-1" />
                </button>
            </div>
        </div>
    );
};

export default Renovacoes;
