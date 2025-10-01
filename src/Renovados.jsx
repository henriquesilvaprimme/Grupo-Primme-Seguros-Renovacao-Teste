import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcw, Search, Calendar } from 'lucide-react'; // Adicionei Search e Calendar se precisar

const LeadsFechados = ({ leads, usuarios, onUpdateInsurer, onConfirmInsurer, onUpdateDetalhes, fetchLeadsFechadosFromSheet, isAdmin, scrollContainerRef }) => {
    const [fechadosFiltradosInterno, setFechadosFiltradosInterno] = useState([]);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const leadsPorPagina = 10;

    const getMesAnoAtual = () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}`;
    };

    const getDataParaComparacao = (dataStr) => {
        if (!dataStr) return '';
        try {
            const dateObj = new Date(dataStr);
            if (isNaN(dateObj.getTime())) {
                const parts = dataStr.split('/');
                if (parts.length === 3) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                return '';
            }
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error("Erro ao formatar data para comparação:", dataStr, e);
            return '';
        }
    };

    const [valores, setValores] = useState({});
    const [vigencia, setVigencia] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [nomeInput, setNomeInput] = useState('');
    const [dataInput, setDataInput] = useState(getMesAnoAtual());
    const [filtroNome, setFiltroNome] = useState('');
    const [filtroData, setFiltroData] = useState(getMesAnoAtual());
    const [premioLiquidoInputDisplay, setPremioLiquidoInputDisplay] = useState({});

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

    const nomeContemFiltro = (leadNome, filtroNome) => {
        if (!filtroNome) return true;
        if (!leadNome) return false;

        const nomeNormalizado = normalizarTexto(leadNome);
        const filtroNormalizado = normalizarTexto(filtroNome);

        return nomeNormalizado.includes(filtroNormalizado);
    };

    const aplicarFiltroNome = () => {
        const filtroLimpo = nomeInput.trim();
        setFiltroNome(filtroLimpo);
        setFiltroData('');
        setDataInput('');
        setPaginaAtual(1);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const aplicarFiltroData = () => {
        setFiltroData(dataInput);
        setFiltroNome('');
        setNomeInput('');
        setPaginaAtual(1);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            await fetchLeadsFechadosFromSheet();
        } catch (error) {
            console.error('Erro ao atualizar leads fechados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        handleRefresh();
    }, []);

    useEffect(() => {
        const fechadosAtuais = leads.filter(lead => lead.Status === 'Fechado');

        // ... Lógica de inicialização de estados (valores, premioLiquidoInputDisplay, vigencia) - **Não alterada para focar no layout**

        setValores(prevValores => {
            const novosValores = { ...prevValores };
            fechadosAtuais.forEach(lead => {
                const rawPremioFromApi = String(lead.PremioLiquido || '');
                const premioFromApi = parseFloat(rawPremioFromApi.replace('.', '').replace(',', '.'));
                const premioInCents = isNaN(premioFromApi) || rawPremioFromApi === '' ? null : Math.round(premioFromApi * 100);

                const apiComissao = lead.Comissao ? String(lead.Comissao).replace('.', ',') : '';
                const apiParcelamento = lead.Parcelamento || '';
                const apiInsurer = lead.Seguradora || '';

                if (!novosValores[lead.ID] ||
                    (novosValores[lead.ID].PremioLiquido === undefined && premioInCents !== null) ||
                    (novosValores[lead.ID].PremioLiquido !== premioInCents && prevValores[lead.ID]?.PremioLiquido === undefined) ||
                    (novosValores[lead.ID].Comissao === undefined && apiComissao !== '') ||
                    (novosValores[lead.ID].Comissao !== apiComissao && prevValores[lead.ID]?.Comissao === undefined) ||
                    (novosValores[lead.ID].Parcelamento === undefined && apiParcelamento !== '') ||
                    (novosValores[lead.ID].Parcelamento !== apiParcelamento && prevValores[lead.ID]?.Parcelamento === undefined) ||
                    (novosValores[lead.ID].insurer === undefined && apiInsurer !== '') ||
                    (novosValores[lead.ID].insurer !== apiInsurer && prevValores[lead.ID]?.insurer === undefined)
                ) {
                    novosValores[lead.ID] = {
                        ...novosValores[lead.ID],
                        PremioLiquido: premioInCents,
                        Comissao: apiComissao,
                        Parcelamento: apiParcelamento,
                        insurer: apiInsurer,
                    };
                }
            });
            return novosValores;
        });

        setPremioLiquidoInputDisplay(prevDisplay => {
            const newDisplay = { ...prevDisplay };
            fechadosAtuais.forEach(lead => {
                const currentPremio = String(lead.PremioLiquido || '');
                if (currentPremio !== '') {
                    const premioFloat = parseFloat(currentPremio.replace(',', '.'));
                    newDisplay[lead.ID] = isNaN(premioFloat) ? '' : premioFloat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else if (prevDisplay[lead.ID] === undefined) {
                    newDisplay[lead.ID] = '';
                }
            });
            return newDisplay;
        });

        setVigencia(prevVigencia => {
            const novasVigencias = { ...prevVigencia };
            fechadosAtuais.forEach(lead => {
                const vigenciaInicioStrApi = String(lead.VigenciaInicial || '');
                const vigenciaFinalStrApi = String(lead.VigenciaFinal || '');

                if (!novasVigencias[lead.ID] || (novasVigencias[lead.ID].inicio === undefined && vigenciaInicioStrApi !== '') || (novasVigencias[lead.ID].inicio !== vigenciaInicioStrApi && prevVigencia[lead.ID]?.inicio === undefined)) {
                    novasVigencias[lead.ID] = {
                        ...novasVigencias[lead.ID],
                        inicio: vigenciaInicioStrApi,
                    };
                }
                if (!novasVigencias[lead.ID] || (novasVigencias[lead.ID].final === undefined && vigenciaFinalStrApi !== '') || (novasVigencias[lead.ID].final !== vigenciaFinalStrApi && prevVigencia[lead.ID]?.final === undefined)) {
                    novasVigencias[lead.ID] = {
                        ...novasVigencias[lead.ID],
                        final: vigenciaFinalStrApi,
                    };
                }
            });
            return novasVigencias;
        });

        const fechadosOrdenados = [...fechadosAtuais].sort((a, b) => {
            const dataA = new Date(getDataParaComparacao(a.Data));
            const dataB = new Date(getDataParaComparacao(b.Data));
            return dataB.getTime() - dataA.getTime();
        });

        // Lógica de filtragem
        let leadsFiltrados;
        if (filtroNome) {
            leadsFiltrados = fechadosOrdenados.filter(lead =>
                nomeContemFiltro(lead.name, filtroNome)
            );
        } else if (filtroData) {
            leadsFiltrados = fechadosOrdenados.filter(lead => {
                const dataLeadMesAno = lead.Data ? getDataParaComparacao(lead.Data).substring(0, 7) : '';
                return dataLeadMesAno === filtroData;
            });
        } else {
            leadsFiltrados = fechadosOrdenados;
        }

        setFechadosFiltradosInterno(leadsFiltrados);
    }, [leads, filtroNome, filtroData]);

    const formatarMoeda = (valorCentavos) => {
        if (valorCentavos === null || isNaN(valorCentavos)) return '';
        return (valorCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // ... Funções de handler (handlePremioLiquidoChange, handlePremioLiquidoBlur, etc.) - **Não alteradas para focar no layout**

    const handlePremioLiquidoChange = (id, valor) => {
        let cleanedValue = valor.replace(/[^\d,\.]/g, '');
        const commaParts = cleanedValue.split(',');
        if (commaParts.length > 2) {
            cleanedValue = commaParts[0] + ',' + commaParts.slice(1).join('');
        }

        if (commaParts.length > 1 && commaParts[1].length > 2) {
            cleanedValue = commaParts[0] + ',' + commaParts[1].slice(0, 2);
        }

        setPremioLiquidoInputDisplay(prev => ({
            ...prev,
            [`${id}`]: cleanedValue,
        }));

        const valorParaParse = cleanedValue.replace(/\./g, '').replace(',', '.');
        const valorEmReais = parseFloat(valorParaParse);
        const valorParaEstado = isNaN(valorEmReais) || cleanedValue === '' ? null : Math.round(valorEmReais * 100);

        setValores(prev => ({
            ...prev,
            [`${id}`]: {
                ...prev[`${id}`],
                PremioLiquido: valorParaEstado,
            },
        }));
    };

    const handlePremioLiquidoBlur = (id) => {
        const valorCentavos = valores[`${id}`]?.PremioLiquido;
        let valorReais = null;

        if (valorCentavos !== null && !isNaN(valorCentavos)) {
            valorReais = valorCentavos / 100;
        }

        setPremioLiquidoInputDisplay(prev => ({
            ...prev,
            [`${id}`]: valorCentavos !== null && !isNaN(valorCentavos) ? formatarMoeda(valorCentavos) : '',
        }));

        onUpdateDetalhes(id, 'PremioLiquido', valorReais);
    };

    const handleComissaoChange = (id, valor) => {
        let cleanedValue = valor.replace(/[^\d,]/g, '');
        const parts = cleanedValue.split(',');
        if (parts.length > 2) {
            cleanedValue = parts[0] + ',' + parts.slice(1).join('');
        }
        if (parts.length > 1 && parts[1].length > 2) {
            cleanedValue = parts[0] + ',' + parts[1].slice(0, 2);
        }

        setValores(prev => ({
            ...prev,
            [`${id}`]: {
                ...prev[`${id}`],
                Comissao: cleanedValue,
            },
        }));

        const valorFloat = parseFloat(cleanedValue.replace(',', '.'));
        onUpdateDetalhes(id, 'Comissao', isNaN(valorFloat) ? '' : valorFloat);
    };

    const handleParcelamentoChange = (id, valor) => {
        setValores(prev => ({
            ...prev,
            [`${id}`]: {
                ...prev[`${id}`],
                Parcelamento: valor,
            },
        }));
        onUpdateDetalhes(id, 'Parcelamento', valor);
    };

    const handleInsurerChange = (id, valor) => {
        setValores(prev => ({
            ...prev,
            [`${id}`]: {
                ...prev[`${id}`],
                insurer: valor,
            },
        }));
    };

    const handleVigenciaInicioChange = (id, dataString) => {
        let dataFinal = '';
        if (dataString) {
            // O input type="date" retorna 'YYYY-MM-DD'
            const [anoStr, mesStr, diaStr] = dataString.split('-').map(Number);
            const dataInicioObj = new Date(anoStr, mesStr - 1, diaStr); // Mês é 0-indexado
            
            if (!isNaN(dataInicioObj.getTime())) {
                const anoInicio = dataInicioObj.getFullYear();
                const mesInicio = String(dataInicioObj.getMonth() + 1).padStart(2, '0');
                const diaInicio = String(dataInicioObj.getDate()).padStart(2, '0');

                // A data final deve ser 1 ano depois do dia anterior. 
                // Se a vigência começa em 01/01/2024, termina em 31/12/2024.
                // O código original calculava a mesma data 1 ano depois. Vamos manter essa lógica.
                const anoFinal = anoInicio + 1;
                dataFinal = `${anoFinal}-${mesInicio}-${diaInicio}`;
            }
        }

        setVigencia(prev => ({
            ...prev,
            [`${id}`]: {
                ...prev[`${id}`],
                inicio: dataString,
                final: dataFinal,
            },
        }));
    };

    // Lógica de Paginação
    const totalPaginas = Math.max(1, Math.ceil(fechadosFiltradosInterno.length / leadsPorPagina));
    const inicio = (paginaAtual - 1) * leadsPorPagina;
    const fim = inicio + leadsPorPagina;
    const leadsPagina = fechadosFiltradosInterno.slice(inicio, fim);

    const handlePaginaAnterior = () => {
        setPaginaAtual(prev => Math.max(prev - 1, 1));
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePaginaProxima = () => {
        setPaginaAtual(prev => Math.min(prev + 1, totalPaginas));
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div id="leads-container" className="p-5 md:p-8 relative min-h-[calc(100vh-100px)]">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex flex-col justify-center items-center z-50 transition-opacity duration-300">
                    <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-indigo-500"></div>
                    <p className="mt-4 text-lg text-gray-700 font-semibold">Carregando LEADS FECHADOS...</p>
                </div>
            )}

            {/* Cabeçalho e Botão de Refresh */}
            <div className="flex items-center justify-between mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800">Leads Fechados</h1>
                <button
                    title='Clique para atualizar os dados'
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className={`p-2 rounded-full transition-all duration-200 ${
                        isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95'
                    }`}
                >
                    <RefreshCcw size={20} className={isLoading ? 'animate-spin text-gray-600' : ''} />
                </button>
            </div>

            {/* Área de Filtros */}
            <div className="flex flex-wrap items-center justify-start gap-4 mb-8 p-4 bg-gray-50 rounded-lg shadow-inner">
                {/* Filtro por Nome */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={aplicarFiltroNome}
                        className="bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md h-10 flex-shrink-0"
                        title="Aplicar filtro por nome"
                    >
                        Filtrar
                    </button>
                    <div className="relative flex-grow min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filtrar por nome"
                            value={nomeInput}
                            onChange={(e) => setNomeInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && aplicarFiltroNome()}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-shadow h-10 text-sm"
                            title="Filtrar leads pelo nome (contém)"
                        />
                    </div>
                </div>

                {/* Filtro por Data (Mês/Ano) */}
                <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                    <button
                        onClick={aplicarFiltroData}
                        className="bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md h-10 flex-shrink-0"
                        title="Aplicar filtro por data"
                    >
                        Filtrar
                    </button>
                    <div className="relative">
                        <input
                            type="month"
                            value={dataInput}
                            onChange={(e) => setDataInput(e.target.value)}
                            className="w-full pl-3 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-shadow h-10 text-sm cursor-pointer"
                            title="Filtrar leads pelo mês e ano de criação"
                        />
                    </div>
                </div>
            </div>
            
            {/* Lista de Leads */}
            {fechadosFiltradosInterno.length === 0 ? (
                <p className="text-center text-lg text-gray-500 mt-10">
                    {filtroNome || filtroData ? "Não há leads fechados que correspondam ao filtro aplicado." : "Nenhum lead fechado encontrado."}
                </p>
            ) : (
                <>
                    {leadsPagina.map((lead) => {
                        const isSeguradoraPreenchida = !!lead.Seguradora;
                        const isButtonDisabled =
                            !valores[`${lead.ID}`]?.insurer ||
                            valores[`${lead.ID}`]?.PremioLiquido === null ||
                            valores[`${lead.ID}`]?.PremioLiquido === undefined ||
                            !valores[`${lead.ID}`]?.Comissao ||
                            parseFloat(String(valores[`${lead.ID}`]?.Comissao || '0').replace(',', '.')) === 0 ||
                            !valores[`${lead.ID}`]?.Parcelamento ||
                            valores[`${lead.ID}`]?.Parcelamento === '' ||
                            !vigencia[`${lead.ID}`]?.inicio ||
                            !vigencia[`${lead.ID}`]?.final;

                        return (
                            <div
                                key={lead.ID}
                                className={`flex flex-col md:flex-row gap-6 p-5 mb-4 rounded-xl shadow-lg transition-all duration-300 ${
                                    isSeguradoraPreenchida ? 'bg-green-50 border-2 border-green-500 shadow-green-200' : 'bg-white border border-gray-200 hover:shadow-xl'
                                }`}
                            >
                                {/* Bloco de Informações do Lead */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2 truncate" title={lead.name}>{lead.name}</h3>
                                    <p className="text-sm text-gray-600"><strong className="font-medium text-gray-700">Data Fechamento:</strong> {lead.Data}</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-3 text-gray-600">
                                        <p><strong className="font-medium text-gray-700">Modelo:</strong> {lead.vehicleModel}</p>
                                        <p><strong className="font-medium text-gray-700">Ano/Modelo:</strong> {lead.vehicleYearModel}</p>
                                        <p><strong className="font-medium text-gray-700">Cidade:</strong> {lead.city}</p>
                                        <p><strong className="font-medium text-gray-700">Telefone:</strong> {lead.phone}</p>
                                        <p className="col-span-2"><strong className="font-medium text-gray-700">Tipo de Seguro:</strong> {lead.insuranceType}</p>
                                    </div>
                                    
                                    {isAdmin && lead.Responsavel && (
                                        <p className="mt-4 text-sm text-indigo-600 font-semibold bg-indigo-50 p-2 rounded-lg inline-block">
                                            Transferido para <span className="font-bold">{lead.Responsavel}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Bloco de Detalhes do Fechamento (Formulário) */}
                                <div className="flex flex-col gap-3 min-w-[280px] w-full md:w-auto border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                                    {/* Seguradora */}
                                    <select
                                        value={valores[`${lead.ID}`]?.insurer || ''}
                                        onChange={(e) => handleInsurerChange(lead.ID, e.target.value)}
                                        disabled={isSeguradoraPreenchida}
                                        className={`w-full p-2 border-2 rounded-lg transition-colors ${
                                            isSeguradoraPreenchida ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                        }`}
                                    >
                                        <option value="">Selecione a seguradora</option>
                                        <option value="Porto Seguro">Porto Seguro</option>
                                        <option value="Azul Seguros">Azul Seguros</option>
                                        <option value="Itau Seguros">Itau Seguros</option>
                                        <option value="Demais Seguradoras">Demais Seguradoras</option>
                                    </select>

                                    {/* Prêmio Líquido */}
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold pointer-events-none">R$</span>
                                        <input
                                            type="text"
                                            placeholder="Prêmio Líquido"
                                            value={premioLiquidoInputDisplay[`${lead.ID}`] || ''}
                                            onChange={(e) => handlePremioLiquidoChange(lead.ID, e.target.value)}
                                            onBlur={() => handlePremioLiquidoBlur(lead.ID)}
                                            disabled={isSeguradoraPreenchida}
                                            className={`w-full pl-10 pr-2 py-2 text-right border rounded-lg transition-colors ${
                                                isSeguradoraPreenchida ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500'
                                            }`}
                                        />
                                    </div>

                                    {/* Comissão (%) */}
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold pointer-events-none">%</span>
                                        <input
                                            type="text"
                                            placeholder="Comissão (%)"
                                            value={valores[`${lead.ID}`]?.Comissao || ''}
                                            onChange={(e) => handleComissaoChange(lead.ID, e.target.value)}
                                            disabled={isSeguradoraPreenchida}
                                            className={`w-full pl-10 pr-2 py-2 text-right border rounded-lg transition-colors ${
                                                isSeguradoraPreenchida ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500'
                                            }`}
                                        />
                                    </div>

                                    {/* Parcelamento */}
                                    <select
                                        value={valores[`${lead.ID}`]?.Parcelamento || ''}
                                        onChange={(e) => handleParcelamentoChange(lead.ID, e.target.value)}
                                        disabled={isSeguradoraPreenchida}
                                        className={`w-full p-2 border rounded-lg transition-colors ${
                                            isSeguradoraPreenchida ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500'
                                        }`}
                                    >
                                        <option value="">Parcelamento</option>
                                        {[...Array(12)].map((_, i) => (
                                            <option key={i + 1} value={`${i + 1}x`}>{i + 1}x</option>
                                        ))}
                                    </select>

                                    {/* Vigência Início */}
                                    <div>
                                        <label htmlFor={`vigencia-inicio-${lead.ID}`} className="block text-xs font-medium text-gray-500 mb-1">Vigência Início:</label>
                                        <input
                                            id={`vigencia-inicio-${lead.ID}`}
                                            type="date"
                                            value={vigencia[`${lead.ID}`]?.inicio || ''}
                                            onChange={(e) => handleVigenciaInicioChange(lead.ID, e.target.value)}
                                            disabled={isSeguradoraPreenchida}
                                            className={`w-full p-2 border rounded-lg transition-colors text-sm ${
                                                isSeguradoraPreenchida ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500'
                                            }`}
                                        />
                                    </div>

                                    {/* Vigência Final */}
                                    <div>
                                        <label htmlFor={`vigencia-final-${lead.ID}`} className="block text-xs font-medium text-gray-500 mb-1">Vigência Final (Automático):</label>
                                        <input
                                            id={`vigencia-final-${lead.ID}`}
                                            type="date"
                                            value={vigencia[`${lead.ID}`]?.final || ''}
                                            readOnly
                                            disabled
                                            className="w-full p-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed text-sm"
                                        />
                                    </div>

                                    {/* Botão de Confirmação/Status */}
                                    {!isSeguradoraPreenchida ? (
                                        <button
                                            onClick={async () => {
                                                await onConfirmInsurer(
                                                    lead.ID,
                                                    valores[`${lead.ID}`]?.PremioLiquido === null ? null : valores[`${lead.ID}`]?.PremioLiquido / 100,
                                                    valores[`${lead.ID}`]?.insurer,
                                                    parseFloat(String(valores[`${lead.ID}`]?.Comissao || '0').replace(',', '.')),
                                                    valores[`${lead.ID}`]?.Parcelamento,
                                                    vigencia[`${lead.ID}`]?.final,
                                                    vigencia[`${lead.ID}`]?.inicio
                                                );
                                                // Não chame fetchLeadsFechadosFromSheet aqui, deixe que o estado de leads externo atualize.
                                                // await fetchLeadsFechadosFromSheet(); 
                                            }}
                                            disabled={isButtonDisabled}
                                            className={`w-full py-2 mt-2 font-semibold rounded-lg shadow-md transition-colors duration-200 ${
                                                isButtonDisabled
                                                    ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                                            }`}
                                        >
                                            Confirmar Seguradora
                                        </button>
                                    ) : (
                                        <span className="w-full py-2 mt-2 text-center font-bold rounded-lg bg-green-200 text-green-700 border border-green-500">
                                            Status confirmado ✅
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Paginação */}
                    {fechadosFiltradosInterno.length > leadsPorPagina && (
                        <div className="flex justify-center items-center gap-4 mt-8">
                            <button
                                onClick={handlePaginaAnterior}
                                disabled={paginaAtual <= 1 || isLoading}
                                className={`px-4 py-2 rounded-lg border transition-colors ${
                                    paginaAtual <= 1 || isLoading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-100 border-gray-300'
                                }`}
                            >
                                Anterior
                            </button>
                            <span className="text-gray-700 font-medium">
                                Página <strong className="text-blue-600">{paginaAtual}</strong> de {totalPaginas}
                            </span>
                            <button
                                onClick={handlePaginaProxima}
                                disabled={paginaAtual >= totalPaginas || isLoading}
                                className={`px-4 py-2 rounded-lg border transition-colors ${
                                    paginaAtual >= totalPaginas || isLoading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-100 border-gray-300'
                                }`}
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LeadsFechados;
