import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Receipt } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, FileText, Download, Calendar, Trash2, CheckCircle2, Clock, Edit2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { motion, AnimatePresence } from 'motion/react';

interface ReceiptListProps {
  userId: string;
  onEdit?: (receipt: Receipt) => void;
}

export const ReceiptList: React.FC<ReceiptListProps> = ({ userId, onEdit }) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      const localReceipts = JSON.parse(localStorage.getItem('receipts_fallback') || '[]');
      setReceipts(localReceipts);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'receipts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Timeout for historical list as well
    const listTimeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => {
          const data = doc.data();
          // Handle serverTimestamp still being processed by the server
          let createdAt: string;
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === 'string') {
            createdAt = data.createdAt;
          } else if (data.createdAt && typeof data.createdAt === 'object' && 'seconds' in data.createdAt) {
            createdAt = new Date((data.createdAt as any).seconds * 1000).toISOString();
          } else {
            createdAt = new Date().toISOString();
          }

          return {
            id: doc.id,
            ...data,
            createdAt
          } as Receipt;
        });
        setReceipts(docs);
        setLoading(false);
        clearTimeout(listTimeout);
      },
      (error) => {
        console.error("Firebase error in List:", error);
        setLoading(false);
        clearTimeout(listTimeout);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(listTimeout);
    };
  }, [userId]);

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const handleDelete = async (receiptId: string | undefined) => {
    if (!receiptId) return;

    if (confirmingDelete !== receiptId) {
      setConfirmingDelete(receiptId);
      setTimeout(() => setConfirmingDelete(null), 3000);
      return;
    }

    try {
      if (db) {
        await deleteDoc(doc(db, 'receipts', receiptId));
        setConfirmingDelete(null);
      } else {
        const localReceipts = JSON.parse(localStorage.getItem('receipts_fallback') || '[]');
        const filtered = localReceipts.filter((r: any) => r.id !== receiptId);
        localStorage.setItem('receipts_fallback', JSON.stringify(filtered));
        setReceipts(filtered);
        setConfirmingDelete(null);
      }
    } catch (error: any) {
      console.error('Error deleting receipt:', error);
      setConfirmingDelete(null);
    }
  };

  const handleConvertToService = async (receipt: Receipt) => {
    if (!receipt.id) return;
    try {
      if (db) {
        await updateDoc(doc(db, 'receipts', receipt.id), {
          type: 'service'
        });
      } else {
        const localReceipts = JSON.parse(localStorage.getItem('receipts_fallback') || '[]');
        const updated = localReceipts.map((r: any) => 
          r.id === receipt.id ? { ...r, type: 'service' } : r
        );
        localStorage.setItem('receipts_fallback', JSON.stringify(updated));
        setReceipts(updated);
      }
    } catch (error: any) {
      console.error('Error updating receipt:', error);
      alert('Erro ao atualizar: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const filteredReceipts = receipts.filter(r => 
    r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.services ? r.services.map(s => s.description).join(' ') : '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6" id="receipt-list">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Pesquisar por cliente, empresa ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-black transition-all"
        />
      </div>

      <div className="space-y-4">
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum recibo encontrado</p>
            <p className="text-sm text-gray-400">Os recibos gerados aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredReceipts.map((receipt) => (
                <motion.div
                  key={receipt.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold text-gray-900">{receipt.clientName}</h4>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 font-mono rounded font-bold">
                            {receipt.osNumber || 'S/N'}
                          </span>
                          {receipt.type === 'estimate' ? (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-bold flex items-center gap-1">
                              <Clock size={10} /> ORÇAMENTO
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-bold flex items-center gap-1">
                              <CheckCircle2 size={10} /> SERVIÇO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <Calendar size={12} />
                          {(() => {
                            const dateStr = receipt.serviceDate || receipt.createdAt;
                            try {
                              // If YYYY-MM-DD, use / to avoid timezone shift
                              const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) 
                                ? new Date(dateStr.replace(/-/g, '/'))
                                : new Date(dateStr);
                              return format(date, "dd 'de' MMM, yyyy", { locale: ptBR });
                            } catch (e) {
                              return dateStr;
                            }
                          })()}
                          <span>•</span>
                          <span className="font-medium text-gray-700">{receipt.companyName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(receipt.total)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {receipt.services && receipt.services.length > 0 ? (
                        receipt.services.map((service, idx) => (
                          <div key={idx} className="flex gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100 group-hover:border-gray-200 transition-colors items-start">
                            <div className="flex gap-1 shrink-0">
                              {(service.photoBefore || (service as any).photo) && (
                                <img src={service.photoBefore || (service as any).photo} alt="Antes" className="w-10 h-10 rounded object-cover border border-gray-200 shadow-sm" />
                              )}
                              {service.photoAfter && (
                                <img src={service.photoAfter} alt="Após" className="w-10 h-10 rounded object-cover border border-gray-200 shadow-sm" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-600 line-clamp-2 italic">
                                {service.description}
                              </p>
                              {service.value && (
                                <p className="text-[10px] font-bold text-gray-800 mt-0.5">
                                  {formatCurrency(service.value)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                          Sem descrição do serviço
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                    <div className="flex gap-1 md:gap-2">
                      <button
                        onClick={() => onEdit?.(receipt)}
                        className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(receipt.id)}
                        className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${
                          confirmingDelete === receipt.id 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                        {confirmingDelete === receipt.id && <span className="text-[10px] font-bold">CONFIRMAR?</span>}
                      </button>
                      
                      {receipt.type === 'estimate' && (
                        <button
                          onClick={() => handleConvertToService(receipt)}
                          className="flex items-center gap-1 px-3 py-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all text-[10px] md:text-[11px] font-black uppercase italic"
                          title="Transformar em Serviço Realizado"
                        >
                          <CheckCircle2 size={14} />
                          <span className="hidden xs:inline">CONCLUIR</span>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={async () => await generateReceiptPDF(receipt)}
                      className="flex items-center gap-2 px-4 py-3 md:py-2 bg-yellow-400 text-black rounded-xl hover:bg-yellow-500 transition-all text-[11px] font-black uppercase italic shadow-lg shadow-yellow-100"
                    >
                      <Download size={14} />
                      <span>Baixar</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
