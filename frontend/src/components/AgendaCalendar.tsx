import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, Trash2, User, XCircle, Calendar as CalendarIcon, Lock, CheckCircle2 } from 'lucide-react';

interface AgendaSlot {
  id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: 'livre' | 'agendado' | 'cancelado' | 'concluido';
  paciente_nome?: string;
  cliente_id?: number;
  criado_por: number;
}

interface Bloqueio {
  id: number;
  mes: number;
  ano: number;
  status: string;
}

interface CalendarProps {
  agendas: AgendaSlot[];
  bloqueios: Bloqueio[];
  onDeleteSlot: (id: number) => void;
  onBookSlot: (id: number) => void;
  onCancelBooking: (id: number) => void;
  onCompleteSlot?: (id: number) => void;
  onDeleteDaySlots?: (dateStr: string) => void;
  isSecretary?: boolean;
}

export function AgendaCalendar({
  agendas,
  bloqueios,
  onDeleteSlot,
  onBookSlot,
  onCancelBooking,
  onCompleteSlot,
  onDeleteDaySlots,
  isSecretary = false,
}: CalendarProps) {
  const [viewMode, setViewMode] = useState<'semana' | 'mes'>(isSecretary ? 'mes' : 'semana');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isDoctor = user?.tipo_profissional === 'medico';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const mesesOptions = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Helper para verificar se um mês/ano está bloqueado
  const isMonthBlocked = (m: number, y: number) => {
    return bloqueios.some(b => b.mes === m && b.ano === y && b.status === 'bloqueado');
  };

  const currentMonthBlocked = isMonthBlocked(month + 1, year);

  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Navegação do Calendário
  const handlePrev = () => {
    let nextDate: Date;
    if (viewMode === 'mes') {
      nextDate = new Date(year, month - 1, 1);
    } else {
      nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 7);
    }
    setCurrentDate(nextDate);
    setSelectedDate(formatDateStr(nextDate));
  };

  const handleNext = () => {
    let nextDate: Date;
    if (viewMode === 'mes') {
      nextDate = new Date(year, month + 1, 1);
    } else {
      nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 7);
    }
    setCurrentDate(nextDate);
    setSelectedDate(formatDateStr(nextDate));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(formatDateStr(today));
  };

  // Cálculo dos dias da semana (Domingo a Sábado)
  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDays = getWeekDays(currentDate);

  // Formatação do título do período
  const getHeaderTitle = () => {
    if (viewMode === 'mes') {
      return `${mesesOptions[month]} de ${year}`;
    } else {
      const first = weekDays[0];
      const last = weekDays[6];
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()} - ${last.getDate()} de ${mesesOptions[first.getMonth()]} de ${first.getFullYear()}`;
      }
      return `${first.getDate()} ${mesesOptions[first.getMonth()].substring(0, 3)} - ${last.getDate()} ${mesesOptions[last.getMonth()].substring(0, 3)} de ${last.getFullYear()}`;
    }
  };

  // Cálculo dos dias para o Mês
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    monthDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    monthDays.push(i);
  }

  // Obter status do dia para o modo Mês
  const getDayMonthStatus = (day: number) => {
    if (currentMonthBlocked) return 'blocked';
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const daySlots = agendas.filter(a => a.data.startsWith(dateStr));
    
    if (daySlots.length === 0) return 'empty';
    const bookedSlots = daySlots.filter(s => s.status === 'agendado');
    if (bookedSlots.length > 0) return 'booked';
    
    return 'available';
  };

  const selectedSlots = selectedDate 
    ? agendas.filter(a => a.data.startsWith(selectedDate)).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio))
    : [];

  const hoursList = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* PAINEL PRINCIPAL DO CALENDÁRIO */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:w-2/3 flex flex-col">
        
        {/* BARRA DE FERRAMENTAS ESTILO GOOGLE CALENDAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              Hoje
            </button>
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition">
                <ChevronLeft size={20} />
              </button>
              <button onClick={handleNext} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition">
                <ChevronRight size={20} />
              </button>
            </div>
            <h2 className="text-xl font-bold text-slate-800 capitalize ml-2">
              {getHeaderTitle()}
            </h2>
          </div>

          {/* SELETOR DE VISUALIZAÇÃO: SEMANA / MÊS */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setViewMode('semana');
                setSelectedDate(formatDateStr(currentDate));
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'semana'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => {
                setViewMode('mes');
                const firstOfMonth = new Date(year, month, 1);
                setSelectedDate(formatDateStr(firstOfMonth));
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'mes'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês
            </button>
          </div>
        </div>

        {/* VISUALIZAÇÃO POR SEMANA (ESTILO GOOGLE CALENDAR) */}
        {viewMode === 'semana' && (
          <div className="flex-1 flex flex-col overflow-x-auto">
            {/* Header da Semana */}
            <div className="grid grid-cols-8 border-b border-slate-200 pb-3 min-w-[600px]">
              <div className="text-center text-xs font-bold text-slate-400 py-1">GMT-03</div>
              {weekDays.map((d, i) => {
                const dateStr = d.toLocaleDateString('en-CA');
                const isToday = dateStr === new Date().toLocaleDateString('en-CA');
                const isSelected = selectedDate === dateStr;
                const blocked = isMonthBlocked(d.getMonth() + 1, d.getFullYear());

                const dayShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()];

                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (!blocked) setSelectedDate(dateStr);
                    }}
                    title={blocked ? 'Agenda bloqueada' : undefined}
                    className={`text-center cursor-pointer p-1 rounded-xl transition-all ${
                      isSelected ? 'bg-indigo-50/80 ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <div className="text-[11px] font-bold text-slate-400 uppercase">{dayShort}</div>
                    <div className="flex justify-center mt-1">
                      <span
                        className={`w-9 h-9 flex items-center justify-center rounded-full font-bold text-sm ${
                          isToday
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : blocked
                            ? 'bg-red-100 text-red-700 font-extrabold'
                            : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grade de Horários */}
            <div className="flex-1 min-w-[600px] max-h-[500px] overflow-y-auto pt-2 space-y-1 custom-scrollbar">
              {hoursList.map(h => (
                <div key={h} className="grid grid-cols-8 min-h-[52px] border-b border-slate-100 text-xs">
                  {/* Coluna da hora */}
                  <div className="text-slate-400 font-semibold text-[11px] pt-1 pr-2 text-right border-r border-slate-100">
                    {h}
                  </div>

                  {/* 7 dias da semana */}
                  {weekDays.map((d, dayIdx) => {
                    const dateStr = d.toLocaleDateString('en-CA');
                    const blocked = isMonthBlocked(d.getMonth() + 1, d.getFullYear());
                    
                    const slotInHour = agendas.filter(
                      a => a.data.startsWith(dateStr) && a.hora_inicio.substring(0, 2) === h.substring(0, 2)
                    );

                    return (
                      <div
                        key={dayIdx}
                        title={blocked ? 'Agenda bloqueada' : undefined}
                        className={`border-r border-slate-100 p-1 relative min-h-[52px] flex flex-col gap-1 transition-colors ${
                          blocked ? 'bg-red-50/60 border-red-100' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {blocked ? (
                          <div className="h-full flex items-center justify-center text-[10px] font-bold text-red-500/80 bg-red-100/50 rounded p-1">
                            <Lock size={10} className="mr-0.5" /> Agenda bloqueada
                          </div>
                        ) : (
                          slotInHour.map(slot => {
                            const isBooked = slot.status === 'agendado';
                            const now = new Date();
                            const todayIso = now.toLocaleDateString('en-CA');
                            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                            const slotDate = slot.data ? String(slot.data).substring(0, 10) : dateStr;
                            const isOverdue = isBooked && (slotDate < todayIso || (slotDate === todayIso && (slot.hora_inicio || '').substring(0, 5) < currentTime));

                            let bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
                            if (isBooked) {
                              bgClass = isOverdue
                                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-100 hover:bg-amber-600'
                                : 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-200 hover:bg-indigo-700';
                            }

                            return (
                              <div
                                key={slot.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(dateStr);
                                }}
                                className={`p-1.5 rounded-xl border text-[11px] leading-tight cursor-pointer transition-all shadow-xs relative overflow-hidden flex flex-col justify-between ${bgClass}`}
                              >
                                <div className="font-bold flex items-center justify-between gap-1 overflow-hidden w-full mb-0.5">
                                  <span className="truncate">{slot.hora_inicio.substring(0, 5)}</span>
                                  {isBooked ? (
                                    isOverdue ? (
                                      <span className="bg-amber-800/90 text-amber-50 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tight shrink-0">Pendente</span>
                                    ) : (
                                      <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tight shrink-0">Agendada</span>
                                    )
                                  ) : (
                                    <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded uppercase tracking-tight shrink-0">Livre</span>
                                  )}
                                </div>
                                {isBooked && slot.paciente_nome && (
                                  <div className="mt-0.5 font-semibold truncate text-[10px] w-full overflow-hidden">
                                    {slot.cliente_id ? (
                                      <a
                                        href={`/professional/patients/${slot.cliente_id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="hover:underline text-white font-extrabold flex items-center gap-0.5 truncate"
                                        title="Abrir prontuário completo do paciente"
                                      >
                                        <span className="truncate">👤 {slot.paciente_nome}</span> 📋
                                      </a>
                                    ) : (
                                      <span className="opacity-95 truncate block">👤 {slot.paciente_nome}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISUALIZAÇÃO POR MÊS */}
        {viewMode === 'mes' && (
          <div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="p-2 sm:p-4"></div>;

                const status = getDayMonthStatus(day);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isPastDate = dateStr < todayStr;
                const isBlocked = status === 'blocked';

                const daySlots = agendas.filter(a => a.data.startsWith(dateStr));
                const bookedCount = daySlots.filter(s => s.status === 'agendado').length;
                const availableCount = daySlots.filter(s => s.status === 'livre').length;

                let bgClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700';
                if (isBlocked) {
                  bgClass = 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 font-bold';
                } else if (isPastDate) {
                  bgClass = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                } else if (bookedCount > 0) {
                  bgClass = 'bg-indigo-50/80 border-indigo-200 text-indigo-900 hover:bg-indigo-100/80';
                } else if (availableCount > 0) {
                  bgClass = 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80';
                }

                if (isSelected) {
                  bgClass += ' ring-2 ring-indigo-500 ring-offset-2';
                }

                return (
                  <button
                    key={day}
                    title={isBlocked ? 'Agenda bloqueada' : undefined}
                    onClick={() => {
                      if (!isBlocked && !isPastDate) setSelectedDate(dateStr);
                    }}
                    className={`relative flex flex-col items-center justify-between p-2 sm:p-3 min-h-[70px] rounded-xl border transition-all ${bgClass}`}
                  >
                    <span className="font-semibold text-sm sm:text-base">{day}</span>

                    {/* Exibição de Indicadores */}
                    {isBlocked ? (
                      <div className="flex items-center gap-0.5 text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full mt-1">
                        <Lock size={10} /> Bloqueado
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 w-full mt-1">
                        {bookedCount > 0 && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 px-1.5 py-0.5 rounded-full w-full truncate text-center shadow-xs">
                            {bookedCount} agendada{bookedCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {availableCount > 0 && bookedCount === 0 && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            {availableCount} livre{availableCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEGENDA DE STATUS */}
        <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-100 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200"></div> Disponível
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-200"></div> Consulta agendada
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div> Agenda bloqueada
          </div>
        </div>
      </div>

      {/* DETALHES DO DIA SELECIONADO (SIDEBAR DIREITA) */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 lg:w-1/3 flex flex-col h-full min-h-[400px]">
        {selectedDate ? (
          <>
            <h3 className="font-bold text-slate-800 mb-4 pb-4 border-b border-slate-200 flex items-center justify-between">
              Horários do Dia
              <div className="flex items-center gap-3">
                {onDeleteDaySlots && selectedSlots.some(s => s.status === 'livre') && (
                  <button 
                    onClick={() => onDeleteDaySlots(selectedDate)} 
                    className="text-xs flex items-center gap-1 font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors border border-red-200"
                    title="Excluir todos os horários livres deste dia"
                  >
                    <Trash2 size={14}/> Limpar Dia
                  </button>
                )}
                <span className="text-sm font-normal text-slate-500">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {selectedSlots.length > 0 ? (
                selectedSlots.map(slot => (
                  <div key={slot.id} className={`p-3 rounded-xl border transition-all ${slot.status === 'livre' ? 'bg-white border-emerald-100 shadow-sm' : 'bg-indigo-50/70 border-indigo-200'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 text-sm">
                        <Clock size={14} className={slot.status === 'livre' ? 'text-emerald-500' : 'text-indigo-600'} />
                        {slot.hora_inicio.substring(0, 5)} - {slot.hora_fim.substring(0, 5)}
                      </div>
                    </div>
                    
                    {slot.status === 'livre' ? (
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Livre</span>
                        <div className="flex items-center gap-1">
                           <button onClick={() => onBookSlot(slot.id)} className="text-xs flex items-center gap-1 font-medium text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"><Plus size={14}/> Agendar</button>
                           <button onClick={() => onDeleteSlot(slot.id)} className="text-xs flex items-center gap-1 font-medium text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        {slot.paciente_nome && (
                          <div className="flex items-center gap-1.5 text-slate-700 text-sm mb-2 bg-indigo-50/80 p-2 rounded-xl border border-indigo-100 shadow-xs">
                            <User size={15} className="text-indigo-600" />
                            {slot.cliente_id ? (
                              <a
                                href={`/professional/patients/${slot.cliente_id}`}
                                className="font-extrabold truncate text-indigo-700 hover:text-indigo-900 hover:underline transition flex items-center gap-1.5"
                                title="Abrir prontuário completo do paciente"
                              >
                                <span>{slot.paciente_nome}</span>
                                <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded font-black">Prontuário 📋</span>
                              </a>
                            ) : (
                              <span className="font-bold truncate">{slot.paciente_nome}</span>
                            )}
                          </div>
                        )}
                        
                        {(slot.status === 'concluido' || (slot as any).status === 'Concluída') ? (
                          <div className="mt-2 bg-purple-50 border border-purple-200 text-purple-900 p-2 rounded-xl text-xs font-bold flex items-center justify-between">
                            <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-purple-600" /> Consulta Concluída</span>
                            <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-black uppercase">Validado ✓</span>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Consulta agendada</span>
                              <button onClick={() => onCancelBooking(slot.id)} className="text-xs flex items-center gap-1 font-medium text-red-600 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors"><XCircle size={14}/> Desmarcar</button>
                            </div>

                            {onCompleteSlot && isDoctor && (
                              <button
                                onClick={() => onCompleteSlot(slot.id)}
                                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 size={15} /> Confirmar Consulta Concluída
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm flex flex-col items-center gap-2">
                   <Clock size={32} className="text-slate-300" />
                   Nenhum horário cadastrado.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <CalendarIcon size={32} className="text-slate-300" />
            </div>
            <p className="font-medium text-slate-600 mb-1">Selecione um dia</p>
            <p className="text-sm text-slate-400">Clique em uma data no calendário para ver e gerenciar os horários.</p>
          </div>
        )}
      </div>
    </div>
  );
}
