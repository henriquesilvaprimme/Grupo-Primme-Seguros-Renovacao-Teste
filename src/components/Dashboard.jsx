import React, { useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react'; // Importação do ícone de refresh

// --- NOVO COMPONENTE: Gráfico Circular de Progresso (Simulação com CSS) ---
const CircularProgressChart = ({ percentage }) => {
  // Garante que a porcentagem esteja entre 0 e 100
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));
  // Calcula o dash offset (o quanto do círculo deve ser preenchido)
  // Circunferência de um círculo de raio 50 é 2 * PI * 50 ≈ 314.159
  // Usaremos um valor aproximado de 314 para facilitar o CSS inline
  const circumference = 314;
  const dashoffset = circumference - (normalizedPercentage / 100) * circumference;

  return (
    <div style={{
      width: '120px',
      height: '120px',
      position: 'relative',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        style={{ transform: 'rotate(-90deg)' }} // Rotaciona para o preenchimento começar no topo
      >
        {/* Fundo do Círculo (Track) */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#e6e6e6"
          strokeWidth="10"
        />
        {/* Círculo de Progresso */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#4CAF50" // Cor verde para o progresso
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
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333',
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

  // --- NOVO CÁLCULO: Porcentagem de Vendidos ---
  const porcentagemVendidos = totalLeads > 0 ? (leadsFechadosCount / totalLeads) * 100 : 0;
  // ---------------------------------------------

  const boxStyle = {
    padding: '10px',
    borderRadius: '5px',
    flex: 1,
    color: '#fff',
    textAlign: 'center',
    minWidth: '150px', // Garante que os boxes não fiquem muito pequenos
  };

  // Ajuste de estilo para os 3 primeiros boxes de contadores, permitindo o espaço para o gráfico
  const boxStyleContadorPrincipal = {
    ...boxStyle,
    color: '#333', // Cor do texto para os 3 principais
    flexBasis: 'calc(33.333% - 14px)', // Para que caibam 3 em uma linha com gap de 20px
    flexGrow: 0,
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>

      {/* Filtro de datas e Botão de Refresh */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
          title="Data de Início"
        />
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
          title="Data de Fim"
        />
        <button
          onClick={aplicarFiltroData}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            cursor: 'pointer',
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
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '36px',
            height: '36px',
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
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Carregando dados do dashboard...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Primeira linha: 3 Contadores Principais e o Gráfico Circular */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>

            {/* Contador: Total de Leads */}
            <div style={{ ...boxStyleContadorPrincipal, backgroundColor: '#eee' }}>
              <h3>Total de Leads</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalLeads}</p>
            </div>

            {/* Contador: Vendas */}
            <div style={{ ...boxStyleContadorPrincipal, backgroundColor: '#4CAF50', color: '#fff' }}>
              <h3>Vendas</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{leadsFechadosCount}</p>
            </div>

            {/* Contador: Leads Perdidos */}
            <div style={{ ...boxStyleContadorPrincipal, backgroundColor: '#F44336', color: '#fff' }}>
              <h3>Leads Perdidos</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{leadsPerdidos}</p>
            </div>

            {/* NOVO: Gráfico Circular de Progresso */}
            <div style={{
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              flexBasis: 'calc(33.333% - 14px)',
              flexGrow: 0,
              minWidth: '150px',
              textAlign: 'center',
            }}>
              <h3 style={{ color: '#333' }}>% de Vendidos (Leads)</h3>
              <CircularProgressChart percentage={porcentagemVendidos} />
            </div>

          </div>

          {/* Segunda linha: Contadores por Seguradora */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ ...boxStyle, backgroundColor: '#003366' }}>
              <h3>Porto Seguro</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{portoSeguro}</p>
            </div>
            <div style={{ ...boxStyle, backgroundColor: '#87CEFA', color: '#333' }}>
              <h3>Azul Seguros</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{azulSeguros}</p>
            </div>
            <div style={{ ...boxStyle, backgroundColor: '#FF8C00' }}>
              <h3>Itau Seguros</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{itauSeguros}</p>
            </div>
            <div style={{ ...boxStyle, backgroundColor: '#4CAF50' }}>
              <h3>Demais Seguradoras</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{demais}</p>
            </div>
          </div>

          {/* Somente para Admin: linha de Prêmio Líquido e Comissão */}
          {usuarioLogado.tipo === 'Admin' && (
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
              <div style={{ ...boxStyle, backgroundColor: '#3f51b5' }}>
                <h3>Total Prêmio Líquido</h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {totalPremioLiquido.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <div style={{ ...boxStyle, backgroundColor: '#009688' }}>
                <h3>Média Comissão</h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {comissaoMediaGlobal.toFixed(2).replace('.', ',')}%
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
