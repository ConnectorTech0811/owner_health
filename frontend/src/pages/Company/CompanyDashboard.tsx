import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Stethoscope, Calendar, ClipboardList, Sparkles,
  TrendingUp, AlertTriangle, UserCheck, TrendingDown, Clock, ArrowUpRight
} from 'lucide-react';
import { API_URL } from '../../config';

export const CompanyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ professionals: 0, schedules: 0, plans: 0, consultations: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState('winter'); // winter, summer, spring_autumn

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  // Dados preditivos baseados na sazonalidade
  const PREDICTIONS: Record<string, {
    title: string;
    description: string;
    chartData: { day: string; value: number }[];
    absenteeismRisk: string;
    recommendation: string;
    demands: { specialty: string; percentage: number; trend: 'up' | 'down' }[];
  }> = {
    winter: {
      title: 'Predição de Inverno (Pico Respiratório)',
      description: 'Alta probabilidade de pico em queixas respiratórias, gripes e resfriados.',
      chartData: [
        { day: 'Seg', value: 85 }, { day: 'Ter', value: 92 }, { day: 'Qua', value: 98 },
        { day: 'Qui', value: 90 }, { day: 'Sex', value: 75 }, { day: 'Sáb', value: 45 }
      ],
      absenteeismRisk: 'Risco Moderado (12%): Maior propensão a faltas em consultas de pediatria nas manhãs de segunda-feira.',
      recommendation: 'Aumentar escala de Pediatria e Clínico Geral nas quartas-feiras (pico estimado em 98% da capacidade).',
      demands: [
        { specialty: 'Pediatria', percentage: 42, trend: 'up' },
        { specialty: 'Pneumologia', percentage: 28, trend: 'up' },
        { specialty: 'Dermatologia', percentage: 12, trend: 'down' }
      ]
    },
    summer: {
      title: 'Predição de Verão (Pico de Gastroenterites / Viroses)',
      description: 'Projeção de maior movimento em atendimentos de clínica geral, desidratação e dermatologia.',
      chartData: [
        { day: 'Seg', value: 95 }, { day: 'Ter', value: 80 }, { day: 'Qua', value: 75 },
        { day: 'Qui', value: 85 }, { day: 'Sex', value: 90 }, { day: 'Sáb', value: 60 }
      ],
      absenteeismRisk: 'Risco Alto (18%): Absenteísmo acentuado nas sextas-feiras à tarde em consultas eletivas.',
      recommendation: 'Reforçar equipe de atendimento de urgência/Clínico Geral na segunda-feira pela manhã e sexta-feira o dia todo.',
      demands: [
        { specialty: 'Clínico Geral', percentage: 50, trend: 'up' },
        { specialty: 'Dermatologia', percentage: 25, trend: 'up' },
        { specialty: 'Alergologia', percentage: 15, trend: 'up' }
      ]
    },
    spring_autumn: {
      title: 'Predição de Outono/Primavera (Sazonalidade Alérgica)',
      description: 'Tendência linear com flutuações em crises alérgicas, asma e rinite.',
      chartData: [
        { day: 'Seg', value: 70 }, { day: 'Ter', value: 75 }, { day: 'Qua', value: 80 },
        { day: 'Qui', value: 75 }, { day: 'Sex', value: 70 }, { day: 'Sáb', value: 30 }
      ],
      absenteeismRisk: 'Risco Baixo (5%): Alta taxa de presença devido ao clima ameno.',
      recommendation: 'Escala padrão ativa. Recomendado alocar mais horários de telemedicina para alergologia.',
      demands: [
        { specialty: 'Otorrinolaringologia', percentage: 35, trend: 'up' },
        { specialty: 'Clínico Geral', percentage: 30, trend: 'down' },
        { specialty: 'Pediatria', percentage: 20, trend: 'up' }
      ]
    }
  };

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

  const activePrediction = PREDICTIONS[selectedSeason];

  // Configurações para desenho do gráfico SVG responsivo
  const svgWidth = 500;
  const svgHeight = 200;
  const padding = 35;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;
  const maxValue = 100;

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

      {/* Predição de Agenda Widget */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Predição Inteligente de Demanda</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Análise baseada em sazonalidade histórica para prever carga de trabalho semanal.
            </p>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'winter', label: 'Inverno' },
              { id: 'summer', label: 'Verão' },
              { id: 'spring_autumn', label: 'Outono/Primavera' }
            ].map(season => (
              <button
                key={season.id}
                onClick={() => setSelectedSeason(season.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSeason === season.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {season.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gráfico SVG de Carga de Trabalho */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col items-center">
              <p className="text-xs font-bold text-slate-700 self-start mb-4">
                Capacidade Estimada de Ocupação da Agenda (%)
              </p>
              
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                {/* Linhas de Grade e Valores Y */}
                {[0, 25, 50, 75, 100].map((v, i) => {
                  const y = padding + chartHeight - (v / maxValue) * chartHeight;
                  return (
                    <g key={i} className="opacity-45">
                      <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                      <text x={padding - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400">{v}%</text>
                    </g>
                  );
                })}

                {/* Linha do Gráfico e Áreas de Gradiente */}
                <path
                  d={activePrediction.chartData.map((d, i) => {
                    const x = padding + (i / (activePrediction.chartData.length - 1)) * chartWidth;
                    const y = padding + chartHeight - (d.value / maxValue) * chartHeight;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Gradiente preenchido sob a linha */}
                <path
                  d={`${activePrediction.chartData.map((d, i) => {
                    const x = padding + (i / (activePrediction.chartData.length - 1)) * chartWidth;
                    const y = padding + chartHeight - (d.value / maxValue) * chartHeight;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')} L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`}
                  fill="url(#indigoGrad)"
                  opacity="0.15"
                />

                {/* Pontos sobre a linha */}
                {activePrediction.chartData.map((d, i) => {
                  const x = padding + (i / (activePrediction.chartData.length - 1)) * chartWidth;
                  const y = padding + chartHeight - (d.value / maxValue) * chartHeight;
                  return (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={x} cy={y} r="5" fill="#4f46e5" stroke="white" strokeWidth="2" />
                      <text x={x} y={y - 10} textAnchor="middle" className="text-[10px] font-black fill-indigo-600 bg-white">{d.value}%</text>
                      {/* Rótulos X (Dias) */}
                      <text x={x} y={padding + chartHeight + 16} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">{d.day}</text>
                    </g>
                  );
                })}

                {/* Definições para o Gradiente SVG */}
                <defs>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-900">{activePrediction.title}</p>
                  <p className="text-[11px] text-indigo-700 leading-relaxed mt-0.5">
                    {activePrediction.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Riscos de Absenteísmo e Alertas de Escala */}
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Risco de Absenteísmo</span>
              </h4>
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                {activePrediction.absenteeismRisk}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Recomendação de Escala</span>
              </h4>
              <p className="text-xs text-emerald-800 font-semibold leading-relaxed">
                {activePrediction.recommendation}
              </p>
            </div>

            {/* Demandas por Especialidade */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Especialidades mais Procuradas
              </h4>
              <div className="space-y-2.5">
                {activePrediction.demands.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{d.specialty}</span>
                    <div className="flex items-center gap-2 font-black text-xs">
                      <span className="text-slate-800">{d.percentage}%</span>
                      {d.trend === 'up' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
