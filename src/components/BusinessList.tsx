import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Clock, ChevronRight, MapPin, Bike } from 'lucide-react';
import { Business } from '../services/DataService';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';

interface BusinessListProps {
  onBusinessSelect?: (business: Business) => void;
  showOnlyActive?: boolean;
}

const BusinessList: React.FC<BusinessListProps> = ({ onBusinessSelect, showOnlyActive = true }) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const getDeliveryFee = (business: Business): number => {
    const fee = Number((business as any).deliveryFee);
    return Number.isFinite(fee) && fee >= 0 ? fee : 50;
  };

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900">
          <span className="font-black">Especialmente</span> para ti
        </h2>
        <button className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors">
          Ver más <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.map((business, index) => (
          <motion.div
            key={business.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            onClick={() => onBusinessSelect?.(business)}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer group hover:shadow-md transition-all"
          >
            {/* Food photo */}
            <div className="relative h-32 lg:h-40 overflow-hidden">
              <img
                src={business.image}
                alt={business.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop';
                }}
              />
              {business.status !== 'active' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-black text-xs bg-black/60 px-3 py-1 rounded-full">Cerrado</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="font-black text-gray-900 text-sm leading-tight truncate mb-1.5">{business.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-md tracking-wide">
                  <Bike className="w-3 h-3" /> RD$ {getDeliveryFee(business)}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                  <Clock className="w-3 h-3" /> 20-35 min
                </span>
              </div>
              {business.rating > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-[11px] font-bold text-gray-600">{business.rating}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BusinessList;
