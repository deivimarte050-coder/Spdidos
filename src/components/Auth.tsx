import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bike, Store, ArrowRight, Mail, Lock, Phone, UserCircle } from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_URL } from '../constants';

const Auth: React.FC = () => {
  const { login, register, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!whatsapp || whatsapp.length < 10) {
          throw new Error('WhatsApp inválido');
        }
        await register({
          name,
          email,
          password,
          whatsapp,
          role: 'client' // Solo permitir registro como cliente
        });
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'No se pudo continuar con Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src={LOGO_URL} alt="Spdidos Logo" className="h-20 w-auto object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-4xl font-black font-display text-primary tracking-tight italic">
            Spdidos
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta de cliente'}
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-black/5 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-4 font-bold transition-all outline-none"
                      placeholder="Juan Pérez"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-4 font-bold transition-all outline-none"
                      placeholder="8091234567"
                    />
                  </div>
                  <p className="text-xs text-amber-700 font-semibold ml-1">
                    Por favor, es importante que este sea tu número real de WhatsApp para futuros pedidos.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-4 font-bold transition-all outline-none"
                  placeholder="cliente@correo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-4 font-bold transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-red-600 font-bold text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Iniciar Sesión' : 'Registrarse como Cliente'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-bold tracking-wider">o continúa con</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full border border-gray-200 bg-white text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#EA4335" d="M9 7.364v3.486h4.844c-.213 1.12-.853 2.07-1.813 2.706l2.93 2.273C16.67 14.24 17.636 11.9 17.636 9c0-.55-.05-1.08-.142-1.636H9z" />
              <path fill="#34A853" d="M9 18c2.455 0 4.515-.813 6.02-2.17l-2.93-2.273c-.813.545-1.853.87-3.09.87-2.373 0-4.384-1.602-5.102-3.758H.87v2.361A9 9 0 0 0 9 18z" />
              <path fill="#4A90E2" d="M3.898 10.669A5.41 5.41 0 0 1 3.613 9c0-.58.102-1.142.285-1.669V4.97H.87A9 9 0 0 0 0 9c0 1.453.348 2.83.87 4.03l3.028-2.361z" />
              <path fill="#FBBC05" d="M9 3.573c1.335 0 2.535.46 3.477 1.364l2.608-2.608C13.511.89 11.45 0 9 0A9 9 0 0 0 .87 4.97l3.028 2.361C4.616 5.175 6.627 3.573 9 3.573z" />
            </svg>
            {loading ? 'Conectando...' : 'Continuar con Google'}
          </button>

          <div className="text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate como cliente' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
