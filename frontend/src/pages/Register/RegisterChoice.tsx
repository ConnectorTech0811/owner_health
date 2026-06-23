import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, User, Building2, Stethoscope } from 'lucide-react';

export const RegisterChoice: React.FC = () => {
  const navigate = useNavigate();

  const options = [
    {
      id: 'choice-client',
      icon: User,
      title: 'Sou Paciente / Cliente',
      desc: 'Cadastre seu perfil pessoal, gerencie sua saúde e adicione até 2 dependentes no Plano Free gratuito.',
      path: '/register/client',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      id: 'choice-professional',
      icon: Stethoscope,
      title: 'Sou Profissional de Saúde',
      desc: 'Médico, fisioterapeuta, nutricionista, psicólogo e outras especialidades. Gerencie sua agenda e pacientes.',
      path: '/register/professional',
      color: '#0d9488',
      bg: '#f0fdfa',
    },
    {
      id: 'choice-company',
      icon: Building2,
      title: 'Sou Clínica / Hospital',
      desc: 'Cadastre sua instituição corporativa, gerencie profissionais vinculados e os planos de saúde atendidos.',
      path: '/register/company',
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 text-center relative overflow-hidden">

        {/* Decorativos */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-5 bg-blue-600" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-5 bg-blue-600" />

        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
          <HeartPulse className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Criar uma Conta</h2>
        <p className="text-sm text-slate-500 mt-2 font-medium">Selecione o tipo de perfil para cadastrar-se no sistema Owner Health</p>
        <div className="w-12 h-1 mx-auto mt-4 rounded-full bg-blue-600" />

        <div className="grid grid-cols-1 gap-4 mt-10 text-left">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                id={opt.id}
                onClick={() => navigate(opt.path)}
                className="border-2 border-slate-100 hover:border-blue-300 rounded-2xl p-5 flex items-center gap-4 transition-all bg-slate-50 hover:bg-blue-50/30 group hover:-translate-y-0.5 hover:shadow-md text-left"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: opt.bg }}>
                  <Icon className="w-7 h-7" style={{ color: opt.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-800">{opt.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{opt.desc}</p>
                </div>
                <div className="text-slate-300 group-hover:text-blue-400 transition-colors">→</div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => navigate('/login')} className="text-xs font-bold text-blue-600 hover:underline">
            Já tem uma conta? Entrar
          </button>
        </div>
      </div>
    </div>
  );
};
