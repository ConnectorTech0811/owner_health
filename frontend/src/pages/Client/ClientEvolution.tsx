import React, { useState } from 'react';
import { Activity, Lock, TrendingUp, Users, Heart, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ClientEvolution: React.FC = () => {
  const navigate = useNavigate();
  const userPlan = localStorage.getItem('plano_plataforma') || 'free';
  const isPro = userPlan === 'pro' || userPlan === 'prata';

  const [selectedProfile, setSelectedProfile] = useState('self'); // 'self' or 'dependent-1'
  const [selectedMetric, setSelectedMetric] = useState<'glicose' | 'colesterol' | 'peso'>('glicose');

  // Dados Simulados
  const dataSelf = {
    glicose: [
      { date: 'Jan', value: 92 },
      { date: 'Fev', value: 95 },
      { date: 'Mar', value: 110 }, // Pico
      { date: 'Abr', value: 104 },
      { date: 'Mai', value: 98 },
      { date: 'Jun', value: 95 }
    ],
    colesterol: [
      { date: 'Jan', value: 185 },
      { date: 'Fev', value: 190 },
      { date: 'Mar', value: 215 },
      { date: 'Abr', value: 210 },
      { date: 'Mai', value: 195 },
      { date: 'Jun', value: 180 }
    ],
    peso: [
      { date: 'Jan', value: 78.5 },
      { date: 'Fev', value: 78.0 },
      { date: 'Mar', value: 79.2 },
      { date: 'Abr', value: 78.8 },
      { date: 'Mai', value: 77.5 },
      { date: 'Jun', value: 76.2 }
    ]
  };

  const dataDependent = {
    glicose: [
      { date: 'Jan', value: 85 },
      { date: 'Fev', value: 88 },
      { date: 'Mar', value: 87 },
      { date: 'Abr', value: 92 },
      { date: 'Mai', value: 90 },
      { date: 'Jun', value: 86 }
    ],
    colesterol: [
      { date: 'Jan', value: 160 },
      { date: 'Fev', value: 165 },
      { date: 'Mar', value: 170 },
      { date: 'Abr', value: 168 },
      { date: 'Mai', value: 162 },
      { date: 'Jun', value: 155 }
    ],
    peso: [
      { date: 'Jan', value: 28.5 },
      { date: 'Fev', value: 29.0 },
      { date: 'Mar', value: 29.8 },
      { date: 'Abr', value: 30.2 },
      { date: 'Mai', value: 30.5 },
      { date: 'Jun', value: 31.0 }
    ]
  };

  const getActiveData = () => {
    const dataSet = selectedProfile === 'self' ? dataSelf : dataDependent;
    return dataSet[selectedMetric];
  };

  const metricUnits = {
    glicose: 'mg/dL',
    colesterol: 'mg/dL',
    peso: 'kg'
  };

  const metricDetails = {
    glicose: { title: 'Glicemia em Jejum', desc: 'Monitoramento dos níveis de açúcar no sangue', normal: 'Normal: 70 a 99 mg/dL' },
    colesterol: { title: 'Colesterol Total', desc: 'Níveis acumulados de LDL e HDL no organismo', normal: 'Normal: Abaixo de 200 mg/dL' },
    peso: { title: 'Massa Corporal (Peso)', desc: 'Evolução da balança integrada do beneficiário', normal: 'Calculado com base na bioimpedância' }
  };

  // Funções simples para renderizar o gráfico SVG dinamicamente
  const activeData = getActiveData();
  const maxVal = Math.max(...activeData.map(d => d.value)) * 1.15;
  const minVal = Math.min(...activeData.map(d => d.value)) * 0.85;

  const pointsString = activeData.map((d, i) => {
    const x = 50 + i * 110;
    // mapeia y de [minVal, maxVal] para [250, 50]
    const y = 250 - ((d.value - minVal) / (maxVal - minVal)) * 180;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6 animate-fadeIn font-sans relative">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Evolução de Exames</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Visualize gráficos históricos das suas taxas clínicas e acompanhe tendências ao longo do tempo</p>
        </div>
      </div>

      {!isPro ? (
        /* Bloqueio Premium (Free Plan Upgrade Hook) */
        <div className="relative min-h-[500px] rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm flex items-center justify-center p-8">
          {/* Fundo desfocado para simular o dashboard */}
          <div className="absolute inset-0 filter blur-md opacity-25 grid grid-cols-1 md:grid-cols-2 p-10 gap-8 pointer-events-none select-none">
            <div className="border border-slate-200 rounded-3xl p-6 space-y-4 bg-slate-50">
              <div className="h-6 w-1/3 bg-slate-300 rounded" />
              <div className="h-48 bg-slate-200 rounded-2xl" />
            </div>
            <div className="border border-slate-200 rounded-3xl p-6 space-y-4 bg-slate-50">
              <div className="h-6 w-1/4 bg-slate-300 rounded" />
              <div className="h-48 bg-slate-200 rounded-2xl" />
            </div>
          </div>

          {/* Card Flutuante de Bloqueio com Design Premium */}
          <div className="relative z-10 max-w-lg bg-white/95 backdrop-blur-md border border-slate-200/80 p-8 rounded-[2rem] text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 border border-amber-100 shadow-md">
              <Lock className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <span className="bg-amber-100 text-amber-900 border border-amber-200/40 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full">Recurso do Plano Pro</span>
              <h3 className="text-xl font-black text-slate-800 leading-tight pt-1">Histórico Clínico Gráfico</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Faça o upgrade da sua conta e libere gráficos de evolução de exames automatizados para você e todos os seus dependentes. Acompanhe taxas críticas de Glicemia, Colesterol e muito mais!
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/client/plans')}
                className="w-full py-3.5 rounded-2xl text-xs font-black text-white shadow-lg transition transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 4px 15px rgba(29,78,216,0.3)' }}
              >
                Fazer Upgrade da Minha Conta
              </button>
              <button
                onClick={() => navigate('/client/dashboard')}
                className="w-full py-3.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition border border-slate-200"
              >
                Voltar à Carteirinha
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tela de Evolução Liberada (Prata / Pro) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Seletores e Informações - Col 4 */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Configurar Gráfico</h3>

              <div className="space-y-3.5">
                {/* Seletor de Perfil */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Selecionar Paciente</label>
                  <select
                    value={selectedProfile}
                    onChange={e => setSelectedProfile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="self">Você (Titular)</option>
                    <option value="dep">Lucas Silva (Dependente)</option>
                  </select>
                </div>

                {/* Seletor de Métrica */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Métrica Analisada</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedMetric('glicose')}
                      className={`py-2 rounded-xl text-[10px] font-black border transition ${selectedMetric === 'glicose' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Glicose
                    </button>
                    <button
                      onClick={() => setSelectedMetric('colesterol')}
                      className={`py-2 rounded-xl text-[10px] font-black border transition ${selectedMetric === 'colesterol' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Colesterol
                    </button>
                    <button
                      onClick={() => setSelectedMetric('peso')}
                      className={`py-2 rounded-xl text-[10px] font-black border transition ${selectedMetric === 'peso' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Peso (kg)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações da Taxa Selecionada */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Sobre esta taxa</h4>
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-800">{metricDetails[selectedMetric].title}</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">{metricDetails[selectedMetric].desc}</p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-2 mt-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-[10.5px] text-slate-600 font-semibold">{metricDetails[selectedMetric].normal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico SVG interativo - Col 8 */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-black text-slate-800">Gráfico de Evolução (Últimos 6 meses)</h3>
                </div>
                <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">Interativo</span>
              </div>

              {/* SVG Chart */}
              <div className="relative w-full h-[280px]">
                <svg className="w-full h-full" viewBox="0 0 650 280">
                  {/* Grid Lines */}
                  <line x1="50" y1="50" x2="600" y2="50" stroke="#f1f5f9" strokeWidth="1.5" />
                  <line x1="50" y1="110" x2="600" y2="110" stroke="#f1f5f9" strokeWidth="1.5" />
                  <line x1="50" y1="170" x2="600" y2="170" stroke="#f1f5f9" strokeWidth="1.5" />
                  <line x1="50" y1="230" x2="600" y2="230" stroke="#e2e8f0" strokeWidth="2" />

                  {/* Y Axis Labels */}
                  <text x="15" y="55" fill="#94a3b8" fontSize="10" fontWeight="bold">{maxVal.toFixed(0)}</text>
                  <text x="15" y="145" fill="#94a3b8" fontSize="10" fontWeight="bold">{((maxVal+minVal)/2).toFixed(0)}</text>
                  <text x="15" y="235" fill="#94a3b8" fontSize="10" fontWeight="bold">{minVal.toFixed(0)}</text>

                  {/* Draw Line */}
                  <polyline
                    fill="none"
                    stroke="url(#chartGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsString}
                  />

                  {/* Points with Tooltips */}
                  {activeData.map((d, i) => {
                    const x = 50 + i * 110;
                    const y = 250 - ((d.value - minVal) / (maxVal - minVal)) * 180;
                    return (
                      <g key={i} className="group cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r="6"
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="transition hover:scale-125"
                        />
                        {/* Tooltip text always visible or on hover */}
                        <rect x={x - 20} y={y - 25} width="40" height="16" rx="4" fill="#1e293b" />
                        <text x={x} y={y - 14} fill="#ffffff" fontSize="9" fontWeight="black" textAnchor="middle">
                          {d.value}
                        </text>
                        {/* X axis labels */}
                        <text x={x} y="260" fill="#64748b" fontSize="10" fontWeight="black" textAnchor="middle">
                          {d.date}
                        </text>
                      </g>
                    );
                  })}

                  {/* Defs para Gradient do traçado */}
                  <defs>
                    <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-rose-500" /> Acompanhe regularmente para prevenir alterações críticas</span>
              <span className="text-slate-700 font-bold">Unidade: {metricUnits[selectedMetric]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
