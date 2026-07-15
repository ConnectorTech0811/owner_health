import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Loader2, HeartPulse, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import loginBg from '../../assets/login_bg.png';
import { API_URL } from '../../config';

export const ClientLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMsg = 'Falha na autenticação';
        let errorCode = '';
        try {
          const data = await response.json();
          errorMsg = data.error || errorMsg;
          errorCode = data.code || '';
        } catch {
          errorMsg = `Erro ${response.status}: ${response.statusText}`;
        }

        if (errorCode === 'USER_NOT_FOUND') {
          setError(errorMsg);
          setTimeout(() => {
            navigate('/register/client');
          }, 3000);
          return;
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      // Armazenar sessão
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Obter perfis de beneficiários da assinatura
      const profiles = data.user.profiles || [];
      
      if (profiles.length > 1) {
        // Redireciona para o seletor de perfis estilo streaming
        navigate('/client/profiles', { state: { from: location.state?.from } });
      } else if (profiles.length === 1) {
        // Apenas um perfil (o titular), entra direto
        const singleProfile = profiles[0];
        localStorage.setItem('activeProfileId', String(singleProfile.id));
        localStorage.setItem('activeProfileName', singleProfile.nome);
        localStorage.setItem('activeProfileRole', singleProfile.role);
        localStorage.setItem('activeRole', 'client'); // Padrão
        
        const from = location.state?.from || '/client/dashboard';
        navigate(from);
      } else {
        throw new Error('Nenhum perfil ativo associado a esta conta.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

        {/* Painel Esquerdo - Identidade Visual do Cliente (Azul Premium) */}
        <div className="hidden md:flex w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)' }}>
          <img
            src={loginBg}
            alt="Owner Health"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(30,58,138,0.95) 0%, rgba(29,78,216,0.3) 60%, transparent 100%)' }} />

          {/* Grafismo Linha ECG */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <svg viewBox="0 0 400 80" className="w-full" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="0,40 60,40 80,10 100,70 120,40 160,40 180,20 200,60 220,40 400,40" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full w-full p-10 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight">Owner Health</span>
                <p className="text-xs font-medium opacity-70">Área do Beneficiário</p>
              </div>
            </div>

            <div className="pb-6 text-center">
              <h2 className="text-4xl font-black mb-3 drop-shadow-md leading-tight">
                Seu Portal de<br />Saúde Pessoal
              </h2>
              <p className="text-sm leading-relaxed max-w-xs mx-auto font-medium opacity-80">
                Acesse sua carteirinha digital, gerencie seus dependentes e visualize seus planos de saúde cobertos.
              </p>
            </div>
          </div>
        </div>

        {/* Painel Direito - Formulário */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-10 lg:p-16 bg-white relative animate-fadeIn">
          
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-slate-800 font-sans">Owner Health</span>
          </div>

          <div className="mb-10 text-center">
            <div className="hidden md:flex w-16 h-16 rounded-2xl items-center justify-center mx-auto mb-5 shadow-lg" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              <HeartPulse className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight font-sans">Portal do Cliente</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium font-sans">Faça login com seu CPF ou e-mail cadastrado</p>
            <div className="w-12 h-1 mx-auto mt-4 rounded-full" style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)' }} />
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-xs font-bold animate-shake flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span className="font-sans leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-sans">E-mail ou CPF</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-semibold placeholder:text-slate-400 text-xs font-sans"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-sans">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-semibold placeholder:text-slate-400 text-xs font-sans"
                  placeholder="Sua senha de acesso"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label
                className="flex items-center space-x-2 cursor-pointer group"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div
                  className="w-4 h-4 border-2 rounded flex items-center justify-center transition-all"
                  style={{
                    background: rememberMe ? '#2563eb' : 'white',
                    borderColor: rememberMe ? '#2563eb' : '#cbd5e1',
                  }}
                >
                  <Check className={`w-3 h-3 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} />
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors font-sans">
                  Lembrar meus dados
                </span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs font-bold text-blue-600 transition-colors hover:underline font-sans"
              >
                Esqueceu a senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 mt-2 flex items-center justify-center disabled:opacity-70 disabled:transform-none text-xs cursor-pointer font-sans"
              style={{
                background: loading ? '#1d4ed8' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Carregando sua saúde...
                </>
              ) : 'Acessar Carteirinha'}
            </button>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors font-sans w-full py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100"
              >
                Sou Profissional ou Clínica (Ir para Portal Principal)
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 font-sans">Desenvolvido por</p>
            <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-all cursor-default bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-600">
                <HeartPulse className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight font-sans">Owner Health</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
