import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Clock, MapPin, ChevronRight } from 'lucide-react';
import { Business } from '../services/DataService';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';

interface BusinessListProps {
  onBusinessSelect?: (business: Business) => void;
  showOnlyActive?: boolean;
}

const BusinessList: React.FC<BusinessListProps> = ({ onBusinessSelect, showOnlyActive = true }) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔍 [BusinessList] Cargando negocios desde Firebase...');
        const allBusinesses = await FirebaseServiceV2.getBusinesses();
        console.log(`✅ [BusinessList] ${allBusinesses.length} negocios encontrados`);
        
        const filteredBusinesses = showOnlyActive 
          ? allBusinesses.filter(b => b.status === 'active')
          : allBusinesses;
        setBusinesses(filteredBusinesses);
      } catch (error) {
        console.error('❌ [BusinessList] Error cargando negocios:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Recargar cada 30 segundos para mantener sincronizado
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, [showOnlyActive]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-2xl"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No hay negocios disponibles</h3>
        <p className="text-gray-400">Pronto tendremos nuevos negocios para ti</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-display text-gray-900">
          Negocios Disponibles
        </h2>
        <span className="text-sm text-gray-400">
          {businesses.length} negocios
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((business, index) => (
          <motion.div
            key={business.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onBusinessSelect?.(business)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
          >
            {/* Imagen del negocio */}
            <div className="relative h-48 overflow-hidden">
              <img 
                src={business.image} 
                alt={business.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Badge de estado */}
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  business.status === 'active' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-500 text-white'
                }`}>
                  {business.status === 'active' ? 'Abierto' : 'Cerrado'}
                </span>
              </div>

              {/* Rating */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="flex items-center bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold text-gray-900">{business.rating}</span>
                </div>
              </div>
            </div>

            {/* Información del negocio */}
            <div className="p-4">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{business.name}</h3>
                <p className="text-sm text-gray-400">{business.category}</p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{business.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>20-30 min</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className="text-sm text-gray-400">
                  <span className="font-medium">{business.totalOrders}</span> pedidos
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BusinessList;
