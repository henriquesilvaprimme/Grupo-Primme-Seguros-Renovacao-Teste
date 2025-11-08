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
      </svg> {/* <-- TAG </svg> FALTANTE ADICIONADA AQUI */}
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

// URL base do seu GAS (reutilizei a mesma usada no buscarLeadsClosedFromAPI)
const GAS_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

const Dashboard = ({ leads, usuarioLogado }) => {
  const [leadsClosed, setLeadsClosed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // NOVOS STATES para Total de Renovações espelho
  const [totalRenovacoesMirror, setTotalRenovacoesMirror] = useState(0);
  const [loadingTotalRenovacoes, setLoadingTotalRenovacoes] = useState(false);
  const [isEditingTotalRenovacoes, setIsEditingTotalRenovacoes] = useState(false);
  const [totalRenovacoesInput, setTotalRenovacoesInput] = useState('');
  const [savingTotalRenovacoes, setSavingTotalRenovacoes] = useState(false);

  // 🚀 FUNÇÕES PARA O FILTRO DE DATA ATUALIZADO (Primeiro e Último dia do Mês)
  const getPrimeiroDiaMes = () => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  };

  const getUltimoDiaMes = () => {
    // Cria uma data que é o primeiro dia do PRÓXIMO mês, e subtrai 1 dia
    const hoje = new Date();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return ultimoDia.toISOString().slice(0, 10);
  };

  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaMes());
  const [dataFim, setDataFim] = useState(getUltimoDiaMes()); // 💡 ATUALIZADO para usar o último dia
  const [filtroAplicado, setFiltroAplicado] = useState({
    inicio: getPrimeiroDiaMes(),
    fim: getUltimoDiaMes() // 💡 ATUALIZADO para usar o último dia
  });
  // --------------------------------------------------------------------------

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
      // Usando mode: 'no-cors' conforme solicitado
      await fetch(
        `${GAS_BASE_URL}?v=pegar_clientes_fechados`,
        { mode: 'no-cors' }
      ).then(async (res) => {
        // Em no-cors a resposta será opaca e não é possível ler o body.
        // Para preservar funcionalidade, tentamos ler quando possível.
        if (res && res.type === 'opaque') {
          // Não conseguimos ler body — manter estado atual (ou fazer outra estratégia).
          console.warn('Resposta opaca em pegar_clientes_fechados. Não foi possível ler body (no-cors).');
          // Não atualiza leadsClosed aqui
          return;
        }
        const dadosLeads = await res.json();
        setLeadsClosed(dadosLeads);
      });
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  // --- NOVA FUNÇÃO: Buscar valor espelho de Apolices!I2
  const fetchTotalRenovacoesFromApolices = async () => {
    setLoadingTotalRenovacoes(true);
    try {
      const res = await fetch(`${GAS_BASE_URL}?v=pegar_valor_apolice_i2`, { mode: 'no-cors' });

      if (res && res.type === 'opaque') {
        // Resposta opaca: não é possível ler o corpo.
        console.warn('Resposta opaca ao buscar Apolices!I2 (no-cors). Não é possível ler o body no navegador.');
        // Mantém o valor atual exibido (não sobrescreve).
        setLoadingTotalRenovacoes(false);
        return;
      }

      // Se não for opaco, tentamos ler o JSON (normal)
      const data = await res.json();
      const valor = data && (data.valor !== undefined) ? data.valor : 0;
      const num = Number(String(valor).replace(',', '.'));
      setTotalRenovacoesMirror(!isNaN(num) ? Math.floor(num) : 0);
    } catch (err) {
      console.error('Erro ao buscar Total de Renovacoes (Apolices!I2):', err);
      // Não altera o valor mostrado
    } finally {
      setLoadingTotalRenovacoes(false);
    }
  };

  // --- NOVA FUNÇÃO: Salvar valor em Apolices!I2 via POST (com mode:no-cors)
  const saveTotalRenovacoesToApolices = async (valueToSave) => {
    setSavingTotalRenovacoes(true);
    try {
      const payload = {
        v: 'setTotalRenovacoes',
        totalRenovacoes: valueToSave
      };

      // Em no-cors a resposta será opaca — ainda assim o GAS executará a lógica server-side.
      await fetch(GAS_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      // Atualiza otimisticamente o valor exibido (porque não conseguimos ler a resposta em no-cors)
      const num = Number(String(valueToSave).replace(',', '.'));
      if (!isNaN(num)) {
        setTotalRenovacoesMirror(Math.floor(num));
      } else {
        setTotalRenovacoesMirror(valueToSave);
      }

      setIsEditingTotalRenovacoes(false);

      // Tenta recarregar (caso o ambiente permita leitura)
      try {
        await fetchTotalRenovacoesFromApolices();
      } catch (e) {
        // se falhar, já temos valor otimista
      }

    } catch (err) {
      console.error('Erro ao salvar Total de Renovacoes em Apolices!I2:', err);
      // mantem em edição para o usuário tentar novamente
    } finally {
      setSavingTotalRenovacoes(false);
    }
  };

  // refresh automático ao entrar na aba - agora também busca o valor espelho
  useEffect(() => {
    buscarLeadsClosedFromAPI();
    fetchTotalRenovacoesFromApolices();
  }, []);

  const aplicarFiltroData = () => {
    setFiltroAplicado({ inicio: dataInicio, fim: dataFim });
  };

  // Filtro por data dos leads gerais (vindos via prop `leads`)
  const leadsFiltradosPorDataGeral = leads.filter((lead) => {
    // LÓGICA DE EXCLUSÃO: Ignora leads com status 'Cancelado'
    if (lead.status === 'Cancelado') return false;

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
          onClick={() => { buscarLeadsClosedFromAPI(); fetchTotalRenovacoesFromApolices(); }}
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
            {/* Contador: Total de Renovações - agora espelho editável */}
            <div style={{ ...compactCardStyle, minWidth: '150px' }}>
                <p style={titleTextStyle}>Total de Renovações</p>

                {/* Se estiver editando, mostra input + salvar/cancelar */}
                {isEditingTotalRenovacoes ? (
                  <>
                    <input
                      type="text"
                      value={totalRenovacoesInput}
                      onChange={(e) => setTotalRenovacoesInput(e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%', textAlign: 'center', fontSize: '20px', fontWeight: '700' }}
                      disabled={savingTotalRenovacoes}
                    />
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => saveTotalRenovacoesToApolices(totalRenovacoesInput)}
                        disabled={savingTotalRenovacoes}
                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        {savingTotalRenovacoes ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => { setIsEditingTotalRenovacoes(false); setTotalRenovacoesInput(String(totalRenovacoesMirror)); }}
                        disabled={savingTotalRenovacoes}
                        style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ ...valueTextStyle, color: '#1f2937' }}>
                      {loadingTotalRenovacoes ? '...' : totalRenovacoesMirror}
                    </p>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setIsEditingTotalRenovacoes(true); setTotalRenovacoesInput(String(totalRenovacoesMirror)); }}
                        style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={fetchTotalRenovacoesFromApolices}
                        style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Atualizar
                      </button>
                    </div>
                  </>
                )}
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
