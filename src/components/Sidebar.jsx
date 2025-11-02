import React from 'react';
import { NavLink } from 'react-router-dom';
// Adicionei IdCard para o ícone de Segurados
import { Home, Search, Trophy, UserPlus, UserCircle, FilePlus, RefreshCw, CheckCircle, XCircle, IdCard } from 'lucide-react'; 

const Sidebar = ({ nomeUsuario }) => {

  const isAdmin = nomeUsuario.tipo === 'Admin';

  return (
    <div className="w-64 bg-white shadow-xl border-r border-gray-200 h-full p-6">
      <h2 className="text-xl font-semibold mb-8">
        Olá, {nomeUsuario.nome.charAt(0).toUpperCase() + nomeUsuario.nome.slice(1)}
      </h2>

      <nav className="flex flex-col gap-4">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
              isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
            }`
          }
        >
          <Home size={20} />
          Dashboard
        </NavLink>

        <NavLink
          to="/renovacoes" // ROTA CORRIGIDA
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
              isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
            }`
          }
        >
          <RefreshCw size={20} /> {/* Ícone mais adequado para 'Renovações' */}
          Renovações
        </NavLink>

        <NavLink
          to="/renovados" // ROTA CORRIGIDA
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
              isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
            }`
          }
        >
          <CheckCircle size={20} /> {/* Ícone mais adequado para 'Fechados' */}
          Renovados
        </NavLink>

        <NavLink
          to="/renovacoes-perdidas" // ROTA CORRIGIDA
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
              isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
            }`
          }
        >
          <XCircle size={20} /> {/* Ícone mais adequado para 'Perdidos' */}
          Renovações Perdidas
        </NavLink>

        <NavLink
          to="/buscar-lead"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
              isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
            }`
          }
        >
          <Search size={20} />
          Buscar Lead
        </NavLink>

        {/* NOVO ITEM: Segurados */}
        <NavLink
          to="/segurados"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
              isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
            }`
          }
        >
          <IdCard size={20} />
          Segurados
        </NavLink>

        <NavLink
          to="/ranking"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
              isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
            }`
          }
        >
          <Trophy size={20} />
          Ranking
        </NavLink>

        {isAdmin && (
          <>
            <NavLink
              to="/criar-lead"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
                  isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
                }`
              }
            >
              <FilePlus size={20} />
              Criar Lead
            </NavLink>

            <NavLink
              to="/criar-usuario"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
                  isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
                }`
              }
            >
              <UserPlus size={20} />
              Criar Usuário
            </NavLink>

            <NavLink
              to="/usuarios"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
                  isActive ? 'border-l-4 border-blue-500 bg-blue-50' : ''
                }`
              }
            >
              <UserCircle size={20} />
              Usuários
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
