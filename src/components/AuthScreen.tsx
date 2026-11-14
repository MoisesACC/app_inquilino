import React, { useState } from 'react';
import { Home, ShieldCheck, Mail, Lock, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'google' | 'email_login' | 'email_signup'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con Google. Verifique la configuracion en Supabase.');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'email_signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: nombre.trim() || undefined,
            },
          },
        });
        if (error) throw error;
        setSuccessMsg('Cuenta creada correctamente. Ya puede iniciar sesion.');
        setMode('email_login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la autenticacion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-center items-center px-4 py-12 bg-zinc-50">
      <div className="max-w-md w-full space-y-6">
        {/* Identidad */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-zinc-900 text-white rounded-xl mx-auto flex items-center justify-center shadow-xs">
            <Home className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Control de Alquiler de Habitaciones
          </h1>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Plataforma administrativa y de autogestion para arrendamiento de 5 habitaciones.
          </p>
        </div>

        {/* Tarjeta de Acceso */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex border-b border-zinc-100 pb-3 gap-2">
            <button
              type="button"
              onClick={() => { setMode('google'); setErrorMsg(null); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === 'google'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => { setMode('email_login'); setErrorMsg(null); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === 'email_login' || mode === 'email_signup'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Correo / Clave
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 leading-relaxed">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 leading-relaxed">
              {successMsg}
            </div>
          )}

          {mode === 'google' ? (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                Inicie sesion con su cuenta personal de Gmail. No requiere contrasena adicional.
              </p>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl py-3 px-4 text-xs transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Conectando con Google...' : 'Ingresar con cuenta Google'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-3 text-xs">
              {mode === 'email_signup' && (
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan Perez Rodriguez"
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Correo electronico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 stroke-[1.75] text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-9 border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Contrasena
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 stroke-[1.75] text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    className="w-full pl-9 border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl py-2.5 px-4 text-xs transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 stroke-[1.75] animate-spin" />
                ) : mode === 'email_signup' ? (
                  <UserPlus className="w-4 h-4 stroke-[1.75]" />
                ) : (
                  <ArrowRight className="w-4 h-4 stroke-[1.75]" />
                )}
                <span>
                  {loading
                    ? 'Procesando...'
                    : mode === 'email_signup'
                    ? 'Registrar nueva cuenta'
                    : 'Ingresar'}
                </span>
              </button>

              <div className="pt-2 text-center">
                {mode === 'email_login' ? (
                  <button
                    type="button"
                    onClick={() => { setMode('email_signup'); setErrorMsg(null); }}
                    className="text-zinc-600 hover:text-zinc-900 text-xs"
                  >
                    No tiene cuenta? <span className="underline font-medium">Registrese aqui</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMode('email_login'); setErrorMsg(null); }}
                    className="text-zinc-600 hover:text-zinc-900 text-xs"
                  >
                    Ya tiene cuenta? <span className="underline font-medium">Inicie sesion</span>
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Proteccion de datos conforme a la Ley N° 29733 (Peru)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
