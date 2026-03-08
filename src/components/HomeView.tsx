import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Search } from 'lucide-react';
import CategoryCards from './CategoryCards';

interface HomeViewProps {
  children?: React.ReactNode;
}

const HomeView: React.FC<HomeViewProps> = ({ children }) => {
  return (
    <div className="pb-12">

      {/* ── Location bar (desktop only) ──────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between px-8 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-black uppercase tracking-widest text-gray-800">San Pedro de Macorís</span>
        </div>
        <Search className="w-5 h-5 text-gray-400 cursor-pointer hover:text-primary transition-colors" />
      </div>

      <div className="px-4 lg:px-8 space-y-6 pt-5">

        {/* ── Hero banner ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl lg:rounded-3xl"
          style={{ background: 'linear-gradient(120deg,#ff8c00 0%,#f97316 45%,#ea580c 100%)' }}
        >
          {/* Confetti dots */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full opacity-40"
                style={{
                  background: i % 3 === 0 ? '#fff' : i % 3 === 1 ? '#fde68a' : '#fed7aa',
                  top: `${10 + (i * 17) % 80}%`,
                  left: `${5 + (i * 13) % 55}%`,
                  transform: `rotate(${i * 30}deg)`,
                }}
              />
            ))}
          </div>

          {/* Text content */}
          <div className="relative z-10 px-6 py-7 lg:px-10 lg:py-10 max-w-[58%]">
            <p className="text-white text-lg lg:text-2xl font-bold leading-tight">
              <span className="font-black">¡Hace</span> hasta un
            </p>
            <p className="text-white font-black text-5xl lg:text-7xl leading-none tracking-tight">50% DCTO!</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-5 bg-amber-900/80 hover:bg-amber-950 text-white font-black px-7 py-3 rounded-full text-sm lg:text-base tracking-wide transition-colors shadow-lg"
            >
              PEDIR YA
            </motion.button>
          </div>

          {/* Food image */}
          <img
            src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=320&fit=crop&crop=center"
            alt="Comida"
            className="absolute right-0 top-0 h-full w-[45%] object-cover object-left"
            referrerPolicy="no-referrer"
          />
          {/* Left-side fade overlay so text stays readable */}
          <div
            className="absolute inset-y-0 right-[33%] w-20 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #f97316, transparent)' }}
          />
        </motion.div>

        {/* ── Category cards ────────────────────────────────────────────── */}
        <CategoryCards />

        {/* ── Business list (children) ──────────────────────────────────── */}
        {children}
      </div>
    </div>
  );
};

export default HomeView;
