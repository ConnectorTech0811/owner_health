import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, Calendar, ClipboardList,
  Stethoscope, LogOut, Menu, X, HeartPulse, FileText,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { ProfileModal } from './ProfileModal';

interface ProfessionalLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ProfessionalLayout: React.FC<ProfessionalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : {};
  const tipo = user.tipo_profissional || 'medico';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Menu items por tipo de profissional
  const buildMenu = (): MenuItem[] => {

    if (tipo === 'medico') {
      return [
        { label: 'Minha Agenda', path: '/professional/scheduling', icon: Calendar },
        { label: 'Pacientes', path: '/professional/patients', icon: Users },
        { label: 'Anamnese', path: '/professional/anamnesis', icon: ClipboardList },
        { label: 'Receitas & Atestados', path: '/professional/prescriptions', icon: FileText },
        { label: 'Planos de Saúde', path: '/professional/health-plans', icon: Stethoscope },
        { label: 'Meu Plano', path: '/professional/my-plan', icon: Stethoscope },
      ];
    }

    if (tipo === 'secretario') {
      return [
        { label: 'Agenda', path: '/professional/scheduling', icon: Calendar },
        { label: 'Pacientes', path: '/professional/patients', icon: Users },
      ];
    }

    if (tipo === 'administrativo') {
      return [
        { label: 'Profissionais', path: '/professional/team', icon: Stethoscope },
        { label: 'Agenda', path: '/professional/scheduling', icon: Calendar },
        { label: 'Pacientes', path: '/professional/patients', icon: Users },
        { label: 'Planos de Saúde', path: '/professional/health-plans', icon: ClipboardList },
        { label: 'Anamnese', path: '/professional/anamnesis', icon: ClipboardList },
      ];
    }

    // default
    return [
      { label: 'Agenda', path: '/professional/scheduling', icon: Calendar },
    ];
  };

  const menuItems = buildMenu();

  const roleLabelMap: Record<string, string> = {
    medico: 'Médico',
    secretario: 'Secretário(a)',
    administrativo: 'Administrativo',
  };

  const NavItem = ({ item, onClick }: { item: MenuItem; onClick?: () => void }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <button
        key={item.path}
        onClick={() => { navigate(item.path); onClick?.(); }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
            : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <nav className="flex-1 min-h-0 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavItem key={item.path} item={item} onClick={onNavigate} />
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2 shrink-0">
        <button onClick={() => setProfileOpen(true)} className="w-full flex items-center gap-3 px-2 py-1.5 bg-slate-900/40 hover:bg-slate-800 transition rounded-lg border border-slate-800/60 mb-1 text-left cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0">
            {(user.name?.[0] || user.email?.[0] || 'P').toUpperCase()}
          </div>
          <div className="truncate flex-1">
            <p className="text-xs font-bold text-slate-200 truncate">{user.name || user.email}</p>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">
              {roleLabelMap[tipo] || tipo}
            </p>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-left cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
      <div className="h-screen overflow-hidden bg-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 transition-all duration-300 ${desktopMenuOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-r-0 overflow-hidden'}`}>
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950 whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600 shrink-0">
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
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all cursor-pointer active:scale-95"
              title={desktopMenuOpen ? "Recolher menu" : "Expandir menu"}
            >
              {desktopMenuOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <h1 className="text-md md:text-lg font-black text-slate-800 tracking-tight">Portal Profissional</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Perfil: </span>
            <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full capitalize">
              {roleLabelMap[tipo] || tipo}
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
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
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

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
    </>
  );
};
