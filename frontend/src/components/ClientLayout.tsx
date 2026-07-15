import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CreditCard, User, Users, LogOut, Menu, X, HeartPulse, RefreshCw,
  FlaskConical, Pill, Scale, Activity, ClipboardList, Star, Crown, Shield, Calendar,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { API_URL } from '../config';
import { ProfileModal } from './ProfileModal';

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

  const NavItem = ({ item, onClick }: { item: MenuItem; onClick?: () => void }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
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

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <nav className="flex-1 min-h-0 px-4 py-4 space-y-5 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(item => <NavItem key={item.path} item={item} onClick={onNavigate} />)}
            </div>
          </div>
        ))}
      </nav>

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
    </>
  );

  return (
    <>
      {profileOpen && <ProfileModal user={JSON.parse(localStorage.getItem('user') || '{}')} onClose={() => setProfileOpen(false)} tipoDisplay={activeProfileRole === 'client' ? 'Titular' : 'Dependente'} />}
      <div className="h-screen overflow-hidden bg-slate-50 flex flex-col md:flex-row font-sans">
        {/* Sidebar - Desktop */}
        <aside className={`hidden md:flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 transition-all duration-300 ${desktopMenuOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-r-0 overflow-hidden'}`}>
          <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950 whitespace-nowrap">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 shrink-0">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white tracking-wide text-md">Owner Health</span>
          </div>
          <div className="flex-1 flex flex-col w-64 h-[calc(100vh-4rem)]">
            <SidebarContent />
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
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Perfil ativo: </span>
              <span className="text-xs font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full capitalize">
                {activeProfileName} ({activeProfileRole === 'client' ? 'Titular' : 'Dependente'})
              </span>
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
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-6 h-6" />
                  </button>
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
