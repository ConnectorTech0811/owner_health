
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { RegisterChoice } from './pages/Register/RegisterChoice';
import { RegisterClient } from './pages/Register/RegisterClient';
import { RegisterCompany } from './pages/Register/RegisterCompany';
import { RegisterProfessional } from './pages/Register/RegisterProfessional';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { ClientList } from './pages/Clients/ClientList';
import { CompanyList } from './pages/Companies/CompanyList';
import { ProfessionalList } from './pages/Professionals/ProfessionalList';
import { HealthPlanList } from './pages/HealthPlans/HealthPlanList';
import { UserList } from './pages/Users/UserList';
import { DependentList } from './pages/Dependents/DependentList';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';

// Portal de Clientes
import { ClientLogin } from './pages/Client/ClientLogin';
import { ClientProfiles } from './pages/Client/ClientProfiles';
import { ClientLayout } from './components/ClientLayout';
import { ClientDashboard } from './pages/Client/ClientDashboard';
import { ClientProfile } from './pages/Client/ClientProfile';
import { ClientDependents } from './pages/Client/ClientDependents';
import { ClientExams } from './pages/Client/ClientExams';
import { ClientPrescriptions } from './pages/Client/ClientPrescriptions';
import { ClientMedications } from './pages/Client/ClientMedications';
import { ClientBioimpedance } from './pages/Client/ClientBioimpedance';
import { ClientSymptoms } from './pages/Client/ClientSymptoms';
import { ClientAnamnesis } from './pages/Client/ClientAnamnesis';
import { ClientPlans } from './pages/Client/ClientPlans';
import { ClientSatisfaction } from './pages/Client/ClientSatisfaction';
import { ClientPrivacy } from './pages/Client/ClientPrivacy';
import { ClientScheduling } from './pages/Client/ClientScheduling';
import { ClientEvolution } from './pages/Client/ClientEvolution';
import { ClientArticles } from './pages/Client/ClientArticles';

// Recuperação de Senha
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

// Portal de Hospitais / Clínicas
import { CompanyLayout } from './components/CompanyLayout';
import { CompanyDashboard } from './pages/Company/CompanyDashboard';
import { CompanyProfessionals } from './pages/Company/CompanyProfessionals';
import { CompanyScheduling } from './pages/Company/CompanyScheduling';
import { CompanyHealthPlans } from './pages/Company/CompanyHealthPlans';
import { CompanyPatientData } from './pages/Company/CompanyPatientData';
import { CompanyPrescriptions } from './pages/Company/CompanyPrescriptions';
import { CompanyAnamnesisConfig } from './pages/Company/CompanyAnamnesisConfig';
import { CompanyPlans } from './pages/Company/CompanyPlans';

