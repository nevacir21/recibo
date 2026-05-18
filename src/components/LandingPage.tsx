import React, { useState, useEffect } from 'react';
import { 
  LogIn, Lock, User, ArrowRight, Zap, Phone, Mail, CheckCircle2, 
  Settings, ShieldCheck, Home, Lightbulb, Clock, Handshake,
  FileText, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface LandingPageProps {
  onLoginSuccess: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao entrar com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!auth) {
      setError('Firebase não configurado');
      return;
    }

    if (pin.length < 4) {
      setError('O PIN deve ter pelo menos 4 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    const targetEmail = 'eletricistaarthur@gmail.com';

    try {
      // Use the fixed email and the digits as password
      await signInWithEmailAndPassword(auth, targetEmail, pin);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.code === 'auth/operation-not-allowed') {
        setError('O provedor de E-mail/Senha não está ativado no seu Console Firebase.');
        return;
      }

      // If login fails (wrong PIN or user doesn't exist), try to Register
      try {
        await createUserWithEmailAndPassword(auth, targetEmail, pin);
        onLoginSuccess();
      } catch (regErr: any) {
        console.error('Register error:', regErr);
        if (regErr.code === 'auth/email-already-in-use') {
          setError('PIN incorreto para este usuário. Caso tenha esquecido, use o Google para entrar.');
        } else if (regErr.code === 'auth/weak-password') {
          setError('O PIN deve ter pelo menos 6 dígitos.');
        } else {
          setError('Erro de acesso. Verifique seu PIN e tente novamente.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit if PIN reaches 6 digits
  useEffect(() => {
    if (pin.length === 6) {
      handleAuth();
    }
  }, [pin]);

  return (
    <div className="min-h-screen bg-[#0a1118] text-white font-sans selection:bg-yellow-400 selection:text-black">
        {!showLogin ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            {/* Upper Header bar */}
            <div className="bg-[#facc15] py-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="text-black" size={32} fill="currentColor" strokeWidth={1} />
                <span className="text-black text-2xl md:text-3xl font-black tracking-tighter uppercase">Gerar Recibo e Orçamento</span>
              </div>
              <ClipboardList className="text-black hidden md:block" size={42} />
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Left Column Content */}
              <div className="space-y-6 md:space-y-8">
                {/* Main Logo Area */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="relative">
                      <Zap className="w-16 h-16 md:w-20 md:h-20 text-yellow-400 fill-yellow-400" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <span className="text-4xl md:text-6xl font-black italic scale-x-125 mb-1 mr-1 text-black md:text-white">A</span>
                      </div>
                    </div>
                    <div>
                      <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none uppercase italic">Arthur</h1>
                      <div className="flex items-center gap-2">
                        <div className="h-[2px] flex-1 bg-yellow-400"></div>
                        <span className="text-yellow-400 text-xl md:text-3xl font-black tracking-[0.2em] uppercase">Eletricista</span>
                        <div className="h-[2px] flex-1 bg-yellow-400"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-2xl font-medium text-gray-300">
                    Soluções elétricas seguras, <br />
                    <span className="text-yellow-400 font-bold">manutenção eficiente</span>, confiança que conecta.
                  </p>
                </div>

                {/* Service Icons Grid */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {[
                    { icon: <Zap size={24} />, label: 'Instalações Elétricas' },
                    { icon: <Settings size={24} />, label: 'Manutenção Preventiva' },
                    { icon: <ClipboardList size={24} />, label: 'Quadros de Distribuição' },
                    { icon: <Lightbulb size={24} />, label: 'Iluminação Residencial' },
                    { icon: <ShieldCheck size={24} />, label: 'Segurança Garantida' },
                  ].map((s, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center gap-2">
                      <div className="w-12 h-12 rounded-xl border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                        {s.icon}
                      </div>
                      <span className="text-[9px] font-black uppercase text-gray-400 leading-tight">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Login button as the "Start" action */}
                <div className="pt-8">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="group relative inline-flex items-center gap-6 bg-yellow-400 text-black px-10 py-5 rounded-2xl font-black text-lg uppercase transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(250,204,21,0.2)]"
                  >
                    Entrar no Sistema
                    <div className="bg-black/10 rounded-full p-1 group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={24} />
                    </div>
                  </button>
                </div>

                {/* Contact Info Pills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-black">
                      <Phone size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400">Entre em contato</p>
                      <p className="font-black text-lg">12 98864-6468</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-black">
                      <Mail size={24} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black uppercase text-gray-400">Solicite Orçamento</p>
                      <p className="font-black text-sm truncate">eletricistaarthur@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column Illustration/Image Area */}
              <div className="relative hidden lg:block">
                <div className="absolute -inset-4 bg-yellow-400/20 blur-3xl rounded-full"></div>
                <div className="relative bg-gray-800 rounded-[40px] overflow-hidden aspect-[4/5] border-4 border-white/10">
                  <img 
                    src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=2070" 
                    alt="Eletricista Profissional"
                    className="w-full h-full object-cover"
                  />
                  {/* Decorative Elements */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                  <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-black">
                           <CheckCircle2 size={24} />
                        </div>
                        <div>
                           <p className="text-xl font-bold">Profissional Qualificado</p>
                           <p className="text-gray-300 text-sm italic">Especialista em comandos elétricos</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Features */}
            <div className="border-t border-white/10 py-10 bg-black/50">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { icon: <ShieldCheck size={20} />, label: 'Serviço com Garantia' },
                  { icon: <Clock size={20} />, label: 'Pontualidade e Compromisso' },
                  { icon: <Handshake size={20} />, label: 'Confiança que Ilumina' },
                  { icon: <Home size={20} />, label: 'Atendimento Residencial' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-yellow-400">{f.icon}</div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen w-full flex items-center justify-center p-6 bg-[#0a1118]"
          >
            <div className="w-full max-w-md p-10 bg-white rounded-[40px] shadow-2xl relative overflow-hidden">
               {/* Decorative background element for login card */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-bl-[100px]"></div>
               
               <button 
                onClick={() => setShowLogin(false)}
                className="absolute top-6 left-6 text-gray-400 hover:text-black transition-colors"
               >
                 <ArrowRight className="rotate-180" />
               </button>

              <div className="flex flex-col items-center mb-10">
                <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center text-yellow-400 shadow-2xl mb-6 transform -rotate-6">
                  <Lock size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
                   Acesso Rápido
                </h2>
                <p className="text-yellow-600 font-bold text-sm tracking-widest uppercase mt-1">Digite seu PIN</p>
              </div>

              <div className="space-y-8">
                {/* PIN Display */}
                <div className="flex justify-center gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-4 h-4 rounded-full border-2 border-gray-200 transition-all duration-300 ${
                        i < pin.length ? 'bg-yellow-400 border-yellow-400 scale-125' : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-black text-center border border-red-100 uppercase italic tracking-tighter flex flex-col gap-2"
                  >
                    <span>{error}</span>
                    {error.includes('Google') && (
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="py-2 bg-white border border-red-200 rounded-xl text-red-700 hover:bg-gray-50 transition-colors"
                      >
                        Entrar com Google
                      </button>
                    )}
                  </motion.div>
                )}

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberClick(num)}
                      className="h-16 rounded-2xl bg-gray-50 text-gray-900 font-black text-2xl hover:bg-yellow-400 transition-all flex items-center justify-center active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPin('')}
                    className="h-16 rounded-2xl bg-red-50 text-red-500 font-black text-xs uppercase transition-all flex items-center justify-center active:scale-95"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberClick('0')}
                    className="h-16 rounded-2xl bg-gray-50 text-gray-900 font-black text-2xl hover:bg-yellow-400 transition-all flex items-center justify-center active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-16 rounded-2xl bg-gray-100 text-gray-500 font-black transition-all flex items-center justify-center active:scale-95"
                  >
                    <ArrowRight className="rotate-180" size={24} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleAuth()}
                  disabled={loading || pin.length < 4}
                  className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-gray-900 transition-all disabled:opacity-50 shadow-2xl relative overflow-hidden group uppercase tracking-widest italic mt-4"
                >
                  <div className="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/10 transition-colors"></div>
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Zap size={24} />
                      <span>Entrar</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-12 text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                  Copyright © 2026 <br />
                  Sistema Gerador de Recibos
                </p>
              </div>
            </div>
          </motion.div>
        )}
    </div>
  );
};
