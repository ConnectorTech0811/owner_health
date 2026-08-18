import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, CheckCircle2, MapPin } from 'lucide-react';

export interface PatientAppointment {
  id: string;
  profNome: string;
  especialidade: string;
  clinica: string;
  data: string; // formato DD/MM/YYYY ou YYYY-MM-DD
  hora: string; // formato HH:mm
  status: string; // 'Confirmado' | 'Concluída' | 'Cancelado'
  tokenConfirmacao?: string;
}

interface PatientAgendaCalendarProps {
  appointments: PatientAppointment[];
  onSelectAppointment?: (appt: PatientAppointment) => void;
}

export const PatientAgendaCalendar: React.FC<PatientAgendaCalendarProps> = ({
  appointments,
  onSelectAppointment
}) => {
  const [viewMode, setViewMode] = useState<'semana' | 'mes'>('mes');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const mesesOptions = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Converte string de data para ISO YYYY-MM-DD para comparações
  const normalizeDateStr = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
      }
    }
    return dateStr.substring(0, 10);
  };

  const formatDateToPtBr = (isoStr: string) => {
    try {
      const [y, m, d] = isoStr.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return isoStr;
    }
  };

  // Navegação
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'mes') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'mes') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDateStr(todayStr);
  };

  // Cálculo dos dias da semana
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

  // Agendamentos filtrados para o dia selecionado
  const selectedDayAppointments = appointments.filter(a => normalizeDateStr(a.data) === selectedDateStr);

  const hoursList = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-sans">
      {/* PAINEL PRINCIPAL DO CALENDÁRIO DO PACIENTE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:w-2/3 flex flex-col">
        
        {/* BARRA DE FERRAMENTAS ESTILO GOOGLE CALENDAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToday}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              Hoje
            </button>
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNext} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ChevronRight size={18} />
              </button>
            </div>
            <h2 className="text-lg font-black text-slate-800 capitalize ml-1">
              {getHeaderTitle()}
            </h2>
          </div>

          {/* SELETOR DE VISUALIZAÇÃO: SEMANA / MÊS */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('semana')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                viewMode === 'semana' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Semana
            </button>
            <button
              onClick={() => setViewMode('mes')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                viewMode === 'mes' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Mês
            </button>
          </div>
        </div>

        {/* VISUALIZAÇÃO POR SEMANA */}
        {viewMode === 'semana' && (
          <div className="flex-1 flex flex-col overflow-x-auto">
            {/* Header da Semana */}
            <div className="grid grid-cols-8 border-b border-slate-200 pb-3 min-w-[620px]">
              <div className="text-center text-[10px] font-black text-slate-400 py-1">HORA</div>
              {weekDays.map((d, i) => {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const isToday = dateStr === new Date().toLocaleDateString('en-CA');
                const isSelected = selectedDateStr === dateStr;
                const dayShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()];

                const dayAppts = appointments.filter(a => normalizeDateStr(a.data) === dateStr);

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`text-center cursor-pointer p-1.5 rounded-2xl transition-all ${
                      isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] font-black text-slate-400 uppercase">{dayShort}</div>
                    <div className="flex flex-col items-center mt-1">
                      <span
                        className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-xs ${
                          isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-800'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                      {dayAppts.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 mt-1"></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grade de Horários da Semana */}
            <div className="flex-1 min-w-[620px] max-h-[480px] overflow-y-auto pt-2 space-y-1 custom-scrollbar">
              {hoursList.map(h => (
                <div key={h} className="grid grid-cols-8 min-h-[54px] border-b border-slate-100 text-xs">
                  <div className="text-slate-400 font-bold text-[10px] pt-1 pr-2 text-right border-r border-slate-100">
                    {h}
                  </div>

                  {weekDays.map((d, dayIdx) => {
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    
                    const slotAppts = appointments.filter(a => {
                      return normalizeDateStr(a.data) === dateStr && a.hora.substring(0, 2) === h.substring(0, 2);
                    });

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => setSelectedDateStr(dateStr)}
                        className="border-r border-slate-100 p-1 min-h-[54px] flex flex-col gap-1 hover:bg-slate-50/60 transition cursor-pointer"
                      >
                        {slotAppts.map(appt => (
                          <div
                            key={appt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateStr(dateStr);
                              if (onSelectAppointment) onSelectAppointment(appt);
                            }}
                            className={`p-1.5 rounded-xl border text-[10px] leading-tight transition-all shadow-xs ${
                              appt.status === 'Concluída' || appt.status === 'concluido'
                                ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                                : 'bg-blue-600 text-white border-blue-700 shadow-blue-200 hover:bg-blue-700'
                            }`}
                          >
                            <div className="font-extrabold flex items-center justify-between">
                              <span>{appt.hora}</span>
                              <span className="text-[8px] bg-white/20 px-1 py-0.2 rounded uppercase font-black">
                                {appt.status === 'Concluída' || appt.status === 'concluido' ? 'Concluída' : 'Agendada'}
                              </span>
                            </div>
                            <div className="font-bold truncate mt-0.5">{appt.profNome}</div>
                            <div className="text-[9px] opacity-90 truncate">{appt.especialidade}</div>
                          </div>
                        ))}
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
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[11px] font-black text-slate-400">
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {monthDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="p-3"></div>;

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDateStr === dateStr;
                const todayStr = new Date().toLocaleDateString('en-CA');
                const isToday = dateStr === todayStr;

                const dayAppts = appointments.filter(a => normalizeDateStr(a.data) === dateStr);

                let bgClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700';
                if (dayAppts.length > 0) {
                  bgClass = 'bg-blue-50/80 border-blue-200 text-blue-900 hover:bg-blue-100/80';
                }

                if (isSelected) {
                  bgClass += ' ring-2 ring-blue-600 ring-offset-1 border-blue-600';
                }

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`relative flex flex-col items-center justify-between p-2.5 min-h-[75px] rounded-2xl border transition-all cursor-pointer ${bgClass}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className={`font-black text-xs ${isToday ? 'w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center' : ''}`}>
                        {day}
                      </span>
                    </div>

                    {/* Cards das Consultas no Dia */}
                    {dayAppts.length > 0 && (
                      <div className="w-full space-y-1 mt-1">
                        {dayAppts.slice(0, 2).map(appt => {
                          const isConcluido = appt.status === 'Concluída' || appt.status === 'concluido';
                          const isPendente = appt.status === 'Pendente / Não Concluída';
                          const isCancelado = appt.status === 'Cancelada' || appt.status === 'cancelado';

                          let badgeStyle = 'bg-blue-600 text-white';
                          if (isConcluido) badgeStyle = 'bg-purple-600 text-white';
                          if (isPendente) badgeStyle = 'bg-amber-500 text-white';
                          if (isCancelado) badgeStyle = 'bg-red-500 text-white';

                          return (
                            <div
                              key={appt.id}
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg truncate text-left shadow-2xs ${badgeStyle}`}
                            >
                              {appt.hora} {appt.profNome.split(' ')[0]}
                            </div>
                          );
                        })}
                        {dayAppts.length > 2 && (
                          <span className="text-[8px] font-extrabold text-blue-700 block text-center">
                            +{dayAppts.length - 2} mais
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
        <div className="flex flex-wrap gap-5 mt-6 pt-5 border-t border-slate-100 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
            <span>Consulta Agendada</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
            <span>Pendente / Não Concluída</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0"></span>
            <span>Concluída</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span>
            <span>Cancelada</span>
          </div>
        </div>
      </div>

      {/* DETALHES DO DIA SELECIONADO (SIDEBAR DIREITA) */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 lg:w-1/3 flex flex-col h-full min-h-[420px]">
        <div className="pb-4 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 text-sm">Consultas do Dia</h3>
            <p className="text-[11px] font-bold text-blue-600 mt-0.5 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              {formatDateToPtBr(selectedDateStr)}
            </p>
          </div>
          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full">
            {selectedDayAppointments.length} consulta{selectedDayAppointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-4 custom-scrollbar">
          {selectedDayAppointments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Nenhuma consulta cadastrada para esta data.</p>
              <p className="text-[10px] text-slate-400">Navegue pelas datas no calendário para visualizar seu histórico.</p>
            </div>
          ) : (
            selectedDayAppointments.map(appt => {
              const isConcluido = appt.status === 'Concluída' || appt.status === 'concluido';
              const isPendente = appt.status === 'Pendente / Não Concluída';
              const isCancelado = appt.status === 'Cancelada' || appt.status === 'cancelado';

              let badgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';
              if (isConcluido) badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';
              if (isPendente) badgeStyle = 'bg-amber-100 text-amber-900 border-amber-200';
              if (isCancelado) badgeStyle = 'bg-red-100 text-red-800 border-red-200';

              return (
                <div key={appt.id} className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs hover:border-blue-300 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">{appt.especialidade}</span>
                      <h4 className="text-xs font-black text-slate-800 mt-0.5 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Dr(a). {appt.profNome}
                      </h4>
                    </div>
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
                      {appt.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 font-semibold border-t border-slate-100 pt-2.5">
                    <p className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> {appt.hora}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {appt.clinica}
                    </p>
                  </div>

                  {appt.tokenConfirmacao && (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 text-[10px] text-purple-900 font-bold flex items-center justify-between">
                      <span>Token: <b>{appt.tokenConfirmacao}</b></span>
                      <span className="text-emerald-700 font-extrabold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Validado</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
