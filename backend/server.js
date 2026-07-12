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

const { contextMiddleware } = require('./src/middleware/context');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(contextMiddleware);

// Rotas principais
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dependents', dependentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/health-plans', healthPlanRoutes);
app.use('/api/users', userRoutes);

// Novos módulos
app.use('/api/exams', examRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/bioimpedance', bioimpedanceRoutes);
app.use('/api/anamnesis', anamnesisRoutes);
app.use('/api/satisfaction', satisfactionRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'Owner Health API', timestamp: new Date().toISOString() });
});

// Start server only if not running on Vercel
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✅ Owner Health API rodando na porta ${PORT}`);
  });
}

// Export the app for Vercel Serverless Functions
module.exports = app;
