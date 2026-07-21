require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const clientRoutes = require('./src/routes/clients');
const dependentRoutes = require('./src/routes/dependents');
const companyRoutes = require('./src/routes/companies');
const professionalRoutes = require('./src/routes/professionals');
const healthPlanRoutes = require('./src/routes/healthPlans');
const userRoutes = require('./src/routes/users');

// Novos módulos do cliente
const examRoutes = require('./src/routes/exams');
const prescriptionRoutes = require('./src/routes/prescriptions');
const medicationRoutes = require('./src/routes/medications');
const bioimpedanceRoutes = require('./src/routes/bioimpedance');
const anamnesisRoutes = require('./src/routes/anamnesis');
const satisfactionRoutes = require('./src/routes/satisfaction');
const auditLogsRoutes = require('./src/routes/auditLogs');
const agendasRoutes = require('./src/routes/agendas');
const bloqueiosRoutes = require('./src/routes/bloqueios');
const notificacoesRoutes = require('./src/routes/notificacoes');
const path = require('path');
const fs = require('fs');
const uploadRoutes = require('./src/routes/upload');
const patientAnamnesisRoutes = require('./src/routes/patientAnamnesis');
const anamnesisTemplateRoutes = require('./src/routes/anamnesisTemplateRoutes');

const { contextMiddleware } = require('./src/middleware/context');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares — open CORS for all origins (Vercel + local Docker)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(contextMiddleware);


// Servir arquivos estáticos da pasta uploads
try {
  const staticUploadsDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'uploads');
  if (fs.existsSync(staticUploadsDir)) {
    app.use('/uploads', express.static(staticUploadsDir));
  }
} catch (e) {}

// Rotas principais (suporta rotas com ou sem prefixo /api)
const routesMap = [
  ['/auth', authRoutes],
  ['/clients', clientRoutes],
  ['/dependents', dependentRoutes],
  ['/companies', companyRoutes],
  ['/professionals', professionalRoutes],
  ['/health-plans', healthPlanRoutes],
  ['/users', userRoutes],
  ['/upload', uploadRoutes],
  ['/exams', examRoutes],
  ['/prescriptions', prescriptionRoutes],
  ['/medications', medicationRoutes],
  ['/bioimpedance', bioimpedanceRoutes],
  ['/anamnesis', anamnesisRoutes],
  ['/satisfaction', satisfactionRoutes],
  ['/audit-logs', auditLogsRoutes],
  ['/agendas', agendasRoutes],
  ['/bloqueios', bloqueiosRoutes],
  ['/notificacoes', notificacoesRoutes],
  ['/patient-anamnesis', patientAnamnesisRoutes],
  ['/anamnesis-templates', anamnesisTemplateRoutes]
];

routesMap.forEach(([pathStr, routerObj]) => {
  app.use(`/api${pathStr}`, routerObj);
  app.use(pathStr, routerObj);
});

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', system: 'Owner Health API', timestamp: new Date().toISOString() });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ error: err.message || 'Erro interno no servidor' });
});

// Start server only if not running on Vercel
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✅ Owner Health API rodando na porta ${PORT}`);
  });
}

// Export the app for Vercel Serverless Functions
module.exports = app;
