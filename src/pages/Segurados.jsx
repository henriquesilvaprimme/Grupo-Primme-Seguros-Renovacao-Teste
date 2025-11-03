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

  // map[key] = { status: 'idle'|'loading'|'found'|'not_found'|'error'|'no_cors', id, display }
  const [vehicleLeadIds, setVehicleLeadIds] = useState({});

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
      console.log('Buscando Renovações...');
      const responseRenovacoes = await fetch(`${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_renovacoes`);
      const dataRenovacoes = await responseRenovacoes.json();
      console.log('Renovações recebidos:', dataRenovacoes);

      if (dataRenovacoes && dataRenovacoes.status === 'error') {
        throw new Error(`Erro em Renovações: ${dataRenovacoes.message}`);
      }

      const todosClientes = Array.isArray(dataRenovacoes) ? dataRenovacoes : [];

      console.log('Total de clientes recebidos:', todosClientes.length);

      const clientesAgrupados = todosClientes.reduce((acc, cliente) => {
        const telefone = cliente.phone || cliente.Telefone || cliente.telefone || '';
        const nome = cliente.name || cliente.Name || cliente.nome || '';

        if (!telefone && !nome) return acc;

        const chave = `${nome}_${telefone}`;

        if (!acc[chave]) {
          acc[chave] = {
            id: cliente.id || cliente.ID || cliente.Id || '',
            name: nome,
            phone: telefone,
            city: cliente.city || cliente.Cidade || '',
            insuranceType: cliente.insuranceType || cliente.insurancetype || cliente.TipoSeguro || '',
            Responsavel: cliente.Responsavel || cliente.responsavel || '',
            status: cliente.Status || cliente.status || '',
            vehicles: []
          };
        }

        acc[chave].vehicles.push({
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

  const makeVehicleKey = (segurado, vehicle) => {
    const nome = normalizeStr(segurado.name);
    const phone = normalizeStr(segurado.phone);
    const model = normalizeStr(vehicle.vehicleModel || vehicle.vehiclemodel || '');
    const year = normalizeStr(vehicle.vehicleYearModel || vehicle.anoModelo || '');
    const seguradora = normalizeStr(vehicle.Seguradora || vehicle.seguradora || '');
    const ini = normalizeDateForCompare(vehicle.VigenciaInicial);
    const fim = normalizeDateForCompare(vehicle.VigenciaFinal);
    return `${nome}|${phone}|${model}|${year}|${seguradora}|${ini}|${fim}`;
  };

  // Busca no GAS pelo lead correspondente aos campos.
  // ATENÇÃO: com mode: 'no-cors' a resposta será opaca e não poderá ser lida pelo navegador.
  // Neste caso retornamos null e setamos status 'no_cors' para informar o usuário.
  const fetchLeadByFields = async (segurado, vehicle) => {
    const payload = {
      action: 'buscar_lead_por_campos',
      name: normalizeStr(segurado.name),
      vehicleModel: normalizeStr(vehicle.vehicleModel),
      vehicleYearModel: normalizeStr(vehicle.vehicleYearModel),
      Seguradora: normalizeStr(vehicle.Seguradora || vehicle.seguradora || segurado.insuranceType || ''),
      VigenciaInicial: normalizeDateForCompare(vehicle.VigenciaInicial),
      VigenciaFinal: normalizeDateForCompare(vehicle.VigenciaFinal)
    };

    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors', // conforme solicitado: manter no-cors
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Se a resposta for opaca (devido a no-cors), não conseguimos ler JSON
      if (response && response.type === 'opaque') {
        return null; // sinaliza que não foi possível ler por no-cors
      }

      // Tentar ler JSON (caso o navegador permita)
      const data = await response.json();

      if (!data) return null;
      if (data.status === 'error') {
        throw new Error(data.message || 'Erro do servidor ao buscar lead por campos');
      }

      const results = Array.isArray(data) ? data : (data.results || []);
      if (results.length === 0) return null;

      const nome = normalizeStr(payload.name);
      const model = normalizeStr(payload.vehicleModel);
      const year = normalizeStr(payload.vehicleYearModel);
      const seguradora = normalizeStr(payload.Seguradora);
      const ini = normalizeDateForCompare(payload.VigenciaInicial);
      const fim = normalizeDateForCompare(payload.VigenciaFinal);

      const match = results.find(r => {
        const rName = normalizeStr(r.name || r.Name || r.Nome || '');
        const rModel = normalizeStr(r.vehicleModel || r.vehiclemodel || r.Modelo || '');
        const rYear = normalizeStr(r.vehicleYearModel || r.vehicleyearmodel || r.AnoModelo || '');
        const rSeg = normalizeStr(r.Seguradora || r.seguradora || r.insuranceType || '');
        const rIni = normalizeDateForCompare(r.VigenciaInicial || r.vigenciaInicial || r.vigencia || r.Inicio || r.start);
        const rFim = normalizeDateForCompare(r.VigenciaFinal || r.vigenciaFinal || r.end || r.Final);

        return (
          rName === nome &&
          rModel === model &&
          rYear === year &&
          rSeg === seguradora &&
          rIni === ini &&
          rFim === fim
        );
      }) || results[0];

      if (!match) return null;

      return { id: match.id || match.ID || match.Id || '', full: match };
    } catch (err) {
      console.error('Erro em fetchLeadByFields:', err);
      return null;
    }
  };

  const handleBuscarId = async (segurado, vehicle) => {
    const key = makeVehicleKey(segurado, vehicle);
    setVehicleLeadIds(prev => ({ ...prev, [key]: { status: 'loading' } }));

    try {
      const res = await fetchLeadByFields(segurado, vehicle);

      if (res === null) {
        // Não foi possível ler resposta (provavelmente no-cors)
        setVehicleLeadIds(prev => ({ ...prev, [key]: { status: 'no_cors' } }));
        return;
      }

      if (!res || !res.id) {
        setVehicleLeadIds(prev => ({ ...prev, [key]: { status: 'not_found' } }));
        return;
      }

      const idStr = String(res.id);
      const last5 = idStr.slice(-5).padStart(5, '*');
      setVehicleLeadIds(prev => ({ ...prev, [key]: { status: 'found', id: idStr, display: last5 } }));
    } catch (err) {
      console.error('Erro ao buscar ID:', err);
      setVehicleLeadIds(prev => ({ ...prev, [key]: { status: 'error', message: err.message } }));
    }
  };

  // Cancelar: busca lead no GAS e só prossegue se encontrar correspondência exata.
  // Se a busca retornar null por no-cors, a operação é abortada (não enviamos cancelamento),
  // pois não conseguimos verificar os dados no servidor quando mode: 'no-cors' está ativo.
  const handleCancelar = async (segurado, vehicle) => {
    const nome = normalizeStr(segurado.name);
    const vehicleModel = normalizeStr(vehicle?.vehicleModel);
    const vehicleYearModel = normalizeStr(vehicle?.vehicleYearModel);
    const VigenciaInicial = normalizeDateForCompare(vehicle?.VigenciaInicial);
    const VigenciaFinal = normalizeDateForCompare(vehicle?.VigenciaFinal);
    const seguradora = normalizeStr(vehicle.Seguradora || vehicle.seguradora || segurado.insuranceType || '');

    const confirmMsg = `Tem certeza que deseja CANCELAR o seguro de ${nome} - ${vehicleModel} ${vehicleYearModel}?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    // Buscar lead no GAS
    let foundLead = null;
    try {
      foundLead = await fetchLeadByFields(segurado, vehicle);
    } catch (err) {
      console.error('Erro buscando lead no GAS:', err);
      alert('Erro ao buscar lead no servidor. Verifique o console.');
      return;
    }

    if (foundLead === null) {
      // resposta opaca / no-cors: não podemos verificar no servidor
      alert('Não foi possível ler a resposta do servidor (mode: no-cors). Para proteger os dados, o cancelamento foi abortado. Habilite CORS no GAS para permitir verificação.');
      // marca visualmente que a tentativa de leitura foi bloqueada
      const key = makeVehicleKey(segurado, vehicle);
      setVehicleLeadIds(prev => ({ ...prev, [key]: { status: 'no_cors' } }));
      return;
    }

    if (!foundLead || !foundLead.id) {
      alert('Nenhum lead correspondeu exatamente aos dados informados. Operação abortada.');
      return;
    }

    // validar campos do registro retornado
    const idFromSheet = String(foundLead.id);
    const matchName = normalizeStr(foundLead.full.name || foundLead.full.Name || '');
    const matchModel = normalizeStr(foundLead.full.vehicleModel || foundLead.full.vehiclemodel || '');
    const matchYear = normalizeStr(foundLead.full.vehicleYearModel || foundLead.full.vehicleyearmodel || foundLead.full.AnoModelo || '');
    const matchSeg = normalizeStr(foundLead.full.Seguradora || foundLead.full.seguradora || foundLead.full.insuranceType || '');
    const matchIni = normalizeDateForCompare(foundLead.full.VigenciaInicial || foundLead.full.vigenciaInicial || '');
    const matchFim = normalizeDateForCompare(foundLead.full.VigenciaFinal || foundLead.full.vigenciaFinal || '');

    if (
      matchName !== nome ||
      matchModel !== vehicleModel ||
      matchYear !== vehicleYearModel ||
      matchSeg !== seguradora ||
      matchIni !== VigenciaInicial ||
      matchFim !== VigenciaFinal
    ) {
      alert('Os dados encontrados na planilha não conferem exatamente com os dados do cartão. Operação abortada.');
      return;
    }

    // Enviar cancelamento para o GAS (mantendo mode: 'no-cors' conforme solicitado)
    const payload = {
      action: 'cancelar_seguro',
      id: idFromSheet,
      name: nome,
      vehicleModel,
      vehicleYearModel,
      Seguradora: seguradora,
      VigenciaInicial,
      VigenciaFinal
    };

    try {
      const resp = await fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors', // mantido conforme solicitado
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Se resp for opaco, não conseguimos ler confirmação. Ainda assim atualizamos localmente
      // porque já validamos os dados comparando com o resultado lido anteriormente.
      if (resp && resp.type === 'opaque') {
        // atualizar estado local otimista
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
                vSeg === seguradora
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

        const key = makeVehicleKey(segurado, vehicle);
        setVehicleLeadIds(prev => ({ ...prev, [key]: { status: 'found', id: idFromSheet, display: String(idFromSheet).slice(-5) } }));

        alert('Requisição enviada (no-cors). Não foi possível ler a resposta do servidor para confirmação. Verifique a planilha manualmente.');
        setTimeout(fetchSegurados, 1500);
        return;
      }

      // tentar ler resposta caso não seja opaca
      const respJson = await resp.json();
      if (respJson && respJson.status === 'error') {
        throw new Error(respJson.message || 'Erro ao cancelar no servidor');
      }

      // atualizar localmente após sucesso
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
              vSeg === seguradora
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

      const key = makeVehicleKey(segurado, vehicle);
      setVehicleLeadIds(prev => ({ ...prev, [key]: { status: 'found', id: idFromSheet, display: String(idFromSheet).slice(-5) } }));

      alert('Cancelamento efetuado com sucesso (confirmado pelo servidor).');
      setTimeout(fetchSegurados, 1000);
    } catch (err) {
      console.error('Erro ao enviar cancelamento:', err);
      alert('Erro ao enviar cancelamento. Verifique o console.');
    }
  };

  const handleSaveEndosso = async () => {
    setSavingEndosso(true);

    try {
      const payload = {
        action: 'endossar_veiculo',
        id: endossoData.clienteId,
        name: endossoData.clienteNome,
        vehicleModel: endossoData.vehicleModel,
        vehicleYearModel: endossoData.vehicleYearModel,
        premioLiquido: endossoData.premioLiquido,
        comissao: endossoData.comissao,
        meioPagamento: endossoData.meioPagamento,
        numeroParcelas: endossoData.numeroParcelas
      };

      await fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors', // mantido conforme seu pedido
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      alert('Solicitação de endosso enviada. Verifique os dados atualizados na listagem.');
      setShowEndossoModal(false);

      setTimeout(() => {
        fetchSegurados();
      }, 1200);
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
                      {segurado.vehicles.map((vehicle, vIndex) => {
                        const key = makeVehicleKey(segurado, vehicle);
                        const idInfo = vehicleLeadIds[key] || { status: 'idle' };

                        return (
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

                            <div className="flex items-center gap-2 mt-1">
                              {idInfo.status === 'idle' && (
                                <button
                                  onClick={() => handleBuscarId(segurado, vehicle)}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Buscar ID do lead
                                </button>
                              )}
                              {idInfo.status === 'loading' && (
                                <span className="text-xs text-gray-500">Buscando ID...</span>
                              )}
                              {idInfo.status === 'found' && (
                                <span className="text-xs text-gray-700">Lead ID: ****{String(idInfo.display).slice(-5)}</span>
                              )}
                              {idInfo.status === 'not_found' && (
                                <span className="text-xs text-gray-500">ID não encontrado</span>
                              )}
                              {idInfo.status === 'no_cors' && (
                                <span className="text-xs text-orange-600">Resposta bloqueada por no-cors — não é possível obter ID</span>
                              )}
                              {idInfo.status === 'error' && (
                                <span className="text-xs text-red-500">Erro ao buscar ID</span>
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
                        );
                      })}
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
