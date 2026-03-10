import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, MapPin, Clock, Star, Edit2, Save, X, Upload, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import EventService from '../services/EventService';
import { BusinessDayKey, WeeklyBusinessSchedule, TransferBankAccount } from '../types';

const DAY_ORDER: { key: BusinessDayKey; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const buildDefaultWeeklySchedule = (openingTime = '08:00', closingTime = '22:00'): WeeklyBusinessSchedule => ({
  monday: { isOpen: true, openingTime, closingTime },
  tuesday: { isOpen: true, openingTime, closingTime },
  wednesday: { isOpen: true, openingTime, closingTime },
  thursday: { isOpen: true, openingTime, closingTime },
  friday: { isOpen: true, openingTime, closingTime },
  saturday: { isOpen: true, openingTime, closingTime },
  sunday: { isOpen: true, openingTime, closingTime },
});

const mergeWeeklySchedule = (
  weeklySchedule?: Partial<WeeklyBusinessSchedule>,
  fallbackOpening = '08:00',
  fallbackClosing = '22:00'
): WeeklyBusinessSchedule => {
  const base = buildDefaultWeeklySchedule(fallbackOpening, fallbackClosing);
  if (!weeklySchedule) return base;

  return DAY_ORDER.reduce((acc, day) => {
    const incoming = weeklySchedule[day.key];
    acc[day.key] = {
      isOpen: incoming?.isOpen ?? base[day.key].isOpen,
      openingTime: incoming?.openingTime || base[day.key].openingTime,
      closingTime: incoming?.closingTime || base[day.key].closingTime,
    };
    return acc;
  }, { ...base });
};

const normalizeTransferBankAccounts = (accounts: any[]): TransferBankAccount[] => (
  (accounts || [])
    .map((account) => ({
      bankName: String(account?.bankName || '').trim(),
      accountNumber: String(account?.accountNumber || '').trim(),
      accountHolder: String(account?.accountHolder || '').trim(),
    }))
    .filter((account) => account.bankName && account.accountNumber && account.accountHolder)
);

interface BusinessProfileData {
  id?: string;
  name: string;
  description: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  address: string;
  phone: string;
  whatsapp: string;
  openingTime: string;
  closingTime: string;
  weeklySchedule: WeeklyBusinessSchedule;
  transferBankAccounts: TransferBankAccount[];
  image: string;
  isActive: boolean;
  status?: string;
}

const BusinessProfile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>('');
  const [profile, setProfile] = useState<BusinessProfileData>({
    name: 'Mi Restaurante',
    description: 'Deliciosa comida local con los mejores ingredientes',
    cuisine: 'Dominicana • Internacional',
    rating: 4.8,
    deliveryTime: '25-35 min',
    address: 'Calle Principal #123, San Pedro de Macorís',
    phone: '809-123-4567',
    whatsapp: '809-123-4567',
    openingTime: '08:00',
    closingTime: '22:00',
    weeklySchedule: buildDefaultWeeklySchedule('08:00', '22:00'),
    transferBankAccounts: [{ bankName: '', accountNumber: '', accountHolder: '' }],
    image: 'https://picsum.photos/seed/restaurant/400/300',
    isActive: true
  });

  // Cargar datos del negocio desde Firebase
  useEffect(() => {
    const loadBusinessData = async () => {
      if (user?.role === 'business') {
        try {
          setIsLoading(true);
          
          const businesses = await FirebaseServiceV2.getBusinesses();
          
          let business = null;
          
          // 1. Buscar por businessId almacenado en el usuario (más confiable)
          if (user.businessId) {
            business = businesses.find(b => b.id === user.businessId);
          }
          
          // 2. Buscar por email
          if (!business && user.email) {
            business = businesses.find(b => b.email?.toLowerCase() === user.email?.toLowerCase());
          }
          
          // 3. Buscar por id del usuario
          if (!business && user.id) {
            business = businesses.find(b => b.userId === user.id || b.ownerId === user.id);
          }
          
          // 4. Buscar por nombre como último recurso
          if (!business && user.name) {
            business = businesses.find(b =>
              b.name?.toLowerCase() === user.name?.toLowerCase()
            );
          }
          
          if (business) {
            setBusinessId(business.id);
            setProfile({
              id: business.id,
              name: business.name || 'Mi Restaurante',
              description: business.description || '',
              cuisine: business.cuisine || business.category || '',
              rating: business.rating || 4.8,
              deliveryTime: business.deliveryTime || '25-35 min',
              address: business.address || '',
              phone: business.phone || '',
              whatsapp: business.whatsapp || business.phone || '',
              openingTime: business.openingTime || '08:00',
              closingTime: business.closingTime || '22:00',
              weeklySchedule: mergeWeeklySchedule(
                business.weeklySchedule,
                business.openingTime || '08:00',
                business.closingTime || '22:00'
              ),
              transferBankAccounts: (() => {
                const configuredAccounts = normalizeTransferBankAccounts((business as any).transferBankAccounts || []);
                if (configuredAccounts.length > 0) return configuredAccounts;
                const legacyBankName = String((business as any).transferBankName || '').trim();
                const legacyAccountNumber = String((business as any).transferAccountNumber || '').trim();
                const legacyAccountHolder = String((business as any).transferAccountHolder || '').trim();
                if (legacyBankName && legacyAccountNumber && legacyAccountHolder) {
                  return [{
                    bankName: legacyBankName,
                    accountNumber: legacyAccountNumber,
                    accountHolder: legacyAccountHolder,
                  }];
                }
                return [{ bankName: '', accountNumber: '', accountHolder: '' }];
              })(),
              image: business.image || 'https://picsum.photos/seed/restaurant/400/300',
              isActive: business.status === 'active',
              status: business.status || 'active'
            });
          } else {
            console.warn('⚠️ [BusinessProfile] No se encontró negocio para:', user.email);
          }
        } catch (error) {
          console.error('❌ [BusinessProfile] Error cargando datos:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadBusinessData();
  }, [user]);

  const toMinutes = (value: string) => {
    const [h, m] = (value || '').split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return (h * 60) + m;
  };

  const isOpenNow = (openingTime: string, closingTime: string) => {
    const start = toMinutes(openingTime);
    const end = toMinutes(closingTime);
    if (start === null || end === null) return false;

    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
  };

  const formatHour = (value: string) => {
    const [h, m] = (value || '').split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return value;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const getTodayKey = (): BusinessDayKey => {
    const weekMap: BusinessDayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekMap[new Date().getDay()];
  };

  const isOpenForSchedule = (day: { isOpen: boolean; openingTime: string; closingTime: string }) => {
    if (!day.isOpen) return false;
    return isOpenNow(day.openingTime, day.closingTime);
  };

  const updateWeeklyDay = (dayKey: BusinessDayKey, patch: Partial<WeeklyBusinessSchedule[BusinessDayKey]>) => {
    setProfile((prev) => ({
      ...prev,
      weeklySchedule: {
        ...prev.weeklySchedule,
        [dayKey]: {
          ...prev.weeklySchedule[dayKey],
          ...patch,
        },
      },
    }));
  };

  const updateTransferBankAccount = (index: number, patch: Partial<TransferBankAccount>) => {
    setProfile((prev) => ({
      ...prev,
      transferBankAccounts: prev.transferBankAccounts.map((account, accountIndex) => (
        accountIndex === index
          ? { ...account, ...patch }
          : account
      )),
    }));
  };

  const addTransferBankAccount = () => {
    setProfile((prev) => ({
      ...prev,
      transferBankAccounts: [
        ...prev.transferBankAccounts,
        { bankName: '', accountNumber: '', accountHolder: '' },
      ],
    }));
  };

  const removeTransferBankAccount = (index: number) => {
    setProfile((prev) => {
      const next = prev.transferBankAccounts.filter((_, accountIndex) => accountIndex !== index);
      return {
        ...prev,
        transferBankAccounts: next.length > 0 ? next : [{ bankName: '', accountNumber: '', accountHolder: '' }],
      };
    });
  };

  const applyDefaultHoursToAllDays = () => {
    setProfile((prev) => ({
      ...prev,
      weeklySchedule: DAY_ORDER.reduce((acc, day) => {
        acc[day.key] = {
          ...prev.weeklySchedule[day.key],
          openingTime: prev.openingTime,
          closingTime: prev.closingTime,
        };
        return acc;
      }, { ...prev.weeklySchedule }),
    }));
  };

  const getSafeImage = async (imageData: string): Promise<string> => {
    if (!imageData || !imageData.startsWith('data:')) return imageData;
    const sizeKB = Math.round((imageData.length * 3) / 4 / 1024);
    if (sizeKB <= 600) return imageData;
    // Re-compress from base64
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 450;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = () => resolve('');
      img.src = imageData;
    });
  };

  const handleSave = async () => {
    if (!businessId) {
      alert('❌ Error: No se encontró el ID del negocio. Por favor recarga la página.');
      return;
    }

    try {
      const safeImage = await getSafeImage(profile.image);
      const mondaySchedule = profile.weeklySchedule.monday;
      const normalizedAccounts = normalizeTransferBankAccounts(profile.transferBankAccounts);
      const primaryTransferAccount = normalizedAccounts[0] || null;
      const updateData = {
        name: profile.name,
        description: profile.description,
        cuisine: profile.cuisine,
        category: profile.cuisine,
        rating: profile.rating,
        deliveryTime: profile.deliveryTime,
        address: profile.address,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        openingTime: mondaySchedule.openingTime,
        closingTime: mondaySchedule.closingTime,
        weeklySchedule: profile.weeklySchedule,
        transferBankAccounts: normalizedAccounts,
        transferBankName: primaryTransferAccount?.bankName || '',
        transferAccountNumber: primaryTransferAccount?.accountNumber || '',
        transferAccountHolder: primaryTransferAccount?.accountHolder || '',
        image: safeImage,
        status: profile.isActive ? 'active' : 'inactive'
      };
      await FirebaseServiceV2.updateBusiness(businessId, updateData);
      EventService.emit('business-profile:updated');
      alert('✅ Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error: any) {
      console.error('❌ [BusinessProfile] Error guardando:', error);
      alert(`❌ Error al guardar: ${error.message || 'Error desconocido'}`);
    }
  };

  const compressImage = (file: File, maxWidth = 500, maxHeight = 500, quality = 0.65): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        const sizeKB = Math.round((compressed.length * 3) / 4 / 1024);
        console.log(`📸 Imagen comprimida: ${width}x${height} · ${sizeKB} KB`);
        if (sizeKB > 700) {
          resolve(canvas.toDataURL('image/jpeg', 0.4));
        } else {
          resolve(compressed);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Error al cargar imagen')); };
      img.src = objectUrl;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('❌ La imagen es muy grande. Máximo 10MB.');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setProfile(prev => ({ ...prev, image: compressed }));
    } catch {
      alert('❌ Error al procesar la imagen');
    }
  };

  const handleToggleStatus = async () => {
    const newIsActive = !profile.isActive;
    setProfile({ ...profile, isActive: newIsActive });
    
    if (businessId) {
      try {
        console.log('📤 [BusinessProfile] Llamando a FirebaseServiceV2.updateBusiness...');
        await FirebaseServiceV2.updateBusiness(businessId, {
          status: newIsActive ? 'active' : 'inactive'
        });
        console.log('✅ [BusinessProfile] Estado actualizado:', newIsActive ? 'activo' : 'inactivo');
      } catch (error) {
        console.error('❌ [BusinessProfile] Error actualizando estado:', error);
        // Revertir en caso de error
        setProfile({ ...profile, isActive: !newIsActive });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-display text-gray-900">Mi Perfil de Negocio</h2>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
            isEditing 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          {isEditing ? 'GUARDAR' : 'EDITAR'}
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-8">
        {/* Imagen del negocio */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img 
                src={profile.image} 
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          {isEditing ? (
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="text-2xl font-black text-center bg-transparent border-b-2 border-primary text-gray-900 focus:outline-none"
            />
          ) : (
            <h3 className="text-2xl font-black text-gray-900 text-center">{profile.name}</h3>
          )}
          
          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-bold text-yellow-700">{profile.rating}</span>
          </div>
        </div>

        {/* Información del negocio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descripción</label>
              {isEditing ? (
                <textarea
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 mt-1">{profile.description}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo de Comida</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.cuisine}
                  onChange={(e) => setProfile({ ...profile, cuisine: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              ) : (
                <p className="text-gray-700 mt-1">{profile.cuisine}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dirección</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              ) : (
                <div className="flex items-center gap-2 text-gray-700 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.address}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Teléfono</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              ) : (
                <p className="text-gray-700 mt-1">{profile.phone}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">WhatsApp</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.whatsapp}
                  onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              ) : (
                <p className="text-gray-700 mt-1">{profile.whatsapp}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tiempo de Entrega</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.deliveryTime}
                  onChange={(e) => setProfile({ ...profile, deliveryTime: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              ) : (
                <div className="flex items-center gap-2 text-gray-700 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{profile.deliveryTime}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Horario base</label>
              {isEditing ? (
                <div className="mt-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={profile.openingTime}
                      onChange={(e) => setProfile({ ...profile, openingTime: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                      type="time"
                      value={profile.closingTime}
                      onChange={(e) => setProfile({ ...profile, closingTime: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyDefaultHoursToAllDays}
                    className="text-xs font-bold text-primary hover:text-primary/80"
                  >
                    Aplicar horario base a toda la semana
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-700 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatHour(profile.openingTime)} - {formatHour(profile.closingTime)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Horario semanal</label>
              <div className="mt-2 space-y-2">
                {DAY_ORDER.map((day) => {
                  const schedule = profile.weeklySchedule[day.key];
                  return (
                    <div key={day.key} className="grid grid-cols-[90px_1fr] gap-2 items-center">
                      <span className="text-sm font-semibold text-gray-700">{day.label}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateWeeklyDay(day.key, { isOpen: !schedule.isOpen })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${schedule.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                          >
                            {schedule.isOpen ? 'Abierto' : 'Cerrado'}
                          </button>
                          <input
                            type="time"
                            value={schedule.openingTime}
                            disabled={!schedule.isOpen}
                            onChange={(e) => updateWeeklyDay(day.key, { openingTime: e.target.value })}
                            className="w-full p-2 border border-gray-200 rounded-lg disabled:opacity-40"
                          />
                          <input
                            type="time"
                            value={schedule.closingTime}
                            disabled={!schedule.isOpen}
                            onChange={(e) => updateWeeklyDay(day.key, { closingTime: e.target.value })}
                            className="w-full p-2 border border-gray-200 rounded-lg disabled:opacity-40"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700">
                          {schedule.isOpen
                            ? `${formatHour(schedule.openingTime)} - ${formatHour(schedule.closingTime)}`
                            : 'Cerrado'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pago por transferencia</label>
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  {profile.transferBankAccounts.map((account, index) => (
                    <div key={`transfer-account-${index}`} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-gray-600 uppercase">Banco #{index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeTransferBankAccount(index)}
                          className="text-xs font-black text-red-600 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                      <input
                        type="text"
                        value={account.bankName}
                        onChange={(e) => updateTransferBankAccount(index, { bankName: e.target.value })}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Banco"
                      />
                      <input
                        type="text"
                        value={account.accountNumber}
                        onChange={(e) => updateTransferBankAccount(index, { accountNumber: e.target.value })}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Número de cuenta"
                      />
                      <input
                        type="text"
                        value={account.accountHolder}
                        onChange={(e) => updateTransferBankAccount(index, { accountHolder: e.target.value })}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Nombre del titular"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTransferBankAccount}
                    className="w-full py-2.5 rounded-xl border border-dashed border-primary text-primary font-bold text-sm hover:bg-primary/5"
                  >
                    + Agregar otro banco
                  </button>
                </div>
              ) : (
                <div className="mt-1 text-sm text-gray-700 space-y-1">
                  {normalizeTransferBankAccounts(profile.transferBankAccounts).length > 0 ? (
                    normalizeTransferBankAccounts(profile.transferBankAccounts).map((account, index) => (
                      <div key={`transfer-account-view-${index}`} className="rounded-xl border border-gray-200 p-3 space-y-1 bg-gray-50">
                        <p><span className="font-bold">Banco:</span> {account.bankName}</p>
                        <p><span className="font-bold">Cuenta:</span> {account.accountNumber}</p>
                        <p><span className="font-bold">Titular:</span> {account.accountHolder}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No configurado</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estado del negocio */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
          <div>
            <p className="font-bold text-gray-900">Estado del Negocio</p>
            <p className="text-sm text-gray-500">
              {profile.isActive ? 'Tu negocio está visible para clientes' : 'Tu negocio está oculto para clientes'}
            </p>
            <p className="text-sm font-semibold mt-1 text-gray-700">
              {(() => {
                const todaySchedule = profile.weeklySchedule[getTodayKey()];
                if (!todaySchedule.isOpen) return 'Cerrado por hoy';
                return isOpenForSchedule(todaySchedule)
                  ? `Abierto ahora · Cierra a las ${formatHour(todaySchedule.closingTime)}`
                  : `Cerrado por hoy · Abre a las ${formatHour(todaySchedule.openingTime)}`;
              })()}
            </p>
          </div>
          <button
            onClick={handleToggleStatus}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              profile.isActive ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                profile.isActive ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfile;
