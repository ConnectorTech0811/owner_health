import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, ShieldCheck, Calendar, CreditCard, Save, Edit3, Loader2, Hash } from 'lucide-react';
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
  const activeProfileId = localStorage.getItem('activeProfileId');
  const activeProfileRole = localStorage.getItem('activeProfileRole');

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  useEffect(() => {
    fetchProfileData();
  }, [activeProfileId, activeProfileRole]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      if (activeProfileRole === 'client') {
        const res = await fetch(`${API_URL}/api/clients/${activeProfileId}`, { headers });
        const client = await res.json();
        setProfileData(client);
        const parsedAddr = parseEndereco(client.endereco || '');
        setForm({
          nome: client.nome || '',
          data_nascimento: client.data_nascimento ? client.data_nascimento.split('T')[0] : '',
          cep: parsedAddr.cep,
          logradouro: parsedAddr.logradouro,
          numero: parsedAddr.numero,
          complemento: parsedAddr.complemento,
          bairro: parsedAddr.bairro,
          cidade: parsedAddr.cidade,
          estado: parsedAddr.estado,
          celular: client.celular || '',
          plano_empresa: client.plano_empresa || '',
          plano_nome: client.plano_nome || '',
          plano_produto: client.plano_produto || '',
          plano_numero_carteirinha: client.plano_numero_carteirinha || ''
        });
      } else {
        // Buscar dependente (temos que buscar na lista de clientes/dependentes)
        const res = await fetch(`${API_URL}/api/clients`, { headers });
        const clients = await res.json();
        let foundDep = null;
        for (const client of clients) {
          const resD = await fetch(`${API_URL}/api/dependents/client/${client.id}`, { headers });
          const deps = await resD.json();
          const dep = Array.isArray(deps) ? deps.find(d => String(d.id) === String(activeProfileId)) : null;
          if (dep) {
            foundDep = dep;
            break;
          }
        }

        if (foundDep) {
          setProfileData(foundDep);
          const parsedAddr = parseEndereco(foundDep.endereco || '');
          setForm({
            nome: foundDep.nome || '',
            data_nascimento: foundDep.data_nascimento ? foundDep.data_nascimento.split('T')[0] : '',
            cep: parsedAddr.cep,
            logradouro: parsedAddr.logradouro,
            numero: parsedAddr.numero,
            complemento: parsedAddr.complemento,
            bairro: parsedAddr.bairro,
            cidade: parsedAddr.cidade,
            estado: parsedAddr.estado,
            celular: foundDep.celular || '',
            plano_empresa: foundDep.plano_empresa || '',
            plano_nome: foundDep.plano_nome || '',
            plano_produto: foundDep.plano_produto || '',
            plano_numero_carteirinha: foundDep.plano_numero_carteirinha || ''
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
    if (activeProfileRole !== 'client') return; // Segurança

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/clients/${activeProfileId}`, {
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
      fetchProfileData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm font-bold">
        Perfil não encontrado.
      </div>
    );
  }

  const isEditable = activeProfileRole === 'client';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Card */}
      <div
        className="rounded-2xl p-6 text-white flex items-center gap-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
      >
        <div className="absolute inset-0 opacity-10 animate-pulse" />
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <User className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <h1 className="text-xl font-black truncate">{profileData.nome}</h1>
          <p className="text-blue-200 text-xs font-semibold mt-0.5">{profileData.email || 'Dependente sem e-mail próprio'}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-bold">
              <ShieldCheck className="w-3 h-3" /> {activeProfileRole === 'client' ? 'Titular' : 'Dependente'}
            </span>
          </div>
        </div>
        
        {isEditable && (
          <button
            onClick={() => { setEditing(!editing); setError(''); setSuccess(''); }}
            className="relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        )}
      </div>

      {/* Feedback */}
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs font-bold border border-emerald-100">{success}</div>}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-800">Dados Cadastrais</h2>
          {!isEditable && (
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apenas Leitura</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                disabled={!editing}
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CPF</label>
            <input
              type="text" disabled value={profileData.cpf}
              className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
            />
          </div>

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
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Celular</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                disabled={!editing}
                value={form.celular}
                onChange={e => setForm({ ...form, celular: e.target.value })}
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                disabled={true}
                value={profileData.email || 'Não informado'}
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
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
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
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
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
                className={`w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
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
              className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
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
              className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
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
              className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
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
              className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'}`}
            />
          </div>
        </div>

        {/* Health Plan Info */}
        <div>
          <h3 className="text-xs font-black text-slate-700 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Detalhes do Plano de Saúde
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Operadora / Empresa</label>
              <input
                type="text"
                disabled={!editing}
                value={form.plano_empresa}
                onChange={e => setForm({ ...form, plano_empresa: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Plano</label>
              <input
                type="text"
                disabled={!editing}
                value={form.plano_nome}
                onChange={e => setForm({ ...form, plano_nome: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Produto</label>
              <input
                type="text"
                disabled={!editing}
                value={form.plano_produto}
                onChange={e => setForm({ ...form, plano_produto: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Número da Carteirinha</label>
              <input
                type="text"
                disabled={!editing}
                value={form.plano_numero_carteirinha}
                onChange={e => setForm({ ...form, plano_numero_carteirinha: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${editing ? 'bg-white border-blue-300 focus:outline-none' : 'bg-slate-50 border-slate-200 cursor-default'}`}
              />
            </div>
          </div>
        </div>

        {editing && isEditable && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
