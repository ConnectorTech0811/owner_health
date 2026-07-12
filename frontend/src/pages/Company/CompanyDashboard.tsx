import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Stethoscope, Calendar, ClipboardList, UserCheck, Clock
} from 'lucide-react';
import { API_URL } from '../../config';

export const CompanyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ professionals: 0, schedules: 0, plans: 0, consultations: 0 });
  const [loading, setLoading] = useState(true);
  

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        if (token && companyId) {
          const headers = { Authorization: `Bearer ${token}` };
          const [resP, resS, resC] = await Promise.all([
            fetch(`${API_URL}/api/professionals?companyId=${companyId}`, { headers }),
            fetch(`${API_URL}/api/companies/${companyId}/schedules`, { headers }),
            fetch(`${API_URL}/api/companies/${companyId}`, { headers })
          ]);

          const profs = await resP.json();
          const schedules = await resS.json();
          const company = await resC.json();

          setStats({
            professionals: Array.isArray(profs) ? profs.length : 0,
            schedules: Array.isArray(schedules) ? schedules.length : 0,
            plans: company.health_plans ? company.health_plans.length : 0,
            consultations: Array.isArray(schedules) ? schedules.filter((s: any) => s.status !== 'disponivel').length : 2
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token, companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }



  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-violet-900 text-white rounded-[2rem] p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10 bg-white blur-2xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-15 bg-indigo-500 blur-3xl" />
        
        <div className="relative z-10">
          <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 text-[10px] px-3.5 py-1.5 rounded-full uppercase tracking-wider font-extrabold">
            Licença Plano Empresa Ativa
          </span>
          <h2 className="text-3xl font-black mt-3">Painel de Gestão da Clínica</h2>
          <p className="text-indigo-100 text-sm mt-1 max-w-xl">
            Monitore a escala médica, credenciamentos de planos, consultas agendadas e acesse previsões de demanda inteligente.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl border border-white/10 relative z-10">
          <Clock className="w-5 h-5 text-indigo-300" />
          <div className="text-left">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Sistema Online</p>
            <p className="text-xs font-black">24/7 Automações Ativas</p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Profissionais Ativos', val: stats.professionals, desc: 'Médicos, secretários e admins', icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Agendas Criadas', val: stats.schedules, desc: 'Turnos e escalas cadastrados', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Consultas Confirmadas', val: stats.consultations, desc: 'Pacientes em atendimento', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Convênios Aceitos', val: stats.plans, desc: 'Operadoras credenciadas', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center ${item.color} shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{item.label}</p>
                <h3 className="text-2xl font-black text-slate-800 mt-0.5">{item.val}</h3>
                <p className="text-[10px] text-slate-400 font-semibold truncate mt-1">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ações Administrativas Rápidas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Atalhos Administrativos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/company/professionals')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Users className="w-4 h-4" />
            <span>Cadastrar Médicos/Funcionários</span>
          </button>
          <button
            onClick={() => navigate('/company/scheduling')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-violet-600/10"
          >
            <Calendar className="w-4 h-4" />
            <span>Configurar Nova Escala</span>
          </button>
          <button
            onClick={() => navigate('/company/patient-data')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Consultar Prontuário Paciente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
