import React, { useState, useEffect } from 'react';
import { Search, Phone, Calendar, Shield, User, AlertCircle, Car, Edit, X, CheckCircle } from 'lucide-react';

const GOOGLE_APPS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

const Segurados = () => {
  const [segurados, setSegurados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSegurados, setFilteredSegurados] = useState([]);
  const [error, setError] = useState(null);
  const [anoFiltro, setAnoFiltro] = useState('');
  const [showEndossoModal, setShowEndossoModal] = useState(false);
  const [endossoData, setEndossoData] = useState({
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    vehicleModel: '',
    vehicleYearModel: '',
    premioLiquido: '',
    comissao: '',
    meioPagamento: '',
    numeroParcelas: '1',
    vigenciaInicial: '',
    vigenciaFinal: ''
  });
  const [savingEndosso, setSavingEndosso] = useState(false);

  useEffect(() => {
    let filtered = segurados;

    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(
        (segurado) =>
          (segurado.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (segurado.phone || '').includes(searchTerm)
      );
    }

    if (anoFiltro !== '' && anoFiltro !== null && typeof anoFiltro !== 'undefined') {
      filtered = filtered.filter((segurado) =>
        (segurado.vehicles || []).some((vehicle) => {
          const vigenciaInicial = vehicle.VigenciaInicial || vehicle.vigenciaInicial || '';
          if (!vigenciaInicial) return false;
          const dataVigencia = new Date(vigenciaInicial);
          if (isNaN(dataVigencia.getTime())) return false;
          return dataVigencia.getFullYear() === parseInt(anoFiltro, 10);
        })
      );
    }

    setFilteredSegurados(filtered);
  }, [searchTerm, segurados, anoFiltro]);

  const fetchSegurados = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Iniciando busca de segurados...');

      // Buscar da aba "Renovações"
      const responseRenovacoes = await fetch(`${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_renovacoes`);
      const dataRenovacoes = await responseRenovacoes.json();
      console.log('Renovações recebidos:', dataRenovacoes);

      if (dataRenovacoes && dataRenovacoes.status === 'error') {
        throw new Error(`Erro em Renovações: ${dataRenovacoes.message}`);
      }

      const todosClientes = Array.isArray(dataRenovacoes) ? dataRenovacoes : [];

      // Agrupar por nome e telefone, mas armazenar o ID de cada registro no veículo (recordId)
      const clientesAgrupados = todosClientes.reduce((acc, cliente) => {
        const telefone = cliente.phone || cliente.Telefone || cliente.telefone || '';
        const nome = cliente.name || cliente.Name || cliente.nome || '';
        if (!telefone && !nome) return acc;

        const chave = `${nome}_${telefone}`;

        if (!acc[chave]) {
          acc[chave] = {
            name: nome,
            phone: telefone,
            city: cliente.city || cliente.Cidade || '',
            insuranceType: cliente.insuranceType || cliente.insurancetype || cliente.TipoSeguro || '',
            Responsavel: cliente.Responsavel || cliente.responsavel || '',
            status: cliente.Status || cliente.status || '',
            vehicles: []
          };
        }

        // Guardar o ID do registro (por veículo) para usar no cancelamento posteriormente
        const recordId = cliente.id || cliente.ID || cliente.Id || '';

        acc[chave].vehicles.push({
          recordId,
          vehicleModel: cliente.vehicleModel || cliente.vehiclemodel || cliente.Modelo || '',
          vehicleYearModel: cliente.vehicleYearModel || cliente.vehicleyearmodel || cliente.AnoModelo || '',
          VigenciaInicial: cliente.VigenciaInicial || cliente.vigenciaInicial || '',
          VigenciaFinal: cliente.VigenciaFinal || cliente.vigenciaFinal || '',
          Seguradora: cliente.Seguradora || cliente.seguradora || cliente.insuranceType || '',
          PremioLiquido: cliente.PremioLiquido || cliente.premioLiquido || '',
          Comissao: cliente.Comissao || cliente.comissao || '',
          Parcelamento: cliente.Parcelamento || cliente.parcelamento || '',
          Endossado: cliente.Endossado || false,
          Status: cliente.Status || cliente.status || '',
          DataCancelamento: cliente.DataCancelamento || cliente.dataCancelamento || '',
        });

        return acc;
      }, {});

      const clientesUnicos = Object.values(clientesAgrupados).map(cliente => {
        cliente.vehicles.sort((a, b) => {
          const dateA = new Date(a.VigenciaFinal || '1900-01-01');
          const dateB = new Date(b.VigenciaFinal || '1900-01-01');
          return dateB - dateA;
        });
        return cliente;
      });

      clientesUnicos.sort((a, b) => {
        const dateA = new Date(a.vehicles[0]?.VigenciaFinal || '1900-01-01');
        const dateB = new Date(b.vehicles[0]?.VigenciaFinal || '1900-01-01');
        return dateB - dateA;
      });

      setSegurados(clientesUnicos);

      if (clientesUnicos.length === 0) {
        setError('Nenhum segurado encontrado nas abas "Renovações".');
      }
    } catch (err) {
      console.error('Erro ao buscar segurados:', err);
      setError(err.message || 'Erro ao buscar segurados. Verifique o console para mais detalhes.');
      setSegurados([]);
      setFilteredSegurados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEndossar = (segurado, vehicle) => {
    setEndossoData({
      clienteId: segurado.id,
      clienteNome: segurado.name,
      clienteTelefone: segurado.phone,
      vehicleModel: vehicle.vehicleModel || '',
      vehicleYearModel: vehicle.vehicleYearModel || '',
      premioLiquido: vehicle.PremioLiquido || '',
      comissao: vehicle.Comissao || '',
      meioPagamento: '',
      numeroParcelas: '1',
      vigenciaInicial: vehicle.VigenciaInicial,
      vigenciaFinal: vehicle.VigenciaFinal
    });
    setShowEndossoModal(true);
  };

  const normalizeStr = (s) => (s === null || s === undefined ? '' : String(s).trim());
  const normalizeDateForCompare = (d) => {
    if (!d && d !== 0) return '';
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    return String(d).trim();
  };

  // Cancelar: valida os 7 campos (incluindo recordId) localmente antes de enviar
  const handleCancelar = async (segurado, vehicle) => {
    const nome = normalizeStr(segurado.name);
    const vehicleModel = normalizeStr(vehicle?.vehicleModel);
    const vehicleYearModel = normalizeStr(vehicle?.vehicleYearModel);
    const VigenciaInicial = normalizeDateForCompare(vehicle?.VigenciaInicial);
    const VigenciaFinal = normalizeDateForCompare(vehicle?.VigenciaFinal);
    const seguradora = normalizeStr(vehicle.Seguradora || vehicle.seguradora || segurado.insuranceType || '');
    const recordId = vehicle.recordId ? String(vehicle.recordId) : '';

    if (!recordId) {
      alert('ID do lead não está disponível para este veículo. Não é possível cancelar com segurança.');
      return;
    }

    const confirmMsg = `Tem certeza que deseja CANCELAR o seguro de ${nome} - ${vehicleModel} ${vehicleYearModel}?`;
    if (!window.confirm(confirmMsg)) return;

    // Verificação dos 7 campos — usamos os dados já carregados do Sheets (vehicle)
    const matchId = recordId === String(vehicle.recordId);
    const matchName = nome === normalizeStr(segurado.name);
    const matchModel = vehicleModel === normalizeStr(vehicle.vehicleModel);
    const matchYear = vehicleYearModel === normalizeStr(vehicle.vehicleYearModel);
    const matchSeguradora = seguradora === normalizeStr(vehicle.Seguradora || vehicle.seguradora || segurado.insuranceType || '');
    const matchIni = VigenciaInicial === normalizeDateForCompare(vehicle.VigenciaInicial);
    const matchFim = VigenciaFinal === normalizeDateForCompare(vehicle.VigenciaFinal);

    const todosBatem = matchId && matchName && matchModel && matchYear && matchSeguradora && matchIni && matchFim;

    if (!todosBatem) {
      alert('Não foi possível confirmar todos os 7 itens (ID + 6 campos). Cancelamento abortado.');
      return;
    }

    // Montar payload com o ID e os campos para segurança
    const payload = {
      action: 'cancelar_seguro',
      id: recordId,
      name: nome,
      vehicleModel,
      vehicleYearModel,
      Seguradora: seguradora,
      VigenciaInicial,
      VigenciaFinal
    };

    try {
      // Enviar ao GAS com mode: 'no-cors' conforme solicitado
      await fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Atualização otimista local (marcar como cancelado) — só depois que validamos os 7 itens
      setSegurados((prev) =>
        prev.map((s) => {
          if (normalizeStr(s.name) !== nome) return s;

          const vehiclesAtualizados = s.vehicles.map((v) => {
            const vModel = normalizeStr(v.vehicleModel);
            const vYear = normalizeStr(v.vehicleYearModel);
            const vIni = normalizeDateForCompare(v.VigenciaInicial);
            const vFim = normalizeDateForCompare(v.VigenciaFinal);
            const vSeg = normalizeStr(v.Seguradora || v.seguradora || '');

            if (
              vModel === vehicleModel &&
              vYear === vehicleYearModel &&
              vIni === VigenciaInicial &&
              vFim === VigenciaFinal &&
              vSeg === seguradora &&
              String(v.recordId) === recordId
            ) {
              return {
                ...v,
                Status: 'Cancelado',
                DataCancelamento: new Date().toISOString()
              };
            }
            return v;
          });

          return { ...s, vehicles: vehiclesAtualizados };
        })
      );

      // Mensagem removida conforme solicitado
      setTimeout(fetchSegurados, 1200);
    } catch (err) {
      console.error('Erro ao enviar cancelamento:', err);
      alert('Erro ao enviar cancelamento. Verifique o console.');
    }
  };

  const handleSaveEndosso = async () => {
    setSavingEndosso(true);

    try {
      // 1. Atualizar Renovações (vehicleModel e vehicleYearModel)
      const payloadUpdate = {
        action: 'endossar_veiculo',
        id: endossoData.clienteId,
        name: endossoData.clienteNome,
        vehicleModel: endossoData.vehicleModel,
        vehicleYearModel: endossoData.vehicleYearModel
      };

      await fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadUpdate)
      });

      // 2. Registrar endosso em "Relatorios de Seguros Novos"
      const payloadRegister = {
        action: 'registrar_endosso',
        id: endossoData.clienteId,
        name: endossoData.clienteNome,
        seguradora: endossoData.Seguradora || '',
        premioLiquido: endossoData.premioLiquido,
        comissao: endossoData.comissao,
        meioPagamento: endossoData.meioPagamento,
        parcelamento: endossoData.numeroParcelas
      };

      await fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadRegister)
      });

      // Atualizar localmente (marcar como Endossado)
      setSegurados((prev) =>
        prev.map((s) => {
          if (s.name !== endossoData.clienteNome) return s;
          const vehiclesAtualizados = s.vehicles.map((v) => {
            if (
              v.vehicleModel === endossoData.vehicleModel &&
              v.vehicleYearModel === endossoData.vehicleYearModel
            ) {
              return {
                ...v,
                Endossado: true,
                vehicleModel: endossoData.vehicleModel,
                vehicleYearModel: endossoData.vehicleYearModel
              };
            }
            return v;
          });
          return { ...s, vehicles: vehiclesAtualizados };
        })
      );

      setShowEndossoModal(false);
      setTimeout(fetchSegurados, 1200);
    } catch (err) {
      console.error('Erro ao enviar endosso:', err);
      alert('Falha ao enviar endosso (rede/CORS). Tente novamente.');
    } finally {
      setSavingEndosso(false);
    }
  };

  const formatarData = (dataString) => {
    if (!dataString) return 'N/A';
    try {
      const date = new Date(dataString);
      if (isNaN(date.getTime())) return dataString;
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const ano = date.getFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch {
      return dataString;
    }
  };

  const gerarAnosDisponiveis = () => {
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 2; i++) {
      anos.push(i);
    }
    return anos;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Segurados Ativos</h1>

        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={anoFiltro}
            onChange={(e) => setAnoFiltro(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Todos (sem filtro)</option>
            {gerarAnosDisponiveis().map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>

          <button
            onClick={fetchSegurados}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Buscando...
              </>
            ) : (
              <>
                <Search size={20} />
                Buscar
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-red-700">{error}</div>
          </div>
        )}

        <div className="mb-4 text-gray-600">
          {filteredSegurados.length} segurado(s) encontrado(s)
          {anoFiltro && ` para o ano ${anoFiltro}`}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSegurados.map((segurado, index) => (
            <div
              key={index}
              className={`rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow border ${
                segurado.status === 'Cancelado'
                  ? 'bg-red-50 border-red-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{segurado.name}</h3>
                  {segurado.status === 'Cancelado' && (
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded">
                      <X size={12} />
                      CANCELADO
                    </div>
                  )}
                </div>
                <Shield className={segurado.status === 'Cancelado' ? 'text-red-500' : 'text-blue-500'} size={24} />
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span>{segurado.phone || 'N/A'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span>{segurado.Responsavel || 'N/A'}</span>
                </div>

                {segurado.insuranceType && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Seguradora</p>
                    <p className="font-medium text-gray-700">{segurado.insuranceType}</p>
                  </div>
                )}

                {segurado.vehicles && segurado.vehicles.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Car size={16} className="text-gray-400" />
                      <p className="text-xs font-semibold text-gray-700">
                        Veículos ({segurado.vehicles.length})
                      </p>
                    </div>

                    <div className="space-y-2">
                      {segurado.vehicles.map((vehicle, vIndex) => (
                        <div key={vIndex} className={`rounded-lg p-3 border ${vehicle.Status === "Cancelado" ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 text-sm">
                                {vehicle.vehicleModel || 'Modelo não informado'} {vehicle.vehicleYearModel}
                                {vehicle.Status === "Cancelado" && <span className="ml-2 text-red-600 font-bold">Cancelado</span>}
                              </p>
                              {vehicle.Endossado && (
                                <div className="flex items-center gap-1 mt-1">
                                  <CheckCircle size={14} className="text-green-600" />
                                  <span className="text-xs text-green-600 font-semibold">Endossado</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 ml-2">
                              <button
                                onClick={() => handleEndossar(segurado, vehicle)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                                <Edit size={12} />
                                Endossar
                              </button>
                              {vehicle.Status !== "Cancelado" && (
                                <button
                                  onClick={() => handleCancelar(segurado, vehicle)}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                                >
                                  <X size={12} />
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>

                          {vehicle.Seguradora && (
                            <p className="text-xs text-gray-600 mb-1">
                              Seguradora: {vehicle.Seguradora}
                            </p>
                          )}

                          {/* Exibição dos últimos 5 dígitos do recordId */}
                          <div className="mt-1">
                            {vehicle.recordId ? (
                              <span className="text-xs text-gray-700">Lead ID: ****{String(vehicle.recordId).slice(-5)}</span>
                            ) : (
                              <span className="text-xs text-gray-500">ID não disponível</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300">
                            <Calendar size={12} className="text-gray-400" />
                            <span>
                              {formatarData(vehicle.VigenciaInicial)} até {formatarData(vehicle.VigenciaFinal)}
                              {vehicle.Status === "Cancelado" && vehicle.DataCancelamento && (
                                <>
                                  <span className="mx-2 text-gray-400">|</span>
                                  <span className="text-red-600 font-semibold">
                                    Cancelado em: {formatarData(vehicle.DataCancelamento)}
                                  </span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredSegurados.length === 0 && !loading && !error && (
          <div className="text-center py-12 text-gray-500">
            Nenhum segurado encontrado. Clique em "Buscar" para carregar os dados.
          </div>
        )}
      </div>

      {showEndossoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Endossar Veículo</h2>
                <button
                  onClick={() => setShowEndossoModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo do Veículo
                  </label>
                  <input
                    type="text"
                    value={endossoData.vehicleModel}
                    onChange={(e) => setEndossoData({ ...endossoData, vehicleModel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano/Modelo
                  </label>
                  <input
                    type="text"
                    value={endossoData.vehicleYearModel}
                    onChange={(e) => setEndossoData({ ...endossoData, vehicleYearModel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prêmio Líquido
                  </label>
                  <input
                    type="text"
                    value={endossoData.premioLiquido}
                    onChange={(e) => setEndossoData({ ...endossoData, premioLiquido: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comissão
                  </label>
                  <input
                    type="text"
                    value={endossoData.comissao}
                    onChange={(e) => setEndossoData({ ...endossoData, comissao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meio de Pagamento
                  </label>
                  <select
                    value={endossoData.meioPagamento}
                    onChange={(e) => setEndossoData({ ...endossoData, meioPagamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione</option>
                    <option value="CP">CP</option>
                    <option value="CC">CC</option>
                    <option value="Debito">Débito</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Parcelas
                  </label>
                  <select
                    value={endossoData.numeroParcelas}
                    onChange={(e) => setEndossoData({ ...endossoData, numeroParcelas: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowEndossoModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEndosso}
                    disabled={savingEndosso}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {savingEndosso ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Segurados;
