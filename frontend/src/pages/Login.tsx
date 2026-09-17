import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Loader2, Check, Activity, Calendar, BarChart3, User, Stethoscope, Building2, ChevronRight, HeartPulse, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';

export const Login = () => {
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

      if (data.user.empresa_id) {
        localStorage.setItem('companyId', String(data.user.empresa_id));
      }
      if (data.user.profissional_id) {
        localStorage.setItem('profissionalId', String(data.user.profissional_id));
      }

      const redirectPath = location.state?.from;
      if (redirectPath) {
        navigate(redirectPath);
        return;
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
          navigate('/client/appointments');
        } else {
          navigate('/client/appointments');
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
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    {
      id: 'register-professional',
      icon: Stethoscope,
      label: 'Sou Profissional de Saúde',
      desc: 'Médico, fisioterapeuta, nutricionista...',
      path: '/register/professional',
      color: '#14b8a6',
      bg: 'rgba(20, 184, 166, 0.1)',
    },
    {
      id: 'register-company',
      icon: Building2,
      label: 'Sou Hospital / Clínica',
      desc: 'Cadastre sua instituição',
      path: '/register/company',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070c19] flex w-full font-sans antialiased text-slate-100 overflow-x-hidden">
      <div className="w-full flex flex-col lg:flex-row min-h-screen">

        {/* Painel Esquerdo - Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-1/2 relative bg-[#060b18] bg-login-grid px-6 py-8 lg:py-10 lg:pl-12 lg:pr-8 xl:pl-16 xl:pr-10 flex-col justify-between items-center overflow-hidden border-r border-slate-800/80 select-none">

          {/* Efeito de gradiente na borda divisória */}
          <div className="hidden lg:block absolute top-0 bottom-0 right-[-1px] w-[1px] bg-gradient-to-b from-transparent via-blue-500/30 to-transparent pointer-events-none" />

          {/* Luzes de fundo decorativas */}
          <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute bottom-10 right-0 w-[450px] h-[450px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/8 rounded-full blur-[100px] pointer-events-none" />

          {/* Container Centralizado de Todo o Conteúdo Esquerdo */}
          <div className="relative z-10 w-full max-w-xl xl:max-w-2xl flex flex-col justify-between h-full space-y-6 mx-auto text-center items-center">

            {/* Logo Superior Centralizado */}
            <div className="flex flex-col items-center justify-center gap-2 w-full text-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                  <HeartPulse className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  Owner<span className="text-blue-500 font-extrabold">Health</span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ambiente Seguro SSL</span>
              </div>
            </div>

            {/* Conteúdo Central */}
            <div className="space-y-6 my-auto py-2 w-full flex flex-col items-center text-center">
              {/* Tag Badge */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-800/40 text-blue-300 text-xs font-semibold backdrop-blur-md shadow-inner mx-auto">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Sistema de Gestão em Saúde</span>
              </div>

              {/* Título Principal */}
              <div className="space-y-3 text-center">
                <h1 className="font-serif-heading text-4xl xl:text-5xl 2xl:text-6xl font-normal text-slate-50 leading-[1.15] tracking-tight">
                  Saúde gerenciada<br />
                  <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-200 drop-shadow-sm">
                    com inteligência.
                  </span>
                </h1>
                <p className="text-slate-400 text-sm xl:text-base leading-relaxed max-w-lg font-normal pt-1 mx-auto text-center">
                  Acesse prontuários, agendamentos e relatórios clínicos em uma plataforma unificada projetada para alta performance em saúde.
                </p>
              </div>

              {/* Grid de Recursos (2x2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 w-full">
                <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 backdrop-blur-md hover:border-blue-500/40 hover:bg-[#131f3b]/70 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mb-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-slate-200 font-semibold text-sm">Acesso ao Prontuário</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Histórico clínico, evoluções e laudos integrados.</p>
                </div>

                <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 backdrop-blur-md hover:border-teal-500/40 hover:bg-[#131f3b]/70 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mb-2">
                    <Calendar className="w-5 h-5 text-teal-400" />
                  </div>
                  <h3 className="text-slate-200 font-semibold text-sm">Agenda & Telemedicina</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Consultas presenciais e online com lembretes.</p>
                </div>

                <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 backdrop-blur-md hover:border-indigo-500/40 hover:bg-[#131f3b]/70 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mb-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-slate-200 font-semibold text-sm">Dashboards Interativos</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Indicadores de atendimentos e produtividade.</p>
                </div>

                <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 backdrop-blur-md hover:border-purple-500/40 hover:bg-[#131f3b]/70 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mb-2">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-slate-200 font-semibold text-sm">Segurança & LGPD</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Criptografia e conformidade rigorosa.</p>
                </div>
              </div>
            </div>

            {/* Rodapé Esquerdo */}
            <div className="text-slate-500 text-xs font-medium space-y-1 w-full text-center">
              <p>© {new Date().getFullYear()} Owner Health. Todos os direitos reservados.</p>
              <p className="text-[11px] text-slate-500">
                Desenvolvido por{' '}
                <a
                  href="https://www.connectortech.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 font-semibold hover:text-blue-300 transition-colors hover:underline"
                >
                  ConnectorTech
                </a>
              </p>
            </div>

          </div>
        </div>

        {/* Painel Direito - Form de Login */}
        <div className="w-full lg:w-1/2 xl:w-1/2 bg-[#090e1a] flex flex-col justify-center items-center px-6 py-8 lg:py-10 lg:px-12 xl:px-16 relative overflow-y-auto">

          {/* Logo Mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Owner<span className="text-blue-500 font-extrabold">Health</span>
            </span>
          </div>

          <div className="max-w-[420px] xl:max-w-[440px] w-full mx-auto space-y-6 animate-fadeIn">

            {/* Cabeçalho do Form */}
            <div>
              <h2 className="font-serif-heading text-3xl lg:text-4xl text-white font-normal tracking-tight mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-slate-400 text-sm font-normal">
                Acesse sua conta para continuar
              </p>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium animate-shake flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form de Autenticação */}
            <form onSubmit={handleLogin} className="space-y-6">

              {/* E-mail */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  E-MAIL PROFISSIONAL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#11192e] border border-slate-800 text-slate-100 rounded-xl pl-11 pr-4 py-3.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    placeholder="dr.nome@clinica.com.br"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    SENHA
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#11192e] border border-slate-800 text-slate-100 rounded-xl pl-11 pr-11 py-3.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    id="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Checkbox Manter sessão */}
              <div className="flex items-center justify-between pt-1">
                <label
                  className="flex items-center space-x-3 cursor-pointer group select-none"
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  <div
                    className={`w-5 h-5 border rounded-md flex items-center justify-center transition-all ${rememberMe
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-[#11192e] border-slate-800 group-hover:border-slate-700'
                      }`}
                  >
                    <Check className={`w-3.5 h-3.5 stroke-[3] transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-slate-200 transition-colors">
                    Manter sessão iniciada
                  </span>
                </label>
              </div>

              {/* Botão Entrar na plataforma */}
              <button
                id="btn-login"
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform active:scale-[0.99] disabled:opacity-60 disabled:transform-none text-sm flex items-center justify-center cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2.5 h-5 w-5 text-white" />
                    Entrando...
                  </>
                ) : (
                  'Entrar na plataforma'
                )}
              </button>
            </form>

            {/* Cadastro / Solicitação de Acesso */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800/80" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Novo no Owner Health?
                </span>
                <div className="flex-1 h-px bg-slate-800/80" />
              </div>

              <div className="space-y-2.5">
                {registerOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      id={opt.id}
                      onClick={() => navigate(opt.path)}
                      className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border border-slate-800/80 bg-[#11192e] hover:bg-[#16203a] hover:border-slate-700 transition-all group cursor-pointer text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{ background: opt.bg }}
                      >
                        <Icon className="w-5 h-5" style={{ color: opt.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {opt.label}
                        </p>
                        <p className="text-xs text-slate-400 font-normal truncate">{opt.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
