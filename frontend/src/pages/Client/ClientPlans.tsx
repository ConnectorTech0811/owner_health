import React, { useState, useEffect } from 'react';
import { Check, Zap, Shield, Crown, Lock, CreditCard, Loader2, X, AlertCircle } from 'lucide-react';
import { API_URL } from '../../config';

interface Plan {
  id: string; name: string; badge: string; price: string; period: string;
  color: string; gradient: string; icon: React.ReactNode; features: { text: string; included: boolean }[];
  cta: string; highlighted?: boolean; priceValue: number;
}

const PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', badge: 'Gratuito', price: 'R$ 0', period: '/ sempre', priceValue: 0,
    color: '#475569', gradient: 'linear-gradient(135deg, #334155, #475569)',
    icon: <Shield className="w-6 h-6 text-white" />,
    features: [
      { text: 'Perfil do paciente completo', included: true },
      { text: 'Até 2 dependentes', included: true },
      { text: 'Cadastro de exames (upload)', included: true },
      { text: 'Receitas de medicamentos', included: true },
      { text: 'Controle de medicamentos + lembretes', included: true },
      { text: 'Registro de bioimpedância', included: true },
      { text: 'Triagem de sintomas por especialidade', included: true },
      { text: 'Pré-consulta / Anamnese', included: true },
      { text: 'Acesso temporário ao profissional', included: true },
      { text: 'Aceite de termos LGPD', included: true },
      { text: 'Dashboard de evolução dos exames', included: false },
      { text: 'Artigos de saúde por IA', included: false },
      { text: 'Avaliação de profissionais e clínicas', included: false },
    ],
    cta: 'Plano Atual',
  },
  {
    id: 'prata', name: 'Prata', badge: 'Popular', price: 'R$ 29,90', period: '/ mês', priceValue: 29.90,
    color: '#0d9488', gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)',
    icon: <Zap className="w-6 h-6 text-white" />,
    highlighted: true,
    features: [
      { text: 'Tudo do plano Free', included: true },
      { text: 'Dashboard de evolução dos exames', included: true },
      { text: 'Dashboard de evolução dos dependentes', included: true },
      { text: 'Agendamento de consultas', included: true },
      { text: 'Avaliação de profissionais e clínicas', included: true },
      { text: 'Histórico completo de pagamentos', included: true },
      { text: 'Artigos de saúde por IA', included: false },
      { text: 'Relatórios personalizados', included: false },
    ],
    cta: 'Assinar Prata',
  },
  {
    id: 'pro', name: 'Pro / Gold', badge: 'Completo', price: 'R$ 59,90', period: '/ mês', priceValue: 59.90,
    color: '#d97706', gradient: 'linear-gradient(135deg, #b45309, #d97706)',
    icon: <Crown className="w-6 h-6 text-white" />,
    features: [
      { text: 'Tudo do plano Prata', included: true },
      { text: 'Artigos de saúde personalizados por IA', included: true },
      { text: 'Relatórios avançados de saúde', included: true },
      { text: 'Prioridade no agendamento', included: true },
      { text: 'Suporte prioritário 24/7', included: true },
      { text: 'Acesso antecipado a novos recursos', included: true },
    ],
    cta: 'Assinar Pro',
  },
];

interface Payment {
  data: string;
  valor: string;
  status: string;
  metodo: string;
  plano: string;
}

