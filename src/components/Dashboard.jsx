import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCcw, Pencil, Save, BookOpen } from 'lucide-react'; // Adicionado BookOpen para o novo contador

// --- ESTILOS ---
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
  textAlign: 'center',
};

const valueTextStyle = {
  fontSize: '26px',
  fontWeight: '700',
  marginTop: '5px',
  lineHeight: '1.2',
  wordBreak: 'break-all',
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

  // --- ESTADOS DE RENOVAÇÃO (Meta Editável) ---
  const [totalRenovacoesMeta, setTotalRenovacoesMeta] = useState(0); // I1: Valor fixo salvo (META)
  const [isEditingRenovacoes, setIsEditingRenovacoes] = useState(false);
  const [newTotalRenovacoesValue, setNewTotalRenovacoesValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // --- NOVO ESTADO (Valor da célula I2) ---
  const [renovacoesApolicesI2, setRenovacoesApolicesI2] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // URL do seu Google Apps Script (GAS)
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';

  // Helper: extrai e normaliza o primeiro número encontrado no texto
  const parseNumberFromText = (raw) => {
    if (raw === undefined || raw === null) return null;
    const withoutHtml = String(raw).replace(/<[^>]*>/g, ' ').replace(/\u00A0/g, ' ').trim();
    const numberRegex = /[-+]?(?:\d{1,3}(?:[.,\s]\d{3})+|\d+)(?:[.,]\d+)?/;
    const match = withoutHtml.match(numberRegex);
    if (!match) return null;

    let numStr = match[0].replace(/\s/g, '');

    if (numStr.includes('.') && numStr.includes(',')) {
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else if (numStr.includes(',')) {
      numStr = numStr.replace(',', '.');
    } else if (numStr.includes('.')) {
      const parts = numStr.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        numStr = parts.join('');
      }
    }

    const parsed = parseFloat(numStr);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  };

  // JSONP loader (retorna Promise) — usado como fallback quando CORS/fetch falham
  function loadJsonp(url, timeout = 9000) {
    return new Promise((resolve, reject) => {
      const callbackName = '__gas_cb_' + Math.random().toString(36).slice(2);
      // define callback global
      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };

      const script = document.createElement('script');
      script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
      script.async = true;

      function cleanup() {
        try { delete window[callbackName]; } catch (e) {}
        if (script.parentNode) script.parentNode.removeChild(script);
        clearTimeout(timer);
      }

      script.onerror = () => {
        cleanup();
        reject(new Error('Erro ao carregar JSONP'));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout JSONP'));
      }, timeout);

      document.body.appendChild(script);
    });
  }

  // Data helpers
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
      const respostaLeads = await fetch(`${GAS_URL}?v=pegar_clientes_fechados`);
      const dadosLeads = await respostaLeads.json();
      setLeadsClosed(dadosLeads);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  // NOVO: Busca o total de renovações da célula Apolices!I2 com fallback JSONP
  const fetchRenovacoesByCell = async () => {
    const url = `${GAS_URL}?action=getRenovacoesCellI2`;
    try {
      // 1) tenta fetch normal (requer CORS configurado no GAS)
      try {
        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json, text/plain, */*' },
        });

        if (resp.ok) {
          // tenta ler como texto primeiro (pode ser apenas um número/texto)
          try {
            const text = await resp.text();
            const parsed = parseNumberFromText(text);
            if (parsed !== null) {
              const finalVal = Math.max(0, Math.floor(Number(parsed) || 0));
              setRenovacoesApolicesI2(finalVal);
              console.log(`Valor de Apolices!I2 (Renovações) lido via fetch/text: ${finalVal}`);
              return;
            }
          } catch (tErr) {
            console.warn('Erro ao ler texto de resposta de getRenovacoesCellI2:', tErr);
          }

          // tenta JSON como fallback
          try {
            const json = await resp.json();
            let num = null;
            if (json && json.totalRenovacoes !== undefined) {
              num = parseNumberFromText(String(json.totalRenovacoes)) ?? Number(json.totalRenovacoes);
            } else if (typeof json === 'number') {
              num = json;
            } else if (typeof json === 'string') {
              num = parseNumberFromText(json);
            } else if (json && typeof json === 'object') {
              const v = Object.values(json)[0];
              if (v !== undefined) {
                num = parseNumberFromText(String(v)) ?? Number(v);
              }
            }

            if (num !== null && !Number.isNaN(num)) {
              const finalVal = Math.max(0, Math.floor(Number(num)));
              setRenovacoesApolicesI2(finalVal);
              console.log(`Valor de Apolices!I2 (Renovações) lido via fetch/json: ${finalVal}`);
              return;
            } else {
              console.warn('fetch ok mas não conseguiu extrair número do JSON/texto (I2).');
            }
          } catch (jErr) {
            console.warn('Não foi possível parsear JSON de getRenovacoesCellI2:', jErr);
          }
        } else {
          console.warn('fetch retornou status não-OK para I2:', resp.status);
        }
      } catch (fetchErr) {
        console.warn('fetch (CORS) falhou para getRenovacoesCellI2, tentando JSONP:', fetchErr);
      }

      // 2) fallback JSONP
      try {
        const data = await loadJsonp(url, 9000);
        let num = null;
        if (data && data.totalRenovacoes !== undefined) {
          num = parseNumberFromText(String(data.totalRenovacoes)) ?? Number(data.totalRenovacoes);
        } else if (typeof data === 'number') {
          num = data;
        } else if (typeof data === 'string') {
          num = parseNumberFromText(data);
        } else if (data && typeof data === 'object') {
          const v = Object.values(data)[0];
          if (v !== undefined) num = parseNumberFromText(String(v)) ?? Number(v);
        }

        if (num !== null && !Number.isNaN(num)) {
          const finalVal = Math.max(0, Math.floor(Number(num)));
          setRenovacoesApolicesI2(finalVal);
          console.log(`Valor de Apolices!I2 (Renovações) lido via JSONP: ${finalVal}`);
          return;
        } else {
          throw new Error('JSONP não retornou número válido para I2.');
        }
      } catch (jsonpErr) {
        console.error('Erro ao buscar renovações da célula I2 (fallback JSONP falhou):', jsonpErr);
        setRenovacoesApolicesI2(0);
      }

    } catch (error) {
      console.error('Erro ao buscar renovações da célula I2:', error);
      setRenovacoesApolicesI2(0);
    }
  };

  // Busca a Meta de renovações (célula I1) com fallback JSONP
  const fetchTotalRenovacoesMeta = async () => {
    setIsSaving(true);
    const url = `${GAS_URL}?action=getTotalRenovacoes`;
    try {
      // 1) tenta fetch normal (CORS)
      try {
        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json, text/plain, */*' },
        });

        if (resp.ok) {
          // tenta texto primeiro
          try {
            const text = await resp.text();
            const parsed = parseNumberFromText(text);
            if (parsed !== null) {
              const finalVal = Math.max(0, Math.floor(Number(parsed) || 0));
              setTotalRenovacoesMeta(finalVal);
              setNewTotalRenovacoesValue(finalVal);
              setMessage({ text: '', type: '' });
              console.log('Meta I1 lida via fetch/text:', finalVal);
              return;
            }
          } catch (tErr) {
            console.warn('Erro ao ler texto da resposta de getTotalRenovacoes:', tErr);
          }

          // tenta JSON
          try {
            const json = await resp.json();
            let num = null;
            if (json && json.totalRenovacoes !== undefined) {
              num = parseNumberFromText(String(json.totalRenovacoes)) ?? Number(json.totalRenovacoes);
            } else if (typeof json === 'number') {
              num = json;
            } else if (typeof json === 'string') {
              num = parseNumberFromText(json);
            } else if (json && typeof json === 'object') {
              const v = Object.values(json)[0];
              if (v !== undefined) num = parseNumberFromText(String(v)) ?? Number(v);
            }

            if (num !== null && !Number.isNaN(num)) {
              const finalVal = Math.max(0, Math.floor(Number(num)));
              setTotalRenovacoesMeta(finalVal);
              setNewTotalRenovacoesValue(finalVal);
              setMessage({ text: '', type: '' });
              console.log('Meta I1 lida via fetch/json:', finalVal);
              return;
            } else {
              console.warn('fetch ok mas não conseguiu extrair número do JSON/texto (I1).');
            }
          } catch (jErr) {
            console.warn('Não foi possível parsear JSON de getTotalRenovacoes:', jErr);
          }
        } else {
          console.warn('fetch retornou status não-OK para I1:', resp.status);
        }
      } catch (fetchErr) {
        console.warn('fetch (CORS) falhou para getTotalRenovacoes, tentando JSONP:', fetchErr);
      }

      // 2) fallback JSONP
      try {
        const data = await loadJsonp(url, 9000);
        let num = null;
        if (data && data.totalRenovacoes !== undefined) {
          num = parseNumberFromText(String(data.totalRenovacoes)) ?? Number(data.totalRenovacoes);
        } else if (typeof data === 'number') {
          num = data;
        } else if (typeof data === 'string') {
          num = parseNumberFromText(data);
        } else if (data && typeof data === 'object') {
          const v = Object.values(data)[0];
          if (v !== undefined) num = parseNumberFromText(String(v)) ?? Number(v);
        }

        if (num !== null && !Number.isNaN(num)) {
          const finalVal = Math.max(0, Math.floor(Number(num)));
          setTotalRenovacoesMeta(finalVal);
          setNewTotalRenovacoesValue(finalVal);
          setMessage({ text: '', type: '' });
          console.log('Meta I1 lida via JSONP:', finalVal);
          return;
        } else {
          throw new Error('JSONP não retornou número válido para I1.');
        }
      } catch (jsonpErr) {
        console.error('Fallback JSONP falhou para getTotalRenovacoes:', jsonpErr);
        setTotalRenovacoesMeta(0);
        setNewTotalRenovacoesValue(0);
        setMessage({ text: 'Não foi possível obter Meta I1 (CORS/JSONP falhou).', type: 'error' });
        return;
      }

    } catch (error) {
      console.error('Erro ao buscar total de renovações (META I1):', error);
      setTotalRenovacoesMeta(0);
      setNewTotalRenovacoesValue(0);
      setMessage({ text: `Erro ao buscar Meta I1: ${error.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Salva o novo valor fixo de renovações na célula Apolices!I1
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
        action: 'setTotalRenovacoes',
        totalRenovacoes: valueToSave,
      };

      // POST com no-cors (necessário se o GAS não retornar nada no final da execução):
      await fetch(`${GAS_URL}?${new URLSearchParams(payload).toString()}`, {
        method: 'POST',
        mode: 'no-cors',
      });

      // Feedback imediato e revalidação
      setTotalRenovacoesMeta(valueToSave);
      setIsEditingRenovacoes(false);
      setMessage({ text: 'Meta de Renovações (I1) salva com sucesso!', type: 'success' });

      // Delay curto para garantir que o GAS tenha escrito no Sheets, depois busca via GET para confirmar
      setTimeout(() => {
        fetchTotalRenovacoesMeta();
      }, 800);

    } catch (error) {
      console.error('Erro ao salvar total de renovações (META I1):', error);
      setMessage({ text: 'Erro ao salvar Meta I1: verifique a configuração do seu GAS.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // refresh automático ao entrar na aba
  useEffect(() => {
    buscarLeadsClosedFromAPI();
    fetchTotalRenovacoesMeta();
    fetchRenovacoesByCell(); // Busca o valor da célula I2
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltroData = () => {
    setFiltroAplicado({ inicio: dataInicio, fim: dataFim });
  };

  // --- FILTROS E CÁLCULOS ---
  const leadsFiltradosPorDataGeral = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.status === 'Cancelado') return false;

      const dataLeadStr = getValidDateStr(lead.createdAt);
      if (!dataLeadStr) return false;
      if (filtroAplicado.inicio && dataLeadStr < filtroAplicado.inicio) return false;
      if (filtroAplicado.fim && dataLeadStr > filtroAplicado.fim) return false;
      return true;
    });
  }, [leads, filtroAplicado]);

  const totalLeads = leadsFiltradosPorDataGeral.length;
  const leadsPerdidos = leadsFiltradosPorDataGeral.filter((lead) => lead.status === 'Perdido').length;

  const leadsFiltradosClosed = useMemo(() => {
    let filtrados = usuarioLogado.tipo === 'Admin'
      ? leadsClosed
      : leadsClosed.filter((lead) => lead.Responsavel === usuarioLogado.nome);

    return filtrados.filter((lead) => {
      const dataLeadStr = getValidDateStr(lead.Data);
      if (!dataLeadStr) return false;
      if (filtroAplicado.inicio && dataLeadStr < filtroAplicado.inicio) return false;
      if (filtroAplicado.fim && dataLeadStr > filtroAplicado.fim) return false;
      return true;
    });
  }, [leadsClosed, filtroAplicado, usuarioLogado.tipo, usuarioLogado.nome]);


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

  // Cálculo: Porcentagem de Vendidos (usando a META totalRenovacoesMeta como base)
  const porcentagemVendidos = totalRenovacoesMeta > 0 ? (leadsFechadosCount / totalRenovacoesMeta) * 100 : 0;
  // --- FIM DOS CÁLCULOS ---


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
          onClick={() => { buscarLeadsClosedFromAPI(); fetchTotalRenovacoesMeta(); fetchRenovacoesByCell(); }}
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
          {/* Primeira Seção: 4 Contadores Principais (Grid com 4 colunas) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px',
            marginBottom: '30px',
          }}>

            {/* NOVO: Contador: Renovações Lidas da Célula I2 */}
            <div style={{ ...compactCardStyle, backgroundColor: '#eff6ff', border: '1px solid #93c5fd' }}>
              <p style={{ ...titleTextStyle, color: '#2563eb' }}>Renovações (Célula I2)</p>
              <BookOpen size={24} style={{ color: '#2563eb', marginBottom: '5px' }} />
              <p style={{ ...valueTextStyle, color: '#2563eb' }}>
                {renovacoesApolicesI2}
              </p>
            </div>

            {/* Contador: Total de Renovações (Meta Editável I1) */}
            <div style={{ ...compactCardStyle, minWidth: '150px', position: 'relative' }}>
              <p style={titleTextStyle}>Meta (Célula I1)</p>

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
                      setNewTotalRenovacoesValue(totalRenovacoesMeta);
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
                    {totalRenovacoesMeta}
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
                    title="Editar Meta de Renovações"
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

          </div>

          {/* Seção de Gráfico (Sempre no topo da segunda linha para mobile/desktop) */}
          <div style={{
            ...compactCardStyle,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '30px',
            maxWidth: '250px',
            margin: '0 auto 30px',
          }}>
            <h3 style={{ ...titleTextStyle, color: '#1f2937', marginBottom: '5px' }}>Taxa de Renovação (vs. Meta I1)</h3>
            <CircularProgressChart percentage={porcentagemVendidos} />
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
