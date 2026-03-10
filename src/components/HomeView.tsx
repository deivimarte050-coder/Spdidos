import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Search } from 'lucide-react';
import CategoryCards from './CategoryCards';

interface HomeViewProps {
  children?: React.ReactNode;
  onSelectCategory?: (categoryId: string) => void;
  announcement?: {
    topText: string;
    highlightText: string;
    ctaText: string;
    imageUrl: string;
  };
}

const fallbackAnnouncement = {
  topText: '¡Hace hasta un',
  highlightText: '50% DCTO!',
  ctaText: 'PEDIR YA',
  imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=320&fit=crop&crop=center',
};

const HomeView: React.FC<HomeViewProps> = ({ children, announcement, onSelectCategory }) => {
  const banner = announcement ?? fallbackAnnouncement;
  const hasCustomAnnouncementImage = !!banner.imageUrl && banner.imageUrl !== fallbackAnnouncement.imageUrl;
  const handleCategorySelect = (categoryId: string) => onSelectCategory?.(categoryId);

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
          className="relative overflow-hidden rounded-2xl lg:rounded-3xl h-[170px] sm:h-[190px] lg:h-[240px]"
          style={hasCustomAnnouncementImage
            ? { background: '#111827' }
            : { background: 'linear-gradient(120deg,#ff8c00 0%,#f97316 45%,#ea580c 100%)' }}
        >
          {hasCustomAnnouncementImage && (
            <motion.img
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              src={banner.imageUrl}
              alt="Anuncio"
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackAnnouncement.imageUrl;
              }}
            />
          )}

          {/* Confetti dots */}
          {!hasCustomAnnouncementImage && (
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
          )}

          {hasCustomAnnouncementImage && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/18 via-white/6 to-transparent pointer-events-none" />
          )}

          {/* Text content */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 h-full px-6 py-4 lg:px-10 lg:py-7 max-w-[58%] flex flex-col justify-center"
          >
            <div className="inline-block max-w-full rounded-2xl px-3 py-2 bg-white/22 border border-white/40 backdrop-blur-[1px] overflow-hidden">
            <p className="text-white text-base lg:text-2xl font-bold leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.35)] whitespace-nowrap overflow-hidden text-ellipsis">
              {banner.topText}
            </p>
            <p className="text-white font-black text-3xl sm:text-4xl lg:text-6xl leading-none tracking-tight [text-shadow:0_3px_12px_rgba(0,0,0,0.4)] whitespace-nowrap overflow-hidden text-ellipsis">{banner.highlightText}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-3 lg:mt-4 w-fit bg-amber-900/75 hover:bg-amber-950 text-white font-black px-5 lg:px-7 py-2.5 lg:py-3 rounded-full text-xs lg:text-base tracking-wide transition-colors shadow-lg [text-shadow:0_2px_8px_rgba(0,0,0,0.45)]"
            >
              {banner.ctaText}
            </motion.button>
          </motion.div>

          {!hasCustomAnnouncementImage && (
            <>
              {/* Food image */}
              <motion.img
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                src={banner.imageUrl}
                alt="Comida"
                className="absolute right-0 top-0 h-full w-[45%] object-cover object-left"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackAnnouncement.imageUrl;
                }}
              />
              {/* Left-side fade overlay so text stays readable */}
              <div
                className="absolute inset-y-0 right-[33%] w-20 pointer-events-none"
                style={{ background: 'linear-gradient(to right, #f97316, transparent)' }}
              />
            </>
          )}
        </motion.div>

        {/* ── Category cards ────────────────────────────────────────────── */}
        <CategoryCards onSelectCategory={handleCategorySelect} />

        {/* ── Business list (children) ──────────────────────────────────── */}
        {children}
      </div>
    </div>
  );
};

export default HomeView;
