import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { API_URL } from '../../config';

export const ClientDependents: React.FC = () => {
  const [dependents, setDependents] = useState<any[]>([]);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const activeProfileId = localStorage.getItem('activeProfileId');
  const activeProfileRole = localStorage.getItem('activeProfileRole');


  const [form, setForm] = useState({
    nome: '', cpf: '', data_nascimento: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    email: '', celular: '',
    plano_empresa: '', plano_nome: '', plano_produto: '', plano_numero_carteirinha: '', senha: ''
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
    fetchClientAndDependents();
  }, [activeProfileId, activeProfileRole]);

  const fetchClientAndDependents = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/clients`, { headers });
      const clients = await res.json();
      
      if (Array.isArray(clients)) {
        if (activeProfileRole === 'client') {
          const currentClient = clients.find(c => String(c.id) === String(activeProfileId));
          if (currentClient) {
            setClientData(currentClient);
            const resD = await fetch(`${API_URL}/api/dependents/client/${currentClient.id}`, { headers });
            const deps = await resD.json();
            setDependents(Array.isArray(deps) ? deps : []);
          }
        } else {
          // É dependente
          let foundParent = null;
          for (const client of clients) {
            const resD = await fetch(`${API_URL}/api/dependents/client/${client.id}`, { headers });
            const deps = await resD.json();
            const hasMe = Array.isArray(deps) ? deps.some(d => String(d.id) === String(activeProfileId)) : false;
            if (hasMe) {
              foundParent = client;
              setDependents(deps);
              break;
            }
          }
          setClientData(foundParent);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeProfileRole !== 'client') return; // Segurança

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/dependents/client/${clientData.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar dependente');
      }

      setSuccess('Dependente adicionado com sucesso!');
      setForm({
        nome: '', cpf: '', data_nascimento: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        email: '', celular: '',
        plano_empresa: '', plano_nome: '', plano_produto: '', plano_numero_carteirinha: '', senha: ''
      });
      fetchClientAndDependents();
      setTimeout(() => setShowAddModal(false), 1500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (activeProfileRole !== 'client') return; // Segurança
    if (!confirm('Deseja realmente remover este dependente?')) return;
    try {
      const response = await fetch(`${API_URL}/api/dependents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchClientAndDependents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  const isEditable = activeProfileRole === 'client';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Círculo Familiar</h2>
          <p className="text-xs text-slate-500 font-medium">Dependentes vinculados à assinatura (Máximo 2 dependentes no Plano Free)</p>
        </div>
        {isEditable && (
          <button
            onClick={() => {
              if (dependents.length >= 2) {
                alert('Limite de 2 dependentes atingido para a sua conta.');
                return;
              }
              setShowAddModal(true);
            }}
            disabled={dependents.length >= 2}
            className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all ${
              dependents.length >= 2
                ? 'bg-slate-400 cursor-not-allowed opacity-75'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-xs'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{dependents.length >= 2 ? 'Limite Atingido (2/2)' : `Adicionar Dependente (${dependents.length}/2)`}</span>
          </button>
        )}
      </div>

      {dependents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Nenhum dependente cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dependents.map(dep => (
            <div key={dep.id} className="border border-slate-100 bg-slate-50 rounded-2xl p-5 relative flex flex-col justify-between">
              {isEditable && (
                <button
                  onClick={() => handleDelete(dep.id)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              <div>
                <h4 className="text-sm font-bold text-slate-800">{dep.nome}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Dependente</p>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-4 text-xs font-semibold text-slate-600">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CPF</p>
                    <p className="text-slate-800 font-bold mt-0.5">{dep.cpf}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nascimento</p>
                    <p className="text-slate-800 font-bold mt-0.5">
                      {new Date(dep.data_nascimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plano</p>
                    <p className="text-slate-800 font-bold mt-0.5">
                      {dep.plano_empresa ? `${dep.plano_empresa} - ${dep.plano_nome} (${dep.plano_numero_carteirinha})` : 'Sem plano associado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Dependente */}
      {showAddModal && isEditable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-[2rem] w-full max-w-xl p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-black text-slate-800 mb-6">Cadastrar Dependente</h3>
            
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-4">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold mb-4">{success}</div>}

            <form onSubmit={handleAddDependent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                  <input
                    type="text" required
                    value={form.nome}
                    onChange={e => setForm({...form, nome: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CPF</label>
                  <input
                    type="text" required placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={e => setForm({...form, cpf: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Nascimento</label>
                  <input
                    type="date" required
                    min="1940-01-01"
                    max={new Date().toISOString().split('T')[0]}
                    value={form.data_nascimento}
                    onChange={e => setForm({...form, data_nascimento: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2 border-b border-slate-100 pb-1.5 mt-2">
                  <h4 className="text-xs font-black text-slate-700">Endereço</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CEP</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      {cepLoading ? <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" /> : '📍'}
                    </span>
                    <input type="text" required placeholder="00000-000"
                      value={form.cep}
                      onChange={e => setForm({...form, cep: e.target.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9)})}
                      onBlur={handleCepBlur} maxLength={9}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Número</label>
                  <input type="text" required placeholder="Ex: 123"
                    value={form.numero}
                    onChange={e => setForm({...form, numero: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Logradouro</label>
                  <input type="text" required placeholder="Rua, Avenida..."
                    value={form.logradouro}
                    onChange={e => setForm({...form, logradouro: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estado (UF)</label>
                  <input type="text" required placeholder="Ex: SP"
                    value={form.estado}
                    onChange={e => setForm({...form, estado: e.target.value.toUpperCase().slice(0,2)})}
                    maxLength={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Complemento <span className="text-slate-400 font-normal">(opcional)</span></label>
                  <input type="text" placeholder="Apto, Sala..."
                    value={form.complemento}
                    onChange={e => setForm({...form, complemento: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <h4 className="text-xs font-black text-slate-700 mt-2 border-b border-slate-100 pb-2">Plano de Saúde (Opcional)</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Operadora / Empresa</label>
                  <input
                    type="text"
                    value={form.plano_empresa}
                    onChange={e => setForm({...form, plano_empresa: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Plano</label>
                  <input
                    type="text"
                    value={form.plano_nome}
                    onChange={e => setForm({...form, plano_nome: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Produto</label>
                  <input
                    type="text"
                    value={form.plano_produto}
                    onChange={e => setForm({...form, plano_produto: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Carteirinha</label>
                  <input
                    type="text"
                    value={form.plano_numero_carteirinha}
                    onChange={e => setForm({...form, plano_numero_carteirinha: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none"
                  />
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 transition-colors cursor-pointer"
                >
                  Salvar Dependente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
