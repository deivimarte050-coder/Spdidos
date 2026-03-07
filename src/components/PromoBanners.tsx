import React from 'react';
import { motion } from 'motion/react';

const banners = [
  { 
    id: 1, 
    title: 'Restaurantes', 
    subtitle: '¡Disfruta estas promociones!', 
    color: 'bg-yellow-400', 
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=200&fit=crop' 
  },
  { 
    id: 2, 
    title: 'Medios de pago', 
    subtitle: '¡Conoce todas las opciones de ahorro!', 
    color: 'bg-primary', 
    image: 'https://images.unsplash.com/photo-1556742049-02e49f40b39a?w=400&h=200&fit=crop' 
  },
  { 
    id: 3, 
    title: 'Mercados', 
    subtitle: '¡Conoce las promos y ahorra!', 
    color: 'bg-secondary', 
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=200&fit=crop' 
  },
];

const PromoBanners = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {banners.map((banner) => (
        <motion.div
          key={banner.id}
          whileHover={{ scale: 1.02 }}
          className={`${banner.color} rounded-3xl overflow-hidden shadow-sm flex flex-col h-48 cursor-pointer group`}
        >
          <div className="p-6 flex-1 flex flex-col justify-center">
            <h3 className="text-2xl font-black text-white leading-tight mb-1">{banner.title}</h3>
            <p className="text-white/90 text-sm font-medium leading-tight">{banner.subtitle}</p>
          </div>
          <div className="h-24 w-full overflow-hidden">
            <img 
              src={banner.image} 
              alt={banner.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default PromoBanners;
