import React, { useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react'; // Importação do ícone de refresh

// Estilos base para os cards (mais modernos)
const baseCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  flex: 1,
  minWidth: '200px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '100%',
};

const valueTextStyle = {
  fontSize: '32px',
  fontWeight: '600',
  marginTop: '8px',
  lineHeight: '1.2',
};

const titleTextStyle = {
  fontSize: '14px',
  color: '#667085',
  fontWeight: '500',
  textTransform: 'uppercase',
};

// --- NOVO COMPONENTE: Gráfico Circular de Progresso (Simulação com CSS) ---
const CircularProgressChart = ({ percentage }) => {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));
  const circumference = 314;
  const dashoffset = circumference - (normalizedPercentage / 100) * circumference;

  return (
    <div style={{
      width: '120px',
      height: '120px',
      position: 'relative',
      margin: '20px auto 0', // Adiciona margem superior
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Fundo do Círculo (Track) */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#e9ecef"
          strokeWidth="10"
        />
        {/* Círculo de Progresso */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#10B981" // Um verde mais moderno (Emerald 500)
          strokeWidth="10"
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s linear',
            strokeDasharray: circumference,
            strokeDashoffset: dashoffset,
          }}
        />
      </svg>
      {/* Texto da Porcentagem no Centro */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '22px',
        fontWeight: '700',
        color: '#10B981',
      }}>
        {normalizedPercentage.toFixed(1)}%
      </div>
    </div>
  );
};
// ------------------------------------------------------------------------