export const ClientPlans: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [showCheckout, setShowCheckout] = useState<Plan | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'history'>('plans');

  // Form Checkout
  const [cardForm, setCardForm] = useState({
    name: '', number: '', expiry: '', cvv: ''
  });

  const activeProfileId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCurrentPlan();
    loadPaymentHistory();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/clients/${activeProfileId}`, { headers });
      const client = await res.json();
      if (client) {
        const plan = client.plano_plataforma || client.plano_tipo || 'free';
        setCurrentPlan(plan);
        localStorage.setItem('plano_plataforma', plan);
      }
    } catch {
      const localPlan = localStorage.getItem('plano_plataforma') || 'free';
      setCurrentPlan(localPlan);
    }
  };

  const loadPaymentHistory = () => {
    const cached = localStorage.getItem(`payments_${activeProfileId}`);
    if (cached) {
      setPaymentHistory(JSON.parse(cached));
    } else {
      // Mock inicial
      const initial: Payment[] = [
        { data: '19/05/2026', valor: 'R$ 29,90', status: 'Pago', metodo: 'Cartão final 4321', plano: 'Prata' }
      ];
      setPaymentHistory(initial);
      localStorage.setItem(`payments_${activeProfileId}`, JSON.stringify(initial));
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckout) return;
    
    setProcessing(true);
    
    setTimeout(async () => {
      try {
        // Enviar PUT para o backend para sincronizar plano_plataforma no banco
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
        const res = await fetch(`${API_URL}/api/clients/${activeProfileId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ plano_plataforma: showCheckout.id })
        });
        
        if (!res.ok) throw new Error('Erro ao salvar no banco');
        
        // Atualizar locais
        setCurrentPlan(showCheckout.id);
        localStorage.setItem('plano_plataforma', showCheckout.id);
        
        // Registrar novo pagamento no histórico
        const newPayment: Payment = {
          data: new Date().toLocaleDateString('pt-BR'),
          valor: showCheckout.price,
          status: 'Pago',
          metodo: `Cartão final ${cardForm.number.slice(-4) || '4321'}`,
          plano: showCheckout.name
        };
        const updatedHistory = [newPayment, ...paymentHistory];
        setPaymentHistory(updatedHistory);
        localStorage.setItem(`payments_${activeProfileId}`, JSON.stringify(updatedHistory));
        
        alert(`Parabéns! Sua assinatura do plano ${showCheckout.name} foi ativada com sucesso.`);
        setShowCheckout(null);
        setCardForm({ name: '', number: '', expiry: '', cvv: '' });
      } catch (err) {
        console.error(err);
        // Fallback local caso dê erro no backend
        setCurrentPlan(showCheckout.id);
        localStorage.setItem('plano_plataforma', showCheckout.id);
        alert(`Assinatura do plano ${showCheckout.name} simulada localmente devido a indisponibilidade temporária do banco.`);
        setShowCheckout(null);
      } finally {
        setProcessing(false);
      }
    }, 1500);
  };

  const nextPaymentDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 font-sans">Gestão de Assinatura</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium font-sans">Escolha o seu plano de saúde da plataforma e visualize seus recibos</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveSubTab('plans')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'plans' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Planos Disponíveis
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Pagamentos Realizados
          </button>
        </div>
      </div>

      {activeSubTab === 'plans' ? (
        <>
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-4 py-2 rounded-full">
              <Shield className="w-3.5 h-3.5" /> Plano Atual do Portal: <span className="uppercase">{currentPlan}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => {
              const isCurrent = currentPlan === plan.id;
              
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl border overflow-hidden shadow-sm transition hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between ${plan.highlighted ? 'border-teal-400 ring-2 ring-teal-300/50' : 'border-slate-200'}`}
                >
                  {plan.highlighted && (
                    <div className="absolute top-0 left-0 right-0 bg-teal-500 text-center py-1.5 z-10">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">⭐ Recomendado</span>
                    </div>
                  )}

                  {/* Header */}
                  <div className={`p-6 ${plan.highlighted ? 'pt-10' : 'pt-6'}`} style={{ background: plan.gradient }}>
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                      {plan.icon}
                    </div>
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">{plan.badge}</p>
                    <h2 className="text-2xl font-black text-white mt-1">{plan.name}</h2>
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      <span className="text-sm text-white/70 font-medium mb-0.5">{plan.period}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="p-6 flex-1">
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, i) => (
                        <li key={i} className={`flex items-start gap-2.5 text-xs font-medium ${feat.included ? 'text-slate-700' : 'text-slate-400'}`}>
                          {feat.included ? (
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <Lock className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                          )}
                          {feat.text}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="p-6 pt-0">
                    <button
                      disabled={isCurrent}
                      className="w-full py-3.5 rounded-xl text-sm font-black transition disabled:opacity-60 disabled:cursor-default"
                      style={{
                        background: isCurrent ? '#f1f5f9' : plan.gradient,
                        color: isCurrent ? '#64748b' : 'white',
                      }}
                      onClick={() => setShowCheckout(plan)}
                    >
                      {isCurrent ? '✓ Plano Atual' : plan.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Histórico de pagamentos */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-4xl mx-auto">
          {currentPlan === 'free' ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                <Lock className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-black text-slate-800 text-base">Histórico de Faturas Restrito</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  A visualização de pagamentos realizados e próxima data de cobrança está disponível apenas para clientes assinantes do plano <b>Prata</b> ou <b>Pro/Gold</b>.
                </p>
                <button
                  onClick={() => setActiveSubTab('plans')}
                  className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Ver Planos e Fazer Upgrade
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Próxima Fatura Alert */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4.5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">Próxima Cobrança Automática</h4>
                  <p className="text-xs text-blue-800 mt-1 font-medium">
                    Seu próximo vencimento está programado para o dia <b>{nextPaymentDate()}</b> no valor correspondente ao seu plano ativo (Cobrança recorrente no cartão cadastrado).
                  </p>
                </div>
              </div>

              {/* Tabela de Histórico */}
              <div>
                <h3 className="text-sm font-black text-slate-800 mb-4 border-b border-slate-100 pb-2">Histórico de Faturas Pagas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3">Data</th>
                        <th className="pb-3">Plano</th>
                        <th className="pb-3">Valor</th>
                        <th className="pb-3">Forma de Pagamento</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                      {paymentHistory.map((pay, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5">{pay.data}</td>
                          <td className="py-3.5 font-bold">{pay.plano}</td>
                          <td className="py-3.5 text-slate-900">{pay.valor}</td>
                          <td className="py-3.5 text-slate-500 font-medium">{pay.metodo}</td>
                          <td className="py-3.5 text-right">
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">{pay.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Checkout / Checkout Mock */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-md font-black text-slate-800">Finalizar Assinatura</h3>
              </div>
              <button onClick={() => setShowCheckout(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Form */}
            <form onSubmit={handleCheckoutSubmit}>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plano Selecionado</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{showCheckout.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Mensal</p>
                    <p className="text-md font-black text-blue-600 mt-0.5">{showCheckout.price}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nome no Cartão *</label>
                  <input
                    type="text"
                    required
                    placeholder="CARLOS SILVA"
                    value={cardForm.name}
                    onChange={e => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 transition uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Número do Cartão *</label>
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    value={cardForm.number}
                    onChange={e => setCardForm({ ...cardForm, number: e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Validade *</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/AA"
                      maxLength={5}
                      value={cardForm.expiry}
                      onChange={e => setCardForm({ ...cardForm, expiry: e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">CVV / Cód. Segurança *</label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      maxLength={3}
                      value={cardForm.cvv}
                      onChange={e => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckout(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Pagamento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
