import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Plus, Trash2, Mail, Lock, User, Calendar, MapPin, Phone,
  Hash, Loader2, ToggleLeft, ToggleRight, ShieldAlert, Eye, EyeOff, X
} from 'lucide-react';
import { API_URL } from '../../config';

const TIPOS_PROFISSIONAL = [
  { value: 'medico', label: 'Médico(a)' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'psicologo', label: 'Psicólogo(a)' },
  { value: 'fonoaudiologo', label: 'Fonoaudiólogo(a)' },
  { value: 'terapeuta', label: 'Terapeuta' },
  { value: 'outro', label: 'Outro' },
];

const getTipoBadge = (tipo: string) => {
  const colorMap: Record<string, string> = {
    medico: 'bg-blue-100 text-blue-700',
    fisioterapeuta: 'bg-emerald-100 text-emerald-700',
    nutricionista: 'bg-lime-100 text-lime-700',
    psicologo: 'bg-violet-100 text-violet-700',
    fonoaudiologo: 'bg-amber-100 text-amber-700',
    terapeuta: 'bg-rose-100 text-rose-700',
    outro: 'bg-slate-100 text-slate-600',
  };
  const label = TIPOS_PROFISSIONAL.find(t => t.value === tipo)?.label || tipo;
  const color = colorMap[tipo] || colorMap['outro'];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>{label}</span>;
};

// Mascara CPF: 000.000.000-00
const maskCpf = (v: string) =>
  v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);

const validateCpf = (v: string) => v.replace(/\D/g, '').length === 11;

