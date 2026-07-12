import React, { useState, useEffect } from 'react';
import { ShieldCheck, Stethoscope, ClipboardList, Building2 } from 'lucide-react';
import { API_URL } from '../../config';

export const ProfessionalMyPlan: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [professional, setProfessional] = useState<any>(null);
  const [linkedPlans, setLinkedPlans] = useState<any[]>([]);
  const [linkedCompanies, setLinkedCompanies] = useState<any[]>([]);

  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : {};

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      console.log('Fetching professionals list with user email:', user.email);

      // Buscar todos os profissionais para encontrar o id pelo email
      const profRes = await fetch(`${API_URL}/api/professionals`, { headers });
      const profData = await profRes.json();
      const profList = Array.isArray(profData) ? profData : [];
      console.log('ProfList:', profList);
      
      const prof = profList.find((p: any) =>
        p.email?.toLowerCase() === user.email?.toLowerCase()
      );
      console.log('Matched prof:', prof);

      if (prof) {
        // Buscar detalhes completos (já inclui .companies e .health_plans)
        const detailRes = await fetch(`${API_URL}/api/professionals/${prof.id}`, { headers });
        const detail = await detailRes.json();
        console.log('Prof detail:', detail);
        setProfessional(detail);
        setLinkedCompanies(Array.isArray(detail.companies) ? detail.companies : []);
        setLinkedPlans(Array.isArray(detail.health_plans) ? detail.health_plans : []);
      } else {
        console.warn('Professional not found for email:', user.email);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Meu Plano & Vínculos</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Convênios e clínicas aos quais você está credenciado.
        </p>
      </div>

      {/* Card do profissional */}
      {professional && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Stethoscope className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Médico</p>
            <h2 className="text-lg font-black text-slate-800">{professional.nome}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {professional.numero_conselho && <span className="mr-3">{professional.numero_conselho}</span>}
              {professional.email}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clínicas vinculadas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800">Clínicas / Hospitais</h3>
          </div>
          {linkedCompanies.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
              <p className="text-xs text-slate-400 font-bold">Nenhuma clínica vinculada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedCompanies.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{c.nome_fantasia || c.razao_social}</p>
                    {c.email && <p className="text-[10px] text-slate-500">{c.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Convênios/planos atendidos */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800">Convênios Atendidos</h3>
          </div>
          {linkedPlans.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
              <p className="text-xs text-slate-400 font-bold">Nenhum convênio vinculado.</p>
              <p className="text-[10px] text-slate-400 mt-1">Solicite ao administrador da clínica.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedPlans.map((plan: any) => (
                <div key={plan.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{plan.company_name || plan.operadora}</p>
                  <p className="text-sm font-black text-slate-800">{plan.plan_name || plan.plano}</p>
                  {(plan.product_name || plan.produto) && (
                    <p className="text-[10px] text-slate-500 font-semibold">{plan.product_name || plan.produto}</p>
                  )}
                  {plan.procedures && (
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Procedimentos: {plan.procedures}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
