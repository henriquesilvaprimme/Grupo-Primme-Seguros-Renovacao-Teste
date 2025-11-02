import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Users, Search, BarChart3, PlusCircle, Home, RefreshCw, CheckCircle2, XCircle, IdCard } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-blue-700 hover:text-white'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
};

const Sidebar = ({ isAdmin, nomeUsuario }) => {
  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col">
      <div className="px-4 py-4 border-b border-blue-800">
        <div className="flex items-center gap-2">
          <div className="text-2xl">👑</div>
          <div>
            <div className="text-sm">GRUPO</div>
            <div className="text-lg font-bold">PRIMME SEGUROS</div>
          </div>
        </div>
        {nomeUsuario?.nome ? (
          <div className="mt-3 text-xs text-blue-100">
            Olá, <span className="font-semibold">{nomeUsuario.nome}</span>
          </div>
        ) : null}
      </div>

      <nav className="p-3 flex-1 flex flex-col gap-1">
        <NavItem to="/dashboard" icon={Home} label="Dashboard" />
        <NavItem to="/renovacoes" icon={RefreshCw} label="Renovações" />
        <NavItem to="/renovados" icon={CheckCircle2} label="Renovados" />
        <NavItem to="/renovacoes-perdidas" icon={XCircle} label="Perdidos" />
        <NavItem to="/buscar" icon={Search} label="Buscar Lead" />
        {/* NOVO MENU: Segurados */}
        <NavItem to="/segurados" icon={IdCard} label="Segurados" />

        {isAdmin && (
          <>
            <div className="mt-3 mb-1 text-xs uppercase tracking-wider text-blue-200">Admin</div>
            <NavItem to="/criar-usuario" icon={Users} label="Criar Usuário" />
            <NavItem to="/gerenciar-usuarios" icon={ShieldCheck} label="Gerenciar Usuários" />
            <NavItem to="/ranking" icon={BarChart3} label="Ranking" />
            <NavItem to="/criar-lead" icon={PlusCircle} label="Criar Lead" />
          </>
        )}
      </nav>

      <div className="p-3 border-t border-blue-800 text-xs text-blue-200">
        <div>Sessão ativa</div>
      </div>
    </aside>
  );
};

export default Sidebar;
