import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, ShieldCheck, Calendar, CreditCard, Save, Edit3, Lock, Eye, EyeOff, Loader2, Hash } from 'lucide-react';
import { API_URL } from '../../config';

const parseEndereco = (str: string) => {
  if (!str) return { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };
  
  const cepMatch = str.match(/CEP:\s*(\d{5}-\d{3}|\d{8})/i);
  const cep = cepMatch ? cepMatch[1] : '';
  const cleanStr = str.replace(/,\s*CEP:\s*(\d{5}-\d{3}|\d{8})/i, '');
  
  const parts = cleanStr.split(',').map(s => s.trim());
  let logradouro = parts[0] || '';
  let numero = '';
  let complemento = '';
  let bairro = '';
  let cidade = '';
  let estado = '';

  if (parts.length > 1) {
    const numComp = parts[1].split('-').map(s => s.trim());
    numero = numComp[0] || '';
    complemento = numComp[1] || '';
  }

  if (parts.length === 3) {
    const citEst = parts[2].split('-').map(s => s.trim());
    cidade = citEst[0] || '';
    estado = citEst[1] || '';
  } else if (parts.length > 3) {
    bairro = parts[2] || '';
    const citEst = parts[3].split('-').map(s => s.trim());
    cidade = citEst[0] || '';
    estado = citEst[1] || '';
  }

  if (parts.length === 1 && !cep) {
    logradouro = str;
  }

  return { cep, logradouro, numero, complemento, bairro, cidade, estado };
};

