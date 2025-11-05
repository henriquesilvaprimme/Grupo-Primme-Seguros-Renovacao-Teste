import React, { useState, useEffect } from 'react';
import { RefreshCcw, Search, CheckCircle, DollarSign, Calendar } from 'lucide-react';

// ===============================================
// 1. COMPONENTE PRINCIPAL: Renovados
// ===============================================

const Renovados = ({ leads = [], usuarios = [], onUpdateInsurer, onConfirmInsurer, onUpdateDetalhes, fetchRenovadosFromSheet, isAdmin, scrollContainerRef }) => {
    // --- ESTADOS ---
    const [renovadosFiltradosInterno, setRenovadosFiltradosInterno] = useState([]);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const leadsPorPagina = 10;

    const [valores, setValores] = useState({});
    const [vigencia, setVigencia] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [nomeInput, setNomeInput] = useState('');

    // Edição de nome (sempre disponível enquanto seguradora não preenchida)
    const [nomeTemporario, setNomeTemporario] = useState({}); // mapeia ID -> string

    const getMesAnoAtual = () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}`; // AAAA-MM
    };
    const [dataInput, setDataInput] = useState(getMesAnoAtual());
    const [filtroNome, setFiltroNome] = useState('');
    const [filtroData, setFiltroData] = useState(getMesAnoAtual());
    const [premioLiquidoInputDisplay, setPremioLiquidoInputDisplay] = useState({});

    // --- UTILITÁRIOS ---

    /**
     * Converte DD/MM/AAAA ou AAAA-MM-DD para AAAA-MM-DD.
     * Retorna string vazia se não conseguir formatar.
     */
    const getDataParaComparacao = (dataStr) => {
        if (!dataStr) return '';
        dataStr = String(dataStr).trim();

        // Formato DD/MM/AAAA
        if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(dataStr)) {
            const parts = dataStr.split('/');
            const [dia, mes, ano] = parts;
            if (!isNaN(parseInt(dia)) && !isNaN(parseInt(mes)) && !isNaN(parseInt(ano))) {
                return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            }
        }

        // AAAA-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
            return dataStr;
        }

        // Tenta extrair trecho numérico (caso venha Date.toString ou outro)
        const match = dataStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;

        return '';
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

    const nomeContemFiltro = (leadNome, filtroNome) => {
        if (!filtroNome) return true;
        if (!leadNome) return false;

        const nomeNormalizado = normalizarTexto(leadNome);
        const filtroNormalizado = normalizarTexto(filtroNome);

        return nomeNormalizado.includes(filtroNormalizado);
    };

    const scrollToTop = () => {
        if (scrollContainerRef && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const aplicarFiltroNome = () => {
        const filtroLimpo = nomeInput.trim();
        setFiltroNome(filtroLimpo);
        setFiltroData('');
        setDataInput('');
        setPaginaAtual(1);
        scrollToTop();
    };

    const aplicarFiltroData = () => {
        setFiltroData(dataInput); // dataInput no formato AAAA-MM
        setFiltroNome('');
        setNomeInput('');
        setPaginaAtual(1);
        scrollToTop();
    };

    const handleRefresh = async () => {
        if (typeof fetchRenovadosFromSheet !== 'function') return;
        setIsLoading(true);
        try {
            await fetchRenovadosFromSheet();
        } catch (error) {
            console.error('Erro ao atualizar renovados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Carrega os dados ao montar (se a função de fetch existir)
    useEffect(() => {
        handleRefresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- EFEITO PRINCIPAL: sincroniza estados e aplica filtros sobre leads (Status === 'Renovado') ---
    useEffect(() => {
        // Filtra somente os leads com Status 'Renovado' (conforme GAS retorna)
        const renovadosAtuais = Array.isArray(leads) ? leads.filter(lead => String(lead.Status).trim() === 'Renovado') : [];

        // Sincroniza valores iniciais (valores, vigencia, display de prêmio e nomeTemporario)
        setValores(prevValores => {
            const novosValores = { ...prevValores };
            renovadosAtuais.forEach(lead => {
                const rawPremioFromApi = String(lead.PremioLiquido || '');
                const premioFromApi = parseFloat(rawPremioFromApi.replace(/\./g, '').replace(',', '.'));
                const premioInCents = isNaN(premioFromApi) || rawPremioFromApi === '' ? null : Math.round(premioFromApi * 100);

                const apiComissao = lead.Comissao ? String(lead.Comissao).replace('.', ',') : '';
                const apiParcelamento = lead.Parcelamento || '';
                const apiInsurer = lead.Seguradora || '';
                const apiMeioPagamento = lead.MeioPagamento || '';
                const apiCartaoPortoNovo = lead.CartaoPortoNovo || '';

                const key = String(lead.ID);
                if (!novosValores[key] ||
                    (novosValores[key].PremioLiquido === undefined && premioInCents !== null) ||
                    (novosValores[key].Comissao === undefined && apiComissao !== '') ||
                    (novosValores[key].Parcelamento === undefined && apiParcelamento !== '') ||
                    (novosValores[key].insurer === undefined && apiInsurer !== '') ||
                    (novosValores[key].MeioPagamento === undefined && apiMeioPagamento !== '') ||
                    (novosValores[key].CartaoPortoNovo === undefined && apiCartaoPortoNovo !== '')
                ) {
                    novosValores[key] = {
                        ...novosValores[key],
                        PremioLiquido: premioInCents,
                        Comissao: apiComissao,
                        Parcelamento: apiParcelamento,
                        insurer: apiInsurer,
                        MeioPagamento: apiMeioPagamento,
                        CartaoPortoNovo: apiCartaoPortoNovo,
                    };
                }
            });
            return novosValores;
        });

        // Nome temporário
        setNomeTemporario(prevNomes => {
            const novosNomes = { ...prevNomes };
            renovadosAtuais.forEach(lead => {
                const key = String(lead.ID);
                if (novosNomes[key] === undefined) {
                    novosNomes[key] = lead.name || '';
                }
            });
            return novosNomes;
        });

        // Exibição prêmio líquido
        setPremioLiquidoInputDisplay(prevDisplay => {
            const newDisplay = { ...prevDisplay };
            renovadosAtuais.forEach(lead => {
                const key = String(lead.ID);
                const currentPremio = String(lead.PremioLiquido || '');
                if (currentPremio !== '') {
                    const premioFloat = parseFloat(currentPremio.replace(/\./g, '').replace(',', '.'));
                    newDisplay[key] = isNaN(premioFloat) ? '' : premioFloat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else if (prevDisplay[key] === undefined) {
                    newDisplay[key] = '';
                }
            });
            return newDisplay;
        });

        // Vigência
        setVigencia(prevVigencia => {
            const novasVigencias = { ...prevVigencia };
            renovadosAtuais.forEach(lead => {
                const key = String(lead.ID);
                const vigenciaInicioStrApi = String(lead.VigenciaInicial || '');
                const vigenciaFinalStrApi = String(lead.VigenciaFinal || '');

                if (!novasVigencias[key] || (novasVigencias[key].inicio === undefined && vigenciaInicioStrApi !== '')) {
                    novasVigencias[key] = { ...novasVigencias[key], inicio: vigenciaInicioStrApi };
                }
                if (!novasVigencias[key] || (novasVigencias[key].final === undefined && vigenciaFinalStrApi !== '')) {
                    novasVigencias[key] = { ...novasVigencias[key], final: vigenciaFinalStrApi };
                }
            });
            return novasVigencias;
        });

        // Ordenação por Data (mais recente primeiro) - parsing robusto
        const parseDataToTime = (dStr) => {
            const s = getDataParaComparacao(dStr);
            if (!s) return 0;
            const t = new Date(s + 'T00:00:00').getTime();
            return isNaN(t) ? 0 : t;
        };

        const renovadosOrdenados = [...renovadosAtuais].sort((a, b) => {
            return parseDataToTime(b.Data) - parseDataToTime(a.Data);
        });

        // Aplicação do filtro por nome ou por mês/ano (filtroData no formato AAAA-MM)
        let leadsFiltrados;
        if (filtroNome) {
            leadsFiltrados = renovadosOrdenados.filter(lead =>
                nomeContemFiltro(lead.name, filtroNome)
            );
        } else if (filtroData) {
            leadsFiltrados = renovadosOrdenados.filter(lead => {
                const dataLeadFormatada = getDataParaComparacao(lead.Data);
                const dataLeadMesAno = dataLeadFormatada ? dataLeadFormatada.substring(0, 7) : '';
                return dataLeadMesAno === filtroData;
            });
        } else {
            leadsFiltrados = renovadosOrdenados;
        }

        setRenovadosFiltradosInterno(leadsFiltrados);
    }, [leads, filtroNome, filtroData]);

    // --- HANDLERS ---

    const formatarMoeda = (valorCentavos) => {
        if (valorCentavos === null || isNaN(valorCentavos)) return '';
        return (valorCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleNomeBlur = (id, novoNome) => {
        const nomeAtualizado = novoNome.trim();
        const lead = leads.find(l => String(l.ID) === String(id));
        if (lead && lead.name !== nomeAtualizado) {
            if (nomeAtualizado) {
                setNomeTemporario(prev => ({
                    ...prev,
                    [String(id)]: nomeAtualizado,
                }));
                onUpdateDetalhes && onUpdateDetalhes(id, 'name', nomeAtualizado);
            } else {
                setNomeTemporario(prev => ({
                    ...prev,
                    [String(id)]: lead.name,
                }));
            }
        }
    };

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
            [String(id)]: cleanedValue,
        }));

        const valorParaParse = cleanedValue.replace(/\./g, '').replace(',', '.');
        const valorEmReais = parseFloat(valorParaParse);
        const valorParaEstado = isNaN(valorEmReais) || cleanedValue === '' ? null : Math.round(valorEmReais * 100);

        setValores(prev => ({
            ...prev,
            [String(id)]: {
                ...prev[String(id)],
                PremioLiquido: valorParaEstado,
            },
        }));
    };

    const handlePremioLiquidoBlur = (id) => {
        const valorCentavos = valores[String(id)]?.PremioLiquido;
        let valorReais = null;

        if (valorCentavos !== null && !isNaN(valorCentavos)) {
            valorReais = valorCentavos / 100;
        }

        setPremioLiquidoInputDisplay(prev => ({
            ...prev,
            [String(id)]: valorCentavos !== null && !isNaN(valorCentavos) ? formatarMoeda(valorCentavos) : '',
        }));

        onUpdateDetalhes && onUpdateDetalhes(id, 'PremioLiquido', valorReais);
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
            [String(id)]: {
                ...prev[String(id)],
                Comissao: cleanedValue,
            },
        }));
    };

    const handleComissaoBlur = (id) => {
        const comissaoInput = valores[String(id)]?.Comissao || '';
        const comissaoFloat = parseFloat(String(comissaoInput).replace(',', '.'));
        onUpdateDetalhes && onUpdateDetalhes(id, 'Comissao', isNaN(comissaoFloat) ? '' : comissaoFloat);
    };

    const handleParcelamentoChange = (id, valor) => {
        setValores(prev => ({
            ...prev,
            [String(id)]: {
                ...prev[String(id)],
                Parcelamento: valor,
            },
        }));
        onUpdateDetalhes && onUpdateDetalhes(id, 'Parcelamento', valor);
    };

    // Meio de Pagamento (limpeza condicional de CartaoPortoNovo)
    const handleMeioPagamentoChange = (id, valor) => {
        setValores(prev => {
            const newState = {
                ...prev,
                [String(id)]: {
                    ...prev[String(id)],
                    MeioPagamento: valor,
                },
            };

            if (valor !== 'CP' && newState[String(id)]?.CartaoPortoNovo) {
                newState[String(id)].CartaoPortoNovo = '';
                onUpdateDetalhes && onUpdateDetalhes(id, 'CartaoPortoNovo', '');
            }

            return newState;
        });

        onUpdateDetalhes && onUpdateDetalhes(id, 'MeioPagamento', valor);
    };

    const handleCartaoPortoChange = (id, valor) => {
        setValores(prev => ({
            ...prev,
            [String(id)]: {
                ...prev[String(id)],
                CartaoPortoNovo: valor,
            },
        }));
        onUpdateDetalhes && onUpdateDetalhes(id, 'CartaoPortoNovo', valor);
    };

    const handleInsurerChange = (id, valor) => {
        const portoSeguradoras = ['Porto Seguro', 'Azul Seguros', 'Itau Seguros'];
        setValores(prev => {
            const newState = {
                ...prev,
                [String(id)]: {
                    ...prev[String(id)],
                    insurer: valor,
                },
            };

            if (!portoSeguradoras.includes(valor) && newState[String(id)]?.CartaoPortoNovo) {
                newState[String(id)].CartaoPortoNovo = '';
                onUpdateDetalhes && onUpdateDetalhes(id, 'CartaoPortoNovo', '');
            }

            return newState;
        });
    };

    const handleVigenciaInicioChange = (id, dataString) => {
        let dataFinal = '';
        if (dataString) {
            const dataInicioObj = new Date(dataString + 'T00:00:00');
            if (!isNaN(dataInicioObj.getTime())) {
                const anoInicio = dataInicioObj.getFullYear();
                const mesInicio = String(dataInicioObj.getMonth() + 1).padStart(2, '0');
                const diaInicio = String(dataInicioObj.getDate()).padStart(2, '0');

                const anoFinal = anoInicio + 1;
                dataFinal = `${anoFinal}-${mesInicio}-${diaInicio}`; // AAAA-MM-DD
            }
        }

        setVigencia(prev => ({
            ...prev,
            [String(id)]: {
                ...prev[String(id)],
                inicio: dataString,
                final: dataFinal,
            },
        }));

        onUpdateDetalhes && onUpdateDetalhes(id, 'VigenciaInicial', dataString);
        onUpdateDetalhes && onUpdateDetalhes(id, 'VigenciaFinal', dataFinal);
    };

    // --- PAGINAÇÃO ---
    const totalPaginas = Math.max(1, Math.ceil(renovadosFiltradosInterno.length / leadsPorPagina));
    const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
    const inicio = (paginaCorrigida - 1) * leadsPorPagina;
    const fim = inicio + leadsPorPagina;
    const leadsPagina = renovadosFiltradosInterno.slice(inicio, fim);

    const handlePaginaAnterior = () => {
        setPaginaAtual(prev => Math.max(prev - 1, 1));
        scrollToTop();
    };

    const handlePaginaProxima = () => {
        setPaginaAtual(prev => Math.min(prev + 1, totalPaginas));
        scrollToTop();
    };

    // --- RENDER ---
    return (
        <div className="p-4 md:p-6 lg:p-8 relative min-h-screen bg-gray-100 font-sans">

            {/* Overlay de Loading */}
            {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex justify-center items-center z-50">
                    <div className="flex flex-col items-center">
                        <svg className="animate-spin h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="ml-4 text-xl font-semibold text-gray-700 mt-3">Carregando Renovados...</p>
                    </div>
                </div>
            )}

            {/* Cabeçalho Principal */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 mb-4">
                    <h1 className="text-4xl font-extrabold text-gray-900 flex items-center">
                        <CheckCircle size={32} className="text-green-500 mr-3" />
                        Renovados
                    </h1>

                    <button
                        title="Atualizar dados"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className={`p-3 rounded-full transition duration-300 ${isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:bg-green-100 shadow-sm'}`}
                    >
                        <RefreshCcw size={24} className={isLoading ? '' : 'hover:rotate-180'} />
                    </button>
                </div>

                {/* Controles de Filtro */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
                    {/* Filtro de Nome */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={nomeInput}
                            onChange={(e) => setNomeInput(e.target.value)}
                            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm"
                        />
                        <button
                            onClick={aplicarFiltroNome}
                            className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 shadow-md"
                        >
                            <Search size={20} />
                        </button>
                    </div>

                    {/* Filtro de Data */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px] justify-end">
                        <input
                            type="month"
                            value={dataInput}
                            onChange={(e) => setDataInput(e.target.value)}
                            className="p-3 border border-gray-300 rounded-lg cursor-pointer text-sm"
                            title="Filtrar por Mês/Ano de Criação"
                        />
                        <button
                            onClick={aplicarFiltroData}
                            className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 shadow-md whitespace-nowrap"
                        >
                            Filtrar Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de Cards */}
            <div className="space-y-5">
                {renovadosFiltradosInterno.length === 0 && !isLoading ? (
                    <div className="text-center p-12 bg-white rounded-xl shadow-md text-gray-600 text-lg">
                        <p> Você não tem nenhum cliente renovado no período filtrado. </p>
                    </div>
                ) : (
                    leadsPagina.map((lead) => {
                        const keyId = String(lead.ID);
                        const responsavel = usuarios.find((u) => u.nome === lead.Responsavel);
                        const isSeguradoraPreenchida = !!(lead.Seguradora || valores[keyId]?.insurer);

                        const currentInsurer = valores[keyId]?.insurer || '';
                        const currentMeioPagamento = valores[keyId]?.MeioPagamento || '';
                        const isPortoInsurer = ['Porto Seguro', 'Azul Seguros', 'Itau Seguros'].includes(currentInsurer);
                        const isCPPayment = currentMeioPagamento === 'CP';

                        const showCartaoPortoNovo = isPortoInsurer && isCPPayment;

                        const isButtonDisabled =
                            !valores[keyId]?.insurer ||
                            valores[keyId]?.PremioLiquido === null ||
                            valores[keyId]?.PremioLiquido === undefined ||
                            !valores[keyId]?.Comissao ||
                            parseFloat(String(valores[keyId]?.Comissao || '0').replace(',', '.')) === 0 ||
                            !valores[keyId]?.Parcelamento ||
                            valores[keyId]?.Parcelamento === '' ||
                            !vigencia[keyId]?.inicio ||
                            !vigencia[keyId]?.final;

                        return (
                            <div
                                key={keyId}
                                className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative border-t-4 ${isSeguradoraPreenchida ? 'border-green-600' : 'border-amber-500'}`}
                            >
                                {/* COLUNA 1 */}
                                <div className="col-span-1 border-b pb-4 lg:border-r lg:pb-0 lg:pr-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        {isSeguradoraPreenchida ? (
                                            <h3 className="text-xl font-bold text-gray-900">{nomeTemporario[keyId] || lead.name}</h3>
                                        ) : (
                                            <div className="flex flex-col w-full">
                                                <input
                                                    type="text"
                                                    value={nomeTemporario[keyId] || ''}
                                                    onChange={(e) => setNomeTemporario(prev => ({ ...prev, [keyId]: e.target.value }))}
                                                    onBlur={(e) => handleNomeBlur(keyId, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    className="text-xl font-bold text-gray-900 border border-indigo-300 rounded-lg p-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <span className='text-xs text-gray-500 mt-1'>Atualize o nome com o mesmo da proposta.</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1 text-sm text-gray-700">
                                        <p><strong>Modelo:</strong> {lead.vehicleModel}</p>
                                        <p><strong>Ano/Modelo:</strong> {lead.vehicleYearModel}</p>
                                        <p><strong>Cidade:</strong> {lead.city}</p>
                                        <p><strong>Telefone:</strong> {lead.phone}</p>
                                        <p><strong>Tipo de Seguro:</strong> {lead.insuranceType}</p>
                                    </div>

                                    {responsavel && isAdmin && (
                                        <p className="mt-4 text-sm font-semibold text-green-600 bg-green-50 p-2 rounded-lg">
                                            Transferido para: <strong>{responsavel.nome}</strong>
                                        </p>
                                    )}
                                </div>

                                {/* COLUNA 2 */}
                                <div className="col-span-1 border-b pb-4 lg:border-r lg:pb-0 lg:px-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                                        <DollarSign size={18} className="mr-2 text-green-500" />
                                        Detalhes da Renovação
                                    </h3>

                                    {/* Seguradora */}
                                    <div className="mb-4">
                                        <label className="text-xs font-semibold text-gray-600 block mb-1">Seguradora</label>
                                        <select
                                            value={valores[keyId]?.insurer || ''}
                                            onChange={(e) => handleInsurerChange(keyId, e.target.value)}
                                            disabled={isSeguradoraPreenchida}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="">Selecione a seguradora</option>
                                            <option value="Porto Seguro">Porto Seguro</option>
                                            <option value="Azul Seguros">Azul Seguros</option>
                                            <option value="Itau Seguros">Itau Seguros</option>
                                            <option value="Tokio">Tokio</option>
                                            <option value="Yelum">Yelum</option>
                                            <option value="Bradesco">Bradesco</option>
                                            <option value="Allianz">Allianz</option>
                                            <option value="Suhai">Suhai</option>
                                            <option value="Hdi">Hdi</option>
                                            <option value="Zurich">Zurich</option>
                                            <option value="Mitsui">Mitsui</option>
                                            <option value="Mapfre">Mapfre</option>
                                            <option value="Alfa">Alfa</option>
                                            <option value="Demais Seguradoras">Demais Seguradoras</option>
                                        </select>
                                    </div>

                                    {/* Meio de Pagamento */}
                                    <div className="mb-4">
                                        <label className="text-xs font-semibold text-gray-600 block mb-1">Meio de Pagamento</label>
                                        <select
                                            value={valores[keyId]?.MeioPagamento || ''}
                                            onChange={(e) => handleMeioPagamentoChange(keyId, e.target.value)}
                                            disabled={isSeguradoraPreenchida}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value=""> </option>
                                            <option value="CP">CP</option>
                                            <option value="CC">CC</option>
                                            <option value="Debito">Debito</option>
                                            <option value="Boleto">Boleto</option>
                                        </select>
                                    </div>

                                    {/* Cartão Porto Seguro Novo? (condicional) */}
                                    {showCartaoPortoNovo && (
                                        <div className="mb-4">
                                            <label className="text-xs font-semibold text-gray-600 block mb-1">Cartão Porto Seguro Novo?</label>
                                            <select
                                                value={valores[keyId]?.CartaoPortoNovo || ''}
                                                onChange={(e) => handleCartaoPortoChange(keyId, e.target.value)}
                                                disabled={isSeguradoraPreenchida}
                                                className="w-full p-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 focus:ring-green-500 focus:border-green-500"
                                            >
                                                <option value=""> </option>
                                                <option value="Sim">Sim</option>
                                                <option value="Não">Não</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        {/* Prêmio Líquido */}
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600 block mb-1">Prêmio Líquido</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-sm">R$</span>
                                                <input
                                                    type="text"
                                                    placeholder="0,00"
                                                    value={premioLiquidoInputDisplay[keyId] || ''}
                                                    onChange={(e) => handlePremioLiquidoChange(keyId, e.target.value)}
                                                    onBlur={() => handlePremioLiquidoBlur(keyId)}
                                                    disabled={isSeguradoraPreenchida}
                                                    className="w-full p-2 pl-8 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 focus:ring-green-500 focus:border-green-500 text-right"
                                                />
                                            </div>
                                        </div>

                                        {/* Comissão */}
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600 block mb-1">Comissão (%)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-sm">%</span>
                                                <input
                                                    type="text"
                                                    placeholder="0,00"
                                                    value={valores[keyId]?.Comissao || ''}
                                                    onChange={(e) => handleComissaoChange(keyId, e.target.value)}
                                                    onBlur={() => handleComissaoBlur(keyId)}
                                                    disabled={isSeguradoraPreenchida}
                                                    className="w-full p-2 pl-8 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 focus:ring-green-500 focus:border-green-500 text-right"
                                                />
                                            </div>
                                        </div>

                                        {/* Parcelamento (col-span-2) */}
                                        <div className="col-span-2">
                                            <label className="text-xs font-semibold text-gray-600 block mb-1">Parcelamento</label>
                                            <select
                                                value={valores[keyId]?.Parcelamento || ''}
                                                onChange={(e) => handleParcelamentoChange(keyId, e.target.value)}
                                                disabled={isSeguradoraPreenchida}
                                                className="w-full p-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 focus:ring-green-500 focus:border-green-500"
                                            >
                                                <option value="">Selecione o Parcelamento</option>
                                                {[...Array(12)].map((_, i) => (
                                                    <option key={i + 1} value={`${i + 1}`}>{i + 1}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* COLUNA 3 */}
                                <div className="col-span-1 lg:pl-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                                        <Calendar size={18} className="mr-2 text-green-500" />
                                        Vigência
                                    </h3>

                                    <div className="mb-4">
                                        <label htmlFor={`vigencia-inicio-${keyId}`} className="text-xs font-semibold text-gray-600 block mb-1">Início</label>
                                        <input
                                            id={`vigencia-inicio-${keyId}`}
                                            type="date"
                                            value={vigencia[keyId]?.inicio || ''}
                                            onChange={(e) => handleVigenciaInicioChange(keyId, e.target.value)}
                                            disabled={isSeguradoraPreenchida}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label htmlFor={`vigencia-final-${keyId}`} className="text-xs font-semibold text-gray-600 block mb-1">Término (Automático)</label>
                                        <input
                                            id={`vigencia-final-${keyId}`}
                                            type="date"
                                            value={vigencia[keyId]?.final || ''}
                                            readOnly
                                            disabled={true}
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed"
                                        />
                                    </div>

                                    {!isSeguradoraPreenchida ? (
                                        <button
                                            onClick={async () => {
                                                await onConfirmInsurer &&
                                                    onConfirmInsurer(
                                                        lead.ID,
                                                        valores[keyId]?.PremioLiquido === null ? null : valores[keyId]?.PremioLiquido / 100,
                                                        valores[keyId]?.insurer, // seguradora local
                                                        parseFloat(String(valores[keyId]?.Comissao || '0').replace(',', '.')),
                                                        valores[keyId]?.Parcelamento,
                                                        vigencia[keyId]?.inicio,
                                                        vigencia[keyId]?.final,
                                                        valores[keyId]?.MeioPagamento || '',
                                                        valores[keyId]?.CartaoPortoNovo || ''
                                                    );
                                            }}
                                            disabled={isButtonDisabled}
                                            title={isButtonDisabled ? 'Preencha todos os campos para confirmar.' : 'Confirmar e finalizar renovação.'}
                                            className={`w-full py-3 rounded-xl font-bold transition duration-300 shadow-lg flex items-center justify-center ${
                                                isButtonDisabled
                                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                        >
                                            <CheckCircle size={20} className="mr-2" />
                                            Concluir Venda!
                                        </button>
                                    ) : (
                                        <div className="w-full py-3 px-4 rounded-xl font-bold bg-green-100 text-green-700 flex items-center justify-center border border-green-300">
                                            <CheckCircle size={20} className="mr-2" />
                                            Renovado!
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Rodapé e Paginação */}
            {renovadosFiltradosInterno.length > 0 && (
                <div className="mt-8 flex justify-center bg-white p-4 rounded-xl shadow-lg">
                    <div className="flex justify-center items-center gap-4 mt-0 pb-8">
                        <button
                            onClick={handlePaginaAnterior}
                            disabled={paginaCorrigida <= 1 || isLoading}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition duration-150 shadow-md ${
                                (paginaCorrigida <= 1 || isLoading)
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-white border-indigo-500 text-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                            Anterior
                        </button>

                        <span className="text-gray-700 font-semibold">
                            Página {paginaCorrigida} de {totalPaginas}
                        </span>

                        <button
                            onClick={handlePaginaProxima}
                            disabled={paginaCorrigida >= totalPaginas || isLoading}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition duration-150 shadow-md ${
                                (paginaCorrigida >= totalPaginas || isLoading)
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-white border-indigo-500 text-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Renovados;
