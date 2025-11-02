// src/pages/Segurados.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '../config/api';

// Helpers de data: parse flexível (YYYY-MM-DD ou DD/MM/YYYY)
function parseDateFlexible(value) {
  if (!value) return null;
  try {
    // Normaliza strings
    const str = String(value).trim();

    // Tenta YYYY-MM-DD
    const hyphen = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (hyphen) {
      const d = new Date(`${hyphen[1]}-${hyphen[2]}-${hyphen[3]}T00:00:00`);
      return isNaN(d.getTime()) ? null : d;
    }

    // Tenta DD/MM/YYYY
    const slash = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slash) {
      const y = slash[3], m = slash[2], d = slash[1];
      const dt = new Date(`${y}-${m}-${d}T00:00:00`);
      return isNaN(dt.getTime()) ? null : dt;
    }

    // Fallback Date parse nativo
    const dflt = new Date(str);
    return isNaN(dflt.getTime()) ? null : dflt;
  } catch {
    return null;
  }
}

// Formata data para exibição curta DD/MM/YYYY
function formatDate(value) {
  const d = parseDateFlexible(value);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D+/g, '');
}

// Normaliza um item de qualquer uma das fontes para um modelo único
function normalizeLead(item) {
  return {
    id: item.ID || item.id || item.Id || null,
    name: item.name || item.Nome || item.Name || '',
    phone: item.phone || item.Telefone || item.celular || '',
    city: item.city || item.Cidade || '',
    insuranceType: item.insuranceType || item.InsuranceType || item.Tipo || '',
    Seguradora: item.Seguradora || item.seguradora || '',
    PremioLiquido: item.PremioLiquido || item.premioLiquido || '',
    Comissao: item.Comissao || item.comissao || '',
    Parcelamento: item.Parcelamento || item.parcelamento || '',
    VigenciaInicial: item.VigenciaInicial || item.vigenciaInicial || '',
    VigenciaFinal: item.VigenciaFinal || item.vigenciaFinal || '',
    Responsavel: item.Responsavel || item.responsavel || '',
    MeioPagamento: item.MeioPagamento || '',
    CartaoPortoNovo: item.CartaoPortoNovo || '',
    Status: item.Status || item.status || '',
    createdAt: item.createdAt || item.Data || item.data || '',
    raw: item,
  };
}

function getBestVigenciaDate(lead) {
  // Usado para ordenação: prioriza VigenciaFinal; se não existir, VigenciaInicial; se não, createdAt
  return (
    parseDateFlexible(lead.VigenciaFinal) ||
    parseDateFlexible(lead.VigenciaInicial) ||
    parseDateFlexible(lead.createdAt)
  );
}

const Card = ({ lead }) => {
  const vigencia = useMemo(() => {
    const vi = formatDate(lead.VigenciaInicial);
    const vf = formatDate(lead.VigenciaFinal);
    if (vi && vf) return `${vi} a ${vf}`;
    return vi || vf || '';
  }, [lead.VigenciaInicial, lead.VigenciaFinal]);

  return (
    <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{lead.name || 'Sem nome'}</h3>
          <p className="text-sm text-gray-600">{lead.phone}</p>
          {lead.city ? <p className="text-sm text-gray-600">{lead.city}</p> : null}
        </div>
        {lead.Seguradora ? (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
            {lead.Seguradora}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {lead.insuranceType ? (
          <div>
            <span className="text-gray-500">Produto: </span>
            <span className="text-gray-800">{lead.insuranceType}</span>
          </div>
        ) : null}

        {lead.PremioLiquido ? (
          <div>
            <span className="text-gray-500">Prêmio: </span>
            <span className="text-gray-800">{lead.PremioLiquido}</span>
          </div>
        ) : null}

        {lead.Comissao ? (
          <div>
            <span className="text-gray-500">Comissão: </span>
            <span className="text-gray-800">{lead.Comissao}</span>
          </div>
        ) : null}

        {lead.Parcelamento ? (
          <div>
            <span className="text-gray-500">Parcelamento: </span>
            <span className="text-gray-800">{lead.Parcelamento}</span>
          </div>
        ) : null}

        {vigencia ? (
          <div className="sm:col-span-2">
            <span className="text-gray-500">Vigência: </span>
            <span className="text-gray-800">{vigencia}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {lead.MeioPagamento ? (
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded">
            Meio: {lead.MeioPagamento}
          </span>
        ) : null}
        {lead.CartaoPortoNovo ? (
          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded">
            Cartão Porto Novo
          </span>
        ) : null}
        {lead.Responsavel ? (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
            Resp: {lead.Responsavel}
          </span>
        ) : null}
        {lead.Status ? (
          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
            {lead.Status}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const Segurados = () => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [segurados, setSegurados] = useState([]);
  const [q, setQ] = useState('');

  // Busca dados das duas fontes
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErro('');
      try {
        // Fonte A: Renovados (já mapeada no App.jsx como ENDPOINTS.getFechados)
        // Fonte B: Leads Fechados (assumindo outro endpoint; ajuste conforme seu Apps Script)
        const renovadosUrl = ENDPOINTS.getFechados;
        // Se você tiver um endpoint separado para "Leads Fechados", adicione em ENDPOINTS:
        // ex: ENDPOINTS.getLeadsFechados
        const leadsFechadosUrl =
          ENDPOINTS.getLeads ? ENDPOINTS.getLeads('Leads Fechados') : ENDPOINTS.getFechados;

        const [aRes, bRes] = await Promise.all([
          fetch(renovadosUrl).then(r => r.json()).catch(() => []),
          fetch(leadsFechadosUrl).then(r => r.json()).catch(() => []),
        ]);

        const arrA = Array.isArray(aRes) ? aRes : [];
        const arrB = Array.isArray(bRes) ? bRes : [];

        // Normaliza e combina
        const merged = [...arrA, ...arrB].map(normalizeLead);

        // Deduplicação básica por telefone normalizado + nome
        const seen = new Set();
        const unique = [];
        for (const it of merged) {
          const key = `${normalizePhone(it.phone)}|${(it.name || '').toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(it);
          } else {
            // Pode optar por mesclar campos vazios aqui
          }
        }

        // Ordena por vigência mais recente
        unique.sort((a, b) => {
          const da = getBestVigenciaDate(a);
          const db = getBestVigenciaDate(b);
          const ta = da ? da.getTime() : 0;
          const tb = db ? db.getTime() : 0;
          return tb - ta; // desc
        });

        if (alive) setSegurados(unique);
      } catch (e) {
        if (alive) setErro('Erro ao carregar segurados.');
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    const num = normalizePhone(q);
    if (!term && !num) return segurados;
    return segurados.filter(it => {
      const name = (it.name || '').toLowerCase();
      const phoneNorm = normalizePhone(it.phone);
      return (term && name.includes(term)) || (num && phoneNorm.includes(num));
    });
  }, [q, segurados]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Segurados</h1>
      <p className="text-sm text-gray-600 mt-1">
        Buscando combinações das abas “Leads Fechados” e “Renovados”. Ordenado pela vigência mais recente.
      </p>

      <div className="mt-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="mt-6 text-gray-600">Carregando...</div>
      ) : erro ? (
        <div className="mt-6 text-red-600">{erro}</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((lead, idx) => (
            <Card key={`${lead.id || lead.phone || idx}-${idx}`} lead={lead} />
          ))}
          {filtrados.length === 0 && (
            <div className="text-gray-500">Nenhum segurado encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Segurados;
