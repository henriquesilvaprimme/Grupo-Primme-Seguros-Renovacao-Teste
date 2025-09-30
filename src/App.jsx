import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Renovacoes from './Renovacoes';
import Renovados from './Renovados';
import RenovacoesPerdidas from './RenovacoesPerdidas';
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
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=getLeads`; // Pega da aba Renovações
const GOOGLE_SHEETS_RENOVADOS = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_clientes_fechados`; // Pega da aba Renovados
const GOOGLE_SHEETS_USERS_AUTH_URL = `https://script.google.com/macros/s/AKfycby8vujvd5ybEpkaZ0kwZecAWOdaL0XJR84oKJBAIR9dVYeTCv7iSdTdHQWBb7YCp349/exec?v=pegar_usuario`;
const SALVAR_AGENDAMENTO_SCRIPT_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}`; // Usaremos a action no POST
const SALVAR_OBSERVACAO_SCRIPT_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}`; // Usaremos a action no POST

function App() {
  const navigate = useNavigate();
  const mainContentRef = useRef(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  // ESTADOS RENOMEADOS
  const [renovacoes, setRenovacoes] = useState([]);
  const [renovados, setRenovados] = useState([]);
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  const [usuarios, setUsuarios] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [ultimoFechadoId, setUltimoFechadoId] = useState(null);
  
  // Removido leadsCount, pois não é usado de forma crucial no App.jsx

  useEffect(() => {
    const img = new Image();
    img.src = '/background.png';
    img.onload = () => setBackgroundLoaded(true);
  }, []);

  const fetchUsuariosForLogin = async () => {
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
  };

  useEffect(() => {
    if (!isEditing) {
      fetchUsuariosForLogin();
      const interval = setInterval(fetchUsuariosForLogin, 60000);
      return () => clearInterval(interval);
    }
  }, [isEditing]);

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

  // FUNÇÃO PARA BUSCAR DADOS DA ABA RENOVAÇÕES (FUNIL PRINCIPAL)
  const fetchRenovacoesFromSheet = async () => {
    // Usa o endpoint do GAS que busca da aba 'Renovações' (v=getLeads)
    const url = GOOGLE_SHEETS_SCRIPT_URL; 
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        const sortedData = data;
        
        const formattedRenovacoes = sortedData.map((item, index) => ({
          // Mapeamento do Lead da aba RENOVAÇÕES (Funil)
          id: item.id ? Number(item.id) : index + 1, // ID é o número da linha no GAS
          name: item.name || '',
          vehicleModel: item.vehiclemodel || '',
          vehicleYearModel: item.vehicleyearmodel || '',
          city: item.city || '',
          phone: item.phone || '',
          insuranceType: item.insurancetype || '',
          data: item.data || new Date().toISOString(),
          responsavel: item.responsavel || '',
          status: item.status || '',
          // Campos de Edição (K, L, M)
          editado: item.editado || '',
          observacao: item.observacao || '', // Coluna L - Índice 11 (no GAS)
          agendamento: item.agendamento || '', // Coluna M - Índice 12 (no GAS)
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
  };

  useEffect(() => {
    if (!isEditing) {
      fetchRenovacoesFromSheet();  
      const interval = setInterval(() => {
        fetchRenovacoesFromSheet();  
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [leadSelecionado, isEditing]);

  // FUNÇÃO PARA BUSCAR DADOS DA ABA RENOVADOS (FECHADOS)
  const fetchRenovadosFromSheet = async () => {
    try {
      const response = await fetch(GOOGLE_SHEETS_RENOVADOS) 
      const data = await response.json();

      const formattedData = data.map(item => ({
        // Mapeamento do Lead da aba RENOVADOS (Fechados)
        ID: String(item.ID) || crypto.randomUUID(), // Coluna A
        name: item.name || '', // Coluna B
        vehicleModel: item.vehicleModel || '', // Coluna C
        vehicleYearModel: item.vehicleYearModel || '', // Coluna D
        city: item.city || '', // Coluna E
        phone: item.phone || '', // Coluna F
        insuranceType: item.insurancetype || '', // Coluna G
        Data: item.Data || '', // Coluna H
        Responsavel: item.Responsável || '', // Coluna I (A chave no GAS é 'Responsável' com acento)
        Status: item.Status || 'Fechado', // Coluna J
        Seguradora: item.insurer || '', // Coluna K (Mapeado no GAS como 'insurer', corrigido para 'Seguradora' no objeto)
        PremioLiquido: item['Prêmio Líquido'] || null, // Coluna L (Mapeado no GAS como 'Prêmio Líquido')
        Comissao: item.Comissão || null, // Coluna M (Mapeado no GAS como 'Comissão')
        Parcelamento: item.parcelamento || '', // Coluna N (Mapeado no GAS como 'parcelamento')
        VigenciaInicial: item['Vigência Inicial'] || '', // Coluna O
        VigenciaFinal: item['Vigência Final'] || '', // Coluna P
        observacao: item.observacao || '', // Coluna Q
        // Outras propriedades para controle de UI
        insurerConfirmed: !!(item.insurer && item['Prêmio Líquido']),
        confirmado: true,
      }));
      setRenovados(formattedData); 

    } catch (error) {
      console.error('Erro ao buscar renovados:', error); 
      setRenovados([]); 
    }
  };

  useEffect(() => {
    if (!isEditing) {
      fetchRenovadosFromSheet(); 
      const interval = setInterval(() => {
        fetchRenovadosFromSheet(); 
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isEditing]);

  const adicionarUsuario = (usuario) => {
    setUsuarios((prev) => [...prev, { ...usuario, id: prev.length + 1 }]);
  };

  const adicionarNovoRenovacao = (novoLead) => {
    setRenovacoes((prevRenovacoes) => { 
      if (!prevRenovacoes.some(lead => lead.phone === novoLead.phone)) { // Mudado para checar por telefone (mais seguro que ID auto-gerado)
        return [novoLead, ...prevRenovacoes];
      }
      return prevRenovacoes;
    });
  };

  const atualizarStatusRenovacao = (id, novoStatus, phone) => {
    // 1. Atualiza o estado das Renovacoes (Funil)
    setRenovacoes((prev) => 
      prev.map((lead) =>
        lead.phone === phone ? { ...lead, status: novoStatus, confirmado: true } : lead
      )
    );

    // 2. Lógica de atualização/adição no estado Renovados (Fechados)
    if (novoStatus === 'Fechado') {
      setRenovados((prev) => { 
        const leadParaAdicionar = renovacoes.find((lead) => lead.phone === phone); 

        if (leadParaAdicionar) {
          // Adicionamos o Lead à lista de Renovados, mas com os campos de renovação zerados,
          // pois o GAS garante que a cópia para a aba Renovados zere esses campos.
          const novoRenovado = { 
            ID: leadParaAdicionar.id || crypto.randomUUID(), // ID da linha (do Renovacoes.jsx)
            name: leadParaAdicionar.name,
            vehicleModel: leadParaAdicionar.vehicleModel,
            vehicleYearModel: leadParaAdicionar.vehicleYearModel,
            city: leadParaAdicionar.city,
            phone: leadParaAdicionar.phone,
            insuranceType: leadParaAdicionar.insuranceType || "",
            Data: leadParaAdicionar.data || new Date().toISOString(),
            Responsavel: leadParaAdicionar.responsavel || "",
            Status: "Fechado",
            // Campos zerados/limpos, pois o GAS está fazendo a limpeza:
            Seguradora: "", 
            PremioLiquido: null,
            Comissao: null,
            Parcelamento: "",
            VigenciaFinal: "",
            VigenciaInicial: "",
            confirmado: true,
            observacao: leadParaAdicionar.observacao || ''
          };
          return [novoRenovado, ...prev]; // Adiciona ao topo
        }
        console.warn("Lead não encontrado na lista principal para adicionar aos renovados."); 
        return prev;
      });
    }
    
    // Se o status for "Perdido", ele será filtrado na rota RenovacoesPerdidas, mas o estado Renovados não é alterado.
  };
    
  // Agendamento no GAS não usa 'action=salvarAgendamento', usa 'v=salvarAgendamento' (ou action=salvarAgendamento)
  // Ajustando para usar 'v' ou 'action'
  const handleConfirmAgendamento = async (leadId, dataAgendada) => {
    try {
      await fetch(SALVAR_AGENDAMENTO_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          v: 'salvarAgendamento', // Action/V correta
          leadId: leadId,
          dataAgendada: dataAgendada,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Recarrega as renovações para que a nova data apareça
      await fetchRenovacoesFromSheet(); 
      
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
    }
  };

  // FUNÇÃO PARA ATUALIZAR A SELEÇÃO DE SEGURADORA NA TELA DE RENOVAÇÕES (FUNIL)
  const atualizarSeguradoraRenovacao = (id, seguradora) => {
    setRenovacoes((prev) => 
      prev.map((lead) =>
        lead.id === id
          ? limparCamposLead({ ...lead, Seguradora: seguradora }) // Usando 'Seguradora' no estado local
          : lead
      )
    );
  };

  // GARANTE QUE AO TROCAR A SEGURADORA, OS CAMPOS FINANCEIROS SEJAM ZERADOS
  const limparCamposLead = (lead) => ({
    ...lead,
    PremioLiquido: null,
    Comissao: null,
    VigenciaFinal: "",
    VigenciaInicial: "",
  })

  // FUNÇÃO PARA CONFIRMAR DADOS DE RENOVAÇÃO/SEGURO (NA ABA RENOVADOS/FECHADOS)
  const confirmarSeguradoraRenovado = (id, premio, seguradora, comissao, parcelamento, vigenciaFinal, vigenciaInicial) => {
    // Encontra o lead pelo ID (que no Renovados é o ID gerado na Coluna A)
    const renovado = renovados.find((lead) => String(lead.ID) === String(id)); 

    if (!renovado) {
      console.error(`Renovado com ID ${id} não encontrado na lista de renovados.`); 
      return;
    }

    // 1. Atualiza o estado local
    renovado.Seguradora = seguradora;
    renovado.PremioLiquido = premio;
    renovado.Comissao = comissao;
    renovado.Parcelamento = parcelamento;
    renovado.VigenciaFinal = vigenciaFinal || '';
    renovado.VigenciaInicial = vigenciaInicial || '';

    setRenovados((prev) => { 
      const atualizados = prev.map((l) =>
        String(l.ID) === String(id) ? {
          ...l,
          insurerConfirmed: true,
          Seguradora: seguradora,
          PremioLiquido: premio,
          Comissao: comissao,
          Parcelamento: parcelamento,
          VigenciaFinal: vigenciaFinal || '',
          VigenciaInicial: vigenciaInicial || ''
        } : l
      );
      return atualizados;
    });

    // 2. Envia para o GAS para salvar na aba 'Renovados' E COPIAR para a aba 'Leads' (se configurado)
    try {
      fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          v: 'alterar_seguradora',
          lead: renovado 
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
        console.log('Requisição de dados da seguradora enviada (com no-cors).');
        setTimeout(() => {
          fetchRenovadosFromSheet(); 
        }, 1000);
      })
      .catch(error => {
        console.error('Erro ao enviar renovado (rede ou CORS):', error); 
      });
    } catch (error) {
      console.error('Erro no bloco try/catch de envio do renovado:', error); 
    }
  };

  // FUNÇÃO PARA ATUALIZAR DETALHES GERAIS (Ex: Observação) no estado local dos RENOVADOS
  const atualizarDetalhesRenovado = (id, campo, valor) => {
    setRenovados((prev) => 
      prev.map((lead) =>
        String(lead.ID) === String(id) ? { ...lead, [campo]: valor } : lead
      )
    );
  };

  // FUNÇÃO PARA TRANSFERIR/ATRIBUIR RESPONSÁVEL (NA ABA RENOVAÇÕES)
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

    let path = '/renovacoes'; 
    // Verifica o status do lead para navegar para a rota correta
    if (lead.Status === 'Fechado') path = '/renovados'; 
    else if (lead.status === 'Perdido') path = '/renovacoes-perdidas'; // Se for da lista 'renovacoes'
    else if (lead.Status === 'Perdido') path = '/renovacoes-perdidas'; // Se for da lista 'renovados' (caso venha de lá)

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
    
  // FUNÇÃO PARA SALVAR OBSERVAÇÃO (no funil principal - RENOVAÇÕES)
  const salvarObservacao = async (leadId, observacao) => {
    try {
      const response = await fetch(SALVAR_OBSERVACAO_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          v: 'salvarObservacao', // Usando 'v' como action
          leadId: leadId, // ID da linha (do Renovacoes.jsx)
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
                onConfirmInsurer={confirmarSeguradoraRenovado} 
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
