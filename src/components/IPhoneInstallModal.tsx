import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, MessageCircle, Check } from 'lucide-react';

interface IPhoneInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal with step-by-step instructions for iPhone Safari installation
 */
export const IPhoneInstallModal: React.FC<IPhoneInstallModalProps> = ({ isOpen, onClose }) => {
  const steps = [
    {
      number: 1,
      title: 'Presiona el botón Compartir',
      description: 'Toca el icono de compartir (cuadrado con flecha) en la barra inferior de Safari',
      icon: Share2,
      svgContent: (
        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
          <rect x="20" y="20" width="60" height="60" rx="8" fill="#007AFF" fillOpacity="0.1" stroke="#007AFF" strokeWidth="2" />
          <line x1="50" y1="30" x2="50" y2="60" stroke="#007AFF" strokeWidth="2" />
          <polyline
            points="50,60 35,45 50,60 65,45"
            fill="none"
            stroke="#007AFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      number: 2,
      title: 'Selecciona "Añadir a pantalla de inicio"',
      description: 'Desplázate y busca la opción "Añadir a pantalla de inicio". Si no la ves, toca "Más"',
      icon: MessageCircle,
      svgContent: (
        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
          <rect x="15" y="15" width="70" height="70" rx="10" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="2" />
          <circle cx="50" cy="35" r="12" fill="#007AFF" />
          <path d="M 30 55 Q 30 48, 50 48 Q 70 48, 70 55" fill="#E5E7EB" />
          <text x="50" y="80" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#666">
            Añadir a pantalla
          </text>
        </svg>
      ),
    },
    {
      number: 3,
      title: 'Confirma y listo',
      description: 'Toca "Añadir" en la esquina superior derecha. La app aparecerá en tu pantalla de inicio',
      icon: Check,
      svgContent: (
        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="30" fill="#10B981" fillOpacity="0.1" stroke="#10B981" strokeWidth="2" />
          <path
            d="M 40 52 L 46 58 L 60 42"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-8 text-center">
              <h2 className="text-2xl font-black text-white mb-2">Instala en iPhone</h2>
              <p className="text-blue-100 text-sm">Sigue estos 3 pasos simples</p>
            </div>

            {/* Steps */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-3"
                >
                  {/* Step number badge */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm">{step.title}</h3>
                      <p className="text-xs text-gray-600 mt-0.5">{step.description}</p>
                    </div>
                  </div>

                  {/* Illustration */}
                  <div className="ml-11 h-24 rounded-2xl bg-gray-50 border border-gray-200 p-4 flex items-center justify-center">
                    {step.svgContent}
                  </div>

                  {/* Divider */}
                  {index < steps.length - 1 && <div className="ml-4 h-4 border-l-2 border-dashed border-gray-300" />}
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
