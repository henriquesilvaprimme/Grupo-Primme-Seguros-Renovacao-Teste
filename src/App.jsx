import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Renovacoes from './Renovacoes'; // RENOMEADO
import Renovados from './Renovados'; // RENOMEADO
import RenovacoesPerdidas from './RenovacoesPerdidas'; // RENOMEADO
import BuscarLead from './BuscarLead';
import CriarUsuario from './pages/CriarUsuario';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import Ranking from './pages/Ranking';
import CriarLead from './pages/CriarLead';

// Este componente agora vai rolar o elemento com a ref para o topo
function ScrollToTop({ scrollContainerRef }) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [pathname, scrollContainerRef]);

  return null;
}

// URLs ADAPTADAS
const GOOGLE_APPS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=getLeads`; 
const GOOGLE_SHEETS_RENOVADOS = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_clientes_fechados`; 
const GOOGLE_SHEETS_USERS_AUTH_URL = `https://script.google.com/macros/s/AKfycby8vujvd5ybEpkaZ0kwZecAWOdaL0XJR84oKJBAIR9dVYeTCv7iSdTdHQWBb7YCp349/exec?v=pegar_usuario`;
const SALVAR_AGENDAMENTO_SCRIPT_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}?action=salvarAgendamento`;
const SALVAR_OBSERVACAO_SCRIPT_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}`;

