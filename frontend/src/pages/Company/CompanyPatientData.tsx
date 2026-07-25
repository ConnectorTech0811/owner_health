import React, { useState } from 'react';
import {
  Search, FlaskConical, Pill, Scale, FileText,
  ShieldAlert, ShieldCheck, Download, Calendar, Users, Plus, ArrowLeft,
  Trash2, UserMinus, UserCheck, AlertTriangle
} from 'lucide-react';
import { API_URL } from '../../config';
import { PatientRegistrationModal } from '../../components/PatientRegistrationModal';
import { PatientAnamnesisCustomizerModal } from './PatientAnamnesisCustomizerModal';

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
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
  } catch {}
  return 'Não informada';
};

export const CompanyPatientData: React.FC = () => {
  const [error, setError] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('anamnesis'); // anamnesis, exams, prescriptions, bioimpedance
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);

  const [filterNome, setFilterNome] = useState('');
  const [filterCpf, setFilterCpf] = useState('');
  const [filterCelular, setFilterCelular] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ativo' | 'inativo'>('ativo');

  const [deletePatientModal, setDeletePatientModal] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedPatientForGrant, setSelectedPatientForGrant] = useState<any>(null);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [allAccesses, setAllAccesses] = useState<any[]>([]);
  const [granting, setGranting] = useState(false);
  const [grantSuccessMsg, setGrantSuccessMsg] = useState('');

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
    const cpfParam = params.get('cpf') || params.get('query');
    if (cpfParam) {
      loadPatientByCpf(cpfParam);
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

  const filteredPatients = patientsList.filter(p => {
    const statusMatch = isDoctor
      ? (p.status !== 'inativo')
      : (filterStatus === 'inativo' ? p.status === 'inativo' : p.status !== 'inativo');

    const nomeNorm = normalizeText(p.nome);
    const filterNomeNorm = normalizeText(filterNome.trim());
    const matchName = !filterNomeNorm || nomeNorm.includes(filterNomeNorm);

    const cpfDigits = normalizeDigits(p.cpf);
    const filterCpfDigits = normalizeDigits(filterCpf);
    const matchCpf = !filterCpf.trim() || cpfDigits.includes(filterCpfDigits) || (p.cpf && p.cpf.toLowerCase().includes(filterCpf.toLowerCase().trim()));

    const celDigits = normalizeDigits(p.celular);
    const filterCelDigits = normalizeDigits(filterCelular);
    const matchCelular = !filterCelular.trim() || celDigits.includes(filterCelDigits) || (p.celular && p.celular.toLowerCase().includes(filterCelular.toLowerCase().trim()));

    return statusMatch && matchName && matchCpf && matchCelular;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          <span>Gerenciamento de Pacientes</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Lista de pacientes da clínica e acesso a prontuários e exames.
        </p>
      </div>

      {/* PAINEL DE FILTROS DE BUSCA DICA E AUTOMÁTICA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            <span>Filtros de Busca de Pacientes</span>
          </h3>
          {(filterNome || filterCpf || filterCelular) && (
            <button
              onClick={() => { setFilterNome(''); setFilterCpf(''); setFilterCelular(''); }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Filtro por Nome (Busca aproximada automática ao digitar) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome do Paciente</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Digite o nome (busca aproximada...)"
                value={filterNome}
                onChange={e => setFilterNome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Filtro por CPF */}
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

          {/* Filtro por Celular */}
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

          {/* Filtro de Status (Visível para Administrativo, Clínica/Hospital e Secretária) */}
          {user.tipo_profissional !== 'medico' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Status do Paciente</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as 'ativo' | 'inativo')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition text-slate-800"
              >
                <option value="ativo">Pacientes Ativos (Padrão)</option>
                <option value="inativo">Pacientes Inativos</option>
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-xs font-bold mt-2 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {!patientData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800">
                {filterStatus === 'inativo' ? 'Pacientes Inativos' : 'Pacientes Vinculados'}
              </h3>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">
                {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
              </span>
            </div>
            {user.tipo_profissional !== 'medico' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { fetchDoctors(); setShowGrantModal(true); }}
                  className="flex items-center gap-2 bg-amber-50 text-amber-800 hover:bg-amber-100 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-amber-200"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Acesso ao Médico
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-indigo-200"
                >
                  <Plus className="w-4 h-4" />
                  Novo Paciente
                </button>
              </div>
            )}
          </div>
          
          {filteredPatients.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              {patientsList.length === 0
                ? 'Nenhum paciente vinculado à clínica no momento.'
                : `Nenhum paciente ${filterStatus === 'inativo' ? 'inativo' : 'ativo'} encontrado para os filtros informados.`}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map(p => {
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

                      {/* Nomes dos médicos autorizados exibidos apenas para NÃO MÉDICOS */}
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

                      {/* Opções exclusivas para Administrativo, Clínica/Hospital e Secretária */}
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
        </div>
      )}

      {/* Modal de Liberar Acesso ao Médico (Opção 1 - Clínica/Hospital/Admin) */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 animate-fadeIn space-y-6">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Selecione o Paciente</label>
                <select
                  value={selectedPatientForGrant?.id || ''}
                  onChange={e => {
                    const p = patientsList.find(pt => pt.id === parseInt(e.target.value));
                    setSelectedPatientForGrant(p || null);
                    setGrantSuccessMsg('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="">-- Escolha o Paciente --</option>
                  {patientsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (CPF: {p.cpf})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPatientForGrant && (() => {
                const currentPatientAccesses = allAccesses.filter(a => a.cliente_id === selectedPatientForGrant.id);
                const grantedDocIds = currentPatientAccesses.map(a => a.medico_id);
                const availableDoctors = doctorsList.filter(doc => !grantedDocIds.includes(doc.id));

                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Selecione o Médico da Clínica</label>
                      <select
                        value={selectedDoctorId}
                        onChange={e => setSelectedDoctorId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Escolha o Médico --</option>
                        {availableDoctors.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            Dr(a). {doc.nome} — {doc.especialidade || 'Médico'} ({doc.numero_conselho || 'CRM'})
                          </option>
                        ))}
                      </select>
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
                  { id: 'bioimpedance', label: 'Bioimpedância', icon: Scale }
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
                      <h3 className="text-sm font-black text-slate-800">Histórico de Anamnese</h3>
                      <button 
                        onClick={() => setShowAnamnesisModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Solicitação de Anamnese
                      </button>
                    </div>

                    {patientData.anamnesis.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-10">O paciente ainda não possui formulários de anamnese preenchidos.</p>
                    ) : (
                      <div className="space-y-6">
                        {patientData.anamnesis.map((a: any) => (
                          <div key={a.id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4 shadow-sm">
                            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                              <span className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                {a.tipo === 'estruturada' ? 'Formulário de Anamnese Preenchido' : 'Anamnese Geral'}
                              </span>
                              <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                                {formatDatePtBr(a.criado_em)}
                              </span>
                            </div>

                            {a.tipo === 'estruturada' && Array.isArray(a.respostas) ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {a.respostas.map((r: any, idx: number) => (
                                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{r.pergunta}</p>
                                    <p className="text-xs font-black text-slate-800 mt-1">{r.resposta || 'Sem resposta'}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                                <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-100">
                                  <p className="text-[10px] text-indigo-600 font-black uppercase">Queixa Principal</p>
                                  <p className="text-slate-800 font-bold mt-1">{a.queixa_principal || 'Não informada'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Histórico de Doenças</p>
                                  <p className="text-slate-800 font-bold mt-1">{a.historico_doencas || 'Nenhum'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Alergias</p>
                                  <p className="text-slate-800 font-bold mt-1">{a.alergias || 'Nenhuma'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
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
                                  {new Date(ex.data + 'T00:00:00').toLocaleDateString('pt-BR')}
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
                        {patientData.prescriptions.map((p: any) => (
                          <div key={p.id} className="border border-slate-150 bg-slate-50 p-5 rounded-2xl">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-200/60 mb-3">
                              <div>
                                <p className="text-xs font-bold text-slate-800">Receita por: {p.medico || 'Médico não informado'}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Documento de Prescrição</p>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                              <div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Medicamentos Ministrados</p>
                                <p className="text-slate-800 font-black mt-1 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border border-slate-150">
                                  {p.medicamentos}
                                </p>
                              </div>
                              {p.observacoes && (
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Observações/Instruções</p>
                                  <p className="text-slate-600 mt-1 leading-relaxed">{p.observacoes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
                                <td className="px-4 py-3">{new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
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
            // Ideally we refresh the requests list here
          }}
        />
      )}
    </div>
  );
};
