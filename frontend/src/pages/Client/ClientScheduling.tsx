import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Check, Clock, User, Shield, ChevronRight, Phone, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { API_URL } from '../../config';

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



const TIME_SLOTS = ['08:30', '09:15', '10:00', '10:45', '13:30', '14:15', '15:00', '15:45', '16:30'];

export const ClientScheduling: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSpecialty = searchParams.get('specialty') || '';

  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookingModal, setBookingModal] = useState<Professional | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Filtros de busca
  const [specFilter, setSpecFilter] = useState(initialSpecialty);
  const [nameFilter, setNameFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [cepFilter, setCepFilter] = useState('');

  // Form Booking
  const [bookingDate, setBookingDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // Amanhã
  const [bookingTime, setBookingTime] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');

  const activeProfileId = localStorage.getItem('activeProfileId');

  useEffect(() => {
    fetchProfessionals();
    loadAppointments();
  }, [initialSpecialty]);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/professionals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const formatted = Array.isArray(data) ? data.filter((p: any) => p.tipo_profissional === 'medico').map((p: any) => ({
        id: p.id,
        nome: p.nome,
        especialidade: p.especialidade || p.tipo_profissional || 'Clínico Geral',
        conselho: p.numero_conselho || 'Sem conselho',
        clinica: 'Clínica Principal', // Simplificado
        planos: ['Particular'],
        cep: p.endereco?.match(/CEP: (\d{5}-\d{3})/) ? p.endereco.match(/CEP: (\d{5}-\d{3})/)[1] : '00000-000',
        cidade: p.endereco ? p.endereco.split(' - ')[0].split(', ').pop() : 'Desconhecida',
        estado: 'SP',
        preco: 150,
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

  const loadAppointments = () => {
    const cached = localStorage.getItem(`appointments_${activeProfileId}`);
    if (cached) {
      setAppointments(JSON.parse(cached));
    } else {
      setAppointments([]);
    }
  };

  // Filtragem dinâmica local baseada nos inputs do usuário
  const filteredProfessionals = professionals.filter(prof => {
    const matchesSpec = !specFilter || prof.especialidade.toLowerCase().includes(specFilter.toLowerCase());
    const matchesName = !nameFilter || prof.nome.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesClinic = !clinicFilter || prof.clinica.toLowerCase().includes(clinicFilter.toLowerCase());
    const matchesPlan = !planFilter || prof.planos.some(p => p.toLowerCase().includes(planFilter.toLowerCase()));
    const matchesCep = !cepFilter || prof.cep.replace(/\D/g,'').includes(cepFilter.replace(/\D/g,''));
    
    return matchesSpec && matchesName && matchesClinic && matchesPlan && matchesCep;
  });

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModal || !bookingTime) {
      alert('Selecione um horário para confirmar.');
      return;
    }

    setBookingLoading(true);
    
    setTimeout(() => {
      const newAppt: Appointment = {
        id: `appt-${Math.random().toString(36).substring(2, 9)}`,
        profNome: bookingModal.nome,
        especialidade: bookingModal.especialidade,
        clinica: bookingModal.clinica,
        data: new Date(bookingDate).toLocaleDateString('pt-BR'),
        hora: bookingTime,
        status: 'Confirmado'
      };

      const updated = [newAppt, ...appointments];
      setAppointments(updated);
      localStorage.setItem(`appointments_${activeProfileId}`, JSON.stringify(updated));
      
      setBookingLoading(false);
      setBookingSuccess(true);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">Agendamento de Consultas</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Busque por profissionais e hospitais credenciados para agendar seu atendimento</p>
      </div>

      {/* Grid: Search Filters + Results / Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Filters Form - Col 4 */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Filtros de Pesquisa</h3>

            <div className="space-y-3 text-xs font-semibold text-slate-600">
              <div>
                <label className="block text-slate-500 mb-1">Buscar Especialidade</label>
                <select
                  value={specFilter}
                  onChange={e => setSpecFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Todas as especialidades</option>
                  <option value="Cardiologia">Cardiologia</option>
                  <option value="Clínico Geral">Clínico Geral</option>
                  <option value="Endocrinologia">Endocrinologia</option>
                  <option value="Pediatria">Pediatria</option>
                  <option value="Dermatologia">Dermatologia</option>
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

          {/* Minhas consultas cadastradas */}
          {appointments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Próximas Consultas</h3>
              <div className="space-y-3">
                {appointments.slice(0, 3).map(appt => (
                  <div key={appt.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800">{appt.profNome}</span>
                      <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase px-1.5 py-0.25 rounded shrink-0">{appt.status}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{appt.especialidade} • {appt.clinica}</span>
                    <span className="text-blue-600 text-[10px] font-black mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> {appt.data} às {appt.hora}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results - Col 8 */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Profissionais Disponíveis ({filteredProfessionals.length})</h3>

          {loading ? (
            <div className="flex justify-center items-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
          ) : filteredProfessionals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-bold">Nenhum profissional encontrado com os filtros atuais.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProfessionals.map(prof => (
                <div key={prof.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-800 text-sm">{prof.nome}</h4>
                      <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">{prof.especialidade}</span>
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

                  <div className="flex sm:flex-col items-end gap-3 self-stretch sm:self-center pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100/80 justify-between sm:justify-start">
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">A partir de</p>
                      <p className="text-base font-black text-slate-800">R$ {prof.preco.toFixed(2).replace('.', ',')}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setBookingModal(prof);
                        setBookingTime('');
                        setBookingSuccess(false);
                        setBookingPhone(prof.celular || '');
                      }}
                      className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Agendar</span> <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-md font-black text-slate-800">Agendar Minha Consulta</h3>
              <button onClick={() => setBookingModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {!bookingSuccess ? (
              <form onSubmit={handleBookSubmit}>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-blue-200/50 shrink-0 text-blue-600 font-extrabold text-xs">
                      {bookingModal.nome[4]}
                    </div>
                    <div>
                      <p className="text-xs font-black text-blue-900">{bookingModal.nome}</p>
                      <p className="text-[10px] text-blue-700 font-bold uppercase mt-0.5">{bookingModal.especialidade} • {bookingModal.clinica}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Escolher Data *</label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Horários Disponíveis *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map(time => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setBookingTime(time)}
                          className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${bookingTime === time ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
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
                  <button type="button" onClick={() => setBookingModal(null)} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
                  <button type="submit" disabled={bookingLoading} className="flex-1 py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 transition"
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
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Sua consulta com <b>{bookingModal.nome}</b> foi marcada para o dia <b>{new Date(bookingDate).toLocaleDateString('pt-BR')}</b> às <b>{bookingTime}</b>.</p>
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