export const ProfessionalList: React.FC = () => {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [viewingProf, setViewingProf] = useState<any>(null);

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : { email: '', roles: ['client'] };
  const activeRole = localStorage.getItem('activeRole') || user.roles[0];
  const token = localStorage.getItem('token');

  const [myCompany, setMyCompany] = useState<any>(null);

  const emptyForm = {
    nome: '', cpf: '', data_nascimento: '', cep: '', logradouro: '', numero: '',
    complemento: '', bairro: '', cidade: '', estado: '', numero_conselho: '',
    tipo_profissional: '', email: '', celular: '', senha: '', company_id: ''
  };

  const [form, setForm] = useState(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  useEffect(() => {
    fetchInitialData();
    if (window.location.search.includes('add=true')) {
      setShowAddModal(true);
    }
  }, [activeRole]);

  const handleCepBlur = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) { setCepError(''); return; }
    setCepLoading(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado. Verifique e tente novamente.');
      } else {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado
        }));
      }
    } catch {
      setCepError('Não foi possível consultar o CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleCpfBlur = () => {
    if (form.cpf && !validateCpf(form.cpf)) {
      setCpfError('CPF inválido. Informe os 11 dígitos.');
    } else {
      setCpfError('');
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      let companyInfo = null;
      if (activeRole === 'company') {
        const resCo = await fetch(`${API_URL}/api/companies`, { headers });
        const allCos = await resCo.json();
        if (Array.isArray(allCos)) {
          companyInfo = allCos.find((c: any) => c.email.toLowerCase() === user.email.toLowerCase());
          setMyCompany(companyInfo);
        }
      }

      const url = activeRole === 'company' && companyInfo
        ? `${API_URL}/api/professionals?companyId=${companyInfo.id}`
        : `${API_URL}/api/professionals`;

      const response = await fetch(url, { headers });
      const data = await response.json();
      setProfessionals(Array.isArray(data) ? data : []);

      if (activeRole === 'admin') {
        const resCompanies = await fetch(`${API_URL}/api/companies`, { headers });
        const dataCos = await resCompanies.json();
        setCompanies(Array.isArray(dataCos) ? dataCos : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (cpfError) { setError('Corrija o CPF antes de continuar.'); return; }
    if (cepError) { setError('Corrija o CEP antes de continuar.'); return; }
    if (!validateCpf(form.cpf)) { setCpfError('CPF inválido.'); setError('Corrija o CPF antes de continuar.'); return; }

    const payload = {
      ...form,
      company_id: activeRole === 'company' ? myCompany?.id : form.company_id
    };

    try {
      const response = await fetch(`${API_URL}/api/professionals/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar profissional');
      }

      setSuccess('Profissional cadastrado com sucesso! Um e-mail de primeiro acesso foi enviado.');
      setForm(emptyForm);
      setCepError('');
      setCpfError('');
      setShowSenha(false);
      fetchInitialData();
      setTimeout(() => setShowAddModal(false), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAccess = async (prof: any) => {
    setTogglingId(prof.id);
    const newStatus = !prof.ativo;
    try {
      const response = await fetch(`${API_URL}/api/professionals/${prof.id}/toggle-access`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: newStatus })
      });
      if (response.ok) {
        setProfessionals(prev =>
          prev.map(p => p.id === prof.id ? { ...p, ativo: newStatus } : p)
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUnlink = async (profId: number) => {
    if (!confirm('Deseja realmente desvincular este profissional da instituição?')) return;
    try {
      const response = await fetch(`${API_URL}/api/professionals/${profId}/unlink-company?companyId=${myCompany.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchInitialData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Corpo Clínico</h2>
          <p className="text-xs text-slate-500 font-medium">
            {activeRole === 'company'
              ? 'Gerencie os profissionais de saúde vinculados à sua clínica'
              : 'Lista global de profissionais de saúde cadastrados'}
          </p>
        </div>

        {(activeRole === 'company' || activeRole === 'admin') && (
          <button
            onClick={() => {
              setForm(emptyForm);
              setError('');
              setSuccess('');
              setCepError('');
              setCpfError('');
              setShowSenha(false);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Profissional</span>
          </button>
        )}
      </div>

      {professionals.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-100 rounded-2xl">
          <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Nenhum profissional vinculado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <th className="p-4">Nome</th>
                <th className="p-4">Especialidade</th>
                <th className="p-4">CPF / Conselho</th>
                <th className="p-4">Contato</th>
                {activeRole === 'company' && <th className="p-4 text-center">Acesso</th>}
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
              {professionals.map(prof => (
                <tr key={prof.id} className={`hover:bg-slate-50/50 transition-colors ${prof.ativo === false ? 'opacity-50' : ''}`}>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{prof.nome}</p>
                    {prof.ativo === false && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-500 font-bold mt-0.5">
                        <ShieldAlert className="w-3 h-3" /> Acesso suspenso
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {prof.tipo_profissional ? getTipoBadge(prof.tipo_profissional) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <p>{prof.cpf}</p>
                    <p className="text-[10px] text-blue-700 mt-0.5">{prof.numero_conselho}</p>
                  </td>
                  <td className="p-4">
                    <p>{prof.celular}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{prof.email}</p>
                  </td>
                  {activeRole === 'company' && (
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleAccess(prof)}
                        disabled={togglingId === prof.id}
                        title={prof.ativo !== false ? 'Suspender acesso' : 'Reativar acesso'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-all text-[11px] ${
                          prof.ativo !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        } ${togglingId === prof.id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {prof.ativo !== false
                          ? <><ToggleRight className="w-3.5 h-3.5" /> Ativo</>
                          : <><ToggleLeft className="w-3.5 h-3.5" /> Suspenso</>
                        }
                      </button>
                    </td>
                  )}
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingProf(prof)}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Visualizar Dados"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {activeRole === 'company' && (
                        <button
                          onClick={() => handleUnlink(prof.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-transparent font-bold transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Desvincular</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Visualizar Profissional */}
      {viewingProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingProf(null)} />
          <div className="bg-white rounded-3xl w-full max-w-3xl p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Dados do Profissional</h3>
                  <p className="text-sm font-semibold text-slate-500">Visualização de perfil</p>
                </div>
              </div>
              <button
                onClick={() => setViewingProf(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dados Pessoais</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</p>
                    <p className="text-sm font-bold text-slate-800">{viewingProf.nome}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">CPF</p>
                    <p className="text-sm font-bold text-slate-800">{viewingProf.cpf}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Data Nascimento</p>
                    <p className="text-sm font-bold text-slate-800">{viewingProf.data_nascimento ? new Date(viewingProf.data_nascimento).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dados Profissionais</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Especialidade / Perfil</p>
                    <p className="text-sm font-bold text-slate-800 capitalize">{viewingProf.tipo_profissional}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Número do Conselho</p>
                    <p className="text-sm font-bold text-slate-800">{viewingProf.numero_conselho || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status de Acesso</p>
                    <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${viewingProf.ativo !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {viewingProf.ativo !== false ? 'Ativo' : 'Suspenso'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Contato & Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail (Login)</p>
                    <p className="text-sm font-bold text-slate-800">{viewingProf.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Celular</p>
                    <p className="text-sm font-bold text-slate-800">{viewingProf.celular}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Endereço</p>
                    <p className="text-sm font-bold text-slate-800">
                      {viewingProf.logradouro}, {viewingProf.numero} - {viewingProf.bairro}, {viewingProf.cidade}/{viewingProf.estado}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={() => setViewingProf(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Profissional */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-black text-slate-800 mb-6">Cadastrar Profissional</h3>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-4">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold mb-4">{success}</div>}

            <form onSubmit={handleAddProfessional} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">

                {/* Nome */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text" required
                      value={form.nome}
                      onChange={e => setForm({...form, nome: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                {/* Especialidade */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Especialidade / Categoria</label>
                  <select
                    required
                    value={form.tipo_profissional}
                    onChange={e => setForm({...form, tipo_profissional: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_PROFISSIONAL.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CPF</label>
                  <input
                    type="text" required placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={e => { setForm({...form, cpf: maskCpf(e.target.value)}); setCpfError(''); }}
                    onBlur={handleCpfBlur}
                    maxLength={14}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400 ${cpfError ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {cpfError && <p className="text-red-500 text-[10px] font-bold mt-1">⚠ {cpfError}</p>}
                </div>

                {/* Número do Conselho */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Número do Conselho Regional</label>
                  <input
                    type="text" required placeholder="CRM-SP 123456 / CRP / CREFITO..."
                    value={form.numero_conselho}
                    onChange={e => setForm({...form, numero_conselho: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Nascimento</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date" required
                      value={form.data_nascimento}
                      onChange={e => setForm({...form, data_nascimento: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                {/* Celular */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Celular / Telefone</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="text" required placeholder="(00) 00000-0000"
                      value={form.celular}
                      onChange={e => setForm({...form, celular: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                <div className="col-span-2 border-b border-slate-100 pb-1.5 mt-2">
                  <h4 className="text-xs font-black text-slate-700">Endereço</h4>
                </div>

                {/* CEP */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CEP</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className={`w-4 h-4 ${cepError ? 'text-red-400' : ''}`} />}
                    </span>
                    <input
                      type="text" required placeholder="00000-000"
                      value={form.cep}
                      onChange={e => { setForm({...form, cep: e.target.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9)}); setCepError(''); }}
                      onBlur={handleCepBlur}
                      className={`w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400 ${cepError ? 'border-red-400' : 'border-slate-200'}`}
                      maxLength={9}
                    />
                  </div>
                  {cepError && <p className="text-red-500 text-[10px] font-bold mt-1">⚠ {cepError}</p>}
                </div>

                {/* Número */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Número</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Hash className="w-4 h-4" />
                    </span>
                    <input
                      type="text" required placeholder="Ex: 123"
                      value={form.numero}
                      onChange={e => setForm({...form, numero: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                {/* Logradouro */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Logradouro</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text" required placeholder="Rua, Avenida..."
                      value={form.logradouro}
                      onChange={e => setForm({...form, logradouro: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                {/* Bairro */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Bairro</label>
                  <input
                    type="text" required placeholder="Bairro"
                    value={form.bairro}
                    onChange={e => setForm({...form, bairro: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                {/* Cidade */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Cidade</label>
                  <input
                    type="text" required placeholder="Cidade"
                    value={form.cidade}
                    onChange={e => setForm({...form, cidade: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estado (UF)</label>
                  <input
                    type="text" required placeholder="Ex: SP"
                    value={form.estado}
                    onChange={e => setForm({...form, estado: e.target.value.toUpperCase().slice(0,2)})}
                    maxLength={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                {/* Complemento */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Complemento <span className="text-slate-400 font-normal">(opcional)</span></label>
                  <input
                    type="text" placeholder="Apto, Sala..."
                    value={form.complemento}
                    onChange={e => setForm({...form, complemento: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                {activeRole === 'admin' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Clínica / Hospital Vinculado (Opcional)</label>
                    <select
                      value={form.company_id}
                      onChange={e => setForm({...form, company_id: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    >
                      <option value="">Nenhuma (Profissional Autônomo)</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <h4 className="text-xs font-black text-slate-700 mb-1">Dados de Acesso (Login)</h4>
                  <p className="text-[10px] text-amber-600 font-semibold">
                    ⚠ Uma senha temporária será criada e um e-mail de primeiro acesso será enviado ao profissional.
                  </p>
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">E-mail (Login)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email" required placeholder="medico@clinica.com"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                {/* Senha com eye toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Senha Temporária</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showSenha ? 'text' : 'password'} required placeholder="senha temporária"
                      value={form.senha}
                      onChange={e => setForm({...form, senha: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(v => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-600/10 transition-colors"
                >
                  Salvar e Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