// Portal de Profissionais (Médico, Secretário, Administrativo)
import { ProfessionalLayout } from './components/ProfessionalLayout';
// Reuse company pages inside the professional portal
import { CompanyDashboard as ProfDashboard } from './pages/Company/CompanyDashboard';
import { CompanyScheduling as ProfScheduling } from './pages/Company/CompanyScheduling';
import { CompanyPatientData as ProfPatients } from './pages/Company/CompanyPatientData';
import { CompanyPrescriptions as ProfPrescriptions } from './pages/Company/CompanyPrescriptions';
import { CompanyProfessionals as ProfTeam } from './pages/Company/CompanyProfessionals';
import { CompanyHealthPlans as ProfHealthPlans } from './pages/Company/CompanyHealthPlans';
import { CompanyAnamnesisConfig as ProfAnamnesis } from './pages/Company/CompanyAnamnesisConfig';
import { ProfessionalMyPlan } from './pages/Professional/ProfessionalMyPlan';
import { AuditLogs } from './pages/Admin/AuditLogs';
import { AdminSettings } from './pages/Admin/AdminSettings';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas Públicas Gerais */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<RegisterChoice />} />
        <Route path="/register/client" element={<RegisterClient />} />
        <Route path="/register/company" element={<RegisterCompany />} />
        <Route path="/register/professional" element={<RegisterProfessional />} />

        {/* Portal de Clientes (Públicas e Protegidas) */}
        <Route path="/client/login" element={<ClientLogin />} />

        <Route path="/client/profiles" element={
          <PrivateRoute redirectTo="/client/login">
            <ClientProfiles />
          </PrivateRoute>
        } />

        <Route path="/client/*" element={
          <PrivateRoute redirectTo="/client/login">
            <ClientLayout>
              <Routes>
                <Route path="/dashboard" element={<ClientDashboard />} />
                <Route path="/profile" element={<ClientProfile />} />
                <Route path="/dependents" element={<ClientDependents />} />
                <Route path="/exams" element={<ClientExams />} />
                <Route path="/prescriptions" element={<ClientPrescriptions />} />
                <Route path="/medications" element={<ClientMedications />} />
                <Route path="/bioimpedance" element={<ClientBioimpedance />} />
                <Route path="/symptoms" element={<ClientSymptoms />} />
                <Route path="/anamnesis" element={<ClientAnamnesis />} />
                <Route path="/plans" element={<ClientPlans />} />
                <Route path="/satisfaction" element={<ClientSatisfaction />} />
                <Route path="/privacy" element={<ClientPrivacy />} />
                <Route path="/scheduling" element={<ClientScheduling />} />
                <Route path="/evolution" element={<ClientEvolution />} />
                <Route path="/articles" element={<ClientArticles />} />
                <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
              </Routes>
            </ClientLayout>
          </PrivateRoute>
        } />

        {/* Portal de Hospitais / Clínicas */}
        <Route path="/company/*" element={
          <PrivateRoute redirectTo="/login">
            <CompanyLayout>
              <Routes>
                <Route path="/dashboard" element={<CompanyDashboard />} />
                <Route path="/professionals" element={<CompanyProfessionals />} />
                <Route path="/scheduling" element={<CompanyScheduling />} />
                <Route path="/health-plans" element={<CompanyHealthPlans />} />
                <Route path="/patient-data" element={<CompanyPatientData />} />
                <Route path="/prescriptions" element={<CompanyPrescriptions />} />
                <Route path="/anamnesis-config" element={<CompanyAnamnesisConfig />} />
                <Route path="/plans" element={<CompanyPlans />} />
                <Route path="*" element={<Navigate to="/company/dashboard" replace />} />
              </Routes>
            </CompanyLayout>
          </PrivateRoute>
        } />

        {/* Portal de Profissionais (Médico / Secretário / Administrativo) */}
        <Route path="/professional/*" element={
          <PrivateRoute redirectTo="/login">
            <ProfessionalLayout>
              <Routes>
                <Route path="/dashboard" element={<ProfDashboard />} />
                <Route path="/scheduling" element={<ProfScheduling />} />
                <Route path="/patients" element={<ProfPatients />} />
                <Route path="/prescriptions" element={<ProfPrescriptions />} />
                <Route path="/team" element={<ProfTeam />} />
                <Route path="/health-plans" element={<ProfHealthPlans />} />
                <Route path="/anamnesis" element={<ProfAnamnesis />} />
                <Route path="/my-plan" element={<ProfessionalMyPlan />} />
                <Route path="*" element={<Navigate to="/professional/scheduling" replace />} />
              </Routes>
            </ProfessionalLayout>
          </PrivateRoute>
        } />

        {/* Rotas Protegidas do Portal Administrativo */}
        <Route path="/*" element={
          <PrivateRoute redirectTo="/login">
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<ClientList />} />
                <Route path="/companies" element={<CompanyList />} />
                <Route path="/professionals" element={<ProfessionalList />} />
                <Route path="/health-plans" element={<HealthPlanList />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/dependents" element={<DependentList />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/settings" element={<AdminSettings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
