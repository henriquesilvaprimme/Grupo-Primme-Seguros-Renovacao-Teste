import React, { useState, useEffect } from 'react';
import { RefreshCcw, Pencil, Save } from 'lucide-react'; // Importação dos ícones necessários

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
  const circumference = 314;
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
  
  // --- NOVOS ESTADOS PARA EDIÇÃO DO VALOR FIXO ---
  const [totalRenovacoes, setTotalRenovacoes] = useState(0); // Valor fixo salvo
  const [isEditingRenovacoes, setIsEditingRenovacoes] = useState(false); // Modo de edição
  const [newTotalRenovacoesValue, setNewTotalRenovacoesValue] = useState(0); // Valor no input
  const [isSaving, setIsSaving] = useState(false); // Estado de salvamento
  // -------------------------------------------------
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' }); // Para mensagens de erro/sucesso

  // URL do seu Google Apps Script (GAS)
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

  // 🚀 FUNÇÕES PARA O FILTRO DE DATA ATUALIZADO (Primeiro e Último dia do Mês)
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
    fim: getUltimoDiaMes()
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
      const respostaLeads = await fetch(
        `${GAS_URL}?v=pegar_clientes_fechados`
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

  // Busca o total de renovações fixo (célula Apolices!I2)
  // Observação: usamos GET com modo 'cors' para conseguir ler o JSON retornado.
  const fetchTotalRenovacoes = async () => {
    setIsSaving(true);
    try {
      // Tentativas em diferentes parâmetros que seu GAS pode aceitar
      const endpointsToTry = [
        `${GAS_URL}?action=getTotalRenovacoesFromCell`,
        `${GAS_URL}?v=getTotalRenovacoes`,
        `${GAS_URL}?v=getTotalRenovacoesFromCell`,
        `${GAS_URL}?action=getTotalRenovacoes`
      ];

      let lastError = null;
      let data = null;

      for (const url of endpointsToTry) {
        try {
          console.log('Tentando buscar totalRenovacoes em:', url);
          const resp = await fetch(url, {
            method: 'GET',
            mode: 'cors', // necessário para ler o corpo da resposta
            headers: { 'Accept': 'application/json' },
          });

          console.log('Status resposta:', resp.status, 'type:', resp.type);

          const text = await resp.text();
          console.log('Resposta bruta do endpoint:', text);

          if (!text) {
            lastError = new Error('Resposta vazia do endpoint ' + url);
            continue;
          }

          // Tenta parse JSON
          try {
            data = JSON.parse(text);
          } catch (parseErr) {
            // Se não for JSON, tenta converter o texto para número
            const numeric = Number(text.trim());
            if (!Number.isNaN(numeric)) {
              data = { totalRenovacoes: numeric };
            } else {
              throw new Error('Não foi possível parsear JSON nem extrair número do texto');
            }
          }

          // Se chegou até aqui temos 'data'
          break;
        } catch (err) {
          console.warn('Falha ao consultar endpoint de totalRenovacoes:', err);
          lastError = err;
          data = null;
          // continua para próximo endpoint
        }
      }

      if (!data) {
        console.error('Não foi possível obter totalRenovacoes de nenhum endpoint. Erro final:', lastError);
        setTotalRenovacoes(0);
        setNewTotalRenovacoesValue(0);
        return;
      }

      // Aceita strings ou numbers; tenta converter para inteiro
      let fetchedValue = 0;
      if (data.totalRenovacoes !== undefined && data.totalRenovacoes !== null) {
        const numeric = Number(data.totalRenovacoes);
        fetchedValue = Number.isNaN(numeric) ? 0 : Math.floor(numeric);
      } else {
        const firstVal = Object.values(data)[0];
        const numeric = Number(firstVal);
        fetchedValue = Number.isNaN(numeric) ? 0 : Math.floor(numeric);
      }

      setTotalRenovacoes(fetchedValue);
      setNewTotalRenovacoesValue(fetchedValue);

    } catch (error) {
      console.error('Erro inesperado ao buscar total de renovações:', error);
      setTotalRenovacoes(0);
      setNewTotalRenovacoesValue(0);
    } finally {
      setIsSaving(false);
    }
  };

  // Salva o novo valor fixo de renovações na célula Apolices!I2
  // Mantive o POST usando mode: 'no-cors' conforme você solicitou.
  const saveTotalRenovacoes = async () => {
    setMessage({ text: '', type: '' });
    const valueToSave = Math.floor(Number(newTotalRenovacoesValue)); // Garante inteiro
    
    if (isNaN(valueToSave) || valueToSave < 0) {
      setMessage({ text: 'O valor deve ser um número inteiro positivo.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        v: 'setTotalRenovacoes', // ajuste se seu GAS espera outro parâmetro (ex: action=updateTotalRenovacoes)
        totalRenovacoes: valueToSave,
      };

      // POST com no-cors (como você pediu):
      await fetch(`${GAS_URL}?${new URLSearchParams(payload).toString()}`, {
        method: 'POST',
        mode: 'no-cors', // mantido conforme sua instrução
      });

      // Feedback imediato e tentativa de revalidação/refresh do valor
      setTotalRenovacoes(valueToSave);
      setIsEditingRenovacoes(false);
      setMessage({ text: 'Total de Renovações salvo com sucesso!', type: 'success' });

      // Delay curto para garantir que o GAS tenha escrito no Sheets,
      // depois tentamos buscar via GET (cors) para confirmar o valor gravado.
      setTimeout(() => {
        fetchTotalRenovacoes();
      }, 800);

    } catch (error) {
      console.error('Erro ao salvar total de renovações:', error);
      setMessage({ text: 'Erro ao salvar: verifique a configuração do seu GAS.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // refresh automático ao entrar na aba
  useEffect(() => {
    buscarLeadsClosedFromAPI();
    fetchTotalRenovacoes(); // Busca o valor fixo ao montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltroData = () => {
    setFiltroAplicado({ inicio: dataInicio, fim: dataFim });
  };

  // Filtro por data dos leads gerais (vindos via prop `leads`)
  const leadsFiltradosPorDataGeral = leads.filter((lead) => {
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

  // Cálculo: Porcentagem de Vendidos (usando o totalRenovacoes FIXO como base)
  const porcentagemVendidos = totalRenovacoes > 0 ? (leadsFechadosCount / totalRenovacoes) * 100 : 0;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ color: '#1f2937', marginBottom: '20px', fontWeight: '700' }}>Dashboard de Vendas</h1>

      {/* Mensagens de Sucesso/Erro */}
      {message.text && (
        <div style={{
          padding: '10px 20px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: message.type === 'error' ? '#fecaca' : '#d1fae5',
          color: message.type === 'error' ? '#b91c1c' : '#065f46',
          fontWeight: '600',
        }}>
          {message.text}
        </div>
      )}


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
          onClick={() => { buscarLeadsClosedFromAPI(); fetchTotalRenovacoes(); }}
          disabled={isLoading || isSaving}
          style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px', height: '40px' }}
        >
          {(isLoading || isSaving) ? (
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px',
            marginBottom: '30px',
          }}>
            
            {/* Contador: Total de Renovações (Fixo e Editável) */}
            <div style={{ ...compactCardStyle, minWidth: '150px', position: 'relative' }}>
              <p style={titleTextStyle}>Total Renovações (Meta)</p>
              
              {isEditingRenovacoes ? (
                // --- MODO EDIÇÃO ---
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={newTotalRenovacoesValue}
                    onChange={(e) => setNewTotalRenovacoesValue(e.target.value)}
                    min="0"
                    style={{ 
                      ...valueTextStyle, 
                      color: '#1f2937', 
                      width: '80px', 
                      textAlign: 'center',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      padding: '2px 0'
                    }}
                  />
                  <button
                    onClick={saveTotalRenovacoes}
                    disabled={isSaving}
                    style={{ 
                      backgroundColor: '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      padding: '4px 10px', 
                      marginTop: '8px',
                      cursor: 'pointer', 
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isSaving ? 'Salvando...' : <><Save size={16} /> Salvar</>}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingRenovacoes(false);
                      setNewTotalRenovacoesValue(totalRenovacoes);
                    }}
                    style={{
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        border: 'none',
                        marginTop: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                // --- MODO VISUALIZAÇÃO ---
                <>
                  <p style={{ ...valueTextStyle, color: '#1f2937' }}>
                    {totalRenovacoes}
                  </p>
                  <button
                    onClick={() => setIsEditingRenovacoes(true)}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280'
                    }}
                    title="Editar Total de Renovações"
                  >
                    <Pencil size={16} />
                  </button>
                </>
              )}
              
            </div>

            {/* Contador: Renovados (Vendas) */}
            <div style={{ ...compactCardStyle, backgroundColor: '#d1fae5', border: '1px solid #a7f3d0' }}>
              <p style={{ ...titleTextStyle, color: '#059669' }}>Renovados (Mês)</p>
              <p style={{ ...valueTextStyle, color: '#059669' }}>{leadsFechadosCount}</p>
            </div>

            {/* Contador: Leads Perdidos */}
            <div style={{ ...compactCardStyle, backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}>
              <p style={{ ...titleTextStyle, color: '#ef4444' }}>Perdidos (Mês)</p>
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
          <h2 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>Renovações por Seguradora (Mês)</h2>
          <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
            <h2 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>Métricas Financeiras (Mês)</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
