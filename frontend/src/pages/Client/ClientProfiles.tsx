import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, HeartPulse } from 'lucide-react';

interface Profile {
  id: number;
  nome: string;
  role: 'client' | 'dependent';
  avatar_color: string;
}

export const ClientProfiles: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) {
      navigate('/client/login');
      return;
    }
    const user = JSON.parse(userRaw);
    setProfiles(user.profiles || []);
  }, [navigate]);

  const handleSelectProfile = (profile: Profile) => {
    localStorage.setItem('activeProfileId', String(profile.id));
    localStorage.setItem('activeProfileName', profile.nome);
    localStorage.setItem('activeProfileRole', profile.role);
    localStorage.setItem('activeRole', profile.role === 'client' ? 'client' : 'dependent');
    
    const from = location.state?.from || '/client/dashboard';
    navigate(from);
  };

  const handleExit = () => {
    localStorage.clear();
    navigate('/client/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12 font-sans select-none animate-fadeIn">
      {/* Header */}
      <header className="flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-white text-md tracking-wider">Owner Health</span>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="flex-1 flex flex-col items-center justify-center my-12">
        <div className="text-center mb-10 max-w-lg">
          <h1 className="text-2xl md:text-4xl font-black text-slate-100 tracking-tight leading-tight">
            Quem está usando o portal hoje?
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-2">
            Selecione o seu perfil para acessar suas carteirinhas digitais e plano de saúde.
          </p>
        </div>

        {/* Profiles Grid */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 max-w-4xl">
          {profiles.map((profile) => (
            <button
              key={`${profile.role}-${profile.id}`}
              onClick={() => handleSelectProfile(profile)}
              className="flex flex-col items-center group cursor-pointer border-none bg-transparent outline-none focus:outline-none"
            >
              {/* Avatar Box */}
              <div 
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-extrabold text-white transition-all transform group-hover:scale-105 group-hover:ring-4 group-hover:ring-white border-2 border-slate-800 shadow-xl relative overflow-hidden"
                style={{ backgroundColor: profile.avatar_color || '#3b82f6' }}
              >
                {getInitials(profile.nome)}
                
                {/* Micro animation overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Name */}
              <span className="mt-4 text-sm md:text-base font-bold text-slate-300 group-hover:text-white transition-colors text-center max-w-[150px] truncate">
                {profile.nome}
              </span>

              {/* Badge */}
              <span className={`mt-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                profile.role === 'client' 
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-800/40' 
                  : 'bg-teal-900/50 text-teal-300 border border-teal-800/40'
              }`}>
                {profile.role === 'client' ? 'Titular' : 'Dependente'}
              </span>
            </button>
          ))}
        </div>
      </main>

      {/* Footer / Manage Profiles */}
      <footer className="flex flex-col items-center gap-4 max-w-7xl mx-auto w-full">
        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-900 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">
          Owner Health © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
