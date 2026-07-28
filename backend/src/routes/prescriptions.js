const express = require('express');
const router = express.Router();
const {
  getMedicationsCatalog,
  getCid10,
  checkClinicalSafety,
  getTemplates,
  createTemplate,
  deleteTemplate,
  issuePrescription,
  verifyPrescription,
  getPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription
} = require('../controllers/prescriptionController');

// Novas rotas do Receituário Premium de Alto Padrão
router.get('/medications-catalog', getMedicationsCatalog);
router.get('/cid10', getCid10);
router.post('/check-safety', checkClinicalSafety);

router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.delete('/templates/:id', deleteTemplate);

router.post('/issue', issuePrescription);
router.get('/verify/:hash', verifyPrescription);

// Rotas legadas mantidas para compatibilidade
router.get('/client/:cliente_id', getPrescriptions);
router.post('/client/:cliente_id', createPrescription);
router.put('/:id', updatePrescription);
router.delete('/:id', deletePrescription);

module.exports = router;
