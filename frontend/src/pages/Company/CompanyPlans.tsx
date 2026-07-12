import React, { useState, useEffect } from 'react';
import {
  CreditCard, Check, Sparkles, Loader2, ShieldCheck, ShieldAlert, CheckSquare
} from 'lucide-react';
import { API_URL } from '../../config';

export const CompanyPlans: React.FC = () => {
  const [pago, setPago] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [healthPlans, setHealthPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [cardForm, setCardForm] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  useEffect(() => {
    fetchCompanyPlan();
    fetchHealthPlans();
  }, [token, companyId]);

  const fetchHealthPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch(`${API_URL}/api/health-plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setHealthPlans(Array.isArray(data) ? data : []);
    } catch {
      setHealthPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchCompanyPlan = async () => {
    setLoading(true);
    try {
      if (token && companyId) {
        const res = await fetch(`${API_URL}/api/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const company = await res.json();
        setPago(!!company.pago);
        localStorage.setItem('companyPaid', String(company.pago));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayLoading(true);
    setPaySuccess(false);

    // Simula validação e tempo de gateway de pagamento
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paid: true })
      });

      if (res.ok) {
        setPaySuccess(true);
        setPago(true);
        localStorage.setItem('companyPaid', 'true');
        setTimeout(() => {
          setCheckoutModalOpen(false);
          setPaySuccess(false);
          fetchCompanyPlan();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Licenciamento Status */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Licenciamento de Uso</span>
          <h3 className="text-xl font-black text-slate-800 mt-1">Plano Master Gold</h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">Sua clínica está registrada sob a licença corporativa de gestão integrada.</p>
        </div>

        <div>
          {pago ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-150 p-4 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-black text-emerald-800">Status: Licença Ativa</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Próximo débito: 19/07/2026 (Mensal)</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-150 p-4 rounded-2xl">
                <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-800">Status: Pendente</p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Aguardando confirmação financeira</p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(true)}
                className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 hover:-translate-y-0.5 transition-all cursor-pointer text-center"
              >
                Efetuar Pagamento
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Planos de Saúde Credenciados */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-black text-slate-800">Convênios e Planos de Saúde</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Planos de saúde credenciados pela clínica. Funcionários e pacientes podem consultar cobertura e valores.</p>
        </div>
        {loadingPlans ? (
          <div className="flex items-center justify-center h-24"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600" /></div>
        ) : healthPlans.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-xs text-slate-400 font-bold">Nenhum plano cadastrado ainda.</p>
            <p className="text-[10px] text-slate-400 mt-1">Acesse "Planos de Saúde" no menu para adicionar convênios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthPlans.map((plan: any) => (
              <div key={plan.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 hover:border-indigo-300 transition-all">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{plan.operadora}</p>
                <h4 className="text-sm font-black text-slate-800">{plan.plano}</h4>
                {plan.produto && <p className="text-[10px] font-semibold text-slate-500">{plan.produto}</p>}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  {plan.valor_plano > 0 && (
                    <p className="text-xs font-bold text-slate-700">Mensalidade: <span className="text-indigo-600">R$ {Number(plan.valor_plano).toFixed(2)}</span></p>
                  )}
                  {plan.valor_consulta > 0 && (
                    <p className="text-xs text-slate-500">Consulta: R$ {Number(plan.valor_consulta).toFixed(2)}</p>
                  )}
                  {plan.valor_exame > 0 && (
                    <p className="text-xs text-slate-500">Exames: R$ {Number(plan.valor_exame).toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Planos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Plano Empresa Básico */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Licença Padrão</span>
              <h4 className="text-lg font-black text-slate-800 mt-1">Clínica Básica</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Ideal para consultórios individuais e clínicas de pequeno porte.</p>
            </div>
            
            <div className="flex items-baseline gap-1 text-slate-800">
              <span className="text-sm font-bold">R$</span>
              <span className="text-4xl font-black tracking-tight">149</span>
              <span className="text-xs text-slate-500 font-bold">/mês</span>
            </div>

            <ul className="space-y-3.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-5">
              {[
                'Gestão de até 3 profissionais credenciados',
                'Agenda médica digital simples',
                'Prontuário eletrônico básico',
                'Credenciamento de até 3 convênios de saúde',
                'Notificações de consulta por e-mail'
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <button disabled className="w-full mt-8 py-3 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl border border-slate-200">
            Plano Disponível
          </button>
        </div>

        {/* Plano Empresa Premium (Destaque) */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-indigo-500 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
            Popular / Recomendado
          </div>
          
          <div className="space-y-6">
            <div>
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Licença Avançada</span>
              <h4 className="text-lg font-black text-indigo-600 mt-1 flex items-center gap-1.5">
                <span>Plano Master Gold</span>
                <Sparkles className="w-4.5 h-4.5" />
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Solução profissional para hospitais, clínicas multi-atendimento e centros cirúrgicos.</p>
            </div>
            
            <div className="flex flex-col text-slate-800">
              <span className="text-xs text-slate-400 font-bold line-through mb-1">De R$ 270,00</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold">Por R$</span>
                <span className="text-4xl font-black tracking-tight">180</span>
                <span className="text-xs text-slate-500 font-bold">/mês</span>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-5">
              {[
                'Profissionais ilimitados (médicos, secretários, admins)',
                'Predição inteligente de agenda com gráficos SVG',
                'Customização completa de pré-consultas (Anamnese)',
                'Prontuário compartilhado por CPF ou Token (LGPD)',
                'Emissão de receitas e atestados com assinatura digital',
                'Alertas e avisos automatizados para staff por WhatsApp/E-mail',
                'Gerenciamento ilimitado de planos de saúde e procedimentos'
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-slate-800">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => !pago && setCheckoutModalOpen(true)}
            disabled={pago}
            className={`w-full mt-8 py-3 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center ${
              pago
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 font-black cursor-default shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'
            }`}
          >
            {pago ? 'Assinatura Ativa' : 'Fazer Upgrade'}
          </button>
        </div>

      </div>

      {/* Modal de Checkout */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setCheckoutModalOpen(false)} />
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 md:p-8 relative z-10 shadow-2xl space-y-6">
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Checkout Plano Master Gold</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                Valor recorrente: R$ 180,00/mês
              </p>
            </div>

            {paySuccess ? (
              <div className="py-6 flex flex-col items-center justify-center text-center animate-pulse">
                <CheckSquare className="w-16 h-16 text-emerald-500 mb-3" />
                <p className="text-sm font-black text-slate-800">Pagamento Autorizado!</p>
                <p className="text-xs text-slate-400 mt-1">Sua licença premium foi ativada com sucesso.</p>
              </div>
            ) : (
              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome Impresso no Cartão</label>
                  <input
                    type="text" required
                    placeholder="EX: CLINICA SAUDE TOTAL LTDA"
                    value={cardForm.name}
                    onChange={e => setCardForm({...cardForm, name: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Número do Cartão *</label>
                  <input
                    type="text" required
                    maxLength={19}
                    placeholder="4000 1234 5678 9010"
                    value={cardForm.number}
                    onChange={e => setCardForm({...cardForm, number: e.target.value.replace(/\D/g,'').replace(/(\d{4})(?=\d)/g,'$1 ').slice(0, 19)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Validade *</label>
                    <input
                      type="text" required
                      maxLength={5}
                      placeholder="MM/AA"
                      value={cardForm.expiry}
                      onChange={e => setCardForm({...cardForm, expiry: e.target.value.replace(/\D/g,'').replace(/(\d{2})(?=\d)/,'$1/').slice(0, 5)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">CVV / Cód *</label>
                    <input
                      type="text" required
                      maxLength={4}
                      placeholder="123"
                      value={cardForm.cvv}
                      onChange={e => setCardForm({...cardForm, cvv: e.target.value.replace(/\D/g,'').slice(0, 4)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={payLoading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  {payLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processando cobrança...</>
                  ) : (
                    <span>Confirmar Assinatura</span>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
