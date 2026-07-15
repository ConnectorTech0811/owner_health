import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Loader2, Check, HeartPulse, User, Stethoscope, Building2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import loginBg from '../assets/login_bg.png';
import { API_URL } from '../config';

export const Login = () => {
  const navigate = useNavigate();
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_URL}/api/auth/authenticate`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = 'Falha na autenticação';
        try {
          const data = await response.json();
          errorMsg = data.error || errorMsg;
        } catch {
          errorMsg = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const roles = data.user.roles || [];
      const primaryRole = roles[0] || 'client';
      localStorage.setItem('activeRole', primaryRole);

      // Salva dados do profissional (médico, secretário, etc.)
      if (data.user.empresa_id) {
        localStorage.setItem('companyId', String(data.user.empresa_id));
      }
      if (data.user.profissional_id) {
        localStorage.setItem('profissionalId', String(data.user.profissional_id));
      }

      if (primaryRole === 'client' || primaryRole === 'dependent') {
        const profiles = data.user.profiles || [];
        if (profiles.length > 1) {
          navigate('/client/profiles');
        } else if (profiles.length === 1) {
          const singleProfile = profiles[0];
          localStorage.setItem('activeProfileId', String(singleProfile.id));
          localStorage.setItem('activeProfileName', singleProfile.nome);
          localStorage.setItem('activeProfileRole', singleProfile.role);
          localStorage.setItem('activeRole', singleProfile.role === 'client' ? 'client' : 'dependent');
          navigate('/client/dashboard');
        } else {
          navigate('/client/dashboard');
        }
      } else if (primaryRole === 'professional') {
        navigate('/professional/scheduling');
      } else if (primaryRole === 'company') {
        navigate('/company/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Tempo de conexão esgotado. O servidor está demorando muito para responder.');
        } else {
          setError(err.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const registerOptions = [
    {
      id: 'register-client',
      icon: User,
      label: 'Sou Paciente / Cliente',
      desc: 'Cadastre seu perfil pessoal',
      path: '/register/client',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      id: 'register-professional',
      icon: Stethoscope,
      label: 'Sou Profissional de Saúde',
      desc: 'Médico, fisioterapeuta, nutricionista...',
      path: '/register/professional',
      color: '#0d9488',
      bg: '#f0fdfa',
    },
    {
      id: 'register-company',
      icon: Building2,
      label: 'Sou Hospital / Clínica',
      desc: 'Cadastre sua instituição',
      path: '/register/company',
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row md:h-[700px] min-h-[500px] relative z-10">

        {/* Left Panel - Brand */}
        <div className="hidden md:flex w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)' }}>
          <img
            src={loginBg}
            alt="Owner Health"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(30,58,138,0.95) 0%, rgba(29,78,216,0.3) 60%, transparent 100%)' }} />

          {/* Decorative circles */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />
          <div className="absolute top-1/3 -right-20 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />

          {/* ECG Line SVG decoration */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <svg viewBox="0 0 400 80" className="w-full" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="0,40 60,40 80,10 100,70 120,40 160,40 180,20 200,60 220,40 400,40" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between h-full w-full p-10 text-white">
            {/* Logo top */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight">Owner Health</span>
                <p className="text-xs font-medium opacity-70">Sistema de Gestão Clínica</p>
              </div>
            </div>

            {/* Bottom text */}
            <div className="pb-6 text-center">
              <h2 className="text-4xl font-black mb-3 drop-shadow-md leading-tight">
                Bem-vindo de<br />volta!
              </h2>
              <p className="text-sm leading-relaxed max-w-xs mx-auto font-medium opacity-80">
                Acesse o painel do Owner Health para gerenciar pré-atendimentos e otimizar o fluxo da sua clínica.
              </p>

              {/* Stats row */}
              <div className="flex justify-center gap-6 mt-6">
                <div className="text-center">
                  <p className="text-2xl font-black">98%</p>
                  <p className="text-xs opacity-70 font-medium">Satisfação</p>
                </div>
                <div className="w-px bg-white opacity-20" />
                <div className="text-center">
                  <p className="text-2xl font-black">+500</p>
                  <p className="text-xs opacity-70 font-medium">Clínicas</p>
                </div>
                <div className="w-px bg-white opacity-20" />
                <div className="text-center">
                  <p className="text-2xl font-black">24/7</p>
                  <p className="text-xs opacity-70 font-medium">Suporte</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="w-full md:w-1/2 flex flex-col p-6 lg:p-8 bg-white relative animate-fadeIn overflow-y-auto">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-slate-800">Owner Health</span>
          </div>

          <div className="mb-4 text-center">
            {/* Desktop icon */}
            <div className="hidden md:flex w-12 h-12 rounded-xl items-center justify-center mx-auto mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Entrar</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Acesse sua conta para continuar</p>
            <div className="w-12 h-1 mx-auto mt-3 rounded-full" style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)' }} />
          </div>

          <form className="space-y-3.5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold animate-shake flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:bg-white transition-all font-medium placeholder:text-slate-400 text-xs"
                  style={{ '--tw-ring-color': '#1d4ed8' } as React.CSSProperties}
                  onFocus={e => e.currentTarget.style.borderColor = '#1d4ed8'}
                  onBlur={e => e.currentTarget.style.borderColor = ''}
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:bg-white transition-all font-medium placeholder:text-slate-400 text-xs"
                  style={{ '--tw-ring-color': '#1d4ed8' } as React.CSSProperties}
                  onFocus={e => e.currentTarget.style.borderColor = '#1d4ed8'}
                  onBlur={e => e.currentTarget.style.borderColor = ''}
                  placeholder="sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-teal-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label
                className="flex items-center space-x-2 cursor-pointer group"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div
                  className="w-5 h-5 border-2 rounded flex items-center justify-center transition-all"
                  style={{
                    background: rememberMe ? '#2563eb' : 'white',
                    borderColor: rememberMe ? '#2563eb' : '#cbd5e1',
                  }}
                >
                  <Check className={`w-3.5 h-3.5 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} />
                </div>
                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">
                  Lembrar-me
                </span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-bold transition-colors hover:underline"
                style={{ color: '#2563eb' }}
              >
                Esqueceu a senha?
              </button>
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 mt-1 flex items-center justify-center disabled:opacity-70 disabled:transform-none text-xs"
              style={{
                background: loading
                  ? '#1d4ed8'
                  : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
              }}
              onMouseEnter={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(37, 99, 235, 0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(37, 99, 235, 0.35)';
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Autenticando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          {/* ── Seção de Cadastro ──────────────────────────────────────── */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Novo no Owner Health?</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="space-y-2.5">
              {registerOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    id={opt.id}
                    onClick={() => navigate(opt.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-white transition-all group text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: opt.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: opt.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{opt.label}</p>
                      <p className="text-xs text-slate-400 font-medium truncate">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Desenvolvido por</p>
            <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-all cursor-default bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                <HeartPulse className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Owner Health</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
