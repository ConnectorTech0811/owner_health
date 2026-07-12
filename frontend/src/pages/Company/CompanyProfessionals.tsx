import { isValidCPF } from '../../utils/validators';
import React, { useState, useEffect } from 'react';
import {
  Users, MapPin, Mail, Phone, Lock, Eye, EyeOff,
  Loader2, Plus, Trash2, Search, ToggleLeft, ToggleRight, Pencil
} from 'lucide-react';
import { API_URL } from '../../config';

const ESPECIALIDADES = [
  'Clínico Geral', 'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Fisioterapia',
  'Fonoaudiologia', 'Gastroenterologia', 'Geriatria', 'Ginecologia', 'Neurologia',
  'Nutrição', 'Oftalmologia', 'Oncologia', 'Ortopedia', 'Pediatria', 'Psicologia',
  'Psiquiatria', 'Reumatologia', 'Terapia Ocupacional', 'Urologia',
];

const CONSELHOS = ['CRM', 'CRP', 'CREFITO', 'CRN', 'CRFA', 'CRESS', 'CRO', 'CFM'];

export const CompanyProfessionals: React.FC = () => {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [emailDomainError, setEmailDomainError] = useState('');

  const [form, setForm] = useState({
    nome: '', cpf: '', data_nascimento: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    email: '', celular: '',
    tipo_profissional: 'medico', // medico, secretario, administrativo
    especialidade: 'Clínico Geral', tipo_conselho: 'CRM', numero_conselho: '',
    senha: '', confirmar_senha: ''
  });

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  useEffect(() => {
    fetchProfessionals();
  }, [token, companyId]);

  const openNewModal = () => {
    setEditingId(null);
    setForm({
      nome: '', cpf: '', data_nascimento: '',
      cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
      email: '', celular: '',
      tipo_profissional: 'medico',
      especialidade: 'Clínico Geral', tipo_conselho: 'CRM', numero_conselho: '',
      senha: '', confirmar_senha: ''
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleEdit = (prof: any) => {
    setEditingId(prof.id);
    let conselho = 'CRM';
    let num_conselho = '';
    if (prof.numero_conselho) {
      const parts = prof.numero_conselho.split(' ');
      if (parts.length > 1) {
        conselho = parts[0];
        num_conselho = parts[1];
      } else {
        num_conselho = prof.numero_conselho;
      }
    }
    
    setForm({
      nome: prof.nome || '',
      cpf: prof.cpf || '',
      data_nascimento: prof.data_nascimento ? prof.data_nascimento.split('T')[0] : '',
      cep: '', logradouro: prof.endereco || '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
      email: prof.email || '',
      celular: prof.celular || '',
      tipo_profissional: prof.tipo_profissional || 'medico',
      especialidade: prof.especialidade || 'Clínico Geral',
      tipo_conselho: conselho,
      numero_conselho: num_conselho,
      senha: '', confirmar_senha: ''
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      if (token && companyId) {
        const res = await fetch(`${API_URL}/api/professionals?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setProfessionals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCepBlur = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
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
      setCepError('Erro ao consultar o CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleEmailChange = (val: string) => {
    setForm(prev => ({ ...prev, email: val }));
    setEmailDomainError('');

    const publicDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.com.br', 'icloud.com', 'live.com', 'aol.com', 'terra.com.br', 'uol.com.br', 'bol.com.br'];
    const emailDomain = val.includes('@') ? val.split('@')[1].toLowerCase() : '';
    if (publicDomains.includes(emailDomain)) {
      setEmailDomainError('E-mails públicos (como Gmail, Outlook, Yahoo) não são permitidos. Use o e-mail corporativo da clínica.');
    }
  };

  const handleToggleAccess = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/professionals/${id}/toggle-access`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: !currentStatus })
      });
      if (res.ok) {
        fetchProfessionals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveLink = async (id: number) => {
    if (!confirm('Deseja realmente remover o vínculo deste profissional com esta clínica?')) return;
    try {
      const res = await fetch(`${API_URL}/api/professionals/${id}/unlink-company?companyId=${companyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProfessionals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (emailDomainError) {
      setError('Verifique o e-mail corporativo antes de enviar.');
      return;
    }

    if (form.senha !== form.confirmar_senha) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!editingId && form.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (editingId && form.senha && form.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    
    if (!isValidCPF(form.cpf)) {
      setError('CPF inválido. Deve conter 11 dígitos.');
      return;
    }
    if (form.celular.replace(/\D/g, '').length < 10) {
      setError('Celular inválido.');
      return;
    }
    if (form.cep && form.cep.replace(/\D/g, '').length !== 8) {
      setError('CEP inválido.');
      return;
    }
    
    if (!form.cep || !form.logradouro || !form.numero || !form.bairro || !form.cidade || !form.estado) {
      setError('Preencha todos os campos do endereço (CEP, Logradouro, Número, Bairro, Cidade e UF).');
      return;
    }

    setSubmitLoading(true);

    try {
      const address = `${form.logradouro}, ${form.numero}${form.complemento ? ' - ' + form.complemento : ''}${form.bairro ? ', ' + form.bairro : ''}${form.cidade ? ', ' + form.cidade : ''} - ${form.estado}, CEP: ${form.cep}`;
      const payload = {
        nome: form.nome,
        cpf: form.cpf,
        data_nascimento: form.data_nascimento,
        endereco: address,
        cep: form.cep,
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        tipo_profissional: form.tipo_profissional,
        especialidade: form.tipo_profissional === 'medico' ? form.especialidade : null,
        numero_conselho: form.tipo_profissional === 'medico' ? `${form.tipo_conselho} ${form.numero_conselho}` : null,
        email: form.email,
        celular: form.celular,
        senha: form.senha,
        company_id: parseInt(companyId)
      };

      const url = editingId 
        ? `${API_URL}/api/professionals/${editingId}`
        : `${API_URL}/api/professionals/register`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar profissional.');
      }

      setSuccess(editingId ? 'Profissional atualizado com sucesso!' : 'Profissional cadastrado e vinculado com sucesso!');
      setForm({
        nome: '', cpf: '', data_nascimento: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        email: '', celular: '',
        tipo_profissional: 'medico',
        especialidade: 'Clínico Geral', tipo_conselho: 'CRM', numero_conselho: '',
        senha: '', confirmar_senha: ''
      });
      fetchProfessionals();
      setTimeout(() => setShowModal(false), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredProfs = professionals.filter(p =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tipo_profissional || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Gerenciar Equipe</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cadastre médicos, secretários e administradores vinculados à sua clínica.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Profissional</span>
        </button>
      </div>

      {/* Busca e Lista */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou cargo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>
        {loading ? (
          <div className="flex flex-col justify-center items-center py-12 space-y-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Carregando profissionais...</p>
          </div>
        ) : filteredProfs.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-100 rounded-2xl">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-bold">Nenhum profissional encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-150">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-150">
                <tr>
                  <th className="px-5 py-3">Profissional</th>
                  <th className="px-5 py-3">Contato</th>
                  <th className="px-5 py-3">Cargo / Registro</th>
                  <th className="px-5 py-3">Acesso Sistema</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredProfs.map(prof => (
                  <tr key={prof.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-bold text-slate-800">{prof.nome}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{prof.cpf}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-slate-700">{prof.email}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{prof.celular || 'Sem celular'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase self-start px-2 py-0.5 rounded ${
                          prof.tipo_profissional === 'medico'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : prof.tipo_profissional === 'secretario'
                            ? 'bg-teal-50 text-teal-700 border border-teal-100'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {prof.tipo_profissional === 'medico' ? 'Médico' : prof.tipo_profissional === 'secretario' ? 'Secretário' : 'Administrativo'}
                        </span>
                        {prof.numero_conselho && (
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">
                            {prof.numero_conselho}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleAccess(prof.id, !!prof.ativo)}
                        className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        {prof.ativo ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                            <ToggleRight className="w-6 h-6 shrink-0" />
                            <span>Ativo</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                            <ToggleLeft className="w-6 h-6 shrink-0" />
                            <span>Suspenso</span>
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(prof)}
                          className="p-1.5 border border-slate-100 hover:border-indigo-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar profissional"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveLink(prof.id)}
                        className="p-1.5 border border-slate-100 hover:border-red-100 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Desvincular da clínica"
                      >
                        <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro de Profissional */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowModal(false)} />
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-800">
                {editingId ? 'Editar Membro da Equipe' : 'Cadastrar Membro da Equipe'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {editingId 
                  ? 'Atualize os dados do profissional.' 
                  : 'Cadastre um profissional com login e senha corporativa.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold flex items-start gap-2 animate-shake">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-3.5 rounded-xl text-xs font-bold flex items-start gap-2 animate-pulse">
                <span>✓</span><span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome e CPF e Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo *</label>
                  <input
                    type="text" required
                    value={form.nome}
                    onChange={e => setForm({...form, nome: e.target.value})}
                    placeholder="Ex: Dr. Roberto Santos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Membro *</label>
                  <select
                    value={form.tipo_profissional}
                    onChange={e => setForm({...form, tipo_profissional: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="medico">Médico / Pro de Saúde</option>
                    <option value="secretario">Secretário(a)</option>
                    <option value="administrativo">Administrativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CPF *</label>
                  <input
                    type="text" required
                    value={form.cpf}
                    onChange={e => setForm({...form, cpf: e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)})}
                    placeholder="000.000.000-00"
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs font-medium ${form.cpf ? (isValidCPF(form.cpf) ? 'border-emerald-500 text-emerald-700' : 'border-red-500 text-red-700') : 'border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Nascimento *</label>
                  <input
                    type="date" required
                    value={form.data_nascimento}
                    onChange={e => setForm({...form, data_nascimento: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">E-mail Corporativo *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email" required
                      value={form.email}
                      onChange={e => handleEmailChange(e.target.value)}
                      placeholder="roberto@clinicasaudetotal.com"
                      className={`w-full bg-slate-50 border pl-9 pr-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 ${emailDomainError ? 'border-red-400' : 'border-slate-200'}`}
                    />
                  </div>
                  {emailDomainError && (
                    <p className="text-red-500 text-[10px] font-bold mt-1 leading-snug">⚠️ {emailDomainError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Celular *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="text" required
                      value={form.celular}
                      onChange={e => setForm({...form, celular: e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15)})}
                      placeholder="(00) 00000-0000"
                      className={`w-full bg-slate-50 border pl-9 pr-3.5 py-2 text-xs font-medium focus:outline-none ${form.celular ? (form.celular.length >= 14 ? 'border-emerald-500 text-emerald-700' : 'border-red-500 text-red-700') : 'border-slate-200'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Campos específicos do Médico */}
              {form.tipo_profissional === 'medico' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Especialidade *</label>
                    <select
                      value={form.especialidade}
                      onChange={e => setForm({...form, especialidade: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    >
                      {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Conselho *</label>
                    <select
                      value={form.tipo_conselho}
                      onChange={e => setForm({...form, tipo_conselho: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    >
                      {CONSELHOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nº Registro Conselho *</label>
                    <input
                      type="text" required
                      value={form.numero_conselho}
                      onChange={e => setForm({...form, numero_conselho: e.target.value})}
                      placeholder="123456/SP"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Endereço */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CEP</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </span>
                    <input
                      type="text"
                      value={form.cep}
                      onChange={e => setForm({...form, cep: e.target.value.replace(/\D/g,'')})}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      className={`w-full bg-slate-50 border pl-9 pr-3.5 py-2 text-xs font-medium focus:outline-none ${form.cep ? (form.logradouro ? 'border-emerald-500 text-emerald-700' : cepError ? 'border-red-500 text-red-700' : 'border-slate-200') : 'border-slate-200'}`}
                    />
                  </div>
                  {cepError && <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {cepError}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Logradouro</label>
                  <input
                    type="text"
                    value={form.logradouro}
                    onChange={e => setForm({...form, logradouro: e.target.value})}
                    placeholder="Av/Rua..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Número</label>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={e => setForm({...form, numero: e.target.value})}
                    placeholder="Nº"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Complemento</label>
                  <input
                    type="text"
                    value={form.complemento}
                    onChange={e => setForm({...form, complemento: e.target.value})}
                    placeholder="Sala/Apto"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={form.bairro}
                    onChange={e => setForm({...form, bairro: e.target.value})}
                    placeholder="Bairro"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={e => setForm({...form, cidade: e.target.value})}
                    placeholder="Cidade"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    value={form.estado}
                    onChange={e => setForm({...form, estado: e.target.value.toUpperCase().slice(0,2)})}
                    placeholder="UF"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Login e Senha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Senha de Acesso {editingId ? '(Opcional)' : '*'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'} required={!editingId}
                      value={form.senha}
                      onChange={e => setForm({...form, senha: e.target.value})}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full bg-slate-50 border border-slate-200 pl-9 pr-12 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Confirmar Senha {editingId ? '(Opcional)' : '*'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password" required={!editingId}
                      value={form.confirmar_senha}
                      onChange={e => setForm({...form, confirmar_senha: e.target.value})}
                      placeholder="Repita a senha"
                      className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 transition-all flex items-center gap-1.5"
                >
                  {submitLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                  ) : (
                    <><span>{editingId ? 'Salvar Alterações' : 'Cadastrar e Vincular'}</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