function App() {
  const navigate = useNavigate();
  const mainContentRef = useRef(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  // ESTADOS RENOMEADOS
  const [renovacoes, setRenovacoes] = useState([]); // leads -> renovacoes
  const [renovados, setRenovados] = useState([]); // leadsFechados -> renovados
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  const [usuarios, setUsuarios] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [leadsCount, setLeadsCount] = useState(0);
  const [ultimoFechadoId, setUltimoFechadoId] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/background.png';
    img.onload = () => setBackgroundLoaded(true);
  }, []);

  const fetchUsuariosForLogin = useCallback(async () => {
    try {
      const response = await fetch(GOOGLE_SHEETS_USERS_AUTH_URL);
      const data = await response.json();

      if (Array.isArray(data)) {
        setUsuarios(data.map(item => ({
          id: item.id || '',
          usuario: item.usuario || '',
          nome: item.nome || '',
          email: item.email || '',
          senha: item.senha || '',
          status: item.status || 'Ativo',
          tipo: item.tipo || 'Usuario',
        })));
      } else {
        setUsuarios([]);
        console.warn('Resposta inesperada ao buscar usuários para login:', data);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários para login:', error);
      setUsuarios([]);
    }
  }, []);

  useEffect(() => {
    if (!isEditing) {
      fetchUsuariosForLogin();
      const interval = setInterval(fetchUsuariosForLogin, 60000);
      return () => clearInterval(interval);
    }
  }, [isEditing, fetchUsuariosForLogin]);

  const formatarDataParaExibicao = (dataString) => {
    if (!dataString) return '';
    try {
      let dateObj;
      const partesHifen = dataString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const partesBarra = dataString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

      if (partesHifen) {
        dateObj = new Date(dataString + 'T00:00:00');
      } else if (partesBarra) {
        dateObj = new Date(`${partesBarra[3]}-${partesBarra[2]}-${partesBarra[1]}T00:00:00`);
      } else {
        dateObj = new Date(dataString);
      }

      if (isNaN(dateObj.getTime())) {
        console.warn('Data inválida para exibição:', dataString);
        return dataString;
      }

      const dia = String(dateObj.getDate()).padStart(2, '0');
      const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
      const ano = dateObj.getFullYear();
      const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const mesExtenso = nomeMeses[dateObj.getMonth()];
      const anoCurto = String(ano).substring(2);

      return `${dia}/${mesExtenso}/${anoCurto}`;
    } catch (error) {
      console.error('Erro ao formatar data para exibição:', error);
      return dataString;
    }
  };

  // FUNÇÃO RENOMEADA E REESCRITA COM useCallback para evitar warnings
  const fetchRenovacoesFromSheet = useCallback(async (sheetName = 'Renovações') => {
    const url = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=getLeads&sheet=${sheetName}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        const sortedData = data;
        
        const formattedRenovacoes = sortedData.map((item, index) => ({
          id: item.id ? Number(item.id) : index + 1,
          name: item.name || item.Name || '',
          vehicleModel: item.vehiclemodel || item.vehicleModel || '',
          vehicleYearModel: item.vehicleyearmodel || item.vehicleYearModel || '',
          city: item.city || '',
          phone: item.phone || item.Telefone || '',
          insuranceType: item.insurancetype || item.insuranceType || '',
          status: item.status || 'Selecione o status',
          confirmado: item.confirmado === 'true' || item.confirmado === true,
          insurer: item.insurer || '',
          insurerConfirmed: item.insurerConfirmed === 'true' || item.insurerConfirmed === true,
          usuarioId: item.usuarioId ? Number(item.usuarioId) : null,
          premioLiquido: item.premioLiquido || '',
          comissao: item.comissao || '',
          parcelamento: item.parcelamento || '',
          VigenciaFinal: item.VigenciaFinal || '',
          VigenciaInicial: item.VigenciaInicial || '',
          createdAt: item.data || new Date().toISOString(),
          responsavel: item.responsavel || '',
          editado: item.editado || '',
          observacao: item.observacao || '',
          agendamento: item.agendamento || '',
          agendados: item.agendados || '',
        }));

        if (!leadSelecionado) {
          setRenovacoes(formattedRenovacoes); 
        }
      } else {
        if (!leadSelecionado) {
          setRenovacoes([]); 
        }
      }
    } catch (error) {
      console.error('Erro ao buscar renovações da planilha:', error); 
      if (!leadSelecionado) {
        setRenovacoes([]); 
      }
    }
  }, [leadSelecionado]);

  useEffect(() => {
    if (!isEditing) {
      fetchRenovacoesFromSheet('Renovações');  
      const interval = setInterval(() => {
        fetchRenovacoesFromSheet('Renovações');  
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isEditing, fetchRenovacoesFromSheet]);

  // FUNÇÃO RENOMEADA E REESCRITA COM useCallback para evitar warnings
  const fetchRenovadosFromSheet = useCallback(async () => {
    try {
      const response = await fetch(GOOGLE_SHEETS_RENOVADOS) 
      const data = await response.json();

      const formattedData = data.map(item => ({
        ...item,
        insuranceType: item.insuranceType || '',
        insurerConfirmed: item.insurerConfirmed === 'true' || item.insurerConfirmed === true, // Garante que o estado seja lido
      }));
      setRenovados(formattedData); 

    } catch (error) {
      console.error('Erro ao buscar renovados:', error); 
      setRenovados([]); 
    }
  }, []);

  useEffect(() => {
    if (!isEditing) {
      fetchRenovadosFromSheet(); 
      const interval = setInterval(() => {
        fetchRenovadosFromSheet(); 
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isEditing, fetchRenovadosFromSheet]);

  const adicionarUsuario = (usuario) => {
    setUsuarios((prev) => [...prev, { ...usuario, id: prev.length + 1 }]);
  };

  // FUNÇÃO RENOMEADA
  const adicionarNovoRenovacao = (novoLead) => {
    setRenovacoes((prevRenovacoes) => { 
      if (!prevRenovacoes.some(lead => lead.ID === novoLead.ID)) {
        return [novoLead, ...prevRenovacoes];
      }
      return prevRenovacoes;
    });
  };

  // FUNÇÃO RENOMEADA
  const atualizarStatusRenovacao = (id, novoStatus, phone) => {
    setRenovacoes((prev) => 
      prev.map((lead) =>
        lead.phone === phone ? { ...lead, status: novoStatus, confirmado: true } : lead
      )
    );

    if (novoStatus === 'Fechado') {
      setRenovados((prev) => { 
        const jaExiste = prev.some((lead) => lead.phone === phone);

        if (jaExiste) {
          const atualizados = prev.map((lead) =>
            lead.phone === phone ? { ...lead, Status: novoStatus, confirmado: true } : lead
          );
          return atualizados;
        } else {
          const leadParaAdicionar = renovacoes.find((lead) => lead.phone === phone); 

          if (leadParaAdicionar) {
            const novoRenovado = { 
              ID: leadParaAdicionar.id || crypto.randomUUID(),
              name: leadParaAdicionar.name,
              vehicleModel: leadParaAdicionar.vehicleModel,
              vehicleYearModel: leadParaAdicionar.vehicleYearModel,
              city: leadParaAdicionar.city,
              phone: leadParaAdicionar.phone,
              insuranceType: leadParaAdicionar.insuranceType || leadParaAdicionar.insuranceType || "",
              Data: leadParaAdicionar.createdAt || new Date().toISOString(),
              Responsavel: leadParaAdicionar.responsavel || "",
              Status: "Fechado",
              Seguradora: leadParaAdicionar.insurer || "",
              PremioLiquido: leadParaAdicionar.premioLiquido || "",
              Comissao: leadParaAdicionar.Comissao || "",
              Parcelamento: leadParaAdicionar.Parcelamento || "",
              VigenciaFinal: leadParaAdicionar.VigenciaFinal || "",
              VigenciaInicial: leadParaAdicionar.VigenciaInicial || "",
              observacao: leadParaAdicionar.observacao || ''
            };
            return [...prev, novoRenovado]; 
          }
          console.warn("Lead não encontrado na lista principal para adicionar aos renovados."); 
          return prev;
        }
      });
    }
  };
    
  const handleConfirmAgendamento = async (leadId, dataAgendada) => {
    try {
      const response = await fetch(SALVAR_AGENDAMENTO_SCRIPT_URL, {
        method: 'POST',
        // Removido mode: 'no-cors' para tentar ler a resposta
        body: JSON.stringify({
          leadId: leadId,
          dataAgendada: dataAgendada,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Recarrega as renovações para que a nova data apareça
      if (response.ok) {
        await fetchRenovacoesFromSheet(); 
      } else {
        console.error("Erro ao salvar agendamento no GAS.");
      }
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
    }
  };

  // FUNÇÃO RENOMEADA
  const atualizarSeguradoraRenovacao = (id, seguradora) => {
    setRenovacoes((prev) => 
      prev.map((lead) =>
        lead.id === id
          ? limparCamposLead({ ...lead, insurer: seguradora })
          : lead
      )
    );
  };

  const limparCamposLead = (lead) => ({
    ...lead,
    premioLiquido: "",
    comissao: "",
    VigenciaFinal: "",
    VigenciaInicial: "",
  })

  // FUNÇÃO CRÍTICA AJUSTADA (FOCO NA SEGURADORA E CONFIRMAÇÃO DO BOTÃO)
  const confirmarSeguradoraRenovado = async (id, premio, seguradora, comissao, parcelamento, vigenciaFinal, vigenciaInicial) => {
    // 1. Atualiza o estado local ANTES de chamar o GAS para dar a sensação de feedback rápido
    let renovadoAtualizado = null;
    setRenovados((prev) => { 
      const atualizados = prev.map((l) => {
        if (l.ID === id) {
          renovadoAtualizado = {
            ...l,
            insurerConfirmed: true,
            Seguradora: seguradora, // ESTE É O NOME DO CAMPO NA PLANILHA (Coluna K)
            PremioLiquido: premio,
            Comissao: comissao,
            Parcelamento: parcelamento,
            VigenciaFinal: vigenciaFinal || '',
            VigenciaInicial: vigenciaInicial || ''
          };
          return renovadoAtualizado;
        }
        return l;
      });
      return atualizados;
    });

    if (!renovadoAtualizado) {
      console.error(`Renovado com ID ${id} não encontrado para envio ao GAS.`);
      return;
    }

    // 2. Envia os dados atualizados para o GAS
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        // REMOVIDO mode: 'no-cors' para permitir a leitura da resposta JSON
        body: JSON.stringify({
          v: 'alterar_seguradora',
          lead: renovadoAtualizado // ENVIA O OBJETO ATUALIZADO
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('Dados da seguradora salvos com sucesso no Google Sheets.');
        // 3. Força a recarga da lista para confirmar a atualização
        await fetchRenovadosFromSheet(); 
      } else {
        console.error('GAS retornou erro ao salvar seguradora:', result.message);
        // Opcional: Reverter o estado local aqui se o GAS falhar.
      }
    } catch (error) {
      console.error('Erro de rede ou JSON ao enviar renovado para o GAS:', error); 
      // O botão deve desativar o loading no componente Renovados.jsx
    }
  };

  // FUNÇÃO RENOMEADA
  const atualizarDetalhesRenovado = (id, campo, valor) => {
    setRenovados((prev) => 
      prev.map((lead) =>
        lead.ID === id ? { ...lead, [campo]: valor } : lead
      )
    );
  };

  // FUNÇÃO RENOMEADA
  const transferirRenovacao = (leadId, responsavelId) => {
    if (responsavelId === null) {
      setRenovacoes((prev) => 
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, responsavel: null } : lead
        )
      );
      return;
    }

    let usuario = usuarios.find((u) => u.id == responsavelId);

    if (!usuario) {
      return;
    }

    setRenovacoes((prev) => 
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, responsavel: usuario.nome } : lead
      )
    );
  };

  const onAbrirLead = (lead) => {
    setLeadSelecionado(lead);

    // CORREÇÃO CRUCIAL: As rotas aqui DEVEM refletir as novas rotas.
    let path = '/renovacoes'; 
    if (String(lead.Status || lead.status) === 'Fechado') path = '/renovados'; 
    else if (String(lead.Status || lead.status) === 'Perdido') path = '/renovacoes-perdidas'; 

    navigate(path);
  };

  const handleLogin = () => {
    const usuarioEncontrado = usuarios.find(
      (u) => u.usuario === loginInput && u.senha === senhaInput && u.status === 'Ativo'
    );

    if (usuarioEncontrado) {
      setIsAuthenticated(true);
      setUsuarioLogado(usuarioEncontrado);
    } else {
      alert('Login ou senha inválidos ou usuário inativo.');
    }
  };
    
  // FUNÇÃO PARA SALVAR OBSERVAÇÃO
  const salvarObservacao = async (leadId, observacao) => {
    try {
      const response = await fetch(SALVAR_OBSERVACAO_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'salvarObservacao',
          leadId: leadId,
          observacao: observacao,
        }),
      });
    
      if (response.ok) {
        console.log('Observação salva com sucesso!');
        fetchRenovacoesFromSheet(); 
      } else {
        console.error('Erro ao salvar observação:', response.statusText);
      }
    } catch (error) {
      console.error('Erro de rede ao salvar observação:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen bg-cover bg-center transition-opacity duration-1000 ${
          backgroundLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url('/background.png')`,
        }}
      >
        <div className="bg-blue-900 bg-opacity-60 text-white p-10 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 mb-2 flex items-center justify-center text-4xl text-yellow-400">
              👑
            </div>
            <h1 className="text-xl font-semibold">GRUPO</h1>
            <h2 className="text-2xl font-bold text-white">PRIMME SEGUROS</h2>
            <p className="text-sm text-white">CORRETORA DE SEGUROS</p>
          </div>

          <input
            type="text"
            placeholder="Usuário"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded text-black"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className="w-full mb-2 px-4 py-2 rounded text-black"
          />
          <div className="text-right text-sm mb-4">
            <a href="#" className="text-white underline">
            </a>
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            ENTRAR
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = usuarioLogado?.tipo === 'Admin';

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar isAdmin={isAdmin} nomeUsuario={usuarioLogado} />

      <main ref={mainContentRef} style={{ flex: 1, overflow: 'auto' }}>
        <ScrollToTop scrollContainerRef={mainContentRef} />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                leadsClosed={ 
                  isAdmin
                    ? renovados 
                    : renovados.filter((lead) => lead.Responsavel === usuarioLogado.nome) 
                }
                leads={ 
                  isAdmin
                    ? renovacoes 
                    : renovacoes.filter((lead) => lead.responsavel === usuarioLogado.nome) 
                }
                usuarioLogado={usuarioLogado}
                setIsEditing={setIsEditing}
              />
            }
          />
          <Route
            path="/renovacoes" 
            element={
              <Renovacoes 
                leads={isAdmin ? renovacoes : renovacoes.filter((lead) => lead.responsavel === usuarioLogado.nome)} 
                usuarios={usuarios}
                onUpdateStatus={atualizarStatusRenovacao} 
                fetchLeadsFromSheet={fetchRenovacoesFromSheet} 
                transferirLead={transferirRenovacao} 
                usuarioLogado={usuarioLogado}
                leadSelecionado={leadSelecionado}
                setIsEditing={setIsEditing}
                scrollContainerRef={mainContentRef}
                onConfirmAgendamento={handleConfirmAgendamento}
                salvarObservacao={salvarObservacao}
              />
            }
          />
          <Route
            path="/renovados" 
            element={
              <Renovados 
                leads={isAdmin ? renovados : renovados.filter((lead) => lead.Responsavel === usuarioLogado.nome)} 
                usuarios={usuarios}
                onUpdateInsurer={atualizarSeguradoraRenovacao} 
                onConfirmInsurer={confirmarSeguradoraRenovado} // FUNÇÃO CRÍTICA
                onUpdateDetalhes={atualizarDetalhesRenovado} 
                fetchLeadsFechadosFromSheet={fetchRenovadosFromSheet} 
                isAdmin={isAdmin}
                ultimoFechadoId={ultimoFechadoId}
                onAbrirLead={onAbrirLead}
                leadSelecionado={leadSelecionado}
                formatarDataParaExibicao={formatarDataParaExibicao}
                setIsEditing={setIsEditing}
                scrollContainerRef={mainContentRef}
              />
            }
          />
          <Route
            path="/renovacoes-perdidas" 
            element={
              <RenovacoesPerdidas 
                leads={isAdmin ? renovacoes.filter((lead) => lead.status === 'Perdido') : renovacoes.filter((lead) => lead.responsavel === usuarioLogado.nome && lead.status === 'Perdido')} 
                usuarios={usuarios}
                fetchLeadsFromSheet={fetchRenovacoesFromSheet} 
                onAbrirLead={onAbrirLead}
                isAdmin={isAdmin}
                leadSelecionado={leadSelecionado}
                setIsEditing={setIsEditing}
              />
            }
          />
          <Route path="/buscar-lead" element={<BuscarLead 
            leads={renovacoes} 
            fetchLeadsFromSheet={fetchRenovacoesFromSheet} 
            fetchLeadsFechadosFromSheet={fetchRenovadosFromSheet} 
            setIsEditing={setIsEditing}
          />} />
          <Route
            path="/criar-lead"
            element={<CriarLead adicionarLead={adicionarNovoRenovacao} />} 
          />
          {isAdmin && (
            <>
              <Route path="/criar-usuario" element={<CriarUsuario adicionarUsuario={adicionarUsuario} />} />
              <Route
                path="/usuarios"
                element={<GerenciarUsuarios />}
              />
            </>
          )}
          <Route path="/ranking" element={<Ranking
            usuarios={usuarios}
            fetchLeadsFromSheet={fetchRenovacoesFromSheet} 
            fetchLeadsFechadosFromSheet={fetchRenovadosFromSheet} 
            leads={renovacoes} />} /> 
          <Route path="*" element={<h1 style={{ padding: 20 }}>Página não encontrada</h1>} />
        </Routes>
      </main>
    </div>
  );
}

const formatarDataParaDDMMYYYY = (dataString) => {
  if (!dataString) return '';

  try {
    let dateObj;
    const partesHifen = dataString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (partesHifen) {
      dateObj = new Date(`${partesHifen[1]}-${partesHifen[2]}-${partesHifen[3]}T00:00:00`);
    } else {
      const partesBarra = dataString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (partesBarra) {
        dateObj = new Date(`${partesBarra[3]}-${partesBarra[2]}-${partesBarra[1]}T00:00:00`);
      } else {
        dateObj = new Date(dataString);
      }
    }

    if (isNaN(dateObj.getTime())) {
      console.warn('formatarDataParaDDMMYYYY: Data inválida detectada:', dataString);
      return dataString;
    }

    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mesIndex = dateObj.getMonth();
    const ano = dateObj.getFullYear();
    const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                       "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const mesExtenso = nomeMeses[mesIndex];
    const anoCurto = String(ano).substring(2);

    return `${dia}/${mesExtenso}/${anoCurto}`;
  } catch (e) {
    console.error("Erro na função formatarDataParaDDMMYYYY:", e);
    return dataString;
  }
};

export default App;
