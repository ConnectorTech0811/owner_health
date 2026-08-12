const express = require('express');
const router = express.Router();
const {
  getCompanies,
  getCompanyById,
  registerCompany,
  addCompanyHealthPlan,
  removeCompanyHealthPlan,
  updatePaymentStatus,
  getCompanySchedules,
  createCompanySchedule,
  getAnamnesisConfig,
  updateAnamnesisConfig,
  getSharedPatientData,
  createCompanyDocument,
  getCompanyDocuments,
  deleteCompanyDocument,
  getPublicCompanies
} = require('../controllers/companyController');
const { authenticateToken } = require('../middleware/auth');

// Cadastro de empresa é público
router.post('/register', registerCompany);
router.get('/public', getPublicCompanies);

// Rotas autenticadas
router.get('/', authenticateToken, getCompanies);
router.get('/:id', authenticateToken, getCompanyById);
router.post('/:id/health-plans', authenticateToken, addCompanyHealthPlan);
router.delete('/health-plans/:relationId', authenticateToken, removeCompanyHealthPlan);
router.put('/:id/payment', authenticateToken, updatePaymentStatus);

// Agendas
router.get('/:id/schedules', authenticateToken, getCompanySchedules);
router.post('/:id/schedules', authenticateToken, createCompanySchedule);

// Configuração Anamnese
router.get('/:id/anamnesis-config', authenticateToken, getAnamnesisConfig);
router.put('/:id/anamnesis-config', authenticateToken, updateAnamnesisConfig);

// Dados do paciente
router.get('/:id/patient-data/:cpfOrCode', authenticateToken, getSharedPatientData);

// Documentos (Receitas e Atestados)
router.get('/:id/documents', authenticateToken, getCompanyDocuments);
router.post('/:id/documents', authenticateToken, createCompanyDocument);
router.delete('/:id/documents/:docId', authenticateToken, deleteCompanyDocument);

module.exports = router;
