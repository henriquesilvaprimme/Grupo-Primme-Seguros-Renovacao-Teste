import React, { useState, useEffect } from 'react';
import { Search, Phone, Calendar, Shield, User } from 'lucide-react';

const GOOGLE_APPS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

const Segurados = () => {
  const [segurados, setSegurados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSegurados, setFilteredSegurados] = useState([]);

  useEffect(() => {
    fetchSegurados();
  }, []);

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
    try {
      // Buscar da aba "Leads Fechados"
      const responseFechados = await fetch(`${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_clientes_fechados`);
      const dataFechados = await responseFechados.json();

      // Buscar da aba "Renovados" (se existir endpoint específico, ajuste aqui)
      // Por enquanto, vamos assumir que "Renovados" também vem de pegar_clientes_fechados
      // Se houver endpoint separado, adicione aqui
      const responseRenovados = await fetch(`${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_renovados`).catch(() => ({ json: () => [] }));
      const dataRenovados = await responseRenovados.json ? await responseRenovados.json() : [];

      // Combinar e remover duplicatas por telefone
      const todosClientes = [...(Array.isArray(dataFechados) ? dataFechados : []), ...(Array.isArray(dataRenovados) ? dataRenovados : [])];
      
      const clientesUnicos = todosClientes.reduce((acc, cliente) => {
        const existe = acc.find(c => c.phone === cliente.phone);
        if (!existe) {
          acc.push({
            name: cliente.name || cliente.Name || '',
            phone: cliente.phone || cliente.Telefone || '',
            vehicleModel: cliente.vehicleModel || cliente.vehiclemodel || '',
            vehicleYearModel: cliente.vehicleYearModel || cliente.vehicleyearmodel || '',
            city: cliente.city || '',
            insuranceType: cliente.insuranceType || cliente.insurancetype || '',
            Seguradora: cliente.Seguradora || '',
            VigenciaFinal: cliente.VigenciaFinal || '',
            VigenciaInicial: cliente.VigenciaInicial || '',
            Responsavel: cliente.Responsavel || cliente.responsavel || '',
            PremioLiquido: cliente.PremioLiquido || '',
            Comissao: cliente.Comissao || '',
            Parcelamento: cliente.Parcelamento || '',
          });
        } else {
          // Se já existe, atualizar com a vigência mais recente
          if (cliente.VigenciaFinal && new Date(cliente.VigenciaFinal) > new Date(existe.VigenciaFinal || '1900-01-01')) {
            Object.assign(existe, {
              VigenciaFinal: cliente.VigenciaFinal,
              VigenciaInicial: cliente.VigenciaInicial,
              Seguradora: cliente.Seguradora || existe.Seguradora,
              PremioLiquido: cliente.PremioLiquido || existe.PremioLiquido,
            });
          }
        }
        return acc;
      }, []);

      // Ordenar por vigência final mais recente
      clientesUnicos.sort((a, b) => {
        const dateA = new Date(a.VigenciaFinal || '1900-01-01');
        const dateB = new Date(b.VigenciaFinal || '1900-01-01');
        return dateB - dateA;
      });

      setSegurados(clientesUnicos);
      setFilteredSegurados(clientesUnicos);
    } catch (error) {
      console.error('Erro ao buscar segurados:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Carregando segurados...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Segurados Ativos</h1>

        {/* Barra de busca */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

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

                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span>Vigência: {formatarData(segurado.VigenciaFinal)}</span>
                </div>

                {segurado.vehicleModel && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Veículo</p>
                    <p className="font-medium text-gray-700">
                      {segurado.vehicleModel} {segurado.vehicleYearModel}
                    </p>
                  </div>
                )}

                {segurado.Seguradora && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Seguradora</p>
                    <p className="font-medium text-gray-700">{segurado.Seguradora}</p>
                  </div>
                )}

                {segurado.insuranceType && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Tipo de Seguro</p>
                    <p className="font-medium text-gray-700">{segurado.insuranceType}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredSegurados.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum segurado encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default Segurados;
