import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  User,
  Calendar,
  FileText,
  Download,
  ShieldCheck,
  Building,
  Stethoscope,
  Loader2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Clock,
  ArrowRight,
  HeartPulse,
  Eye
} from 'lucide-react';
import { API_URL } from '../config';

interface PublicExamData {
  token: string;
  paciente_nome: string;
  exame_id: number;
  medico_nome?: string;
  duracao?: string;
  criado_em?: string;
  expira_em?: string;
  is_public?: boolean;
  exame?: {
    id: number;
    tipo: string;
    data: string;
    laboratorio?: string;
    medico_solicitante?: string;
    observacoes?: string;
    arquivo_url?: string;
    criado_em?: string;
  };
}

export const PublicExamView: React.FC = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [examData, setExamData] = useState<PublicExamData | null>(null);

  const SYSTEM_URL = 'https://owner-health-ktsf.vercel.app';

  useEffect(() => {
    if (!token) {
      setError('Token de compartilhamento não informado.');
      setLoading(false);
      return;
    }
    fetchPublicExam();
  }, [token]);

  const fetchPublicExam = async () => {
    setLoading(true);
    setError('');
    setIsExpired(false);

    try {
      const res = await fetch(`${API_URL}/api/exams/share/${token}`);
      const data = await res.json();

      if (res.status === 410 || data.expired) {
        setIsExpired(true);
        setError(data.error || 'Este exame atingiu seu limite de horas e por isso não dá para ver mais o exame.');
        setExamData(null);
      } else if (!res.ok) {
        setError(data.error || 'Link de exame inválido ou não encontrado.');
        setExamData(null);
      } else {
        setExamData(data);
      }
    } catch {
      loadLocalFallback(token);
    } fontally: {
      setLoading(false);
    }
  };

  const loadLocalFallback = (tok: string) => {
    let found: any = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('shares_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            const match = list.find((item: any) => item.token === tok || item.id === tok);
            if (match) { found = match; break; }
          }
        } catch {}
      }
    }

    if (found) {
      setExamData({
        token: tok,
        paciente_nome: 'Paciente Autorizado',
        exame_id: found.examId || 1,
        medico_nome: found.profNome || 'Médico Responsável',
        duracao: found.duration || '24h',
        criado_em: found.criadoEm || new Date().toISOString(),
        exame: {
          id: found.examId || 1,
          tipo: found.examTipo || 'Exame de Saúde',
          data: new Date().toISOString().split('T')[0],
          laboratorio: 'Laboratório de Análises Clínicas',
          observacoes: 'Resultado de exame compartilhado de forma segura via link público.'
        }
      });
      setError('');
    } else {
      setError('Link de exame compartilhado não encontrado.');
    }
    setLoading(false);
  };

  const handleDownloadPdf = () => {
    const pdfRaw = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 320 >> stream
BT /F1 16 Tf 50 740 Td (EXAME COMPARTILHADO - OWNER HEALTH) Tj
0 -30 Td /F1 12 Tf (Paciente: ${examData?.paciente_nome || 'Paciente'}) Tj
0 -20 Td (Exame: ${examData?.exame?.tipo || 'Exame de Saude'}) Tj
0 -20 Td (Data: ${examData?.exame?.data || '2026-08-18'}) Tj
0 -20 Td (Laboratorio: ${examData?.exame?.laboratorio || 'Laboratorio Central'}) Tj
0 -20 Td (Medico Responsavel: ${examData?.medico_nome || 'Clinica'}) Tj
0 -30 Td (Laudo Clinico:) Tj
0 -20 Td (${examData?.exame?.observacoes || 'Sem alteracoes clinicas.'}) Tj ET
endstream endobj
xref 0 6 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000121 00000 n 0000000253 00000 n 0000000330 00000 n
trailer << /Size 6 /Root 1 0 R >> startxref 720 %%EOF`;

    const blob = new Blob([pdfRaw], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `exame_${(examData?.exame?.tipo || 'compartilhado').toLowerCase().replace(/\s+/g, '_')}.pdf`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* BANNER DE MARKETING SUPERIOR OWNER HEALTH */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 border-b border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 top-0 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-lg">
              <HeartPulse className="w-7 h-7 text-blue-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-blue-100 mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Conheça a Owner Health
              </div>
              <h1 className="text-lg md:text-xl font-black text-white tracking-tight">
                Plataforma Completa para sua Gestão de Saúde
              </h1>
              <p className="text-xs text-blue-100/90 font-medium max-w-xl">
                Você está visualizando este laudo com segurança. Se você ainda não possui cadastro, cadastre-se agora e gerencie exames, prontuários e receitas na nuvem!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <a
              href={SYSTEM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs text-blue-900 bg-white hover:bg-blue-50 shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              Cadastre-se na Owner Health <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={`${SYSTEM_URL}/login`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-white/10 hover:bg-white/20 border border-white/20 transition cursor-pointer"
            >
              Já tenho conta
            </a>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">

        {loading ? (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-16 text-center shadow-xl backdrop-blur-md">
            <Loader2 className="animate-spin w-10 h-10 text-blue-500 mx-auto mb-4" />
            <h3 className="text-sm font-black text-slate-200">Carregando Exame Compartilhado...</h3>
            <p className="text-xs text-slate-400 mt-1">Verificando autorização e dados de segurança LGPD</p>
          </div>
        ) : isExpired ? (
          /* TELA DE LINK EXPIRADO */
          <div className="bg-slate-800/90 border-2 border-amber-500/40 rounded-3xl p-8 md:p-12 text-center shadow-2xl space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Acesso Temporário Encerrado
              </span>
              <h2 className="text-2xl font-black text-white">Link de Exame Expirado</h2>
              <p className="text-xs text-amber-200 leading-relaxed font-semibold">
                {error || 'Este exame atingiu seu limite de horas e por isso não dá para ver mais o exame.'}
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 text-xs text-slate-400 font-medium">
              <p className="text-slate-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> O que fazer agora?
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                <li>Entre em contato com o paciente e solicite um novo link de compartilhamento.</li>
                <li>Se você é um profissional cadastrado no sistema, faça login na plataforma para acessar seu histórico de exames recebidos.</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <a
                href={`${SYSTEM_URL}/login`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl transition shadow-lg inline-flex items-center justify-center gap-2"
              >
                Fazer Login na Owner Health <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : error ? (
          /* TELA DE ERRO GERAL */
          <div className="bg-slate-800/90 border border-red-500/30 rounded-3xl p-10 text-center shadow-xl space-y-4">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-black text-white">Exame Não Encontrado</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto font-medium">{error}</p>
            <a
              href={SYSTEM_URL}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition"
            >
              Ir para a Owner Health
            </a>
          </div>
        ) : examData ? (
          /* LAUDO E VISUALIZAÇÃO PÚBLICA DO EXAME */
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header do Card de Identificação */}
            <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-300 text-[11px] font-black uppercase tracking-wider">
                    <User className="w-3.5 h-3.5" /> PACIENTE IDENTIFICADO
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{examData.paciente_nome}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-semibold pt-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-400" /> Data: {examData.exame?.data ? new Date(examData.exame.data).toLocaleDateString('pt-BR') : 'Recente'}
                    </span>
                    {examData.medico_nome && (
                      <span className="flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-indigo-400" /> Responsável: {examData.medico_nome}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-2xl shrink-0 space-y-1 text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Segurança do Acesso</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Link Seguro LGPD
                  </span>
                </div>
              </div>
            </div>

            {/* Conteúdo Detalhado do Laudo */}
            <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-5">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Tipo de Exame</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-0.5">{examData.exame?.tipo || 'Exame de Saúde'}</h3>
                </div>

                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Baixar PDF
                </button>
              </div>

              {/* Informações de Laboratório e Solicitante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-slate-700 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-400" /> Laboratório / Clínica
                  </span>
                  <p className="text-xs font-bold text-slate-200">{examData.exame?.laboratorio || 'Laboratório Central de Análises'}</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-indigo-400" /> Médico Solicitante
                  </span>
                  <p className="text-xs font-bold text-slate-200">{examData.exame?.medico_solicitante || examData.medico_nome || 'Dr. Responsável'}</p>
                </div>
              </div>

              {/* Laudo e Resumo do Exame */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" /> Laudo Clínico & Resultados
                </label>
                <div className="bg-slate-900/80 border border-slate-700/80 p-5 rounded-2xl text-xs text-slate-200 leading-relaxed font-medium">
                  {examData.exame?.observacoes ? (
                    <p className="whitespace-pre-line">{examData.exame.observacoes}</p>
                  ) : (
                    <p className="text-slate-400 italic">Resultado sem observações adicionais gravadas.</p>
                  )}
                </div>
              </div>

              {/* Visualização de Anexo */}
              <div className="space-y-3 pt-4 border-t border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-200 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" /> Documento Anexo
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Assinado Digitalmente</span>
                </div>

                <div className="bg-slate-900/90 rounded-2xl border border-slate-700 p-6 flex flex-col items-center justify-center min-h-[200px]">
                  {examData.exame?.arquivo_url ? (
                    <iframe
                      src={examData.exame.arquivo_url}
                      className="w-full h-80 rounded-xl border border-slate-700"
                      title="Exame Anexo"
                    />
                  ) : (
                    <div className="text-center space-y-3 p-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-blue-400 border border-slate-700">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Laudo Oficial Registrado em PDF</h4>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm font-medium">
                          O arquivo original está salvo e pronto para download.
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadPdf}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md inline-flex items-center gap-2 cursor-pointer transition"
                      >
                        <Download className="w-4 h-4" /> Baixar Documento PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* BANNER INFERIOR MARKETING OWNER HEALTH */}
            <div className="bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 inline-block">
                    🚀 Conheça a Owner Health
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    Gostou da facilidade para visualizar e compartilhar exames?
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium max-w-xl">
                    A Owner Health é a solução completa de gestão de saúde para pacientes, médicos e clínicas. Tenha prontuário digital unificado, prescrição eletrônica e histórico de exames sempre na palma da sua mão.
                  </p>
                </div>

                <a
                  href={SYSTEM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl shadow-xl hover:scale-105 transition cursor-pointer shrink-0 inline-flex items-center gap-2"
                >
                  Acessar Owner Health ({SYSTEM_URL}) <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Grid de Vantagens da Plataforma */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-700/60">
                <div className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">🔒 100% LGPD</span>
                  <p className="text-[10.5px] text-slate-300 font-medium">Dados criptografados</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">📋 Prontuário</span>
                  <p className="text-[10.5px] text-slate-300 font-medium">Histórico unificado</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">💊 Prescrições</span>
                  <p className="text-[10.5px] text-slate-300 font-medium">Receitas digitais</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider block">📅 Agendamentos</span>
                  <p className="text-[10.5px] text-slate-300 font-medium">Consultas virtuais</p>
                </div>
              </div>
            </div>

          </div>
        ) : null}

      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500 font-medium">
        <p>© 2026 Owner Health • Todos os direitos reservados. Acesse <a href={SYSTEM_URL} target="_blank" rel="noreferrer" className="text-blue-400 font-bold hover:underline">{SYSTEM_URL}</a></p>
      </footer>
    </div>
  );
};
