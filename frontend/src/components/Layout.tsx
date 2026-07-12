import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Stethoscope,
  ClipboardList,
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
  UserCheck,
  HeartPulse,
  History, 
  Settings
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  // Obter usuário e perfil ativo do localStorage
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : { name: 'Usuário', email: '', roles: ['client'] };
  const activeRole = localStorage.getItem('activeRole') || user.roles[0];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
    navigate('/login');
  };

  React.useEffect(() => {
    if (activeRole === 'client' || activeRole === 'dependent') {
      navigate('/client/dashboard');
    } else if (activeRole === 'company') {
      navigate('/company/dashboard');
    } else if (activeRole === 'professional') {
      navigate('/professional/scheduling');
    }
  }, [activeRole, navigate]);

  const handleRoleChange = (role: string) => {
    localStorage.setItem('activeRole', role);
    setRoleMenuOpen(false);
    if (role === 'client' || role === 'dependent') {
      navigate('/client/dashboard');
    } else if (role === 'company') {
      navigate('/company/dashboard');
    } else if (role === 'professional') {
      navigate('/professional/scheduling');
    } else {
      navigate('/dashboard');
    }
    window.location.reload(); // Recarregar para re-renderizar menus e dashboards
  };

  // Mapear role para nome de exibição no cabeçalho
  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Owner Health Admin';
      case 'company':
        return 'Owner Health Empresa';
      case 'client':
        return 'Owner Health Cliente';
      case 'professional':
        return 'Owner Health Profissional';
      case 'dependent':
        return 'Owner Health Dependente';
      default:
        return 'Owner Health';
    }
  };

  // Definir links do menu lateral com base no perfil ativo
  const menuItems = [];

  if (activeRole === 'admin') {
    menuItems.push(
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Clientes', path: '/clients', icon: Users },
      { label: 'Empresas / Clínicas', path: '/companies', icon: Building2 },
      { label: 'Profissionais', path: '/professionals', icon: Stethoscope },
      { label: 'Planos de Saúde', path: '/health-plans', icon: ClipboardList },
      { label: 'Usuários Sistema', path: '/users', icon: UserCheck },
      { label: 'Auditoria', path: '/audit-logs', icon: History },
      { label: 'Configurações', path: '/settings', icon: Settings }
    );
  } else if (activeRole === 'company') {
    menuItems.push(
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Meus Profissionais', path: '/professionals', icon: Stethoscope },
      { label: 'Planos Atendidos', path: '/health-plans', icon: ClipboardList }
    );
  } else if (activeRole === 'client') {
    menuItems.push(
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Meus Dependentes', path: '/dependents', icon: Users }
    );
  } else if (activeRole === 'professional') {
    menuItems.push(
      { label: 'Dashboard', path: '/professional/dashboard', icon: LayoutDashboard },
      { label: 'Minhas Clínicas', path: '/companies', icon: Building2 },
      { label: 'Planos Atendidos', path: '/health-plans', icon: ClipboardList }
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Lateral - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-600">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-white tracking-wide text-md">Owner Health</span>
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/10'
                    : 'hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Superior */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm">
          {/* Lado Esquerdo: Toggle Mobile + Título Dinâmico */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Título com Seletor se possuir Multi-Role */}
            <div className="relative flex items-center gap-2">
              <h1 className="text-md md:text-lg font-black text-slate-800 tracking-tight">
                {getRoleTitle(activeRole)}
              </h1>
              
              {user.roles && user.roles.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all"
                  >
                    <span>Alternar Perfil</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {roleMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setRoleMenuOpen(false)} />
                      <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 animate-fadeIn">
                        <p className="text-[10px] font-bold text-slate-400 px-3.5 py-1.5 uppercase tracking-wider">Seus Acessos</p>
                        {user.roles.map((role: string) => {
                          const isCurrent = role === activeRole;
                          return (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(role)}
                              className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                                isCurrent
                                  ? 'bg-primary-50 text-primary-600 font-bold'
                                  : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <span>{getRoleTitle(role).replace('Owner Health ', '')}</span>
                              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: Nome e logout rápido (desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">
              Sessão como: <span className="text-slate-800 font-bold capitalize">{activeRole === 'company' ? 'Empresa' : activeRole === 'client' ? 'Cliente' : activeRole === 'professional' ? 'Profissional' : activeRole}</span>
            </span>
          </div>
        </header>

        {/* Mobile Sidebar - Menu Gaveta */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Overlay */}
            <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileMenuOpen(false)} />

            {/* Menu */}
            <div className="relative flex flex-col w-64 bg-slate-900 text-slate-300 h-full p-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                    <HeartPulse className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-black text-white text-md">Owner Health</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive ? 'bg-primary-600 text-white' : 'hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-800 mt-auto flex flex-col gap-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo Dinâmico da Rota */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
