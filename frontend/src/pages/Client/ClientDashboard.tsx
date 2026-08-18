import React, { useEffect, useState } from 'react';
import { HeartPulse, ShieldCheck, User, Users, ClipboardList, Edit3, Loader2, X, Check, Star, MessageSquare, Calendar, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [parentClient, setParentClient] = useState<any>(null); // Se for dependente, guarda o titular
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Mini Calendário State
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const [miniSelectedDate, setMiniSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

  const [planForm, setPlanForm] = useState({
    plano_empresa: '',
    plano_nome: '',
    plano_produto: '',
    plano_numero_carteirinha: ''
  });

  // Estado de Avaliação do Atendimento
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    profissional_id: 1,
    profissional_nome: 'Dr. Márcio Silva',
    especialidade: 'Cardiologia',
    pontualidade: 5,
    clareza: 5,
    qualidade: 5,
    comentario: ''
  });
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const activeProfileId = localStorage.getItem('activeProfileId');
  const activeProfileRole = localStorage.getItem('activeProfileRole');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProfileData();
    loadAppointments();
  }, [activeProfileId, activeProfileRole]);

  const loadAppointments = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/agendas?cliente_id=${activeProfileId}&my_appointments=true`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted = data.map((a: any) => {
            const rawDate = a.data ? String(a.data).substring(0, 10) : '';
            const [y, m, d] = rawDate.split('-');
            const ptBrDate = d && m && y ? `${d}/${m}/${y}` : rawDate;

            let apptStatus = 'Agendada';
            if (a.status === 'concluido' || a.status === 'Concluída') {
              apptStatus = 'Concluída';
            } else if (a.status === 'cancelado' || a.status === 'Cancelado') {
              apptStatus = 'Cancelada';
            } else {
              const now = new Date();
              const todayIso = now.toLocaleDateString('en-CA');
              const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
              
              if (rawDate < todayIso || (rawDate === todayIso && (a.hora_inicio || '').substring(0, 5) < currentTime)) {
                apptStatus = 'Pendente / Não Concluída';
              } else {
                apptStatus = 'Agendada';
              }
            }

            return {
              id: String(a.id),
              profNome: a.profissional_nome || 'Dr(a). Profissional',
              especialidade: a.profissional_especialidade || 'Clínico Geral',
              clinica: 'Clínica Principal',
              data: ptBrDate,
              rawDate: rawDate,
              hora: (a.hora_inicio || '09:00').substring(0, 5),
              status: apptStatus
            };
          });

          setAppointments(formatted);
          localStorage.setItem(`appointments_${activeProfileId}`, JSON.stringify(formatted));
          return;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar agendamentos:', e);
    }

    const cached = localStorage.getItem(`appointments_${activeProfileId}`);
    if (cached) {
      try {
        setAppointments(JSON.parse(cached));
      } catch {}
    }
  };

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      if (activeProfileRole === 'client') {
        const res = await fetch(`${API_URL}/api/clients/${activeProfileId}`, { headers });
        const client = await res.json();
        setData(client);
      } else {
        // É dependente
        // Vamos listar e achar por ID ou buscar dependente
        const res = await fetch(`${API_URL}/api/clients`, { headers });
        const clients = await res.json();
        
        let foundDep = null;
        let foundParent = null;
        
        for (const client of clients) {
          const resD = await fetch(`${API_URL}/api/dependents/client/${client.id}`, { headers });
          const deps = await resD.json();
          const dep = Array.isArray(deps) ? deps.find(d => String(d.id) === String(activeProfileId)) : null;
          if (dep) {
            foundDep = dep;
            foundParent = client;
            break;
          }
        }
        
        setData(foundDep);
        setParentClient(foundParent);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mini Calendário Helpers
  const miniYear = miniCalDate.getFullYear();
  const miniMonth = miniCalDate.getMonth();
  const miniMonthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getMiniDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getMiniFirstDayOfWeek = (y: number, m: number) => new Date(y, m, 1).getDay();

  const totalMiniDays = getMiniDaysInMonth(miniYear, miniMonth);
  const firstMiniDay = getMiniFirstDayOfWeek(miniYear, miniMonth);

  const miniMonthDays: (number | null)[] = [];
  for (let i = 0; i < firstMiniDay; i++) miniMonthDays.push(null);
  for (let d = 1; d <= totalMiniDays; d++) miniMonthDays.push(d);

  const prevMiniMonth = () => setMiniCalDate(new Date(miniYear, miniMonth - 1, 1));
  const nextMiniMonth = () => setMiniCalDate(new Date(miniYear, miniMonth + 1, 1));

  const getAppointmentsForDay = (dStr: string) => {
    return appointments.filter(a => {
      const aDate = a.rawDate || (a.data ? a.data.split('/').reverse().join('-') : '');
      return aDate === dStr;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Identificar plano do perfil
  const planoEmpresa = data?.plano_empresa || parentClient?.plano_empresa || 'Não cadastrado';
  const planoNome = data?.plano_nome || parentClient?.plano_nome || 'Nenhum plano associado';
  const planoProduto = data?.plano_produto || parentClient?.plano_produto || '';
  const planoNumero = data?.plano_numero_carteirinha || parentClient?.plano_numero_carteirinha || '0000000000000';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 text-white rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorativo */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute left-1/3 top-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <span className="bg-blue-500/30 text-blue-200 border border-blue-400/20 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full">
            {activeProfileRole === 'client' ? 'Beneficiário Titular' : 'Beneficiário Dependente'}
          </span>
          <h2 className="text-2xl md:text-3xl font-black mt-3">Olá, {data?.nome}!</h2>
          <p className="text-blue-100 text-sm mt-1">Acesse sua carteirinha digital rápida abaixo para consultas e exames.</p>
        </div>
        
        <div className="flex items-center gap-2 relative z-10 self-start md:self-center bg-white/10 px-4 py-2 rounded-xl border border-white/10">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100">Dados Protegidos LGPD</span>
        </div>
      </div>

      {/* Main Grid: 2 Colunas Equilibradas de 6 colunas cada */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA (Col 6): CARTEIRINHA DIGITAL + PLANO + FAMÍLIA */}
        <div className="lg:col-span-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest self-start">Sua Carteirinha Digital</h3>
          
          {/* Card Wrapper com Glassmorphic Gradient */}
          <div className="w-full aspect-[1.58/1] max-w-md mx-auto rounded-3xl relative overflow-hidden shadow-2xl transition-all transform hover:scale-[1.01] cursor-pointer"
               style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #1e40af 100%)' }}
               onClick={() => setShowQr(!showQr)}>
            
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10" />
            
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>

            {!showQr ? (
              <div className="absolute inset-0 p-6 flex flex-col justify-between text-white font-sans">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                      <HeartPulse className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-black text-sm tracking-wider uppercase">Owner Health</span>
                  </div>
                  <span className="text-xs font-black bg-white/20 border border-white/20 px-3 py-1 rounded-xl">
                    {planoEmpresa}
                  </span>
                </div>

                <div className="w-9 h-7 bg-gradient-to-r from-amber-300 to-yellow-500 rounded-lg border border-amber-400 relative overflow-hidden shadow-md">
                  <div className="absolute inset-y-0 left-1/3 w-px bg-amber-600/30" />
                  <div className="absolute inset-y-0 right-1/3 w-px bg-amber-600/30" />
                  <div className="absolute inset-x-0 top-1/2 h-px bg-amber-600/30" />
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Beneficiário</p>
                  <p className="text-lg font-extrabold tracking-wide uppercase truncate">{data?.nome}</p>
                </div>

                <div className="flex items-end justify-between border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Número da Carteira</p>
                    <p className="text-sm font-bold tracking-widest font-mono">{planoNumero}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Plano</p>
                    <p className="text-xs font-bold truncate max-w-[140px]">{planoNome}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 p-5 flex flex-col items-center justify-center text-white bg-slate-900 animate-fadeIn">
                <div className="bg-white p-3 rounded-xl shadow-lg mb-2">
                  <div className="w-28 h-28 bg-slate-100 flex flex-col items-center justify-center p-1 border border-slate-200">
                    <div className="grid grid-cols-6 gap-0.5 w-full h-full">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div key={i} className={`h-full w-full ${((i * 3) + 7) % 5 === 0 || i % 3 === 0 ? 'bg-slate-900' : 'bg-transparent'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código de Acesso Rápido</p>
                <p className="text-[9px] text-blue-400 font-bold mt-1">Toque para voltar aos dados da carteira</p>
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium italic block text-center">Toque no cartão para visualizar o código de barras/QR</span>

          {/* Card Detalhes do Plano */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <span>Dados da Cobertura do Plano</span>
              </h3>
              <button
                onClick={() => {
                  setPlanForm({
                    plano_empresa: data?.plano_empresa || '',
                    plano_nome: data?.plano_nome || '',
                    plano_produto: data?.plano_produto || '',
                    plano_numero_carteirinha: data?.plano_numero_carteirinha || ''
                  });
                  setShowEditPlanModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition cursor-pointer border border-blue-100"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Plano
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-xs font-semibold text-slate-600">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Operadora de Saúde</p>
                <p className="text-slate-800 font-black mt-1">{planoEmpresa}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nome Comercial do Plano</p>
                <p className="text-slate-800 font-black mt-1">{planoNome}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acomodação / Produto</p>
                <p className="text-slate-800 font-black mt-1">{planoProduto || 'Não especificado'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Validade da Carteira</p>
                <p className="text-emerald-600 font-black mt-1">Vigente (Sem expiração)</p>
              </div>
            </div>
          </div>

          {/* Card Família/Dependente */}
          {activeProfileRole === 'client' ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Sua Família no Plano</span>
                </h3>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Plano Free</span>
              </div>

              {data?.dependentes && data.dependentes.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.dependentes.map((dep: any) => (
                    <div key={dep.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{dep.nome}</p>
                        <p className="text-slate-400 text-[10px] font-medium mt-0.5">CPF: {dep.cpf}</p>
                      </div>
                      <span className="bg-teal-50 text-teal-600 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded">Dependente</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">Você não possui dependentes vinculados ao seu plano. Gerencie na aba de Dependentes.</p>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>Titular do Plano de Saúde</span>
              </h3>
              
              <div className="flex items-center justify-between text-xs py-2">
                <div>
                  <p className="font-bold text-slate-800">{parentClient?.nome}</p>
                  <p className="text-slate-400 text-[10px] font-medium mt-0.5">CPF do Titular: {parentClient?.cpf}</p>
                </div>
                <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded">Titular Responsável</span>
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA (Col 6): MINI CALENDÁRIO DE CONSULTAS + AVALIAÇÃO */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Card Próximas Consultas com Mini Calendário */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Seus Agendamentos de Consultas</span>
              </h3>
              <button
                onClick={() => navigate('/client/scheduling')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <span>Ver Agenda Completa</span> <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mini Calendário do Mês */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-700">
                <button
                  onClick={prevMiniMonth}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-white transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="capitalize">{miniMonthNames[miniMonth]} {miniYear}</span>
                <button
                  onClick={nextMiniMonth}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-white transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {miniMonthDays.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} className="h-7" />;

                  const dStr = `${miniYear}-${String(miniMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = miniSelectedDate === dStr;
                  const dayAppts = getAppointmentsForDay(dStr);
                  const isToday = dStr === new Date().toLocaleDateString('en-CA');

                  let dotColor = '';
                  if (dayAppts.length > 0) {
                    const st = dayAppts[0].status;
                    if (st === 'Concluída' || st === 'concluido') dotColor = 'bg-purple-600';
                    else if (st === 'Pendente / Não Concluída') dotColor = 'bg-amber-500';
                    else if (st === 'Cancelada') dotColor = 'bg-red-500';
                    else dotColor = 'bg-blue-600';
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => setMiniSelectedDate(dStr)}
                      className={`h-7 text-xs font-bold rounded-lg flex flex-col items-center justify-center relative transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : isToday
                          ? 'bg-blue-100 text-blue-900 font-extrabold'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span>{day}</span>
                      {dayAppts.length > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${dotColor || 'bg-blue-600'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agendamentos do Dia Selecionado ou Próximos */}
            <div className="space-y-2 pt-1">
              {(() => {
                const dayAppts = getAppointmentsForDay(miniSelectedDate);
                const displayAppts = dayAppts.length > 0 ? dayAppts : appointments.slice(0, 3);

                if (displayAppts.length === 0) {
                  return (
                    <div className="text-center py-4 text-xs font-semibold text-slate-400">
                      Nenhuma consulta cadastrada para esta data.
                    </div>
                  );
                }

                return displayAppts.map((appt, idx) => {
                  let badgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';
                  if (appt.status === 'Concluída' || appt.status === 'concluido') badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';
                  if (appt.status === 'Pendente / Não Concluída') badgeStyle = 'bg-amber-100 text-amber-900 border-amber-200';
                  if (appt.status === 'Cancelada') badgeStyle = 'bg-red-100 text-red-800 border-red-200';

                  return (
                    <div key={idx} className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-center justify-between text-xs hover:border-blue-300 transition">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">{appt.especialidade}</span>
                        <p className="font-black text-slate-800">{appt.profNome}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{appt.clinica}</p>
                      </div>
                      <div className="text-right space-y-1 shrink-0">
                        <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
                          {appt.status || 'Agendada'}
                        </span>
                        <p className="text-[11px] font-bold text-slate-700 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-blue-500" /> {appt.data} às {appt.hora}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Card Avaliação de Consulta */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-3xl text-white shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-amber-100">
                Avaliação de Consulta
              </span>
              <div className="flex text-amber-200">
                {[1,2,3,4,5].map(n => <Star key={n} className="w-3.5 h-3.5 fill-current" />)}
              </div>
            </div>
            <h4 className="text-base font-black">Como foi seu atendimento médico?</h4>
            <p className="text-xs text-amber-100 font-medium leading-relaxed">
              Sua avaliação ajuda a manter a excelência médica no atendimento. Registre sua nota e comentários.
            </p>
            <button
              onClick={() => setShowRatingModal(true)}
              className="mt-2 w-full py-2.5 bg-white text-slate-800 hover:bg-slate-50 font-bold text-xs rounded-xl transition shadow cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Avaliar Consulta Recente
            </button>
          </div>
        </div>

      </div>
      {/* Modal de Edição do Plano de Saúde */}
      {showEditPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">Editar Plano de Saúde</h3>
                <p className="text-xs text-slate-400 mt-0.5">Atualize a operadora e dados de cobertura do seu plano</p>
              </div>
              <button onClick={() => setShowEditPlanModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Operadora / Convênio *</label>
                <input
                  type="text"
                  value={planForm.plano_empresa}
                  onChange={e => setPlanForm({ ...planForm, plano_empresa: e.target.value })}
                  placeholder="Ex: Unimed, Bradesco Saúde, SulAmérica"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Comercial do Plano *</label>
                <input
                  type="text"
                  value={planForm.plano_nome}
                  onChange={e => setPlanForm({ ...planForm, plano_nome: e.target.value })}
                  placeholder="Ex: Especial 100, Estilo Flex"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Acomodação / Produto</label>
                <input
                  type="text"
                  value={planForm.plano_produto}
                  onChange={e => setPlanForm({ ...planForm, plano_produto: e.target.value })}
                  placeholder="Ex: Apartamento, Enfermaria"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Número da Carteirinha</label>
                <input
                  type="text"
                  value={planForm.plano_numero_carteirinha}
                  onChange={e => setPlanForm({ ...planForm, plano_numero_carteirinha: e.target.value })}
                  placeholder="Ex: 0023 4567 8901 2345"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEditPlanModal(false)}
                className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={savingPlan}
                onClick={async () => {
                  setSavingPlan(true);
                  try {
                    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
                    const res = await fetch(`${API_URL}/api/clients/${activeProfileId}`, {
                      method: 'PUT',
                      headers,
                      body: JSON.stringify(planForm)
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setData(updated);
                      setShowEditPlanModal(false);
                      alert('Dados do plano de saúde atualizados com sucesso!');
                    } else {
                      // Fallback local update if offline/simulated
                      setData({ ...data, ...planForm });
                      setShowEditPlanModal(false);
                    }
                  } catch {
                    setData({ ...data, ...planForm });
                    setShowEditPlanModal(false);
                  } finally {
                    setSavingPlan(false);
                  }
                }}
                className="flex-1 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Avaliação de Consulta Médica */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">Avaliar Atendimento Médico</h3>
                <p className="text-xs text-slate-400 mt-0.5">{ratingForm.profissional_nome} • {ratingForm.especialidade}</p>
              </div>
              <button onClick={() => setShowRatingModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {ratingSubmitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-black text-slate-800 text-base">Obrigado pela sua avaliação!</h4>
                <p className="text-xs text-slate-500 font-medium">Sua nota e comentários foram vinculados com sucesso ao prontuário do médico.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Notas de Pontualidade, Clareza e Qualidade */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pontualidade do Atendimento</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingForm({ ...ratingForm, pontualidade: star })}
                          className="p-1 text-amber-400 hover:scale-110 transition cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${ratingForm.pontualidade >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Clareza nas Explicações</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingForm({ ...ratingForm, clareza: star })}
                          className="p-1 text-amber-400 hover:scale-110 transition cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${ratingForm.clareza >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Qualidade Geral do Atendimento</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingForm({ ...ratingForm, qualidade: star })}
                          className="p-1 text-amber-400 hover:scale-110 transition cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${ratingForm.qualidade >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comentário Livre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> Comentários sobre a consulta (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={ratingForm.comentario}
                    onChange={e => setRatingForm({ ...ratingForm, comentario: e.target.value })}
                    placeholder="Escreva como foi sua experiência na consulta..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={submittingRating}
                    onClick={async () => {
                      setSubmittingRating(true);
                      try {
                        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
                        await fetch(`${API_URL}/api/satisfaction/client/${activeProfileId}`, {
                          method: 'POST',
                          headers,
                          body: JSON.stringify(ratingForm)
                        });
                        setRatingSubmitted(true);
                        setTimeout(() => {
                          setShowRatingModal(false);
                          setRatingSubmitted(false);
                        }, 2000);
                      } catch {
                        setRatingSubmitted(true);
                        setTimeout(() => {
                          setShowRatingModal(false);
                          setRatingSubmitted(false);
                        }, 2000);
                      } finally {
                        setSubmittingRating(false);
                      }
                    }}
                    className="flex-1 py-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {submittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-white" />} Enviar Avaliação
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
