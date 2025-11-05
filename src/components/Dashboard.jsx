import React, { useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react'; // Importação do ícone de refresh

// --- NOVOS ESTILOS PARA CARDS MAIS COMPACTOS E MINIMALISTAS ---
const compactCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '15px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const valueTextStyle = {
  fontSize: '26px',
  fontWeight: '700',
  marginTop: '5px',
  lineHeight: '1.2',
};

const titleTextStyle = {
  fontSize: '12px',
  color: '#6b7280',
  fontWeight: '500',
  textTransform: 'uppercase',
  marginBottom: '0',
};

// --- COMPONENTE: Gráfico Circular de Progresso (Estilos adaptados) ---
const CircularProgressChart = ({ percentage }) => {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));
  const circumference = 2 * Math.PI * 50; // cerca de 314.16
  const dashoffset = circumference - (normalizedPercentage / 100) * circumference;

  return (
    <div style={{
      width: '100px',
      height: '100px',
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
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#059669"
          strokeWidth="8"
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s linear',
            strokeDasharray: circumference,
            strokeDashoffset: dashoffset,
          }}
        />
      </svg>
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

  const getPrimeiroDiaMes = () => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  };

  const getUltimoDiaMes = () => {
    const hoje = new Date();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return ultimoDia.toISOString().slice(0, 10);
  };

  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaMes());
  const [dataFim, setDataFim] = useState(getUltimoDiaMes());
  const [filtroAplicado, setFiltroAplicado] = useState({
    inicio: getPrimeiroDiaMes(),
    fim: getUltimoDiaMes(),
  });

  const getValidDateStr = (dateValue) => {
    if (!dateValue) return null;
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString().slice(0, 10);
  };

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

  useEffect(() => {
    buscarLeadsClosedFromAPI();
  }, []);

  const aplicarFiltroData = () => {
    setFiltroAplicado({ inicio: dataInicio, fim: dataFim });
  };

  // --- PROTEÇÕES: garantir que trabalhamos com arrays ---
  const safeLeads = leads ? (Array.isArray(leads) ? leads : Object.values(leads)) : [];
  const safeLeadsClosed = leadsClosed ? (Array.isArray(leadsClosed) ? leadsClosed : Object.values(leadsClosed)) : [];

  // proteger usuarioLogado
  const isAdmin = usuarioLogado?.tipo === 'Admin';
  const userName = usuarioLogado?.nome || '';

  // Filtro por data dos leads gerais (vindos via prop `leads`)
  const leadsFiltradosPorDataGeral = safeLeads.filter((lead) => {
    if (!lead) return false;
    if (lead.status === 'Cancelado') return false;

    const dataLeadStr = getValidDateStr(lead.createdAt);
    if (!dataLeadStr) return false;
    if (filtroAplicado.inicio && dataLeadStr < filtroAplicado.inicio) return false;
    if (filtroAplicado.fim && dataLeadStr > filtroAplicado.fim) return false;
    return true;
  });

  // === AQUI: novo cálculo de "Total de Renovações" usando a coluna I (índice 8) da aba "Apolices" do Sheets.
  const extractTotalFromApolicesColumnI = () => {
    if (!leads) return 0;

    // localizar aba Apolices (várias variações)
    const sheet = leads.Apolices ?? leads.apolices ?? leads.APOLICES ?? null;
    let values = [];

    // Helper: limpar e converter string numérica (ex: "1.234,56" -> 1234.56)
    const toNumber = (v) => {
      if (v === null || v === undefined || v === '') return NaN;
      if (typeof v === 'number') return v;
      const s = String(v).trim();
      // remover caracteres não numéricos exceto . e ,
      // tratar formatos comuns BR (1.234,56) e EN (1,234.56)
      // estratégia: se contém ',' e '.' e ',' aparece after last '.', assume BR -> remove '.' and replace ',' with '.'
      // se contains ',' and not '.', replace ',' with '.'
      if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
        // se último '.' vem antes de última ',': BR
        if (s.lastIndexOf('.') < s.lastIndexOf(',')) {
          return Number(s.replace(/\./g, '').replace(',', '.'));
        }
        // senão, assume EN (commas are thousands)
        return Number(s.replace(/,/g, ''));
      } else if (s.indexOf(',') > -1) {
        return Number(s.replace(/\./g, '').replace(',', '.'));
      } else {
        return Number(s.replace(/[^0-9.-]/g, ''));
      }
    };

    if (Array.isArray(sheet)) {
      // Caso: sheet é array de arrays (rows)
      if (sheet.length > 1 && Array.isArray(sheet[0])) {
        for (let i = 1; i < sheet.length; i++) {
          const row = sheet[i];
          const cell = row ? row[8] : undefined; // coluna I = index 8
          if (cell !== undefined && cell !== null && cell !== '') {
            values.push(cell);
          }
        }
      } else if (sheet.length > 0 && typeof sheet[0] === 'object' && !Array.isArray(sheet[0])) {
        // sheet é array de objetos -> procurar key que represente "TotalRenovacoes"
        const candidateKey = Object.keys(sheet[0]).find(k => /total.*renov/i.test(k));
        if (candidateKey) {
          for (const row of sheet) {
            const v = row[candidateKey];
            if (v !== undefined && v !== null && v !== '') values.push(v);
          }
        } else {
          // fallback: tentar pegar propriedade na posição 8 caso os objetos estejam ordenados
          for (const row of sheet) {
            const keys = Object.keys(row);
            const k = keys[8];
            if (k) {
              const v = row[k];
              if (v !== undefined && v !== null && v !== '') values.push(v);
            }
          }
        }
      } else {
        // fallback simples: pular primeiro elemento e pegar índice 8 se existir
        for (let i = 1; i < sheet.length; i++) {
          const cell = sheet[i];
          if (cell !== undefined && cell !== null && cell !== '') values.push(cell);
        }
      }
    } else if (Array.isArray(leads)) {
      // leads é a própria matriz da aba
      if (leads.length > 1 && Array.isArray(leads[0])) {
        for (let i = 1; i < leads.length; i++) {
          const row = leads[i];
          const cell = row ? row[8] : undefined;
          if (cell !== undefined && cell !== null && cell !== '') values.push(cell);
        }
      } else if (leads.length > 0 && typeof leads[0] === 'object' && !Array.isArray(leads[0])) {
        const candidateKey = Object.keys(leads[0]).find(k => /total.*renov/i.test(k));
        if (candidateKey) {
          for (const row of leads) {
            const v = row[candidateKey];
            if (v !== undefined && v !== null && v !== '') values.push(v);
          }
        } else {
          for (const row of leads) {
            const keys = Object.keys(row);
            const k = keys[8];
            if (k) {
              const v = row[k];
              if (v !== undefined && v !== null && v !== '') values.push(v);
            }
          }
        }
      }
    }

    // Somar os valores numéricos encontrados
    let sum = 0;
    for (const v of values) {
      const n = toNumber(v);
      if (!isNaN(n)) sum += n;
    }

    // Se não houver valores numéricos, como fallback, retornar o número de linhas (ex.: contar linhas a partir da 2)
    if (sum === 0 && values.length === 0) {
      // tentar contar linhas da aba ignorando header
      if (Array.isArray(sheet) && sheet.length > 1) {
        return sheet.length - 1;
      }
      if (Array.isArray(leads) && leads.length > 1) {
        return leads.length - 1;
      }
      return 0;
    }

    return sum;
  };

  const totalLeads = extractTotalFromApolicesColumnI();
  // === fim do ajuste solicitado ===

  const leadsPerdidos = leadsFiltradosPorDataGeral.filter((lead) => lead.status === 'Perdido').length;

  // Filtra leads fechados por responsável e data
  let leadsFiltradosClosed = isAdmin
    ? safeLeadsClosed
    : safeLeadsClosed.filter((lead) => lead?.Responsavel === userName);

  leadsFiltradosClosed = leadsFiltradosClosed.filter((lead) => {
    if (!lead) return false;
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

  const leadsFechadosCount = portoSeguro + azulSeguros + itauSeguros + demais;

  const totalPremioLiquido = leadsFiltradosClosed.reduce(
    (acc, lead) => acc + (Number(lead?.PremioLiquido) || 0),
    0
  );

  const somaPonderadaComissao = leadsFiltradosClosed.reduce((acc, lead) => {
    const premio = Number(lead?.PremioLiquido) || 0;
    const comissao = Number(lead?.Comissao) || 0;
    return acc + premio * (comissao / 100);
  }, 0);

  const comissaoMediaGlobal =
    totalPremioLiquido > 0 ? (somaPonderadaComissao / totalPremioLiquido) * 100 : 0;

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
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            marginBottom: '30px',
          }}>
            {/* Contador: Total de Leads */}
            <div style={{ ...compactCardStyle, minWidth: '150px' }}>
                <p style={titleTextStyle}>Total de Renovações</p>
                <p style={{ ...valueTextStyle, color: '#1f2937' }}>{totalLeads}</p>
            </div>

            {/* Contador: Vendas */}
            <div style={{ ...compactCardStyle, backgroundColor: '#d1fae5', border: '1px solid #a7f3d0' }}>
                <p style={{ ...titleTextStyle, color: '#059669' }}>Renovados</p>
                <p style={{ ...valueTextStyle, color: '#059669' }}>{leadsFechadosCount}</p>
            </div>

            {/* Contador: Leads Perdidos */}
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
              gridTemplateColumns: 'repeat(4, 1fr)',
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
          {usuarioLogado?.tipo === 'Admin' && (
            <>
            <h2 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>Métricas Financeiras</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
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
