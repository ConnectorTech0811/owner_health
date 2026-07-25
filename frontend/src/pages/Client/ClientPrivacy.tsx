import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Download, Trash2, Calendar, UserCheck, RefreshCw } from 'lucide-react';
import { API_URL } from '../../config';

interface ShareRule {
  id: string;
  examId: number;
  examTipo: string;
  profNome: string;
  duration: string;
  criadoEm: string;
}

export const ClientPrivacy: React.FC = () => {
  const [lgpdAccepted, setLgpdAccepted] = useState(true);
  const [acceptedDate, setAcceptedDate] = useState('');
  const [shareRules, setShareRules] = useState<ShareRule[]>([]);
  const [consentMarketing, setConsentMarketing] = useState(true);
  const [consentResearch, setConsentResearch] = useState(false);

  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [activeAccesses, setActiveAccesses] = useState<any[]>([]);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [grantMessage, setGrantMessage] = useState('');

  const activeProfileId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchPrivacyData();
    loadShareRules();
    fetchDoctors();
    fetchActiveAccesses();

    const interval = setInterval(() => {
      fetchActiveAccesses();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeProfileId]);

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/professionals`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDoctorsList(data.filter((p: any) => p.tipo_profissional === 'medico'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveAccesses = async () => {
    if (!activeProfileId) return;
    try {
      const res = await fetch(`${API_URL}/api/access?cliente_id=${activeProfileId}`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setActiveAccesses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGrantDoctorAccess = async () => {
    if (!selectedDoctorId || !activeProfileId) {
      alert('Selecione um médico para conceder o acesso.');
      return;
    }
    setGrantingAccess(true);
    setGrantMessage('');
    try {
      const res = await fetch(`${API_URL}/api/access/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cliente_id: parseInt(activeProfileId),
          medico_id: parseInt(selectedDoctorId),
          concedido_por: 'paciente'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao conceder acesso');
      setGrantMessage('Acesso concedido com sucesso! Notificação enviada ao médico.');
      setSelectedDoctorId('');
      fetchActiveAccesses();
      setTimeout(() => setGrantMessage(''), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGrantingAccess(false);
    }
  };

  const handleRevokeDoctorAccess = async (medicoId: number) => {
    if (!confirm('Deseja revogar o acesso deste médico ao seu prontuário?')) return;
    try {
      const res = await fetch(`${API_URL}/api/access/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cliente_id: parseInt(activeProfileId!),
          medico_id: medicoId
        })
      });
      if (res.ok) {
        alert('Acesso revogado com sucesso.');
        fetchActiveAccesses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPrivacyData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/clients/${activeProfileId}`, { headers });
      const client = await res.json();
      if (client) {
        setLgpdAccepted(client.lgpd_aceito !== false);
        setAcceptedDate(client.lgpd_aceito_em ? new Date(client.lgpd_aceito_em).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'));
      }
    } catch {
      setAcceptedDate(new Date().toLocaleDateString('pt-BR'));
    }
  };

  const loadShareRules = () => {
    // Carregar exames mockados compartilhados do localStorage
    // Para fins demonstrativos, geramos 2 regras se não houver no cache
    const cached = localStorage.getItem(`shares_${activeProfileId}`);
    if (cached) {
      setShareRules(JSON.parse(cached));
    } else {
      const initialRules: ShareRule[] = [
        {
          id: 'rule-1',
          examId: 1,
          examTipo: 'Glicemia em Jejum',
          profNome: 'Dr. Roberto Santos',
          duration: '48 Horas',
          criadoEm: new Date().toLocaleDateString('pt-BR')
        }
      ];
      setShareRules(initialRules);
      localStorage.setItem(`shares_${activeProfileId}`, JSON.stringify(initialRules));
    }
  };

  const handleRevokeShare = (id: string) => {
    if (!confirm('Deseja revogar o acesso deste profissional a este exame imediatamente?')) return;
    const filtered = shareRules.filter(r => r.id !== id);
    setShareRules(filtered);
    localStorage.setItem(`shares_${activeProfileId}`, JSON.stringify(filtered));
    alert('Acesso revogado com sucesso.');
  };

  const handleExportData = () => {
    const data = {
      profileId: activeProfileId,
      profileName: localStorage.getItem('activeProfileName'),
      exportDate: new Date().toISOString(),
      lgpdStatus: {
        aceito: lgpdAccepted,
        dataAceite: acceptedDate,
        versao: '1.0'
      },
      consentimentos: {
        pesquisaCientifica: consentResearch,
        comunicacaoSaude: consentMarketing
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dados_lgpd_${activeProfileId}.json`;
    link.click();
  };

  const handleDeleteAccount = () => {
    const confirmText = prompt('Esta ação é permanente e apagará todos os seus exames, dependentes e prontuários. Para confirmar, digite EXCLUIR CONTA:');
    if (confirmText === 'EXCLUIR CONTA') {
      alert('Sua solicitação de exclusão foi enviada à equipe de LGPD. Seus dados serão expurgados em até 15 dias conforme a regulamentação.');
    } else if (confirmText !== null) {
      alert('Confirmação incorreta.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">Privacidade & LGPD</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Controle o consentimento de seus dados médicos e gerencie permissões de acesso médico</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Painel LGPD - Col 7 */}
        <div className="md:col-span-7 space-y-6">
          {/* Card Termo Aceito */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Status do Consentimento LGPD</span>
            </h3>

            <div className="flex items-center gap-3.5 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-900">
              <Shield className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-800">Termo de Uso Aceito ✓</p>
                <p className="text-[11px] font-medium leading-relaxed mt-0.5">
                  Você aceitou a Política de Privacidade e Tratamento de Dados do Owner Health em <b>{acceptedDate}</b>. Seus dados médicos estão protegidos por criptografia de ponta a ponta.
                </p>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suas Preferências de Compartilhamento</h4>
              
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={consentResearch}
                  onChange={e => setConsentResearch(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 border-slate-300 mt-0.5 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-700">Compartilhar dados estatísticos para pesquisa</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">Autorizo o Owner Health a anonimizar meus exames para uso estatístico de inteligência médica mundial.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={consentMarketing}
                  onChange={e => setConsentMarketing(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 border-slate-300 mt-0.5 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-700">Dicas de saúde recomendadas por IA</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">Autorizo o processador de inteligência artificial a analisar meu prontuário para sugerir artigos preventivos de saúde.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Direito do Titular Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3">Seus Direitos como Titular dos Dados</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode gerenciar a portabilidade ou a eliminação de seus dados.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleExportData}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-200 hover:border-blue-300 hover:bg-blue-50/50 text-blue-700 text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-4 h-4" /> Exportar meus Dados (JSON)
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 hover:border-red-300 hover:bg-red-50/50 text-red-600 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Solicitar Exclusão
              </button>
            </div>
          </div>
        </div>

        {/* Autorizações Temporárias e Permissão a Médicos - Col 5 */}
        <div className="md:col-span-5 space-y-6">
          {/* Card Opção 2 - Paciente concede acesso a médico */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>Conceder Acesso ao Prontuário</span>
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Escolha um médico da clínica para autorizá-lo a visualizar seu prontuário médico completo.
            </p>

            <div className="space-y-3">
              {(() => {
                const grantedDoctorIds = activeAccesses.map(a => a.medico_id);
                const availableDoctors = doctorsList.filter(doc => !grantedDoctorIds.includes(doc.id));

                return (
                  <>
                    <select
                      value={selectedDoctorId}
                      onChange={e => setSelectedDoctorId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Escolha o Médico --</option>
                      {availableDoctors.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          Dr(a). {doc.nome} ({doc.especialidade || 'Médico'})
                        </option>
                      ))}
                    </select>
                    {availableDoctors.length === 0 && doctorsList.length > 0 && (
                      <p className="text-[11px] text-amber-600 font-bold">
                        Todos os médicos cadastrados já possuem autorização de acesso ao seu prontuário.
                      </p>
                    )}
                  </>
                );
              })()}

              <button
                onClick={handleGrantDoctorAccess}
                disabled={grantingAccess || !selectedDoctorId}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {grantingAccess ? 'Concedendo...' : 'Conceder Acesso'}
              </button>

              {grantMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs font-bold text-center">
                  {grantMessage}
                </div>
              )}
            </div>

            {/* Médicos com acesso ativo concedido */}
            {activeAccesses.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Médicos Autorizados</h4>
                <div className="space-y-2">
                  {activeAccesses.map(acc => (
                    <div key={acc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{acc.medico_nome}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{acc.medico_especialidade || 'Médico'} • Liberado por: {acc.concedido_por}</p>
                      </div>
                      <button
                        onClick={() => handleRevokeDoctorAccess(acc.medico_id)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold p-1 rounded hover:bg-red-50 transition"
                        title="Revogar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>Histórico de Exames Compartilhados</span>
              </h3>
              <button onClick={loadShareRules} className="text-slate-400 hover:text-slate-600" title="Recarregar"><RefreshCw className="w-3.5 h-3.5" /></button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Profissionais de saúde com visualização ativa aos seus exames.
            </p>

            {shareRules.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nenhum compartilhamento ativo</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {shareRules.map(rule => (
                  <div key={rule.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{rule.profNome}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{rule.examTipo}</p>
                      </div>
                      <button
                        onClick={() => handleRevokeShare(rule.id)}
                        className="text-slate-400 hover:text-red-500 transition p-1 hover:bg-red-50 rounded"
                        title="Revogar Acesso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-2.5 text-[9px] text-slate-400 font-bold uppercase">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /> Ativo em: {rule.criadoEm}</span>
                      <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black shrink-0">Validade: {rule.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
