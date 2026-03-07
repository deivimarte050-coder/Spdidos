import React from 'react';
import { motion } from 'motion/react';

const categories = [
  { id: 'restaurantes', name: 'Restaurantes', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop' },
  { id: 'market', name: 'PedidosYa Market', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop' },
  { id: 'mercados', name: 'Mercados', image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200&h=200&fit=crop' },
  { id: 'farmacias', name: 'Farmacias', image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=200&h=200&fit=crop' },
  { id: 'bebidas', name: 'Bebidas', image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=200&h=200&fit=crop' },
  { id: 'tiendas', name: 'Tiendas', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop' },
];

const CategorySection = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 p-4">
      {categories.map((cat) => (
        <motion.button
          key={cat.id}
          whileHover={{ y: -4 }}
          className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-3 transition-all hover:shadow-md"
        >
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-50">
            <img 
              src={cat.image} 
              alt={cat.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-xs font-bold text-gray-800 text-center leading-tight">{cat.name}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default CategorySection;
