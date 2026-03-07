import React from 'react';
import { motion } from 'motion/react';
import { UtensilsCrossed, Package, Zap, ShoppingCart } from 'lucide-react';

const categories = [
  { 
    id: 'restaurants', 
    title: 'RESTAURANTES', 
    subtitle: '(Menús)', 
    icon: UtensilsCrossed, 
    color: 'bg-orange-50', 
    iconColor: 'text-orange-500',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop'
  },
  { 
    id: 'shipping', 
    title: 'ENVÍOS', 
    subtitle: '(Paquetes)', 
    icon: Package, 
    color: 'bg-blue-50', 
    iconColor: 'text-blue-500',
    image: 'https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=400&h=400&fit=crop'
  },
  { 
    id: 'errands', 
    title: 'MANDADOS', 
    subtitle: '(Hacer un favor)', 
    icon: Zap, 
    color: 'bg-yellow-50', 
    iconColor: 'text-yellow-500',
    image: 'https://images.unsplash.com/photo-1580913209323-64c255b86cae?w=400&h=400&fit=crop'
  },
  { 
    id: 'supermarket', 
    title: 'SÚPER & FARMACIA', 
    subtitle: '', 
    icon: ShoppingCart, 
    color: 'bg-emerald-50', 
    iconColor: 'text-emerald-500',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop'
  },
];

const CategoryCards = () => {
  return (
    <div>
      {/* Mobile View: Large Vertical Stack */}
      <div className="flex flex-col gap-3 lg:hidden">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 text-left group"
          >
            <div className={`${cat.color} p-3 rounded-2xl`}>
              <cat.icon className={`w-8 h-8 ${cat.iconColor}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-gray-900 tracking-tight leading-none">{cat.title}</span>
              <span className="text-sm font-medium text-gray-400">{cat.subtitle}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Desktop View: Horizontal Grid */}
      <div className="hidden lg:grid grid-cols-4 gap-4">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            whileHover={{ y: -4 }}
            className={`${cat.color} p-6 rounded-3xl flex flex-col items-center text-center gap-3 group transition-all hover:shadow-lg`}
          >
            <div className="bg-white p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
              <cat.icon className={`w-8 h-8 ${cat.iconColor}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900 tracking-tight">{cat.title}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-70">{cat.subtitle}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CategoryCards;
