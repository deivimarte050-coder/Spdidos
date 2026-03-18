import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Download } from 'lucide-react';

interface InstallTooltipProps {
  isVisible: boolean;
  onDismiss: () => void;
  onInstallClick: () => void;
}

/**
 * Floating tooltip that points to the Install App button
 */
export const InstallTooltip: React.FC<InstallTooltipProps> = ({ isVisible, onDismiss, onInstallClick }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-24 right-4 z-50 max-w-xs"
    >
      {/* Tooltip Box */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 space-y-3">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-5 h-5 text-blue-600 flex-shrink-0 animate-bounce" />
            <p className="font-bold text-gray-900 text-sm">Instala la app</p>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Instala la app para una mejor experiencia con notificaciones en tiempo real, acceso offline y más. 🚀
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onInstallClick}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
        >
          Instalar
        </button>
      </div>

      {/* Arrow pointing to button */}
      <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white drop-shadow-md" />
    </motion.div>
  );
};
