import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CreditCard, User, Users, LogOut, Menu, X, HeartPulse, RefreshCw,
  FlaskConical, Pill, Scale, Activity, ClipboardList, Star, Crown, Shield, Calendar,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { API_URL } from '../config';
import { ProfileModal } from './ProfileModal';
import { NotificationBell } from './NotificationBell';

interface ClientLayoutProps { children: React.ReactNode; }

interface MenuItem { label: string; path: string; icon: React.ComponentType<{ className?: string }>; badge?: string; }
interface MenuGroup { title: string; items: MenuItem[]; }

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [planoPlataforma, setPlanoPlataforma] = useState('free');

  const activeProfileId = localStorage.getItem('activeProfileId');
  const activeProfileName = localStorage.getItem('activeProfileName') || 'Usuário';
  const activeProfileRole = localStorage.getItem('activeProfileRole') || 'client';
  const token = localStorage.getItem('token');

  const handleLogout = () => { localStorage.clear(); navigate('/client/login'); };
  const handleSwitchProfile = () => navigate('/client/profiles');

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        if (activeProfileRole === 'client' && activeProfileId && token) {
          const res = await fetch(`${API_URL}/api/clients/${activeProfileId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const client = await res.json();
          if (client && client.plano_plataforma) {
            setPlanoPlataforma(client.plano_plataforma);
            localStorage.setItem('plano_plataforma', client.plano_plataforma);
          } else if (client && client.plano_tipo) {
            setPlanoPlataforma(client.plano_tipo);
            localStorage.setItem('plano_plataforma', client.plano_tipo);
          }
        } else {
          const localPlan = localStorage.getItem('plano_plataforma') || 'free';
          setPlanoPlataforma(localPlan);
        }
      } catch (err) {
        console.error(err);
        const localPlan = localStorage.getItem('plano_plataforma') || 'free';
        setPlanoPlataforma(localPlan);
      }
    };
    fetchPlan();
  }, [location.pathname, activeProfileId, activeProfileRole, token]);

  const menuGroups: MenuGroup[] = [
    {
      title: 'Minha Saúde',
      items: [
        { label: 'Meus Agendamentos', path: '/client/appointments', icon: Calendar },
        { label: 'Carteirinha Digital', path: '/client/dashboard', icon: CreditCard },
        { label: 'Meus Dados', path: '/client/profile', icon: User },
        { label: 'Dependentes', path: '/client/dependents', icon: Users },
        { label: 'Meus Exames', path: '/client/exams', icon: FlaskConical },
        { label: 'Receitas', path: '/client/prescriptions', icon: Pill },
        { label: 'Medicamentos', path: '/client/medications', icon: Pill },
        { label: 'Bioimpedância', path: '/client/bioimpedance', icon: Scale },
        { label: 'Sintomas', path: '/client/symptoms', icon: Activity },
      ],
    },
    {
      title: 'Consultas',
      items: [
        { label: 'Agendar Consulta', path: '/client/scheduling', icon: Calendar },
        { label: 'Pré-Consulta (Anamnese)', path: '/client/anamnesis', icon: ClipboardList },
        { label: 'Avaliações', path: '/client/satisfaction', icon: Star },
      ],
    },
    {
      title: 'Plano & Conta',
      items: [
        { label: 'Meu Plano', path: '/client/plans', icon: Crown },
        { label: 'Privacidade (LGPD)', path: '/client/privacy', icon: Shield },
      ],
    },
    {
      title: 'Área Pro',
      items: [
        { label: 'Evolução de Saúde', path: '/client/evolution', icon: Activity, badge: 'PRO' },
        { label: 'Artigos de IA', path: '/client/articles', icon: ClipboardList, badge: 'PRO' },
      ],
    },
  ];

  const NavItem = ({ item, isCollapsed, onClick }: { item: MenuItem; isCollapsed?: boolean; onClick?: () => void }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    if (isCollapsed) {
      return (
        <button
          key={item.path}
          onClick={() => { navigate(item.path); onClick?.(); }}
          title={item.label}
          className={`w-11 h-11 mx-auto flex items-center justify-center rounded-2xl transition-all cursor-pointer relative group ${
            isActive
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105 font-bold'
              : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
          }`}
        >
          <Icon className="w-5 h-5 shrink-0" />
          {item.badge && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-900" />
          )}
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            {item.label}
          </span>
        </button>
      );
    }

    return (
      <button
        key={item.path}
        onClick={() => { navigate(item.path); onClick?.(); }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.badge && <span className="ml-auto text-[9px] font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full">{item.badge}</span>}
      </button>
    );
  };

  const SidebarContent = ({ isCollapsed, onNavigate }: { isCollapsed?: boolean; onNavigate?: () => void }) => (
    <>
      <nav className={`flex-1 min-h-0 overflow-y-auto ${isCollapsed ? 'py-4 space-y-3 px-2 flex flex-col items-center' : 'px-4 py-4 space-y-5'}`}>
        {menuGroups.map((group) => (
          <div key={group.title} className={isCollapsed ? 'w-full flex flex-col items-center space-y-2' : ''}>
            {!isCollapsed && (
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">{group.title}</p>
            )}
            <div className={isCollapsed ? 'space-y-2.5 w-full flex flex-col items-center' : 'space-y-1'}>
              {group.items.map(item => <NavItem key={item.path} item={item} isCollapsed={isCollapsed} onClick={onNavigate} />)}
            </div>
          </div>
        ))}
      </nav>

      {isCollapsed ? (
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col items-center gap-3 shrink-0">
          <button
            onClick={() => setProfileOpen(true)}
            title={activeProfileName}
            className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xs font-black text-white cursor-pointer hover:scale-105 transition"
          >
            {(activeProfileName[0] || 'U').toUpperCase()}
          </button>
          <button
            onClick={handleSwitchProfile}
            title="Alternar Perfil"
            className="w-10 h-10 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            title="Sair"
            className="w-10 h-10 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 flex items-center justify-center transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2 shrink-0">
          <button onClick={() => setProfileOpen(true)} className="w-full flex items-center gap-3 px-2 py-1.5 bg-slate-900/40 hover:bg-slate-800 transition rounded-lg border border-slate-800/60 mb-1 text-left cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-black text-white shrink-0">
              {(activeProfileName[0] || 'U').toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{activeProfileName}</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5 animate-pulse">
                {activeProfileRole === 'client' ? 'Titular' : 'Dependente'} • {planoPlataforma.toUpperCase()}
              </p>
            </div>
          </button>

          <button onClick={handleSwitchProfile}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all text-left cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /><span>Alternar Perfil</span>
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-left cursor-pointer">
            <LogOut className="w-3.5 h-3.5" /><span>Sair</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {profileOpen && <ProfileModal user={JSON.parse(localStorage.getItem('user') || '{}')} onClose={() => setProfileOpen(false)} tipoDisplay={activeProfileRole === 'client' ? 'Titular' : 'Dependente'} />}
      <div className="h-screen overflow-hidden bg-slate-50 flex flex-col md:flex-row font-sans">
        {/* Sidebar - Desktop */}
        <aside className={`hidden md:flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 transition-all duration-300 ${desktopMenuOpen ? 'w-64' : 'w-20'}`}>
          <div className={`h-16 flex items-center border-b border-slate-800 bg-slate-950 ${desktopMenuOpen ? 'px-6 gap-3 whitespace-nowrap' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600 shrink-0 shadow-md">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            {desktopMenuOpen && (
              <span className="font-black text-white tracking-wide text-md">Owner Health</span>
            )}
          </div>
          <div className={`flex-1 flex flex-col h-[calc(100vh-4rem)] ${desktopMenuOpen ? 'w-64' : 'w-20'}`}>
            <SidebarContent isCollapsed={!desktopMenuOpen} />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <button
                onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all cursor-pointer active:scale-95"
                title={desktopMenuOpen ? "Recolher menu" : "Expandir menu"}
              >
                {desktopMenuOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
              </button>
              <h1 className="text-md md:text-lg font-black text-slate-800 tracking-tight">Portal do Beneficiário</h1>
            </div>
            
            {/* Mobile Header Actions */}
            <div className="flex md:hidden items-center gap-3">
              <NotificationBell />
            </div>

            <div className="hidden md:flex items-center gap-4">
              <NotificationBell />
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <span className="text-xs font-semibold text-slate-500">Perfil ativo: </span>
                <span className="text-xs font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full capitalize">
                  {activeProfileName} ({activeProfileRole === 'client' ? 'Titular' : 'Dependente'})
                </span>
              </div>
            </div>
          </header>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-40 flex">
              <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileMenuOpen(false)} />
              <div className="relative flex flex-col w-72 bg-slate-900 text-slate-300 h-full animate-fadeIn">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <HeartPulse className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-black text-white text-md">Owner Health</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <NotificationBell />
                    <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          )}

          <main className="flex-1 overflow-auto p-4 md:p-8 relative">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
};
