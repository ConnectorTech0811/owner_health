import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, CheckCircle2, RefreshCcw, Lock, Unlock, AlertCircle, Users, ArrowLeft, Search } from 'lucide-react';
import { AgendaCalendar } from '../../components/AgendaCalendar';
import { API_URL } from '../../config';

interface AgendaSlot {
  id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: 'livre' | 'agendado' | 'cancelado';
  paciente_nome?: string;
  criado_por: number;
}

interface Bloqueio {
  id: number;
  mes: number;
  ano: number;
  status: string;
  criado_por: number;
}

export function ProfessionalScheduling() {
  const [agendas, setAgendas] = useState<AgendaSlot[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Perfil e Seleção de Médico
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isSecretary = user?.tipo_profissional !== 'medico';
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(isSecretary ? null : 0);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Form State para criação de horários
  const [tipoGeracao, setTipoGeracao] = useState<'unico' | 'recorrente'>('unico');
  const [dataUnica, setDataUnica] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [dataInicio, setDataInicio] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-CA');
  });
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]); // 1 (Seg) a 5 (Sex) por padrão
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('11:00');
  const [duracaoConsulta, setDuracaoConsulta] = useState('30'); // em minutos

  const diasOptions = [
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
    { value: 0, label: 'Dom' },
  ];

  const mesesOptions = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Filtros da tela de seleção de médico
  const [searchDoctorName, setSearchDoctorName] = useState('');
  const [searchDoctorSpec, setSearchDoctorSpec] = useState('');
  const [searchDoctorCrm, setSearchDoctorCrm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (isSecretary || user?.eh_empresa || !user?.tipo_profissional) {
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/api/professionals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const docList = data.filter((p: any) => p.tipo_profissional === 'medico' && p.ativo !== 0);
          setDoctors(docList);
        }
      })
      .catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctorId !== null) {
      fetchData();
    }
  }, [selectedDoctorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [resAgendas, resBloqueios] = await Promise.all([
        fetch(`${API_URL}/api/agendas?profissional_id=${selectedDoctorId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/bloqueios?profissional_id=${selectedDoctorId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (resAgendas.ok) setAgendas(await resAgendas.json());
      if (resBloqueios.ok) setBloqueios(await resBloqueios.json());
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDia = (dia: number) => {
    if (diasSemana.includes(dia)) {
      setDiasSemana(diasSemana.filter(d => d !== dia));
    } else {
      setDiasSemana([...diasSemana, dia]);
    }
  };

  const isDateBlocked = (date: Date) => {
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return bloqueios.some(b => Number(b.mes) === m && Number(b.ano) === y && (b.status === 'bloqueado' || b.status === 'fechado'));
  };

  const isDateStringBlocked = (dateStr: string) => {
    if (!dateStr) return false;
    const [year, month] = dateStr.split('-').map(Number);
    return bloqueios.some(b => Number(b.mes) === month && Number(b.ano) === year && (b.status === 'bloqueado' || b.status === 'fechado'));
  };

  const generateSlots = () => {
    const slots: any[] = [];
    const hoje = new Date();
    const currentDateStr = hoje.toLocaleDateString('en-CA');
    const currentTimeStr = `${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}`;

    if (tipoGeracao === 'unico') {
      if (!dataUnica) return [];
      if (isDateStringBlocked(dataUnica)) return [];

      let horaAtualStr = horaInicio;
      while (horaAtualStr < horaFim) {
        const [h, m] = horaAtualStr.split(':').map(Number);
        const inicioData = new Date();
        inicioData.setHours(h, m, 0);

        const fimData = new Date(inicioData.getTime() + parseInt(duracaoConsulta) * 60000);
        const horaFimStr = `${String(fimData.getHours()).padStart(2, '0')}:${String(fimData.getMinutes()).padStart(2, '0')}`;

        const isPast = dataUnica === currentDateStr && horaAtualStr <= currentTimeStr;

        if (horaFimStr <= horaFim && !isPast) {
          const exists = agendas.some(a => a.data.startsWith(dataUnica) && a.hora_inicio.substring(0, 5) === horaAtualStr);
          if (!exists) {
            slots.push({
              data: dataUnica,
              hora_inicio: horaAtualStr,
              hora_fim: horaFimStr
            });
          }
        }
        horaAtualStr = horaFimStr;
      }
    } else {
      // Recorrente
      if (!dataInicio || !dataFim || dataInicio > dataFim) return [];
      if (diasSemana.length === 0) return [];

      const [yStart, mStart, dStart] = dataInicio.split('-').map(Number);
      const [yEnd, mEnd, dEnd] = dataFim.split('-').map(Number);

      const startDateObj = new Date(yStart, mStart - 1, dStart);
      const endDateObj = new Date(yEnd, mEnd - 1, dEnd);

      const curr = new Date(startDateObj);
      let iterations = 0;

      while (curr <= endDateObj && iterations < 365) {
        const dayOfWeek = curr.getDay(); // 0-6
        if (diasSemana.includes(dayOfWeek) && !isDateBlocked(curr)) {
          const localDateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
          
          let horaAtualStr = horaInicio;
          while (horaAtualStr < horaFim) {
            const [h, m] = horaAtualStr.split(':').map(Number);
            const inicioData = new Date();
            inicioData.setHours(h, m, 0);

            const fimData = new Date(inicioData.getTime() + parseInt(duracaoConsulta) * 60000);
            const horaFimStr = `${String(fimData.getHours()).padStart(2, '0')}:${String(fimData.getMinutes()).padStart(2, '0')}`;

            const isPast = localDateStr === currentDateStr && horaAtualStr <= currentTimeStr;

            if (horaFimStr <= horaFim && !isPast) {
              const exists = agendas.some(a => a.data.startsWith(localDateStr) && a.hora_inicio.substring(0, 5) === horaAtualStr);
              if (!exists) {
                slots.push({
                  data: localDateStr,
                  hora_inicio: horaAtualStr,
                  hora_fim: horaFimStr
                });
              }
            }
            horaAtualStr = horaFimStr;
          }
        }
        curr.setDate(curr.getDate() + 1);
        iterations++;
      }
    }

    return slots;
  };

  const handleCreateAgendas = async () => {
    if (horaInicio >= horaFim) {
      alert('A hora de início deve ser menor que a hora de fim.');
      return;
    }

    if (tipoGeracao === 'unico') {
      if (!dataUnica) {
        alert('Selecione a data para a criação dos horários.');
        return;
      }
      if (isDateStringBlocked(dataUnica)) {
        const [y, m] = dataUnica.split('-').map(Number);
        alert(`Atenção: A agenda de ${mesesOptions[m - 1]}/${y} está fechada/bloqueada para novas marcações.`);
        return;
      }
    } else {
      if (!dataInicio || !dataFim) {
        alert('Selecione o período de início e fim.');
        return;
      }
      if (dataInicio > dataFim) {
        alert('A data de início não pode ser maior que a data de fim.');
        return;
      }
      if (diasSemana.length === 0) {
        alert('Selecione pelo menos um dia da semana para a recorrência.');
        return;
      }
    }

    const slotsToCreate = generateSlots();
    if (slotsToCreate.length === 0) {
      alert('Nenhum novo horário gerado. Verifique se as datas escolhidas não estão bloqueadas ou se os horários já existem.');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const profIdLocal = (isSecretary && selectedDoctorId) ? selectedDoctorId : (localStorage.getItem('profissional_id') || '0'); 
      
      const response = await fetch(`${API_URL}/api/agendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ profissional_id: profIdLocal, slots: slotsToCreate })
      });

      if (response.ok) {
        setSuccessMsg(`✅ ${slotsToCreate.length} horários criados com sucesso!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchData();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Erro ao gerar horários.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar ao servidor.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir este horário?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/agendas/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDaySlots = async (dateStr: string) => {
    const slotsToDelete = agendas.filter(a => a.data.startsWith(dateStr) && a.status === 'livre');
    if (slotsToDelete.length === 0) return;
    if (!window.confirm(`Excluir todos os ${slotsToDelete.length} horários livres do dia?`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        slotsToDelete.map(slot => 
          fetch(`${API_URL}/api/agendas/${slot.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }})
        )
      );
      fetchData();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleBookPatient = async (id: number) => {
    const pacienteNome = window.prompt('Digite o nome do paciente para agendar:');
    if (!pacienteNome || pacienteNome.trim() === '') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/agendas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'agendado', paciente_nome: pacienteNome })
      });
      
      if (response.ok) {
        fetchData();
      } else {
        alert('Erro ao agendar paciente.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao agendar paciente.');
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/agendas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'livre', paciente_nome: null })
      });
      
      if (response.ok) {
        fetchData();
      } else {
        alert('Erro ao cancelar agendamento.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao cancelar agendamento.');
    }
  };

  const toggleMonthLock = async (mes: number, ano: number, bloqueioExistente?: Bloqueio) => {
    try {
      const token = localStorage.getItem('token');
      const profIdLocal = (isSecretary && selectedDoctorId) ? selectedDoctorId : (localStorage.getItem('profissional_id') || '0');

      if (bloqueioExistente) {
        if (!window.confirm(`Deseja ABRIR a agenda de ${mesesOptions[mes-1]}/${ano}?`)) return;
        const res = await fetch(`${API_URL}/api/bloqueios/${bloqueioExistente.id}/abrir`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Erro ao abrir agenda.');
          return;
        }
      } else {
        if (!window.confirm(`Deseja FECHAR a agenda de ${mesesOptions[mes-1]}/${ano}?`)) return;
        const res = await fetch(`${API_URL}/api/bloqueios/fechar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ profissional_id: profIdLocal, mes, ano })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Erro ao fechar agenda.');
          return;
        }
      }
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao processar solicitação de bloqueio.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Geração da lista de meses futuros para bloqueio
  const futureMonths = [];
  const currentDate = new Date();
  for (let i = 0; i < 6; i++) {
    futureMonths.push({ mes: currentDate.getMonth() + 1, ano: currentDate.getFullYear() });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  if (isSecretary && selectedDoctorId === null) {
    const filteredDoctors = doctors.filter(doc => {
      const matchName = !searchDoctorName.trim() || doc.nome.toLowerCase().includes(searchDoctorName.toLowerCase().trim());
      const matchSpec = !searchDoctorSpec || (doc.especialidade || 'Clínico Geral').toLowerCase().includes(searchDoctorSpec.toLowerCase());
      const matchCrm = !searchDoctorCrm.trim() || (doc.numero_conselho && doc.numero_conselho.toLowerCase().includes(searchDoctorCrm.toLowerCase().trim()));
      return matchName && matchSpec && matchCrm;
    });

    const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage) || 1;
    const paginatedDoctors = filteredDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Selecione o Médico</h1>
          <p className="text-slate-500 text-sm">Escolha um médico da clínica para visualizar e gerenciar sua agenda.</p>
        </div>

        {/* Filtros de Busca Avançados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca por Nome por Aproximação */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Buscar por Nome do Médico</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchDoctorName}
                  onChange={e => { setSearchDoctorName(e.target.value); setCurrentPage(1); }}
                  placeholder="Digite para buscar..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Filtro por Especialidade */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Especialidade</label>
              <select
                value={searchDoctorSpec}
                onChange={e => { setSearchDoctorSpec(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todas as Especialidades</option>
                <option value="Clínico Geral">Clínico Geral</option>
                <option value="Cardiologia">Cardiologia</option>
                <option value="Dermatologia">Dermatologia</option>
                <option value="Endocrinologia">Endocrinologia</option>
                <option value="Fisioterapia">Fisioterapia</option>
                <option value="Gastroenterologia">Gastroenterologia</option>
                <option value="Ginecologia">Ginecologia</option>
                <option value="Neurologia">Neurologia</option>
                <option value="Nutrição">Nutrição</option>
                <option value="Oftalmologia">Oftalmologia</option>
                <option value="Ortopedia">Ortopedia</option>
                <option value="Pediatria">Pediatria</option>
                <option value="Psicologia">Psicologia</option>
                <option value="Psiquiatria">Psiquiatria</option>
              </select>
            </div>

            {/* Filtro por CRM / Conselho */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">CRM / Conselho</label>
              <input
                type="text"
                value={searchDoctorCrm}
                onChange={e => { setSearchDoctorCrm(e.target.value); setCurrentPage(1); }}
                placeholder="Ex: CRM 123456"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {(searchDoctorName || searchDoctorSpec || searchDoctorCrm) && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => { setSearchDoctorName(''); setSearchDoctorSpec(''); setSearchDoctorCrm(''); setCurrentPage(1); }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Grid de Cards de Médicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedDoctors.map(doc => {
            const valorConsulta = doc.valor_consulta ? parseFloat(doc.valor_consulta) : 150;
            return (
              <div 
                key={doc.id} 
                onClick={() => setSelectedDoctorId(doc.id)}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition cursor-pointer flex flex-col items-center text-center gap-4 group relative overflow-hidden"
              >
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                  <Users className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{doc.nome}</h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">
                    {doc.especialidade || 'Clínico Geral'} • {doc.numero_conselho || 'CRM: -'}
                  </p>
                  <div className="mt-2 inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-700 border border-slate-200">
                    Valor da Consulta: <span className="text-indigo-600 font-extrabold">R$ {valorConsulta.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <button className="mt-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-5 py-2.5 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition shadow-xs">
                  Gerenciar Agenda
                </button>
              </div>
            );
          })}

          {filteredDoctors.length === 0 && (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-sm font-bold text-slate-600">Nenhum médico encontrado com os filtros aplicados.</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca por nome, especialidade ou CRM.</p>
            </div>
          )}
        </div>

        {/* Pagtinação da Lista de Médicos */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredDoctors.length)} de {filteredDoctors.length} médicos
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer"
              >
                Anterior
              </button>
              <span className="text-xs font-extrabold text-slate-700 px-2">
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div>
        <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
          <div className="flex items-center gap-4">
            {isSecretary && (
              <button onClick={() => setSelectedDoctorId(null)} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-600 cursor-pointer" title="Trocar Médico">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-800">
              {isSecretary ? `Agenda de ${selectedDoctor?.nome || 'Médico'}` : 'Minha Agenda Profissional'}
            </h1>
          </div>

          {isSecretary && doctors.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Selecionar Médico:</span>
              <select
                value={selectedDoctorId || ''}
                onChange={e => setSelectedDoctorId(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nome} {d.numero_conselho ? `(${d.numero_conselho})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="text-slate-500">Configure horários de atendimento, disponibilidades e bloqueios mensais.</p>
      </div>

      {/* CARD 1 (PRIMEIRO CARD): AGENDA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {isSecretary
                ? (selectedDoctor ? `Agenda do Médico - ${selectedDoctor.nome}` : 'Agenda do Médico')
                : 'Minha agenda'}
            </h2>
            <p className="text-sm text-slate-500">
              {isSecretary ? 'Acompanhe a disponibilidade e marcações do médico' : 'Acompanhe sua disponibilidade e marcações'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400">Carregando agenda...</div>
        ) : (
          <AgendaCalendar 
            agendas={agendas} 
            bloqueios={bloqueios} 
            onDeleteSlot={handleDelete}
            onBookSlot={handleBookPatient}
            onCancelBooking={handleCancelBooking}
            onDeleteDaySlots={handleDeleteDaySlots}
            isSecretary={isSecretary}
          />
        )}
      </div>

      {/* CARD 2: PAINEL DE BLOQUEIOS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Lock size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Controle de Abertura de Agenda</h2>
            <p className="text-sm text-slate-500">Feche ou abra meses inteiros para novas marcações</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {futureMonths.map((fm, idx) => {
            const bloqueio = bloqueios.find(b => b.mes === fm.mes && b.ano === fm.ano);
            const isBlocked = !!bloqueio;
            const isRequested = bloqueio?.status === 'desbloqueio_solicitado';

            return (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                  isBlocked ? 'bg-red-50/50 border-red-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="font-bold text-slate-700">{mesesOptions[fm.mes - 1]}</span>
                <span className="text-xs text-slate-400 font-medium">{fm.ano}</span>
                
                <button
                  onClick={() => toggleMonthLock(fm.mes, fm.ano, bloqueio)}
                  className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold w-full flex items-center justify-center gap-1.5 ${
                    isBlocked 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                  }`}
                >
                  {isBlocked ? (
                    isRequested ? <><AlertCircle size={14}/> Solicitado</> : <><Lock size={14} /> Fechado</>
                  ) : (
                    <><Unlock size={14} /> Aberto</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CARD 3: GERADOR DE HORÁRIOS (DATAS E HORARIOS) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <RefreshCcw size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Datas e horarios</h2>
              <p className="text-sm text-slate-500">Configure horários de atendimento para um dia único ou de forma recorrente</p>
            </div>
          </div>

          {/* SELETOR DE MODO: DIA ÚNICO / RECORRENTE */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTipoGeracao('unico')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                tipoGeracao === 'unico'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dia Único
            </button>
            <button
              onClick={() => setTipoGeracao('recorrente')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                tipoGeracao === 'recorrente'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recorrente
            </button>
          </div>
        </div>

        <div className="space-y-6 mb-6">
          {/* MODO DIA ÚNICO */}
          {tipoGeracao === 'unico' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
                <input
                  type="date"
                  value={dataUnica}
                  onChange={e => setDataUnica(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Horário Início</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Horário Fim</label>
                <input
                  type="time"
                  value={horaFim}
                  onChange={e => setHoraFim(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Duração da Consulta</label>
                <select
                  value={duracaoConsulta}
                  onChange={e => setDuracaoConsulta(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium text-slate-800"
                >
                  <option value="15">15 min</option>
                  <option value="20">20 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hora</option>
                </select>
              </div>
            </div>
          ) : (
            /* MODO RECORRENTE */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Horário Início</label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={e => setHoraInicio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Horário Fim</label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={e => setHoraFim(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Duração</label>
                  <select
                    value={duracaoConsulta}
                    onChange={e => setDuracaoConsulta(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium text-slate-800"
                  >
                    <option value="15">15 min</option>
                    <option value="20">20 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hora</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Dias da Semana</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {diasOptions.map(dia => {
                    const isSelected = diasSemana.includes(dia.value);
                    return (
                      <button
                        key={dia.value}
                        type="button"
                        onClick={() => handleToggleDia(dia.value)}
                        className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30'
                        }`}
                      >
                        {dia.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleCreateAgendas}
          disabled={creating}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {creating ? 'Salvando...' : <><Plus size={20} /> Gerar Horários</>}
        </button>
        {successMsg && <p className="mt-4 text-emerald-600 font-medium flex items-center gap-2"><CheckCircle2 size={18} /> {successMsg}</p>}
      </div>
    </div>
  );
}
