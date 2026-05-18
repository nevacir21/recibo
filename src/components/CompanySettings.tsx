import React, { useState } from 'react';
import { Save, Building, Info, CheckCircle2, Camera, X, Loader2 } from 'lucide-react';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { compressImage } from '../lib/utils';

export const CompanySettings: React.FC = () => {
  const { profile, saveProfile } = useCompanyProfile();
  const [name, setName] = useState(profile.name);
  const [details, setDetails] = useState(profile.details);
  const [pixKey, setPixKey] = useState(profile.pixKey || '');
  const [logo, setLogo] = useState(profile.logo || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImage(reader.result as string);
        setLogo(compressed);
      } catch (err) {
        console.error('Error compressing logo:', err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile({ name, details, pixKey, logo });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-2">
        <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 uppercase tracking-tighter italic">
          <Building className="text-gray-400" />
          Minha Empresa
        </h3>
        <p className="text-gray-500 text-xs md:text-sm">
          Esses dados aparecem no topo dos seus recibos.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
            {logo ? (
              <div className="relative group">
                <img src={logo} alt="Logo" className="w-32 h-32 object-contain rounded-2xl bg-white shadow-sm" />
                <button
                  type="button"
                  onClick={() => setLogo('')}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-black transition-all"
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                  {uploading ? <Loader2 size={32} className="animate-spin" /> : <Camera size={31} />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest mt-1 italic">
                  {uploading ? 'Processando...' : 'Carregar Sua Logo'}
                </span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1">Nome Profissional</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Arthur Eletricista"
                className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:border-yellow-400 outline-none transition-all font-bold text-gray-900 bg-gray-50 focus:bg-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1">Chave PIX (Para Pagamento)</label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Seu Pix para o recibo"
                className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:border-yellow-400 outline-none transition-all font-bold text-gray-900 bg-gray-50 focus:bg-white"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1">Dados de Contato / Endereço / CNPJ</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Digite aqui o que quer que apareça no recibo"
                className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:border-yellow-400 outline-none transition-all h-40 resize-none font-bold text-gray-900 bg-gray-50 focus:bg-white"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
          <div className="hidden md:flex flex-1 gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <Info className="flex-shrink-0" size={14} />
            <p>Seus dados são salvos com segurança.</p>
          </div>

          <button
            type="submit"
            className="w-full md:w-auto flex items-center justify-center gap-2 px-10 py-5 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-100 uppercase font-black italic tracking-[0.1em]"
          >
            <Save size={18} />
            <span>Salvar Tudo</span>
          </button>
        </div>
      </form>
    </div>
  );
};
