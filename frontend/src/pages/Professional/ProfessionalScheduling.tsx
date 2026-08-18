import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, CheckCircle2, RefreshCcw, Lock, Unlock, AlertCircle, Users, ArrowLeft, Search, X, ShieldCheck, Loader2 } from 'lucide-react';
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
  const [tokenModal, setTokenModal] = useState<{
    agendaId: number;
    loading: boolean;
    validating: boolean;
    paciente: any;
    inputToken: string;
    error: string | null;
  } | null>(null);
  const [agendaTab, setAgendaTab] = useState<'calendar' | 'history'>('calendar');
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyStatusFilter]);

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

  const handleCompleteSlot = async (id: number) => {
    setTokenModal({
      agendaId: id,
      loading: true,
      validating: false,
      paciente: null,
      inputToken: '',
      error: null
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/agendas/${id}/request-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTokenModal({
          agendaId: id,
          loading: false,
          validating: false,
          paciente: data.paciente,
          inputToken: '',
          error: null
        });
      } else {
        alert(data.error || 'Erro ao enviar código de validação para o paciente.');
        setTokenModal(null);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao conectar com o servidor.');
      setTokenModal(null);
    }
  };

  const handleConfirmTokenValidation = async () => {
    if (!tokenModal || !tokenModal.inputToken.trim()) {
      setTokenModal(prev => prev ? { ...prev, error: 'Por favor, digite o Token informado pelo paciente.' } : null);
      return;
    }

    setTokenModal(prev => prev ? { ...prev, validating: true, error: null } : null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/agendas/${tokenModal.agendaId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: tokenModal.inputToken })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('✅ Atendimento validado e concluído com sucesso com o token do paciente!');
        setTokenModal(null);
        fetchData();
      } else {
        setTokenModal(prev => prev ? {
          ...prev,
          validating: false,
          error: data.error || 'Token incorreto. Solicite o código correto ao paciente.'
        } : null);
      }
    } catch (e) {
      console.error(e);
      setTokenModal(prev => prev ? { ...prev, validating: false, error: 'Erro ao conectar ao servidor.' } : null);
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

      {/* CARD 1 (PRIMEIRO CARD): AGENDA E HISTÓRICO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {isSecretary
                  ? (selectedDoctor ? `Agenda do Médico - ${selectedDoctor.nome}` : 'Agenda do Médico')
                  : 'Minha agenda profissional'}
              </h2>
              <p className="text-sm text-slate-500">
                {isSecretary ? 'Acompanhe a disponibilidade e marcações do médico' : 'Acompanhe sua disponibilidade e histórico de atendimentos'}
              </p>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setAgendaTab('calendar')}
              className={`px-4 py-2 text-xs font-extrabold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                agendaTab === 'calendar' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon size={14} /> Agenda Ativa
            </button>

            <button
              onClick={() => setAgendaTab('history')}
              className={`px-4 py-2 text-xs font-extrabold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                agendaTab === 'history' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={14} /> Histórico de Consultas
            </button>
          </div>
        </div>

        {/* CONTEÚDO DA ABA 1: AGENDA (CALENDÁRIO) */}
        {agendaTab === 'calendar' && (
          loading ? (
            <div className="text-center py-10 text-slate-400">Carregando agenda...</div>
          ) : (
            <AgendaCalendar 
              agendas={agendas} 
              bloqueios={bloqueios} 
              onDeleteSlot={handleDelete}
              onBookSlot={handleBookPatient}
              onCancelBooking={handleCancelBooking}
              onCompleteSlot={handleCompleteSlot}
              onDeleteDaySlots={handleDeleteDaySlots}
              isSecretary={isSecretary}
            />
          )
        )}

        {/* CONTEÚDO DA ABA 2: HISTÓRICO DE CONSULTAS */}
        {agendaTab === 'history' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filtros do Histórico */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar histórico por nome do paciente..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0">Filtrar por Status:</span>
                <select
                  value={historyStatusFilter}
                  onChange={e => setHistoryStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Todas as Consultas</option>
                  <option value="concluido">🟢 Concluídas</option>
                  <option value="pendente">🟠 Pendentes / Não Concluídas</option>
                  <option value="agendado">🔵 Agendadas Futuras</option>
                  <option value="cancelado">🔴 Canceladas</option>
                </select>
              </div>
            </div>

            {/* Tabela do Histórico */}
            {(() => {
              const filtered = agendas.filter((a: any) => {
                if (a.status === 'livre' && !a.paciente_nome) return false;
                if (historySearch.trim()) {
                  const q = historySearch.toLowerCase();
                  if (!(a.paciente_nome || '').toLowerCase().includes(q)) return false;
                }

                if (historyStatusFilter === 'concluido') return a.status === 'concluido' || a.status === 'Concluída';
                if (historyStatusFilter === 'cancelado') return a.status === 'cancelado';
                if (historyStatusFilter === 'agendado') return a.status === 'agendado';
                if (historyStatusFilter === 'pendente') {
                  const now = new Date();
                  const todayIso = now.toLocaleDateString('en-CA');
                  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  const rawDate = a.data ? String(a.data).substring(0, 10) : '';
                  return a.status === 'agendado' && (rawDate < todayIso || (rawDate === todayIso && (a.hora_inicio || '').substring(0, 5) < currentTime));
                }
                return true;
              });

              const historyPageSize = 10;
              const totalHistoryPages = Math.ceil(filtered.length / historyPageSize) || 1;
              const safeHistoryPage = Math.min(Math.max(historyPage, 1), totalHistoryPages);
              const paginatedHistory = filtered.slice((safeHistoryPage - 1) * historyPageSize, safeHistoryPage * historyPageSize);

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-xs font-bold text-slate-500">Nenhuma consulta encontrada no histórico.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">Data & Hora</th>
                          <th className="p-3">Paciente</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Token Validação</th>
                          <th className="p-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {paginatedHistory.map((a: any) => {
                          const rawDate = a.data ? String(a.data).substring(0, 10) : '';
                          const [y, m, d] = rawDate.split('-');
                          const ptBrDate = d && m && y ? `${d}/${m}/${y}` : rawDate;

                          const isConcluido = a.status === 'concluido' || a.status === 'Concluída';
                          const isCancelado = a.status === 'cancelado';

                          const now = new Date();
                          const todayIso = now.toLocaleDateString('en-CA');
                          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                          const isPendente = a.status === 'agendado' && (rawDate < todayIso || (rawDate === todayIso && (a.hora_inicio || '').substring(0, 5) < currentTime));

                          let statusBadge = <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">Agendada</span>;
                          if (isConcluido) statusBadge = <span className="bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">🟢 Concluída</span>;
                          if (isPendente) statusBadge = <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">🟠 Pendente</span>;
                          if (isCancelado) statusBadge = <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">🔴 Cancelada</span>;

                          return (
                            <tr key={a.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 font-extrabold text-slate-800">
                                {ptBrDate} às {(a.hora_inicio || '09:00').substring(0, 5)}
                              </td>
                              <td className="p-3">
                                {a.cliente_id ? (
                                  <a
                                    href={`/professional/patients/${a.cliente_id}`}
                                    className="font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                                  >
                                    {a.paciente_nome || 'Paciente'}
                                  </a>
                                ) : (
                                  <span>{a.paciente_nome || 'Paciente sem cadastro'}</span>
                                )}
                              </td>
                              <td className="p-3">{statusBadge}</td>
                              <td className="p-3 font-mono text-[11px] text-purple-900 font-bold">
                                {a.token_confirmacao ? <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{a.token_confirmacao}</span> : '-'}
                              </td>
                              <td className="p-3 text-right">
                                {a.cliente_id ? (
                                  <a
                                    href={`/professional/patients/${a.cliente_id}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition"
                                  >
                                    Prontuário 📋
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold">Sem Prontuário</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Controles de Paginação */}
                  {totalHistoryPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500">
                        Exibindo {(safeHistoryPage - 1) * historyPageSize + 1} a {Math.min(safeHistoryPage * historyPageSize, filtered.length)} de {filtered.length} consultas
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                          disabled={safeHistoryPage === 1}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                          {safeHistoryPage} / {totalHistoryPages}
                        </span>

                        <button
                          onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                          disabled={safeHistoryPage === totalHistoryPages}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* MODAL DE VALIDAÇÃO DE TOKEN DO PACIENTE */}
      {tokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-fadeIn border border-slate-100 relative">
            <button
              onClick={() => setTokenModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
              <ShieldCheck size={32} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-800">Aguardando Token do Paciente</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                O código de confirmação foi enviado para o paciente via E-mail e Notificação no Sistema. Solicite o token ao paciente para validar e concluir este atendimento.
              </p>
            </div>

            {tokenModal.loading ? (
              <div className="flex flex-col items-center py-6 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-xs font-bold text-slate-500">Enviando token ao paciente...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <p className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Paciente:</span>
                    <b className="text-slate-900">{tokenModal.paciente?.nome}</b>
                  </p>
                  <p className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>E-mail do Paciente:</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      📧 {tokenModal.paciente?.email || 'Notificado por E-mail'}
                    </span>
                  </p>
                  <p className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Notificação na Plataforma:</span>
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      🔔 Enviado no App
                    </span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-slate-500">
                    Digite o Token/Código Fornecido pelo Paciente:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CONF-W61EE5 ou W61EE5"
                    value={tokenModal.inputToken}
                    onChange={e => setTokenModal(prev => prev ? { ...prev, inputToken: e.target.value, error: null } : null)}
                    className="w-full text-center tracking-widest font-black text-lg py-3 bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-xl outline-none transition uppercase shadow-xs text-indigo-900"
                    autoFocus
                  />
                </div>

                {tokenModal.error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                    <AlertCircle size={16} /> {tokenModal.error}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleConfirmTokenValidation}
                    disabled={tokenModal.validating || !tokenModal.inputToken.trim()}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {tokenModal.validating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Validando Token...</>
                    ) : (
                      <><CheckCircle2 size={16} /> Validar & Concluir Consulta</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCompleteSlot(tokenModal.agendaId)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer text-center"
                  >
                    🔄 Reenviar E-mail e Notificação
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
