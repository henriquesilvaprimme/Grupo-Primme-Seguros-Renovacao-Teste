import React, { useState, useEffect, useRef } from 'react'; // Importe 'useRef'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Importe os componentes do seu projeto
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Leads from './Leads';
import LeadsFechados from './LeadsFechados';
import LeadsPerdidos from './LeadsPerdidos';
import BuscarLead from './BuscarLead';
import CriarUsuario from './pages/CriarUsuario';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import Ranking from './pages/Ranking';
import CriarLead from './pages/CriarLead';

// Constante para a URL BASE do Google Apps Script Web App
// Esta URL NÃO deve conter "?v=..."
// Use a URL que você copiou da implantação do seu GAS (sem o ?v=...)
const GOOGLE_APPS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycby8vujvd5ybEpkaZ0kwZecAWOdaL0XJR84oKJBAIR9dVYeTCv7iSdTdHQWBb7YCp349/exec';

// URLs para buscar dados, que ainda usam o ?v=...
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=getLeads`;
const GOOGLE_SHEETS_LEADS_FECHADOS = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_clientes_fechados`;
const GOOGLE_SHEETS_USERS_AUTH_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_usuario`;


function App() {
  const navigate = useNavigate();
  const mainContentRef = useRef(null); // Cria uma referência para o elemento main

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  const [leads, setLeads] = useState([]);
  const [leadsFechados, setLeadsFechados] = useState([]);
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  const [usuarios, setUsuarios] = useState([]);
  // NOVO ESTADO: Adicione um estado para controlar se há uma edição em andamento
  const [isEditing, setIsEditing] = useState(false);

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

  // MODIFICAÇÃO: A função agora só roda se não houver edição em andamento
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

  const fetchLeadsFromSheet = async () => {
    try {
      const response = await fetch(GOOGLE_SHEETS_SCRIPT_URL);
      const data = await response.json();

      if (Array.isArray(data)) {
        // Remove a ordenação aqui. O Apps Script já deve retornar a ordem correta.
        const sortedData = data;
        
        const formattedLeads = sortedData.map((item, index) => ({
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
          // ADIÇÃO DO CAMPO OBSERVACAO AQUI
          observacao: item.observacao || ''
        }));

        if (!leadSelecionado) {
          setLeads(formattedLeads);
        }
      } else {
        if (!leadSelecionado) {
          setLeads([]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar leads da planilha:', error);
      if (!leadSelecionado) {
        setLeads([]);
      }
    }
  };

  // MODIFICAÇÃO: A função só será executada se não houver uma edição em andamento.
  useEffect(() => {
    if (!isEditing) {
      fetchLeadsFromSheet();

      const interval = setInterval(() => {
        fetchLeadsFromSheet();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [leadSelecionado, isEditing]);

  const fetchLeadsFechadosFromSheet = async () => {
    try {
      const response = await fetch(GOOGLE_SHEETS_LEADS_FECHADOS)
      const data = await response.json();

      const formattedData = data.map(item => ({
        ...item,
        // *** MUDANÇA AQUI PARA GARANTIR CONSISTÊNCIA DE CASE ***
        insuranceType: item.insuranceType || '',
      }));
      setLeadsFechados(formattedData);

    } catch (error) {
      console.error('Erro ao buscar leads fechados:', error);
      setLeadsFechados([]);
    }
  };

  // MODIFICAÇÃO: A função só será executada se não houver uma edição em andamento.
  useEffect(() => {
    if (!isEditing) {
      fetchLeadsFechadosFromSheet();

      const interval = setInterval(() => {
        fetchLeadsFechadosFromSheet();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [isEditing]);

  const [ultimoFechadoId, setUltimoFechadoId] = useState(null);

  const adicionarUsuario = (usuario) => {
    setUsuarios((prev) => [...prev, { ...usuario, id: prev.length + 1 }]);
  };

  const adicionarNovoLead = (novoLead) => {
    setLeads((prevLeads) => {
      if (!prevLeads.some(lead => lead.ID === novoLead.ID)) {
        return [novoLead, ...prevLeads];
      }
      return prevLeads;
    });
  };

  const atualizarStatusLeadAntigo = (id, novoStatus, phone) => {
    if (novoStatus === 'Fechado') {
      setLeadsFechados((prev) => {
        const atualizados = prev.map((leadsFechados) =>
          leadsFechados.phone === phone ? { ...leadsFechados, Status: novoStatus, confirmado: true } : leadsFechados
        );
        return atualizados;
      });
    }

    setLeads((prev) =>
      prev.map((lead) =>
        lead.phone === phone ? { ...lead, status: novoStatus, confirmado: true } : lead
      )
    );
  };

  const atualizarStatusLead = (id, novoStatus, phone) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.phone === phone ? { ...lead, status: novoStatus, confirmado: true } : lead
      )
    );

    if (novoStatus === 'Fechado') {
      setLeadsFechados((prev) => {
        const jaExiste = prev.some((lead) => lead.phone === phone);

        if (jaExiste) {
          const atualizados = prev.map((lead) =>
            lead.phone === phone ? { ...lead, Status: novoStatus, confirmado: true } : lead
          );
          return atualizados;
        } else {
          const leadParaAdicionar = leads.find((lead) => lead.phone === phone);

          if (leadParaAdicionar) {
            const novoLeadFechado = {
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
              Seguradora: leadParaAdicionar.Seguradora || "",
              PremioLiquido: leadParaAdicionar.premioLiquido || "",
              Comissao: leadParaAdicionar.Comissao || "",
              Parcelamento: leadParaAdicionar.Parcelamento || "",
              VigenciaFinal: leadParaAdicionar.VigenciaFinal || "",
              VigenciaInicial: leadParaAdicionar.VigenciaInicial || "",
              id: leadParaAdicionar.id || null,
              usuario: leadParaAdicionar.usuario || "",
              nome: leadParaAdicionar.nome || "",
              email: leadParaAdicionar.email || "",
              senha: leadParaAdicionar.senha || "",
              status: leadParaAdicionar.status || "Ativo",
              tipo: leadParaAdicionar.tipo || "Usuario",
              "Ativo/Inativo": leadParaAdicionar["Ativo/Inativo"] || "Ativo",
              confirmado: true,
              // ADIÇÃO DO CAMPO OBSERVACAO AQUI
              observacao: leadParaAdicionar.observacao || ''
            };
            return [...prev, novoLeadFechado];
          }
          console.warn("Lead não encontrado na lista principal para adicionar aos fechados.");
          return prev;
        }
      });
    }
  };

  const atualizarSeguradoraLead = (id, seguradora) => {
    setLeads((prev) =>
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

  const confirmarSeguradoraLead = (id, premio, seguradora, comissao, parcelamento, vigenciaFinal, vigenciaInicial) => {
    const lead = leadsFechados.find((lead) => lead.ID == id);

    if (!lead) {
      console.error(`Lead com ID ${id} não encontrado na lista de leads fechados.`);
      return;
    }

    // Atualiza o estado local ANTES de enviar para o GAS
    lead.Seguradora = seguradora;
    lead.PremioLiquido = premio;
    lead.Comissao = comissao;
    lead.Parcelamento = parcelamento;
    lead.VigenciaFinal = vigenciaFinal || '';
    lead.VigenciaInicial = vigenciaInicial || '';

    setLeadsFechados((prev) => {
      const atualizados = prev.map((l) =>
        l.ID === id ? {
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

    try {
      fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          v: 'alterar_seguradora',
          lead: lead
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
          console.log('Requisição de dados da seguradora enviada (com no-cors).');
          setTimeout(() => {
            fetchLeadsFechadosFromSheet();
          }, 1000);
      })
      .catch(error => {
        console.error('Erro ao enviar lead (rede ou CORS):', error);
      });
    } catch (error) {
      console.error('Erro no bloco try/catch de envio do lead:', error);
    }
  };

  const atualizarDetalhesLeadFechado = (id, campo, valor) => {
    setLeadsFechados((prev) =>
      prev.map((lead) =>
        lead.ID === id ? { ...lead, [campo]: valor } : lead
      )
    );
  };

  const transferirLead = (leadId, responsavelId) => {
    if (responsavelId === null) {
      setLeads((prev) =>
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

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, responsavel: usuario.nome } : lead
      )
    );
  };

  const onAbrirLead = (lead) => {
    setLeadSelecionado(lead);

    let path = '/leads';
    if (lead.status === 'Fechado') path = '/leads-fechados';
    else if (lead.status === 'Perdido') path = '/leads-perdidos';

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
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                leadsClosed={
                  isAdmin
                    ? leadsFechados
                    : leadsFechados.filter((lead) => lead.Responsavel === usuarioLogado.nome)
                }
                leads={
                  isAdmin
                    ? leads
                    : leads.filter((lead) => lead.responsavel === usuarioLogado.nome)
                }
                usuarioLogado={usuarioLogado}
                // PASSE A PROPRIEDADE setIsEditing PARA OS COMPONENTES QUE PODEM SER EDITADOS
                setIsEditing={setIsEditing}
              />
            }
          />
          <Route
            path="/leads"
            element={
              <Leads
                leads={isAdmin ? leads : leads.filter((lead) => lead.responsavel === usuarioLogado.nome)}
                usuarios={usuarios}
                onUpdateStatus={atualizarStatusLead}
                fetchLeadsFromSheet={fetchLeadsFromSheet}
                transferirLead={transferirLead}
                usuarioLogado={usuarioLogado}
                // PASSA A PROPRIEDADE leadSelecionado PARA Leads
                leadSelecionado={leadSelecionado}
                // PASSE A PROPRIEDADE setIsEditing PARA O COMPONENTE Leads
                setIsEditing={setIsEditing}
                // PASSE A REFERÊNCIA PARA O COMPONENTE Leads
                scrollContainerRef={mainContentRef}
              />
            }
          />
          <Route
            path="/leads-fechados"
            element={
              <LeadsFechados
                leads={isAdmin ? leadsFechados : leadsFechados.filter((lead) => lead.Responsavel === usuarioLogado.nome)}
                usuarios={usuarios}
                onUpdateInsurer={atualizarSeguradoraLead}
                onConfirmInsurer={confirmarSeguradoraLead}
                onUpdateDetalhes={atualizarDetalhesLeadFechado}
                fetchLeadsFechadosFromSheet={fetchLeadsFechadosFromSheet}
                isAdmin={isAdmin}
                ultimoFechadoId={ultimoFechadoId}
                onAbrirLead={onAbrirLead}
                leadSelecionado={leadSelecionado}
                formatarDataParaExibicao={formatarDataParaExibicao}
                // PASSE A PROPRIEDADE setIsEditing PARA O COMPONENTE LeadsFechados
                setIsEditing={setIsEditing}
                // ADICIONA A PROPRIEDADE scrollContainerRef AQUI
                scrollContainerRef={mainContentRef}
              />
            }
          />
          <Route
            path="/leads-perdidos"
            element={
              <LeadsPerdidos
                // Filtra os leads para mostrar apenas os "Perdidos"
                leads={isAdmin ? leads.filter((lead) => lead.status === 'Perdido') : leads.filter((lead) => lead.responsavel === usuarioLogado.nome && lead.status === 'Perdido')}
                usuarios={usuarios}
                fetchLeadsFromSheet={fetchLeadsFromSheet}
                onAbrirLead={onAbrirLead}
                isAdmin={isAdmin}
                leadSelecionado={leadSelecionado}
                // PASSE A PROPRIEDADE setIsEditing PARA O COMPONENTE LeadsPerdidos
                setIsEditing={setIsEditing}
                // Adicione a prop scrollContainerRef aqui
                scrollContainerRef={mainContentRef}
              />
            }
          />
          <Route path="/buscar-lead" element={<BuscarLead
            leads={leads}
            fetchLeadsFromSheet={fetchLeadsFromSheet}
            fetchLeadsFechadosFromSheet={fetchLeadsFechadosFromSheet}
            // PASSE A PROPRIEDADE setIsEditing PARA O COMPONENTE BuscarLead
            setIsEditing={setIsEditing}
          />} />
          <Route
            path="/criar-lead"
            element={<CriarLead adicionarLead={adicionarNovoLead} />}
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
            fetchLeadsFromSheet={fetchLeadsFromSheet}
            fetchLeadsFechadosFromSheet={fetchLeadsFechadosFromSheet}
            leads={leads} />} />
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
