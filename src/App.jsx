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
import Segurados from './pages/Segurados'; // NOVO

// Caso você tenha centralizado endpoints:
// import { ENDPOINTS } from './config/api';

// Este componente rola o container principal para o topo quando a rota muda
function ScrollToTop({ scrollContainerRef }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname, scrollContainerRef]);
  return null;
}

// URLs atuais (mantenho como no seu App.jsx já analisado)
// Se usar ENDPOINTS, substitua estas constantes pelas referências a ENDPOINTS
const GOOGLE_APPS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec';
const GOOGLE_SHEETS_SCRIPT_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=getLeads`;
const GOOGLE_SHEETS_RENOVADOS = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_clientes_fechados`;
const GOOGLE_SHEETS_USERS_AUTH_URL = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=pegar_usuario`;
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

  const [renovacoes, setRenovacoes] = useState([]);
  const [renovados, setRenovados] = useState([]);
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
      const interval = setInterval(fetchUsuariosForLogin, 300000);
      return () => clearInterval(interval);
    }
  }, [isEditing]);

  const fetchRenovacoesFromSheet = async (sheetName = 'Renovações') => {
    const url = `${GOOGLE_APPS_SCRIPT_BASE_URL}?v=getLeads&sheet=${encodeURIComponent(sheetName)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        const formattedRenovacoes = data.map((item, index) => ({
          id: item.id ? Number(item.id) : index + 1,
          name: item.name || item.Name || '',
          vehicleModel: item.vehiclemodel || item.vehicleModel || '',
          vehicleYearModel: item.vehicleyearmodel || item.vehicleYearModel || '',
          city: item.city || '',
          phone: item.phone || item.Telefone || '',
          insuranceType: item.insurancetype || item.insuranceType || '',
          status: item.status || 'Selecione o status',
          confirmado: item.confirmado === 'true' || item.confirmado === true,
          Seguradora: item.Seguradora || '',
          insurerConfirmed: item.insurerConfirmed === 'true' || item.insurerConfirmed === true,
          usuarioId: item.usuarioId ? Number(item.usuarioId) : null,
          PremioLiquido: item.PremioLiquido || '',
          Comissao: item.Comissao || '',
          Parcelamento: item.Parcelamento || '',
          VigenciaFinal: item.VigenciaFinal || '',
          VigenciaInicial: item.VigenciaInicial || '',
          createdAt: item.data || new Date().toISOString(),
          responsavel: item.responsavel || '',
          editado: item.editado || '',
          observacao: item.observacao || '',
          agendamento: item.agendamento || '',
          agendados: item.agendados || '',
          MeioPagamento: item.MeioPagamento || '',
          CartaoPortoNovo: item.CartaoPortoNovo || '',
        }));
        if (!leadSelecionado) setRenovacoes(formattedRenovacoes);
      } else {
        if (!leadSelecionado) setRenovacoes([]);
      }
    } catch (error) {
      console.error('Erro ao buscar renovações da planilha:', error);
      if (!leadSelecionado) setRenovacoes([]);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      fetchRenovacoesFromSheet('Renovações');
      const interval = setInterval(() => {
        fetchRenovacoesFromSheet('Renovações');
      }, 300000);
      return () => clearInterval(interval);
    }
  }, [leadSelecionado, isEditing]);

  const fetchRenovadosFromSheet = async () => {
    try {
      const response = await fetch(GOOGLE_SHEETS_RENOVADOS);
      const data = await response.json();
      const formattedData = (Array.isArray(data) ? data : []).map(item => ({
        ...item,
        insuranceType: item.insuranceType || '',
        MeioPagamento: item.MeioPagamento || '',
        CartaoPortoNovo: item.CartaoPortoNovo || '',
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
      }, 300000);
      return () => clearInterval(interval);
    }
  }, [isEditing]);

  const adicionarUsuario = (usuario) => {
    setUsuarios((prev) => [...prev, { ...usuario, id: prev.length + 1 }]);
  };

  const adicionarNovoRenovacao = (novoLead) => {
    setRenovacoes((prevRenovacoes) => {
      if (!prevRenovacoes.some(lead => lead.ID === novoLead.ID)) {
        return [novoLead, ...prevRenovacoes];
      }
      return prevRenovacoes;
    });
  };

  const atualizarStatusRenovacao = (id, novoStatus, phone) => {
    if (novoStatus === 'Cancelado') {
      setRenovacoes((prev) => prev.filter((lead) => lead.phone !== phone));
      return;
    }
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
              insuranceType: leadParaAdicionar.insuranceType || "",
              Data: leadParaAdicionar.createdAt || new Date().toISOString(),
              Responsavel: leadParaAdicionar.responsavel || "",
              Status: "Fechado",
              Seguradora: leadParaAdicionar.Seguradora || "",
              PremioLiquido: leadParaAdicionar.premioLiquido || "",
              Comissao: leadParaAdicionar.Comissao || "",
              Parcelamento: leadParaAdicionar.Parcelamento || "",
              VigenciaFinal: leadParaAdicionar.VigenciaFinal || "",
              VigenciaInicial: leadParaAdicionar.VigenciaInicial || "",
              observacao: leadParaAdicionar.observacao || '',
              MeioPagamento: leadParaAdicionar.MeioPagamento || '',
              CartaoPortoNovo: leadParaAdicionar.CartaoPortoNovo || '',
            };
            return [...prev, novoRenovado];
          }
          console.warn("Lead não encontrado para adicionar aos renovados.");
          return prev;
        }
      });
    }
  };

  const handleConfirmAgendamento = async (leadId, dataAgendada) => {
    try {
      await fetch(SALVAR_AGENDAMENTO_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ leadId, dataAgendada }),
        headers: { 'Content-Type': 'application/json' },
      });
      await fetchRenovacoesFromSheet();
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
    }
  };

  const limparCamposLead = (lead) => ({
    ...lead,
    premioLiquido: "",
    comissao: "",
    VigenciaFinal: "",
    VigenciaInicial: "",
  });

  const atualizarSeguradoraRenovacao = (id, seguradora) => {
    setRenovacoes((prev) =>
      prev.map((lead) =>
        lead.id === id ? limparCamposLead({ ...lead, insurer: seguradora }) : lead
      )
    );
  };

  const confirmarSeguradoraRenovado = (
    id, premio, seguradora, comissao, parcelamento, vigenciaFinal, vigenciaInicial, meioPagamento, cartaoPortoNovo
  ) => {
    const renovado = renovados.find((lead) => lead.ID == id);
    if (!renovado) {
      console.error(`Renovado com ID ${id} não encontrado.`);
      return;
    }
    renovado.Seguradora = seguradora;
    renovado.PremioLiquido = premio;
    renovado.Comissao = comissao;
    renovado.Parcelamento = parcelamento;
    renovado.VigenciaFinal = vigenciaFinal || '';
    renovado.VigenciaInicial = vigenciaInicial || '';
    renovado.MeioPagamento = meioPagamento || '';
    renovado.CartaoPortoNovo = cartaoPortoNovo || '';

    setRenovados((prev) =>
      prev.map((l) =>
        l.ID === id
          ? {
              ...l,
              insurerConfirmed: true,
              Seguradora: seguradora,
              PremioLiquido: premio,
              Comissao: comissao,
              Parcelamento: parcelamento,
              VigenciaFinal: vigenciaFinal || '',
              VigenciaInicial: vigenciaInicial || '',
              MeioPagamento: meioPagamento || '',
              CartaoPortoNovo: cartaoPortoNovo || '',
            }
          : l
      )
    );

    try {
      fetch(GOOGLE_APPS_SCRIPT_BASE_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ v: 'alterar_seguradora', lead: renovado }),
        headers: { 'Content-Type': 'application/json' },
      })
        .then(() => {
          setTimeout(() => {
            fetchRenovadosFromSheet();
          }, 1000);
        })
        .catch(error => {
          console.error('Erro ao enviar renovado (rede ou CORS):', error);
        });
    } catch (error) {
      console.error('Erro no envio do renovado:', error);
    }
  };

  const atualizarDetalhesRenovado = (id, campo, valor) => {
    setRenovados((prev) => prev.map((lead) => (lead.ID === id ? { ...lead, [campo]: valor } : lead)));
  };

  const transferirRenovacao = (leadId, responsavelId) => {
    if (responsavelId === null) {
      setRenovacoes((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, responsavel: null } : lead)));
      return;
    }
    let usuario = usuarios.find((u) => u.id == responsavelId);
    if (!usuario) return;
    setRenovacoes((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, responsavel: usuario.nome } : lead)));
  };

  const onAbrirLead = (lead) => {
    setLeadSelecionado(lead);
    let path = '/renovacoes';
    if (lead.status === 'Fechado') path = '/renovados';
    else if (lead.status === 'Perdido') path = '/renovacoes-perdidas';
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

  const salvarObservacao = async (leadId, observacao) => {
    try {
      const response = await fetch(SALVAR_OBSERVACAO_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'salvarObservacao', leadId, observacao }),
      });
      if (response.ok) {
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
        className={`flex items-center justify-center min-h-screen bg-cover bg-center transition-opacity duration-1000 ${backgroundLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundImage: `url('/background.png')` }}
      >
        <div className="bg-blue-900 bg-opacity-60 text-white p-10 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 mb-2 flex items-center justify-center text-4xl text-yellow-400">👑</div>
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
            <a href="#" className="text-white underline"></a>
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/renovacoes" element={<Renovacoes
            renovacoes={renovacoes}
            onAbrirLead={onAbrirLead}
            atualizarStatusRenovacao={atualizarStatusRenovacao}
            atualizarSeguradoraRenovacao={atualizarSeguradoraRenovacao}
            handleConfirmAgendamento={handleConfirmAgendamento}
            salvarObservacao={salvarObservacao}
            transferirRenovacao={transferirRenovacao}
            usuarios={usuarios}
          />} />
          <Route path="/renovados" element={<Renovados
            renovados={renovados}
            confirmarSeguradoraRenovado={confirmarSeguradoraRenovado}
            atualizarDetalhesRenovado={atualizarDetalhesRenovado}
          />} />
          <Route path="/renovacoes-perdidas" element={<RenovacoesPerdidas />} />
          <Route path="/buscar" element={<BuscarLead onAbrirLead={onAbrirLead} />} />
          <Route path="/criar-usuario" element={<CriarUsuario adicionarUsuario={adicionarUsuario} />} />
          <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios usuarios={usuarios} />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/criar-lead" element={<CriarLead adicionarNovoLead={adicionarNovoRenovacao} />} />
          {/* NOVA ROTA */}
          <Route path="/segurados" element={<Segurados />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
