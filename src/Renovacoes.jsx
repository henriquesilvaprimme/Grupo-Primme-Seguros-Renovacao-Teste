import React, { useState, useEffect } from 'react';
import { RefreshCcw, User, Phone, Car, DollarSign, Calendar, Edit2, Check, X, Send } from 'lucide-react';

// URLs de Script do Google Apps Script (GAS) mantidas
const ALTERAR_ATRIBUIDO_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH3p6PWEZo2eH-WZcs99yNaA/exec?v=alterar_atribuido';
// A URL SALVAR_OBSERVACAO_SCRIPT_URL não está sendo usada no componente Renovacoes, o App.jsx pai a utiliza.
// Apenas a mantemos como comentário para referência, mas o componente usa a função 'salvarObservacao' vinda de props.

// Opções de Status (Replicando o que estava provavelmente no componente Lead)
const STATUS_OPTIONS = [
    ' ',
    'Em Contato',
    'Sem Contato',
    'Fechado',
    'Perdido',
];

const Renovacoes = ({ leads, usuarios, onUpdateStatus, transferirLead, usuarioLogado, fetchLeadsFromSheet, scrollContainerRef, salvarObservacao }) => {
    // Estado para o usuário selecionado para atribuição
    const [selecionados, setSelecionados] = useState({});
    // Estado para a páginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    // Estado de carregamento global
    const [isLoading, setIsLoading] = useState(false);
    // Estado para o texto da observação de cada lead
    const [observacoes, setObservacoes] = useState({});
    // Estado para controlar se a observação está em modo de edição
    const [isEditingObservacao, setIsEditingObservacao] = useState({});
    // Estado para o novo status selecionado em cada card
    const [statusSelecionado, setStatusSelecionado] = useState({});

    // -------------------------------------------------------------------------
    // 1. Efeitos e Inicialização
    // -------------------------------------------------------------------------

    // Inicializa observações e modo de edição
    useEffect(() => {
        const initialObservacoes = {};
        const initialIsEditingObservacao = {};
        const initialStatus = {};
        leads.forEach(lead => {
            initialObservacoes[lead.id] = lead.observacao || '';
            // Inicia em modo de edição se não houver observação preenchida
            initialIsEditingObservacao[lead.id] = !lead.observacao || lead.observacao.trim() === '';
            initialStatus[lead.id] = lead.status || STATUS_OPTIONS[0];
        });
        setObservacoes(initialObservacoes);
        setIsEditingObservacao(initialIsEditingObservacao);
        setStatusSelecionado(initialStatus);
    }, [leads]);

    // -------------------------------------------------------------------------
    // 2. Funções de Atribuição (Caixa de Atribuição de Usuário e suas Funções)
    // -------------------------------------------------------------------------

    const enviarLeadAtualizado = async (lead) => {
        try {
            await fetch(ALTERAR_ATRIBUIDO_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(lead),
                headers: { 'Content-Type': 'application/json' },
            });
            // Força a atualização da lista
            fetchLeadsFromSheet();
        } catch (error) {
            console.error('Erro ao enviar lead (atribuição):', error);
        }
    };

    const handleSelect = (leadId, userId) => {
        // userId é o ID do usuário (número)
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
        transferirLead(leadId, userId); // Atualiza o estado no componente pai (App.jsx)
        const lead = leads.find((l) => l.id === leadId);
        const usuarioAtribuido = usuarios.find(u => u.id === userId);

        if (lead && usuarioAtribuido) {
            const leadAtualizado = { ...lead, usuarioId: userId, Responsavel: usuarioAtribuido.nome };
            enviarLeadAtualizado(leadAtualizado); // Envia para o GAS
        }
    };

    const handleAlterar = (leadId) => {
        setSelecionados((prev) => ({
            ...prev,
            [leadId]: '',
        }));
        transferirLead(leadId, null); // Remove a atribuição no estado local/pai
        
        // CUIDADO: Se necessário, você também precisará enviar um update para o GAS 
        // para "desatribuir" o lead na planilha, dependendo da sua regra de negócio.
        // O GAS precisa limpar o campo 'Responsavel' do lead.
        const lead = leads.find((l) => l.id === leadId);
        if (lead) {
             // Simula a desatribuição para o GAS
            const leadDesatribuido = { ...lead, usuarioId: null, Responsavel: '' }; 
            enviarLeadAtualizado(leadDesatribuido); 
        }
    };

    // -------------------------------------------------------------------------
    // 3. Funções de Status (Caixa de Seleção de Status e suas Funções)
    // -------------------------------------------------------------------------

    // A função de confirmação de status que chama a função do componente pai
    const handleConfirmStatus = (leadId) => {
        const novoStatus = statusSelecionado[leadId];
        const currentLead = leads.find(l => l.id === leadId);
        
        if (!currentLead) return;

        // Chama a função de atualização de status do componente pai
        onUpdateStatus(leadId, novoStatus, currentLead.phone);
        
        // Lógica para forçar a observação se o status for "Em Contato", "Sem Contato" ou "Agendado"
        const status = novoStatus || '';
        const hasNoObservacao = !currentLead?.observacao || currentLead.observacao.trim() === ''; 
        
        if ((status === 'Em Contato' || status === 'Sem Contato' || status.startsWith('Agendado')) && hasNoObservacao) {
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: true }));
        } else {
             // Remove o modo de edição se o status for outro
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: false })); 
        }

        // Força a atualização da lista após a mudança de status
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
            // Chama a função do App.jsx para salvar a observação no GAS
            await salvarObservacao(leadId, observacaoTexto);
            
            setIsEditingObservacao(prev => ({ ...prev, [leadId]: false }));
            
            // Revalida os dados após salvar
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
    // 5. Funções Auxiliares e Paginação
    // -------------------------------------------------------------------------

    const handleRefreshLeads = async () => {
        setIsLoading(true);
        try {
            await fetchLeadsFromSheet(); 
            
            // Re-inicializa o estado de edição de observação
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
    const gerais = leads; 
    const totalPaginas = Math.max(1, Math.ceil(gerais.length / leadsPorPagina));
    const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
    const usuariosAtivos = usuarios.filter((u) => u.status === 'Ativo');
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

    const formatarData = (dataStr) => {
        if (!dataStr) return '';
        
        if (dataStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parts = dataStr.split('-');
            const data = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (isNaN(data.getTime())) return '';
            return data.toLocaleDateString('pt-BR');
        }

        let data;
        if (dataStr.includes('/')) {
            const partes = dataStr.split('/');
            // Tenta DD/MM/AAAA
            data = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0])); 
        } else {
            data = new Date(dataStr);
        }

        if (isNaN(data.getTime())) return '';
        return data.toLocaleDateString('pt-BR'); 
    };

    const inicio = (paginaCorrigida - 1) * leadsPorPagina;
    const fim = inicio + leadsPorPagina;
    const leadsPagina = gerais.slice(inicio, fim);
    
    // Função auxiliar para cor do status
    const getStatusColor = (status) => {
        switch (status) {
            case 'Fechado':
                return 'bg-green-100 text-green-800 border-green-400';
            case 'Perdido':
                return 'bg-red-100 text-red-800 border-red-400';
            case 'Em Contato':
                return 'bg-blue-100 text-blue-800 border-blue-400';
            case 'Sem Contato':
                return 'bg-yellow-100 text-yellow-800 border-yellow-400';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-400';
        }
    };

    // -------------------------------------------------------------------------
    // 6. Renderização
    // -------------------------------------------------------------------------

    return (
        <div className="p-4 md:p-6 relative min-h-screen bg-gray-50">
            {/* Loader de Carregamento */}
            {isLoading && (
                <div className="fixed inset-0 bg-white flex justify-center items-center z-50 rounded-lg" style={{ opacity: 0.9 }}>
                    <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-600"></div>
                    <p className="ml-4 text-xl text-gray-700 font-semibold">Carregando Renovações...</p>
                </div>
            )}

            {/* Cabeçalho e Botão de Refresh */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 sticky top-0 bg-gray-50 z-10 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Renovações ({gerais.length})</h1>
                <button
                    title='Clique para atualizar os dados de renovações'
                    onClick={handleRefreshLeads}
                    disabled={isLoading}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition duration-150 shadow-lg disabled:opacity-50 flex items-center justify-center transform hover:scale-105"
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

            {/* Conteúdo Principal */}
            {isLoading ? (
                null
            ) : gerais.length === 0 ? (
                <p className="text-center text-lg text-gray-600 p-10 bg-white rounded-xl shadow-lg mt-8">Não há renovações para exibir.</p>
            ) : (
                <>
                    {/* Lista de Renovações (Cards Otimizados) */}
                    <div className="grid gap-6">
                        {leadsPagina.map((lead) => {
                            const responsavel = usuarios.find((u) => u.nome === lead.Responsavel);
                            const currentStatus = statusSelecionado[lead.id] || lead.status || STATUS_OPTIONS[0];

                            return (
                                <div
                                    key={lead.id}
                                    className="bg-white rounded-xl shadow-2xl p-6 border-l-8 border-indigo-600 relative overflow-hidden transition-all duration-300 hover:shadow-indigo-300/50"
                                >
                                    {/* Data de Criação e Status (Tag no canto) */}
                                    <div className="absolute top-0 right-0 p-2 text-xs font-medium rounded-bl-lg">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(lead.status)}`}>
                                            {lead.status || 'Novo'}
                                        </span>
                                    </div>
                                    <div className="absolute top-3 left-6 text-xs text-gray-400 italic" title={`Criado em: ${formatarData(lead.Data)}`}>
                                        Criado: {formatarData(lead.Data)}
                                    </div>

                                    {/* Bloco de Dados Principais (Grid 2x2 ou 4 colunas em telas maiores) */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 pt-8 border-b pb-4 mb-4">
                                        
                                        {/* 1. Cliente / Contato */}
                                        <div className="col-span-2 md:col-span-1">
                                            <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Cliente / Contato</p>
                                            <p className="font-extrabold text-gray-900 text-xl flex items-center gap-1"><User size={18} className='text-indigo-600' /> {lead.name}</p>
                                            <a href={`tel:${lead.phone}`} className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-1">
                                                <Phone size={14} /> {lead.phone}
                                            </a>
                                        </div>

                                        {/* 2. Veículo / Seguradora */}
                                        <div className="col-span-2 md:col-span-1 border-l-2 md:border-none pl-3 md:pl-0 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Veículo / Seguradora</p>
                                            <p className="text-base text-gray-800 font-medium flex items-center gap-1">
                                                <Car size={18} className='text-gray-600' /> {lead.vehicleModel} ({lead.vehicleYearModel})
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">🛡️ {lead.Seguradora}</p>
                                        </div>

                                        {/* 3. Prêmio Líquido / Comissão */}
                                        <div className="col-span-1 md:col-span-1 border-l-2 pl-3 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Prêmio Liquido</p>
                                            <p className="font-bold text-xl text-green-600 flex items-center gap-1"><DollarSign size={18} /> R$ {lead.PremioLiquido || '0,00'}</p>
                                            <p className="text-sm text-gray-600 mt-1">Comissão: {lead.Comissao || '0,00'}%</p>
                                        </div>

                                        {/* 4. Vigência Final */}
                                        <div className="col-span-1 md:col-span-1 border-l-2 pl-3 border-gray-100">
                                            <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Vigência Final</p>
                                            <p className="font-bold text-xl text-red-600 flex items-center gap-1"><Calendar size={18} /> {formatarData(lead.VigenciaFinal)}</p>
                                        </div>
                                    </div>

                                    {/* Seções de Interação (3 Colunas no Desktop) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">

                                        {/* 1. Bloco de Status */}
                                        <div className='p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg shadow-inner'>
                                            <label htmlFor={`status-${lead.id}`} className="block mb-2 font-bold text-sm text-indigo-700 flex items-center gap-1">
                                                <Check size={16} /> Alterar Status
                                            </label>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <select
                                                    id={`status-${lead.id}`}
                                                    value={currentStatus}
                                                    onChange={(e) => setStatusSelecionado(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                                    className="flex-grow p-2 border border-indigo-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
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
                                                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm shadow-md"
                                                    title={!lead.Responsavel ? "Atribua um responsável primeiro" : (currentStatus === lead.status ? "Status já é o atual" : "Confirmar novo status")}
                                                >
                                                    <Send size={16} className='inline mr-1' /> Salvar
                                                </button>
                                            </div>
                                        </div>

                                        {/* 2. Atribuição de Responsável */}
                                        <div className='p-4 bg-green-50/70 border border-green-200 rounded-lg shadow-inner'>
                                            <label className="block mb-2 font-bold text-sm text-green-700 flex items-center gap-1">
                                                <User size={16} /> Atribuição de Usuário
                                            </label>
                                            {lead.Responsavel && responsavel ? (
                                                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-green-300 shadow-sm">
                                                    <p className="text-green-700 font-semibold text-sm truncate">
                                                        Atribuído: <strong>{responsavel.nome}</strong>
                                                    </p>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleAlterar(lead.id)}
                                                            className="px-3 py-1 bg-yellow-500 text-black text-xs rounded-lg hover:bg-yellow-600 transition duration-150 font-medium shadow-md"
                                                        >
                                                            <X size={14} className='inline mr-1' /> Alterar
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 items-center">
                                                    <select
                                                        value={selecionados[lead.id] || ''}
                                                        onChange={(e) => handleSelect(lead.id, e.target.value)}
                                                        className="flex-grow p-2 border border-green-300 rounded-lg text-sm bg-white focus:ring-green-500 focus:border-green-500 shadow-sm"
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
                                                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150 disabled:bg-gray-400 text-sm shadow-md"
                                                    >
                                                        <Send size={16} className='inline mr-1' /> Enviar
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* 3. Bloco de Observações */}
                                        <div className='p-4 bg-yellow-50/70 border border-yellow-200 rounded-lg shadow-inner md:col-span-1'>
                                            <label htmlFor={`observacao-${lead.id}`} className="block mb-2 font-bold text-sm text-yellow-800 flex items-center gap-1">
                                                <Edit2 size={16} /> Observações
                                            </label>
                                            <textarea
                                                id={`observacao-${lead.id}`}
                                                value={observacoes[lead.id] || ''}
                                                onChange={(e) => handleObservacaoChange(lead.id, e.target.value)}
                                                placeholder="Adicione suas observações aqui..."
                                                rows="3"
                                                disabled={!isEditingObservacao[lead.id] || isLoading}
                                                className={`w-full p-2 border rounded-lg resize-y text-sm transition-colors shadow-sm ${
                                                    isEditingObservacao[lead.id] 
                                                        ? 'bg-white border-yellow-400 focus:ring-yellow-500' 
                                                        : 'bg-gray-200 border-gray-300 cursor-default'
                                                }`}
                                            ></textarea>
                                            <div className="flex justify-end mt-2">
                                                {isEditingObservacao[lead.id] ? (
                                                    <button
                                                        onClick={() => handleSalvarObservacao(lead.id)}
                                                        disabled={isLoading}
                                                        className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition duration-150 disabled:bg-gray-400 text-sm shadow-md"
                                                    >
                                                        <Check size={16} className='inline mr-1' /> Salvar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAlterarObservacao(lead.id)}
                                                        className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition duration-150 text-sm shadow-md"
                                                    >
                                                        <Edit2 size={16} className='inline mr-1' /> Editar
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
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition duration-150 bg-white shadow-md text-gray-700"
                        >
                            Anterior
                        </button>
                        <span className="text-gray-700 font-bold text-lg">
                            Página <span className="text-indigo-600">{paginaCorrigida}</span> de {totalPaginas}
                        </span>
                        <button
                            onClick={handlePaginaProxima}
                            disabled={paginaCorrigida >= totalPaginas || isLoading}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition duration-150 bg-white shadow-md text-gray-700"
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
