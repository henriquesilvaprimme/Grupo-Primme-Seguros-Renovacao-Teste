import React, { useState, useEffect } from 'react';
import { Search, Phone, Calendar, Shield, User, AlertCircle, Car } from 'lucide-react';

const GOOGLE_APPS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

const Segurados = () => {
  const [segurados, setSegurados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSegurados, setFilteredSegurados] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSegurados(segurados);
    } else {
      const filtered = segurados.filter(
        (segurado) =>
          segurado.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          segurado.phone.includes(searchTerm)
      );
      setFilteredSegurados(filtered);
    }
  }, [searchTerm, segurados]);

  const fetchSegurados = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Iniciando busca de segurados...');
      
      // Buscar da aba "Leads Fechados"
      console.log('Buscando Leads Fechados...');
      const responseFechados = await fetch(`${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_clientes_fechados`);
      const dataFechados = await responseFechados.json();
      console.log('Leads Fechados recebidos:', dataFechados);

      // Buscar da aba "Renovados"
      console.log('Buscando Renovados...');
      const responseRenovados = await fetch(`${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_renovados`);
      const dataRenovados = await responseRenovados.json();
      console.log('Renovados recebidos:', dataRenovados);

      // Verificar se há erros nas respostas
      if (dataFechados.status === 'error') {
        throw new Error(`Erro em Leads Fechados: ${dataFechados.message}`);
      }
      if (dataRenovados.status === 'error') {
        throw new Error(`Erro em Renovados: ${dataRenovados.message}`);
      }

      // Combinar todos os clientes
      const todosClientes = [
        ...(Array.isArray(dataFechados) ? dataFechados : []), 
        ...(Array.isArray(dataRenovados) ? dataRenovados : [])
      ];
      
      console.log('Total de clientes combinados:', todosClientes.length);
      
      // Agrupar por nome e telefone, mantendo múltiplos veículos
      const clientesAgrupados = todosClientes.reduce((acc, cliente) => {
        // Normalizar os nomes dos campos
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
            vehicles: []
          };
        }
        
        // Adicionar veículo com suas vigências
        acc[chave].vehicles.push({
          vehicleModel: cliente.vehicleModel || cliente.vehiclemodel || cliente.Modelo || '',
          vehicleYearModel: cliente.vehicleYearModel || cliente.vehicleyearmodel || cliente.AnoModelo || '',
          VigenciaInicial: cliente.VigenciaInicial || cliente.vigenciaInicial || '',
          VigenciaFinal: cliente.VigenciaFinal || cliente.vigenciaFinal || '',
          Seguradora: cliente.Seguradora || cliente.seguradora || '',
          PremioLiquido: cliente.PremioLiquido || cliente.premioLiquido || '',
          Comissao: cliente.Comissao || cliente.comissao || '',
          Parcelamento: cliente.Parcelamento || cliente.parcelamento || '',
        });
        
        return acc;
      }, {});

      // Converter objeto em array
      const clientesUnicos = Object.values(clientesAgrupados).map(cliente => {
        // Ordenar veículos por vigência final mais recente
        cliente.vehicles.sort((a, b) => {
          const dateA = new Date(a.VigenciaFinal || '1900-01-01');
          const dateB = new Date(b.VigenciaFinal || '1900-01-01');
          return dateB - dateA;
        });
        return cliente;
      });

      console.log('Clientes únicos processados:', clientesUnicos.length);

      // Ordenar por vigência final mais recente do primeiro veículo
      clientesUnicos.sort((a, b) => {
        const dateA = new Date(a.vehicles[0]?.VigenciaFinal || '1900-01-01');
        const dateB = new Date(b.vehicles[0]?.VigenciaFinal || '1900-01-01');
        return dateB - dateA;
      });

      setSegurados(clientesUnicos);
      setFilteredSegurados(clientesUnicos);
      
      if (clientesUnicos.length === 0) {
        setError('Nenhum segurado encontrado nas abas "Leads Fechados" e "Renovados".');
      }
      
    } catch (error) {
      console.error('Erro ao buscar segurados:', error);
      setError(error.message || 'Erro ao buscar segurados. Verifique o console para mais detalhes.');
      setSegurados([]);
      setFilteredSegurados([]);
    } finally {
      setLoading(false);
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Segurados Ativos</h1>

        {/* Barra de busca com botão */}
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

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Contador */}
        <div className="mb-4 text-gray-600">
          {filteredSegurados.length} segurado(s) encontrado(s)
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSegurados.map((segurado, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">{segurado.name}</h3>
                <Shield className="text-blue-500" size={24} />
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
                    <p className="text-xs text-gray-500">Tipo de Seguro</p>
                    <p className="font-medium text-gray-700">{segurado.insuranceType}</p>
                  </div>
                )}

                {/* Lista de veículos */}
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
                        <div key={vIndex} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="mb-2">
                            <p className="font-medium text-gray-800 text-sm">
                              {vehicle.vehicleModel || 'Modelo não informado'} {vehicle.vehicleYearModel}
                            </p>
                          </div>
                          
                          {vehicle.Seguradora && (
                            <p className="text-xs text-gray-600 mb-1">
                              Seguradora: {vehicle.Seguradora}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300">
                            <Calendar size={12} className="text-gray-400" />
                            <span>
                              {formatarData(vehicle.VigenciaInicial)} até {formatarData(vehicle.VigenciaFinal)}
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
    </div>
  );
};

export default Segurados;