export const ClientProfile: React.FC = () => {
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : { email: '' };

  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    nome: '', data_nascimento: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    celular: '',
    plano_empresa: '', plano_nome: '', plano_produto: '', plano_numero_carteirinha: ''
  });
  const [cepLoading, setCepLoading] = useState(false);

  const handleCepBlur = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado
        }));
      }
    } catch {}
    finally { setCepLoading(false); }
  };

  const [passwordForm, setPasswordForm] = useState({ senha_atual: '', nova_senha: '', confirmar_nova_senha: '' });

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/clients`, { headers });
      const clients = await res.json();
      if (Array.isArray(clients)) {
        const mine = clients.find((c: any) => c.email.toLowerCase() === user.email.toLowerCase());
        if (mine) {
          setClientData(mine);
          const parsedAddr = parseEndereco(mine.endereco || '');
          setForm({
            nome: mine.nome || '',
            data_nascimento: mine.data_nascimento ? mine.data_nascimento.split('T')[0] : '',
            cep: parsedAddr.cep,
            logradouro: parsedAddr.logradouro,
            numero: parsedAddr.numero,
            complemento: parsedAddr.complemento,
            bairro: parsedAddr.bairro,
            cidade: parsedAddr.cidade,
            estado: parsedAddr.estado,
            celular: mine.celular || '',
            plano_empresa: mine.plano_empresa || '',
            plano_nome: mine.plano_nome || '',
            plano_produto: mine.plano_produto || '',
            plano_numero_carteirinha: mine.plano_numero_carteirinha || ''
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar perfil');
      setSuccess('Perfil atualizado com sucesso!');
      setEditing(false);
      fetchClientData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-600"></div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm font-bold">
        Perfil de cliente não encontrado.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header Card */}
      <div
        className="rounded-2xl p-6 text-white flex items-center gap-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 70%)' }} />
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <User className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <h1 className="text-xl font-black truncate">{clientData.nome}</h1>
          <p className="text-blue-200 text-xs font-semibold mt-0.5">{clientData.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-bold">
              <ShieldCheck className="w-3 h-3" /> Plano Free
            </span>
            {clientData.lgpd_aceito && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-[11px] font-bold">
                LGPD Aceito
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => { setEditing(!editing); setError(''); setSuccess(''); }}
          className="relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          {editing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {/* Feedback */}
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs font-bold border border-emerald-100">{success}</div>}

      {/* Dados Pessoais */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3">Dados Pessoais</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                disabled={!editing}
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
              />
            </div>
          </div>

          {/* CPF - read only */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CPF</label>
            <input
              type="text" disabled value={clientData.cpf}
              className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Data Nascimento */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Data de Nascimento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                min="1940-01-01"
                max={new Date().toISOString().split('T')[0]}
                disabled={!editing}
                value={form.data_nascimento}
                onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
          </div>

          {/* Celular */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Celular</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                disabled={!editing}
                value={form.celular}
                onChange={e => setForm({ ...form, celular: e.target.value })}
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
          </div>

          {/* Email - read only */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">E-mail (Login)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email" disabled value={clientData.email}
                className="w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* CEP */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CEP</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </span>
              <input
                type="text"
                disabled={!editing}
                placeholder="00000-000"
                value={form.cep}
                onChange={e => setForm({...form, cep: e.target.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9)})}
                onBlur={handleCepBlur}
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
                maxLength={9}
              />
            </div>
          </div>

          {/* Número */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Número</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Hash className="w-4 h-4" />
              </span>
              <input
                type="text"
                disabled={!editing}
                placeholder="Ex: 123"
                value={form.numero}
                onChange={e => setForm({...form, numero: e.target.value})}
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
              />
            </div>
          </div>

          {/* Logradouro */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Logradouro</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                type="text"
                disabled={!editing}
                placeholder="Rua, Avenida..."
                value={form.logradouro}
                onChange={e => setForm({...form, logradouro: e.target.value})}
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
              />
            </div>
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Bairro</label>
            <input
              type="text"
              disabled={!editing}
              placeholder="Bairro"
              value={form.bairro}
              onChange={e => setForm({...form, bairro: e.target.value})}
              className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
            />
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Cidade</label>
            <input
              type="text"
              disabled={!editing}
              placeholder="Cidade"
              value={form.cidade}
              onChange={e => setForm({...form, cidade: e.target.value})}
              className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Estado (UF)</label>
            <input
              type="text"
              disabled={!editing}
              placeholder="Ex: SP"
              value={form.estado}
              onChange={e => setForm({...form, estado: e.target.value.toUpperCase().slice(0,2)})}
              maxLength={2}
              className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
            />
          </div>

          {/* Complemento */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Complemento <span className="text-slate-400 font-normal">(opcional)</span></label>
            <input
              type="text"
              disabled={!editing}
              placeholder="Apto, Sala..."
              value={form.complemento}
              onChange={e => setForm({...form, complemento: e.target.value})}
              className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
            />
          </div>
        </div>

        {/* Plano de Saúde */}
        <div>
          <h3 className="text-xs font-black text-slate-700 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-primary-500" /> Plano de Saúde
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Operadora / Empresa</label>
              <input
                type="text" placeholder="Ex: Bradesco, Unimed"
                disabled={!editing}
                value={form.plano_empresa}
                onChange={e => setForm({ ...form, plano_empresa: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Plano</label>
              <input
                type="text"
                disabled={!editing}
                value={form.plano_nome}
                onChange={e => setForm({ ...form, plano_nome: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Produto</label>
              <input
                type="text"
                disabled={!editing}
                value={form.plano_produto}
                onChange={e => setForm({ ...form, plano_produto: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nº da Carteirinha</label>
              <input
                type="text"
                disabled={!editing}
                value={form.plano_numero_carteirinha}
                onChange={e => setForm({ ...form, plano_numero_carteirinha: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-primary-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
          </div>
        </div>

        {editing && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        )}
      </form>

      {/* Segurança - Alterar Senha */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <button
          onClick={() => setShowPasswordSection(!showPasswordSection)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary-500" /> Segurança
          </h2>
          <span className="text-xs font-bold text-primary-600">{showPasswordSection ? 'Ocultar' : 'Alterar senha'}</span>
        </button>

        {showPasswordSection && (
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="md:col-span-2 text-xs text-slate-500 font-medium">A alteração de senha exige confirmação no backend. Funcionalidade será conectada ao endpoint /api/auth/change-password.</p>
            {[
              { label: 'Senha Atual', key: 'senha_atual' },
              { label: 'Nova Senha', key: 'nova_senha' },
              { label: 'Confirmar Nova Senha', key: 'confirmar_nova_senha' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-bold text-slate-500 mb-1">{field.label}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={(passwordForm as any)[field.key]}
                    onChange={e => setPasswordForm({ ...passwordForm, [field.key]: e.target.value })}
                    className="w-full pl-9 pr-9 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-primary-400"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
            <div className="md:col-span-2 flex justify-end">
              <button type="button" className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors">
                Atualizar Senha
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
