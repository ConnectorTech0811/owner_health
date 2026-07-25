import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, HeartPulse, Plus, UserPlus, Loader2, X } from 'lucide-react';
import { API_URL } from '../../config';

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

  // Modal de Adicionar Dependente
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [depForm, setDepForm] = useState({
    nome: '',
    cpf: '',
    data_nascimento: '',
    parentesco: 'Filho(a)'
  });

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!user) {
      navigate('/client/login');
      return;
    }
    loadProfiles();
  }, [navigate]);

  const loadProfiles = async () => {
    try {
      const initialProfiles: Profile[] = user.profiles || [];
      const titularId = initialProfiles.find(p => p.role === 'client')?.id || user.cliente_id || user.id;

      if (titularId && token) {
        const res = await fetch(`${API_URL}/api/clients/${titularId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const clientData = await res.json();
        
        if (clientData && clientData.id) {
          const updatedProfiles: Profile[] = [
            {
              id: clientData.id,
              nome: clientData.nome,
              role: 'client',
              avatar_color: '#3b82f6'
            }
          ];

          if (Array.isArray(clientData.dependentes)) {
            clientData.dependentes.forEach((dep: any) => {
              updatedProfiles.push({
                id: dep.id,
                nome: dep.nome,
                role: 'dependent',
                avatar_color: '#0d9488'
              });
            });
          }

          setProfiles(updatedProfiles);
          user.profiles = updatedProfiles;
          localStorage.setItem('user', JSON.stringify(user));
        }
      } else {
        setProfiles(initialProfiles);
      }
    } catch (e) {
      console.error('Erro ao carregar perfis:', e);
      if (user.profiles) setProfiles(user.profiles);
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    localStorage.setItem('activeProfileId', String(profile.id));
    localStorage.setItem('activeProfileName', profile.nome);
    localStorage.setItem('activeProfileRole', profile.role);
    localStorage.setItem('activeRole', profile.role === 'client' ? 'client' : 'dependent');
    
    const from = location.state?.from || '/client/dashboard';
    navigate(from);
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depForm.nome || !depForm.cpf || !depForm.data_nascimento) {
      setAddError('Preencha os campos obrigatórios (Nome, CPF e Data de Nascimento)');
      return;
    }

    const titularProfile = profiles.find(p => p.role === 'client');
    const titularId = titularProfile ? titularProfile.id : (user.cliente_id || user.id);

    setAdding(true);
    setAddError('');

    try {
      const res = await fetch(`${API_URL}/api/clients/${titularId}/dependents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: depForm.nome,
          cpf: depForm.cpf,
          data_nascimento: depForm.data_nascimento,
          endereco: 'Mesmo do Titular'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar dependente');

      setShowAddModal(false);
      setDepForm({ nome: '', cpf: '', data_nascimento: '', parentesco: 'Filho(a)' });
      await loadProfiles();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
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
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-white text-base tracking-wider">Owner Health</span>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="flex-1 flex flex-col items-center justify-center my-10">
        <div className="text-center mb-10 max-w-lg">
          <h1 className="text-2xl md:text-4xl font-black text-slate-100 tracking-tight leading-tight">
            Quem está usando o portal hoje?
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-2">
            Selecione o seu perfil ou dependente para acessar suas carteirinhas digitais e agendamentos.
          </p>
        </div>

        {/* Profiles Grid */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 max-w-5xl">
          {profiles.map((profile) => (
            <button
              key={`${profile.role}-${profile.id}`}
              onClick={() => handleSelectProfile(profile)}
              className="flex flex-col items-center group cursor-pointer border-none bg-transparent outline-none focus:outline-none"
            >
              {/* Avatar Box */}
              <div 
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-extrabold text-white transition-all transform group-hover:scale-105 group-hover:ring-4 group-hover:ring-blue-500/50 border-2 border-slate-800 shadow-2xl relative overflow-hidden"
                style={{ backgroundColor: profile.avatar_color || '#3b82f6' }}
              >
                {getInitials(profile.nome)}
                
                {/* Micro animation overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Name */}
              <span className="mt-4 text-sm md:text-base font-bold text-slate-200 group-hover:text-white transition-colors text-center max-w-[150px] truncate">
                {profile.nome}
              </span>

              {/* Badge */}
              <span className={`mt-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                profile.role === 'client' 
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50' 
                  : 'bg-teal-900/60 text-teal-300 border border-teal-700/50'
              }`}>
                {profile.role === 'client' ? 'Titular' : 'Dependente'}
              </span>
            </button>
          ))}

          {/* Adicionar Dependente Card */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center group cursor-pointer border-none bg-transparent outline-none focus:outline-none"
          >
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:text-white bg-slate-900/80 hover:bg-slate-900 border-2 border-dashed border-slate-700 group-hover:border-blue-500 transition-all transform group-hover:scale-105 shadow-xl">
              <Plus className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="mt-4 text-xs md:text-sm font-bold text-slate-400 group-hover:text-blue-400 transition-colors">
              Adicionar Perfil
            </span>
            <span className="mt-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800">
              + Dependente
            </span>
          </button>
        </div>
      </main>

      {/* Modal de Adicionar Dependente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-800 shadow-2xl space-y-6 text-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Cadastrar Dependente</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 font-bold">
                ⚠️ {addError}
              </div>
            )}

            <form onSubmit={handleAddDependent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome Completo do Dependente *</label>
                <input
                  type="text" required
                  value={depForm.nome}
                  onChange={e => setDepForm({...depForm, nome: e.target.value})}
                  placeholder="Ex: Lucas Silva"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">CPF *</label>
                  <input
                    type="text" required
                    value={depForm.cpf}
                    onChange={e => setDepForm({...depForm, cpf: e.target.value.replace(/\D/g,'').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)})}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Data Nascimento *</label>
                  <input
                    type="date" required
                    min="1940-01-01"
                    max={new Date().toISOString().split('T')[0]}
                    value={depForm.data_nascimento}
                    onChange={e => setDepForm({...depForm, data_nascimento: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Grau de Parentesco</label>
                <select
                  value={depForm.parentesco}
                  onChange={e => setDepForm({...depForm, parentesco: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Filho(a)">Filho(a)</option>
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Pai/Mãe">Pai/Mãe</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar Dependente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
