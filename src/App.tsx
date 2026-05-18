import { useState, useEffect, useCallback } from 'react';
import { Auth } from './components/Auth';
import { ReceiptForm } from './components/ReceiptForm';
import { ReceiptList } from './components/ReceiptList';
import { CompanySettings } from './components/CompanySettings';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './hooks/useAuth';
import { useCompanyProfile } from './hooks/useCompanyProfile';
import { isConfigValid } from './lib/firebase';
import { FilePlus, History, Settings, Receipt as ReceiptIcon, UserCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Receipt } from './types';

// Simple Error Boundary component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase italic">Ops! Algo deu errado</h2>
        <p className="text-gray-500 text-sm">Ocorreu um erro inesperado. Tente recarregar a página.</p>
        <pre className="text-[10px] bg-gray-50 p-4 rounded-xl overflow-auto text-left text-red-500 font-mono">
          {error.message}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest italic"
        >
          Recarregar
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useCompanyProfile();
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'settings'>('create');
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);

  const handleEdit = useCallback((receipt: Receipt) => {
    setEditingReceipt(receipt);
    setActiveTab('create');
  }, []);

  const handleSuccess = useCallback(() => {
    setEditingReceipt(null);
    setActiveTab('history');
  }, []);

  // If no profile is set up, redirect to settings on first load
  useEffect(() => {
    if (user && !profile.name && !profileLoading && !authLoading) {
      setActiveTab('settings');
    }
  }, [user, profile.name, profileLoading, authLoading]);

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      const { logout } = (await import('./lib/firebase'));
      await logout();
      window.location.reload();
    }
  };

  if (renderError) {
    return <ErrorFallback error={renderError} />;
  }

  if (authLoading || (user && profileLoading && !profile.name)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-black tracking-tighter uppercase italic">Recibo<span className="text-gray-400">Pro</span></p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sincronizando seus dados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLoginSuccess={() => {}} />;
  }

  const userId = user?.uid || 'guest';

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-black selection:text-white">
      {/* Configuration Notice */}
      {!isConfigValid && (
        <div className="bg-amber-50 border-b border-amber-100 py-2">
          <div className="max-w-6xl mx-auto px-6 flex items-center gap-2 text-amber-800 text-xs font-medium">
            <AlertCircle size={14} />
            <span>O histórico na nuvem está desativado. Configure o Firebase nas configurações para salvar seus recibos permanentemente.</span>
          </div>
        </div>
      )}

      {/* Navbar - Desktop Only */}
      <nav className="hidden md:block sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
              <ReceiptIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Recibo<span className="text-gray-400">Pro</span></h1>
                {profile.name && <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded font-black uppercase italic">{profile.name}</span>}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Logado como: {user.email}</p>
            </div>
          </div>
          <Auth />
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <ReceiptIcon size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Recibo<span className="text-gray-400">Pro</span></h1>
            {profile.name && <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[120px]">{profile.name}</p>}
          </div>
        </div>
        <Auth />
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12 pb-32 md:pb-12">
        <div className="space-y-6 md:space-y-10">
          {/* Header & Main Tabs - Desktop Only */}
          <div className="hidden md:flex flex-col gap-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                {activeTab === 'create' && 'Emitir Novo Recibo'}
                {activeTab === 'history' && 'Histórico de Recibos'}
                {activeTab === 'settings' && 'Dados da Sua Empresa'}
              </h2>
              <p className="text-gray-500">
                {activeTab === 'create' && 'Gere um PDF profissional detalhando o serviço prestado.'}
                {activeTab === 'history' && 'Pesquise e baixe novamente recibos já emitidos.'}
                {activeTab === 'settings' && 'Configure seus dados para não precisar digitar em cada recibo.'}
              </p>
            </div>

            <div className="flex flex-wrap p-1.5 bg-gray-100 rounded-2xl w-fit gap-1">
                <button
                  onClick={() => {
                    setEditingReceipt(null);
                    setActiveTab('create');
                  }}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all",
                    activeTab === 'create' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
                  )}
                >
                  <FilePlus size={18} />
                  <span>Emitir</span>
                </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all",
                  activeTab === 'history' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
                )}
              >
                <History size={18} />
                <span>Histórico</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all",
                  activeTab === 'settings' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
                )}
              >
                <UserCircle size={18} />
                <span>Meu Cadastro</span>
              </button>
            </div>
          </div>

          {/* Mobile Title */}
          <div className="md:hidden mb-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {activeTab === 'create' && 'Emitir Recibo'}
              {activeTab === 'history' && 'Meu Histórico'}
              {activeTab === 'settings' && 'Meu Perfil'}
            </h2>
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === 'create' && (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <ReceiptForm 
                    userId={userId} 
                    onSuccess={handleSuccess} 
                    initialData={editingReceipt || undefined} 
                  />
                </motion.div>
              )}
              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <ReceiptList userId={userId} onEdit={handleEdit} />
                </motion.div>
              )}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <CompanySettings />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-6 py-3 pb-8 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => {
            setEditingReceipt(null);
            setActiveTab('create');
          }}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'create' ? "text-black" : "text-gray-400"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === 'create' ? "bg-yellow-400 text-black shadow-lg shadow-yellow-200" : "bg-transparent"
          )}>
            <FilePlus size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Emitir</span>
        </button>
        
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'history' ? "text-black" : "text-gray-400"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === 'history' ? "bg-yellow-400 text-black shadow-lg shadow-yellow-200" : "bg-transparent"
          )}>
            <History size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Histórico</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'settings' ? "text-black" : "text-gray-400"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === 'settings' ? "bg-yellow-400 text-black shadow-lg shadow-yellow-200" : "bg-transparent"
          )}>
            <UserCircle size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Perfil</span>
        </button>
      </nav>

      <footer className="hidden md:block py-12 border-t border-gray-100 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
          <p>RECIBO PRO © 2026. Desenvolvido para Prestadores de Serviços.</p>
          <div className="flex gap-6">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Cloud Sync Ativo</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Exportação PDF PDF/A</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
