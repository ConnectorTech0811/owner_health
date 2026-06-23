const express = require('express');
const router = express.Router();
const {
  getProfessionals,
  getProfessionalById,
  registerProfessional,
  toggleProfessionalAccess,
  linkToCompany,
  unlinkFromCompany,
  addProfessionalHealthPlan,
  removeProfessionalHealthPlan
} = require('../controllers/professionalController');
const { authenticateToken } = require('../middleware/auth');

// Cadastro de profissional é público
router.post('/register', registerProfessional);

// Rotas autenticadas
router.use(authenticateToken);

router.get('/', getProfessionals);
router.get('/:id', getProfessionalById);
router.post('/:id/link-company', linkToCompany);
router.delete('/:id/unlink-company', unlinkFromCompany);
router.put('/:id/toggle-access', toggleProfessionalAccess);
router.post('/:id/health-plans', addProfessionalHealthPlan);
router.delete('/health-plans/:relationId', removeProfessionalHealthPlan);

module.exports = router;
