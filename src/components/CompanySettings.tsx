import React, { useState } from 'react';
import { Save, Building, Info, CheckCircle2, Camera, X } from 'lucide-react';
import { useCompanyProfile } from '../hooks/useCompanyProfile';

export const CompanySettings: React.FC = () => {
  const { profile, saveProfile } = useCompanyProfile();
  const [name, setName] = useState(profile.name);
  const [details, setDetails] = useState(profile.details);
  const [pixKey, setPixKey] = useState(profile.pixKey || '');
  const [logo, setLogo] = useState(profile.logo || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
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
    <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Building className="text-gray-400" />
          Cadastro do Prestador
        </h3>
        <p className="text-gray-500 text-sm">
          Estes dados serão usados automaticamente no cabeçalho de todos os seus recibos.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
            {logo ? (
              <div className="relative group">
                <img src={logo} alt="Logo" className="w-32 h-32 object-contain rounded-2xl bg-white shadow-sm" />
                <button
                  type="button"
                  onClick={() => setLogo('')}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-black transition-all"
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <Camera size={32} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Logo da Empresa</span>
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Sua Empresa</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Arthur Elétrica & Manutenção"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all font-medium"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Chave PIX (opcional para QR Code)</label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="E-mail, CPF, CNPJ ou Celular"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all font-medium"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Dados Detalhados</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: CNPJ: 12.345.678/0001-90&#10;Endereço: Rua dos Eletricistas, 456&#10;Telefone: (11) 98888-7777"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all h-40 resize-none"
              required
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl flex gap-3 text-sm text-gray-600">
          <Info className="text-gray-400 flex-shrink-0" size={18} />
          <p>Dica: Os dados salvos aqui serão aplicados instantaneamente em seus próximos recibos.</p>
        </div>

        <div className="flex items-center justify-between pt-4">
          {showSuccess && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm font-bold animate-in fade-in zoom-in shrink-0">
              <CheckCircle2 size={16} />
              Salvo com sucesso!
            </span>
          )}
          <button
            type="submit"
            className="ml-auto flex items-center gap-2 px-8 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95"
          >
            <Save size={18} />
            <span>Salvar Cadastro</span>
          </button>
        </div>
      </form>
    </div>
  );
};
