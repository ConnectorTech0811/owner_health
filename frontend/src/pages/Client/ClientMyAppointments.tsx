import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, UserCheck, Loader2, Trash2 } from 'lucide-react';
import { API_URL } from '../../config';
import { PatientAgendaCalendar, type PatientAppointment } from '../../components/PatientAgendaCalendar';
import { SearchableSelect } from '../../components/SearchableSelect';

export const ClientMyAppointments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'access'>('calendar');
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);

  // Estados para Conceder Acesso ao Prontuário
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [activeAccesses, setActiveAccesses] = useState<any[]>([]);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [grantMessage, setGrantMessage] = useState('');

  const activeProfileId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadAppointments();
    fetchDoctors();
    fetchActiveAccesses();
  }, [activeProfileId]);

  const loadAppointments = async () => {
    if (!activeProfileId) return;
    try {
      const res = await fetch(`${API_URL}/api/agendas?cliente_id=${activeProfileId}&my_appointments=true`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted: PatientAppointment[] = data.map((a: any) => {
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
              hora: (a.hora_inicio || '09:00').substring(0, 5),
              status: apptStatus,
              tokenConfirmacao: a.token_confirmacao
            };
          });

          setAppointments(formatted);
          localStorage.setItem(`appointments_${activeProfileId}`, JSON.stringify(formatted));
          return;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar agendamentos do backend:', e);
    }

    const cached = localStorage.getItem(`appointments_${activeProfileId}`);
    if (cached) {
      try {
        setAppointments(JSON.parse(cached));
      } catch {}
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/professionals`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDoctorsList(data.filter((p: any) => p.tipo_profissional === 'medico' && p.ativo !== false));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveAccesses = async () => {
    if (!activeProfileId) return;
    try {
      const res = await fetch(`${API_URL}/api/access?cliente_id=${activeProfileId}`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setActiveAccesses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGrantDoctorAccess = async () => {
    if (!selectedDoctorId || !activeProfileId) {
      alert('Selecione um médico para conceder o acesso.');
      return;
    }
    setGrantingAccess(true);
    setGrantMessage('');
    try {
      const res = await fetch(`${API_URL}/api/access/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cliente_id: parseInt(activeProfileId),
          medico_id: parseInt(selectedDoctorId),
          concedido_por: 'paciente'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao conceder acesso');
      setGrantMessage('Acesso concedido com sucesso! Notificação enviada ao médico.');
      setSelectedDoctorId('');
      fetchActiveAccesses();
      setTimeout(() => setGrantMessage(''), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGrantingAccess(false);
    }
  };

  const handleRevokeDoctorAccess = async (medicoId: number) => {
    if (!confirm('Deseja revogar o acesso deste médico ao seu prontuário?')) return;
    try {
      const res = await fetch(`${API_URL}/api/access/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cliente_id: parseInt(activeProfileId!),
          medico_id: medicoId
        })
      });
      if (res.ok) {
        alert('Acesso revogado com sucesso.');
        fetchActiveAccesses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Header com Título */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Meus Agendamentos</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Visualize suas consultas agendadas e gerencie as permissões de acesso ao seu prontuário
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold border border-blue-100 self-start md:self-auto">
          <CalendarIcon className="w-4 h-4 text-blue-600" /> Agenda do Paciente
        </div>
      </div>

      {/* Abas Superiores */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl shadow-inner gap-1">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-white text-blue-600 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarIcon className="w-4 h-4 text-blue-600" /> Minhas Consultas & Calendário
        </button>

        <button
          onClick={() => setActiveTab('access')}
          className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'access'
              ? 'bg-white text-blue-600 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-600" /> Conceder Acesso ao Prontuário
        </button>
      </div>

      {/* ABA 1: MINHAS CONSULTAS E CALENDÁRIO */}
      {activeTab === 'calendar' && (
        <div className="animate-fadeIn">
          <PatientAgendaCalendar appointments={appointments} />
        </div>
      )}

      {/* ABA 2: CONCEDER ACESSO AO PRONTUÁRIO */}
      {activeTab === 'access' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <span>Conceder Acesso ao Prontuário</span>
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-bold uppercase">
              LGPD Protegido
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Escolha um médico da clínica para autorizá-lo a visualizar seu prontuário médico completo.
          </p>

          <div className="space-y-4">
            {(() => {
              const grantedDoctorIds = activeAccesses.map(a => a.medico_id);
              const availableDoctors = doctorsList.filter(doc => !grantedDoctorIds.includes(doc.id));

              return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-9">
                    <SearchableSelect
                      label="Selecione o Médico da Clínica"
                      options={availableDoctors.map(doc => ({
                        id: doc.id,
                        label: `Dr(a). ${doc.nome}`,
                        sublabel: (doc.especialidade && doc.especialidade.trim().toLowerCase() !== 'médico' && doc.especialidade.trim().toLowerCase() !== 'medico') ? doc.especialidade : 'Clínico Geral',
                        extra: doc.numero_conselho || 'CRM'
                      }))}
                      value={selectedDoctorId}
                      onChange={val => setSelectedDoctorId(val ? String(val) : '')}
                      placeholder="Digite para buscar médico por Nome, CRM ou Especialidade..."
                    />
                  </div>

                  <div className="md:col-span-3">
                    <button
                      onClick={handleGrantDoctorAccess}
                      disabled={grantingAccess || !selectedDoctorId}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {grantingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                      <span>{grantingAccess ? 'Concedendo...' : 'Conceder Acesso'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {grantMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold text-center">
                {grantMessage}
              </div>
            )}

            {/* Médicos com acesso ativo concedido */}
            {activeAccesses.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Médicos Autorizados Atualmente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeAccesses.map(acc => (
                    <div key={acc.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{acc.medico_nome}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                          {(acc.medico_especialidade && acc.medico_especialidade.trim().toLowerCase() !== 'médico' && acc.medico_especialidade.trim().toLowerCase() !== 'medico') ? acc.medico_especialidade : 'Clínico Geral'} • Liberado por: {acc.concedido_por}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeDoctorAccess(acc.medico_id)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold p-2 rounded-xl hover:bg-red-50 transition cursor-pointer flex items-center gap-1 border border-red-200"
                        title="Revogar Acesso ao Prontuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revogar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
