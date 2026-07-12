import React, { useState, useEffect } from 'react';
import { Building2, CreditCard, Plus, X, User, Mail, Lock, Phone, Save, Eye as EyeIcon } from 'lucide-react';
import { API_URL } from '../../config';

export const CompanyList: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<any>(null);

  const token = localStorage.getItem('token');

  // Form para novas empresas/clínicas
  const [form, setForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    nome_responsavel: '',
    cpf_responsavel: '',
    cargo_responsavel: '',
    email: '',
    celular: '',
    senha: ''
  });

  useEffect(() => {
    fetchCompanies();
    if (window.location.search.includes('add=true')) {
      setShowAddModal(true);
    }
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_URL}/api/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePayment = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/companies/${id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paid: !currentStatus })
      });
      if (response.ok) {
        fetchCompanies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/companies/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar instituição');
      }

      setSuccess('Instituição de saúde cadastrada com sucesso!');
      setForm({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        nome_responsavel: '',
        cpf_responsavel: '',
        cargo_responsavel: '',
        email: '',
        celular: '',
        senha: ''
      });

      fetchCompanies();
      setTimeout(() => setShowAddModal(false), 1500);
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
          <h2 className="text-xl font-black text-slate-800">Instituições de Saúde</h2>
          <p className="text-xs text-slate-500 font-medium">Clínicas e Hospitais parceiros ativos</p>
        </div>
        <button
          onClick={() => {
            setError('');
            setSuccess('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Instituição</span>
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-100 rounded-2xl">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Nenhuma instituição cadastrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <th className="p-4">Razão Social / Nome Fantasia</th>
                <th className="p-4">CNPJ</th>
                <th className="p-4">Responsável</th>
                <th className="p-4">Status Licença</th>
                <th className="p-4 text-right">Ações Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
              {companies.map(company => (
                <tr key={company.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{company.razao_social}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{company.nome_fantasia}</p>
                  </td>
                  <td className="p-4">{company.cnpj}</td>
                  <td className="p-4">
                    <p>{company.nome_responsavel}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{company.cargo_responsavel} | {company.celular}</p>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      company.pago 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {company.pago ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleTogglePayment(company.id, company.pago)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-primary-50 hover:text-primary-600 rounded-lg border border-slate-200 hover:border-primary-100 text-slate-500 font-bold transition-all cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{company.pago ? 'Marcar Pendente' : 'Marcar Pago'}</span>
                      </button>
                      <button
                        onClick={() => setViewingCompany(company)}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Visualizar Dados"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Visualizar Empresa */}
      {viewingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingCompany(null)} />
          <div className="bg-white rounded-3xl w-full max-w-3xl p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Dados da Instituição</h3>
                  <p className="text-sm font-semibold text-slate-500">Visualização de perfil</p>
                </div>
              </div>
              <button
                onClick={() => setViewingCompany(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dados da Empresa</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Razão Social</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.razao_social}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nome Fantasia</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.nome_fantasia}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.cnpj}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Contato & Endereço</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Telefone / Celular</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.celular || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Endereço Completo</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.endereco || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Responsável Técnico / Legal</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nome do Responsável</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.nome_responsavel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">CPF do Responsável</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.cpf_responsavel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Cargo / Função</p>
                    <p className="text-sm font-bold text-slate-800">{viewingCompany.cargo_responsavel}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={() => setViewingCompany(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Instituição */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-black text-slate-800">Cadastrar Nova Instituição (Clínica/Hospital)</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3.5 border border-red-100 rounded-xl text-xs font-bold mb-4">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 border border-emerald-100 rounded-xl text-xs font-bold mb-4">{success}</div>}

            <form onSubmit={handleAddCompanySubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="col-span-2 border-b border-slate-100 pb-1.5">
                  <h4 className="text-xs font-black text-slate-700">Dados da Instituição</h4>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Razão Social</label>
                  <input
                    type="text" required
                    value={form.razao_social}
                    onChange={e => setForm({...form, razao_social: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome Fantasia</label>
                  <input
                    type="text" required
                    value={form.nome_fantasia}
                    onChange={e => setForm({...form, nome_fantasia: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CNPJ</label>
                  <input
                    type="text" required placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={e => setForm({...form, cnpj: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                <div className="col-span-2 border-b border-slate-100 pb-1.5 mt-2">
                  <h4 className="text-xs font-black text-slate-700">Responsável Legal</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Responsável</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text" required
                      value={form.nome_responsavel}
                      onChange={e => setForm({...form, nome_responsavel: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CPF do Responsável</label>
                  <input
                    type="text" required placeholder="000.000.000-00"
                    value={form.cpf_responsavel}
                    onChange={e => setForm({...form, cpf_responsavel: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Cargo do Responsável</label>
                  <input
                    type="text" required placeholder="Diretor, Administrador..."
                    value={form.cargo_responsavel}
                    onChange={e => setForm({...form, cargo_responsavel: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Celular / Contato</label>
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
                  <h4 className="text-xs font-black text-slate-700">Dados de Acesso (Login)</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">E-mail corporativo (Login)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email" required placeholder="clinica@email.com"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Senha de Acesso</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password" required placeholder="senha temporária"
                      value={form.senha}
                      onChange={e => setForm({...form, senha: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-400"
                    />
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
                  {saving ? 'Cadastrando...' : 'Cadastrar Instituição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
