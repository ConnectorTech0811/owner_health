import React, { useState } from 'react';
import {
  Search, ClipboardList, FlaskConical, Pill, Scale, FileText,
  Loader2, ShieldAlert, ShieldCheck, Download, Calendar
} from 'lucide-react';
import { API_URL } from '../../config';

export const CompanyPatientData: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('anamnesis'); // anamnesis, exams, prescriptions, bioimpedance

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    setError('');
    setPatientData(null);

    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/patient-data/${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível encontrar o paciente ou o acesso não foi compartilhado.');
      }
      setPatientData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-600" />
          <span>Prontuários e Exames Compartilhados</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Pesquise o CPF ou o código de compartilhamento temporário gerado pelo paciente para visualizar dados clínicos e exames.
        </p>
      </div>

      {/* Barra de Busca de Paciente */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              required
              placeholder="Digite o CPF ou o código temporário do paciente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Consultar Prontuário'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-xs font-bold mt-4 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Prontuário do Paciente */}
      {patientData && (
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
                    {new Date(patientData.patient.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
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
                    {patientData.anamnesis.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-10">O paciente não preencheu o formulário de anamnese.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold text-slate-600">
                        {patientData.anamnesis.map((a: any) => (
                          <React.Fragment key={a.id}>
                            <div className="sm:col-span-2 border-b border-slate-100 pb-2 flex justify-between text-slate-400">
                              <span>Prontuário Preenchido em:</span>
                              <span className="font-bold">{new Date(a.criado_em).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider">Queixa Principal</p>
                              <p className="text-slate-800 font-bold mt-1 leading-relaxed">{a.queixa_principal || 'Não informada'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Histórico de Doenças</p>
                              <p className="text-slate-800 font-bold mt-1 leading-relaxed">{a.historico_doencas || 'Nenhum'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alergias</p>
                              <p className="text-slate-800 font-bold mt-1 leading-relaxed">{a.alergias || 'Nenhuma'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Medicamentos em Uso</p>
                              <p className="text-slate-800 font-bold mt-1 leading-relaxed">{a.medicamentos_uso || 'Nenhum'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Histórico Familiar</p>
                              <p className="text-slate-800 font-bold mt-1 leading-relaxed">{a.historico_familiar || 'Nenhum'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hábitos</p>
                              <p className="text-slate-800 font-bold mt-1 leading-relaxed">{a.habitos || 'Sem hábitos declarados'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pressão Arterial</p>
                                <p className="text-slate-800 font-bold mt-1">{a.pressao_arterial || 'N/I'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Glicemia</p>
                                <p className="text-slate-800 font-bold mt-1">{a.glicemia || 'N/I'}</p>
                              </div>
                            </div>
                          </React.Fragment>
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
      )}
    </div>
  );
};
