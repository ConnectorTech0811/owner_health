import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Check, User, Shield, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Phone, X, UserCheck, Trash2, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { API_URL } from '../../config';
import { SearchableSelect } from '../../components/SearchableSelect';
import { PatientAgendaCalendar } from '../../components/PatientAgendaCalendar';

const ESPECIALIDADES = [
  'Clínico Geral', 'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Fisioterapia',
  'Fonoaudiologia', 'Gastroenterologia', 'Geriatria', 'Ginecologia', 'Neurologia',
  'Nutrição', 'Oftalmologia', 'Oncologia', 'Ortopedia', 'Pediatria', 'Psicologia',
  'Psiquiatria', 'Reumatologia', 'Terapia Ocupacional', 'Urologia',
];

interface Professional {
  id: number; nome: string; especialidade: string; conselho: string;
  clinica: string; planos: string[]; cep: string; cidade: string;
  estado: string; preco: number; celular?: string;
}

interface Appointment {
  id: string;
  profNome: string;
  especialidade: string;
  clinica: string;
  data: string;
  hora: string;
  status: string;
}

interface AgendaSlot {
  id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
}

export const ClientScheduling: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSpecialty = searchParams.get('specialty') || '';

  const [activeTab, setActiveTab] = useState<'calendar' | 'book' | 'access'>(initialSpecialty ? 'book' : 'calendar');

  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookingModal, setBookingModal] = useState<Professional | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);



  // Estados para Conceder Acesso ao Prontuário
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [activeAccesses, setActiveAccesses] = useState<any[]>([]);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [grantMessage, setGrantMessage] = useState('');

  // Filtros de busca
  const [specFilter, setSpecFilter] = useState(initialSpecialty);
  const [nameFilter, setNameFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [cepFilter, setCepFilter] = useState('');

  // Form Booking & Calendário Interativo Premium estilo Google
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [monthlyAvailableDates, setMonthlyAvailableDates] = useState<Set<string>>(new Set());
  const [allSlotsByDate, setAllSlotsByDate] = useState<Record<string, AgendaSlot[]>>({});
  const [bookingDate, setBookingDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [bookingSlot, setBookingSlot] = useState<AgendaSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AgendaSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isMonthClosed, setIsMonthClosed] = useState(false);
  const [bookingPhone, setBookingPhone] = useState('');

  const activeProfileId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchProfessionals();
    loadAppointments();
    fetchDoctors();
    fetchActiveAccesses();
  }, [initialSpecialty, activeProfileId]);

  useEffect(() => {
    if (bookingModal) {
      fetchMonthlyAvailability(bookingModal.id, calendarViewDate);
    }
  }, [bookingModal, calendarViewDate]);

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

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/professionals`, { headers });
      const data = await res.json();
      
      const formatted = Array.isArray(data) ? data.filter((p: any) => p.tipo_profissional === 'medico' && p.ativo !== 0 && p.ativo !== false).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        especialidade: p.especialidade || 'Clínico Geral',
        conselho: p.numero_conselho || 'Sem conselho',
        clinica: 'Clínica Principal',
        planos: ['Particular'],
        cep: (() => {
          if (p.cep) {
            return p.cep.includes('-') ? p.cep : p.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
          }
          const match = p.endereco?.match(/CEP:\s*(\d{5}-?\d{3})/i);
          if (match) {
            const val = match[1];
            return val.includes('-') ? val : val.replace(/(\d{5})(\d{3})/, '$1-$2');
          }
          return '00000-000';
        })(),
        cidade: p.cidade || (p.endereco ? p.endereco.split(' - ')[0].split(', ').pop() : 'Desconhecida'),
        estado: p.estado || 'SP',
        preco: p.valor_consulta ? parseFloat(p.valor_consulta) : 150,
        celular: p.celular || ''
      })) : [];
      
      setProfessionals(formatted);
    } catch (e) {
      console.error(e);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
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
      setAppointments(JSON.parse(cached));
    }
  };

  const fetchMonthlyAvailability = async (profId: number, viewDate: Date) => {
    setSlotsLoading(true);
    setIsMonthClosed(false);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      try {
        const blocksRes = await fetch(`${API_URL}/api/bloqueios?profissional_id=${profId}`, { headers });
        if (blocksRes.ok) {
          const blocks = await blocksRes.json();
          const isBlocked = blocks.some((b: any) => b.mes === (month + 1) && b.ano === year && b.status === 'bloqueado');
          if (isBlocked) {
            setIsMonthClosed(true);
            setAvailableSlots([]);
            setMonthlyAvailableDates(new Set());
            setAllSlotsByDate({});
            setSlotsLoading(false);
            return;
          }
        }
      } catch (e) {}

      const res = await fetch(`${API_URL}/api/agendas?profissional_id=${profId}&data_inicio=${startStr}&data_fim=${endStr}`, { headers });

      if (res.ok) {
        const data: any[] = await res.json();
        const now = new Date();
        const currentDateStr = now.toLocaleDateString('en-CA');
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const datesSet = new Set<string>();
        const slotsMap: Record<string, AgendaSlot[]> = {};

        data.forEach(slot => {
          const slotDateStr = String(slot.data).substring(0, 10);
          if (slotDateStr < currentDateStr) return;
          if (slotDateStr === currentDateStr && slot.hora_inicio.substring(0, 5) <= currentTimeStr) return;

          datesSet.add(slotDateStr);
          if (!slotsMap[slotDateStr]) slotsMap[slotDateStr] = [];
          slotsMap[slotDateStr].push(slot);
        });

        setMonthlyAvailableDates(datesSet);
        setAllSlotsByDate(slotsMap);

        const sortedAvailable = Array.from(datesSet).sort();
        if (sortedAvailable.length > 0 && (!bookingDate || !datesSet.has(bookingDate))) {
          setBookingDate(sortedAvailable[0]);
          setAvailableSlots(slotsMap[sortedAvailable[0]] || []);
        } else if (bookingDate && slotsMap[bookingDate]) {
          setAvailableSlots(slotsMap[bookingDate]);
        } else {
          setAvailableSlots([]);
        }
      } else {
        setMonthlyAvailableDates(new Set());
        setAllSlotsByDate({});
        setAvailableSlots([]);
      }
    } catch {
      setMonthlyAvailableDates(new Set());
      setAllSlotsByDate({});
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const normalize = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

  const filteredProfessionals = professionals.filter(prof => {
    const normSpec = normalize(prof.especialidade);
    const normFilter = normalize(specFilter);
    const matchesSpec = !specFilter || normSpec.includes(normFilter) || normFilter.includes(normSpec);
    const matchesName = !nameFilter || normalize(prof.nome).includes(normalize(nameFilter));
    const matchesClinic = !clinicFilter || normalize(prof.clinica).includes(normalize(clinicFilter));
    const matchesPlan = !planFilter || prof.planos.some(p => normalize(p).includes(normalize(planFilter)));
    const matchesCep = !cepFilter || prof.cep.replace(/\D/g, '').includes(cepFilter.replace(/\D/g, ''));
    
    return matchesSpec && matchesName && matchesClinic && matchesPlan && matchesCep;
  });

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModal) return;

    if (isMonthClosed) {
      alert('Agenda desse mês está fechada, aguarde a liberação de agenda.');
      return;
    }

    if (!bookingSlot || availableSlots.length === 0) {
      alert('Não tem horário disponível nessa data, selecione uma data com horários livres (destacada em verde).');
      return;
    }

    setBookingLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/api/agendas/${bookingSlot.id}/book`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cliente_id: activeProfileId })
      });

      if (!res.ok) {
        throw new Error('Falha ao agendar. O horário pode não estar mais disponível.');
      }

      const newAppt: Appointment = {
        id: `appt-${bookingSlot.id}`,
        profNome: bookingModal.nome,
        especialidade: bookingModal.especialidade,
        clinica: bookingModal.clinica,
        data: new Date(bookingDate + 'T00:00:00').toLocaleDateString('pt-BR'),
        hora: bookingSlot.hora_inicio.substring(0, 5),
        status: 'Confirmado'
      };

      const updated = [newAppt, ...appointments];
      setAppointments(updated);
      localStorage.setItem(`appointments_${activeProfileId}`, JSON.stringify(updated));
      
      setBookingSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao agendar consulta');
    } finally {
      setBookingLoading(false);
    }
  };



  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Agendamentos & Permissões Médicas</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Gerencie suas consultas no mês e semana e conceda acesso ao seu prontuário médico
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold border border-blue-100 self-start md:self-auto">
          <CalendarIcon className="w-4 h-4 text-blue-600" /> Agenda do Paciente
        </div>
      </div>

      {/* Abas Superiores Estilo Pilha (Igual à tela de Exames) */}
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
          onClick={() => setActiveTab('book')}
          className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'book'
              ? 'bg-white text-blue-600 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 text-blue-600" /> Agendar Consulta
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

      {/* ABA 1: CALENDÁRIO E MINHAS CONSULTAS */}
      {activeTab === 'calendar' && (
        <div className="animate-fadeIn">
          <PatientAgendaCalendar appointments={appointments} />
        </div>
      )}

      {/* ABA 2: AGENDAR CONSULTA (BUSCA DE MÉDICOS E ESPECIALIDADES) */}
      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Formulário de Filtros - Col 4 */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Filtros de Pesquisa Médica</h3>

              <div className="space-y-3 text-xs font-semibold text-slate-600">
                <div>
                  <label className="block text-slate-500 mb-1">Buscar por Especialidade</label>
                  <select
                    value={specFilter}
                    onChange={e => setSpecFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">Todas as especialidades</option>
                    {ESPECIALIDADES.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Nome do Profissional</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: Dr. Roberto"
                      value={nameFilter}
                      onChange={e => setNameFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Hospital / Clínica / Consultório</label>
                  <input
                    type="text"
                    placeholder="Ex: Clínica Saúde Total"
                    value={clinicFilter}
                    onChange={e => setClinicFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Plano de Saúde Aceito</label>
                  <input
                    type="text"
                    placeholder="Ex: Unimed, SulAmérica"
                    value={planFilter}
                    onChange={e => setPlanFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Localidade (CEP)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="00000-000"
                      maxLength={9}
                      value={cepFilter}
                      onChange={e => setCepFilter(e.target.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9))}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Resultados de Médicos - Col 8 */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Profissionais Credenciados ({filteredProfessionals.length})</h3>

            {loading ? (
              <div className="flex justify-center items-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
                <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-bold">Nenhum profissional encontrado com os filtros atuais.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredProfessionals.map(prof => (
                  <div key={prof.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 text-sm">{prof.nome}</h4>
                        <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-blue-100">{prof.especialidade}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{prof.conselho} • <b>{prof.clinica}</b></p>
                      
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{prof.cidade} - {prof.estado} (CEP: {prof.cep})</span>
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {prof.planos.map(plan => (
                          <span key={plan} className="flex items-center gap-0.5 bg-slate-50 text-slate-500 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-slate-200/50">
                            <Shield className="w-3 h-3 text-slate-400" /> {plan}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end gap-3 self-stretch sm:self-center pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100/80 justify-end">
                      <button
                        onClick={() => {
                          setBookingModal(prof);
                          setCalendarViewDate(new Date());
                          setBookingSlot(null);
                          setBookingSuccess(false);
                          setBookingPhone(prof.celular || '');
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Agendar</span> <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: CONCEDER ACESSO AO PRONTUÁRIO */}
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
                        sublabel: doc.especialidade || 'Médico',
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
                          {acc.medico_especialidade || 'Médico'} • Liberado por: {acc.concedido_por}
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

      {/* Modal de Agendamento com Calendário */}
      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-md font-black text-slate-800">Agendar Minha Consulta</h3>
              <button onClick={() => setBookingModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {!bookingSuccess ? (
              <form onSubmit={handleBookSubmit}>
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-blue-200/50 shrink-0 text-blue-600 font-extrabold text-xs">
                      {bookingModal.nome[0]}
                    </div>
                    <div>
                      <p className="text-xs font-black text-blue-900">{bookingModal.nome}</p>
                      <p className="text-[10px] text-blue-700 font-bold uppercase mt-0.5">{bookingModal.especialidade} • {bookingModal.clinica}</p>
                    </div>
                  </div>

                  {/* Calendário Interativo Premium */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Seleção de Data no Calendário *</label>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => {
                            const prev = new Date(calendarViewDate);
                            prev.setMonth(prev.getMonth() - 1);
                            setCalendarViewDate(prev);
                          }}
                          className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="text-center font-black text-slate-800 text-xs capitalize flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-blue-600" />
                          <span>{calendarViewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const next = new Date(calendarViewDate);
                            next.setMonth(next.getMonth() + 1);
                            setCalendarViewDate(next);
                          }}
                          className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
                        <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 pt-1">
                        {(() => {
                          const year = calendarViewDate.getFullYear();
                          const month = calendarViewDate.getMonth();
                          const firstDayIdx = new Date(year, month, 1).getDay();
                          const totalDays = new Date(year, month + 1, 0).getDate();
                          const todayStr = new Date().toLocaleDateString('en-CA');

                          const cells = [];

                          for (let i = 0; i < firstDayIdx; i++) {
                            cells.push(<div key={`empty-${i}`} className="h-9" />);
                          }

                          for (let day = 1; day <= totalDays; day++) {
                            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isPast = dStr < todayStr;
                            const isAvailable = monthlyAvailableDates.has(dStr) && !isPast && !isMonthClosed;
                            const isSelected = dStr === bookingDate;

                            cells.push(
                              <button
                                key={`day-${day}`}
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => {
                                  setBookingDate(dStr);
                                  setAvailableSlots(allSlotsByDate[dStr] || []);
                                  setBookingSlot(null);
                                }}
                                className={`h-9.5 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center relative ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-300 border-2 border-blue-600'
                                    : isAvailable
                                    ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-500 hover:bg-emerald-500 hover:text-white cursor-pointer shadow-xs'
                                    : 'bg-slate-100/70 text-slate-400 border border-slate-200/60 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <span>{day}</span>
                                {isAvailable && !isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute bottom-1"></span>
                                )}
                              </button>
                            );
                          }

                          return cells;
                        })()}
                      </div>

                      <div className="flex items-center justify-around bg-white border border-slate-200 rounded-xl p-2.5 text-[10px] font-bold text-slate-600 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 inline-block"></span>
                          <span>Com Horários (Verde)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-slate-300 border border-slate-400 inline-block"></span>
                          <span>Sem Vagas (Cinza)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-700 inline-block"></span>
                          <span>Selecionado</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Horários Livres em {new Date(bookingDate + 'T00:00:00').toLocaleDateString('pt-BR')} *
                    </label>
                    {slotsLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
                    ) : isMonthClosed ? (
                      <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 text-center font-bold">A agenda desse mês está fechada pelo médico.</div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-medium">Nenhum horário livre nesta data. Selecione uma data destacada em verde acima.</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(slot => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setBookingSlot(slot)}
                            className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${bookingSlot?.id === slot.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-blue-300'}`}
                          >
                            {slot.hora_inicio.substring(0, 5)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Celular de Contato *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="(11) 99999-9999"
                        value={bookingPhone}
                        onChange={e => setBookingPhone(e.target.value.replace(/\D/g,'').replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2').slice(0,15))}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-3">
                  <button type="button" onClick={() => setBookingModal(null)} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={bookingLoading || !bookingSlot} className="flex-1 py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                    {bookingLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</> : 'Confirmar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">Agendamento Realizado!</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Sua consulta com <b>{bookingModal.nome}</b> foi marcada para o dia <b>{new Date(bookingDate + 'T00:00:00').toLocaleDateString('pt-BR')}</b> às <b>{bookingSlot?.hora_inicio.substring(0, 5)}</b>.</p>
                </div>
                <button
                  onClick={() => setBookingModal(null)}
                  className="w-full py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition mt-2 cursor-pointer"
                >
                  Fechar Janela
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
