import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, MapPin, Clock, Star, Edit2, Save, X, Upload, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface BusinessProfile {
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
}

const BusinessProfile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>({
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

  const handleSave = () => {
    // Aquí iría la lógica para guardar el perfil
    console.log('Guardando perfil:', profile);
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

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
            onClick={() => setProfile({ ...profile, isActive: !profile.isActive })}
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
