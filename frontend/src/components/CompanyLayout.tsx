import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2, Users, Calendar, ClipboardList, Stethoscope, RefreshCw,
  LogOut, Menu, X, HeartPulse, Sparkles, ShieldAlert
} from 'lucide-react';
import { API_URL } from '../config';

interface CompanyLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const CompanyLayout: React.FC<CompanyLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState('Clínica');
  const [planoEmpresa, setPlanoEmpresa] = useState('enterprise');
  const [pago, setPago] = useState(false);

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : { email: '' };
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleSwitchRole = () => {
    if (user.roles && user.roles.length > 1) {
      // Alterna para outra role que não seja company, ou volta pro login para escolher
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        if (token && user.email) {
          const res = await fetch(`${API_URL}/api/companies`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const companies = await res.json();
          if (Array.isArray(companies)) {
            const currentCompany = companies.find(c => c.email.toLowerCase() === user.email.toLowerCase());
            if (currentCompany) {
              setCompanyName(currentCompany.nome_fantasia || currentCompany.razao_social);
              setPlanoEmpresa(currentCompany.plano_tipo || 'enterprise');
              setPago(!!currentCompany.pago);
              localStorage.setItem('companyId', String(currentCompany.id));
              localStorage.setItem('companyPaid', String(currentCompany.pago));
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados da empresa:', err);
      }
    };
    fetchCompanyData();
  }, [location.pathname, user.email, token]);

  
  const tipo = user.tipo_profissional || '';
  const isAdmin = tipo === 'admin' || tipo === '';
  const isAdministrativo = tipo === 'administrativo';
  const isMedico = tipo === 'medico';


  // Booleans de acesso por funcionalidade
  const canSeeGestao    = isAdmin || isAdministrativo;   // Profissionais + Planos de Saúde
  const canSeePlataforma = isAdmin;                       // Meu Plano & Licença (só admin master)
  const canSeePrescricoes = isAdmin || isMedico;          // Receitas & Atestados
  const canSeeAnamnesis  = isAdmin || isAdministrativo;  // Configurar Anamnese
  // Todos os perfis veem Painel, Agendas, Pacientes

  const menuGroups: MenuGroup[] = [
    {
      title: 'Gestão Clínica',
      items: [
        { label: 'Painel Geral', path: '/company/dashboard', icon: Building2 },
        ...(canSeeGestao ? [{ label: 'Profissionais', path: '/company/professionals', icon: Stethoscope }] : []),
        { label: 'Agendas', path: '/company/scheduling', icon: Calendar },
        ...(canSeeGestao ? [{ label: 'Planos de Saúde', path: '/company/health-plans', icon: ClipboardList }] : []),
      ],
    },
    {
      title: 'Atendimento',
      items: [
        { label: 'Pacientes / Clientes', path: '/company/patient-data', icon: Users },
        ...(canSeePrescricoes ? [{ label: 'Receitas & Atestados', path: '/company/prescriptions', icon: ClipboardList }] : []),
        ...(canSeeAnamnesis ? [{ label: 'Configurar Anamnese', path: '/company/anamnesis-config', icon: ClipboardList }] : []),
      ],
    },
    ...(canSeePlataforma ? [{
      title: 'Plataforma',
      items: [
        { label: 'Meu Plano & Licença', path: '/company/plans', icon: Sparkles },
      ],
    }] : []),
  ];

  const NavItem = ({ item, onClick }: { item: MenuItem; onClick?: () => void }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <button
        key={item.path}
        onClick={() => {
          navigate(item.path);
          onClick?.();
        }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
            : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="ml-auto text-[9px] font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <nav className="flex-1 px-4 py-4 space-y-5 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.path} item={item} onClick={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2 py-1.5 bg-slate-900/40 rounded-lg border border-slate-800/60 mb-1">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0">
            {(companyName[0] || 'C').toUpperCase()}
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-slate-200 truncate">{companyName}</p>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">
              Plano {planoEmpresa.toUpperCase()} • {pago ? 'Pago' : 'Pendente'}
            </p>
          </div>
        </div>

        {user.roles && user.roles.length > 1 && (
          <button
            onClick={handleSwitchRole}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all text-left cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Alternar Perfil</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-left cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair da Clínica</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-white tracking-wide text-md">Owner Health</span>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-md md:text-lg font-black text-slate-800 tracking-tight">Portal Corporativo</h1>
          </div>
          <div className="flex items-center gap-2">
            {!pago && (
              <span className="text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-600 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Licença Pendente de Pagamento</span>
              </span>
            )}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Clínica: </span>
              <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full capitalize">
                {companyName}
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
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <HeartPulse className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-black text-white text-md">Owner Health</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
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
  );
};
