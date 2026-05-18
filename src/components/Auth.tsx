import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Auth: React.FC = () => {
  const { logout, user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-500">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs font-semibold uppercase tracking-wider">Sistema Ativo</span>
      </div>
      <button
        onClick={() => logout()}
        className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-xs font-bold uppercase"
        title="Sair do Sistema"
      >
        <LogOut size={16} />
        <span className="hidden md:inline">Sair</span>
      </button>
    </div>
  );
};
