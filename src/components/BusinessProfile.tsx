import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, MapPin, Clock, Star, Edit2, Save, X, Upload, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import EventService from '../services/EventService';

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
          </div>
        </div>

        {/* Estado del negocio */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
          <div>
            <p className="font-bold text-gray-900">Estado del Negocio</p>
            <p className="text-sm text-gray-500">
              {profile.isActive ? 'Tu negocio está visible para clientes' : 'Tu negocio está oculto para clientes'}
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
