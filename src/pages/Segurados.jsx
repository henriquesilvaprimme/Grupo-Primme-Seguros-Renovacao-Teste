import React, { useState } from 'react';
import { Search, Phone, Calendar, Car } from 'lucide-react';

const Segurados = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec'; // Substitua pela URL do seu Google Apps Script

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [fechadosResponse, renovadosResponse] = await Promise.all([
        fetch(`${GAS_URL}?action=pegar_fechados&termo=${encodeURIComponent(searchTerm)}`),
        fetch(`${GAS_URL}?action=pegar_renovados&termo=${encodeURIComponent(searchTerm)}`)
      ]);

      const fechados = await fechadosResponse.json();
      const renovados = await renovadosResponse.json();

      const allLeads = [
        ...(Array.isArray(fechados) ? fechados : []),
        ...(Array.isArray(renovados) ? renovados : [])
      ];

      // Agrupar leads pelo nome e telefone
      const groupedLeads = allLeads.reduce((acc, lead) => {
        const key = `${lead.name}_${lead.phone}`;
        
        if (!acc[key]) {
          acc[key] = {
            name: lead.name,
            phone: lead.phone,
            vehicles: []
          };
        }
        
        // Adicionar veículo com suas vigências
        acc[key].vehicles.push({
          vehicleModel: lead.vehicleModel,
          vehicleYearModel: lead.vehicleYearModel,
          vigenciaInicial: lead.vigenciaInicial,
          vigenciaFinal: lead.vigenciaFinal
        });
        
        return acc;
      }, {});

      // Converter objeto em array e ordenar por vigência mais recente
      const leadsArray = Object.values(groupedLeads).map(lead => {
        // Ordenar veículos por vigência final (mais recente primeiro)
        lead.vehicles.sort((a, b) => {
          const dateA = parseDate(a.vigenciaFinal);
          const dateB = parseDate(b.vigenciaFinal);
          return dateB - dateA;
        });
        return lead;
      });

      // Ordenar leads pela vigência final mais recente do primeiro veículo
      leadsArray.sort((a, b) => {
        const dateA = parseDate(a.vehicles[0]?.vigenciaFinal);
        const dateB = parseDate(b.vehicles[0]?.vigenciaFinal);
        return dateB - dateA;
      });

      setLeads(leadsArray);
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      setError('Erro ao buscar leads. Verifique a URL do GAS e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateString) => {
    if (!dateString) return new Date(0);
    const [day, month, year] = dateString.split('/');
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dateString;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLeads();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Segurados Ativos</h1>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map((lead, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{lead.name}</h3>
              <div className="flex items-center text-gray-600 text-sm">
                <Phone size={16} className="mr-2" />
                <span>{lead.phone}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                <Car size={16} className="mr-2" />
                Veículos ({lead.vehicles.length})
              </h4>
              
              {lead.vehicles.map((vehicle, vIndex) => (
                <div key={vIndex} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">
                        {vehicle.vehicleModel || 'Modelo não informado'}
                      </p>
                      <p className="text-xs text-gray-600">
                        Ano: {vehicle.vehicleYearModel || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300">
                    <Calendar size={14} className="mr-1" />
                    <span>
                      {formatDate(vehicle.vigenciaInicial)} até {formatDate(vehicle.vigenciaFinal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!loading && leads.length === 0 && searchTerm && (
        <div className="text-center py-12 text-gray-500">
          Nenhum segurado encontrado.
        </div>
      )}

      {!loading && leads.length === 0 && !searchTerm && (
        <div className="text-center py-12 text-gray-500">
          Use a busca acima para encontrar segurados ativos.
        </div>
      )}
    </div>
  );
};

export default Segurados;