const Dashboard = ({ leads, usuarioLogado }) => {
  const [leadsClosed, setLeadsClosed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar dataInicio e dataFim com valores padrão ao carregar o componente
  const getPrimeiroDiaMes = () => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  };

  const getDataHoje = () => {
    return new Date().toISOString().slice(0, 10);
  };

  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaMes());
  const [dataFim, setDataFim] = useState(getDataHoje());
  const [filtroAplicado, setFiltroAplicado] = useState({ inicio: getPrimeiroDiaMes(), fim: getDataHoje() });

  // Função auxiliar para validar e formatar a data
  const getValidDateStr = (dateValue) => {
    if (!dateValue) return null;
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    return dateObj.toISOString().slice(0, 10);
  };

  // Busca leads fechados
  const buscarLeadsClosedFromAPI = async () => {
    setIsLoading(true);
    setLoading(true);
    try {
      const respostaLeads = await fetch(
        'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec?v=pegar_clientes_fechados'
      );
      const dadosLeads = await respostaLeads.json();
      setLeadsClosed(dadosLeads);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  // refresh automático ao entrar na aba
  useEffect(() => {
    buscarLeadsClosedFromAPI();
  }, []);

  const aplicarFiltroData = () => {
    setFiltroAplicado({ inicio: dataInicio, fim: dataFim });
  };

  // Filtro por data dos leads gerais (vindos via prop `leads`)
  const leadsFiltradosPorDataGeral = leads.filter((lead) => {
    const dataLeadStr = getValidDateStr(lead.createdAt);
    if (!dataLeadStr) return false;
    if (filtroAplicado.inicio && dataLeadStr < filtroAplicado.inicio) return false;
    if (filtroAplicado.fim && dataLeadStr > filtroAplicado.fim) return false;
    return true;
  });

  const totalLeads = leadsFiltradosPorDataGeral.length;
  const leadsPerdidos = leadsFiltradosPorDataGeral.filter((lead) => lead.status === 'Perdido').length;

  // Filtra leads fechados por responsável e data
  let leadsFiltradosClosed =
    usuarioLogado.tipo === 'Admin'
      ? leadsClosed
      : leadsClosed.filter((lead) => lead.Responsavel === usuarioLogado.nome);

  leadsFiltradosClosed = leadsFiltradosClosed.filter((lead) => {
    const dataLeadStr = getValidDateStr(lead.Data);
    if (!dataLeadStr) return false;
    if (filtroAplicado.inicio && dataLeadStr < filtroAplicado.inicio) return false;
    if (filtroAplicado.fim && dataLeadStr > filtroAplicado.fim) return false;
    return true;
  });

  // Contadores por seguradora
  const portoSeguro = leadsFiltradosClosed.filter((lead) => lead.Seguradora === 'Porto Seguro').length;
  const azulSeguros = leadsFiltradosClosed.filter((lead) => lead.Seguradora === 'Azul Seguros').length;
  const itauSeguros = leadsFiltradosClosed.filter((lead) => lead.Seguradora === 'Itau Seguros').length;
  const demais = leadsFiltradosClosed.filter((lead) => lead.Seguradora === 'Demais Seguradoras').length;

  // O campo Vendas soma os contadores das seguradoras
  const leadsFechadosCount = portoSeguro + azulSeguros + itauSeguros + demais;

  // Soma de prêmio líquido e média ponderada de comissão
  const totalPremioLiquido = leadsFiltradosClosed.reduce(
    (acc, lead) => acc + (Number(lead.PremioLiquido) || 0),
    0
  );

  const somaPonderadaComissao = leadsFiltradosClosed.reduce((acc, lead) => {
    const premio = Number(lead.PremioLiquido) || 0;
    const comissao = Number(lead.Comissao) || 0;
    return acc + premio * (comissao / 100);
  }, 0);

  const comissaoMediaGlobal =
    totalPremioLiquido > 0 ? (somaPonderadaComissao / totalPremioLiquido) * 100 : 0;

  // Cálculo: Porcentagem de Vendidos
  const porcentagemVendidos = totalLeads > 0 ? (leadsFechadosCount / totalLeads) * 100 : 0;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ color: '#1f2937', marginBottom: '20px', fontWeight: '700' }}>Dashboard de Vendas</h1>

      {/* Filtro de datas e Botão de Refresh (Estilos mais discretos) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '30px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
          }}
          title="Data de Início"
        />
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
          }}
          title="Data de Fim"
        />
        <button
          onClick={aplicarFiltroData}
          style={{
            backgroundColor: '#10B981', // Verde moderno
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Filtrar
        </button>

        {/* Botão de Refresh */}
        <button
          title='Clique para atualizar os dados'
          onClick={buscarLeadsClosedFromAPI}
          disabled={isLoading}
          style={{
            backgroundColor: '#6b7280', // Cinza escuro
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            height: '40px',
          }}
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <RefreshCcw size={20} />
          )}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>Carregando dados do dashboard...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Contêiner principal: 3 Contadores + Gráfico (Flex para alinhamento) */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '30px', flexWrap: 'wrap', alignItems: 'stretch' }}>

            {/* Sub-Contêiner para os 3 Contadores (ocupa 66% da largura) */}
            <div style={{ display: 'flex', flexGrow: 2, gap: '24px', flexBasis: 'min(66%, 700px)', flexWrap: 'wrap' }}>
                {/* Contador: Total de Leads (Neutro) */}
                <div style={{ ...baseCardStyle, minWidth: '180px' }}>
                    <p style={titleTextStyle}>Total de Leads</p>
                    <p style={{ ...valueTextStyle, color: '#1f2937' }}>{totalLeads}</p>
                </div>

                {/* Contador: Vendas (Destaque Positivo) */}
                <div style={{ ...baseCardStyle, backgroundColor: '#10B981', minWidth: '180px' }}>
                    <p style={{ ...titleTextStyle, color: 'rgba(255,255,255,0.7)' }}>Vendas</p>
                    <p style={{ ...valueTextStyle, color: '#ffffff' }}>{leadsFechadosCount}</p>
                </div>

                {/* Contador: Leads Perdidos (Destaque Negativo) */}
                <div style={{ ...baseCardStyle, backgroundColor: '#EF4444', minWidth: '180px' }}>
                    <p style={{ ...titleTextStyle, color: 'rgba(255,255,255,0.7)' }}>Perdidos</p>
                    <p style={{ ...valueTextStyle, color: '#ffffff' }}>{leadsPerdidos}</p>
                </div>
            </div>

            {/* Gráfico Circular de Progresso (Sempre à direita, ocupa 33% da largura) */}
            <div style={{
                ...baseCardStyle,
                flexGrow: 1,
                flexBasis: 'min(30%, 300px)', // Garante que ele ocupe o restante do espaço
                minWidth: '250px',
            }}>
                <h3 style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>Taxa de Conversão</h3>
                <CircularProgressChart percentage={porcentagemVendidos} />
            </div>

          </div>

          {/* Segunda linha: Contadores por Seguradora (Grid para mais estrutura) */}
          <h2 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '20px', fontWeight: '600' }}>Vendas por Seguradora</h2>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <div style={{ ...baseCardStyle, flexGrow: 1, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <p style={{ ...titleTextStyle, color: '#1e3a8a' }}>Porto Seguro</p>
              <p style={{ ...valueTextStyle, color: '#1e3a8a' }}>{portoSeguro}</p>
            </div>
            <div style={{ ...baseCardStyle, flexGrow: 1, backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
              <p style={{ ...titleTextStyle, color: '#065f46' }}>Azul Seguros</p>
              <p style={{ ...valueTextStyle, color: '#065f46' }}>{azulSeguros}</p>
            </div>
            <div style={{ ...baseCardStyle, flexGrow: 1, backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <p style={{ ...titleTextStyle, color: '#9a3412' }}>Itau Seguros</p>
              <p style={{ ...valueTextStyle, color: '#9a3412' }}>{itauSeguros}</p>
            </div>
            <div style={{ ...baseCardStyle, flexGrow: 1, backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }}>
              <p style={{ ...titleTextStyle, color: '#374151' }}>Demais Seguradoras</p>
              <p style={{ ...valueTextStyle, color: '#374151' }}>{demais}</p>
            </div>
          </div>

          {/* Somente para Admin: linha de Prêmio Líquido e Comissão */}
          {usuarioLogado.tipo === 'Admin' && (
            <>
            <h2 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '20px', fontWeight: '600' }}>Métricas Financeiras</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ ...baseCardStyle, flexGrow: 1, backgroundColor: '#eef2ff', border: '1px solid #c7d2fe' }}>
                <p style={{ ...titleTextStyle, color: '#4338ca' }}>Total Prêmio Líquido</p>
                <p style={{ ...valueTextStyle, color: '#4338ca' }}>
                  {totalPremioLiquido.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <div style={{ ...baseCardStyle, flexGrow: 1, backgroundColor: '#ecfeff', border: '1px solid #99f6e4' }}>
                <p style={{ ...titleTextStyle, color: '#0f766e' }}>Média Comissão</p>
                <p style={{ ...valueTextStyle, color: '#0f766e' }}>
                  {comissaoMediaGlobal.toFixed(2).replace('.', ',')}%
                </p>
              </div>
            </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
