import React, { useState, useEffect } from 'react';
import {
  Search, FlaskConical, Pill, Scale, FileText,
  ShieldAlert, ShieldCheck, Download, Calendar, Users, Plus, ArrowLeft,
  Trash2, UserMinus, UserCheck, AlertTriangle, ChevronLeft, ChevronRight,
  Filter, XCircle, List, LayoutGrid, Eye, X, MessageSquare, Loader2, Check
} from 'lucide-react';
import { API_URL } from '../../config';
import { PatientRegistrationModal } from '../../components/PatientRegistrationModal';
import { PatientAnamnesisCustomizerModal } from './PatientAnamnesisCustomizerModal';
import { SearchableSelect } from '../../components/SearchableSelect';

const formatDatePtBr = (dateStr?: string | null) => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return 'Não informada';
  const str = dateStr.trim();
  if (str.includes('/')) return str;
  const rawDate = str.split('T')[0];
  const parts = rawDate.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y && m && d && y.length === 4) {
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  try {
    const p = new Date(str);
    if (!isNaN(p.getTime())) return p.toLocaleDateString('pt-BR');
  } catch {}
  return dateStr;
};

export const CompanyPatientData: React.FC = () => {
  const [error, setError] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('anamnesis'); // anamnesis, exams, prescriptions, bioimpedance
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);

  const [anamnesisPage, setAnamnesisPage] = useState(1);
  const [viewAnamnesisModal, setViewAnamnesisModal] = useState<any>(null);
  const [viewingDocModal, setViewingDocModal] = useState<{ url: string; title: string } | null>(null);

  const [filterNome, setFilterNome] = useState('');
  const [filterCpf, setFilterCpf] = useState('');
  const [filterCelular, setFilterCelular] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [quickFilter, setQuickFilter] = useState<'all' | 'ativo' | 'inativo' | 'com_acesso'>('all');
  const [showAllOverride, setShowAllOverride] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterNome, filterCpf, filterCelular, filterStatus, quickFilter]);

  const [deletePatientModal, setDeletePatientModal] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedPatientForGrant, setSelectedPatientForGrant] = useState<any>(null);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [allAccesses, setAllAccesses] = useState<any[]>([]);
  const [granting, setGranting] = useState(false);
  const [grantSuccessMsg, setGrantSuccessMsg] = useState('');

  // Estado para a aba de Histórico & Observações Médicas
  const [observationsData, setObservationsData] = useState<{
    observations: any[];
    pode_adicionar: boolean;
    doctor_id: number | null;
    doctor_nome: string | null;
    doctor_especialidade: string | null;
  }>({ observations: [], pode_adicionar: false, doctor_id: null, doctor_nome: null, doctor_especialidade: null });

  const [newObsText, setNewObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const companyId = user.empresa_id || user.id;

  // Identificar perfil exato de quem está liberando
  const perfilLiberacao = (user.tipo === 'admin' || user.role === 'admin' || user.eh_admin || user.tipo_profissional === 'administrativo')
    ? 'administrativo'
    : 'clinica';

  const fetchPatients = () => {
    fetch(`${API_URL}/api/clients?incluir_inativos=true`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPatientsList(data);
      })
      .catch(console.error);
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/professionals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDoctorsList(data.filter((p: any) => p.tipo_profissional === 'medico'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllAccesses = async () => {
    try {
      const res = await fetch(`${API_URL}/api/access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllAccesses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchPatients();
    fetchAllAccesses();
    fetchDoctors();

    // Sincronização automática em tempo real a cada 5 segundos
    const interval = setInterval(() => {
      fetchPatients();
      fetchAllAccesses();
    }, 5000);

    const params = new URLSearchParams(window.location.search);
    let targetParam = params.get('cpf') || params.get('query') || params.get('id') || params.get('cliente_id');
    
    if (!targetParam) {
      const pathParts = window.location.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== 'patients' && !isNaN(Number(lastPart))) {
        targetParam = lastPart;
      }
    }

    if (targetParam) {
      loadPatientByCpf(targetParam);
    }

    return () => clearInterval(interval);
  }, []);

  const handleGrantAccess = async () => {
    if (!selectedPatientForGrant || !selectedDoctorId) {
      alert('Selecione o paciente e o médico.');
      return;
    }

    const chosenDoctor = doctorsList.find(d => d.id === parseInt(selectedDoctorId));
    const doctorName = chosenDoctor ? chosenDoctor.nome : 'o médico';

    setGranting(true);
    setGrantSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/api/access/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cliente_id: selectedPatientForGrant.id,
          medico_id: parseInt(selectedDoctorId),
          concedido_por: perfilLiberacao
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao liberar acesso');
      
      setGrantSuccessMsg(`Prontuário liberado para Dr(a). ${doctorName}!`);
      setSelectedDoctorId('');
      fetchAllAccesses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAccess = async (medicoId: number, pacienteId: number) => {
    if (!confirm('Deseja revogar o acesso deste médico ao prontuário?')) return;
    try {
      const res = await fetch(`${API_URL}/api/access/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cliente_id: pacienteId,
          medico_id: medicoId
        })
      });
      if (res.ok) {
        fetchAllAccesses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (patient: any, newStatus: 'ativo' | 'inativo') => {
    try {
      const res = await fetch(`${API_URL}/api/clients/${patient.id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchPatients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePatientConfirmed = async () => {
    if (!deletePatientModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/clients/${deletePatientModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDeletePatientModal(null);
        fetchPatients();
        fetchAllAccesses();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir paciente');
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão ao excluir paciente');
    } finally {
      setDeleting(false);
    }
  };

  const fetchObservations = async (clienteId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/clients/${clienteId}/observations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setObservationsData(data);
    } catch (e) {
      console.error('Erro ao carregar observações:', e);
    }
  };

  const handleSaveObservation = async () => {
    if (!newObsText.trim() || !patientData?.patient?.id) return;
    setSavingObs(true);
    try {
      const res = await fetch(`${API_URL}/api/clients/${patientData.patient.id}/observations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ observacao: newObsText.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setNewObsText('');
        fetchObservations(patientData.patient.id);
        alert('Observação médica registrada com sucesso!');
      } else {
        alert(data.error || 'Erro ao registrar observação.');
      }
    } catch (e: any) {
      alert('Erro ao conectar com o servidor.');
    } finally {
      setSavingObs(false);
    }
  };

  const loadPatientByCpf = async (cpf: string) => {
    setError('');
    setPatientData(null);
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/patient-data/${cpf}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar prontuário.');
      setPatientData(data);
      if (data?.patient?.id) {
        fetchObservations(data.patient.id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Funções para normalização e filtragem dinâmica aproximada
  const normalizeText = (text?: string | null) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const normalizeDigits = (text?: string | null) => {
    if (!text) return '';
    return text.replace(/\D/g, '');
  };

  const isDoctor = user.tipo_profissional === 'medico';

  const totalCadastrados = patientsList.length;
  const totalAtivos = patientsList.filter(p => p.status !== 'inativo').length;
  const totalInativos = patientsList.filter(p => p.status === 'inativo').length;
  const totalComAcesso = new Set(allAccesses.map(a => a.cliente_id)).size;

  const filteredPatients = patientsList.filter(p => {
    if (isDoctor && p.status === 'inativo') return false;

    if (quickFilter === 'ativo' && p.status === 'inativo') return false;
    if (quickFilter === 'inativo' && p.status !== 'inativo') return false;
    if (quickFilter === 'com_acesso') {
      const hasAccess = allAccesses.some(a => a.cliente_id === p.id);
      if (!hasAccess) return false;
    }

    const nomeNorm = normalizeText(p.nome);
    const filterNomeNorm = normalizeText(filterNome.trim());
    const matchName = !filterNomeNorm || nomeNorm.includes(filterNomeNorm);

    const cpfDigits = normalizeDigits(p.cpf);
    const filterCpfDigits = normalizeDigits(filterCpf);
    const matchCpf = !filterCpf.trim() || cpfDigits.includes(filterCpfDigits) || (p.cpf && p.cpf.toLowerCase().includes(filterCpf.toLowerCase().trim()));

    const celDigits = normalizeDigits(p.celular);
    const filterCelDigits = normalizeDigits(filterCelular);
    const matchCelular = !filterCelular.trim() || celDigits.includes(filterCelDigits) || (p.celular && p.celular.toLowerCase().includes(filterCelular.toLowerCase().trim()));

    return matchName && matchCpf && matchCelular;
  });

  const hasSearchQuery = Boolean(filterNome.trim() || filterCpf.trim() || filterCelular.trim());
  const hasCustomFilter = quickFilter !== 'all' || (user.tipo_profissional !== 'medico' && filterStatus === 'inativo');
  const hasActiveFilter = hasSearchQuery || hasCustomFilter || showAllOverride;

  const totalPages = Math.ceil(filteredPatients.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPatients = filteredPatients.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Gerenciamento de Pacientes</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Visão macro da clínica e acesso a prontuários e exames de pacientes.
          </p>
        </div>

        {user.tipo_profissional !== 'medico' && !patientData && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchDoctors(); setShowGrantModal(true); }}
              className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border border-amber-200 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Acesso ao Médico</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Paciente</span>
            </button>
          </div>
        )}
      </div>

      {/* CARDS DE VISÃO MACRO (KPIs) */}
      {!patientData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => { setQuickFilter('all'); setShowAllOverride(true); }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
              quickFilter === 'all' && showAllOverride
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                : 'bg-white border-slate-200 hover:border-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cadastrados</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800">{totalCadastrados}</span>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                Total Base
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Pacientes cadastrados na clínica</p>
          </div>

          <div 
            onClick={() => { setQuickFilter('ativo'); setShowAllOverride(true); }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
              quickFilter === 'ativo'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pacientes Ativos</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800">{totalAtivos}</span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                Habilitados
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Prontuários e consultas ativas</p>
          </div>

          <div 
            onClick={() => { setQuickFilter('inativo'); setShowAllOverride(true); }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
              quickFilter === 'inativo'
                ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inativos</span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <UserMinus className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800">{totalInativos}</span>
              <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                Arquivados
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Pacientes desabilitados</p>
          </div>

          {user.tipo_profissional !== 'medico' && (
            <div 
              onClick={() => { setQuickFilter('com_acesso'); setShowAllOverride(true); }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                quickFilter === 'com_acesso'
                  ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acesso a Médicos</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-800">{totalComAcesso}</span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Compartilhados
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Prontuários vinculados a médicos</p>
            </div>
          )}
        </div>
      )}

      {/* PAINEL DE BUSCA E FILTROS */}
      {!patientData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>Barra de Busca e Filtros de Pacientes</span>
            </h3>
            {hasActiveFilter && (
              <button
                onClick={() => {
                  setFilterNome('');
                  setFilterCpf('');
                  setFilterCelular('');
                  setQuickFilter('all');
                  setFilterStatus('ativo');
                  setShowAllOverride(false);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2 md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome do Paciente</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Digite o nome do paciente..."
                  value={filterNome}
                  onChange={e => setFilterNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">CPF do Paciente</label>
              <input
                type="text"
                placeholder="Digite o CPF..."
                value={filterCpf}
                onChange={e => setFilterCpf(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Celular / Telefone</label>
              <input
                type="text"
                placeholder="Digite o celular..."
                value={filterCelular}
                onChange={e => setFilterCelular(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Pílulas de Filtro Rápido */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtro Rápido:</span>
            </span>
            
            <button
              onClick={() => { setQuickFilter('all'); setShowAllOverride(true); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                quickFilter === 'all' && showAllOverride
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({totalCadastrados})
            </button>

            <button
              onClick={() => { setQuickFilter('ativo'); setShowAllOverride(true); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                quickFilter === 'ativo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ativos ({totalAtivos})
            </button>

            {user.tipo_profissional !== 'medico' && (
              <button
                onClick={() => { setQuickFilter('inativo'); setShowAllOverride(true); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  quickFilter === 'inativo'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Inativos ({totalInativos})
              </button>
            )}

            {user.tipo_profissional !== 'medico' && (
              <button
                onClick={() => { setQuickFilter('com_acesso'); setShowAllOverride(true); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  quickFilter === 'com_acesso'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Com Acesso Médico ({totalComAcesso})
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-xs font-bold mt-2 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* PAINEL INICIAL: MODO BUSCA PRIMEIRO (SEARCH-FIRST) */}
      {!patientData && !hasActiveFilter && (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Search className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-black text-slate-800">Busca de Pacientes</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Digite o Nome, CPF ou Celular na barra de busca acima ou selecione uma das categorias acima para visualizar a lista de pacientes.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setShowAllOverride(true)}
className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition cursor-pointer"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Exibir Todos os {totalCadastrados} Pacientes</span>
            </button>
          </div>
        </div>
      )}

      {/* LISTAGEM DE PACIENTES FILTRADOS */}
      {!patientData && hasActiveFilter && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-800">
                {quickFilter === 'inativo' ? 'Pacientes Inativos' : 'Resultados da Busca'}
              </h3>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Seletor de Modo de Exibição (Tabela vs Cards) */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Exibir em formato de Tabela / Lista"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Tabela</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Exibir em formato de Cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              {totalPages > 1 && (
                <span className="text-xs text-slate-500 font-semibold hidden md:inline">
                  Página {safeCurrentPage} de {totalPages}
                </span>
              )}
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">
              Nenhum paciente encontrado para os filtros e critérios informados.
            </p>
          ) : (
            <>
              {/* MODO TABELA (PADRÃO COMPACTO E ELEGANTE) */}
              {viewMode === 'table' ? (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Paciente</th>
                        <th className="py-3.5 px-4">CPF / Contato</th>
                        <th className="py-3.5 px-4">Médicos com Acesso</th>
                        <th className="py-3.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedPatients.map(p => {
                        const pAccesses = allAccesses.filter(a => a.cliente_id === p.id);
                        const hasAccess = pAccesses.length > 0;
                        const isDoc = user.tipo_profissional === 'medico';
                        const initials = p.nome ? p.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'P';

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0 border border-indigo-200">
                                  {initials}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-sm">{p.nome}</span>
                                    {p.status === 'inativo' && (
                                      <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md uppercase">
                                        Inativo
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-700">{p.cpf || 'CPF não informado'}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{p.celular || 'Sem telefone'}</p>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {hasAccess ? (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {pAccesses.map(acc => (
                                    <span key={acc.id} className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                      Dr(a). {acc.medico_nome}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">Sem acesso concedido</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => loadPatientByCpf(p.cpf)}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                  title="Ver Prontuário"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Prontuário</span>
                                </button>

                                {!isDoc && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedPatientForGrant(p);
                                        fetchDoctors();
                                        setShowGrantModal(true);
                                      }}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border ${
                                        hasAccess
                                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                      }`}
                                      title="Liberar Acesso a Médico"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Acesso</span>
                                    </button>

                                    {p.status === 'inativo' ? (
                                      <button
                                        onClick={() => handleToggleStatus(p, 'ativo')}
                                        className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                        title="Reativar Paciente"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleToggleStatus(p, 'inativo')}
                                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                        title="Inativar Paciente"
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      onClick={() => setDeletePatientModal(p)}
                                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                      title="Excluir Paciente"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* MODO CARDS */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedPatients.map(p => {
                    const pAccesses = allAccesses.filter(a => a.cliente_id === p.id);
                    const hasAccess = pAccesses.length > 0;
                    const isDoc = user.tipo_profissional === 'medico';

                    return (
                      <div key={p.id} className="border border-slate-150 p-4 rounded-xl hover:shadow-md transition bg-slate-50 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800">{p.nome}</h4>
                            {!isDoc && (
                              <div className="flex items-center gap-1.5">
                                {p.status === 'inativo' && (
                                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                    INATIVO
                                  </span>
                                )}
                                {hasAccess && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                                    {pAccesses.length} médico(s)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">CPF: {p.cpf || 'Não informado'}</p>
                          <p className="text-xs text-slate-500">Cel: {p.celular || 'Não informado'}</p>

                          {!isDoc && hasAccess && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1">
                              <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Médicos com Acesso:</span>
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {pAccesses.map(acc => (
                                  <span key={acc.id} className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                    Dr(a). {acc.medico_nome}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => loadPatientByCpf(p.cpf)}
                            className="w-full py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition cursor-pointer"
                          >
                            Ver Prontuário
                          </button>

                          {!isDoc && (
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  setSelectedPatientForGrant(p);
                                  fetchDoctors();
                                  setShowGrantModal(true);
                                }}
                                className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                                  hasAccess
                                    ? 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                                    : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                }`}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Acesso ao Médico
                              </button>

                              <div className="flex items-center gap-2">
                                {p.status === 'inativo' ? (
                                  <button
                                    onClick={() => handleToggleStatus(p, 'ativo')}
                                    className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <UserCheck size={13} />
                                    Reativar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleStatus(p, 'inativo')}
                                    className="flex-1 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <UserMinus size={13} />
                                    Inativar
                                  </button>
                                )}

                                <button
                                  onClick={() => setDeletePatientModal(p)}
                                  className="py-1.5 px-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                  title="Excluir Paciente"
                                >
                                  <Trash2 size={13} />
                                  Excluir
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-500">
                    Exibindo {(safeCurrentPage - 1) * pageSize + 1} a {Math.min(safeCurrentPage * pageSize, filteredPatients.length)} de {filteredPatients.length} pacientes
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>
                    
                    <span className="text-xs font-bold text-slate-700 px-2">
                      {safeCurrentPage} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={safeCurrentPage === totalPages}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de Liberar Acesso ao Médico (Opção 1 - Clínica/Hospital/Admin) */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-100 animate-fadeIn space-y-5 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span>Liberar Acesso ao Prontuário</span>
              </h3>
              <button
                onClick={() => { setShowGrantModal(false); setSelectedPatientForGrant(null); setGrantSuccessMsg(''); }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <SearchableSelect
                  label="Selecione o Paciente"
                  options={patientsList.map(p => ({
                    id: p.id,
                    label: p.nome,
                    sublabel: p.cpf ? `CPF: ${p.cpf}` : undefined,
                    extra: p.celular ? `Tel: ${p.celular}` : undefined
                  }))}
                  value={selectedPatientForGrant?.id || ''}
                  onChange={(val) => {
                    const p = patientsList.find(pt => String(pt.id) === String(val));
                    setSelectedPatientForGrant(p || null);
                    setGrantSuccessMsg('');
                  }}
                  placeholder="Digite para buscar por Nome ou CPF..."
                />
              </div>

              {selectedPatientForGrant && (() => {
                const currentPatientAccesses = allAccesses.filter(a => a.cliente_id === selectedPatientForGrant.id);
                const grantedDocIds = currentPatientAccesses.map(a => a.medico_id);
                const availableDoctors = doctorsList.filter(doc => !grantedDocIds.includes(doc.id));

                const doctorOpts = availableDoctors.map(doc => ({
                  id: doc.id,
                  label: `Dr(a). ${doc.nome}`,
                  sublabel: doc.especialidade || 'Médico',
                  extra: doc.numero_conselho || 'CRM'
                }));

                return (
                  <div className="space-y-4">
                    <div>
                      <SearchableSelect
                        label="Selecione o Médico da Clínica"
                        options={doctorOpts}
                        value={selectedDoctorId}
                        onChange={(val) => setSelectedDoctorId(val ? String(val) : '')}
                        placeholder="Digite para buscar médico por Nome, CRM ou Especialidade..."
                      />
                      {availableDoctors.length === 0 && (
                        <p className="text-[11px] text-amber-600 font-bold mt-1">
                          Todos os médicos cadastrados já possuem acesso ao prontuário deste paciente.
                        </p>
                      )}
                    </div>

                    {/* Lista dos Médicos que Já Têm Acesso ao Prontuário */}
                    {currentPatientAccesses.length > 0 && (
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <h4 className="text-[11px] font-bold text-slate-700">Médicos com Acesso Liberado ({currentPatientAccesses.length})</h4>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {currentPatientAccesses.map(acc => (
                            <div key={acc.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold">
                              <div>
                                <p className="text-slate-800">Dr(a). {acc.medico_nome}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Liberado por: {acc.concedido_por}</p>
                              </div>
                              <button
                                onClick={() => handleRevokeAccess(acc.medico_id, selectedPatientForGrant.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-50 rounded hover:bg-red-100 transition cursor-pointer"
                              >
                                Revogar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl text-amber-900 text-xs font-medium leading-relaxed">
                Perfil de Liberação: <strong className="capitalize">{perfilLiberacao}</strong>. Ao liberar o acesso, o médico selecionado receberá uma notificação em tempo real com a data e hora.
              </div>

              {grantSuccessMsg && (
                <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold text-center animate-fadeIn">
                  {grantSuccessMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowGrantModal(false); setSelectedPatientForGrant(null); setGrantSuccessMsg(''); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Concluir
              </button>
              <button
                onClick={handleGrantAccess}
                disabled={granting || !selectedPatientForGrant || !selectedDoctorId}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {granting ? 'Liberando...' : 'Confirmar Liberação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Permanente do Paciente */}
      {deletePatientModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-fadeIn space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 font-medium">Esta ação não poderá ser desfeita</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-900 text-xs leading-relaxed font-semibold space-y-2">
              <p>
                Você está prestes a excluir permanentemente o paciente <strong className="underline">{deletePatientModal.nome}</strong> (CPF: {deletePatientModal.cpf || 'N/I'}).
              </p>
              <p className="text-red-700 font-normal">
                Todas as informações, exames, receitas, prontuários e históricos médicos deste cliente serão permanentemente deletados do banco de dados do sistema.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletePatientModal(null)}
                disabled={deleting}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePatientConfirmed}
                disabled={deleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? 'Excluindo...' : <><Trash2 size={14} /> Confirmar Exclusão</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Paciente */}
      {showModal && (
        <PatientRegistrationModal 
          companyId={companyId} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => { setShowModal(false); fetchPatients(); }} 
        />
      )}

      {/* Prontuário do Paciente */}
      {patientData && (
        <div className="space-y-6">
          <button
            onClick={() => setPatientData(null)}
            className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Lista de Pacientes
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Lado Esquerdo: Ficha do Paciente */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-indigo-150 flex items-center justify-center text-indigo-600 font-black">
                  {patientData.patient.nome[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">{patientData.patient.nome}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Paciente</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CPF</p>
                  <p className="text-slate-800 font-bold mt-0.5">{patientData.patient.cpf}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nascimento</p>
                  <p className="text-slate-800 font-bold mt-0.5">
                    {formatDatePtBr(patientData.patient.data_nascimento)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Contatos</p>
                  <p className="text-slate-800 font-bold mt-0.5">{patientData.patient.celular} | {patientData.patient.email}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Endereço</p>
                  <p className="text-slate-800 font-bold mt-0.5 leading-relaxed">{patientData.patient.endereco}</p>
                </div>
                
                {patientData.patient.plano_empresa && (
                  <div className="border-t border-slate-100 pt-3.5 space-y-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Convênio Ativo</p>
                    <p className="text-slate-800 font-bold">{patientData.patient.plano_empresa} - {patientData.patient.plano_nome}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Carteirinha: {patientData.patient.plano_numero_carteirinha}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-5 flex gap-3 text-emerald-800">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="text-xs font-black">Acesso Consentido</p>
                <p className="text-[10px] leading-relaxed font-semibold opacity-95 mt-0.5">
                  Este acesso foi gerado com o consentimento do paciente em conformidade com a LGPD. As ações de leitura são registradas para auditoria de segurança.
                </p>
              </div>
            </div>
          </div>

          {/* Lado Direito: Tabs com Informações */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              
              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 gap-6 overflow-x-auto pb-1">
                {[
                  { id: 'anamnesis', label: 'Anamnese', icon: FileText },
                  { id: 'exams', label: 'Exames', icon: FlaskConical },
                  { id: 'prescriptions', label: 'Receitas', icon: Pill },
                  { id: 'bioimpedance', label: 'Bioimpedância', icon: Scale },
                  { id: 'observations', label: 'Histórico & Observações', icon: MessageSquare }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 pb-3.5 text-xs font-black transition-all border-b-2 cursor-pointer ${
                        activeTab === tab.id
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="min-h-[300px]">
                
                {/* Tab: Anamnese */}
                {activeTab === 'anamnesis' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-800">Histórico de Anamnese ({patientData.anamnesis.length})</h3>
                      <button 
                        onClick={() => setShowAnamnesisModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Solicitação de Anamnese
                      </button>
                    </div>

                    {patientData.anamnesis.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-10">O paciente ainda não possui formulários de anamnese preenchidos.</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-4">Data</th>
                                <th className="py-3 px-4">Formulário / Título</th>
                                <th className="py-3 px-4">Solicitante</th>
                                <th className="py-3 px-4">Respostas</th>
                                <th className="py-3 px-4 text-right">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {patientData.anamnesis.slice((anamnesisPage - 1) * 10, anamnesisPage * 10).map((a: any, idx: number) => (
                                <tr key={a.id || idx} className="hover:bg-slate-50/80 transition font-medium text-slate-700">
                                  <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                                    {formatDatePtBr(a.criado_em || a.created_at)}
                                  </td>
                                  <td className="py-3.5 px-4 font-black text-indigo-900">
                                    {a.form_titulo || a.titulo || (a.tipo === 'estruturada' ? 'Formulário de Anamnese' : 'Anamnese Geral')}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 font-bold">
                                    {a.medico_nome || a.solicitado_por || 'Médico / Clínica'}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {Array.isArray(a.respostas) ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                                        {a.respostas.length} perguntas respondidas
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-500">Formulário Geral</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      onClick={() => setViewAnamnesisModal(a)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Visualizar</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginação de Anamneses (Máximo 10 por página) */}
                        {patientData.anamnesis.length > 10 && (
                          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5">
                            <span className="text-xs font-bold text-slate-500">
                              Página {anamnesisPage} de {Math.ceil(patientData.anamnesis.length / 10)}
                            </span>
                            <div className="flex gap-2">
                              <button
                                disabled={anamnesisPage === 1}
                                onClick={() => setAnamnesisPage(prev => Math.max(prev - 1, 1))}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-bold rounded-lg text-slate-600 transition cursor-pointer"
                              >
                                Anterior
                              </button>
                              <button
                                disabled={anamnesisPage >= Math.ceil(patientData.anamnesis.length / 10)}
                                onClick={() => setAnamnesisPage(prev => prev + 1)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-bold rounded-lg text-slate-600 transition cursor-pointer"
                              >
                                Próximo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Exames */}
                {activeTab === 'exams' && (
                  <div className="space-y-4">
                    {patientData.exams.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-10">Nenhum exame compartilhado disponível.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {patientData.exams.map((ex: any) => (
                          <div key={ex.id} className="border border-slate-100 bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">{ex.tipo}</span>
                                <span className="text-[10px] text-slate-400 font-bold">
                                  {formatDatePtBr(ex.data || ex.criado_em)}
                                </span>
                              </div>
                              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider mt-1">{ex.laboratorio || 'Laboratório N/I'}</p>
                              {ex.observacoes && (
                                <p className="text-[11px] text-slate-500 leading-relaxed mt-2.5 font-semibold bg-white p-3 rounded-xl border border-slate-150">
                                  {ex.observacoes}
                                </p>
                              )}
                            </div>
                            
                            {ex.arquivo_url && (
                              <a
                                href={ex.arquivo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 mt-4 self-start text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Visualizar Laudo Técnico</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Receitas */}
                {activeTab === 'prescriptions' && (
                  <div className="space-y-4">
                    {patientData.prescriptions.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-10">Nenhuma receita compartilhada disponível.</p>
                    ) : (
                      <div className="space-y-4">
                        {patientData.prescriptions.map((p: any) => {
                          let medsList: any[] = [];
                          if (Array.isArray(p.medicamentos)) {
                            medsList = p.medicamentos;
                          } else if (typeof p.medicamentos === 'string' && p.medicamentos.trim() !== '') {
                            try {
                              const parsed = JSON.parse(p.medicamentos);
                              if (Array.isArray(parsed)) medsList = parsed;
                              else if (parsed && typeof parsed === 'object') medsList = [parsed];
                            } catch {
                              medsList = [];
                            }
                          }

                          const rawMedsText = typeof p.medicamentos === 'string' ? p.medicamentos.trim() : '';
                          const obsFull = p.observacoes || '';
                          const obsText = obsFull.replace(/\[Anexo\]:\s*[^\n]+/gi, '').trim();
                          const anexoMatch = obsFull.match(/\[Anexo\]:\s*([^\n]+)/i);

                          const rawFile = p.arquivo_url || p.anexo_url || p.arquivo || p.anexo || (anexoMatch ? anexoMatch[1].trim() : '');
                          const attachmentName = anexoMatch ? anexoMatch[1].trim() : (rawFile ? rawFile.replace(/^.*[\\\/]/, '') : null);

                          let docUrl = '';
                          if (rawFile) {
                            if (rawFile.startsWith('http://') || rawFile.startsWith('https://') || rawFile.startsWith('data:')) {
                              docUrl = rawFile;
                            } else if (rawFile.startsWith('/')) {
                              docUrl = `${API_URL}${rawFile}`;
                            } else {
                              docUrl = `${API_URL}/uploads/${rawFile}`;
                            }
                          }

                          return (
                            <div key={p.id} className="border border-slate-200 bg-slate-50 p-5 rounded-2xl space-y-4 shadow-xs">
                              <div className="flex justify-between items-center pb-3 border-b border-slate-200/80">
                                <div>
                                  <p className="text-xs font-black text-slate-800">Receita por: {p.medico || p.medico_nome || 'Médico não informado'}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Documento de Prescrição</p>
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold bg-white px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                  {formatDatePtBr(p.data || p.criado_em || p.created_at)}
                                </span>
                              </div>

                              <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Medicamentos Ministrados</p>
                                  {medsList.length > 0 ? (
                                    <div className="space-y-2 mt-1">
                                      {medsList.map((m: any, mIdx: number) => (
                                        <div key={mIdx} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-0.5">
                                          <p className="text-xs font-black text-slate-800">{m.nome || m.medicamento || m.nome_comercial || 'Medicamento'}</p>
                                          <p className="text-[11px] text-slate-600 font-medium">
                                            {[m.posologia, m.frequencia, m.quantidade || m.qtd, m.instrucoes].filter(Boolean).join(' • ')}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : rawMedsText && rawMedsText !== '[]' && rawMedsText !== '{}' ? (
                                    <p className="text-slate-800 font-bold mt-1 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border border-slate-200">
                                      {rawMedsText}
                                    </p>
                                  ) : (
                                    <p className="text-slate-400 italic font-medium mt-1 bg-white p-3 rounded-xl border border-slate-200">
                                      Nenhum medicamento listado.
                                    </p>
                                  )}
                                </div>

                                {obsText && (
                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Observações/Instruções</p>
                                    <p className="text-slate-700 mt-1 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">{obsText}</p>
                                  </div>
                                )}

                                {attachmentName && (
                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Documento Anexo</p>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!docUrl) {
                                            alert(`O documento "${attachmentName}" foi indicado como referência no histórico e não possui arquivo PDF armazenado no servidor.`);
                                            return;
                                          }
                                          setViewingDocModal({ url: docUrl, title: attachmentName });
                                        }}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition cursor-pointer"
                                      >
                                        <Eye className="w-4 h-4 text-indigo-600" />
                                        <span>Visualizar [Anexo]: {attachmentName}</span>
                                      </button>
                                      {docUrl && (
                                        <button
                                          type="button"
                                          onClick={() => window.open(docUrl, '_blank')}
                                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                                        >
                                          <Download className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Nova Guia</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Bioimpedância */}
                {activeTab === 'bioimpedance' && (
                  <div className="space-y-4">
                    {patientData.bioimpedance.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-10">Nenhum registro de bioimpedância disponível.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-150">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-150">
                            <tr>
                              <th className="px-4 py-2.5">Data</th>
                              <th className="px-4 py-2.5">Peso</th>
                              <th className="px-4 py-2.5">IMC</th>
                              <th className="px-4 py-2.5">Gordura %</th>
                              <th className="px-4 py-2.5">Músculo %</th>
                              <th className="px-4 py-2.5">Água %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold">
                            {patientData.bioimpedance.map((b: any) => (
                              <tr key={b.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-slate-800">{formatDatePtBr(b.data || b.criado_em || b.created_at)}</td>
                                <td className="px-4 py-3 text-slate-800">{b.peso} kg</td>
                                <td className="px-4 py-3">{b.imc}</td>
                                <td className="px-4 py-3 text-red-500">{b.gordura_perc}%</td>
                                <td className="px-4 py-3 text-emerald-500">{b.massa_muscular}%</td>
                                <td className="px-4 py-3 text-blue-500">{b.agua_perc}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: HISTÓRICO & OBSERVAÇÕES MÉDICAS */}
                {activeTab === 'observations' && (
                  <div className="space-y-6 animate-fadeIn font-sans">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-indigo-600" />
                          <span>Histórico & Observações Médicas</span>
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Anotações clínicas e acompanhamento de evolução do paciente
                        </p>
                      </div>

                      <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 rounded-full font-extrabold self-start sm:self-auto">
                        🔒 Acesso Exclusivo Médico
                      </span>
                    </div>

                    {/* FORMULÁRIO DE NOVA OBSERVAÇÃO OU AVISO DE BLOQUEIO */}
                    {observationsData.pode_adicionar ? (
                      <div className="bg-slate-50 border border-indigo-100 p-4 sm:p-5 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-indigo-600" /> Registrar Nova Observação Clínica
                          </label>
                          {observationsData.doctor_nome && (
                            <span className="text-[10px] font-bold text-slate-400">
                              Dr(a). {observationsData.doctor_nome} ({observationsData.doctor_especialidade})
                            </span>
                          )}
                        </div>

                        <textarea
                          rows={3}
                          value={newObsText}
                          onChange={e => setNewObsText(e.target.value)}
                          placeholder="Escreva as observações médicas, recomendações ou impressões clínicas sobre o paciente..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                        />

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                          <p className="text-[10px] text-slate-400 font-semibold italic">
                            * O registro ficará assinado com seu nome, especialidade, data e hora atual.
                          </p>
                          <button
                            onClick={handleSaveObservation}
                            disabled={savingObs || !newObsText.trim()}
                            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {savingObs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            <span>{savingObs ? 'Salvando...' : 'Salvar Observação'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-black">Adição de Observações Bloqueada</p>
                          <p className="text-xs font-semibold leading-relaxed opacity-95">
                            É necessário possuir ao menos <b>1 consulta concluída</b> com este paciente para registrar novas observações clínicas. Você pode visualizar o histórico de notas anteriores abaixo.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* LISTA DE OBSERVAÇÕES ANTERIORES */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Registros de Observações ({observationsData.observations?.length || 0})
                      </h5>

                      {(!observationsData.observations || observationsData.observations.length === 0) ? (
                        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-bold text-slate-500">Nenhuma observação clínica registrada até o momento.</p>
                        </div>
                      ) : (
                        observationsData.observations.map(obs => (
                          <div key={obs.id} className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-xs hover:border-indigo-200 transition">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900">Dr(a). {obs.medico_nome}</span>
                                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-indigo-100">
                                  {obs.medico_especialidade || 'Médico'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                {formatDatePtBr(obs.criado_em)} às {obs.criado_em ? obs.criado_em.substring(11, 16) : ''}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap">
                              {obs.observacao}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          </div>
        </div>
      )}

      {showAnamnesisModal && patientData && (
        <PatientAnamnesisCustomizerModal
          companyId={companyId!}
          patientId={patientData.patient.id}
          onClose={() => setShowAnamnesisModal(false)}
          onSuccess={() => {
            setShowAnamnesisModal(false);
            alert('Anamnese enviada com sucesso!');
          }}
        />
      )}

      {/* Modal de Visualização Detalhada da Anamnese Selecionada */}
      {viewAnamnesisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {viewAnamnesisModal.form_titulo || viewAnamnesisModal.titulo || 'Formulário de Anamnese'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Data: <b>{formatDatePtBr(viewAnamnesisModal.criado_em || viewAnamnesisModal.created_at)}</b> • Solicitado por: <b>{viewAnamnesisModal.medico_nome || 'Médico / Clínica'}</b>
                </p>
              </div>
              <button onClick={() => setViewAnamnesisModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {viewAnamnesisModal.tipo === 'estruturada' && Array.isArray(viewAnamnesisModal.respostas) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {viewAnamnesisModal.respostas.map((r: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{r.pergunta}</p>
                      <p className="text-xs font-black text-slate-800 leading-relaxed">{r.resposta || 'Sem resposta'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-xs font-semibold text-slate-700">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-[10px] text-indigo-600 font-black uppercase">Queixa Principal</p>
                    <p className="text-slate-800 font-bold mt-1 leading-relaxed">{viewAnamnesisModal.queixa_principal || 'Não informada'}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Histórico de Doenças</p>
                      <p className="text-slate-800 font-bold mt-1">{viewAnamnesisModal.historico_doencas || 'Nenhum'}</p>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Alergias</p>
                      <p className="text-slate-800 font-bold mt-1">{viewAnamnesisModal.alergias || 'Nenhuma'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                onClick={() => setViewAnamnesisModal(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Documento Anexo (Médico) */}
      {viewingDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fadeIn flex flex-col h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-800 truncate">
                  Visualizador de Documento Anexo — {viewingDocModal.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.open(viewingDocModal.url, '_blank')}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Abrir em Nova Guia
                </button>
                <button onClick={() => setViewingDocModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-2 flex-1 overflow-hidden bg-slate-900/90 flex items-center justify-center">
              {viewingDocModal.url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img src={viewingDocModal.url} alt={viewingDocModal.title} className="max-h-full max-w-full object-contain rounded-xl" />
              ) : (
                <iframe
                  src={viewingDocModal.url}
                  className="w-full h-full rounded-xl border border-slate-700 bg-white"
                  title={viewingDocModal.title}
                />
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/80 shrink-0">
              <button
                onClick={() => setViewingDocModal(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
