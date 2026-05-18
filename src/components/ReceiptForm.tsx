import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, FileDown, PlusCircle, Building2, Camera, X } from 'lucide-react';
import { Part, Receipt, Expenses, ServiceItem } from '../types';
import { formatCurrency } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { useCompanyProfile } from '../hooks/useCompanyProfile';

interface ReceiptFormProps {
  userId: string;
  onSuccess: () => void;
  initialData?: Receipt;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({ userId, onSuccess, initialData }) => {
  const { profile } = useCompanyProfile();
  const [type, setType] = useState<'estimate' | 'service'>(initialData?.type || 'service');
  const [companyName, setCompanyName] = useState(initialData ? initialData.companyName : profile.name);
  const [companyDetails, setCompanyDetails] = useState(initialData ? initialData.companyDetails : profile.details);
  const [clientName, setClientName] = useState(initialData?.clientName || '');
  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return Math.random().toString(36).substring(2, 15);
    }
  };

  const [services, setServices] = useState<ServiceItem[]>(initialData?.services || [{ id: generateId(), description: 'Manutenção em geral' }]);
  const [laborCost, setLaborCost] = useState<number | ''>(initialData?.laborCost || '');
  const [parts, setParts] = useState<Part[]>(initialData?.parts || []);
  const [expenses, setExpenses] = useState<{ gasoline: number | ''; toll: number | ''; other: number | '' }>(
    initialData?.expenses ? {
      gasoline: initialData.expenses.gasoline ?? '',
      toll: initialData.expenses.toll ?? '',
      other: initialData.expenses.other ?? ''
    } : { gasoline: '', toll: '', other: '' }
  );
  const [serviceDate, setServiceDate] = useState(initialData?.serviceDate || new Date().toISOString().split('T')[0]);
  const [osNumber, setOsNumber] = useState(initialData?.osNumber || `OS-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
  const [mileageInitial, setMileageInitial] = useState<number | ''>(initialData?.mileageInitial || '');
  const [mileageFinal, setMileageFinal] = useState<number | ''>(initialData?.mileageFinal || '');
  const [dashboardPhoto, setDashboardPhoto] = useState<string | undefined>(initialData?.dashboardPhoto);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-populate if initialData changes
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setCompanyName(initialData.companyName);
      setCompanyDetails(initialData.companyDetails);
      setClientName(initialData.clientName);
      setServices(initialData.services);
      setLaborCost(initialData.laborCost || '');
      setParts(initialData.parts || []);
      setExpenses({
        gasoline: initialData.expenses?.gasoline ?? '',
        toll: initialData.expenses?.toll ?? '',
        other: initialData.expenses?.other ?? ''
      });
      setServiceDate(initialData.serviceDate);
      setOsNumber(initialData.osNumber);
      setMileageInitial(initialData.mileageInitial ?? '');
      setMileageFinal(initialData.mileageFinal ?? '');
      setDashboardPhoto(initialData.dashboardPhoto);
    }
  }, [initialData]);

  // Sync profile data if it changes and not editing
  useEffect(() => {
    if (!initialData) {
      setCompanyName(profile.name);
      setCompanyDetails(profile.details);
    }
  }, [profile, initialData]);

  const addPart = () => {
    setParts([...parts, { id: generateId(), name: '', price: 0 }]);
  };

  const updatePart = (index: number, field: keyof Part, value: string | number) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], [field]: value };
    setParts(newParts);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handleServicePhotoUpload = (index: number, type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newServices = [...services];
      if (type === 'before') {
        newServices[index].photoBefore = reader.result as string;
      } else {
        newServices[index].photoAfter = reader.result as string;
      }
      setServices(newServices);
    };
    reader.readAsDataURL(file);
  };

  const removeServicePhoto = (index: number, type: 'before' | 'after') => {
    const newServices = [...services];
    if (type === 'before') {
      newServices[index].photoBefore = undefined;
    } else {
      newServices[index].photoAfter = undefined;
    }
    setServices(newServices);
  };

  const addService = () => {
    setServices([...services, { id: generateId(), description: '' }]);
  };

  const updateServiceDescription = (index: number, value: string) => {
    const newServices = [...services];
    newServices[index].description = value;
    setServices(newServices);
  };

  const updateServiceValue = (index: number, value: number | undefined) => {
    const newServices = [...services];
    newServices[index].value = value;
    setServices(newServices);
  };

  const removeService = (index: number) => {
    if (services.length <= 1) return;
    setServices(services.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const servicesTotal = services.reduce((sum, service) => sum + (service.value || 0), 0);
    const partsTotal = parts.reduce((sum, part) => sum + Number(part.price), 0);
    const expensesTotal = Number(expenses.gasoline) + Number(expenses.toll) + Number(expenses.other);
    return Number(laborCost) + servicesTotal + partsTotal + expensesTotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !clientName) {
      alert('Por favor, preencha o nome da empresa e o nome do cliente.');
      return;
    }

    setIsSaving(true);
    const total = calculateTotal();

    const receiptData: Omit<Receipt, 'id'> = {
      type,
      companyName,
      companyDetails,
      clientName,
      services: services.filter(s => s.description.trim() !== ''),
      laborCost: Number(laborCost),
      parts: parts.map(p => ({ ...p, price: Number(p.price) })),
      expenses: {
        gasoline: Number(expenses.gasoline),
        toll: Number(expenses.toll),
        other: Number(expenses.other),
      },
      total,
      createdAt: new Date().toISOString(),
      serviceDate,
      osNumber,
      mileageInitial: mileageInitial === '' ? undefined : Number(mileageInitial),
      mileageFinal: mileageFinal === '' ? undefined : Number(mileageFinal),
      dashboardPhoto,
      companyLogo: profile.logo,
      pixKey: profile.pixKey,
      userId,
    };

    try {
      // Generate PDF immediately for better UX
      await generateReceiptPDF(receiptData as Receipt);

      // Save to DB in background if configured
      if (db) {
        if (initialData?.id) {
          await updateDoc(doc(db, 'receipts', initialData.id), {
            ...receiptData,
            updatedAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, 'receipts'), {
            ...receiptData,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        // Fallback for local storage if Firebase is not configured
        const localReceipts = JSON.parse(localStorage.getItem('receipts_fallback') || '[]');
        
        if (initialData?.id) {
          const updated = localReceipts.map((r: any) => 
            r.id === initialData.id ? { ...receiptData, id: initialData.id } : r
          );
          localStorage.setItem('receipts_fallback', JSON.stringify(updated));
        } else {
          const newReceipt = { ...receiptData, id: generateId() };
          localStorage.setItem('receipts_fallback', JSON.stringify([newReceipt, ...localReceipts]));
        }
      }
      
      onSuccess();
      // Reset non-company form fields
      setClientName('');
      setParts([]);
      setExpenses({ gasoline: '', toll: '', other: '' });
      setLaborCost('');
      setType('service');
      setServices([{ id: generateId(), description: 'Manutenção em geral' }]);
      setOsNumber(`OS-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
      setMileageInitial('');
      setMileageFinal('');
      setDashboardPhoto(undefined);
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Recibo foi baixado, mas houve um erro ao salvar no histórico.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8 space-y-6 md:space-y-8" id="receipt-form">
      {/* Type Toggle */}
      <div className="flex p-1 bg-gray-100 rounded-xl w-full md:w-fit">
        <button
          type="button"
          onClick={() => setType('service')}
          className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-xs font-bold transition-all ${
            type === 'service' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          SERVIÇO
        </button>
        <button
          type="button"
          onClick={() => setType('estimate')}
          className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-xs font-bold transition-all ${
            type === 'estimate' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ORÇAMENTO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Company Info - Read Only if Profile exists, or editable otherwise */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Dados do Prestador</h3>
            {profile.name && (
              <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">
                <Building2 size={10} /> PERFIL CARREGADO
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa / Seu Nome</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Arthur Manutenções"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dados de Contato / CNPJ</label>
              <textarea
                value={companyDetails}
                onChange={(e) => setCompanyDetails(e.target.value)}
                placeholder="Ex: CNPJ: 00.000.000/0001-00 | Rua Exemplo, 123 | (11) 99999-9999"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all h-24 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Client Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Dados do Cliente</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente ou empresa"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número da O.S.</label>
              <input
                type="text"
                value={osNumber}
                onChange={(e) => setOsNumber(e.target.value)}
                placeholder="Ex: OS-2024001"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Serviço</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                required
              />
            </div>
          </div>
        </section>
      </div>

      <hr className="border-gray-100" />

      {/* Services Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Serviços Realizados</h3>
          <button
            type="button"
            onClick={addService}
            className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-black transition-colors"
          >
            <Plus size={14} /> ADICIONAR SERVIÇO
          </button>
        </div>
        
        <div className="space-y-4">
          {services.map((service, index) => (
            <div key={service.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-3 md:p-4 bg-gray-50/50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="md:col-span-8 space-y-4">
                <div className="relative">
                  <label className="block text-[10px] md:text-xs font-semibold text-gray-400 uppercase mb-1">Descrição do Serviço</label>
                  <textarea
                    value={service.description}
                    onChange={(e) => updateServiceDescription(index, e.target.value)}
                    placeholder="Descreva o serviço realizado..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all h-24 resize-none bg-white text-sm"
                  />
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="absolute top-7 right-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] md:text-xs font-semibold text-gray-400 uppercase mb-1">Valor Unitário</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500 text-sm">R$</span>
                      <input
                        type="number"
                        value={service.value || ''}
                        onChange={(e) => updateServiceValue(index, e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder="0,00"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-4 space-y-3">
                <label className="block text-[10px] md:text-xs font-semibold text-gray-400 uppercase">Fotos de Registro</label>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Antes */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">Antes</span>
                    {service.photoBefore ? (
                      <div className="relative group w-full aspect-square">
                        <img src={service.photoBefore} alt="Antes" className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm" />
                        <button
                          type="button"
                          onClick={() => removeServicePhoto(index, 'before')}
                          className="absolute -top-1.5 -right-1.5 p-1.5 bg-red-500 text-white rounded-full shadow-lg transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(`photo-before-input-${index}`) as HTMLInputElement;
                          input?.click();
                        }}
                        className="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-black hover:text-black transition-all bg-white"
                      >
                        <Camera size={20} />
                        <span className="text-[9px] mt-1 font-bold uppercase tracking-tighter">Antes</span>
                      </button>
                    )}
                    <input
                      id={`photo-before-input-${index}`}
                      type="file"
                      onChange={(e) => handleServicePhotoUpload(index, 'before', e)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Depois */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">Após</span>
                    {service.photoAfter ? (
                      <div className="relative group w-full aspect-square">
                        <img src={service.photoAfter} alt="Após" className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm" />
                        <button
                          type="button"
                          onClick={() => removeServicePhoto(index, 'after')}
                          className="absolute -top-1.5 -right-1.5 p-1.5 bg-red-500 text-white rounded-full shadow-lg transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(`photo-after-input-${index}`) as HTMLInputElement;
                          input?.click();
                        }}
                        className="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-black hover:text-black transition-all bg-white"
                      >
                        <Camera size={20} />
                        <span className="text-[9px] mt-1 font-bold uppercase tracking-tighter">Após</span>
                      </button>
                    )}
                    <input
                      id={`photo-after-input-${index}`}
                      type="file"
                      onChange={(e) => handleServicePhotoUpload(index, 'after', e)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <hr className="border-gray-100" />

      {/* Logística - Mileage and Dash Photo */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Logística de Viagem</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Quilometragem (KM)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">KM Inicial</label>
                <input
                  type="number"
                  value={mileageInitial}
                  onChange={(e) => setMileageInitial(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">KM Final</label>
                <input
                  type="number"
                  value={mileageFinal}
                  onChange={(e) => setMileageFinal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all bg-white"
                />
              </div>
            </div>
            {mileageInitial && mileageFinal && (
              <p className="text-[10px] text-gray-500 font-bold bg-white px-2 py-1 rounded inline-block">
                TOTAL PERCORRIDO: {Number(mileageFinal) - Number(mileageInitial)} KM
              </p>
            )}
          </div>

          <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Foto do Painel</h4>
            <div className="flex items-center gap-4">
              {dashboardPhoto ? (
                <div className="relative group w-32 h-24">
                  <img src={dashboardPhoto} alt="Painel" className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm" />
                  <button
                    type="button"
                    onClick={() => setDashboardPhoto(undefined)}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('dashboard-photo-input') as HTMLInputElement;
                    input?.click();
                  }}
                  className="w-32 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-black hover:text-black transition-all bg-white"
                >
                  <Camera size={24} />
                  <span className="text-[10px] mt-1 font-bold uppercase">Foto Painel</span>
                </button>
              )}
              <input
                id="dashboard-photo-input"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setDashboardPhoto(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                accept="image/*"
                className="hidden"
              />
              <p className="text-[10px] text-gray-400 flex-1 leading-tight">
                Adicione uma foto do odômetro do veículo para registro de quilometragem.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Items Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Itens e Custos</h3>
          <button
            type="button"
            onClick={addPart}
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-black transition-colors"
          >
            <PlusCircle size={16} />
            Adicionar Peça
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mão de Obra */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Mão de Obra</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
              <input
                type="number"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all bg-white"
              />
            </div>
          </div>

          {/* Expenses */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
            <h4 className="text-xs font-semibold text-gray-500">Despesas Extras</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Combustível</label>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-gray-400 text-[10px]">R$</span>
                  <input
                    type="number"
                    value={expenses.gasoline}
                    onChange={(e) => setExpenses({ ...expenses, gasoline: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="0,00"
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none bg-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pedágios</label>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-gray-400 text-[10px]">R$</span>
                  <input
                    type="number"
                    value={expenses.toll}
                    onChange={(e) => setExpenses({ ...expenses, toll: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="0,00"
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none bg-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Outros</label>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-gray-400 text-[10px]">R$</span>
                  <input
                    type="number"
                    value={expenses.other}
                    onChange={(e) => setExpenses({ ...expenses, other: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="0,00"
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none bg-white text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Parts List */}
        {parts.length > 0 && (
          <div className="space-y-3">
            {parts.map((part, index) => (
              <div key={part.id} className="flex items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  placeholder="Nome da peça"
                  value={part.name}
                  onChange={(e) => updatePart(index, 'name', e.target.value)}
                  className="flex-grow px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                />
                <div className="relative w-40">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm">R$</span>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={part.price || ''}
                    onChange={(e) => updatePart(index, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePart(index)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer / Summary */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 md:pt-8 border-t border-gray-100">
        <div className="w-full md:w-auto text-center md:text-left bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none">
          <p className="text-[10px] md:text-sm text-gray-500 uppercase font-black tracking-widest mb-1">Total do Recibo</p>
          <p className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">{formatCurrency(calculateTotal())}</p>
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-5 md:py-4 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase font-black italic tracking-widest"
            id="generate-pdf-button"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Salvando...
              </span>
            ) : (
              <>
                <FileDown size={20} />
                <span>{initialData ? 'Atualizar' : 'Gerar Recibo'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
