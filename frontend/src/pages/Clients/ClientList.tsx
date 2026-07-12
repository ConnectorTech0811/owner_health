import React, { useState, useEffect } from 'react';
import { Users, Plus, X, User, Mail, Lock, Calendar, Phone, MapPin, Hash, Loader2, Save, Eye, EyeOff, Eye as EyeIcon } from 'lucide-react';
import { API_URL } from '../../config';

// Mascara CPF: 000.000.000-00
const maskCpf = (v: string) =>
  v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);

const validateCpf = (v: string) => v.replace(/\D/g, '').length === 11;

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingClient, setViewingClient] = useState<any>(null);

  const token = localStorage.getItem('token');

  const emptyForm = {
    nome: '',
    cpf: '',
    data_nascimento: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    email: '',
    celular: '',
    plano_empresa: '',
    plano_nome: '',
    plano_produto: '',
    plano_numero_carteirinha: '',
    senha: '',
    acceptLGPD: true
  };

  const [form, setForm] = useState(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  useEffect(() => {
    fetchClients();
    if (window.location.search.includes('add=true')) {
      setShowAddModal(true);
    }
  }, []);

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

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    try {
      const response = await fetch(`${API_URL}/api/clients/${id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchClients();
      else alert('Erro ao alterar status do cliente');
    } catch (err) { console.error(err); }
  };

  const handleTogglePayment = async (id: number, currentPayment: string) => {
    const newPayment = currentPayment === 'pago' ? 'pendente' : 'pago';
    try {
      const response = await fetch(`${API_URL}/api/clients/${id}/payment-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pagamento_status: newPayment })
      });
      if (response.ok) fetchClients();
      else alert('Erro ao alterar status de pagamento');
    } catch (err) { console.error(err); }
  };

  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (cpfError) { setError('Corrija o CPF antes de continuar.'); setSaving(false); return; }
    if (cepError) { setError('Corrija o CEP antes de continuar.'); setSaving(false); return; }
    if (!validateCpf(form.cpf)) { setCpfError('CPF inválido.'); setError('Corrija o CPF antes de continuar.'); setSaving(false); return; }

    // Validação de maior de 18 anos
    const birth = new Date(form.data_nascimento);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    if (age < 18) {
      setError('O cliente titular deve possuir mais de 18 anos.');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/clients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');

      setSuccess('Cliente cadastrado com sucesso! Um e-mail de primeiro acesso foi enviado.');
      setForm(emptyForm);
      setCepError('');
      setCpfError('');
      setShowSenha(false);
      fetchClients();
      setTimeout(() => setShowAddModal(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Clientes Cadastrados</h2>
          <p className="text-xs text-slate-500 font-medium">Lista de usuários titulares da plataforma e gerenciamento de acessos</p>
        </div>
        <button
          onClick={() => {
            setError('');
            setSuccess('');
            setCepError('');
            setCpfError('');
            setShowSenha(false);
            setForm(emptyForm);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-100 rounded-2xl">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Nenhum cliente cadastrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <th className="p-4">Nome</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Nascimento</th>
                <th className="p-4">Contato</th>
                <th className="p-4">Plano de Saúde</th>
                <th className="p-4">Status Acesso</th>
                <th className="p-4">Pagamento</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50/50">
                  <td className="p-4">{client.nome}</td>
                  <td className="p-4">{client.cpf}</td>
                  <td className="p-4">{new Date(client.data_nascimento).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">
                    <p>{client.celular}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{client.email}</p>
                  </td>
                  <td className="p-4">
                    {client.plano_empresa ? (
                      <div>
                        <p className="font-bold text-primary-600">{client.plano_empresa}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{client.plano_nome} - {client.plano_numero_carteirinha}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium">Não informado</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleStatus(client.id, client.status || 'ativo')}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${(client.status || 'ativo') === 'ativo'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                    >
                      {(client.status || 'ativo') === 'ativo' ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleTogglePayment(client.id, client.pagamento_status || 'pago')}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${(client.pagamento_status || 'pago') === 'pago'
                          ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                          : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                        }`}
                    >
                      {(client.pagamento_status || 'pago') === 'pago' ? 'Pago' : 'Pendente'}
                    </button>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => setViewingClient(client)}
                      className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                      title="Visualizar Dados"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Visualizar Cliente */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingClient(null)} />
          <div className="bg-white rounded-3xl w-full max-w-3xl p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Dados do Cliente</h3>
                  <p className="text-sm font-semibold text-slate-500">Visualização de perfil</p>
                </div>
              </div>
              <button
                onClick={() => setViewingClient(null)}
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
                    <p className="text-sm font-bold text-slate-800">{viewingClient.nome}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">CPF</p>
                    <p className="text-sm font-bold text-slate-800">{viewingClient.cpf}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Data Nascimento</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(viewingClient.data_nascimento).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Sexo</p>
                    <p className="text-sm font-bold text-slate-800 capitalize">{viewingClient.sexo || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Contato & Endereço</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail</p>
                    <p className="text-sm font-bold text-slate-800">{viewingClient.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Celular</p>
                    <p className="text-sm font-bold text-slate-800">{viewingClient.celular || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Endereço</p>
                    <p className="text-sm font-bold text-slate-800">{viewingClient.endereco || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Plano de Saúde</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Operadora</p>
                    <p className="text-sm font-bold text-slate-800">{viewingClient.plano_empresa || 'Particular'}</p>
                  </div>
                  {viewingClient.plano_empresa && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Plano</p>
                        <p className="text-sm font-bold text-slate-800">{viewingClient.plano_nome}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Acomodação</p>
                        <p className="text-sm font-bold text-slate-800">{viewingClient.plano_produto}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Carteirinha</p>
                        <p className="text-sm font-bold text-slate-800">{viewingClient.plano_numero_carteirinha}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={() => setViewingClient(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-black text-slate-800">Cadastrar Novo Cliente</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3.5 border border-red-100 rounded-xl text-xs font-bold mb-4">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 border border-emerald-100 rounded-xl text-xs font-bold mb-4">{success}</div>}

            <form onSubmit={handleAddClientSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">

                <div className="col-span-2 border-b border-slate-100 pb-1.5">
                  <h4 className="text-xs font-black text-slate-700">Dados Pessoais</h4>
                </div>

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
                      onChange={e => setForm({ ...form, nome: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CPF</label>
                  <input
                    type="text" required placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={e => { setForm({ ...form, cpf: maskCpf(e.target.value) }); setCpfError(''); }}
                    onBlur={handleCpfBlur}
                    maxLength={14}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400 ${cpfError ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {cpfError && <p className="text-red-500 text-[10px] font-bold mt-1">⚠ {cpfError}</p>}
                </div>

                {/* Data Nascimento */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Nascimento</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date" required
                      value={form.data_nascimento}
                      onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                {/* Celular */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Celular</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="text" required placeholder="(00) 00000-0000"
                      value={form.celular}
                      onChange={e => setForm({ ...form, celular: e.target.value })}
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

                <div className="col-span-2 border-b border-slate-100 pb-1.5 mt-2">
                  <h4 className="text-xs font-black text-slate-700">Plano de Saúde <span className="font-normal text-slate-400">(Opcional)</span></h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Operadora / Empresa</label>
                  <input type="text" placeholder="Bradesco, Unimed..." value={form.plano_empresa}
                    onChange={e => setForm({ ...form, plano_empresa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Plano</label>
                  <input type="text" placeholder="Ex: Top Nacional" value={form.plano_nome}
                    onChange={e => setForm({ ...form, plano_nome: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Produto</label>
                  <input type="text" value={form.plano_produto}
                    onChange={e => setForm({ ...form, plano_produto: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nº da Carteirinha</label>
                  <input type="text" placeholder="Número impresso" value={form.plano_numero_carteirinha}
                    onChange={e => setForm({ ...form, plano_numero_carteirinha: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400" />
                </div>

                <div className="col-span-2 border-b border-slate-100 pb-1.5 mt-2">
                  <h4 className="text-xs font-black text-slate-700">Dados de Acesso (Login)</h4>
                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                    ⚠ Uma senha temporária será criada e um e-mail de primeiro acesso será enviado ao cliente.
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
                      type="email" required placeholder="cliente@email.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
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
                      onChange={e => setForm({ ...form, senha: e.target.value })}
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-600/10 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
