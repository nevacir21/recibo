import { useState, useEffect } from 'react';
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

export default function App() {
  const { user, loading } = useAuth();
  const { profile } = useCompanyProfile();
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'settings'>('create');
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setActiveTab('create');
  };

  const handleSuccess = () => {
    setEditingReceipt(null);
    setActiveTab('history');
  };

  // If no profile is set up, redirect to settings on first load
  useEffect(() => {
    if (!profile.name && !loading) {
      setActiveTab('settings');
    }
  }, [profile.name, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 font-medium">Iniciando sistema...</p>
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

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
              <ReceiptIcon size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Recibo<span className="text-gray-400">Pro</span></h1>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Manutenção & Serviços</p>
            </div>
          </div>
          <Auth />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        <div className="space-y-10">
          {/* Header & Main Tabs */}
          <div className="flex flex-col gap-8">
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

          {/* Content Area */}
          <div className="min-h-[500px]">
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

      <footer className="py-12 border-t border-gray-100 mt-20">
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
