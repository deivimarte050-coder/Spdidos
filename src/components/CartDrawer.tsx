import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, Bike, Copy } from 'lucide-react';
import { CartItem, TransferBankAccount } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  deliveryFee?: number;
  onAdd: (item: any) => void;
  onRemove: (id: string, notes?: string) => void;
  onCheckout: () => void;
  isCheckingOut?: boolean;
  total?: number;
  paymentMethod: 'cash' | 'transfer';
  onPaymentMethodChange: (method: 'cash' | 'transfer') => void;
  transferBankAccounts: TransferBankAccount[];
  selectedTransferAccountIndex: number;
  onTransferAccountChange: (index: number) => void;
  transferReceiptImage?: string | null;
  onTransferReceiptChange: (imageBase64: string | null) => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  deliveryFee = 50,
  onAdd, 
  onRemove, 
  onCheckout,
  isCheckingOut = false,
  total,
  paymentMethod,
  onPaymentMethodChange,
  transferBankAccounts,
  selectedTransferAccountIndex,
  onTransferAccountChange,
  transferReceiptImage,
  onTransferReceiptChange,
}) => {
  const subtotal = typeof total === 'number'
    ? total
    : items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const finalTotal = subtotal + deliveryFee;
  const selectedTransferAccount = transferBankAccounts[selectedTransferAccountIndex] || null;
  const transferAccountReady = !!selectedTransferAccount?.bankName && !!selectedTransferAccount?.accountNumber && !!selectedTransferAccount?.accountHolder;

  const handleCopyAccountNumber = async (accountNumber: string) => {
    const value = String(accountNumber || '').trim();
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      alert('Número de cuenta copiado');
    } catch {
      alert('No se pudo copiar automáticamente. Copia el número manualmente.');
    }
  };

  const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = dataUrl;
    });

  const compressTransferReceipt = async (dataUrl: string): Promise<string> => {
    if (dataUrl.length <= 900000) return dataUrl;

    const image = await loadImageFromDataUrl(dataUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen');

    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / image.width);
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.82;
    let compressed = canvas.toDataURL('image/jpeg', quality);

    while (compressed.length > 900000 && quality > 0.42) {
      quality -= 0.08;
      compressed = canvas.toDataURL('image/jpeg', quality);
    }

    if (compressed.length > 900000) {
      let width = canvas.width;
      let height = canvas.height;
      while (compressed.length > 900000 && width > 420 && height > 420) {
        width = Math.round(width * 0.85);
        height = Math.round(height * 0.85);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);
        compressed = canvas.toDataURL('image/jpeg', Math.max(quality, 0.4));
      }
    }

    if (compressed.length > 1000000) {
      throw new Error('La imagen es muy grande. Usa una captura más liviana.');
    }

    return compressed;
  };

  const handleTransferReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      if (!base64) {
        alert('No se pudo leer la captura. Intenta de nuevo.');
        return;
      }
      try {
        const optimized = await compressTransferReceipt(base64);
        onTransferReceiptChange(optimized);
      } catch (error: any) {
        alert(error?.message || 'No se pudo procesar la captura. Intenta con una imagen más liviana.');
      }
    };
    reader.onerror = () => {
      alert('No se pudo leer la captura. Intenta de nuevo.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 h-[100dvh] w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Tu Pedido</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{items.length} productos</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                    <ShoppingBag className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Tu carrito está vacío</h3>
                    <p className="text-sm text-gray-400">¡Agrega algo delicioso para comenzar!</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                  >
                    Explorar Menú
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.id}-${item.notes || 'sin-nota'}`} className="flex items-center gap-4 group">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 leading-tight">{item.name}</h4>
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1">Nota: {item.notes}</p>
                      )}
                      <p className="text-sm text-primary font-black mt-1">RD$ {item.price}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                      <button 
                        onClick={() => onRemove(item.id, item.notes)}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-all shadow-sm"
                      >
                        {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="text-sm font-black text-gray-900 w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => onAdd(item)}
                        className="p-1.5 hover:bg-white rounded-lg text-primary transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 space-y-4 overflow-y-auto max-h-[58dvh] pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-black text-gray-900">Método de pago</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onPaymentMethodChange('cash')}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => onPaymentMethodChange('transfer')}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        paymentMethod === 'transfer'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Transferencia
                    </button>
                  </div>

                  {paymentMethod === 'transfer' && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
                        <p className="text-xs font-black text-blue-700 uppercase mb-2">Cuentas del negocio</p>
                        {transferBankAccounts.length > 0 ? (
                          <div className="space-y-2">
                            {transferBankAccounts.map((account, index) => {
                              const isSelected = index === selectedTransferAccountIndex;
                              return (
                                <div
                                  key={`${account.bankName}-${account.accountNumber}-${index}`}
                                  className={`rounded-xl border p-3 ${isSelected ? 'border-blue-300 bg-white' : 'border-blue-100 bg-blue-50/60'}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => onTransferAccountChange(index)}
                                    className="w-full text-left"
                                  >
                                    <p className="text-xs font-black text-blue-700 uppercase mb-1">Banco {index + 1}</p>
                                    <p className="text-blue-900"><span className="font-black">Banco:</span> {account.bankName}</p>
                                    <p className="text-blue-900"><span className="font-black">Titular:</span> {account.accountHolder}</p>
                                    <p className="text-blue-900"><span className="font-black">Número:</span> {account.accountNumber}</p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyAccountNumber(account.accountNumber)}
                                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100"
                                  >
                                    <Copy className="w-3.5 h-3.5" /> Copiar número de cuenta
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-blue-700 font-medium">Este negocio aún no ha configurado sus datos de transferencia.</p>
                        )}
                      </div>

                      <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                        Para usar transferencia debes realizarla antes de confirmar el pedido y subir el comprobante.
                      </p>

                      <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-600 uppercase">Comprobante de transferencia</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTransferReceiptUpload}
                          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-primary/90"
                        />
                        {transferReceiptImage && (
                          <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                            <img src={transferReceiptImage} alt="Comprobante de transferencia" className="w-full h-28 sm:h-40 object-cover" />
                          </div>
                        )}
                        {transferReceiptImage && (
                          <button
                            type="button"
                            onClick={() => onTransferReceiptChange(null)}
                            className="text-xs font-bold text-red-600 hover:text-red-700"
                          >
                            Eliminar comprobante
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>RD$ {subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Envío</span>
                    <span className="text-emerald-500 font-bold inline-flex items-center gap-1"><Bike className="w-3.5 h-3.5" /> RD$ {deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-xl font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>RD$ {finalTotal}</span>
                  </div>
                </div>
                <button 
                  onClick={onCheckout}
                  disabled={isCheckingOut || (paymentMethod === 'transfer' && (!transferAccountReady || !transferReceiptImage))}
                  className={`w-full py-4 sm:py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all ${
                    isCheckingOut || (paymentMethod === 'transfer' && (!transferAccountReady || !transferReceiptImage))
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isCheckingOut ? 'Procesando pedido...' : 'Confirmar Pedido'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
