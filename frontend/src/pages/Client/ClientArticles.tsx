import React, { useState } from 'react';
import { Lock, Sparkles, ArrowRight, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Article {
  id: number;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  content: string;
  source: string;
  reason: string;
}

const ARTICLES: Article[] = [
  {
    id: 1,
    title: 'Glicose Elevada: Estratégias Práticas para Reduzir as Taxas e Evitar a Pré-Diabetes',
    category: 'Nutrição & Diabetes',
    readTime: '6 min',
    reason: 'Recomendado com base em seus exames recentes de Glicemia em Jejum (110 mg/dL).',
    summary: 'Aprenda como ajustes simples na alimentação, jejum intermitente e atividade física podem reverter a resistência à insulina de forma natural.',
    content: 'Níveis de glicemia em jejum entre 100 e 125 mg/dL são classificados como pré-diabetes. A boa notícia é que esta condição é amplamente reversível.\n\n1. Reduza Carboidratos Simples: Priorize carboidratos complexos de baixo índice glicêmico como aveia, quinoa e batata doce, e corte açúcares refinados, farinhas brancas e sucos de frutas processados.\n\n2. Aumente Fibras e Proteínas: Combinar carboidratos com fibras solúveis (como chia e linhaça) e proteínas magras atrasa a absorção da glicose, evitando picos de insulina.\n\n3. Exercício Físico Regular: Os músculos consomem glicose para gerar energia, reduzindo o açúcar no sangue independentemente da insulina. Caminhadas pós-refeições de 15 minutos são altamente eficazes.\n\nConsulte sempre seu Endocrinologista para acompanhar sua evolução.',
    source: 'IA Owner Health Medical Review • Junho/2026'
  },
  {
    id: 2,
    title: 'Cardiologia Preventiva: O Papel dos Exercícios Aeróbicos na Saúde do Miocárdio',
    category: 'Atividade Física',
    readTime: '8 min',
    reason: 'Gerado preventivamente a partir de seus registros de Eletrocardiograma.',
    summary: 'Como o treinamento de resistência cardiovascular remodela as artérias, reduz o colesterol LDL e otimiza os batimentos cardíacos de repouso.',
    content: 'O coração é um músculo e, como qualquer outro, fica mais forte com o treinamento adequado.\n\nEstudos comprovam que 150 minutos de exercícios aeróbicos de intensidade moderada (como corrida leve, natação ou ciclismo) por semana reduzem o risco de infartos em até 35%.\n\nAlém de melhorar o bombeamento de sangue, o exercício aeróbico estimula a produção de óxido nítrico, que dilata os vasos sanguíneos e reduz a pressão arterial sistólica. Se você possui histórico familiar de hipertensão, a prevenção precoce é o melhor caminho.',
    source: 'IA Owner Health Medical Review • Junho/2026'
  },
  {
    id: 3,
    title: 'Suplementação Inteligente de Vitamina D3 e K2: Sinergia para Saúde Óssea',
    category: 'Suplementos',
    readTime: '5 min',
    reason: 'Sugestão preventiva geral com base em seu perfil demográfico.',
    summary: 'Por que tomar Vitamina D isolada pode não ser a melhor estratégia, e como a Vitamina K2 atua direcionando o cálcio para os ossos e dentes.',
    content: 'A Vitamina D é essencial para a absorção intestinal do cálcio. Porém, sem a Vitamina K2 (especialmente na forma MK-7), o cálcio absorvido pode se depositar nas artérias em vez dos ossos, promovendo a calcificação arterial.\n\nA Vitamina K2 ativa a osteocalcina, proteína responsável por fixar o cálcio na matriz óssea, garantindo que suas artérias fiquem livres e seus ossos fortalecidos. A dosagem correta deve ser sempre avaliada por um médico nutrólogo ou clínico geral através de exames de sangue.',
    source: 'IA Owner Health Medical Review • Junho/2026'
  }
];

export const ClientArticles: React.FC = () => {
  const navigate = useNavigate();
  const userPlan = localStorage.getItem('plano_plataforma') || 'free';
  const isPro = userPlan === 'pro' || userPlan === 'prata';

  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Artigos de Saúde IA</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Recomendações e leituras de prevenção sugeridas pela nossa IA com base no seu prontuário</p>
        </div>
      </div>

      {!isPro ? (
        /* Bloqueio Premium */
        <div className="relative min-h-[500px] rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm flex items-center justify-center p-8">
          {/* Fundo desfocado */}
          <div className="absolute inset-0 filter blur-md opacity-25 grid grid-cols-1 md:grid-cols-2 p-10 gap-8 pointer-events-none select-none">
            <div className="border border-slate-200 rounded-3xl p-6 space-y-4 bg-slate-50">
              <div className="h-6 w-1/3 bg-slate-300 rounded" />
              <div className="h-20 bg-slate-200 rounded" />
            </div>
            <div className="border border-slate-200 rounded-3xl p-6 space-y-4 bg-slate-50">
              <div className="h-6 w-1/4 bg-slate-300 rounded" />
              <div className="h-20 bg-slate-200 rounded" />
            </div>
          </div>

          <div className="relative z-10 max-w-lg bg-white/95 backdrop-blur-md border border-slate-200/80 p-8 rounded-[2rem] text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 border border-amber-100 shadow-md">
              <Lock className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <span className="bg-amber-100 text-amber-900 border border-amber-200/40 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full">Recurso do Plano Pro</span>
              <h3 className="text-xl font-black text-slate-800 leading-tight pt-1">Artigos Recomendados por IA</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Nossa IA lê os laudos de seus exames anexados e histórico de sintomas para prescrever artigos educativos e rotinas preventivas personalizadas. Faça upgrade hoje!
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/client/plans')}
                className="w-full py-3.5 rounded-2xl text-xs font-black text-white shadow-lg transition transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 4px 15px rgba(29,78,216,0.3)' }}
              >
                Ativar Plano Pro
              </button>
              <button
                onClick={() => navigate('/client/dashboard')}
                className="w-full py-3.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition border border-slate-200"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tela Liberada */
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4.5 flex items-center gap-3.5 max-w-4xl">
            <Sparkles className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">Como a IA recomenda artigos?</h4>
              <p className="text-xs text-blue-800 mt-0.5 font-medium leading-relaxed">
                Nossa IA cruza palavras-chave dos exames carregados por OCR com bases médicas reconhecidas, indicando estudos e cuidados específicos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARTICLES.map(art => (
              <div key={art.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{art.category}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {art.readTime}</span>
                  </div>

                  <h3 className="text-sm font-black text-slate-800 leading-snug group-hover:text-blue-600 transition">{art.title}</h3>
                  
                  {/* AI Reason Tag */}
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-2.5 text-[10px] leading-relaxed font-semibold text-blue-800 flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{art.reason}</span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{art.summary}</p>
                </div>

                <button
                  onClick={() => setActiveArticle(art)}
                  className="mt-5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-bold transition cursor-pointer"
                >
                  <span>Ler Artigo</span> <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal - Detalhe do Artigo */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">{activeArticle.category}</span>
              <button onClick={() => setActiveArticle(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <h2 className="text-lg font-black text-slate-800 leading-snug">{activeArticle.title}</h2>
              
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[10.5px] leading-relaxed text-slate-500 font-semibold flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-black uppercase tracking-wider text-[9px] mb-0.5">Motivo da Recomendação</p>
                  {activeArticle.reason}
                </div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap pt-2">
                {activeArticle.content}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
              <span>Fonte: {activeArticle.source}</span>
              <button
                onClick={() => setActiveArticle(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Voltar à Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
