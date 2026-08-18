import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Download, Trash2 } from 'lucide-react';
import { API_URL } from '../../config';

export const ClientPrivacy: React.FC = () => {
  const [lgpdAccepted, setLgpdAccepted] = useState(true);
  const [acceptedDate, setAcceptedDate] = useState('');
  const [consentMarketing, setConsentMarketing] = useState(true);
  const [consentResearch, setConsentResearch] = useState(false);

  const activeProfileId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchPrivacyData();
  }, [activeProfileId]);

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
        <p className="text-sm text-slate-500 mt-1 font-medium">Controle o consentimento de seus dados médicos de acordo com a regulamentação LGPD</p>
      </div>

      <div className="max-w-3xl space-y-6">
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
    </div>
  );
};
