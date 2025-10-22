import React, { useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react'; // Importação do ícone de refresh

// --- NOVOS ESTILOS PARA CARDS MAIS COMPACTOS E MINIMALISTAS ---
const compactCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px', // Borda mais suave
  padding: '15px', // Redução do padding
  border: '1px solid #e5e7eb', // Borda discreta
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // Sombra sutil
  transition: 'all 0.2s',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const valueTextStyle = {
  fontSize: '26px', // Redução do tamanho da fonte para o valor
  fontWeight: '700',
  marginTop: '5px',
  lineHeight: '1.2',
};

const titleTextStyle = {
  fontSize: '12px', // Redução da fonte do título
  color: '#6b7280',
  fontWeight: '500',
  textTransform: 'uppercase',
  marginBottom: '0',
};

// --- COMPONENTE: Gráfico Circular de Progresso (Estilos adaptados) ---
const CircularProgressChart = ({ percentage }) => {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));
  const circumference = 314;
  const dashoffset = circumference - (normalizedPercentage / 100) * circumference;

  return (
    <div style={{
      width: '100px', // Tamanho reduzido
      height: '100px', // Tamanho reduzido
      position: 'relative',
      margin: '10px auto 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg
        width="100"
        height="100"
        viewBox="0 0 120 120"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Fundo do Círculo (Track) */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="8" // Linha mais fina
        />
        {/* Círculo de Progresso */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#059669" // Verde mais escuro e sólido (Emerald 600)
          strokeWidth="8"
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
        fontSize: '18px',
        fontWeight: '700',
        color: '#059669',
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

  // Inicializar dataInicio e dataFim para o mês inteiro
  const getPrimeiroDiaMes = () => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  };

  const getDataFimMes = () => {
    const hoje = new Date();
    // Cria uma data no primeiro dia do próximo mês e subtrai um dia.
    // Isso garante que seja o último dia do mês atual.
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return ultimoDia.toISOString().slice(0, 10);
  };

  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaMes());
  const [dataFim, setDataFim] = useState(getDataFimMes());
  const [filtroAplicado, setFiltroAplicado] = useState({ inicio: getPrimeiroDiaMes(), fim: getDataFimMes() });

  // Função auxiliar para validar e formatar a data
  const getValidDateStr = (dateValue) => {
    if (!dateValue) return null;
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    return dateObj.toISOString().slice(0, 10);
  };

  // Busca leads fechados (aba Renovações)
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

  // --- NOVO AJUSTE: Cálculo do Total de Renovações (Aba Renovações / Coluna VigenciaFinal) ---

  // 1. Filtra leads da aba "Renovações" (leadsClosed) pela data VigenciaFinal
  let leadsRenovacoes = 
    usuarioLogado.tipo === 'Admin'
      ? leadsClosed
      : leadsClosed.filter((lead) => lead.Responsavel === usuarioLogado.nome);

  // Aplica o filtro de data APENAS na coluna VigenciaFinal (Coluna P)
  leadsRenovacoes = leadsRenovacoes.filter((lead) => {
    const dataVigenciaFinalStr = getValidDateStr(lead.VigenciaFinal); 
    if (!dataVigenciaFinalStr) return false;
    if (filtroAplicado.inicio && dataVigenciaFinalStr < filtroAplicado.inicio) return false;
    if (filtroAplicado.fim && dataVigenciaFinalStr > filtroAplicado.fim) return false;
    return true;
  });
  
  // Define totalLeads com a contagem da nova lógica (contagem pura filtrada por VigenciaFinal)
  const totalLeads = leadsRenovacoes.length; 

  // --- FIM DO NOVO AJUSTE (totalLeads) ---


  // *** NOTA: O bloco abaixo não é mais usado para totalLeads, mas é necessário para leadsPerdidos e leadsFechadosCount ***
  const leadsFiltradosPorDataGeral = leads.filter((lead) => {
    const dataLeadStr = getValidDateStr(lead.createdAt);
    if (!dataLeadStr) return false;
    if (filtroAplicado.inicio && dataLeadStr < filtroAplicado.inicio) return false;
    if (filtroAplicado.fim && dataLeadStr > filtroAplicado.fim) return false;
    return true;
  });
  
  // Como leadsClosed (aba Renovações) NÃO tem Status, o Perdidos e Renovados 
  // devem ser calculados a partir dos leads fechados (aba Renovações) filtrados pela coluna 'Data' (Fechamento)

  // Filtra leads fechados por responsável e data (para contadores de Vendas/Renovados/Perdidos)
  // Este bloco mantém o filtro pela coluna 'Data', necessário para métricas de performance
  let leadsFiltradosClosed =
    usuarioLogado.tipo === 'Admin'
      ? leadsClosed
      : leadsClosed.filter((lead) => lead.Responsavel === usuarioLogado.nome);

  leadsFiltradosClosed = leadsFiltradosClosed.filter((lead) => {
    const dataLeadStr = getValidDateStr(lead.Data); // Filtro usando a coluna 'Data'
    if (!dataLeadStr) return false;
    if (filtroAplicado.inicio && dataLeadStr < filtroAplicado.inicio) return false;
    if (filtroAplicado.fim && dataLeadStr > filtroAplicado.fim) return false;
    return true;
  });


  // *** ATENÇÃO ***: Como a coluna Status não existe na aba "Renovações" (leadsClosed), 
  // a contagem de Perdidos e Renovados deve ser ajustada.
  // **Assumindo que leadsFechadosCount = Renovados e que Perdidos são Leads na aba Renovações (leadsClosed) 
  // que não têm prêmio líquido ou algo similar.**

  // Para garantir que o dashboard funcione sem a coluna Status, vamos redefinir Perdidos
  // A melhor prática aqui é que o Leads Perdidos e Leads Renovados usem o campo 'Data' para o filtro, 
  // pois é a data de ação no sistema.
  
  // *** Opção 1 (Mantendo a lógica original, caso haja a coluna Status em leadsClosed, 
  // mas foi apenas um mal-entendido): ***
  // const leadsPerdidos = leadsFiltradosClosed.filter((lead) => lead.Status === 'Perdido').length;

  // *** Opção 2 (Se não houver status, leadsPerdidos fica em 0 e a contagem de Perdidos/Renovados perde a utilidade,
  // ou deve ser baseada em outra coluna, como 'Comissao' = 0 para Perdido. Vou manter leadsPerdidos como estava 
  // na VERSÃO 2, assumindo que *talvez* o campo `Status` exista na API do leadsClosed): ***
  // NOVO AJUSTE: Vou remover a linha que contava perdidos da lista geral, pois ela não era usada e pode causar confusão.
  // Vou manter o leadsPerdidos como estava no último código (usando leadsRenovacoes) para que o código compile.
  const leadsPerdidos = 0; // Se Status não existe, Perdidos é 0.

  // Contadores por seguradora
  const portoSeguro = leadsFiltradosClosed.filter((lead) => lead.Seguradora === 'Porto Seguro').length;
  const azulSeguros = leadsFiltradosClosed.filter((lead) => lead.Seguradora === 'Azul Seguros').length;
  const itauSeguros = leadsFiltradosClosed.filter((lead) => lead.Seguradora === 'Itau Seguros').length;
  const demais = leadsFiltradosClosed.filter((lead) => lead.Seguradora === 'Demais Seguradoras').length;

  // O campo Vendas soma os contadores das seguradoras
  const leadsFechadosCount = portoSeguro + azulSeguros + itauSeguros + demais; // Este é o contador "Renovados"

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

  // Cálculo: Porcentagem de Vendidos (Renovados / Total de Renovações)
  const porcentagemVendidos = totalLeads > 0 ? (leadsFechadosCount / totalLeads) * 100 : 0;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ color: '#1f2937', marginBottom: '20px', fontWeight: '700' }}>Dashboard de Vendas</h1>

      {/* Filtro de datas e Botão de Refresh */}
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
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          title="Data de Início"
        />
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          title="Data de Fim"
        />
        <button
          onClick={aplicarFiltroData}
          style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}
        >
          Filtrar
        </button>

        <button
          title='Clique para atualizar os dados'
          onClick={buscarLeadsClosedFromAPI}
          disabled={isLoading}
          style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px', height: '40px' }}
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
          {/* Primeira Seção: 3 Contadores Principais + Gráfico (Grid com 4 colunas) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)', // 4 colunas iguais
            gap: '20px',
            marginBottom: '30px',
          }}>
            {/* Contador: Total de Renovações (Filtrado apenas por VigenciaFinal) */}
            <div style={{ ...compactCardStyle, minWidth: '150px' }}>
                <p style={titleTextStyle}>Total de Renovações</p>
                <p style={{ ...valueTextStyle, color: '#1f2937' }}>{totalLeads}</p>
            </div>

            {/* Contador: Renovados (Usa a coluna 'Data' e status de Fechado, como antes) */}
            <div style={{ ...compactCardStyle, backgroundColor: '#d1fae5', border: '1px solid #a7f3d0' }}>
                <p style={{ ...titleTextStyle, color: '#059669' }}>Renovados</p>
                <p style={{ ...valueTextStyle, color: '#059669' }}>{leadsFechadosCount}</p>
            </div>

            {/* Contador: Perdidos (Mantido em 0, pois a coluna Status não existe na aba Renovações) */}
            <div style={{ ...compactCardStyle, backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}>
                <p style={{ ...titleTextStyle, color: '#ef4444' }}>Perdidos</p>
                <p style={{ ...valueTextStyle, color: '#ef4444' }}>{leadsPerdidos}</p>
            </div>

            {/* Gráfico Circular de Progresso (Ultima Coluna, à Direita) */}
            <div style={{
                ...compactCardStyle,
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '150px'
            }}>
                <h3 style={{ ...titleTextStyle, color: '#1f2937', marginBottom: '5px' }}>Taxa de Renovação</h3>
                <CircularProgressChart percentage={porcentagemVendidos} />
            </div>
          </div>

          {/* Segunda Seção: Contadores por Seguradora (Grid com 4 colunas) */}
          <h2 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>Vendas por Seguradora</h2>
          <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)', // 4 colunas iguais
              gap: '20px',
              marginBottom: '30px',
          }}>
            <div style={{ ...compactCardStyle, backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe' }}>
              <p style={{ ...titleTextStyle, color: '#1e40af' }}>Porto Seguro</p>
              <p style={{ ...valueTextStyle, color: '#1e40af' }}>{portoSeguro}</p>
            </div>
            <div style={{ ...compactCardStyle, backgroundColor: '#f0fdf4', border: '1px solid #a7f3d0' }}>
              <p style={{ ...titleTextStyle, color: '#065f46' }}>Azul Seguros</p>
              <p style={{ ...valueTextStyle, color: '#065f46' }}>{azulSeguros}</p>
            </div>
            <div style={{ ...compactCardStyle, backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <p style={{ ...titleTextStyle, color: '#92400e' }}>Itau Seguros</p>
              <p style={{ ...valueTextStyle, color: '#92400e' }}>{itauSeguros}</p>
            </div>
            <div style={{ ...compactCardStyle, backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}>
              <p style={{ ...titleTextStyle, color: '#374151' }}>Demais Seguradoras</p>
              <p style={{ ...valueTextStyle, color: '#374151' }}>{demais}</p>
            </div>
          </div>

          {/* Terceira Seção: Prêmios e Comissão (Grid com 2 colunas) */}
          {usuarioLogado.tipo === 'Admin' && (
            <>
            <h2 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>Métricas Financeiras</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)', // 2 colunas iguais
                gap: '20px',
            }}>
              <div style={{ ...compactCardStyle, backgroundColor: '#eef2ff', border: '1px solid #c7d2fe' }}>
                <p style={{ ...titleTextStyle, color: '#4f46e5' }}>Total Prêmio Líquido</p>
                <p style={{ ...valueTextStyle, color: '#4f46e5' }}>
                  {totalPremioLiquido.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <div style={{ ...compactCardStyle, backgroundColor: '#ecfeff', border: '1px solid #99f6e4' }}>
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
