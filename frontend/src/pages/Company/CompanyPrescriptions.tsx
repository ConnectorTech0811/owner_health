import React, { useState, useEffect } from 'react';
import {
  FileText, Loader2, Printer, ShieldCheck
} from 'lucide-react';
import { API_URL } from '../../config';

export const CompanyPrescriptions: React.FC = () => {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [docForm, setDocForm] = useState({
    profissional_id: '',
    paciente_cpf: '',
    tipo: 'receita', // receita, atestado
    conteudo: '',
    assinado_digitalmente: true
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [issuedDoc, setIssuedDoc] = useState<any>(null);

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  useEffect(() => {
    fetchDoctors();
  }, [token, companyId]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      if (token && companyId) {
        const res = await fetch(`${API_URL}/api/professionals?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setProfessionals(Array.isArray(data) ? data.filter((p: any) => p.tipo_profissional === 'medico') : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIssuedDoc(null);

    if (!docForm.paciente_cpf || !docForm.conteudo) {
      setError('Preencha o CPF do paciente e o conteúdo do documento.');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          profissional_id: docForm.profissional_id ? parseInt(docForm.profissional_id) : null,
          paciente_cpf: docForm.paciente_cpf,
          tipo: docForm.tipo,
          conteudo: docForm.conteudo,
          assinado_digitalmente: docForm.assinado_digitalmente
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar documento.');
      }

      setSuccess('Documento assinado digitalmente com sucesso!');
      
      const selectedDoc = professionals.find(p => String(p.id) === docForm.profissional_id);
      
      setIssuedDoc({
        id: data.id,
        tipo: docForm.tipo,
        paciente_cpf: docForm.paciente_cpf,
        conteudo: docForm.conteudo,
        medico_nome: selectedDoc ? selectedDoc.nome : 'Médico Credenciado',
        medico_crm: selectedDoc ? selectedDoc.numero_conselho : 'CRM/UF',
        assinado: docForm.assinado_digitalmente,
        qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ownerhealth-verify-doc-${data.id}`
      });

      setDocForm(prev => ({ ...prev, conteudo: '', paciente_cpf: '' }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
      
      {/* Formulário de Emissão */}
      <div className="space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Emitir Receita ou Atestado</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Escreva o laudo, receita médica ou atestado de repouso assinado com certificado ICP-Brasil.
            </p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-bold">⚠️ {error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-[11px] font-bold">✓ {success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Médico Emitente</label>
                <select
                  value={docForm.profissional_id}
                  onChange={e => setDocForm({...docForm, profissional_id: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="">Selecione o médico...</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">CPF do Paciente *</label>
                <input
                  type="text" required
                  placeholder="000.000.000-00"
                  value={docForm.paciente_cpf}
                  onChange={e => setDocForm({...docForm, paciente_cpf: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tipo do Documento</label>
              <div className="flex gap-4">
                {[
                  { id: 'receita', label: 'Receita Médica' },
                  { id: 'atestado', label: 'Atestado Médico' }
                ].map(type => (
                  <label key={type.id} className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo_doc"
                      checked={docForm.tipo === type.id}
                      onChange={() => setDocForm({...docForm, tipo: type.id})}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Conteúdo do Documento *</label>
              <textarea
                value={docForm.conteudo}
                onChange={e => setDocForm({...docForm, conteudo: e.target.value})}
                required
                rows={6}
                placeholder={
                  docForm.tipo === 'receita'
                    ? "Ex:\n1. Amoxicilina 500mg ------ 1 caixa\nTomar 1 comprimido de 8 em 8 horas por 7 dias."
                    : "Ex:\nAtesto para os devidos fins que o paciente necessita de 3 dias de repouso por motivos médicos de saúde a partir desta data."
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none font-mono"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-150 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={docForm.assinado_digitalmente}
                onChange={e => setDocForm({...docForm, assinado_digitalmente: e.target.checked})}
                className="rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <div className="text-[10px] text-slate-500 font-semibold leading-normal">
                <span className="font-bold text-slate-700">Assinar digitalmente com ICP-Brasil</span>
                <p className="mt-0.5">Sua assinatura eletrônica e carimbo digital CRM serão anexados com criptografia de ponta.</p>
              </div>
            </label>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Emitir e Assinar Documento'}
            </button>
          </form>
        </div>
      </div>

      {/* Visualização e Impressão do Documento */}
      <div className="space-y-6">
        {issuedDoc ? (
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-6 relative print:border-none print:shadow-none">
            
            {/* Header Documento */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-indigo-600">
              <div className="flex items-center gap-2 text-indigo-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">
                  H
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Receituário Digital</h4>
                  <p className="text-[9px] text-slate-400 font-bold">Owner Health - Clínicas Credenciadas</p>
                </div>
              </div>
              
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer print:hidden"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Documento</span>
              </button>
            </div>

            {/* Corpo do Documento */}
            <div className="space-y-6 min-h-[180px]">
              <div className="text-center font-bold text-xs text-slate-800 uppercase tracking-widest bg-slate-50 py-1.5 rounded-lg border border-slate-100">
                {issuedDoc.tipo === 'receita' ? 'Receituário de Medicamentos' : 'Atestado Médico'}
              </div>

              <div className="text-xs font-semibold text-slate-500 space-y-1">
                <p>Paciente: <span className="text-slate-800 font-bold">{issuedDoc.paciente_cpf}</span></p>
                <p>Data de Emissão: <span className="text-slate-800 font-bold">{new Date().toLocaleDateString('pt-BR')}</span></p>
              </div>

              <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-line font-mono bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                {issuedDoc.conteudo}
              </p>
            </div>

            {/* Assinatura + Validador QR */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-slate-200/60 pt-6">
              <div className="text-center sm:text-left space-y-1">
                {issuedDoc.assinado && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-black uppercase self-center sm:self-start">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Assinado ICP-Brasil</span>
                  </div>
                )}
                <p className="text-xs font-bold text-slate-800">{issuedDoc.medico_nome}</p>
                <p className="text-[10px] text-slate-400 font-bold">{issuedDoc.medico_crm}</p>
              </div>

              {/* QR Code de Validação */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                <img
                  src={issuedDoc.qr_code}
                  alt="Validação de QR Code"
                  className="w-14 h-14 shrink-0 rounded-lg border border-slate-200"
                />
                <div className="text-[9px] text-slate-500 font-semibold leading-normal max-w-[120px]">
                  <span className="font-bold text-slate-700 block">Assinatura Eletrônica</span>
                  Escaneie para verificar a validade do documento.
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-xs text-slate-500 font-bold">Nenhum documento gerado nesta sessão.</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Insira os dados à esquerda e clique em emitir para visualizar a receita ou atestado formatado para impressão.</p>
          </div>
        )}
      </div>

    </div>
  );
};
